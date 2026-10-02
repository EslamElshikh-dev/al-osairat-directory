export const BUSINESS_IMAGE_LIMIT = 3;
export const BUSINESS_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const businessImagePathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const businessImageUrl = (path: string) => `/api/business-images?path=${encodeURIComponent(path)}`;

export function imageMime(bytes: Uint8Array) {
  if (bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return {type:'image/jpeg',extension:'jpg'};
  if ([137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)) return {type:'image/png',extension:'png'};
  const ascii = (start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  if (ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP') return {type:'image/webp',extension:'webp'};
  return null;
}
