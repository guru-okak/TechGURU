// PBKDF2 PHC format shared by seed and API; password strings are never trimmed.
const ITERATIONS = 100000
function base64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)) }
function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `$pbkdf2-sha256$i=${ITERATIONS}$${base64(salt)}$${base64(await derive(password, salt, ITERATIONS))}`
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const match = /^\$pbkdf2-sha256\$i=(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(stored)
    if (!match) return false
    const iterations = Number(match[1])
    if (!Number.isSafeInteger(iterations) || iterations < ITERATIONS || iterations > 1000000) return false
    const salt = new Uint8Array(fromBase64(match[2]))
    const expected = fromBase64(match[3])
    if (salt.length < 16 || salt.length > 64 || expected.length !== 32) return false
    const actual = await derive(password, salt, iterations)
    let difference = 0
    for (let i = 0; i < 32; i++) difference |= actual[i] ^ expected[i]
    return difference === 0
  } catch { return false }
}
// Same KDF work for an unknown email; this value is not a usable account hash.
export const DUMMY_PASSWORD_HASH = '$pbkdf2-sha256$i=100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
