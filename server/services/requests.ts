import type { Env } from '../env.ts'
import type { PublicUser } from '../../shared/contracts/auth.ts'
import type { CreateRequestInput } from '../../shared/contracts/requests.ts'
import { ACTIVE_REQUEST_STATUSES } from '../../shared/domain/requests.ts'
import { HttpError } from '../middleware/http.ts'
import { RequestRepository, requestDto } from '../repositories/requests.ts'
import type { RequestRow } from '../repositories/requests.ts'
import { auditMetadata } from './auth.ts'

function conflict(message = 'Заявка изменилась или действие недопустимо для текущего статуса'): never {
  throw new HttpError(409,'REQUEST_CONFLICT',message)
}
export async function findRequest(repository: RequestRepository, id: number, ownerId?: number): Promise<RequestRow> {
  const row = await repository.get(id,ownerId)
  if (!row) throw new HttpError(404,'REQUEST_NOT_FOUND','Заявка не найдена')
  return row
}
export async function createRequest(input: CreateRequestInput, actor: PublicUser, request: Request, env: Env) {
  const repository = new RequestRepository(env.DB)
  const service = await repository.service(input.service_id)
  if (!service?.is_active) throw new HttpError(422,'SERVICE_UNAVAILABLE','Услуга не найдена или неактивна')
  if (input.service_mode==='dropoff' && !await repository.point(input.dropoff_point_id)) throw new HttpError(422,'DROPOFF_POINT_UNAVAILABLE','Точка приёма не найдена или неактивна')
  let row
  try { row = await repository.create(input,actor,auditMetadata(request,env)) }
  catch (error) {
    if (error instanceof Error && (error.message+' '+String(error.cause)).includes('request_number_exhausted')) {
      throw new HttpError(409,'REQUEST_NUMBER_EXHAUSTED','Исчерпан диапазон номеров заявок за год')
    }
    throw error
  }
  if (!row) conflict('Услуга, точка приёма или учётная запись изменились. Повторите запрос')
  return requestDto(row)
}
export async function cancelRequest(id: number, reason: string, actor: PublicUser, request: Request, env: Env) {
  const repository = new RequestRepository(env.DB)
  const row = await findRequest(repository,id,actor.id)
  if (!['new','confirmed'].includes(row.status)) conflict('Отмена разрешена только из new или confirmed')
  const changed = await repository.cancel(row,actor,auditMetadata(request,env),reason)
  if (!changed) conflict()
  return requestDto(changed)
}
export async function confirmRequest(id: number, actor: PublicUser, request: Request, env: Env) {
  const repository = new RequestRepository(env.DB)
  const row = await findRequest(repository,id)
  if (row.status!=='new') conflict('Подтвердить можно только новую заявку')
  const service = await repository.service(row.service_id)
  if (!service?.is_active) conflict('Услуга больше неактивна')
  if (Date.parse(row.preferred_datetime)<=Date.now()) conflict('Нет свободного окна для указанного времени и длительности услуги')
  const changed = await repository.confirm(row,actor,auditMetadata(request,env))
  if (!changed) conflict()
  return requestDto(changed)
}
export async function assignRequest(id: number, masterId: number, actor: PublicUser | null, request: Request, env: Env, automatic=false) {
  const repository = new RequestRepository(env.DB)
  const row = await findRequest(repository,id)
  if (!['confirmed','assigned'].includes(row.status)) conflict('Назначение доступно только после подтверждения и до начала ремонта')
  if (row.master_id===masterId) conflict('Этот мастер уже назначен')
  if (!await repository.master(masterId)) throw new HttpError(422,'MASTER_NOT_FOUND','Мастер не найден')
  const slot = await repository.eligibleSlot(id,masterId)
  if (!slot || Date.parse(row.preferred_datetime)<=Date.now()) throw new HttpError(409,'MASTER_NOT_ELIGIBLE','Мастер не подходит по навыку, каналу, району, доступности, расписанию или загрузке')
  const changed = await repository.assign(row,masterId,slot.id,actor,auditMetadata(request,env),automatic)
  if (!changed) conflict('Заявка или свободное окно изменились. Обновите данные')
  return requestDto(changed)
}
export async function noAnswer(id: number, comment: string | undefined, actor: PublicUser, request: Request, env: Env) {
  const repository = new RequestRepository(env.DB)
  const row = await findRequest(repository,id)
  if (!(ACTIVE_REQUEST_STATUSES as readonly string[]).includes(row.status)) conflict('Нельзя добавить недозвон к завершённой или отменённой заявке')
  const result = await repository.noAnswer(row,actor,auditMetadata(request,env),comment)
  if (!result) conflict()
  return { ...requestDto(result.row), no_answer_count: result.attempts }
}
