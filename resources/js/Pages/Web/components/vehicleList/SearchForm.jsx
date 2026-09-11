import React from "react";
import { router } from "@inertiajs/react";
import { Search } from "lucide-react";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png";
import locationBlue from "../../assets/vehicleList/locationBlue.png";

const SearchForm = ({ formData, onFormChange, onSearch, redirectToFirstVehicle = false }) => {
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    onFormChange({
      ...formData,
      [id]: value
    });
  };

  const handleSearch = async () => {
    // If a custom onSearch handler is provided (e.g. inline filtering), call it
    if (onSearch) {
      onSearch(formData);
      return;
    }

    // Otherwise navigate to vehicleList page with form data as query parameters
    const params = new URLSearchParams();
    if (formData.pickupLocation) params.set('pickupLocation', formData.pickupLocation);
    if (formData.pickupDate) params.set('pickupDate', formData.pickupDate);
    if (formData.dropoffLocation) params.set('dropoffLocation', formData.dropoffLocation);
    if (formData.dropoffDate) params.set('dropoffDate', formData.dropoffDate);
    if (formData.withDriver) params.set('withDriver', 'true');

    const queryString = params.toString();

    if (redirectToFirstVehicle) {
      try {
        const response = await fetch(queryString ? `/vehicleList/json?${queryString}` : '/vehicleList/json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const vehicles = Array.isArray(data?.vehicles)
          ? data.vehicles
          : (Array.isArray(data?.vehicles?.data) ? data.vehicles.data : []);
        const firstVehicle = vehicles[0];

        if (firstVehicle?.id) {
          router.visit(`/vehicleDetails/${firstVehicle.id}${queryString ? `?${queryString}` : ''}`, {
            method: 'get',
            preserveScroll: true,
          });
          return;
        }
      } catch (error) {
        console.error('Failed to find a vehicle:', error);
      }
    }

    const url = queryString ? `/vehicleList?${queryString}` : '/vehicleList';
    router.visit(url, { method: 'get', preserveScroll: true });
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-3">
      {/* Search Form */}
      <div className="figtree bg-white p-4 sm:p-5 lg:p-6 rounded-[20px] border border-black/5 shadow-[0_12px_32px_rgba(9,85,172,0.10)] w-full text-[#286BB6] text-[13px] font-[400]">
        {/* Combined Inputs and Button */}
        <div className="flex flex-col sm:flex-row items-end gap-3.5 sm:gap-4">
          {/* Input Fields Container */}
          <div className="flex flex-col sm:flex-row flex-grow gap-3.5 sm:gap-4 w-full">
            {/* Pick-up Location */}
            <div className="w-full sm:flex-1">
              <label htmlFor="pickupLocation" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Pick-up Location
              </label>
              <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                <img src={locationBlue} className="w-[18px] h-[18px] flex-shrink-0" alt="location" />
                <input
                  type="text"
                  id="pickupLocation"
                  placeholder="Search a location"
                  value={formData.pickupLocation}
                  onChange={handleInputChange}
                  className="appearance-none w-full py-[12px] sm:py-[13px] leading-tight focus:outline-none placeholder:text-[#286BB6]/70 bg-transparent text-[13px]"
                />
              </div>
            </div>

            {/* Pick-up Date */}
            <div className="w-full sm:flex-1">
              <label htmlFor="pickupDate" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Pick-up Date
              </label>
              <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                <input
                  type="date"
                  id="pickupDate"
                  placeholder="12/12/2023"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                  className="w-full py-[12px] sm:py-[13px] leading-tight focus:outline-none bg-transparent [&::-webkit-calendar-picker-indicator]:hidden text-[13px]"
                />
                <img
                  src={calendarBlue}
                  className="w-[18px] h-[18px] cursor-pointer flex-shrink-0"
                  alt="calendar"
                  onClick={() => document.getElementById('pickupDate').showPicker()}
                />
              </div>
            </div>

            {/* Drop-off Location */}
            <div className="w-full sm:flex-1">
              <label htmlFor="dropoffLocation" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Drop-off Location
              </label>
              <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                <img src={locationBlue} className="w-[18px] h-[18px] flex-shrink-0" alt="location" />
                <input
                  type="text"
                  id="dropoffLocation"
                  placeholder="Search a location"
                  value={formData.dropoffLocation}
                  onChange={handleInputChange}
                  className="w-full py-[12px] sm:py-[13px] leading-tight focus:outline-none placeholder:text-[#286BB6]/70 bg-transparent text-[13px]"
                />
              </div>
            </div>

            {/* Drop-off Date */}
            <div className="w-full sm:flex-1">
              <label htmlFor="dropoffDate" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Drop-off Date
              </label>
              <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                <input
                  type="date"
                  id="dropoffDate"
                  placeholder="12/12/2023"
                  value={formData.dropoffDate}
                  onChange={handleInputChange}
                  className="w-full py-[12px] sm:py-[13px] leading-tight focus:outline-none bg-transparent [&::-webkit-calendar-picker-indicator]:hidden text-[13px]"
                />
                <img
                  src={calendarBlue}
                  className="w-[18px] h-[18px] cursor-pointer flex-shrink-0"
                  alt="calendar"
                  onClick={() => document.getElementById('dropoffDate').showPicker()}
                />
              </div>
            </div>
          </div>

          {/* Driver preference */}
          <div className="w-full sm:w-auto shrink-0">
            <label className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">Driver Option</label>
            <div className="inline-flex w-full sm:w-auto rounded-[10px] border border-[#0000001A] bg-[#F1F5F9] p-1">
              {[
                { value: false, label: "Self Drive" },
                { value: true, label: "With Driver" },
              ].map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => onFormChange({ ...formData, withDriver: opt.value })}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-[8px] px-3 sm:px-4 h-[44px] text-[12px] font-[700] transition-colors cursor-pointer ${
                    Boolean(formData.withDriver) === opt.value
                      ? "bg-[#0955AC] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#0955AC]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Find a Vehicle Button */}
          <button
            type="button"
            onClick={handleSearch}
            className="bg-[#0955AC] text-white font-bold h-[52px] w-full sm:w-[52px] flex items-center justify-center rounded-[10px] focus:outline-none cursor-pointer mt-2 sm:mt-0 hover:bg-[#074494] transition-colors shadow-[0_8px_18px_rgba(9,85,172,0.25)] shrink-0"
            title="Search Vehicles"
            aria-label="Search Vehicles"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
