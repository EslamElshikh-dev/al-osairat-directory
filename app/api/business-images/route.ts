import { NextResponse } from 'next/server';
import { SUPABASE_URL, AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, sameOrigin } from '@/lib/auth/supabase-rest';
import { memberHeaders, memberJson, resolveMemberSession } from '@/lib/auth/member-server';
import { BUSINESS_IMAGE_MAX_BYTES, businessImagePathPattern, businessImageUrl, imageMime } from '@/lib/business-images';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request) {
  if (!sameOrigin(request)) return memberJson({error:'طلب غير مسموح.'},null,403);
  const session=await resolveMemberSession();
  if (!session) return memberJson({error:'سجّل الدخول لإرفاق الصور.'},null,401);
  if (!session.member.emailVerified) return memberJson({error:'أكد بريدك الإلكتروني قبل إرسال صور النشاط.'},session,403);
  if (Number(request.headers.get('content-length'))>BUSINESS_IMAGE_MAX_BYTES+4096) return memberJson({error:'الصورة أكبر من ٢ ميجابايت.'},session,413);
  try {
    const data=await request.formData();
    const file=data.get('image');
    if (!(file instanceof File) || !file.size || file.size>BUSINESS_IMAGE_MAX_BYTES) return memberJson({error:'اختر صورة بحجم لا يزيد عن ٢ ميجابايت.'},session,400);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const mime=imageMime(bytes);
    if (!mime) return memberJson({error:'الصيغ المدعومة: JPG وPNG وWebP.'},session,400);
    const path=`${session.member.localId}/${crypto.randomUUID()}.${mime.extension}`;
    const response=await fetch(`${SUPABASE_URL}/storage/v1/object/business-images/${path}`,{
      method:'POST',headers:{...memberHeaders(session.accessToken),'Content-Type':mime.type,'x-upsert':'false'},
      body:bytes,cache:'no-store',signal:AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('UPLOAD_FAILED');
    return memberJson({path,url:businessImageUrl(path)},session,201);
  } catch { return memberJson({error:'تعذر رفع الصورة. حاول مرة أخرى.'},session,503); }
}

export async function GET(request:Request) {
  const path=new URL(request.url).searchParams.get('path')||'';
  if (!businessImagePathPattern.test(path)) return new Response(null,{status:404});
  const session=await resolveMemberSession();
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/business-images/${path}`,{
    headers:memberHeaders(session?.accessToken),cache:'no-store',signal:AbortSignal.timeout(10000),
  }).catch(()=>null);
  // Storage RLS admits only the submitter/owner or an already published image.
  if (!response?.ok) return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
  const output=new NextResponse(response.body,{headers:{'Content-Type':response.headers.get('content-type')||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',Vary:'Cookie'}});
  if(session?.refreshed){
    output.cookies.set(AUTH_ACCESS_COOKIE,session.refreshed.access_token,{...authCookieBase,maxAge:Math.max(300,(session.refreshed.expires_in||3600)-60)});
    output.cookies.set(AUTH_REFRESH_COOKIE,session.refreshed.refresh_token,{...authCookieBase,maxAge:60*60*24*30});
  }
  return output;
}
