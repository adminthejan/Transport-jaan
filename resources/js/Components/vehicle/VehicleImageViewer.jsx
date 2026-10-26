import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

/**
 * Vehicle photos, viewed one at a time: a single (compact) main image with
 * previous / next arrows and a thumbnail strip underneath. Replaces the old
 * five-tile collage, whose photos were large and shown all at once.
 *
 * Props mirror the old components: `images` (urls or {url}) and `primaryImageUrl`;
 * both fall back to the page's `vehicle` prop.
 */
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
  useEffect(() => {
    if (index > urls.length - 1) setIndex(0);
  }, [urls.length, index]);

  if (urls.length === 0) return null;

  const go = (delta) => setIndex((i) => (i + delta + urls.length) % urls.length);
  const fallback = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = placeholderImg;
  };

  return (
    <div className="w-full lg:w-[844px]">
      <div className="relative w-full h-[240px] sm:h-[300px] lg:h-[340px] rounded-[18px] overflow-hidden bg-[#F1F5F9]">
        <img
          key={urls[index]}
          src={urls[index]}
          alt={`Vehicle photo ${index + 1} of ${urls.length}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={fallback}
        />

        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow grid place-items-center hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#0F172A]" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow grid place-items-center hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#0F172A]" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-[700] text-white">
              {index + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {urls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((u, i) => (
            <button
              type="button"
              key={u}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-[56px] w-[84px] shrink-0 rounded-[10px] overflow-hidden border-2 transition-colors ${
                i === index ? "border-[#0955AC]" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={u} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={fallback} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleImageViewer;
