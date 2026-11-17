import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Maximize2, X, Sparkles, ShieldCheck } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const VehicleImageViewer = ({ images: imagesProp, primaryImageUrl: primaryProp }) => {
  const { vehicle } = usePage().props || {};

  const urls = [];
  const primary = primaryProp ?? vehicle?.primary_image_url ?? null;
  if (primary) urls.push(primary);
  const arr = imagesProp ?? vehicle?.images ?? [];
  (Array.isArray(arr) ? arr : []).forEach((m) => {
    const u = typeof m === "string" ? m : m?.url;
    if (u && !urls.includes(u)) urls.push(u);
  });

  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (index > urls.length - 1) setIndex(0);
  }, [urls.length, index]);

  // Keyboard navigation for fullscreen lightbox
  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % urls.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, urls.length]);

  if (urls.length === 0) {
    return (
      <div className="w-full h-72 sm:h-96 rounded-2xl bg-slate-100 flex items-center justify-center">
        <img src={placeholderImg} alt="Vehicle placeholder" className="w-full h-full object-cover rounded-2xl" />
      </div>
    );
  }

  const go = (delta, e) => {
    if (e) e.stopPropagation();
    setIndex((i) => (i + delta + urls.length) % urls.length);
  };

  const fallback = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = placeholderImg;
  };

  return (
    <div className="w-full select-none">
      {/* Main Image Stage */}
      <div
        className="group relative w-full h-[280px] sm:h-[380px] md:h-[420px] rounded-2xl overflow-hidden bg-slate-900 cursor-pointer shadow-inner"
        onClick={() => setFullscreen(true)}
      >
        <img
          key={urls[index]}
          src={urls[index]}
          alt={`Vehicle photograph ${index + 1} of ${urls.length}`}
          className="w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-[1.02]"
          onError={fallback}
        />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-black/20 pointer-events-none" />

        {/* Floating Top Pill Info */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-md">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Verified Fleet Photos
          </span>
        </div>

        {/* Fullscreen Expand CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen(true);
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md text-white grid place-items-center shadow-lg transition-transform hover:scale-110 active:scale-95"
          title="Open Fullscreen Lightbox"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Previous / Next Navigation Arrows */}
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => go(-1, e)}
              aria-label="Previous photo"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-lg grid place-items-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 z-10"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={(e) => go(1, e)}
              aria-label="Next photo"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-lg grid place-items-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 z-10"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Counter Badge */}
            <span className="absolute bottom-3.5 right-3.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-md">
              {index + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails Carousel */}
      {urls.length > 1 && (
        <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {urls.map((u, i) => (
            <button
              type="button"
              key={u}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                i === index
                  ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md scale-100"
                  : "border-transparent opacity-60 hover:opacity-100 hover:scale-[1.02]"
              }`}
            >
              <img
                src={u}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={fallback}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8"
          onClick={() => setFullscreen(false)}
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full">
              Photo {index + 1} of {urls.length}
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image Stage */}
          <div className="relative flex-1 flex items-center justify-center max-w-5xl w-full my-4" onClick={(e) => e.stopPropagation()}>
            {urls.length > 1 && (
              <button
                type="button"
                onClick={(e) => go(-1, e)}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center transition-colors shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            <img
              src={urls[index]}
              alt={`Full size vehicle photo ${index + 1}`}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onError={fallback}
            />

            {urls.length > 1 && (
              <button
                type="button"
                onClick={(e) => go(1, e)}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center transition-colors shadow-lg"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex gap-2 max-w-2xl overflow-x-auto pb-2 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
            {urls.map((u, i) => (
              <button
                key={u}
                type="button"
                onClick={() => setIndex(i)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-opacity shrink-0 ${
                  i === index ? "border-blue-500 opacity-100" : "border-transparent opacity-40 hover:opacity-80"
                }`}
              >
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleImageViewer;
