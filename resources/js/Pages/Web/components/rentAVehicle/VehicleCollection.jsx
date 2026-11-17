import React, { useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import {
  Gauge,
  Settings2,
  Users,
  Fuel,
  Heart,
  Star,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const VehicleCollection = ({ vehicles = [], selectedType }) => {
  const { likedVehicleIds, authUser } = usePage().props;

  const [likedMap, setLikedMap] = useState({});
  useEffect(() => {
    const m = {};
    (likedVehicleIds || []).forEach((id) => (m[id] = true));
    setLikedMap(m);
  }, [likedVehicleIds]);

  const toggleLike = async (vehicleId, e) => {
    if (e) e.stopPropagation();
    if (!authUser) {
      alert("You must be registered and logged in to like a vehicle.");
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

  const handleViewDetails = (vehicleId) => {
    if (!vehicleId) return;
    const typeFromProp = (selectedType || "").toString().toLowerCase();
    const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const typeFromQuery = qs ? (qs.get("type") || "").toString().toLowerCase() : "";
    const type = typeFromProp || typeFromQuery;

    try {
      if (type === "air") {
        router.visit(route("airVehicle.details", vehicleId));
        return;
      }
      if (type === "sea") {
        router.visit(route("seaVehicle.details", vehicleId));
        return;
      }
      router.visit(route("vehicle.details", vehicleId));
    } catch (e) {
      if (type === "air") return router.visit(`/airVehicleDetails/${vehicleId}`);
      if (type === "sea") return router.visit(`/seaVehicleDetails/${vehicleId}`);
      router.visit(`/vehicleDetails/${vehicleId}`);
    }
  };

  const handleViewMore = () => {
    switch (selectedType) {
      case "car":
      case "land":
        router.get("/vehicleList", { type: "land" });
        break;
      case "sea":
        router.get("/seaVehicleList", { type: "sea" });
        break;
      case "air":
        router.get("/airVehicleList", { type: "air" });
        break;
      default:
        router.get("/vehicleList", { type: selectedType || "land" });
    }
  };

  const getVehicleImageSrc = (v) => {
    if (v?.primary_image_url) return v.primary_image_url;
    if (Array.isArray(v?.images) && v.images.length) {
      if (v.images[0]?.url) return v.images[0].url;
      if (v.images[0]?.image_path) return `/storage/${v.images[0].image_path}`;
      if (v.images[0]?.path) return `/storage/${v.images[0].path}`;
    }
    if (v?.primaryImage?.path) return `/storage/${v.primaryImage.path}`;
    return placeholderImg;
  };

  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Curated Fleet
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Featured Vehicles Ready to <span className="text-blue-600">Drive</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-normal leading-relaxed">
            Ranging from modern city sedans to rugged safari SUVs and luxury cruisers, every vehicle is inspected and certified for peace of mind.
          </p>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vehicles.map((vehicle, idx) => {
            const isLiked = Boolean(likedMap[vehicle.id]);
            const title = `${vehicle.manufacturer || ""} ${vehicle.model || "Vehicle"}`.trim();
            const seats = vehicle.landSpec?.seats || vehicle.passenger_capacity || 4;
            const transmission = vehicle.landSpec?.transmission_type || vehicle.transmission_type || "Auto";
            const fuel = vehicle.landSpec?.fuel_type || "Petrol";
            const mileage = vehicle.mileage_km ? `${vehicle.mileage_km} km` : "Unlimited";

            return (
              <div
                key={vehicle.id}
                onClick={() => handleViewDetails(vehicle.id)}
                className="group relative bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_35px_-8px_rgba(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
              >
                {/* Image Stage */}
                <div className="relative h-48 sm:h-52 bg-slate-100 overflow-hidden">
                  <img
                    src={getVehicleImageSrc(vehicle)}
                    alt={title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholderImg;
                    }}
                    loading="lazy"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                    {idx < 2 && (
                      <span className="inline-flex items-center bg-blue-600 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        Popular
                      </span>
                    )}
                  </div>

                  {/* Heart button */}
                  <button
                    type="button"
                    onClick={(e) => toggleLike(vehicle.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md grid place-items-center hover:scale-110 active:scale-95 transition-all z-10"
                    aria-label={isLiked ? "Unlike" : "Like"}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isLiked ? "fill-rose-500 text-rose-500" : "text-slate-600 hover:text-rose-500"
                      }`}
                    />
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 truncate">
                        {vehicle.manufacturer || "Fleet"}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-slate-800">4.9</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {title}
                    </h3>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3.5 text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{seats} Seats</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <Settings2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate capitalize">{transmission}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <Fuel className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate capitalize">{fuel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <Gauge className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{mileage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Per Day</div>
                      <div className="text-base font-black text-slate-900 tracking-tight">
                        <span className="text-xs text-blue-600 font-bold mr-0.5">{vehicle.currency || "LKR"}</span>
                        {Number(vehicle.rental_price_per_day || 0).toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(vehicle.id);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 h-9 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Rent</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <button
            type="button"
            onClick={handleViewMore}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-95 transition-all cursor-pointer"
          >
            <span>Explore Entire Fleet</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default VehicleCollection;
