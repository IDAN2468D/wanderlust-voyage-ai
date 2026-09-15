"use client";

import React from "react";
import { X, Play, Sparkles, CheckCircle2, Bot, ArrowLeft } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPlanning: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onStartPlanning }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-3xl wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative text-right">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>הדגמת מערכת הסוכנים החכמה</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
          איך פועלים סוכני ה-AI של Wanderlust?
        </h3>
        <p className="text-xs text-slate-300 mb-6 max-w-xl">
          צפה כיצד 4 סוכני AI מומחים מתאמים יחד טיסות, מלונות, מסלולים יומיים ובקרת תקציב פיננסית בזמן אמת.
        </p>

        {/* Simulated Interactive Video Screen */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner flex flex-col items-center justify-center p-6 text-center group">
          <div className="absolute inset-0 bg-gradient-to-tr from-mint-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full btn-mint flex items-center justify-center text-slate-950 shadow-xl shadow-mint-500/30 mb-4 cursor-pointer hover:scale-105 transition-transform">
            <Play className="w-6 h-6 fill-current mr-0.5" />
          </div>

          <h4 className="text-base font-bold text-white mb-1">
            סימולציה חיה: תכנון 7 ימים באלפים השוויצריים
          </h4>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            תהליך שלם של בדיקת מחירי טיסות בזמן אמת, איתור מלונות בוטיק ואופטימיזציית תקציב ב-4 שניות.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> סריקת טיסות ישירות
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> סינון מלונות מרכזיים
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> ביקורת עלויות מדויקת
            </span>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bot className="w-4 h-4 text-mint-400" />
            <span>מופעל על ידי Agno + Google Gemini 2.0</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartPlanning();
            }}
            className="btn-mint px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2"
          >
            <span>נסה עכשיו בעצמך</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
