import {computed} from 'vue'
import {noticeRecords as notifications} from '../api/workspace'
import {mutate} from '../api/client'
export function useNotifications(){return {notifications,unreadCount:computed(()=>notifications.value.filter(n=>n.unread).length),markRead:id=>mutate('/notifications/'+id+'/read',{},'PATCH'),markAllRead:()=>mutate('/notifications/all/read',{},'PATCH'),addNotification:()=>{}}}
