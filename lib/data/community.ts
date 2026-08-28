import type {DirectoryListing} from '../types';

export const community:DirectoryListing[]=[
  {
    id:'community-ديوان-ال-حمد',
    slug:'ديوان-ال-حمد',
    title:'ديوان آل حمد',
    category:'community',
    subCategory:'ديوان ومجلس عائلي',
    location:'مركز العسيرات، محافظة سوهاج',
    village:'مركز العسيرات',
    description:'ديوان ومجلس عائلي مُدرج على خرائط Google داخل نطاق مركز العسيرات. يحتاج تحديد القرية أو التابع بدقة عند توفر مصدر إضافي.',
    reviewCount:0,
    source:'google_maps',
    sourceStatus:'needs_review',
    googleMapsUrl:'https://maps.app.goo.gl/jeH636oF2vGXWDaB6?g_st=afm',
    lastUpdatedAt:'2026-08-29'
  },
  {
    id:'community-دوار-الشحمات',
    slug:'دوار-الشحمات',
    title:'دوار الشُحمات',
    category:'community',
    subCategory:'دوار ومجلس عائلي',
    location:'9RRV+M4R، نجع الشحومات، جزيرة أولاد حمزة، مركز العسيرات، سوهاج',
    village:'جزيرة أولاد حمزة',
    locality:'الشحومات',
    phone:'01113570024',
    description:'دوار ومجلس عائلي في نجع الشحومات بجزيرة أولاد حمزة.',
    reviewCount:0,
    source:'google_maps',
    sourceStatus:'cross_checked',
    googleMapsPlusCode:'9RRV+M4R',
    googleMapsUrl:'https://maps.app.goo.gl/EMn8HMnV9cyr9bTp7?g_st=afm',
    lastUpdatedAt:'2026-08-29'
  },
  {
    id:'community-دوار-ال-خبل',
    slug:'دوار-ال-خبل',
    title:'دوار آل خبل',
    category:'community',
    subCategory:'دوار ومجلس عائلي',
    location:'9RRR+WPM، جزيرة أولاد حمزة، مركز العسيرات، سوهاج',
    village:'جزيرة أولاد حمزة',
    description:'دوار ومجلس عائلي في جزيرة أولاد حمزة ضمن مركز العسيرات.',
    rating:5,
    reviewCount:1,
    ratingSource:'google',
    source:'google_maps',
    sourceStatus:'google_verified',
    googlePlaceId:'ChIJw85HsI1PTxQRQ3sR3EwGQ2M',
    googleMapsPlusCode:'9RRR+WPM',
    googleMapsUrl:'https://maps.app.goo.gl/JVevsB8o3S9VB2Eb8?g_st=afm',
    lastUpdatedAt:'2026-08-29'
  }
] as DirectoryListing[];
