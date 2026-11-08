export function pluralRu(count,one,few,many){const n=Math.abs(Number(count))%100;return n>=11&&n<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many}
export const counted=(count,one,few,many)=>`${count} ${pluralRu(count,one,few,many)}`
