import React, { useEffect, useMemo, useState } from "react";
import VehicleStatusBadges from "../../../../Components/vehicle/VehicleStatusBadges";
import { router, Link } from "@inertiajs/react";
import axios from "axios";
import {
  Briefcase,
  Car as CarIcon,
  Fuel,
  Gauge,
  Heart,
  Settings2,
  Users,
  ArrowRight,
  Star,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  List,
} from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const SORT_OPTIONS = [
  { value: "default", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const formatLabel = (value) =>
  (value || "")
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const VehicleListContent = ({
  vehicles: initialVehicles,
  authUser,
  likedVehicleIds,
  searchParams,
}) => {
  const vehicles = useMemo(
    () => (Array.isArray(initialVehicles) ? initialVehicles : initialVehicles?.data || []),
    [initialVehicles]
  );
  const paginationLinks = !Array.isArray(initialVehicles) ? initialVehicles?.links : null;

  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  const sortedVehicles = useMemo(() => {
    if (sortBy === "price_asc") {
      return [...vehicles].sort(
        (a, b) => (Number(a.rental_price_per_day) || 0) - (Number(b.rental_price_per_day) || 0)
      );
    }
    if (sortBy === "price_desc") {
      return [...vehicles].sort(
        (a, b) => (Number(b.rental_price_per_day) || 0) - (Number(a.rental_price_per_day) || 0)
      );
    }
    return vehicles;
  }, [vehicles, sortBy]);

  const [likedMap, setLikedMap] = useState({});
  useEffect(() => {
    const m = {};
    (likedVehicleIds || []).forEach((id) => (m[id] = true));
    setLikedMap(m);
  }, [likedVehicleIds]);

  const getImg = (v) => {
    if (v?.primary_image_url) return v.primary_image_url;
    if (Array.isArray(v?.images) && v.images.length) {
      if (v.images[0].url) return v.images[0].url;
      if (v.images[0].image_path) return `/storage/${v.images[0].image_path}`;
      if (v.images[0].path) return `/storage/${v.images[0].path}`;
    }
    if (v?.primaryImage?.path) return `/storage/${v.primaryImage.path}`;
    return placeholderImg;
  };

  const toggleLike = async (vehicleId, e) => {
    if (e) e.stopPropagation();
    if (!authUser) {
      alert("You must be logged in to like a vehicle.");
      router.visit("/signin");
      return;
    }
    const next = !likedMap[vehicleId];
    setLikedMap((prev) => ({ ...prev, [vehicleId]: next }));
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

    try {
      const { data } = await axios.post(
        route("client.vehicle.like.toggle"),
        { vehicle_id: vehicleId },
        { headers: { "X-CSRF-TOKEN": token } }
      );

      const map = {};
      (data.likedVehicleIds || []).forEach((id) => (map[id] = true));
      setLikedMap(map);
    } catch (err) {
      console.error(err);
      setLikedMap((prev) => ({ ...prev, [vehicleId]: !next }));
    }
  };

  const view = (id) => {
    let search = "";
    if (searchParams && Object.values(searchParams).some(Boolean)) {
      const p = new URLSearchParams();
      if (searchParams.pickupLocation) p.set("pickupLocation", searchParams.pickupLocation);
      if (searchParams.pickupDate) p.set("pickupDate", searchParams.pickupDate);
      if (searchParams.dropoffLocation) p.set("dropoffLocation", searchParams.dropoffLocation);
      if (searchParams.dropoffDate) p.set("dropoffDate", searchParams.dropoffDate);
      if (searchParams.withDriver) p.set("withDriver", "true");
      const qs = p.toString();
      if (qs) search = `?${qs}`;
    } else {
      search = window.location.search || "";
    }
    router.visit(`/vehicleDetails/${id}${search}`);
  };

  return (
    <div className="w-full">
      {/* Listing Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Available Fleet{" "}
            <span className="text-blue-600 font-bold ml-1 text-sm bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {vehicles.length} {vehicles.length === 1 ? "car" : "cars"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Instant booking confirmation with free cancellation options
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="hidden md:inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedVehicles.map((v) => {
            const title = `${v.manufacturer || ""} ${v.model || "Vehicle"}`.trim();
            const seats = v.landSpec?.seats ?? v.passenger_capacity;
            const transmission = v.landSpec?.transmission_type;
            const fuel = v.landSpec?.fuel_type;
            const luggage = v.landSpec?.luggage_capacity;
            const isLiked = Boolean(likedMap[v.id]);

            return (
              <div
                key={v.id}
                onClick={() => view(v.id)}
                className="group relative bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_35px_-8px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Vehicle Image Container */}
                <div className="relative h-52 sm:h-56 bg-slate-100 overflow-hidden">
                  <img
                    src={getImg(v)}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholderImg;
                    }}
                  />

                  {/* Gradient Vignette overlay for text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-emerald-700 shadow-sm border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                    {v.typeSpec && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 backdrop-blur-md text-white shadow-sm">
                        {formatLabel(v.typeSpec)}
                      </span>
                    )}
                  </div>

                  {/* Favorite Like Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleLike(v.id, e)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md shadow-md grid place-items-center hover:scale-110 active:scale-95 transition-all z-10"
                    aria-label={isLiked ? "Unlike" : "Like"}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isLiked ? "fill-rose-500 text-rose-500" : "text-slate-600 hover:text-rose-500"
                      }`}
                    />
                  </button>

                  {/* Bottom category tag */}
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200">
                      {v.manufacturer || "Verified Host"}
                    </span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {title}
                  </h3>

                  {/* Key Specs Pills */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-semibold text-slate-600">
                    {seats && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{seats} Seats</span>
                      </div>
                    )}
                    {transmission && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                        <Settings2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{formatLabel(transmission)}</span>
                      </div>
                    )}
                    {fuel && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                        <Fuel className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{formatLabel(fuel)}</span>
                      </div>
                    )}
                    {luggage && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{luggage} Bags</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing & CTA Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Daily Rate</div>
                      <div className="text-lg font-black text-slate-900 tracking-tight">
                        <span className="text-xs font-bold text-blue-600 mr-1">{v.currency || "LKR"}</span>
                        {(Number(v.rental_price_per_day) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-xs font-medium text-slate-400">/day</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        view(v.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {sortedVehicles.map((v) => {
            const title = `${v.manufacturer || ""} ${v.model || "Vehicle"}`.trim();
            const seats = v.landSpec?.seats ?? v.passenger_capacity;
            const transmission = v.landSpec?.transmission_type;
            const fuel = v.landSpec?.fuel_type;
            const luggage = v.landSpec?.luggage_capacity;
            const isLiked = Boolean(likedMap[v.id]);

            return (
              <div
                key={v.id}
                onClick={() => view(v.id)}
                className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 p-4 flex flex-col md:flex-row gap-5 cursor-pointer"
              >
                {/* Thumb */}
                <div className="relative md:w-64 h-48 md:h-auto rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={getImg(v)}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholderImg;
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => toggleLike(v.id, e)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow grid place-items-center"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? "fill-rose-500 text-rose-500" : "text-slate-600"
                      }`}
                    />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        {v.manufacturer || "Host"}
                      </span>
                      {v.typeSpec && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {formatLabel(v.typeSpec)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {title}
                    </h3>

                    {/* Specs row */}
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold text-slate-600">
                      {seats && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>{seats} Seats</span>
                        </div>
                      )}
                      {transmission && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{formatLabel(transmission)}</span>
                        </div>
                      )}
                      {fuel && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <Fuel className="w-3.5 h-3.5 text-blue-600" />
                          <span>{formatLabel(fuel)}</span>
                        </div>
                      )}
                      {luggage && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          <span>{luggage} Bags</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Daily Rate: </span>
                      <span className="text-lg font-black text-slate-900">
                        {v.currency || "LKR"} {(Number(v.rental_price_per_day) || 0).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-5 h-10 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <span>View Vehicle</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {vehicles.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <CarIcon className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No vehicles match your search</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            We couldn't find any available vehicles matching your filter criteria. Try adjusting dates, locations, or clearing some filters.
          </p>
          <button
            type="button"
            onClick={() => router.visit("/vehicleList")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
          >
            Clear All Filters & Show Fleet
          </button>
        </div>
      )}

      {/* Pagination */}
      {Array.isArray(paginationLinks) && paginationLinks.length > 3 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
          {paginationLinks.map((link, i) => (
            <Link
              key={i}
              href={link.url || "#"}
              preserveScroll
              className={`min-w-[40px] h-10 px-3 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                link.active
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : link.url
                  ? "bg-white border border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50"
                  : "bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed pointer-events-none"
              }`}
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleListContent;
