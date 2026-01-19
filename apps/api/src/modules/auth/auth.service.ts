import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import type {
  RegisterInput,
  LoginInput,
  UserResponse,
  JwtPayload,
} from './auth.schema.js'

// ============================================
// Serviço de Autenticação
// Contém toda a lógica de negócio relacionada a auth
// ============================================

// Número de rounds para o bcrypt (quanto maior, mais seguro mas mais lento)
const SALT_ROUNDS = 10

export class AuthService {
  // ----------------------------------------
  // Registrar novo usuário
  // ----------------------------------------
  async register(data: RegisterInput): Promise<UserResponse> {
    // Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new AuthError('Email já cadastrado', 'EMAIL_EXISTS', 409)
    }

    // Gera hash da senha
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    // Gera slug único para o time pessoal
    const baseSlug = data.name
      ? data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20)
      : (data.email.split('@')[0] ?? 'user').toLowerCase().replace(/[^a-z0-9]/g, '-')
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`

    // Cria o usuário e o time pessoal em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Cria o usuário
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      })

      // Buscar plano Free para atribuir ao novo time
      const freePlan = await tx.plan.findUnique({
        where: { slug: 'free' },
      })

      if (!freePlan) {
        throw new AuthError(
          'Plano Free não encontrado. Execute o seed dos planos.',
          'PLAN_NOT_FOUND',
          500
        )
      }

      // Cria o time pessoal do usuário com subscription Free
      await tx.team.create({
        data: {
          name: data.name ? `Time de ${data.name}` : 'Meu Time',
          slug: uniqueSlug,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN',
            },
          },
          subscription: {
            create: {
              planId: freePlan.id,
              status: 'ACTIVE',
            },
          },
        },
      })

      return user
    })

    return result
  }

  // ----------------------------------------
  // Login do usuário
  // ----------------------------------------
  async login(data: LoginInput): Promise<{ user: UserResponse; payload: JwtPayload }> {
    // Busca usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      throw new AuthError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401)
    }

    // Verifica a senha
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash)

    if (!isPasswordValid) {
      throw new AuthError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401)
    }

    // Prepara payload do JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    }

    // Retorna usuário (sem senha) e payload para gerar token
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      payload,
    }
  }

  // ----------------------------------------
  // Buscar usuário por ID
  // ----------------------------------------
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return user
  }

  // ----------------------------------------
  // Buscar usuário por email
  // ----------------------------------------
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return user
  }
}

// ============================================
// Classe de Erro customizada para Auth
// ============================================
export class AuthError extends Error {
  public code: string
  public statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode
  }
}

// Exporta instância única do serviço
export const authService = new AuthService()
