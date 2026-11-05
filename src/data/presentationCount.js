const rules=new Intl.PluralRules('ru')
export function countLabel(n,one,few,many){const word={one,few,many,other:many}[rules.select(n)];return String(n)+' '+word}
