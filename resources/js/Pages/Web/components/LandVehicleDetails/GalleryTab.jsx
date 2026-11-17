import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, X, Maximize2, Images } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const toUrl = (item) => {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (item.url) return item.url;
  if (item.path) return `/storage/${item.path}`;
  if (item.image_path) return `/storage/${item.image_path}`;
  return null;
};

const GalleryTab = ({ images: imagesProp, vehicle: vehicleProp }) => {
  const { vehicle: pageVehicle } = usePage().props || {};
  const vehicle = vehicleProp ?? pageVehicle ?? {};

  const images = useMemo(() => {
    const urls = [];

    (Array.isArray(imagesProp) ? imagesProp : []).forEach((it) => {
      const u = toUrl(it);
      if (u && !urls.includes(u)) urls.push(u);
    });

    const primaryCandidates = [
      vehicle.primary_image_url,
      vehicle.image,
      vehicle.primaryImage?.url,
      vehicle.primaryImage?.path && `/storage/${vehicle.primaryImage.path}`,
      vehicle.primaryImage?.image_path && `/storage/${vehicle.primaryImage.image_path}`,
    ];
    for (const c of primaryCandidates) {
      const u = toUrl(c);
      if (u && !urls.includes(u)) {
        urls.unshift(u);
        break;
      }
    }

    const arrays =
      vehicle.images ??
      vehicle.media ??
      vehicle.photos ??
      vehicle.gallery ??
      vehicle.image_gallery ??
      vehicle.pictures ??
      [];

    (Array.isArray(arrays) ? arrays : []).forEach((it) => {
      const u = toUrl(it);
      if (u && !urls.includes(u)) urls.push(u);
    });

    return urls;
  }, [imagesProp, vehicle]);

  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!images.length) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200/60">
        <Images className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h5 className="text-xs font-bold text-slate-700">No additional photos</h5>
        <p className="text-[11px] text-slate-400 mt-0.5">Only main vehicle photos are available.</p>
      </div>
    );
  }

  const selectedImg = selectedIdx !== null ? images[selectedIdx] : null;

  const showPrev = (e) => {
    e.stopPropagation();
    setSelectedIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  };

  const showNext = (e) => {
    e.stopPropagation();
    setSelectedIdx((i) => (i < images.length - 1 ? i + 1 : 0));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-900">
          All High-Definition Photos ({images.length})
        </h4>
        <span className="text-xs text-slate-400">Click any image to enlarge</span>
      </div>

      {/* Modern Responsive Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {images.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            onClick={() => setSelectedIdx(idx)}
            className="group relative h-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <img
              src={src}
              alt={`Vehicle photo ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = placeholderImg;
              }}
            />
            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="p-2 rounded-full bg-white/90 text-slate-900 shadow-md">
                <Maximize2 className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImg && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-between p-4 sm:p-6"
          onClick={() => setSelectedIdx(null)}
        >
          {/* Top toolbar */}
          <div className="w-full flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10">
              {selectedIdx + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIdx(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image */}
          <div className="relative flex-1 flex items-center justify-center max-w-5xl w-full my-4" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center transition-all shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            <img
              src={selectedImg}
              alt="Enlarged"
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onError={() => setSelectedIdx(null)}
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center transition-all shadow-lg"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex gap-2 max-w-2xl overflow-x-auto pb-2 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
            {images.map((u, i) => (
              <button
                key={u}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  i === selectedIdx ? "border-blue-500 scale-105" : "border-transparent opacity-40 hover:opacity-80"
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

export default GalleryTab;
