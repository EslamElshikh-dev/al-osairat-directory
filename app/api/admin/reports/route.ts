import { NextResponse } from 'next/server';
import { categories, listings, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { SUPABASE_URL, sameOrigin } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';

type ReportRow = {
  id: string;
  user_id: string;
  listing_id: string;
  report_type: string;
  details: string;
  status: ReportStatus;
  review_note: string | null;
  correction: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

const allowedStatuses = new Set<string>(['pending', 'reviewing', 'resolved', 'rejected']);
const editableFields = new Set([
  'title', 'subCategory', 'location', 'village', 'locality', 'phone',
  'whatsapp', 'hours', 'description', 'googleMapsUrl',
]);
const categoryLabels = new Map(categories.map((item) => [item.id, item.shortLabel]));

async function readRows<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: adminRestHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`ADMIN_REPORT_READ_FAILED:${path}`);
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

function cleanCorrection(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, string>;
  const source = value as Record<string, unknown>;
  const output: Record<string, string> = {};

  for (const [key, raw] of Object.entries(source)) {
    if (!editableFields.has(key) || typeof raw !== 'string') continue;
    const maxLength = key === 'description' ? 1200 : key === 'googleMapsUrl' ? 900 : 240;
    const cleaned = key === 'description'
      ? raw.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, maxLength)
      : cleanText(raw, maxLength);
    if (cleaned) output[key] = cleaned;
  }

  return output;
}

function serializeListing(listing: DirectoryListing | undefined) {
  if (!listing) return null;
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    categoryLabel: categoryLabels.get(listing.category) || listing.category,
    village: listing.village,
    locality: listing.locality || '',
    location: listing.location,
    phone: listing.phone || '',
    whatsapp: listing.whatsapp || '',
    hours: listing.hours || '',
    subCategory: listing.subCategory || '',
    description: listing.description || '',
    googleMapsUrl: listing.googleMapsUrl || '',
    lastUpdatedAt: listing.lastUpdatedAt || '',
  };
}

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بعرض بلاغات الدليل.' }, { status: 403 });

  try {
    const [reports, profiles, publishedListings, staticListings] = await Promise.all([
      readRows<ReportRow>('listing_reports?select=id,user_id,listing_id,report_type,details,status,review_note,correction,created_at,updated_at,reviewed_at,applied_at&order=created_at.desc', session.accessToken),
      readRows<ProfileRow>('profiles?select=id,full_name', session.accessToken).catch(() => []),
      getPublishedListings(),
      applyListingOverrides(listings),
    ]);

    const profileIndex = new Map(profiles.map((profile) => [profile.id, profile]));
    const listingIndex = new Map<string, DirectoryListing>();
    [...staticListings, ...publishedListings].forEach((listing) => listingIndex.set(listing.id, listing));

    return adminJson({
      stats: {
        open: reports.filter((item) => item.status === 'pending' || item.status === 'reviewing').length,
        pending: reports.filter((item) => item.status === 'pending').length,
        reviewing: reports.filter((item) => item.status === 'reviewing').length,
        resolved: reports.filter((item) => item.status === 'resolved').length,
        rejected: reports.filter((item) => item.status === 'rejected').length,
        total: reports.length,
      },
      reports: reports.map((row) => ({
        id: row.id,
        userId: row.user_id,
        memberName: profileIndex.get(row.user_id)?.full_name?.trim() || 'عضو الدليل',
        listingId: row.listing_id,
        listing: serializeListing(listingIndex.get(row.listing_id)),
        reportType: row.report_type,
        details: row.details,
        status: row.status,
        reviewNote: row.review_note || '',
        correction: row.correction || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewedAt: row.reviewed_at,
        appliedAt: row.applied_at,
      })),
    }, session);
  } catch {
    return adminJson({ error: 'تعذر تحميل بلاغات الأنشطة الآن.' }, session, 500);
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
  const correction = cleanCorrection(body?.correction);

  if (!id || !allowedStatuses.has(status)) {
    return adminJson({ error: 'بيانات مراجعة البلاغ غير صحيحة.' }, session, 400);
  }
  if (status === 'rejected' && note.length < 3) {
    return adminJson({ error: 'اكتب سببًا واضحًا لرفض البلاغ.' }, session, 400);
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/review_listing_report`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: JSON.stringify({
        p_id: id,
        p_status: status,
        p_note: note || null,
        p_correction: correction,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (/INVALID_CORRECTION|INVALID_CHANGES|INVALID_/i.test(detail)) {
        return adminJson({ error: 'أحد حقول التصحيح غير صالح. راجع القيم وحاول مرة أخرى.' }, session, 400);
      }
      throw new Error('ADMIN_REPORT_REVIEW_FAILED');
    }

    const result = await response.json();
    return adminJson({ saved: true, result }, session);
  } catch {
    return adminJson({ error: 'تعذر حفظ قرار البلاغ الآن.' }, session, 500);
  }
}
