"use client";

import React, { useState } from 'react';
import Link from 'next/link';
// تم تعديل المسار هنا ليقرأ ملف البيانات بشكل صحيح على فيرسل
import { initialListings } from '../../lib/data';

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // فلترة الأماكن حسب القسم
  const filteredListings = selectedCategory === 'all' 
    ? initialListings 
    : initialListings.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      
      {/* Header */}
      <header className="bg-emerald-900 text-white pt-8 pb-6 px-4 rounded-b-[2rem] shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">الخريطة التفاعلية 🗺️</h1>
            <p className="text-emerald-200 text-sm mt-1">تصفح الخدمات والأطباء جغرافياً في العسيرات</p>
          </div>
          <Link href="/" className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition-colors">
            &rarr; عودة للرئيسية
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setSelectedCategory('hospitals')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'hospitals' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            🏥 مستشفيات وطوارئ
          </button>
          <button 
            onClick={() => setSelectedCategory('doctors')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'doctors' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            🩺 أطباء وعيادات
          </button>
        </div>

        {/* Map View (Google Maps Embed for Al-Osairat) */}
        <div className="w-full h-[400px] bg-slate-200 rounded-3xl overflow-hidden shadow-inner border border-slate-200">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113697.54522207909!2d31.7825!3d26.2572!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x144ede66601f0165%3A0xc6fbef1a196fc944!2z2KfZhNi52LPZitix2KfYqQ!5e0!3m2!1sar!2seg!4v1700000000000!5m2!1sar!2seg" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        {/* Map Pins / Results */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">المواقع المتاحة ({filteredListings.length})</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {filteredListings.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                <div className="bg-emerald-50 text-2xl p-3 rounded-full h-fit">
                  📍
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.location}</p>
                  {item.phone && (
                    <p className="text-sm font-medium text-emerald-600 mt-2">📞 {item.phone}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 md:hidden flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">الرئيسية</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-1 text-emerald-700">
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] font-bold">الخريطة</span>
        </Link>
      </nav>
    </div>
  );
}
