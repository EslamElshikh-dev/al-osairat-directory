import { villages } from '@/lib/data/base';

// Keep the directory's home area first while accepting jobs from all Sohag centers.
export const osairatJobAreas = [...new Set(['مركز العسيرات', ...villages.flatMap((village) => [village.name, ...(village.localities || [])])])];
export const sohagCenters = ['سوهاج', 'أخميم', 'البلينا', 'جرجا', 'دار السلام', 'جهينة', 'ساقلتة', 'طما', 'طهطا', 'المراغة', 'المنشأة'];
export const widerJobAreas = [...sohagCenters, 'الكوثر', 'سوهاج الجديدة', 'أخميم الجديدة', 'الكوامل', 'محافظة سوهاج'];
export const jobAreas = [...osairatJobAreas, ...widerJobAreas];
const osairatSet = new Set(osairatJobAreas);

export function isOsairatJobArea(area: string) { return osairatSet.has(area); }
