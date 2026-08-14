import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";

// warehouse-specific icons
import size from "../../assets/rentAVehicle/collection/meter.png";
import location from "../../assets/rentAVehicle/collection/user.png";
import warehouseType from "../../assets/rentAVehicle/collection/gearbox.png";
import features from "../../assets/rentAVehicle/collection/gas.png";
import heartFill from "../../assets/rentAVehicle/collection/heartFill.png";
import heart from "../../assets/rentAVehicle/collection/heart.png";

const WarehouseListContent = ({ warehouses: initialWarehouses, authUser, likedWarehouseIds }) => {
  // normalize input (paginator or array)
  const warehouses = useMemo(
    () => (Array.isArray(initialWarehouses) ? initialWarehouses : (initialWarehouses?.data || [])),
    [initialWarehouses]
  );

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
    <div className="w-full py-6 md:py-12 px-4 md:px-40">
      <div className="w-full">
        <p className="bebas-neue text-[28px] md:text-[40px] font-[400] mb-8">
          we found <span className="text-[#0955AC]">{warehouses.length} warehouses</span> for you
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-15 justify-items-center">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="bg-[#EAEAE9] shadow-md overflow-hidden h-auto w-full max-w-[286px] py-5"
            >
              {/* --- top spec row --- */}
              {/*
              <div className="pb-4">
                <div className="grid grid-cols-4 gap-4 text-[#8B8B8B]">
                  {[
                    { icon: size, label: w.total_area ? `${w.total_area?.toLocaleString()} sq ft` : "-" },
                    { icon: warehouseType, label: w.type || w.warehouse_type || "-" },
                    { icon: location, label: w.city || w.location || "-" },
                    { icon: features, label: w.amenities?.length ? `${w.amenities.length} amenities` : "-" },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <img src={s.icon} alt="" className="w-5 h-5 opacity-60" />
                      <span className="text-[11px] leading-none text-center">{String(s.label)}</span>
                    </div>
                  ))}
                </div>
              </div>
              */}

              {/* --- warehouse image --- */}
              <div className="mx-auto w-[90%] mb-4">
                <div className="relative h-[180px] sm:h-[210px] md:h-[240px] rounded-xl overflow-hidden ring-1 ring-gray-200 bg-gray-100">
                  <img
                    src={getImg(w)}
                    alt={w.name || "warehouse"}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://via.placeholder.com/286x240?text=Warehouse+Image";
                    }}
                  />
                </div>
              </div>

              {/* --- title + price --- */}
              <div className="text-center">
                <h3 className="bebas-neue text-[30px] tracking-wide">
                  {(w.name || "").toUpperCase()}
                </h3>
                <div className="flex items-end justify-center gap-2">
                  <div className="font-extrabold text-[28px] md:text-[32px]">
                    {(Number(w.monthly_rate || w.price) || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[#585858] text-sm pb-1">/{w.pricing_model || 'month'}</div>
                </div>

                {/* --- button row --- */}
                <div className="mt-5 flex items-center gap-3 px-4">
                  <button
                    onClick={() => handleViewDetails(w)}
                    className="flex-1 h-[42px] rounded bg-[#0955AC] text-white text-[11px] font-[700] tracking-wider"
                  >
                    VIEW DETAILS
                  </button>

                  <button
                    onClick={() => toggleLike(w.id)}
                    className="h-[42px] w-[42px] rounded border border-[#0955AC] grid place-items-center bg-white"
                    aria-label={likedMap[w.id] ? "Unlike" : "Like"}
                  >
                    <img
                      src={likedMap[w.id] ? heartFill : heart}
                      alt=""
                      className="w-[18px] h-[18px]"
                    />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default WarehouseListContent;