import React, { useMemo } from "react";
import { Link } from "@inertiajs/react";

import miles from "../../assets/landVehicleDetails/carSpec/miles.svg";
import fuel from "../../assets/landVehicleDetails/carSpec/fuel.svg";
import gear from "../../assets/landVehicleDetails/carSpec/gear.svg";
import seatsIcon from "../../assets/landVehicleDetails/carSpec/seats.svg";
import modelIcon from "../../assets/landVehicleDetails/carSpec/model.svg";
import doorsIcon from "../../assets/landVehicleDetails/carSpec/doors.svg";
import liters from "../../assets/landVehicleDetails/carSpec/liters.svg";
import car from "../../assets/landVehicleDetails/car.svg";
import proPic from "../../assets/landVehicleDetails/proPic.svg";
import tag from "../../assets/landVehicleDetails/tag.svg";
import star from "../../assets/driverBooking/star.svg";

const fmtInt = (n) => (n ?? n === 0 ? Number(n).toLocaleString() : "—");
const fmtFloat = (n, d = 1) => (n ?? n === 0 ? Number(n).toFixed(d) : "—");
const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const SpecCard = ({ icon, label }) => (
  <div className="w-[187px] h-[81px] border-[1px] border-[#0000002B] bg-[#E7E6E6] rounded-[10px] flex flex-row justify-center items-center gap-5 px-5 py-5">
    <img src={icon} alt="" />
    <h1>{label}</h1>
  </div>
);

