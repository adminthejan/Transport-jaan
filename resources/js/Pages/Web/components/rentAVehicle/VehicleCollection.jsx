import React, { useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";

// icons
import meter from "../../assets/rentAVehicle/collection/meter.png";
import gearBox from "../../assets/rentAVehicle/collection/gearbox.png";
import user from "../../assets/rentAVehicle/collection/user.png";
import gas from "../../assets/rentAVehicle/collection/gas.png";
import heartFill from "../../assets/rentAVehicle/collection/heartFill.png";
import heart from "../../assets/rentAVehicle/collection/heart.png";

// bundled placeholder (resources/js/assets/placeholder.jpg)
import placeholderImg from "@/assets/placeholder.jpg";

const VehicleCollection = ({vehicles, selectedType}) => {
  const { likedVehicleIds, authUser } = usePage().props;
  

  // const [likedVehicles, setLikedVehicles] = useState({});
    // liked map for O(1) checks
    const [likedMap, setLikedMap] = useState({});
    useEffect(() => {
      const m = {};
      (likedVehicleIds || []).forEach((id) => (m[id] = true));
      setLikedMap(m);
    }, [likedVehicleIds]);
  

  // useEffect(() => {
  //   if (likedVehicleIds) {
  //     const initial = {};
  //     likedVehicleIds.forEach((id) => (initial[id] = true));
  //     setLikedVehicles(initial);
  //   }
  // }, [likedVehicleIds]);

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
      { headers: { 'X-CSRF-TOKEN': token } }  // <-- include CSRF token here
    );

    const map = {};
    (data.likedVehicleIds || []).forEach((id) => (map[id] = true));
    setLikedMap(map);
  } catch (e) {
    console.error(e);
    alert("Something went wrong while liking the vehicle.");
  }
};                                                                            

  const handleViewDetails = (vehicleId) => {
    if (!vehicleId) return;
    // prefer the explicit prop, fall back to the `type` query param
    const typeFromProp = (selectedType || "").toString().toLowerCase();
    const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const typeFromQuery = qs ? (qs.get('type') || '').toString().toLowerCase() : '';
    const type = typeFromProp || typeFromQuery;

    try {
      if (type === 'air') {
        router.visit(route('airVehicle.details', vehicleId));
        return;
      }

      if (type === 'sea') {
        router.visit(route('seaVehicle.details', vehicleId));
        return;
      }

      // default / land / car -> use generic vehicle details route
      router.visit(route('vehicle.details', vehicleId));
    } catch (e) {
      // fallback to constructed path if named route helper isn't available
      if (type === 'air') {
        router.visit(`/airVehicleDetails/${vehicleId}`);
        return;
      }
      if (type === 'sea') {
        router.visit(`/seaVehicleDetails/${vehicleId}`);
        return;
      }
      router.visit(`/vehicleDetails/${vehicleId}`);
    }
  };

