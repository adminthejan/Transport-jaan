import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";
import { Heart, MapPin, Ruler, Warehouse as WarehouseIcon } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const formatTypeLabel = (value) =>
  (value || "")
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const WarehouseListContent = ({ warehouses: initialWarehouses, authUser, likedWarehouseIds }) => {
  // normalize input (paginator or array)
  const warehouses = useMemo(
    () => (Array.isArray(initialWarehouses) ? initialWarehouses : (initialWarehouses?.data || [])),
    [initialWarehouses]
  );

  const [sortBy, setSortBy] = useState("newest");

  // Backend already orders by created_at desc, so "Newest First" needs no
  // client-side work — only price sorting reorders the already-loaded list.
  const sortedWarehouses = useMemo(() => {
    if (sortBy === "price_asc") {
      return [...warehouses].sort((a, b) => (Number(a.monthly_rate || a.price) || 0) - (Number(b.monthly_rate || b.price) || 0));
    }
    if (sortBy === "price_desc") {
      return [...warehouses].sort((a, b) => (Number(b.monthly_rate || b.price) || 0) - (Number(a.monthly_rate || a.price) || 0));
    }
    return warehouses;
  }, [warehouses, sortBy]);

  // liked map for O(1) checks
  const normalizeId = (value) => {
    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  };

  const [likedMap, setLikedMap] = useState({});
  useEffect(() => {
    if (Object.keys(likedMap).length === 0) {
      const next = {};
      (likedWarehouseIds || []).forEach((id) => {
        next[normalizeId(id)] = true;
      });
      setLikedMap(next);
    }
    // Run only on mount, not when likedWarehouseIds changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: best image URL
  const getImg = (w) => {
    // First priority: main/primary image
    if (w?.main_image?.url) return w.main_image.url;
    if (w?.main_image?.file_path) return `/storage/${w.main_image.file_path}`;
    if (w?.primary_image_url) return w.primary_image_url;
    
    // Second priority: first image from images array
    if (Array.isArray(w?.images) && w.images.length) {
      const firstImage = w.images[0];
      if (firstImage?.url) return firstImage.url;
      if (firstImage?.file_path) return `/storage/${firstImage.file_path}`;
      if (firstImage?.image_path) return `/storage/${firstImage.image_path}`;
      if (firstImage?.path) return `/storage/${firstImage.path}`;
      if (typeof firstImage === 'string') return `/storage/${firstImage}`;
    }
    
    // Third priority: primaryImage relationship
    if (w?.primaryImage?.url) return w.primaryImage.url;
    if (w?.primaryImage?.file_path) return `/storage/${w.primaryImage.file_path}`;
    if (w?.primaryImage?.path) return `/storage/${w.primaryImage.path}`;
    
    return "/placeholder.png";
  };

  const handleViewDetails = (warehouse) => {
    router.visit('/warehouseDetails', {
      method: 'get',
      data: {
        warehouse: {
          ...warehouse,
        },
        image: warehouse.images?.[0] ? `/storage/${warehouse.images[0]}` : null
      },
      preserveState: true
    });
  };

  const resolveWishlistUrl = () => {
    if (typeof route === "function") {
      try {
        return route("client.warehouse.like.toggle");
      } catch (error) {
        console.warn("Falling back to hardcoded wishlist URL", error);
      }
    }

    return "/api/warehouse/like-toggle";
  };

  const toggleLike = async (warehouseId) => {
    if (!authUser) {
      alert("You must be logged in to like a warehouse.");
      router.visit("/signin");
      return;
    }
    try {
      const { data } = await axios.post(resolveWishlistUrl(), { warehouse_id: warehouseId });

      setLikedMap((prev) => {
        const next = { ...prev };

        if (Array.isArray(data.likedWarehouseIds)) {
          const updated = {};
          data.likedWarehouseIds.forEach((id) => {
            updated[normalizeId(id)] = true;
          });
          return updated;
        }

        const normalizedId = normalizeId(warehouseId);
        const isLiked = typeof data.is_liked === "boolean" ? data.is_liked : !prev[normalizedId];
        if (isLiked) {
          next[normalizedId] = true;
        } else {
          delete next[normalizedId];
        }

        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Something went wrong while liking the warehouse.");
    }
  };

  return (
    <div className="w-full py-6 xl:py-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="bebas-neue text-[24px] md:text-[32px] font-[400]">
          we found <span className="text-[#0955AC]">{warehouses.length} warehouses</span> for you
        </p>

        {warehouses.length > 1 && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-5">
        {sortedWarehouses.map((w) => {
          const specs = [];
          if (w.total_area) specs.push({ icon: Ruler, label: `${Number(w.total_area).toLocaleString()} sq ft` });
          if (w.type) specs.push({ icon: WarehouseIcon, label: formatTypeLabel(w.type) });

          return (
            <div
              key={w.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
            >
              {/* --- warehouse image --- */}
              <div className="relative h-[190px] sm:h-[210px] bg-gray-100">
                <img
                  src={getImg(w)}
                  alt={w.name || "warehouse"}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://via.placeholder.com/286x240?text=Warehouse+Image";
                  }}
                />

                <button
                  onClick={() => toggleLike(w.id)}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow hover:bg-white transition-colors"
                  aria-label={likedMap[w.id] ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`w-[18px] h-[18px] ${likedMap[w.id] ? "fill-[#D6336C] text-[#D6336C]" : "text-gray-500"}`}
                  />
                </button>

                {w.pricing_model && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-full px-3 py-1 text-[11px] font-[700] text-[#0955AC] shadow">
                    {formatTypeLabel(w.pricing_model)} lease
                  </div>
                )}
              </div>

              {/* --- details --- */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-[17px] font-[700] text-[#0F0F0F] leading-tight truncate">
                  {w.name || "Warehouse"}
                </h3>

                {w.address && (
                  <div className="flex items-center gap-1 mt-1 text-[12px] text-[#6B7280]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{w.address}</span>
                  </div>
                )}

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
                      {(Number(w.monthly_rate || w.price) || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[#9CA3AF] text-[11px] mt-1">per {w.pricing_model || "month"}</div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(w)}
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

      {warehouses.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-gray-100">
          <WarehouseIcon className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-[#0F0F0F] font-[600]">No warehouses match your filters</p>
          <p className="text-[#9CA3AF] text-[13px] mt-1">Try adjusting your search or clearing a filter.</p>
        </div>
      )}
    </div>
  );
};

export default WarehouseListContent;