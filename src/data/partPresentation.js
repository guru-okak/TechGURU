import {parts} from './parts'
// Метаданные представления: не добавляют колонок в SQL-таблицу parts.
const map={
 1:['Смартфоны','display'],2:['Смартфоны','battery'],3:['Смартфоны','display'],4:['Смартфоны','battery'],5:['Смартфоны','connector'],
 6:['Ноутбуки и ПК','keyboard'],7:['Ноутбуки и ПК','touchpad'],8:['Планшеты','display'],9:['Смартфоны','antenna'],10:['Ноутбуки и ПК','board'],11:['Ноутбуки и ПК','ssd'],12:['Планшеты','cable']
}
export const partCategories=['Смартфоны','Ноутбуки и ПК','Планшеты','Другие запчасти']
export function partPresentation(id){const name=parts.find(p=>p.id===id)?.name??'';return /экран|дисплей/i.test(name)?{category:'Смартфоны',kind:'display'}:/термопаст/i.test(name)?{category:'Ноутбуки и ПК',kind:'paste'}:/насос|термостат|модул/i.test(name)?{category:'Другие запчасти',kind:'pump'}:{category:'Другие запчасти',kind:'board'}}
