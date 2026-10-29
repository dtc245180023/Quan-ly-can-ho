import { baseApi } from '../../../stores/baseApi';
import { ISystemAlert } from '../../../types';
import { adaptAlert } from '../../../utils/adapters';

export const alertApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemAlerts: builder.query<ISystemAlert[], { isSent?: boolean; priority?: string } | void>({
      query: () => '/alerts',
      transformResponse: (res: any[], _meta, arg) => {
        let list = (res || []).map(adaptAlert);
        if (arg && 'isSent' in arg && arg.isSent !== undefined) {
          list = list.filter((a) => a.isSent === arg.isSent);
        }
        if (arg && 'priority' in arg && arg.priority) {
          list = list.filter((a) => a.priority === arg.priority);
        }
        return list;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Alert' as const, id })),
              { type: 'Alert', id: 'LIST' },
            ]
          : [{ type: 'Alert', id: 'LIST' }],
    }),

    triggerSystemScan: builder.mutation<
      {
        message: string;
        scannedItemsCount: number;
        newAlertsCount: number;
        scannedContractsCount: number;
        scannedReceivablesCount: number;
        totalActiveAlerts: number;
        cleanedAlertsCount: number;
      },
      { daysToEnd?: number } | void
    >({
      query: (arg) => ({
        url: '/alerts/scan',
        method: 'POST',
        body: {
          days_to_end: arg?.daysToEnd || 30,
        },
      }),
      transformResponse: (res: any) => ({
        message: res.message || 'Quét toàn diện hệ thống hoàn tất',
        scannedItemsCount: Number(res.total_scanned) || 0,
        newAlertsCount: Number(res.total_new_alerts) || 0,
        scannedContractsCount: Number(res.scanned_contracts_count) || 0,
        scannedReceivablesCount: Number(res.scanned_receivables_count) || 0,
        totalActiveAlerts: Number(res.total_active_alerts) || 0,
        cleanedAlertsCount: Number(res.cleaned_alerts_count) || 0,
      }),
      invalidatesTags: [{ type: 'Alert', id: 'LIST' }, { type: 'Dashboard', id: 'STATS' }],
    }),

    dispatchAlertChannels: builder.mutation<
      ISystemAlert,
      { alertId: number; channels: ('ZALO' | 'SMS' | 'EMAIL' | 'APP_PUSH')[]; editedBody?: string }
    >({
      query: ({ alertId, channels, editedBody }) => {
        const primaryChannel = channels.includes('ZALO')
          ? 'ZALO'
          : channels.includes('SMS')
          ? 'SMS'
          : channels.includes('APP_PUSH')
          ? 'APP_PUSH'
          : 'EMAIL';
        return {
          url: `/alerts/${alertId}/mark-sent`,
          method: 'PATCH',
          body: {
            channel: primaryChannel,
            channels,
            edited_body: editedBody,
          },
        };
      },
      transformResponse: (res: any) => adaptAlert(res),
      invalidatesTags: [{ type: 'Alert', id: 'LIST' }],
    }),

    generateAIDunning: builder.mutation<any, { alertId: number; receivableId?: number }>({
      query: ({ alertId }) => ({
        url: `/alerts/${alertId}/generate-dunning`,
        method: 'POST',
      }),
    }),

    regenerateAIDraft: builder.mutation<
      ISystemAlert,
      { alertId: number; promptOptions: any }
    >({
      query: ({ alertId, promptOptions }) => ({
        url: `/ai/alerts/${alertId}/draft`,
        method: 'POST',
        body: {
          tone: promptOptions?.tone,
          scenario: promptOptions?.scenario,
          customer_name: promptOptions?.customerName,
          room_number: promptOptions?.roomNumber,
          amount_due: promptOptions?.amountDue,
          days_overdue: promptOptions?.daysOverdue,
          days_until_expiry: promptOptions?.daysUntilExpiry,
        },
      }),
      transformResponse: (res: any, _meta, arg) => {
        const { alertId, promptOptions } = arg;
        const bodyText = res.ai_draft || res.message_body || '';

        return {
          id: alertId,
          alertCode: `ALT-${String(alertId).padStart(4, '0')}`,
          alertType: (res.alert_type as any) || (promptOptions.scenario === 'CONTRACT_RENEWAL' ? 'EXPIRED_CONTRACT' : 'OVERDUE_DEBT'),
          referenceId: res.reference_id || alertId,
          referenceCode: `REF-${res.reference_id || alertId}`,
          targetName: res.recipient_name || promptOptions.customerName || 'Cư dân',
          targetPhone: res.recipient_phone || '0912.888.999',
          roomNumber: promptOptions.roomNumber || 'P101',
          buildingName: promptOptions.buildingName || 'Dwell',
          amountDue: Number(res.amount_due) || promptOptions.amountDue || 0,
          daysOverdue: res.days_overdue || promptOptions.daysOverdue || 0,
          priority: 'HIGH',
          isSent: false,
          sentChannels: [],
          aiDraftContent: {
            scenario: promptOptions.scenario || 'OVERDUE_WITH_PENALTY',
            tone: promptOptions.tone || 'EMPATHETIC',
            subject: res.email_subject || `Thông báo căn ${promptOptions.roomNumber || 'P101'}`,
            body: bodyText,
            generatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
        };
      },
      invalidatesTags: [{ type: 'Alert', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetSystemAlertsQuery,
  useTriggerSystemScanMutation,
  useDispatchAlertChannelsMutation,
  useGenerateAIDunningMutation,
  useRegenerateAIDraftMutation,
} = alertApi;
