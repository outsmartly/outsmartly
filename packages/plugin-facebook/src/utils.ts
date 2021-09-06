export async function hash(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashencoded = await crypto.subtle.digest('SHA-256', data);
  return hashencoded;
}

export function decodeToString(encodedstr: ArrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  const decodedstr = decoder.decode(encodedstr);
  return decodedstr;
}
