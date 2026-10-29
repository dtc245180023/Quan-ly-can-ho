import { baseApi } from '../../../stores/baseApi';
import { IDashboardStats } from '../../../types';
import { adaptDashboardStats } from '../../../utils/adapters';

export interface IRevenueTrendItem {
  period: string;
  rent: number;
  service: number;
  opex: number;
  total: number;
  rent_raw?: number;
  service_raw?: number;
  total_raw?: number;
}

export interface IRevenueTrendsResponse {
  monthly: IRevenueTrendItem[];
  quarterly: IRevenueTrendItem[];
  unit_label: string;
  divisor: number;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<IDashboardStats, { buildingId?: number } | void>({
      query: () => '/dashboard/summary',
      transformResponse: (res: any) => adaptDashboardStats(res),
      providesTags: [{ type: 'Dashboard', id: 'STATS' }],
    }),

    getRevenueReport: builder.query<{ totalRevenue: number; paymentCount: number }, { startDate: string; endDate: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/dashboard/revenue',
        params: { start_date: startDate, end_date: endDate },
      }),
      transformResponse: (res: any) => ({
        totalRevenue: Number(res.total_revenue || 0),
        paymentCount: res.payment_count || 0,
      }),
    }),

    getOverdueReport: builder.query<any[], void>({
      query: () => '/dashboard/overdue',
      providesTags: [{ type: 'Dashboard', id: 'STATS' }],
    }),

    getRevenueTrends: builder.query<IRevenueTrendsResponse, void>({
      query: () => '/dashboard/revenue-trends',
      providesTags: [{ type: 'Dashboard', id: 'TRENDS' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetDashboardStatsQuery,
  useGetRevenueReportQuery,
  useGetOverdueReportQuery,
  useGetRevenueTrendsQuery,
} = dashboardApi;
