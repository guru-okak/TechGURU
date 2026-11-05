export interface Env {
  DB: D1Database
  APP_ENV: string
  JWT_SECRET?: string
  YANDEX_GEOCODER_API_KEY?: string
  ENABLE_LOCAL_CHECKS?: string
  BACKUPS?: R2Bucket
}


