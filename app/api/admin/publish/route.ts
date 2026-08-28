import { NextResponse } from 'next/server';
import { SUPABASE_URL, sameOrigin } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubmissionRow = {
  id: string;
  business_name: string;
};

function cleanNote(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 1200);
}

function makeSlug(title: string, id: string) {
  const base = title
    .normalize('NFC')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return `${base || 'نشاط'}-${id.slice(0, 8)}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  const note = cleanNote(body?.note);
  if (!id) return adminJson({ error: 'حدد طلب النشاط المراد نشره.' }, session, 400);

  try {
    const submissionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/business_submissions?select=id,business_name&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers: adminRestHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!submissionResponse.ok) throw new Error('SUBMISSION_READ_FAILED');
    const rows = await submissionResponse.json() as SubmissionRow[];
    const submission = rows[0];
    if (!submission) return adminJson({ error: 'طلب النشاط غير موجود.' }, session, 404);

    const slug = makeSlug(submission.business_name, submission.id);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/publish_business_submission`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: JSON.stringify({ p_id: submission.id, p_slug: slug, p_note: note || null }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.text();
      if (details.includes('rejected_submission_cannot_publish')) {
        return adminJson({ error: 'لا يمكن نشر طلب مرفوض. غيّر قرار المراجعة أولًا.' }, session, 409);
      }
      if (details.includes('duplicate key') && details.includes('slug')) {
        return adminJson({ error: 'تعذر إنشاء رابط فريد للنشاط. أعد المحاولة.' }, session, 409);
      }
      throw new Error('PUBLISH_FAILED');
    }

    const result = await response.json() as {
      published?: boolean;
      alreadyPublished?: boolean;
      listingId?: string;
      slug?: string;
      publishedAt?: string;
    };

    if (!result?.published || !result.slug) throw new Error('PUBLISH_RESULT_INVALID');

    return adminJson({
      published: true,
      alreadyPublished: Boolean(result.alreadyPublished),
      listingId: result.listingId || '',
      slug: result.slug,
      listingUrl: `/listing/${result.slug}`,
      publishedAt: result.publishedAt || null,
    }, session);
  } catch {
    return adminJson({ error: 'تعذر اعتماد ونشر النشاط الآن.' }, session, 500);
  }
}
