import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import Header from "./client/ClientHeader";
import FilterSidebar from "../components/airVehicleList/FilterSidebar";
import AirVehicleListContent from "../components/airVehicleList/AirVehicleListContent";
import SearchForm from "../components/airVehicleList/SearchForm";
import ScheduledFlightForm from "../components/airVehicleList/ScheduledFlightForm";
import bg from "../assets/rentAVehicle/bg/bg.png";

const airVehicleList = () => {
  const { props } = usePage();
  // Charter Flight = rent the aircraft itself (the existing flow below).
  // Scheduled Flight = book a seat on an already-scheduled route instead.
  const [bookingMode, setBookingMode] = useState("charter");

  const [formData, setFormData] = useState({
    pickupLocation: "",
    pickupDate: "",
    dropoffLocation: "",
    dropoffDate: "",
    brand: "",
    bodyType: "",
  });

  useEffect(() => {
    if (props.filters) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.filters,
      }));
    }
  }, [props.filters]);

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  return (
    <div className="vehicle-list-page">
      <Header />
      <div className="main-content flex">
        <FilterSidebar searchParams={formData} />
        <div className="vehicle-list-container flex-1">
          {/* Charter Flight / Scheduled Flight tabs */}
          <div className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-10">
            <div className="inline-flex bg-[#F1F5F9] rounded-full p-1">
              {[
                { value: "charter", label: "Charter Flight" },
                { value: "scheduled", label: "Scheduled Flight" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setBookingMode(opt.value)}
                  className={`px-6 py-2 rounded-full text-[13px] font-[700] transition-all ${
                    bookingMode === opt.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {bookingMode === "scheduled" ? (
            <ScheduledFlightForm />
          ) : (
            <SearchForm formData={formData} onFormChange={handleFormChange} />
          )}
          {bookingMode === "charter" && <AirVehicleListContent
            vehicles={props.vehicles}
            authUser={props.auth.user}                //pass the logged-in user
            likedVehicleIds={props.likedVehicleIds} //pass liked vehicles
            searchParams={{
              dropoffDate: formData.dropoffDate,
              dropoffLocation: formData.dropoffLocation,
              pickupDate: formData.pickupDate,
              pickupLocation: formData.pickupLocation
            }}
          /> 
          }


        </div>
      </div>
    </div>
  );
};

export default airVehicleList;