const PlaneDetailsTab = ({ vehicle }) => {
  const air = vehicle?.airSpec;

  const specs = useMemo(() => {
    return {
      aircraftType: ucfirst(air?.aircraft_type),
      icaoType: air?.icao_type_designator || "—",
      baseAirport: air?.base_airport_iata || air?.base_airport_icao || "—",
      fuel: ucfirst(air?.fuel_type),
      seats: air?.seats ? `${air.seats} Seats` : "—",
      crewRequired: air?.crew_required ? `${air.crew_required} Crew` : "—",
      range: air?.range_km ? `${fmtInt(air.range_km)} km Range` : "—",
      mtow: air?.mtow_kg ? `${fmtInt(air.mtow_kg)} kg MTOW` : "—",
      cruisingSpeed: air?.cruising_speed_kts ? `${fmtInt(air.cruising_speed_kts)} kts` : "—",
      flightHours: air?.flight_hours_total ? `${fmtInt(air.flight_hours_total)} Flight Hrs` : "—",
      brand: vehicle?.manufacturer || "—",
      condition: ucfirst(vehicle?.condition),
      colour: vehicle?.colour || "—",
      ownershipType: vehicle?.ownership_type
        ? vehicle.ownership_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "—",
      insuranceProvider: vehicle?.insurance_provider || "—",
      description:
        vehicle?.description ||
        "No description provided for this vehicle.",
      owner: {
        name: vehicle?.provider?.name || "—",
        rating: vehicle?.rating_avg ? fmtFloat(vehicle.rating_avg, 1) : null,
        reviews: vehicle?.reviews_count ?? null,
        phone: vehicle?.provider?.phone || vehicle?.provider?.contact_number || "—",
        // If you store how long the provider has been on the platform, add it here.
      },
      brandModel:
        (vehicle?.manufacturer || "") +
        (vehicle?.model ? ` ${vehicle.model}` : ""),
    };
  }, [vehicle, air]);

  return (
    <>
      {/* Description */}
      <div className="flex flex-col gap-5">
        <h1 className="text-[15px] font-[600]">Description</h1>
        <p className="text-[14px]/[33px] font-[400] text-justify px-5">
          {specs.description}
        </p>
      </div>

      {/* Specs */}
      <div className="py-10">
        <h1 className="text-[15px] font-[600]">Plane Specifications</h1>
        <div className="py-10 text-[12px] font-[700]">
          <div className="flex flex-col justify-center items-center gap-10">
            <div className="flex flex-col xl:flex-row gap-10 justify-center items-center">
              <SpecCard icon={modelIcon} label={specs.aircraftType} />
              <SpecCard icon={doorsIcon} label={specs.icaoType} />
              <SpecCard icon={miles} label={specs.baseAirport} />
              <SpecCard icon={seatsIcon} label={specs.seats} />
            </div>
            <div className="flex flex-col xl:flex-row justify-center items-center gap-10">
              <SpecCard icon={gear} label={specs.crewRequired} />
              <SpecCard icon={miles} label={specs.range} />
              <SpecCard icon={gear} label={specs.mtow} />
              <SpecCard icon={gear} label={specs.cruisingSpeed} />
            </div>
            <div className="flex flex-col xl:flex-row justify-center items-center gap-10">
              <SpecCard icon={fuel} label={specs.fuel} />
              <SpecCard icon={liters} label={specs.flightHours} />
              <SpecCard icon={modelIcon} label={specs.brand} />
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="pb-10">
        <h1 className="text-[15px] font-[600] mb-5">Aircraft Details</h1>
        <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
          <div>
            <span className="text-[#7B7B7A] mr-2">Condition:</span>
            <span className="font-[600]">{specs.condition}</span>
          </div>
          <div>
            <span className="text-[#7B7B7A] mr-2">Colour:</span>
            <span className="font-[600]">{specs.colour}</span>
          </div>
          <div>
            <span className="text-[#7B7B7A] mr-2">Ownership:</span>
            <span className="font-[600]">{specs.ownershipType}</span>
          </div>
          <div>
            <span className="text-[#7B7B7A] mr-2">Insured by:</span>
            <span className="font-[600]">{specs.insuranceProvider}</span>
          </div>
        </div>
      </div>

      {/* Warranty (optional static; keep or replace with real data if you add fields later) */}
      <div className="poppins">
        <h1 className="text-[20px] font-[600] mb-10">Warranty</h1>
        <p className="text-[14px] font-[400]">
          Warranty information isn’t available for this vehicle.
        </p>
      </div>

      {/* Owner Info */}
      <div className="poppins w-full py-7">
        <h1 className="text-[20px] font-[600] mb-10">Owner Info</h1>
        <div className="flex flex-col md:flex-row justify-start items-center gap-20">
          <div className="flex flex-col md:flex-row justify-start items-center gap-5">
            <img src={proPic} alt="" />
            <div className="flex flex-col items-start justify-center">
              <div className="flex flex-row gap-2 justify-center items-center">
                <h1 className="text-[15px] font-[700]">
                  {specs.owner.name}
                </h1>
                <img src={tag} alt="" />
              </div>
              <div>
                <div className="flex flex-row gap-3 justify-center items-center">
                  <img src={star} className="w-[16px]" alt="" />
                  <h1 className="text-[14px] font-[400]">
                    {specs.owner.rating ?? "—"}
                  </h1>
                  <h1 className="text-[12px] font-[500] text-[#949699]">
                    {specs.owner.reviews
                      ? `(${fmtInt(specs.owner.reviews)} Reviews)`
                      : "(No reviews)"}
                  </h1>
                </div>
                {/* If you later compute “Joined X months ago”, place it here */}
                {/* <h1 className="text-[14px] font-[400] text-[#949699]">Joined 7 months ago</h1> */}
              </div>
            </div>
          </div>
          <div className="text-[10px] flex flex-col md:flex-row gap-4">
            <Link
              href={`/vendors/profile/${vehicle?.provider?.id}`}
              className="w-[123px] h-[29px] border-[1.5px] border-[#0955AC] bg-[#E8EBEF] text-[#0955AC] font-[700] rounded-[5px] flex justify-center items-center cursor-pointer hover:bg-[#0955AC] hover:text-white transition-colors"
            >
              VIEW PROFILE
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlaneDetailsTab;
