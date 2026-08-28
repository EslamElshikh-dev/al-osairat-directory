import React from 'react';
import Link from 'next/link';
import { initialListings, heritageCelebrities, developerProfile } from '../lib/data';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      
      {/* 1. Header & Hero Section */}
      <header className="bg-emerald-900 text-white pt-10 pb-16 px-4 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-4 relative z-10">
          <span className="inline-block bg-emerald-800/80 text-emerald-200 text-xs md:text-sm font-semibold px-4 py-1.5 rounded-full border border-emerald-700/50">
            المنصة الرقمية الموحدة لمركز وقرى العسيرات
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            دليل العسيرات الرقمي المباشر
          </h1>
          <p className="text-emerald-100/90 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            محطتك الشاملة للوصول المباشر إلى الأطباء، الصيدليات، الخدمات الحكومية، التراث المحلي، والمحلات بكل سهولة وأمان.
          </p>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
        
        {/* 2. Quick Categories Grid */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">أقسام الدليل</h2>
              <p className="text-xs md:text-sm text-slate-500">اختر الفئة للتصفح المباشر</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {[
              { label: 'الأطباء والعيادات', icon: '🩺' },
              { label: 'المستشفيات والطوارئ', icon: '🏥' },
              { label: 'الصيدليات', icon: '💊' },
              { label: 'المصالح الحكومية', icon: '🏛️' },
              { label: 'الصنايعية والحرف', icon: '🛠️' },
              { label: 'المحلات والتجارة', icon: '🛍️' },
              { label: 'خدمات السائقين', icon: '🚗' },
              { label: 'المطاعم والمأكولات', icon: '🍽️' },
              { label: 'المحامون والمستشارون', icon: '⚖️' },
              { label: 'مأذون ومشايخ البلد', icon: '📜' },
            ].map((item, idx) => (
              <Link href="/directory" key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-center text-center space-y-2 group">
                <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-xs md:text-sm font-semibold text-slate-700 group-hover:text-emerald-800">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Emergency & Featured Doctors */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              الطوارئ والأطباء المتاحون
            </h2>
            <Link href="/directory" className="text-xs md:text-sm font-medium text-emerald-700 hover:underline">
              عرض الكل &larr;
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {initialListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium mb-1.5">
                      {listing.categoryLabel}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{listing.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>📍</span> {listing.location}
                    </p>
                  </div>
                  {listing.emergency && (
                    <span className="bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                      طوارئ 24/7
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Heritage & Celebrities Banner */}
        <section className="bg-amber-900/5 border border-amber-900/10 p-6 md:p-8 rounded-3xl space-y-4">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-amber-800 tracking-wide uppercase">تراث وأعلام العسيرات</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">تاريخ عريق ورجال صنعوا الأثر</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {heritageCelebrities.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{item.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Developer Section: Eng. Eslam Elshikh */}
        <section className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                  مطور المنصة والمشرف التقني
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold">{developerProfile.name}</h2>
                <p className="text-slate-400 text-xs md:text-sm mt-1">{developerProfile.role}</p>
              </div>
              <a
                href={developerProfile.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
              >
                الموقع الشخصي للمطور ↗
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              {developerProfile.achievements.map((ach, i) => (
                <div key={i} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs text-slate-300">
                  🔹 {ach}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* 6. Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 md:hidden flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-emerald-700">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-bold">الرئيسية</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-medium">الدليل</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] font-medium">الخريطة</span>
        </Link>
      </nav>
    </div>
  );
}
