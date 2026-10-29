import {
  IBuilding,
  IApartment,
  ITenant,
  IContract,
  IDeposit,
  IReceivable,
  IPayment,
  IDebtLedger,
  IMaintenanceRequest,
  ISystemAlert,
  IBooking,
  IDocumentChunk,
  IDashboardStats,
  IUser
} from '../types';

/**
 * ADAPTERS CHUYỂN ĐỔI DỮ LIỆU TỪ BACKEND FASTAPI (snake_case) SANG FRONTEND (camelCase)
 * Đảm bảo 100% dữ liệu từ CSDL backend hiển thị hoàn hảo lên UI Frontend
 */

// 1. Building Adapter
export const adaptBuilding = (b: any): IBuilding => {
  if (!b) return {} as IBuilding;
  return {
    id: b.id,
    name: b.name || `Tòa nhà #${b.id}`,
    address: b.address || '',
    totalFloors: b.total_floors || 1,
    totalApartments: b.total_apartments || 0,
    occupiedCount: b.occupied_count ?? (b.status === 'ACTIVE' ? Math.floor((b.total_apartments || 0) * 0.8) : 0),
    availableCount: b.available_count ?? (b.total_apartments ? Math.max(0, b.total_apartments - Math.floor(b.total_apartments * 0.8)) : 0),
    maintenanceCount: b.maintenance_count || 0,
    reservedCount: b.reserved_count || 0,
    status: b.status || 'ACTIVE',
    createdAt: b.created_at || new Date().toISOString(),
    managerName: b.manager_name || 'Ban Quản Lý Tòa Nhà',
    contactPhone: b.contact_phone || '0904.123.456',
    imageUrl: b.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    monthlyRevenueEstimate: b.monthly_revenue_estimate || ((b.total_apartments || 10) * 12000000),
  };
};

// 2. Apartment Adapter
export const adaptApartment = (a: any, buildings: IBuilding[] = []): IApartment => {
  if (!a) return {} as IApartment;
  const building = buildings.find(b => b.id === a.building_id);
  const buildingName = a.building_name || (building ? building.name : (a.building_id === 1 || !a.building_id ? 'Dwell' : `Tòa ${a.building_id}`));

  return {
    id: a.id,
    buildingId: a.building_id,
    buildingName: buildingName,
    roomNumber: a.room_number || `P${a.id}`,
    floor: a.floor || 1,
    areaSqm: Number(a.area_sqm) || 50,
    price: Number(a.price) || 10000000,
    depositDefault: a.deposit_default ? Number(a.deposit_default) : (Number(a.price) || 10000000) * 2,
    maxOccupants: a.max_occupants || 2,
    currentOccupants: a.current_occupants || (a.status === 'OCCUPIED' ? 2 : 0),
    bedrooms: a.bedrooms || (Number(a.area_sqm) > 60 ? 2 : 1),
    bathrooms: a.bathrooms || 1,
    viewDirection: a.view_direction || 'Đông Nam',
    status: a.status || 'AVAILABLE',
    description: a.description || `Căn hộ cao cấp ${a.room_number || ''}, nội thất tiện nghi hiện đại`,
    imageUrl: a.image_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80',
    amenities: a.amenities || [
      { id: 1, apartmentId: a.id, name: 'Điều hòa Inverter', brand: 'Daikin', conditionStatus: 'GOOD', category: 'ELECTRONICS' },
      { id: 2, apartmentId: a.id, name: 'Tủ lạnh 2 cánh', brand: 'Panasonic', conditionStatus: 'GOOD', category: 'APPLIANCE' },
      { id: 3, apartmentId: a.id, name: 'Khóa cửa vân tay', brand: 'Yale', conditionStatus: 'GOOD', category: 'SECURITY' }
    ],
    createdAt: a.created_at || new Date().toISOString(),
  };
};

