import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Truck } from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const formatPrice = (value, currency = "LKR") =>
  value === null || value === undefined
    ? "On request"
    : `${currency} ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * Lorries and cargo vans that can be assigned to move goods to this
 * warehouse. The vehicles themselves are booked in the Cargo & Freight module.
 */
const AvailableVehicles = () => {
  const { props } = usePage();
  const vehicles = Array.isArray(props?.availableVehicles) ? props.availableVehicles : [];
  const warehouseId = props?.warehouse?.id;

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <div className="poppins w-full py-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
        <div>
          <h1 className="text-[20px] font-[600]">Available Vehicles</h1>
          <p className="text-[12px] text-[#00000080]">
            Lorries and cargo vans you can assign to move your goods. Booking continues in Cargo &amp; Freight.
          </p>
        </div>
        <Link
          href="/cargo-freight"
          className="text-[12px] font-[700] text-[#0955AC] hover:underline"
        >
          View all in Cargo &amp; Freight
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="rounded-[12px] border border-[#0000001A] bg-white overflow-hidden flex flex-col"
          >
            <div className="h-[130px] bg-[#F1F5F9]">
              <img
                src={vehicle.image || placeholderImg}
                alt={vehicle.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = placeholderImg;
                }}
              />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-[600] text-[#0955AC]">
                <Truck className="w-4 h-4" />
                {vehicle.category || "Vehicle"}
              </div>
              <h3 className="text-[14px] font-[700] leading-tight">{vehicle.name}</h3>
              <p className="text-[11px] text-[#00000080]">
                {vehicle.capacity ? `${vehicle.capacity} seats / load capacity` : "Capacity on request"}
              </p>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <span className="text-[13px] font-[700]">
                  {formatPrice(vehicle.price_per_day, vehicle.currency)}
                  <span className="text-[10px] font-[500] text-[#00000080]"> / day</span>
                </span>
                <Link
                  href={`/cargo-freight?vehicle=${vehicle.id}${warehouseId ? `&warehouse=${warehouseId}` : ""}`}
                  className="rounded-[6px] bg-[#0955AC] px-3 py-1.5 text-[11px] font-[700] text-white hover:bg-[#074494]"
                >
                  Assign for cargo
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailableVehicles;
