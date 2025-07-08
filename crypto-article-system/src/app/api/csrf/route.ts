import { createCSRFTokenEndpoint } from '@/lib/csrf-middleware'

// GET /api/csrf - CSRFトークンを取得
export const GET = createCSRFTokenEndpoint()