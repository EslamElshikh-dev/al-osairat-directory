import type {DirectoryCategory,DirectoryListing} from '../types';
import {categories,villages} from './base';
import {doctors} from './doctors';
import {pharmacies} from './pharmacies';
import {shops} from './shops';
import {crafts} from './crafts';
import {restaurants} from './restaurants';
import {lawyers} from './lawyers';
import {clerics} from './clerics';
import {government} from './government';
import {emergency} from './emergency';
export * from '../types';
export {categories,villages};
export const listings:DirectoryListing[]=[...doctors,...pharmacies,...shops,...crafts,...restaurants,...lawyers,...clerics,...government,...emergency];
export const categoryById=Object.fromEntries(categories.map((category)=>[category.id,category])) as Record<DirectoryCategory,(typeof categories)[number]>;
export const listingBySlug=Object.fromEntries(listings.map((listing)=>[listing.slug,listing])) as Record<string,DirectoryListing>;
export const villageBySlug=Object.fromEntries(villages.map((village)=>[village.slug,village])) as Record<string,(typeof villages)[number]>;
export function getListingsByCategory(category:DirectoryCategory){return listings.filter((listing)=>listing.category===category);}
export function getListingsByVillage(villageName:string){return listings.filter((listing)=>listing.village===villageName);}
export const directoryStats={total:listings.length,villages:villages.filter((village)=>village.name!=='مركز العسيرات').length,googleVerified:listings.filter((listing)=>listing.sourceStatus==='google_verified').length,categories:categories.length};
