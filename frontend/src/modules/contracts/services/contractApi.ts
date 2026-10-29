import { baseApi } from '../../../stores/baseApi';
import { IContract, IDeposit, ContractStatus } from '../../../types';
import { adaptContract, adaptDeposit } from '../../../utils/adapters';

export const contractApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContracts: builder.query<IContract[], { status?: ContractStatus; tenantId?: number } | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params && 'status' in params && params.status) queryParams.status = params.status;
        if (params && 'tenantId' in params && params.tenantId) queryParams.tenant_id = params.tenantId;
        return {
          url: '/contracts',
          params: queryParams,
        };
      },
      transformResponse: (res: any[]) => (res || []).map(adaptContract),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Contract' as const, id })),
              { type: 'Contract', id: 'LIST' },
            ]
          : [{ type: 'Contract', id: 'LIST' }],
    }),

    getMyContracts: builder.query<IContract[], void>({
      query: () => '/contracts/my',
      transformResponse: (res: any[]) => (res || []).map(adaptContract),
      providesTags: ['Contract'],
    }),

    getContractById: builder.query<IContract, number>({
      query: (id) => `/contracts/${id}`,
      transformResponse: (res: any) => adaptContract(res),
      providesTags: (_result, _error, id) => [{ type: 'Contract', id }],
    }),

    getDeposits: builder.query<IDeposit[], void>({
      query: () => '/deposits',
      transformResponse: (res: any[]) => (res || []).map(adaptDeposit),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Deposit' as const, id })),
              { type: 'Deposit', id: 'LIST' },
            ]
          : [{ type: 'Deposit', id: 'LIST' }],
    }),

    getMyDeposits: builder.query<IDeposit[], void>({
      query: () => '/deposits/my',
      transformResponse: (res: any[]) => (res || []).map(adaptDeposit),
      providesTags: ['Deposit'],
    }),

    createContract: builder.mutation<IContract, Partial<IContract>>({
      query: (payload) => ({
        url: '/contracts',
        method: 'POST',
        body: {
          apartment_id: payload.apartmentId,
          tenant_id: payload.tenantId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          rental_price: payload.rentalPrice,
          deposit_amount: payload.depositAmount,
          booking_id: payload.bookingId,
        },
      }),
      transformResponse: (res: any) => adaptContract(res),
      invalidatesTags: [
        { type: 'Contract', id: 'LIST' },
        { type: 'Deposit', id: 'LIST' },
        { type: 'Booking', id: 'LIST' },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),

    approveAndActivateContract: builder.mutation<IContract, { contractId: number }>({
      query: ({ contractId }) => ({
        url: `/contracts/${contractId}/activate`,
        method: 'PATCH',
      }),
      transformResponse: (res: any) => adaptContract(res),
      invalidatesTags: [
        { type: 'Contract', id: 'LIST' },
        { type: 'Deposit', id: 'LIST' },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),

    renewContract: builder.mutation<IContract, { contractId: number; newEndDate: string; newPrice?: number }>({
      query: ({ contractId, newEndDate, newPrice }) => ({
        url: `/contracts/${contractId}/renew`,
        method: 'POST',
        body: {
          new_end_date: newEndDate,
          new_rental_price: newPrice,
        },
      }),
      transformResponse: (res: any) => adaptContract(res),
      invalidatesTags: [
        { type: 'Contract', id: 'LIST' },
        { type: 'Alert', id: 'LIST' },
      ],
    }),

    terminateAndSettleContract: builder.mutation<
      { contract: IContract; deposit: IDeposit; refundAmount: number },
      { contractId: number; deductionAmount: number; deductionReason: string }
    >({
      query: ({ contractId, deductionAmount, deductionReason }) => ({
        url: `/deposits/contract/${contractId}/settle-detail`,
        method: 'POST',
        body: {
          deduction_amount: deductionAmount,
          deduction_reason: deductionReason,
        },
      }),
      transformResponse: (res: any) => ({
        contract: adaptContract(res.contract || { id: res.contract_id, status: 'TERMINATED' }),
        deposit: adaptDeposit(res.deposit || { id: res.deposit_id, status: 'REFUNDED' }),
        refundAmount: Number(res.refund_amount || 0),
      }),
      invalidatesTags: [
        { type: 'Contract', id: 'LIST' },
        { type: 'Deposit', id: 'LIST' },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),

    summarizeContractAI: builder.mutation<any, { contractId: number }>({
      query: ({ contractId }) => ({
        url: `/ai/contracts/${contractId}/summarize`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res.ai_summary || res,
    }),

    receiveDeposit: builder.mutation<IDeposit, { contractId: number; amount: number }>({
      query: ({ contractId, amount }) => ({
        url: `/deposits/contract/${contractId}/receive`,
        method: 'PATCH',
        body: { amount },
      }),
      transformResponse: (res: any) => adaptDeposit(res),
      invalidatesTags: [
        { type: 'Contract', id: 'LIST' },
        { type: 'Deposit', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetContractsQuery,
  useGetMyContractsQuery,
  useGetContractByIdQuery,
  useGetDepositsQuery,
  useGetMyDepositsQuery,
  useCreateContractMutation,
  useApproveAndActivateContractMutation,
  useRenewContractMutation,
  useTerminateAndSettleContractMutation,
  useSummarizeContractAIMutation,
  useReceiveDepositMutation,
} = contractApi;

