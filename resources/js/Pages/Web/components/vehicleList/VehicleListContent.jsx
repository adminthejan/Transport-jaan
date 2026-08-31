import React, { useEffect, useMemo, useState } from "react";
import { router, Link } from "@inertiajs/react";
import axios from "axios";
import { Briefcase, Car as CarIcon, Fuel, Gauge, Heart, Settings2, Users } from "lucide-react";

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const formatLabel = (value) =>
  (value || "")
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const VehicleListContent = ({ vehicles: initialVehicles, authUser, likedVehicleIds, searchParams }) => {

  // normalize input (paginator or array)
  const vehicles = useMemo(
    () => (Array.isArray(initialVehicles) ? initialVehicles : (initialVehicles?.data || [])),
    [initialVehicles]
  );
  const paginationLinks = !Array.isArray(initialVehicles) ? initialVehicles?.links : null;

  const [sortBy, setSortBy] = useState("default");

  const sortedVehicles = useMemo(() => {
    if (sortBy === "price_asc") {
      return [...vehicles].sort((a, b) => (Number(a.rental_price_per_day) || 0) - (Number(b.rental_price_per_day) || 0));
    }
    if (sortBy === "price_desc") {
      return [...vehicles].sort((a, b) => (Number(b.rental_price_per_day) || 0) - (Number(a.rental_price_per_day) || 0));
    }
    return vehicles;
  }, [vehicles, sortBy]);

  // liked map for O(1) checks
  const [likedMap, setLikedMap] = useState({});
  useEffect(() => {
    const m = {};
    (likedVehicleIds || []).forEach((id) => (m[id] = true));
    setLikedMap(m);
  }, [likedVehicleIds]);

  // helper: best image URL
  const getImg = (v) => {
    if (v?.primary_image_url) return v.primary_image_url;
    if (Array.isArray(v?.images) && v.images.length) {
      if (v.images[0].url) return v.images[0].url;
      if (v.images[0].image_path) return `/storage/${v.images[0].image_path}`;
      if (v.images[0].path) return `/storage/${v.images[0].path}`;
    }
    if (v?.primaryImage?.path) return `/storage/${v.primaryImage.path}`;
    return "/placeholder.png";
  };

  const toggleLike = async (vehicleId) => {
    if (!authUser) {
      alert("You must be logged in to like a vehicle.");
      router.visit("/signin");
      return;
    }
    const next = !likedMap[vehicleId];
    setLikedMap((prev) => ({ ...prev, [vehicleId]: next }));
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    try {
      const { data } = await axios.post(
        route("client.vehicle.like.toggle"),
        { vehicle_id: vehicleId },
        { headers: { 'X-CSRF-TOKEN': token } }
      );

      const map = {};
      (data.likedVehicleIds || []).forEach((id) => (map[id] = true));
      setLikedMap(map);
    } catch (e) {
      console.error(e);
      alert("Something went wrong while liking the vehicle.");
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
    <div className="w-full py-6 xl:py-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="bebas-neue text-[24px] md:text-[32px] font-[400]">
          we found <span className="text-[#0955AC]">{vehicles.length} cars</span> for you
        </p>

        {vehicles.length > 1 && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="poppins text-[12px] font-[600] text-[#0955AC] bg-white border border-[#0000001A] rounded-[8px] px-3 py-2 shadow-sm focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {sortedVehicles.map((v) => {
          const specs = [];
          if (v.landSpec?.transmission_type) specs.push({ icon: Settings2, label: formatLabel(v.landSpec.transmission_type) });
          if (v.landSpec?.fuel_type) specs.push({ icon: Fuel, label: formatLabel(v.landSpec.fuel_type) });
          const seats = v.landSpec?.seats || v.passenger_capacity;
          if (seats) specs.push({ icon: Users, label: `${seats} Seats` });
          if (v.landSpec?.luggage_capacity) specs.push({ icon: Briefcase, label: `${v.landSpec.luggage_capacity} Bags` });
          if (v.mileage_km) specs.push({ icon: Gauge, label: `${Number(v.mileage_km).toLocaleString()} km` });

          const title = [v.manufacturer, v.model].filter(Boolean).join(" ") || v.model || "Vehicle";

          return (
            <div
              key={v.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
            >
              {/* --- vehicle image --- */}
              <div className="relative h-[190px] sm:h-[210px] bg-gray-100">
                <img
                  src={getImg(v)}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                <button
                  onClick={() => toggleLike(v.id)}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow hover:bg-white transition-colors"
                  aria-label={likedMap[v.id] ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`w-[18px] h-[18px] ${likedMap[v.id] ? "fill-[#D6336C] text-[#D6336C]" : "text-gray-500"}`}
                  />
                </button>

                {v.typeSpec && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-full px-3 py-1 text-[11px] font-[700] text-[#0955AC] shadow">
                    {formatLabel(v.typeSpec)}
                  </div>
                )}
              </div>

              {/* --- details --- */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-[17px] font-[700] text-[#0F0F0F] leading-tight truncate">
                  {title}
                </h3>

                {specs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {specs.map((s, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-[#F4F6F9] rounded-full px-2.5 py-1 text-[11px] font-[600] text-[#4B5563]"
                      >
                        <s.icon className="w-3.5 h-3.5 text-[#0955AC]" />
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="font-extrabold text-[22px] text-[#0F0F0F] leading-none">
                      {(Number(v.rental_price_per_day) || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[#9CA3AF] text-[11px] mt-1">per day</div>
                  </div>

                  <button
                    onClick={() => view(v.id)}
                    className="h-[38px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[11px] font-[700] tracking-wide hover:bg-[#074494] transition-colors"
                  >
                    VIEW DETAILS
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {vehicles.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-gray-100">
          <CarIcon className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-[#0F0F0F] font-[600]">No vehicles match your filters</p>
          <p className="text-[#9CA3AF] text-[13px] mt-1">Try adjusting your search or clearing a filter.</p>
        </div>
      )}

      {Array.isArray(paginationLinks) && paginationLinks.length > 3 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-8">
          {paginationLinks.map((link, i) => (
            <Link
              key={i}
              href={link.url || "#"}
              preserveScroll
              className={`min-w-[36px] h-9 px-2 rounded-[8px] flex items-center justify-center text-[12px] font-[600] transition-colors ${
                link.active
                  ? "bg-[#0955AC] text-white"
                  : link.url
                  ? "bg-white border border-[#0000001A] text-[#4B5563] hover:border-[#0955AC] hover:text-[#0955AC]"
                  : "bg-gray-50 border border-[#0000000D] text-gray-300 cursor-not-allowed pointer-events-none"
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
