import { baseApi } from '../../../stores/baseApi';
import { IBuilding, IApartment, ApartmentStatus } from '../../../types';
import { adaptBuilding, adaptApartment } from '../../../utils/adapters';

export const buildingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuildings: builder.query<IBuilding[], void>({
      query: () => '/buildings',
      transformResponse: (res: any[]) => (res || []).map(adaptBuilding),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Building' as const, id })),
              { type: 'Building', id: 'LIST' },
            ]
          : [{ type: 'Building', id: 'LIST' }],
    }),

    getApartments: builder.query<IApartment[], { buildingId?: number; status?: ApartmentStatus; floor?: number }>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params?.buildingId) queryParams.building_id = params.buildingId;
        if (params?.status) queryParams.status = params.status;
        return {
          url: '/apartments',
          params: queryParams,
        };
      },
      transformResponse: (res: any[], _meta, arg) => {
        let apts = (res || []).map((a) => adaptApartment(a));
        if (arg?.floor) {
          apts = apts.filter((a) => a.floor === Number(arg.floor));
        }
        return apts;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Apartment' as const, id })),
              { type: 'Apartment', id: 'LIST' },
            ]
          : [{ type: 'Apartment', id: 'LIST' }],
    }),

    getApartmentById: builder.query<IApartment, number>({
      query: (id) => `/apartments/${id}`,
      transformResponse: (res: any) => adaptApartment(res),
      providesTags: (_result, _error, id) => [{ type: 'Apartment', id }],
    }),

    updateApartmentStatus: builder.mutation<IApartment, { id: number; status: ApartmentStatus }>({
      query: ({ id, status }) => ({
        url: `/apartments/${id}`,
        method: 'PUT',
        body: { status },
      }),
      transformResponse: (res: any) => adaptApartment(res),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Apartment', id },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Building', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),

    createApartment: builder.mutation<IApartment, Partial<IApartment>>({
      query: (payload) => ({
        url: '/apartments',
        method: 'POST',
        body: {
          building_id: payload.buildingId || 1,
          room_number: payload.roomNumber || `P.${Math.floor(Math.random() * 900 + 100)}`,
          floor: payload.floor || 1,
          area_sqm: payload.areaSqm || 60,
          price: payload.price || 10000000,
          max_occupants: payload.maxOccupants || 3,
          status: payload.status || 'AVAILABLE',
        },
      }),
      transformResponse: (res: any) => adaptApartment(res),
      invalidatesTags: [
        { type: 'Apartment', id: 'LIST' },
        { type: 'Building', id: 'LIST' },
        { type: 'Dashboard', id: 'STATS' },
      ],
    }),

    createBuilding: builder.mutation<IBuilding, Partial<IBuilding>>({
      query: (payload) => ({
        url: '/buildings',
        method: 'POST',
        body: {
          building_code: `BLD-0${Date.now().toString().slice(-3)}`,
          name: payload.name || 'Tòa nhà mới',
          address: payload.address || 'Hồ Chí Minh',
          total_floors: payload.totalFloors || 10,
          total_apartments: payload.totalApartments || 50,
          status: payload.status || 'ACTIVE',
        },
      }),
      transformResponse: (res: any) => adaptBuilding(res),
      invalidatesTags: [{ type: 'Building', id: 'LIST' }],
    }),

    recommendApartmentsAI: builder.mutation<
      Array<{
        apartment_id: number;
        building_id: number;
        room_number: string;
        price: number;
        area_sqm: number;
        max_occupants: number;
        bedrooms?: number;
        bathrooms?: number;
        view_direction?: string;
        amenities: string[];
        reason: string;
        match_score?: number;
      }>,
      {
        max_budget: number;
        min_area?: number;
        occupants?: number;
        bedrooms?: number;
        view?: string;
        building_id?: number;
        amenities?: string[];
      }
    >({
      query: (body) => ({
        url: '/ai/apartments/recommend',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetBuildingsQuery,
  useGetApartmentsQuery,
  useGetApartmentByIdQuery,
  useUpdateApartmentStatusMutation,
  useCreateApartmentMutation,
  useCreateBuildingMutation,
  useRecommendApartmentsAIMutation,
} = buildingApi;
