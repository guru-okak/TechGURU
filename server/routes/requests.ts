import type { Env } from '../env.ts'
import { requireRole } from '../middleware/auth.ts'
import { HttpError, json, readJson } from '../middleware/http.ts'
import { requireCsrf } from '../security/cookies.ts'
import { createRequestSchema, clientRequestListSchema, adminRequestListSchema, requestIdSchema, cancelRequestSchema, emptyActionSchema, assignRequestSchema, noAnswerSchema } from '../../shared/contracts/requests.ts'
import { RequestRepository, requestDto } from '../repositories/requests.ts'
import * as service from '../services/requests.ts'
import { BusinessRepository } from '../repositories/business.ts'
import { z } from 'zod'
import { auditMetadata } from '../services/auth.ts'

async function optionalJson(request: Request): Promise<unknown> { return readJson(request, true) }
function methodError(allowed: string): never { throw new HttpError(405,'METHOD_NOT_ALLOWED','Метод не поддерживается',{ Allow: allowed }) }
export async function requestsRoute(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const clientRoot = url.pathname==='/api/requests'
  const adminRoot = url.pathname==='/api/admin/requests'
  const match = /^\/api\/(admin\/)?requests\/(\d+)(?:\/(cancel|confirm|assign|no-answer))?$/.exec(url.pathname)
  if (!clientRoot && !adminRoot && !match) return null
  const admin = adminRoot || Boolean(match?.[1])
  const { user } = await requireRole(admin ? ['admin'] : ['client'])(request,env)
  const repository = new RequestRepository(env.DB)
  if (clientRoot || adminRoot) {
    if (request.method==='GET') {
      const query = (admin ? adminRequestListSchema : clientRequestListSchema).parse(Object.fromEntries(url.searchParams))
      return json(await repository.list(query,admin ? undefined : user.id))
    }
    if (!admin && request.method==='POST') {
      requireCsrf(request)
      const input = createRequestSchema.parse(await readJson(request,false,1000000))
      const created = await service.createRequest(input,user,request,env)
      if (url.searchParams.get('auto_confirm') !== '1') return json({ data: created },201)
      const business = new BusinessRepository(env,user,request,true)
      try {
        const row = await service.findRequest(repository,created.id,user.id)
        if (await repository.confirm(row,null,auditMetadata(request,env),false)) await business.autoAssign(row.id)
      } catch (error) {
        console.error('Automatic request scheduling failed', created.id, error instanceof Error ? error.name : 'UnknownError')
      }
      const current = await service.findRequest(repository,created.id,user.id)
      if (current.status === 'confirmed' && current.needs_manual_review) {
        await business.q(`INSERT OR IGNORE INTO notifications(user_id,request_id,type,message,event_key)
          SELECT u.id,r.id,'manual_assignment_required','Требуется назначение мастера: '||r.request_number,'auto-confirm:'||r.id||':'||u.id
          FROM requests r CROSS JOIN users u WHERE r.id=? AND r.status='confirmed' AND r.needs_manual_review=1 AND u.role='admin' AND u.is_active=1`, current.id).run()
      }
      return json({ data: requestDto(current) },201)
    }
    if(admin&&request.method==='POST'){
      requireCsrf(request)
      const raw=z.object({user_id:z.number().int().positive(),comment:z.string().trim().max(2000).nullable().optional()}).passthrough().parse(await readJson(request))
      const {user_id,comment,...payload}=raw,input=createRequestSchema.parse(payload)
      const row=await repository.create(input,user,auditMetadata(request,env),user_id,comment??null)
      if(!row)throw new HttpError(422,'INVALID_REFERENCES','Проверьте клиента, услугу и точку приёма')
      return json({data:await repository.detail(row)},201)
    }
    return methodError(admin ? 'GET' : 'GET, POST')
  }
  const id = requestIdSchema.parse(match![2])
  const action = match![3]
  if (!action) {
    if (request.method!=='GET') return methodError('GET')
    const row = await service.findRequest(repository,id,admin ? undefined : user.id)
    const detail = await repository.detail(row)
    if (!detail) throw new HttpError(404,'REQUEST_NOT_FOUND','Заявка не найдена')
    return json({ data: detail })
  }
  if ((!admin && action!=='cancel') || (admin && action==='cancel')) throw new HttpError(404,'NOT_FOUND','Маршрут не найден')
  const method = action==='no-answer' ? 'POST' : 'PATCH'
  if (request.method!==method) return methodError(method)
  requireCsrf(request)
  const body = await optionalJson(request)
  if (action==='cancel') return json({ data: await service.cancelRequest(id,cancelRequestSchema.parse(body).cancel_reason,user,request,env) })
  if (action==='confirm') {
    const options=z.object({manual_assignment:z.boolean().optional()}).strict().parse(body)
    await service.confirmRequest(id,user,request,env)
    return json({ data: options.manual_assignment?await repository.detail(await service.findRequest(repository,id)):await new BusinessRepository(env,user,request).autoAssign(id) })
  }
  if (action==='assign') return json({ data: await service.assignRequest(id,assignRequestSchema.parse(body).master_id,user,request,env) })
  return json({ data: await service.noAnswer(id,noAnswerSchema.parse(body).comment,user,request,env) })
}


