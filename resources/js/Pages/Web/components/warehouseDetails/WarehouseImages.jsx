import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const toUrl = (media) => {
  if (typeof media === "string") {
    return media.startsWith("/storage/") || media.startsWith("http") ? media : `/storage/${media}`;
  }
  return (
    media?.url
    || (media?.file_path ? `/storage/${media.file_path}` : null)
    || (media?.image_path ? `/storage/${media.image_path}` : null)
    || (media?.path ? `/storage/${media.path}` : null)
  );
};

/**
 * Compact one-at-a-time photo viewer: a single smaller image with previous /
 * next controls and a thumbnail strip, instead of a large multi-tile grid.
 */
const WarehouseImages = ({ images: imagesProp, primaryImageUrl: primaryProp }) => {
  const { warehouse } = usePage().props || {};

  const urls = [];
  const primary = primaryProp ?? warehouse?.primary_image_url ?? null;
  if (primary) urls.push(primary);

  const list = imagesProp ?? warehouse?.images ?? [];
  (Array.isArray(list) ? list : []).forEach((media) => {
    const url = toUrl(media);
    if (url && !urls.includes(url)) urls.push(url);
  });

  if (urls.length === 0) {
    urls.push(placeholderImg);
  }

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index > urls.length - 1) {
      setIndex(0);
    }
  }, [urls.length, index]);

  const go = (delta) => setIndex((current) => (current + delta + urls.length) % urls.length);
  const hasMany = urls.length > 1;

  const onKeyDown = (event) => {
    if (!hasMany) return;
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  };

  return (
    <div className="w-full xl:w-[560px] max-w-full" onKeyDown={onKeyDown} tabIndex={0} aria-label="Warehouse photos">
      <div className="relative w-full h-[220px] sm:h-[280px] rounded-[16px] overflow-hidden bg-[#F1F5F9]">
        <img
          key={urls[index]}
          src={urls[index]}
          alt={`Warehouse photo ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholderImg;
          }}
        />

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5 text-[#0F0F0F]" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
            >
              <ChevronRight className="w-5 h-5 text-[#0F0F0F]" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-[600] text-white">
              {index + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, thumbIndex) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(thumbIndex)}
              aria-label={`Show photo ${thumbIndex + 1}`}
              className={`shrink-0 w-[64px] h-[48px] rounded-[8px] overflow-hidden border-2 transition-colors ${
                thumbIndex === index ? "border-[#0955AC]" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = placeholderImg;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WarehouseImages;