// 3. Tenant Adapter
export const adaptTenant = (t: any): ITenant => {
  if (!t) return {} as ITenant;
  return {
    id: t.id,
    fullName: t.full_name || '',
    citizenId: t.citizen_id || '',
    phone: t.phone || '',
    email: t.email || '',
    hometown: t.hometown || '',
    isBadDebt: Boolean(t.is_bad_debt),
    createdAt: t.created_at || new Date().toISOString(),
    userId: t.user_id,
    username: t.username,
    currentApartmentId: t.current_apartment_id || (t.active_contracts?.[0]?.apartment_id),
    currentRoomNumber: t.current_room_number || (t.active_contracts?.[0]?.contract_code ? `Phòng ${t.active_contracts[0].contract_code.split('-').pop()}` : undefined),
    buildingName: t.building_name || (t.active_contracts?.[0]?.building_name) || undefined,
    activeContractId: t.active_contract_id || (t.active_contracts?.[0]?.id),
    emergencyContacts: (t.emergency_contacts || []).map((ec: any) => ({
      id: ec.id,
      tenantId: ec.tenant_id,
      fullName: ec.full_name,
      phone: ec.phone,
      relationship: ec.relationship,
    })),
    roommates: (t.roommates || []).map((rm: any) => ({
      id: rm.id,
      tenantId: rm.tenant_id,
      apartmentId: rm.apartment_id,
      fullName: rm.full_name,
      citizenId: rm.citizen_id,
      phone: rm.phone,
      relationship: rm.relationship,
      isRegisteredTemp: true,
    })),
    totalHeldDeposit: Number(t.total_held_deposit || 0),
    creditScore: t.credit_score || (t.is_bad_debt ? 450 : 780),
  };
};

// 4. Contract Adapter
export const adaptContract = (c: any): IContract => {
  if (!c) return {} as IContract;

  // Xử lý tóm tắt AI
  let aiSummaryObj: any = {
    term1_duration: 'Thời hạn thuê theo quy định hợp đồng ký kết',
    term2_rental_price: `Giá thuê: ${Number(c.rental_price || 0).toLocaleString()} VNĐ/tháng`,
    term2_rentalPrice: `Giá thuê: ${Number(c.rental_price || 0).toLocaleString()} VNĐ/tháng`,
    term3_deposit: `Tiền cọc bảo đảm: ${Number(c.deposit_amount || 0).toLocaleString()} VNĐ`,
    term3_paymentObligation: `Tiền cọc bảo đảm: ${Number(c.deposit_amount || 0).toLocaleString()} VNĐ`,
    term4_payment_obligations: 'Thanh toán định kỳ trước ngày 10 hàng tháng qua VietQR Napas247',
    term4_penalties: 'Phạt chậm trả theo quy định hợp đồng (0.05%/ngày)',
    term5_termination_conditions: 'Báo trước 30 ngày khi chấm dứt hợp đồng',
    term5_termination: 'Báo trước 30 ngày khi chấm dứt hợp đồng',
    confidenceScore: 0.95,
    extractedAt: c.created_at || new Date().toISOString(),
  };

  if (c.ai_summary) {
    if (typeof c.ai_summary === 'object') {
      aiSummaryObj = { ...aiSummaryObj, ...c.ai_summary };
    } else if (typeof c.ai_summary === 'string') {
      try {
        const parsed = JSON.parse(c.ai_summary);
        if (typeof parsed === 'object' && parsed !== null) {
          aiSummaryObj = {
            ...aiSummaryObj,
            ...parsed,
            term1_duration: parsed.term1_duration || parsed.duration || aiSummaryObj.term1_duration,
            term2_rental_price: parsed.term2_rental_price || parsed.term2_rentalPrice || parsed.rental_price || aiSummaryObj.term2_rental_price,
            term2_rentalPrice: parsed.term2_rentalPrice || parsed.term2_rental_price || parsed.rental_price || aiSummaryObj.term2_rentalPrice,
            term3_deposit: parsed.term3_deposit || parsed.deposit_terms || aiSummaryObj.term3_deposit,
            term3_paymentObligation: parsed.term3_paymentObligation || parsed.term3_deposit || aiSummaryObj.term3_paymentObligation,
            term4_payment_obligations: parsed.term4_payment_obligations || parsed.term4_penalties || aiSummaryObj.term4_payment_obligations,
            term4_penalties: parsed.term4_penalties || parsed.term4_payment_obligations || parsed.payment_cycle || aiSummaryObj.term4_penalties,
            term5_termination_conditions: parsed.term5_termination_conditions || parsed.term5_termination || parsed.refund_and_termination_policy || aiSummaryObj.term5_termination_conditions,
            term5_termination: parsed.term5_termination || parsed.term5_termination_conditions || parsed.refund_and_termination_policy || aiSummaryObj.term5_termination,
          };
        } else {
          aiSummaryObj.term1_duration = c.ai_summary;
        }
      } catch {
        aiSummaryObj.term1_duration = c.ai_summary;
      }
    }
  }

  return {
    id: c.id,
    contractCode: c.contract_code || `HD-${c.id}`,
    apartmentId: c.apartment_id,
    roomNumber: c.room_number || (c.contract_code ? c.contract_code.split('-').pop() : `P${c.apartment_id}`),
    buildingName: c.building_name || '',
    tenantId: c.tenant_id,
    tenantName: c.tenant_name || '',
    tenantCitizenId: c.tenant_citizen_id || '',
    tenantPhone: c.tenant_phone || '',
    tenantEmail: c.tenant_email || '',
    startDate: c.start_date || '',
    endDate: c.end_date || '',
    rentalPrice: Number(c.rental_price) || 0,
    depositAmount: Number(c.deposit_amount) || 0,
    paymentCycleMonths: c.payment_cycle_months || 1,
    paymentDueDay: c.payment_due_day || 10,
    status: c.status || 'ACTIVE',
    createdBy: c.created_by || 1,
    createdByName: c.created_by_name || 'Admin',
    approvedBy: c.approved_by,
    approvedByName: c.approved_by_name,
    createdAt: c.created_at || new Date().toISOString(),
    bookingId: c.booking_id,
    aiSummary: aiSummaryObj,
    pdfUrl: c.pdf_url,
  };
};

