import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Home, DollarSign, Compass, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AIBotLogo } from '../common/AIBotLogo';
import { IApartment } from '../../types';
import { matchApartmentsWithAI } from '../../utils/aiEngines';
import { formatCurrency } from '../../utils/formatters';
import { useRecommendApartmentsAIMutation } from '../../modules/buildings/services/buildingApi';

interface AIRoomMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartments: IApartment[];
  onSelectApartment: (apt: IApartment) => void;
}

export const AIRoomMatcherModal: React.FC<AIRoomMatcherModalProps> = ({
  isOpen,
  onClose,
  apartments,
  onSelectApartment,
}) => {
  const [budgetMax, setBudgetMax] = useState<number>(20000000);
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [view, setView] = useState<string>('Đông Nam');

  const [recommendApartmentsAI] = useRecommendApartmentsAIMutation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestIdRef = useRef<number>(0);
  const [aiResults, setAiResults] = useState<
    Array<{
      apartment: IApartment;
      reason: string;
      matchScore: number;
    }> | null
  >(null);

  const fetchAiRecommendations = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);

    // Timeout an toàn 2.5s: nếu API lâu hoặc chập chờn, hiển thị ngay clientFallback
    timeoutRef.current = setTimeout(() => {
      if (reqId === activeRequestIdRef.current) {
        setIsLoading(false);
        setAiResults(null);
      }
    }, 2500);

    try {
      const res = await recommendApartmentsAI({
        max_budget: budgetMax,
        bedrooms,
        view,
        occupants: Math.max(1, bedrooms),
        min_area: bedrooms === 1 ? 25 : bedrooms === 2 ? 45 : 70,
        amenities: [],
      }).unwrap();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (reqId !== activeRequestIdRef.current) return;

      if (res && res.length > 0) {
        const matched = res.map((item, idx) => {
          const existing = (apartments || []).find((a) => a.id === item.apartment_id);
          const baseApt: IApartment = existing || {
            id: item.apartment_id,
            buildingId: item.building_id,
            buildingName: 'Tòa nhà Dwell',
            roomNumber: item.room_number,
            floor: 1,
            areaSqm: Number(item.area_sqm),
            price: Number(item.price),
            depositDefault: Number(item.price),
            maxOccupants: item.max_occupants || (item.bedrooms ? item.bedrooms * 2 : bedrooms * 2),
            currentOccupants: 0,
            status: 'AVAILABLE' as const,
            bedrooms: item.bedrooms ?? bedrooms,
            bathrooms: item.bathrooms ?? 1,
            viewDirection: item.view_direction ?? view,
            description: item.reason,
            imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
            amenities: (item.amenities || []).map((name, i) => ({
              id: i + 1,
              apartmentId: item.apartment_id,
              name,
              brand: 'Dwell Standard',
              conditionStatus: 'GOOD' as const,
              category: 'FURNITURE' as const,
            })),
            createdAt: new Date().toISOString(),
          };

          const apt: IApartment = {
            ...baseApt,
            areaSqm: item.area_sqm != null ? Number(item.area_sqm) : baseApt.areaSqm,
            price: item.price != null ? Number(item.price) : baseApt.price,
            bedrooms: item.bedrooms ?? baseApt.bedrooms,
            bathrooms: item.bathrooms ?? baseApt.bathrooms,
            viewDirection: item.view_direction ?? baseApt.viewDirection,
          };

          return {
            apartment: apt,
            reason: item.reason,
            matchScore: item.match_score ?? Math.max(90, 99 - idx * 2),
          };
        });
        setAiResults(matched);
      } else {
        // Nếu API backend không có căn phù hợp, fallback ngay sang thuật toán client
        setAiResults(null);
      }
    } catch {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (reqId === activeRequestIdRef.current) {
        // Fallback to client algorithm if offline/error
        setAiResults(null);
      }
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAiResults(null);
      fetchAiRecommendations();
    }
  }, [isOpen, budgetMax, bedrooms, view]);

  const clientFallback = matchApartmentsWithAI(apartments, {
    budgetMax,
    bedrooms,
    view,
  }).map((r) => ({
    apartment: r.apartment,
    reason: r.aiHighlight,
    matchScore: r.matchScore,
  }));

  const displayResults = (aiResults && aiResults.length > 0) ? aiResults : clientFallback;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <AIBotLogo size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Trợ Lý AI Room Matcher</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI RECOMMEND
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Phân tích sở thích, ngân sách & dữ liệu căn hộ thực tế để gợi ý chuẩn xác nhất
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Preference Filters */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-brand-600" />
              <span>Ngân sách tối đa/tháng</span>
            </label>
            <select
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
            >
              <option value={8000000}>Dưới 8.000.000 ₫</option>
              <option value={10000000}>Dưới 10.000.000 ₫</option>
              <option value={15000000}>Dưới 15.000.000 ₫</option>
              <option value={20000000}>Dưới 20.000.000 ₫</option>
              <option value={30000000}>Dưới 30.000.000 ₫ (Cao cấp)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-brand-600" />
              <span>Số phòng ngủ</span>
            </label>
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
            >
              <option value={1}>Studio / 1 Phòng ngủ</option>
              <option value={2}>2 Phòng ngủ</option>
              <option value={3}>3 Phòng ngủ</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-600" />
              <span>Hướng ban công ưu tiên</span>
            </label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500"
            >
              <option value="Đông Nam">Hướng Đông Nam (Mát mẻ)</option>
              <option value="Công Viên">View Công Viên / Cây Xanh</option>
              <option value="Nội Khu">View Nội Khu Vườn Hoa</option>
              <option value="Đông Bắc">Hướng Đông Bắc</option>
            </select>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>
                {isLoading
                  ? 'Đang phân tích căn hộ phù hợp...'
                  : `Kết quả gợi ý từ AI (${displayResults.length} căn hộ sẵn sàng)`}
              </span>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />}
            </div>
            <button
              type="button"
              onClick={fetchAiRecommendations}
              disabled={isLoading}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Tải lại gợi ý</span>
            </button>
          </div>

          {isLoading && displayResults.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Trợ lý AI đang phân tích dữ liệu căn hộ và tối ưu gợi ý...</p>
            </div>
          ) : displayResults.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Không có căn hộ nào khớp tiêu chí trên. Bạn hãy thử nới lỏng ngân sách hoặc chọn số phòng ngủ khác nhé!
            </div>
          ) : (
            displayResults.map(({ apartment: apt, matchScore, reason }) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-brand-400 shadow-soft transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img
                    src={apt.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'}
                    alt={apt.roomNumber}
                    className="w-20 h-20 rounded-xl object-cover shadow-xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">{apt.roomNumber}</span>
                      <span className="text-xs text-slate-500">• {apt.buildingName || 'Tòa nhà Dwell'}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        {matchScore}% Khớp
                      </span>
                      <Badge status="AVAILABLE" size="sm" />
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {apt.areaSqm}m² • {apt.bedrooms} PN • {apt.bathrooms || 1} WC • Hướng {apt.viewDirection || 'Đông Nam'}
                    </div>
                    <div className="text-[11px] text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md mt-1.5 inline-block border border-brand-100/60 leading-relaxed">
                      ★ {reason}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <div className="text-base font-black text-brand-700">
                    {formatCurrency(apt.price)}
                    <span className="text-xs font-normal text-slate-400">/tháng</span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onSelectApartment(apt);
                      onClose();
                    }}
                  >
                    Đặt Phòng Ngay
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
