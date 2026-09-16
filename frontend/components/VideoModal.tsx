"use client";

import React, { useState, useRef } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, CheckCircle2, Bot, ArrowLeft } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPlanning: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onStartPlanning }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-4xl wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative text-right">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          aria-label="סגור חלון"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>הדגמת וידאו חיה • נוצר באמצעות Google Flow & Veo</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
          איך פועלים סוכני ה-AI של Wanderlust?
        </h3>
        <p className="text-xs text-slate-300 mb-5 max-w-xl">
          צפה בהדגמה ויזואלית חיה: תיאום טיסות, מלונות בוטיק ומסלול אינטראקטיבי באלפים השוויצריים בזמן אמת.
        </p>

        {/* Interactive Video Player */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl group">
          <video
            ref={videoRef}
            src="/videos/demo.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover cursor-pointer"
            onClick={togglePlay}
          />

          {/* Top Badge Overlay */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-[11px] text-mint-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-mint-400 animate-pulse" />
            <span>סרטון הדגמה חי • Google Flow</span>
          </div>

          {/* Center Play/Pause Overlay Button when paused */}
          {!isPlaying && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer transition-all"
            >
              <div className="w-16 h-16 rounded-full btn-mint flex items-center justify-center text-slate-950 shadow-2xl shadow-mint-500/40 hover:scale-110 transition-transform">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
            </div>
          )}

          {/* Bottom Video Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-4 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                aria-label={isPlaying ? "השהה" : "נגן"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                aria-label={isMuted ? "הפעל שמע" : "השתק"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-[11px] text-slate-300 font-medium bg-black/40 px-2.5 py-1 rounded-md">
                סימולציה: 7 ימים באלפים השוויצריים
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="bg-mint-500/20 text-mint-300 border border-mint-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                HD 720p
              </span>
              <span>8 שניות</span>
            </div>
          </div>
        </div>

        {/* Feature Badges below video */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 py-2 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> סריקת טיסות ישירות
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> סינון מלונות בוטיק
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" /> ביקורת תקציב פיננסית
          </span>
        </div>

        {/* Modal Footer CTA */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bot className="w-4 h-4 text-mint-400" />
            <span>מופעל על ידי Agno + Google Gemini 2.0 & Google Flow</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartPlanning();
            }}
            className="btn-mint px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-mint-500/20 hover:scale-105 transition-transform"
          >
            <span>נסה עכשיו בעצמך</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
