export const searchText=value=>String(value??'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/\s+/g,' ').trim()
export const matchesSearch=(value,query)=>searchText(query).split(' ').every(word=>searchText(value).includes(word))
