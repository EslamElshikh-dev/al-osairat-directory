"use client";

import React from 'react';
import Link from 'next/link';
// استدعاء آمن باستخدام مسار Next.js الذكي
import { developerProfile } from '@/lib/data';

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-24 font-sans">
      
      {/* Header */}
      <header className="pt-12 pb-8 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">مطور المنصة 💻</h1>
        <p className="text-emerald-400 text-sm mt-2">إشراف وتطوير تقني</p>
      </header>

      <main className="max-w-3xl mx-auto px-4 space-y-6">
        
        {/* Developer Card */}
        <div className="bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-sm">
          
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-24 h-24 bg-emerald-900 text-emerald-400 rounded-full flex items-center justify-center text-4xl border-4 border-slate-800 shadow-inner">
              👨‍💻
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{developerProfile.name}</h2>
              <p className="text-emerald-400 font-medium mt-1">{developerProfile.role}</p>
              <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-1">
                <span>📍</span> {developerProfile.location}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-3">الرؤية التقنية</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {developerProfile.vision}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-3">أبرز الإنجازات</h3>
              <ul className="space-y-2">
                {developerProfile.achievements.map((ach, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✔</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <a 
                href={developerProfile.website} 
                target="_blank" 
                rel="noreferrer"
                className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-center py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/50"
              >
                زيارة الموقع الشخصي للمطور 🌐
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Dark Theme) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2.5 px-6 md:hidden flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">الرئيسية</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-medium">الدليل</span>
        </Link>
        <Link href="/developer" className="flex flex-col items-center gap-1 text-emerald-500">
          <span className="text-lg">💻</span>
          <span className="text-[10px] font-bold">المطور</span>
        </Link>
      </nav>
    </div>
  );
}
