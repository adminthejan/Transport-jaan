import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import Header from "./client/ClientHeader";
import FilterSidebar from "../components/seaVehicleList/FilterSidebar";
import SeaVehicleListContent from "../components/seaVehicleList/SeaVehicleListContent";
import SearchForm from "../components/seaVehicleList/SearchForm";
import bg from "../assets/rentAVehicle/bg/bg.png";

const seaVehicleList = () => {
  const { props } = usePage();

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
    <div className="vehicle-list-page bg-[#F6F7F9] min-h-screen">
      <Header />

      <SearchForm formData={formData} onFormChange={handleFormChange} />

      <div className="px-4 sm:px-6 lg:px-10 2xl:px-16 pb-16">
        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Filters */}
          <div className="order-2 xl:order-1">
            <FilterSidebar searchParams={formData} />
          </div>

          {/* Results */}
          <div className="order-1 xl:order-2 min-w-0">
            <SeaVehicleListContent
              vehicles={props.vehicles}
              authUser={props.auth.user}
              likedVehicleIds={props.likedVehicleIds}
              searchParams={{
                dropoffDate: formData.dropoffDate,
                dropoffLocation: formData.dropoffLocation,
                pickupDate: formData.pickupDate,
                pickupLocation: formData.pickupLocation
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default seaVehicleList;
