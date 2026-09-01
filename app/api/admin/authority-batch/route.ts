import { NextResponse } from 'next/server';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import { sameOrigin, SUPABASE_URL } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sourceStatuses = new Set(['source_only', 'cross_checked', 'google_verified', 'needs_review']);
const evidenceTypes = new Set(['legacy_directory', 'user_collected', 'google_maps']);

type AuthorityUpdatePayload = {
  id?: string;
  phone?: string | null;
  description?: string | null;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  sourceStatus?: string;
  evidenceType?: string;
  evidenceLabel?: string | null;
  evidenceUrl?: string | null;
};

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function validHttpUrl(value: string | null) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function adminRpc(accessToken: string, rpc: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: adminRestHeaders(accessToken, true),
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بعرض دفعة سلطة البيانات.' }, { status: 403 });

  try {
    const response = await adminRpc(session.accessToken, 'get_directory_authority_batch', { p_limit: 20 });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('AUTHORITY_BATCH_LOAD_FAILED', response.status, detail.slice(0, 500));
      return adminJson({ error: 'تعذر تحميل دفعة التوثيق ذات الأولوية الآن.' }, session, 502);
    }

    const items = await response.json();
    return adminJson({ ok: true, items: Array.isArray(items) ? items : [] }, session);
  } catch (error) {
    console.error('AUTHORITY_BATCH_LOAD_ERROR', error);
    return adminJson({ error: 'حدث خطأ أثناء تحميل دفعة سلطة البيانات.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 403 });

  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بتعديل سلطة البيانات.' }, { status: 403 });

  let payload: AuthorityUpdatePayload;
  try {
    payload = await request.json() as AuthorityUpdatePayload;
  } catch {
    return adminJson({ error: 'بيانات الطلب غير صالحة.' }, session, 400);
  }

  const id = clean(payload.id, 240);
  const phone = clean(payload.phone, 40);
  const description = clean(payload.description, 1200);
  const googleMapsUrl = clean(payload.googleMapsUrl, 1000);
  const googlePlaceId = clean(payload.googlePlaceId, 300);
  const sourceStatus = clean(payload.sourceStatus, 40);
  const evidenceType = clean(payload.evidenceType, 40) || 'legacy_directory';
  const evidenceLabel = clean(payload.evidenceLabel, 300);
  const evidenceUrl = clean(payload.evidenceUrl, 1000);

  if (!id || !sourceStatus || !sourceStatuses.has(sourceStatus)) {
    return adminJson({ error: 'السجل أو حالة المصدر غير صالحة.' }, session, 400);
  }
  if (!evidenceTypes.has(evidenceType)) {
    return adminJson({ error: 'نوع مصدر الإثبات غير صالح.' }, session, 400);
  }
  if (!validHttpUrl(googleMapsUrl) || !validHttpUrl(evidenceUrl)) {
    return adminJson({ error: 'روابط المصدر وGoogle Maps يجب أن تكون روابط HTTP أو HTTPS صالحة.' }, session, 400);
  }
  if (sourceStatus === 'google_verified' && evidenceType !== 'google_maps') {
    return adminJson({ error: 'حالة Google موثق تتطلب اختيار Google Maps كمصدر الإثبات.' }, session, 400);
  }
  if (sourceStatus === 'google_verified' && !googleMapsUrl && !googlePlaceId) {
    return adminJson({ error: 'حالة Google موثق تتطلب رابط Google Maps أو Place ID على الأقل.' }, session, 400);
  }
  if (sourceStatus === 'cross_checked' && !evidenceLabel && !evidenceUrl) {
    return adminJson({ error: 'المراجعة متعددة المصادر تحتاج وصفًا أو رابطًا لمصدر الإثبات.' }, session, 400);
  }

  try {
    const response = await adminRpc(session.accessToken, 'update_directory_authority_record', {
      p_id: id,
      p_phone: phone,
      p_description: description,
      p_google_maps_url: googleMapsUrl,
      p_google_place_id: googlePlaceId,
      p_source_status: sourceStatus,
      p_evidence_type: evidenceType,
      p_evidence_label: evidenceLabel,
      p_evidence_url: evidenceUrl,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('AUTHORITY_BATCH_SAVE_FAILED', response.status, detail.slice(0, 500));
      return adminJson({ error: 'تعذر حفظ مراجعة السجل. راجع البيانات وحالة المصدر.' }, session, 502);
    }

    const result = await response.json();
    return adminJson({ ok: true, result }, session);
  } catch (error) {
    console.error('AUTHORITY_BATCH_SAVE_ERROR', error);
    return adminJson({ error: 'حدث خطأ أثناء حفظ مراجعة السجل.' }, session, 500);
  }
}
