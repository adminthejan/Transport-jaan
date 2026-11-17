import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { ArrowRight, Sparkles, Star, Tag, Car } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const Suggestions = ({ similarVehicles: propSimilar }) => {
  const { props } = usePage();
  const similarVehicles = propSimilar ?? props?.similarVehicles ?? [];

  if (!Array.isArray(similarVehicles) || similarVehicles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Similar Vehicles</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">You might also like these cars</p>
        </div>

        <Link
          href="/vehicleList"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {similarVehicles.slice(0, 4).map((v) => {
          const title = `${v.manufacturer || ""} ${v.model || "Vehicle"}`.trim();
          const img = v.primary_image_url || placeholderImg;
          const price = Number(v.rental_price_per_day) || 0;

          return (
            <Link
              key={v.id}
              href={`/vehicleDetails/${v.id}`}
              className="group flex items-center gap-3.5 p-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                <img
                  src={img}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = placeholderImg;
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block truncate">
                  {v.manufacturer || "Fleet"}
                </span>
                <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {title}
                </h4>
                <div className="text-xs font-extrabold text-slate-900 mt-1">
                  LKR {price.toLocaleString()}
                  <span className="text-[10px] font-medium text-slate-400"> /day</span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-white group-hover:bg-blue-600 text-slate-400 group-hover:text-white border border-slate-200/80 group-hover:border-blue-600 flex items-center justify-center transition-all shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Suggestions;
