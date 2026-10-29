import { baseApi } from '../../../stores/baseApi';
import { IDocumentChunk } from '../../../types';
import { adaptDocumentChunk } from '../../../utils/adapters';
import { IRAGAnswerResult } from '../../../utils/aiEngines';

export const ragApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRAGChunks: builder.query<IDocumentChunk[], { category?: string } | void>({
      query: () => '/ai/knowledge-chunks',
      transformResponse: (res: any[], _meta, arg) => {
        let list = (res || []).map(adaptDocumentChunk);
        if (arg && 'category' in arg && arg.category) {
          list = list.filter((c) => c.category === arg.category);
        }
        return list;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RAGChunk' as const, id })),
              { type: 'RAGChunk', id: 'LIST' },
            ]
          : [{ type: 'RAGChunk', id: 'LIST' }],
    }),

    askRAGChatbot: builder.mutation<IRAGAnswerResult, { question: string }>({
      query: ({ question }) => ({
        url: '/ai/rag-chat',
        method: 'POST',
        body: {
          question,
          history: [],
        },
      }),
      transformResponse: (res: any): IRAGAnswerResult => {
        const rawList =
          (res.matchedChunks && res.matchedChunks.length > 0)
            ? res.matchedChunks
            : (res.citations && res.citations.length > 0)
            ? res.citations
            : res.sources || [];
        const matchedChunks: IDocumentChunk[] = rawList.map((c: any, index: number) => {
          if (typeof c === 'string') {
            return {
              id: index + 1,
              docCode: 'DOC-NOI-QUY-2026',
              documentName: 'Sổ tay Nội quy Tòa nhà Dwell',
              title: c,
              chunkIndex: index + 1,
              category: 'LIVING_RULES',
              content: c,
              citation: c,
              createdAt: new Date().toISOString(),
            };
          }
          return adaptDocumentChunk(c);
        });

        return {
          answer: res.answer || 'Hệ thống đã ghi nhận câu hỏi của bạn.',
          confidence: Number(res.confidence_score) || 0.95,
          matchedChunks,
          guardrailStatus: 'PASSED',
        };
      },
    }),

    addDocumentChunk: builder.mutation<IDocumentChunk, Partial<IDocumentChunk>>({
      query: (payload) => ({
        url: '/ai/knowledge-chunks',
        method: 'POST',
        body: {
          document_name: payload.documentName || 'Nội quy Tòa nhà Dwell',
          content: payload.content || '',
          chunk_index: payload.chunkIndex,
          title: payload.title,
          citation: payload.citation,
        },
      }),
      transformResponse: (res: any): IDocumentChunk => adaptDocumentChunk(res),
      invalidatesTags: [{ type: 'RAGChunk', id: 'LIST' }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetRAGChunksQuery,
  useAskRAGChatbotMutation,
  useAddDocumentChunkMutation,
} = ragApi;
