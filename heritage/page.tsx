"use client";

import React from 'react';
import Link from 'next/link';
// استدعاء آمن باستخدام مسار Next.js الذكي
import { heritageCelebrities, villagesData } from '@/lib/data';

export default function HeritagePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      
      {/* Header */}
      <header className="bg-amber-900 text-white pt-8 pb-6 px-4 rounded-b-[2.5rem] shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">التراث والأعلام 🏛️</h1>
            <p className="text-amber-200 text-sm mt-1">تاريخ عريق ورجال صنعوا الأثر في العسيرات</p>
          </div>
          <Link href="/" className="text-amber-200 text-sm hover:text-white transition-colors">
            &rarr; الرئيسية
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-10">
        
        {/* Celebrities Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 border-b-4 border-amber-200 pb-2 inline-block">
              أعلام ومشاهير العسيرات
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {heritageCelebrities.map((person) => (
              <div key={person.id} className="bg-white p-6 rounded-3xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-amber-900 mb-1">{person.title}</h3>
                  <p className="text-sm font-bold text-amber-600 mb-3">{person.summary}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{person.fullContent}</p>
                </div>
                {person.wikidataId && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <a 
                      href={`https://www.wikidata.org/wiki/${person.wikidataId}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      معرف ويكيداتا: {person.wikidataId} ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Villages Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 border-b-4 border-emerald-200 pb-2 inline-block">
              قرى مركز العسيرات
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {villagesData.map((village, idx) => (
              <span 
                key={idx} 
                className="bg-white text-emerald-800 border border-emerald-100 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors cursor-default"
              >
                📍 {village}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 md:hidden flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">الرئيسية</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-medium">الدليل</span>
        </Link>
        <Link href="/heritage" className="flex flex-col items-center gap-1 text-amber-700">
          <span className="text-lg">🏛️</span>
          <span className="text-[10px] font-bold">التراث</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] font-medium">الخريطة</span>
        </Link>
      </nav>
    </div>
  );
}
