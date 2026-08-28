import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { categoryById, listings, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RankedCount = { name: string; count: number };
type TermCount = { term: string; count: number; zeroResults?: number; village?: string; category?: string };
type ListingMetric = {
  listingId: string;
  slug: string;
  views7d: number;
  views30d: number;
  phone30d: number;
  whatsapp30d: number;
  maps30d: number;
  favorites30d: number;
};

type Intelligence = {
  search: { total7d: number; total30d: number; zero7d: number; converted7d: number };
  topTerms: TermCount[];
  zeroResultTerms: TermCount[];
  topSearchVillages: RankedCount[];
  topSearchCategories: RankedCount[];
  topListings: ListingMetric[];
  generatedAt: string;
};

async function getLiveListings() {
  const [staticListings, published] = await Promise.all([
    applyListingOverrides(listings),
    getPublishedListings(),
  ]);
  const index = new Map<string, DirectoryListing>();
  [...staticListings, ...published].forEach((item) => index.set(item.id, item));
  return index;
}

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'يلزم تسجيل الدخول بحساب إداري.' }, null, 401);

  const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_directory_intelligence_stats`, {
    method: 'POST',
    headers: adminRestHeaders(session.accessToken, true),
    body: '{}',
    cache: 'no-store',
  });

  if (!statsResponse.ok) {
    return adminJson({ error: 'تعذر تحميل ذكاء البحث وأداء الأنشطة.' }, session, 500);
  }

  const [stats, listingIndex] = await Promise.all([
    statsResponse.json() as Promise<Intelligence>,
    getLiveListings(),
  ]);

  return adminJson({
    ...stats,
    topSearchCategories: (stats.topSearchCategories || []).map((item) => ({
      ...item,
      label: categoryById[item.name as keyof typeof categoryById]?.shortLabel || item.name,
    })),
    topListings: (stats.topListings || []).map((item) => {
      const listing = listingIndex.get(item.listingId);
      const interactions30d = Number(item.phone30d || 0) + Number(item.whatsapp30d || 0) + Number(item.maps30d || 0) + Number(item.favorites30d || 0);
      const views30d = Number(item.views30d || 0);
      return {
        ...item,
        title: listing?.title || item.slug || item.listingId,
        village: listing?.village || '—',
        category: listing ? categoryById[listing.category].shortLabel : '—',
        interactions30d,
        conversionRate30d: views30d ? interactions30d / views30d : 0,
      };
    }),
  }, session);
}
