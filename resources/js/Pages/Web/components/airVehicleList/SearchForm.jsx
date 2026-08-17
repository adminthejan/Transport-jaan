import React from "react";
import { router } from "@inertiajs/react";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png"
import locationBlue from "../../assets/vehicleList/locationBlue.png"

const SearchForm = ({ formData, onFormChange }) => {
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    onFormChange({
      ...formData,
      [id]: value
    });
  };

  const handleSearch = async () => {
    const params = new URLSearchParams();
    if (formData.pickupLocation) params.set('pickupLocation', formData.pickupLocation);
    if (formData.pickupDate) params.set('pickupDate', formData.pickupDate);
    if (formData.dropoffLocation) params.set('dropoffLocation', formData.dropoffLocation);
    if (formData.dropoffDate) params.set('dropoffDate', formData.dropoffDate);

    const queryString = params.toString();

    try {
      const response = await fetch(queryString ? `/airVehicleList/json?${queryString}` : '/airVehicleList/json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const vehicles = Array.isArray(data?.vehicles)
        ? data.vehicles
        : (Array.isArray(data?.vehicles?.data) ? data.vehicles.data : []);
      const firstVehicle = vehicles[0];

      if (firstVehicle?.id) {
        router.visit(`/airVehicleDetails/${firstVehicle.id}${queryString ? `?${queryString}` : ''}`, {
          method: 'get',
          preserveScroll: true,
        });
        return;
      }
    } catch (error) {
      console.error('Failed to find an air vehicle:', error);
    }

    router.visit(queryString ? `/airVehicleList?${queryString}` : '/airVehicleList', {
      method: 'get',
      preserveScroll: true,
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 2xl:px-16 py-4 sm:py-6 md:py-10">
      {/* Search Form */}
      <div className="figtree bg-white p-4 sm:p-6 rounded-[15px] shadow-2xl shadow-[#00000040] w-full min-h-[132px] text-[#286BB6] text-[13px] font-[400]">
        {/* Combined Inputs and Button */}
        <div className="flex flex-col sm:flex-row items-end gap-4">
          {/* Input Fields Container */}
          <div className="flex flex-col sm:flex-row flex-grow gap-4 w-full">
            {/* Pick-up Location */}
            <div className="w-full sm:flex-1">
              <label htmlFor="pickupLocation" className="block mb-1">
                Pick-up Location
              </label>
              <div className="relative flex items-center">
                <img src={locationBlue} className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none" alt="location" />
                <input
                  type="text"
                  id="pickupLocation"
                  placeholder="Search a location"
                  value={formData.pickupLocation}
                  onChange={handleInputChange}
                  className="shadow-sm appearance-none w-full border-[1px] border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pl-12 placeholder:text-[#286BB6]"
                />
              </div>
            </div>

            {/* Pick-up Date */}
            <div className="w-full sm:flex-1">
              <label htmlFor="pickupDate" className="block mb-1">
                Pick-up Date
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  id="pickupDate"
                  placeholder="12/12/2023"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                  className="shadow-sm w-full border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pr-12 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <img
                  src={calendarBlue}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] cursor-pointer"
                  alt="calendar"
                  onClick={() => document.getElementById('pickupDate').showPicker()}
                />
              </div>
            </div>

            {/* Drop-off Location */}
            <div className="w-full sm:flex-1">
              <label htmlFor="dropoffLocation" className="block mb-1">
                Drop-off Location
              </label>
              <div className="relative flex items-center">
                <img src={locationBlue} className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none" alt="location" />
                <input
                  type="text"
                  id="dropoffLocation"
                  placeholder="Search a location"
                  value={formData.dropoffLocation}
                  onChange={handleInputChange}
                  className="shadow-sm w-full border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pl-12 placeholder:text-[#286BB6]"
                />
              </div>
            </div>

            {/* Drop-off Date */}
            <div className="w-full sm:flex-1">
              <label htmlFor="dropoffDate" className="block mb-1">
                Drop-off Date
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  id="dropoffDate"
                  placeholder="12/12/2023"
                  value={formData.dropoffDate}
                  onChange={handleInputChange}
                  className="shadow-sm border-[#0000001A] rounded-[8px] p-[16px] w-full leading-tight focus:outline-none focus:shadow-outline pr-12 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <img
                  src={calendarBlue}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] cursor-pointer"
                  alt="calendar"
                  onClick={() => document.getElementById('dropoffDate').showPicker()}
                />
              </div>
            </div>
          </div>

          {/* Find a Vehicle Button */}
          <button
            onClick={handleSearch}
            className="bg-[#0955AC] text-white font-bold h-[56px] w-full sm:w-[56px] flex items-center justify-center rounded-[8px] focus:outline-none focus:shadow-outline cursor-pointer mt-4 sm:mt-0 hover:bg-[#074494] transition-colors"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
