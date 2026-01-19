import 'dotenv/config'
import { z } from 'zod'

// Schema de validação das variáveis de ambiente
const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT (opcional para o worker, obrigatório para a API)
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@example.com'),

  // WhatsApp (Evolution API)
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3333),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3333'),
})

// Tipo inferido do schema
export type Env = z.infer<typeof envSchema>

// Função para carregar e validar as variáveis de ambiente
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:')
    console.error(parsed.error.flatten().fieldErrors)
    process.exit(1)
  }

  return parsed.data
}

// Exporta as variáveis de ambiente validadas
export const env = loadEnv()
