import React from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";

/**
 * Overlays for a vehicle card's image area.
 *  - vendor_verified: shows whether the owning vendor is verified
 *  - is_booked: the vehicle is already booked for the searched dates
 *    (the server sets it only when pickup/drop-off dates are in the search)
 */
const VehicleStatusBadges = ({ vehicle }) => (
  <>
    {vehicle?.is_booked && (
      <div className="absolute inset-0 bg-black/50 grid place-items-center pointer-events-none">
        <span className="rounded-full bg-white px-4 py-1.5 text-[12px] font-[800] uppercase tracking-wide text-[#B3261E] shadow">
          Currently booked
        </span>
      </div>
    )}
    <div
      className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-[700] shadow ${
        vehicle?.vendor_verified ? "bg-[#E8F6EC] text-[#1B7F3B]" : "bg-[#FFF4E0] text-[#B26A00]"
      }`}
    >
      {vehicle?.vendor_verified ? <BadgeCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {vehicle?.vendor_verified ? "Verified" : "Unverified"}
    </div>
  </>
);

export default VehicleStatusBadges;
