import { z } from 'zod'
import { REQUEST_STATUSES, SERVICE_DISTRICTS } from '../domain/requests.ts'
import { isCompleteAddress, isMoscowAddress } from '../domain/address.ts'

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const slot = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/, 'Укажите слот ЧЧ:ММ-ЧЧ:ММ')
  .refine((value) => {
    const [start,end] = value.split('-').map((time) => Number(time.slice(0,2))*60+Number(time.slice(3)))
    return end-start===120
  }, 'Слот должен длиться 2 часа')
const date = z.string().datetime({ offset: true, message: 'Укажите ISO 8601 с часовым поясом' })
  .transform((value) => new Date(value).toISOString())
const common = {
  service_id: id,
  description: z.string().trim().min(3).max(2000),
  preferred_datetime: date,
  preferred_slot: slot,
  photos: z.array(z.string().max(180000).refine(value=>/^data:image\/webp;base64,UklGR[A-Za-z0-9+/=]+$/.test(value)||(/^https?:\/\//i.test(value)&&value.length<=512), 'Некорректное изображение')).max(5).default([]),
  contact_person: z.string().trim().min(2).max(150).optional(),
}
export const createRequestSchema = z.discriminatedUnion('service_mode', [
  z.object({ ...common, service_mode: z.literal('onsite'), client_address: z.string().trim().max(500).refine(isCompleteAddress, 'Укажите город, улицу и номер дома через запятую').refine(value => !isCompleteAddress(value) || isMoscowAddress(value), 'Выезд доступен только по Москве'), service_district: z.enum(SERVICE_DISTRICTS), dropoff_point_id: z.null().optional() }).strict(),
  z.object({ ...common, service_mode: z.literal('dropoff'), dropoff_point_id: id, client_address: z.null().optional(), service_district: z.null().optional() }).strict(),
]).superRefine((value, context) => {
  if (Date.parse(value.preferred_datetime)<=Date.now()) context.addIssue({ code: 'custom', path: ['preferred_datetime'], message: 'Дата обслуживания должна быть в будущем' })
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value.preferred_datetime))
  if (time !== value.preferred_slot.slice(0,5) || new Date(value.preferred_datetime).getUTCSeconds()!==0 || new Date(value.preferred_datetime).getUTCMilliseconds()!==0) {
    context.addIssue({ code: 'custom', path: ['preferred_slot'], message: 'Начало слота должно совпадать с датой/временем обслуживания в Europe/Moscow' })
  }
})
export const cancelRequestSchema = z.object({ cancel_reason: z.string().trim().min(1).max(500).default('Отменено клиентом') }).strict()
export const noAnswerSchema = z.object({ comment: z.string().trim().max(500).optional() }).strict()
export const assignRequestSchema = z.object({ master_id: id }).strict()
export const emptyActionSchema = z.object({}).strict()
export const requestIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const listFields = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  status: z.enum(REQUEST_STATUSES).optional(),
}
export const clientRequestListSchema = z.object(listFields).strict()
export const adminRequestListSchema = z.object({
  ...listFields,
  search: z.string().trim().max(100).optional(),
  needs_manual_review: z.enum(['0','1']).transform(Number).optional(),
}).strict()
export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type RequestListQuery = z.infer<typeof adminRequestListSchema>
