import { z } from 'zod';

const envSchema = z.object({
  apiBaseUrl: z.string().min(1).default('/api/v1'),
  enableMock: z.boolean().default(false),
  appTitle: z.string().default('Quỹ Tín Dụng Nhân Dân'),
  isDev: z.boolean(),
  isProd: z.boolean(),
});

const parsed = envSchema.safeParse({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  enableMock: import.meta.env.VITE_ENABLE_MOCK === 'true',
  appTitle: import.meta.env.VITE_APP_TITLE || 'Quỹ Tín Dụng Nhân Dân',
  isDev: Boolean(import.meta.env.DEV),
  isProd: Boolean(import.meta.env.PROD),
});

if (!parsed.success) {
  throw new Error(`Invalid frontend environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

