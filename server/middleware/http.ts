import { ZodError } from 'zod'

export class HttpError extends Error {
  status: number
  code: string
  headers?: HeadersInit
  constructor(status: number, code: string, message: string, headers?: HeadersInit) {
    super(message)
    this.status = status
    this.code = code
    this.headers = headers
  }
}
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const result = new Headers(headers)
  result.set('Content-Type', 'application/json; charset=utf-8')
  result.set('Cache-Control', 'no-store')
  result.set('X-Content-Type-Options', 'nosniff')
  return new Response(JSON.stringify(data), { status, headers: result })
}
export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_form'
      ;(fields[key] ??= []).push(issue.message)
    }
    return json({ error: { code: 'VALIDATION_ERROR', message: 'Проверьте введённые данные', fields }, requestId }, 422)
  }
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message }, requestId }, error.status, error.headers)
  }
  // Do not log request bodies, credentials, SQL, or raw database errors.
  console.error(JSON.stringify({ requestId, code: 'INTERNAL_ERROR', type: error instanceof Error ? error.name : 'Unknown' }))
  return json({ error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' }, requestId }, 500)
}
export async function readJson(request: Request, allowEmpty = false, maxBytes = 32768): Promise<unknown> {
  const validContentType = /^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')
  if (!validContentType && !allowEmpty) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Ожидается application/json')
  }
  const reader = request.body?.getReader()
  if (!reader) {
    if (allowEmpty) return {}
    throw new HttpError(400, 'INVALID_JSON', 'Отсутствует JSON')
  }
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new HttpError(413, 'BODY_TOO_LARGE', 'Превышен допустимый размер запроса')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (size === 0 && allowEmpty) return {}
  if (!validContentType) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Ожидается application/json')
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { throw new HttpError(400, 'INVALID_JSON', 'Некорректный JSON') }
}



