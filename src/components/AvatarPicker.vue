<script setup>
import {mutate} from '../api/client'
import { ref, useId } from 'vue'
import { useSession } from '../composables/useSession'
import Button from './ui/Button.vue'
const {current}=useSession(), id=useId(), error=ref(''), busy=ref(false)
async function choose(event){
 const file=event.target.files?.[0];event.target.value='';error.value='';if(!file)return
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){error.value='Выберите фотографию JPG, PNG или WebP.';return}
 if(file.size>5*1024*1024){error.value='Размер фотографии — до 5 МБ.';return}
 const target=current.value,url=URL.createObjectURL(file);busy.value=true
 try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw Error();const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;const ctx=canvas.getContext('2d');const side=Math.min(image.naturalWidth,image.naturalHeight);ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,160,160);let photo=canvas.toDataURL('image/webp',.78);if(photo.length>28000)photo=canvas.toDataURL('image/webp',.4);if(photo.length>28000)throw Error();await mutate('/profile',{avatar_url:photo},'PATCH');URL.revokeObjectURL(url)}
 catch{URL.revokeObjectURL(url);error.value='Не удалось открыть фотографию. Выберите другой файл.'}
 finally{busy.value=false}
}
async function remove(){await mutate('/profile',{avatar_url:null},'PATCH');error.value=''}
</script>
<template><div class="profile-avatar-picker"><div><strong>Фотография профиля</strong><p>JPG, PNG или WebP до 5 МБ. Фото сохраняется в профиле. Изображение будет уменьшено до размера аватара.</p></div><div class="avatar-picker-actions"><label :for="'avatar-'+id" class="avatar-file-label" :class="{busy}">{{busy?'Открываем…':current.avatar?'Изменить фото':'Выбрать фото'}}<input :id="'avatar-'+id" type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" :aria-describedby="'avatar-hint-'+id" @change="choose"/></label><Button v-if="current.avatar" variant="ghost" size="sm" @click="remove">Удалить фото</Button></div><p v-if="error" :id="'avatar-hint-'+id" class="avatar-picker-error" role="alert">{{error}}</p><span v-else :id="'avatar-hint-'+id" class="sr-only">Фото сохраняется только в вашем профиле.</span></div></template>
<style scoped>.profile-avatar-picker{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:22px 0;border-bottom:1px solid var(--border);margin-bottom:27px}.profile-avatar-picker>div:first-child{flex:1;min-width:180px}.profile-avatar-picker strong{font-size:14px;font-weight:650}.profile-avatar-picker p{font-size:12px;line-height:1.8;color:var(--muted);margin-top:5px;max-width:420px}.avatar-picker-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.avatar-file-label{position:relative;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);padding:10px 14px;border-radius:11px;font-size:14px!important;font-weight:600;cursor:pointer;background:var(--surface);overflow:hidden;transition:border-color .2s,color .2s}.avatar-file-label:hover{border-color:var(--blue);color:var(--blue)}.avatar-file-label:focus-within{outline:2px solid var(--blue);outline-offset:3px}.avatar-file-label input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.avatar-file-label.busy{opacity:.6}.profile-avatar-picker .avatar-picker-error{width:100%;max-width:none;margin:0;color:var(--red);font-size:13px}
</style>

