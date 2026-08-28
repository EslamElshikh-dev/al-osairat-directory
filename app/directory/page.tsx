"use client";

import React, { useState } from 'react';
import Link from 'next/link';
// تم استخدام مسار Next.js الذكي لتجنب أي مشاكل في بناء المشروع
import { initialListings } from '@/lib/data';

export default function DirectoryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'الكل', icon: '📋' },
    { id: 'doctors', label: 'أطباء وعيادات', icon: '🩺' },
    { id: 'hospitals', label: 'مستشفيات وطوارئ', icon: '🏥' },
    { id: 'pharmacies', label: 'صيدليات', icon: '💊' },
    { id: 'gov', label: 'مصالح حكومية', icon: '🏛️' },
    { id: 'crafts', label: 'صنايعية', icon: '🛠️' },
    { id: 'shops', label: 'محلات', icon: '🛍️' },
  ];

  const filteredData = initialListings.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.title.includes(searchQuery) || item.location.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      <header className="bg-emerald-900 text-white pt-8 pb-6 px-4 rounded-b-[2.5rem] shadow-md">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold">الدليل الشامل 📖</h1>
            <Link href="/" className="text-emerald-200 text-sm hover:text-white transition-colors">
              &rarr; الرئيسية
            </Link>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث بالاسم، التخصص، أو القرية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-900 rounded-2xl py-3 px-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
            <span className="absolute right-4 top-3.5 text-slate-400">🔍</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="text-sm text-slate-500 font-medium">
          تم العثور على ({filteredData.length}) نتيجة
        </div>

        {filteredData.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-semibold">
                      {item.categoryLabel}
                    </span>
                    {item.rating && (
                      <span className="text-xs font-bold text-amber-500">⭐ {item.rating}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{item.title}</h3>
                  {item.subCategory && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">{item.subCategory}</p>
                  )}
                  <p className="text-sm text-slate-500 mt-2 flex items-start gap-1">
                    <span className="mt-0.5">📍</span> {item.location}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-center py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                      اتصال 📞
                    </a>
                  )}
                  <Link
                    href="/map"
                    className="flex-1 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-center py-2 rounded-xl text-sm font-semibold transition-colors"
                  >
                    الخريطة 🗺️
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <span className="text-4xl block mb-2">🕵️‍♂️</span>
            <h3 className="text-lg font-bold text-slate-700">لم نجد نتائج مطابقة</h3>
            <p className="text-slate-500 text-sm mt-1">جرب البحث بكلمات مختلفة أو اختر فئة أخرى.</p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 md:hidden flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">الرئيسية</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-1 text-emerald-700">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-bold">الدليل</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] font-medium">الخريطة</span>
        </Link>
      </nav>
    </div>
  );
}
