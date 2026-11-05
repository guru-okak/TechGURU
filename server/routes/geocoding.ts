import { z } from 'zod'
import type { Env } from '../env.ts'
import { requireRole } from '../middleware/auth.ts'
import { HttpError, json, readJson } from '../middleware/http.ts'
import { requireCsrf } from '../security/cookies.ts'
import { isCompleteAddress } from '../../shared/domain/address.ts'

const addressInput = z.object({ address: z.string().trim().max(500).refine(isCompleteAddress) }).strict()
const coordinates = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict()
const inputSchema = z.union([addressInput, coordinates])

function serviceDistrict(latitude: number, areas: string[]) {
  if (areas.some(name => /^центральный административный округ$/i.test(name))) return 'Центральный'
  if (areas.some(name => /^север\S* административный округ$/i.test(name))) return 'Северный'
  if (areas.some(name => /^юж\S* административный округ$/i.test(name))) return 'Южный'
  // В проекте три зоны, поэтому для остальных адресов Москвы используем широту дома.
  return latitude >= 55.81 ? 'Северный' : latitude < 55.70 ? 'Южный' : 'Центральный'
}

export async function geocodingRoute(request: Request, env: Env) {
  if (request.method !== 'POST') throw new HttpError(405,'METHOD_NOT_ALLOWED','Используйте POST',{Allow:'POST'})
  await requireRole(['client'])(request,env)
  requireCsrf(request)
  const input = inputSchema.parse(await readJson(request))
  const key = env.YANDEX_GEOCODER_API_KEY
  if (!key) throw new HttpError(503,'GEOCODER_UNAVAILABLE','Проверка адресов пока недоступна.')
  const reverse = 'latitude' in input
  const params = new URLSearchParams({
    apikey:key, format:'json', lang:'ru_RU', results:'1',
    geocode:reverse ? `${input.longitude},${input.latitude}` : input.address.split(',').slice(0,3).join(','),
  })
  if (reverse) params.set('kind','house')
  const response = await fetch('https://geocode-maps.yandex.ru/v1/?'+params,{signal:AbortSignal.timeout(7000)}).catch(()=>null)
  if (!response?.ok) throw new HttpError(503,'GEOCODER_UNAVAILABLE','Проверка адресов пока недоступна.')
  const result = await response.json() as {
    response?: { GeoObjectCollection?: { featureMember?: Array<{ GeoObject: {
      Point: { pos: string }
      metaDataProperty: { GeocoderMetaData: { precision: string; Address: { Components: {kind:string;name:string}[] } } }
    } }> } }
  }
  const object = result.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
  const metadata = object?.metaDataProperty?.GeocoderMetaData
  const components = metadata?.Address?.Components ?? []
  const street = components.find(part=>part.kind==='street')?.name
  const house = components.find(part=>part.kind==='house')?.name
  const city = components.find(part=>part.kind==='locality')?.name
  const [longitude,latitude] = (object?.Point?.pos ?? '').split(' ').map(Number)
  if (!street || !house || !Number.isFinite(latitude) || !Number.isFinite(longitude) || (!reverse && metadata?.precision!=='exact')) {
    throw new HttpError(422,'ADDRESS_NOT_FOUND','Точный адрес дома не найден. Проверьте улицу и номер.')
  }
  if (city !== 'Москва') throw new HttpError(422,'OUTSIDE_SERVICE_AREA','Выезд доступен по адресам Москвы.')
  return json({data:{address:[city,street,house].join(', '),latitude,longitude,district:serviceDistrict(latitude,components.map(part=>part.name))}})
}
