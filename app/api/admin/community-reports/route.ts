import { NextResponse } from 'next/server';
import { blogBySlug } from '@/lib/blog-published';
import { SUPABASE_URL, sameOrigin } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';

type ReportRow = {
  id: string;
  user_id: string;
  review_id: string | null;
  reply_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  target_type: 'site' | 'article';
  target_key: string;
  rating: number;
  author_name: string;
  body: string;
  status: string;
};

type ReplyRow = {
  id: string;
  review_id: string;
  author_name: string;
  body: string;
  status: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const allowedStatuses = new Set(['reviewing', 'resolved', 'rejected']);

async function readRows<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: adminRestHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('COMMUNITY_ADMIN_READ_FAILED:' + path);
  return response.json() as Promise<T[]>;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanNote(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 1200);
}

function inFilter(ids: string[]) {
  return 'in.(' + ids.join(',') + ')';
}

function targetHref(review: ReviewRow | undefined) {
  if (!review) return '/';
  return review.target_type === 'site'
    ? '/#review-' + review.id
    : '/blog/' + encodeURIComponent(review.target_key) + '#review-' + review.id;
}

function targetLabel(review: ReviewRow | undefined) {
  if (!review) return 'مساهمة غير متاحة';
  if (review.target_type === 'site') return 'تقييم دليل العسيرات';
  return blogBySlug[review.target_key]?.title || 'تقييم على مقال';
}

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بعرض بلاغات المجتمع.' }, { status: 403 });

  try {
    const [reports, profiles] = await Promise.all([
      readRows<ReportRow>(
        'community_content_reports?select=id,user_id,review_id,reply_id,reason,details,status,review_note,reviewed_by,reviewed_at,created_at,updated_at&order=created_at.desc&limit=200',
        session.accessToken,
      ),
      readRows<ProfileRow>('profiles?select=id,full_name', session.accessToken).catch(() => []),
    ]);

    const replyIds = [...new Set(reports.map((row) => row.reply_id).filter((id): id is string => Boolean(id)))];
    const replies = replyIds.length
      ? await readRows<ReplyRow>(
        'content_review_replies?select=id,review_id,author_name,body,status&id=' + encodeURIComponent(inFilter(replyIds)),
        session.accessToken,
      )
      : [];

    const replyIndex = new Map(replies.map((row) => [row.id, row]));
    const reviewIds = [...new Set([
      ...reports.map((row) => row.review_id).filter((id): id is string => Boolean(id)),
      ...replies.map((row) => row.review_id),
    ])];
    const reviews = reviewIds.length
      ? await readRows<ReviewRow>(
        'content_reviews?select=id,target_type,target_key,rating,author_name,body,status&id=' + encodeURIComponent(inFilter(reviewIds)),
        session.accessToken,
      )
      : [];

    const reviewIndex = new Map(reviews.map((row) => [row.id, row]));
    const profileIndex = new Map(profiles.map((row) => [row.id, row]));

    const serialized = reports.map((report) => {
      const reply = report.reply_id ? replyIndex.get(report.reply_id) : undefined;
      const reviewId = report.review_id || reply?.review_id || '';
      const review = reviewIndex.get(reviewId);
      const isReply = Boolean(report.reply_id);
      return {
        id: report.id,
        userId: report.user_id,
        reporterName: profileIndex.get(report.user_id)?.full_name?.trim() || 'عضو الدليل',
        targetType: isReply ? 'reply' : 'review',
        targetId: isReply ? report.reply_id : report.review_id,
        reason: report.reason,
        details: report.details || '',
        status: report.status,
        reviewNote: report.review_note || '',
        reviewedAt: report.reviewed_at,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        target: {
          authorName: isReply ? (reply?.author_name || 'عضو') : (review?.author_name || 'عضو'),
          body: isReply ? (reply?.body || '') : (review?.body || ''),
          contentStatus: isReply ? (reply?.status || 'missing') : (review?.status || 'missing'),
          rating: isReply ? null : (review?.rating || null),
          contextLabel: targetLabel(review),
          href: targetHref(review),
          reviewId,
        },
      };
    });

    return adminJson({
      stats: {
        open: serialized.filter((item) => item.status === 'pending' || item.status === 'reviewing').length,
        pending: serialized.filter((item) => item.status === 'pending').length,
        reviewing: serialized.filter((item) => item.status === 'reviewing').length,
        resolved: serialized.filter((item) => item.status === 'resolved').length,
        rejected: serialized.filter((item) => item.status === 'rejected').length,
        total: serialized.length,
      },
      reports: serialized,
    }, session);
  } catch {
    return adminJson({ error: 'تعذر تحميل بلاغات المجتمع الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = cleanText(body?.id, 80);
  const status = cleanText(body?.status, 30);
  const note = cleanNote(body?.note);
  const hideContent = body?.hideContent === true;

  if (!id || !allowedStatuses.has(status)) {
    return adminJson({ error: 'بيانات قرار البلاغ غير صحيحة.' }, session, 400);
  }
  if ((status === 'rejected' || hideContent) && note.length < 3) {
    return adminJson({ error: 'اكتب ملاحظة واضحة توثق سبب القرار.' }, session, 400);
  }
  if (hideContent && status !== 'resolved') {
    return adminJson({ error: 'إخفاء المحتوى متاح عند حسم البلاغ فقط.' }, session, 400);
  }

  try {
    const rows = await readRows<ReportRow>(
      'community_content_reports?select=id,user_id,review_id,reply_id,reason,details,status,review_note,reviewed_by,reviewed_at,created_at,updated_at&id=eq.' + encodeURIComponent(id) + '&limit=1',
      session.accessToken,
    );
    const report = rows[0];
    if (!report) return adminJson({ error: 'البلاغ غير موجود.' }, session, 404);

    if (hideContent) {
      const table = report.review_id ? 'content_reviews' : 'content_review_replies';
      const targetId = report.review_id || report.reply_id;
      if (!targetId) return adminJson({ error: 'المحتوى المرتبط بالبلاغ غير متاح.' }, session, 400);

      const hideResponse = await fetch(
        SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(targetId),
        {
          method: 'PATCH',
          headers: { ...adminRestHeaders(session.accessToken, true), Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'hidden' }),
          cache: 'no-store',
        },
      );
      if (!hideResponse.ok) throw new Error('COMMUNITY_CONTENT_HIDE_FAILED');
    }

    const now = new Date().toISOString();
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/community_content_reports?id=eq.' + encodeURIComponent(id),
      {
        method: 'PATCH',
        headers: { ...adminRestHeaders(session.accessToken, true), Prefer: 'return=representation' },
        body: JSON.stringify({
          status,
          review_note: note || null,
          reviewed_by: session.userId,
          reviewed_at: now,
        }),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('COMMUNITY_REPORT_UPDATE_FAILED');

    return adminJson({
      saved: true,
      id,
      status,
      hidden: hideContent,
      reviewedAt: now,
    }, session);
  } catch {
    return adminJson({ error: 'تعذر حفظ قرار بلاغ المجتمع الآن.' }, session, 500);
  }
}
