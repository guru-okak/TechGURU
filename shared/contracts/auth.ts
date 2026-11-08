import { z } from 'zod'

const email = z.string().trim().toLowerCase().max(254).email('Некорректный email')
export const registerSchema = z.object({
  email,
  password: z.string().min(8, 'Минимум 8 символов').max(128, 'Максимум 128 символов'),
  full_name: z.string().trim().min(2, 'Укажите ФИО').max(150),
  phone: z.string().trim().regex(/^\+?[\d ()-]+$/, 'Некорректный телефон')
    .transform((value) => '+' + value.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\+[1-9]\d{9,14}$/, 'Телефон должен содержать от 10 до 15 цифр')),
}).strict()
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict()
export type RegisterInput = z.infer<typeof registerSchema>
export type Role = 'client' | 'master' | 'admin'
export interface PublicUser {
  id: number
  full_name: string
  email: string | null
  phone: string
  role: Role
  avatar_url?: string | null
  address: string | null
  created_at: string
}
export interface AuthUser extends PublicUser { password_hash: string; is_active: number; email_verified: number; google_sub?: string | null }
