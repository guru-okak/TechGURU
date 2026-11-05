import type { Env } from './env.ts'
import { errorResponse } from './middleware/http.ts'
import { route } from './routes/index.ts'
import {scheduledJobs} from './jobs/run.ts'

export default {
  async scheduled(controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(scheduledJobs(env,controller.cron))},
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID()
    let response: Response
    try { response = await route(request, env) }
    catch (error) { response = errorResponse(error, requestId) }
    response.headers.set('X-Request-Id', requestId)
    return response
  },
} satisfies ExportedHandler<Env>

