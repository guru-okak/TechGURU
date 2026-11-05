import {mutate} from '../api/client'
import { bindWorkModes } from './masterWorkModes'
import { reactive } from 'vue'
import { getMasterById } from './masters'
import { getUserById } from './users'
import { services } from './services'
export let CURRENT_MASTER_ID = 0
export function setCurrentMaster(id){CURRENT_MASTER_ID=id}
export const profileUser=reactive({id:0,full_name:'',phone:'',email:''})
export const profileMaster=reactive({id:0,user_id:0,experience_years:0,rating:0,max_daily_requests:1,is_available:0,is_onsite:1,is_dropoff:0,service_area:'[]'})
export const profileSkills=reactive([])
export const skillCatalog=[]
export const zoneCatalog = ['Центральный', 'Северный', 'Южный']
export const masterProfile = reactive({
 get fullName() { return profileUser.full_name }, set fullName(v) { profileUser.full_name = v },
 get phone() { return profileUser.phone }, set phone(v) { profileUser.phone = v },
 get email() { return profileUser.email }, set email(v) { profileUser.email = v },
 get experienceYears() { return profileMaster.experience_years }, get rating() { return profileMaster.rating },
 get maxDailyRequests() { return profileMaster.max_daily_requests }, get isAvailable() { return !!profileMaster.is_available },
 get skills() { return profileSkills.map(s => services.find(v => v.id === s.service_id)?.name).filter(Boolean) },
 get zones() { return JSON.parse(profileMaster.service_area) },
})
export async function saveMasterProfile(patch={}){await mutate('/profile',{full_name:patch.fullName,email:patch.email,phone:patch.phone},'PATCH')}
export async function setSkill(value,on){const service=services.find(s=>s.name===value);if(!service)return;const skills=profileSkills.filter(s=>s.service_id!==service.id).map(s=>({service_id:s.service_id,skill_level:s.skill_level}));if(on)skills.push({service_id:service.id,skill_level:service.required_skill_level});await mutate('/masters/'+profileMaster.id,{skills},'PATCH')}
export async function setZone(value, on) { const zones = masterProfile.zones.filter(z => z !== value); if (on && zoneCatalog.includes(value)) zones.push(value); await mutate('/masters/'+profileMaster.id,{service_area:zones},'PATCH') }
export function setAvailability(value){return mutate('/masters/'+profileMaster.id,{is_available:value?1:0},'PATCH')}
