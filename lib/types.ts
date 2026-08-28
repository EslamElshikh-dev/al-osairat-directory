export type DirectoryCategory='doctors'|'pharmacies'|'shops'|'crafts'|'restaurants'|'lawyers'|'clerics'|'government'|'emergency';
export type DataSource='legacy_directory'|'user_collected'|'google_maps';
export type SourceStatus='source_only'|'cross_checked'|'google_verified'|'needs_review';
export interface DirectoryListing{id:string;slug:string;title:string;category:DirectoryCategory;subCategory?:string;location:string;village:string;locality?:string;phone?:string;whatsapp?:string;hours?:string;description?:string;rating?:number;reviewCount:number;ratingSource?:'legacy'|'google';source:DataSource;sourceStatus:SourceStatus;deliveryAvailable?:boolean;emergency?:boolean;googlePlaceId?:string;googleMapsPlusCode?:string;}
export interface VillageInfo{name:string;slug:string;description:string;localities:string[];}
export interface CategoryInfo{id:DirectoryCategory;label:string;shortLabel:string;description:string;icon:string;}
