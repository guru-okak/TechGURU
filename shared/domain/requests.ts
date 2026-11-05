export const REQUEST_STATUSES = ['new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed','cancelled','rejected'] as const
export type RequestStatus = typeof REQUEST_STATUSES[number]
export const ACTIVE_REQUEST_STATUSES = ['new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup'] as const
export const DAILY_LOAD_STATUSES: readonly RequestStatus[] = ['assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed']
export const SERVICE_DISTRICTS = ['Центральный','Северный','Южный'] as const