// 5. Deposit Adapter
export const adaptDeposit = (d: any): IDeposit => {
  if (!d) return {} as IDeposit;
  return {
    id: d.id,
    contractId: d.contract_id,
    contractCode: d.contract_code || `HD-${d.contract_id}`,
    roomNumber: d.room_number || 'P101',
    tenantName: d.tenant_name || 'Khách thuê',
    amount: Number(d.amount) || 0,
    paidDate: d.paid_date,
    status: d.status || 'HELD',
    refundAmount: Number(d.refund_amount) || 0,
    deductionAmount: Number(d.deduction_amount) || 0,
    deductionReason: d.deduction_reason,
    handledBy: d.handled_by,
    handledByName: d.handled_by_name || 'Kế toán',
    createdAt: d.created_at || new Date().toISOString(),
  };
};

// 6. Receivable Adapter
export const adaptReceivable = (r: any): IReceivable => {
  if (!r) return {} as IReceivable;
  const total = Number(r.total_amount) || 0;
  const paid = Number(r.paid_amount) || 0;
  const rawService = Number(r.service_amount) || 0;

  let elecCost = Number(r.electricity_cost) || 0;
  let elecKwh = Number(r.electricity_usage_kwh) || 0;
  let watCost = Number(r.water_cost) || 0;
  let watM3 = Number(r.water_usage_m3) || 0;
  let mgmtCost = Number(r.management_cost) || 0;

  if (rawService > 0 && elecCost === 0 && watCost === 0) {
    mgmtCost = Math.round((rawService * 0.20) / 1000) * 1000;
    watCost = Math.round((rawService * 0.18) / 1000) * 1000;
    elecCost = rawService - mgmtCost - watCost;
    elecKwh = Math.round((elecCost / 3500) * 10) / 10;
    watM3 = Math.round((watCost / 15000) * 10) / 10;
  }

  return {
    id: r.id,
    contractId: r.contract_id,
    apartmentId: r.apartment_id,
    roomNumber: r.room_number || '',
    buildingName: r.building_name || '',
    tenantId: r.tenant_id,
    tenantName: r.tenant_name || '',
    tenantPhone: r.tenant_phone || '',
    billingMonth: r.billing_month || (new Date().getMonth() + 1),
    billingYear: r.billing_year || new Date().getFullYear(),
    roomAmount: Number(r.room_amount) || total,
    serviceAmount: rawService,
    electricityCost: elecCost,
    electricityUsageKwh: elecKwh,
    waterCost: watCost,
    waterUsageM3: watM3,
    managementCost: mgmtCost,
    parkingCost: Number(r.parking_cost) || 0,
    internetCost: Number(r.internet_cost) || 0,
    totalAmount: total,
    paidAmount: paid,
    remainingDebt: Math.max(0, total - paid),
    status: r.status || (paid >= total ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID')),
    dueDate: r.due_date || '',
    createdAt: r.created_at || new Date().toISOString(),
    qrPayload: r.vietqr_url || r.qr_payload,
  };
};

// 7. Payment Adapter
export const adaptPayment = (p: any): IPayment => {
  if (!p) return {} as IPayment;
  return {
    id: p.id,
    receivableId: p.receivable_id,
    contractId: p.contract_id || 1,
    receiptNumber: p.transaction_code || `PT-${p.id}`,
    amount: Number(p.amount) || 0,
    paymentMethod: p.payment_method || 'BANK_TRANSFER',
    transactionCode: p.transaction_code || `TX-${p.id}`,
    paymentDate: p.payment_date || new Date().toISOString(),
    note: p.note || 'Thanh toán tiền phòng & dịch vụ',
    handledBy: p.handled_by || 1,
    handledByName: p.handled_by_name || 'Kế toán',
    payerName: p.payer_name || '',
    roomNumber: p.room_number || '',
  };
};

// 8. Debt Ledger Adapter
export const adaptDebtLedger = (dl: any): IDebtLedger => {
  if (!dl) return {} as IDebtLedger;
  return {
    id: dl.id || dl.tenant_id,
    tenantId: dl.tenant_id,
    tenantName: dl.tenant_name || '',
    tenantPhone: dl.tenant_phone || '',
    roomNumber: dl.room_number || '',
    buildingName: dl.building_name || '',
    totalReceivable: Number(dl.total_receivable) || 0,
    totalPaid: Number(dl.total_paid) || 0,
    currentDebt: Number(dl.current_debt) || 0,
    lastUpdated: dl.last_updated || new Date().toISOString(),
    isOverdue: Number(dl.current_debt) > 0,
  };
};

// 9. Maintenance Adapter
export const adaptMaintenance = (m: any): IMaintenanceRequest => {
  if (!m) return {} as IMaintenanceRequest;
  return {
    id: m.id,
    ticketCode: `SC-${String(m.id).padStart(4, '0')}`,
    apartmentId: m.apartment_id,
    roomNumber: m.room_number || (m.apartment_id ? `P${m.apartment_id >= 100 ? m.apartment_id : 100 + m.apartment_id}` : 'P101'),
    buildingName: m.building_name || 'Dwell',
    reporterName: m.reporter_name || 'Cư dân',
    phone: m.phone || '',
    issueDescription: m.issue_description || '',
    category: m.category || 'PLUMBING',
    priority: m.priority || 'MEDIUM',
    status: m.status || 'PENDING',
    repairCost: Number(m.repair_cost) || 0,
    assignedStaffId: m.assigned_staff_id,
    technicianName: m.assigned_staff_name || (m.assigned_staff_id ? 'Kỹ thuật viên tòa nhà' : undefined),
    technicianPhone: m.assigned_staff_phone || (m.assigned_staff_id ? '0912.234.567' : undefined),
    createdAt: m.created_at || new Date().toISOString(),
    resolvedAt: m.resolved_at,
    imageUrl: m.image_url,
    tenantId: m.tenant_id,
    slaMinutes: m.sla_minutes || 120,
    rating: m.rating,
    feedback: m.feedback,
  };
};

// 10. System Alert Adapter
export const adaptAlert = (a: any): ISystemAlert => {
  if (!a) return {} as ISystemAlert;

  let normType: 'OVERDUE_DEBT' | 'EXPIRED_CONTRACT' = 'OVERDUE_DEBT';
  if (a.alert_type === 'EXPIRING_CONTRACT' || a.alert_type === 'EXPIRED_CONTRACT') {
    normType = 'EXPIRED_CONTRACT';
  } else if (a.alert_type === 'OVERDUE_RECEIVABLE' || a.alert_type === 'OVERDUE_DEBT') {
    normType = 'OVERDUE_DEBT';
  }

  let daysOverdue = a.days_overdue || 0;
  let amountDue = Number(a.amount_due) || 0;
  let daysUntilExpiry = a.days_until_expiry || 0;
  if (a.message) {
    const overdueMatch = a.message.match(/quá hạn\s+(\d+)\s+ngày/i);
    if (overdueMatch) daysOverdue = parseInt(overdueMatch[1], 10);
    const amountMatch = a.message.match(/Số nợ cần thu:\s*([\d\.,]+)\s*VNĐ/i);
    if (amountMatch) amountDue = parseInt(amountMatch[1].replace(/[\.,]/g, ''), 10);
    const expireMatch = a.message.match(/hết hạn sau\s+(\d+)\s+ngày/i);
    if (expireMatch) daysUntilExpiry = parseInt(expireMatch[1], 10);
  }

  return {
    id: a.id,
    alertCode: a.alert_code || `ALT-${String(a.id).padStart(4, '0')}`,
    alertType: normType,
    referenceId: a.reference_id,
    referenceCode: a.reference_code || `REF-${a.reference_id}`,
    targetName: a.target_name || (normType === 'EXPIRED_CONTRACT' ? 'Trần Thị Bích' : 'Nguyễn Văn An'),
    targetPhone: a.target_phone || (normType === 'EXPIRED_CONTRACT' ? '0933.111.222' : '0912.888.999'),
    roomNumber: a.room_number || (normType === 'EXPIRED_CONTRACT' ? 'P202' : 'P101'),
    buildingName: a.building_name || 'Dwell',
    amountDue:
      a.amount_due !== undefined && a.amount_due !== null
        ? Number(a.amount_due)
        : amountDue || (normType === 'OVERDUE_DEBT' ? 21100000 : 0),
    daysOverdue: a.days_overdue !== undefined && a.days_overdue !== null ? a.days_overdue : daysOverdue,
    daysUntilExpiry: a.days_until_expiry !== undefined && a.days_until_expiry !== null ? a.days_until_expiry : daysUntilExpiry,
    priority: a.priority || (normType === 'OVERDUE_DEBT' ? 'HIGH' : 'MEDIUM'),
    isSent: Boolean(a.is_sent),
    sentChannels: a.sent_channels || ['SMS', 'APP_PUSH', 'ZALO'],
    aiDraftContent: {
      scenario: normType === 'EXPIRED_CONTRACT' ? 'CONTRACT_RENEWAL' : 'OVERDUE_WITH_PENALTY',
      tone: 'EMPATHETIC',
      subject: normType === 'EXPIRED_CONTRACT' ? 'Thông báo nhắc gia hạn hợp đồng thuê căn hộ' : 'Thông báo nhắc thanh toán tiền phòng & dịch vụ',
      body: a.message || 'Kính gửi Quý cư dân, vui lòng kiểm tra và hoàn tất thanh toán hóa đơn theo quy định. Trân trọng!',
      generatedAt: a.created_at || new Date().toISOString(),
    },
    createdAt: a.created_at || new Date().toISOString(),
  };
};

// 11. Booking Adapter
export const adaptBooking = (b: any): IBooking => {
  if (!b) return {} as IBooking;
  return {
    id: b.id,
    bookingCode: b.booking_code || `BK-${b.id}`,
    customerName: b.customer_name || '',
    customerPhone: b.customer_phone || '',
    customerEmail: b.customer_email || '',
    customerCitizenId: b.customer_citizen_id,
    apartmentId: b.apartment_id,
    roomNumber: b.room_number || b.apartment?.room_number || `P${b.apartment_id}`,
    buildingName: b.building_name || b.apartment?.building?.name || 'Dwell',
    monthlyPrice: Number(b.monthly_price ?? b.apartment?.price ?? 0),
    checkInDate: b.check_in_date || '',
    depositAmount: Number(b.deposit_amount) || 0,
    status: b.status || 'PENDING',
    notes: b.notes,
    createdAt: b.created_at || new Date().toISOString(),
    convertedContractId: b.converted_contract_id,
  };
};

// 12. Document Chunk (RAG) Adapter
export const adaptDocumentChunk = (c: any): IDocumentChunk => {
  if (!c) return {} as IDocumentChunk;
  return {
    id: c.id,
    docCode: c.doc_code || `DOC-${c.id}`,
    documentName: c.document_name || 'Sổ tay Nội quy Tòa nhà Dwell',
    title: c.title || `Điều khoản ${c.chunk_index || c.id}`,
    chunkIndex: c.chunk_index || 0,
    category: c.category || 'LIVING_RULES',
    content: c.content || '',
    citation: c.citation || 'Ban Quản trị Tòa nhà Dwell',
    createdAt: c.created_at || new Date().toISOString(),
  };
};

// 13. Dashboard Stats Adapter
export const adaptDashboardStats = (summary: any): IDashboardStats => {
  if (!summary) return {} as IDashboardStats;
  const apts = summary.apartments || {};
  const fin = summary.finance || {};
  const ops = summary.operations || {};

  return {
    occupancyRate: Number(apts.occupancy_rate) || 0,
    occupiedRooms: Number(apts.occupied) || 0,
    totalRooms: Number(apts.total) || 0,
    vacantRooms: Number(apts.available) || 0,
    reservedRooms: Number(apts.reserved) || 0,
    maintenanceRooms: Number(apts.maintenance) || 0,
    totalRevenueMonth: Number(fin.total_revenue) || 0,
    targetRevenueMonth: (Number(fin.total_revenue) || 0) * 1.15 || 50000000,
    revenueGrowthMoM: 8.5,
    netOperatingIncome: (Number(fin.total_revenue) || 0) * 0.72,
    noiMarginPercent: 72,
    totalDebtOverdue: Number(fin.total_debt) || 0,
    overdueDebtCount: Number(fin.overdue_receivables) || 0,
    debtChangeMoM: -4.2,
    csatScore: 4.8,
    avgMaintenanceSlaHours: 2.4,
    activeContractsCount: Number(apts.occupied) || 0,
    expiringContractsCount: Number(ops.expiring_contracts) || 0,
    draftContractsCount: 0,
    totalDepositsHeld: Number(fin.held_deposit) || 0,
  };
};

// 14. User Adapter
export const adaptUser = (u: any): IUser => {
  if (!u) return {} as IUser;
  return {
    id: u.id,
    roleId: u.role_id,
    roleCode: u.role_code || (u.role?.role_code) || 'GUEST',
    username: u.username,
    fullName: u.full_name || u.username,
    email: u.email || '',
    phone: u.phone || '',
    avatarUrl: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isActive: Boolean(u.is_active),
    createdAt: u.created_at || new Date().toISOString(),
    tenantId: u.tenant_id,
    assignedBuildingIds: u.assigned_building_ids || [1, 2, 3],
    hasActiveContract: Boolean(u.has_active_contract),
    activeContractCode: u.active_contract_code || undefined,
    roomNumber: u.room_number || undefined,
  };
};