const handleViewMore = () => {
  switch (selectedType) {
    case "car":
      router.get("/vehicleList", { type: "land" });
      break;
    case "sea":
      router.get("/seaVehicleList", { type: "sea" });
      break;
    case "air":
      router.get("/airVehicleList", { type: "air" });
      break;
    default:
      router.get("/vehicleList", { type: selectedType });
  }
};

  // choose the best available image URL
  const getVehicleImageSrc = (v) => {
    if (v?.primary_image_url) return v.primary_image_url; // preferred (backend-built)

    if (Array.isArray(v?.images) && v.images.length) {
      if (v.images[0]?.url) return v.images[0].url;       // backend-built
      if (v.images[0]?.image_path) return `/storage/${v.images[0].image_path}`;
      if (v.images[0]?.path) return `/storage/${v.images[0].path}`;
    }

    if (v?.primaryImage?.path) return `/storage/${v.primaryImage.path}`;

    // choose a sensible default by vehicle type:
    // prefer the explicit prop, fall back to the `type` query param
    // final fallback - use the imported placeholder for all types
    return placeholderImg;
  };

  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-10">
      <div className="container mx-auto">
        <h2 className="bebas-neue text-[28px] sm:text-[36px] md:text-[40px] font-[400] text-center mb-8">
          OUR <span className="text-[#0955AC]">IMPRESSIVE COLLECTION</span> OF VEHICLES
        </h2>
        <p className="poppins text-[#0F0F0F80] text-[14px] sm:text-[15px] text-center mb-10">
          Ranging from elegant sedans to powerful vehicles, all carefully selected to provide
          our customers <br /> with the ultimate driving experience.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-7 justify-items-center p-4 sm:p-6 md:p-8 lg:p-10">
          {vehicles.map((vehicle, idx) => (
            <div
              key={vehicle.id}
              className="group relative bg-white rounded-[18px] overflow-hidden h-auto w-full sm:max-w-[300px] border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_32px_rgba(9,85,172,0.16)] hover:-translate-y-1.5 transition-all duration-300"
            >
              {/* Vehicle Image */}
              <div className="relative w-full overflow-hidden bg-[#F3F5F8]" style={{ aspectRatio: '4 / 3' }}>
                <img
                  src={getVehicleImageSrc(vehicle)}
                  alt={vehicle.model || "Vehicle"}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = placeholderImg;
                  }}
                  loading="lazy"
                />

                {/* Availability badge */}
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full px-3 py-1 text-[11px] font-bold text-green-700 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Available Now
                </span>
                {idx < 3 && (
                  <span className="absolute top-3 right-11 inline-flex items-center bg-[#0955AC] rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                    Popular
                  </span>
                )}

                {/* Like button */}
                <button
                  onClick={() => toggleLike(vehicle.id)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/95 backdrop-blur shadow-sm grid place-items-center hover:scale-110 transition-transform"
                  aria-label={likedMap[vehicle.id] ? 'Unlike' : 'Like'}
                >
                  <img src={likedMap[vehicle.id] ? heartFill : heart} alt="" className="w-[15px] h-[15px]" />
                </button>
              </div>

              {/* Vehicle Info */}
              <div className="p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="poppins text-[16px] sm:text-[17px] font-[700] text-[#0F0F0F] truncate">
                    {vehicle.model || "Vehicle"}
                  </h3>
                  <span className="flex items-center gap-1 text-[12px] font-[700] text-[#0F0F0F] shrink-0">
                    <span className="text-[#F0BB0D]">★</span> 4.8
                  </span>
                </div>
                <p className="text-[12px] text-[#0F0F0F80] mb-3">{vehicle.manufacturer || " "}</p>

                {/* Specs */}
                <div className="flex items-center gap-4 py-3 border-y border-black/5 mb-4 text-[10px] text-[#4B5563] font-[500]">
                  <div className="flex items-center gap-1.5">
                    <img src={meter} alt="" className="w-[14px] h-[14px] opacity-60" />
                    <span>{vehicle.mileage_km ?? "-"} km</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img src={gearBox} alt="" className="w-[14px] h-[14px] opacity-60" />
                    <span className="capitalize">{vehicle.transmission_type || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img src={user} alt="" className="w-[14px] h-[14px] opacity-60" />
                    <span>{vehicle.landSpec?.seats || vehicle.passenger_capacity || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img src={gas} alt="" className="w-[14px] h-[14px] opacity-60" />
                    <span className="capitalize">{vehicle.landSpec?.fuel_type || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="poppins">
                    <span className="text-[20px] sm:text-[22px] font-[800] text-[#0955AC]">
                      LKR {Number(vehicle.rental_price_per_day || 0).toLocaleString()}
                    </span>
                    <span className="text-[#00000066] text-[11px] font-[600]"> /day</span>
                  </p>
                  <button
                    onClick={() => handleViewDetails(vehicle.id)}
                    className="poppins bg-[#0955AC] hover:bg-[#073E82] text-white text-[12px] font-[700] py-2.5 px-5 rounded-full transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="text-center mt-8">
          <button
            onClick={handleViewMore}
            className="bg-[#0955AC] border-[2px] border-[#0955AC] text-white text-[16px] font-[700] py-2 px-6 rounded-[9px] cursor-pointer"
          >
            VIEW MORE
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCollection;
