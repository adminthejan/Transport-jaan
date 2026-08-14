import React from "react";
import { router } from "@inertiajs/react";
import { Ruler } from "lucide-react";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png"
import locationBlue from "../../assets/vehicleList/locationBlue.png"

const DURATION_PRESETS = [
  { value: "6", label: "6 Months" },
  { value: "1", label: "Month" },
  { value: "12", label: "Year" },
];

const WarehouseSearchForm = ({ formData, onFormChange }) => {
  const dateMode = formData.dateMode || "flexible";
  const requiredSpaceUnit = formData.requiredSpaceUnit || "sqft";

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    onFormChange({
      ...formData,
      [id]: value
    });
  };

  const setDateMode = (mode) => {
    onFormChange({
      ...formData,
      dateMode: mode,
      // switching modes clears whichever fields the other mode was using,
      // so a stale value can't silently get submitted with the search
      ...(mode === "flexible" ? { moveinDate: "" } : { leaseDuration: "" }),
    });
  };

  const setRequiredSpaceUnit = (unit) => {
    onFormChange({ ...formData, requiredSpaceUnit: unit });
  };

  const handleSearch = (e) => {
    e.preventDefault();

    // Build search parameters object
    const searchParams = {};

    if (formData.warehouseLocation) {
      searchParams.warehouseLocation = formData.warehouseLocation;
    }
    if (formData.requiredSpace) {
      searchParams.requiredSpace = formData.requiredSpace;
      searchParams.requiredSpaceUnit = requiredSpaceUnit;
    }
    searchParams.dateMode = dateMode;
    if (dateMode === "choose" && formData.moveinDate) {
      searchParams.moveinDate = formData.moveinDate;
    }
    if (formData.leaseDuration) {
      searchParams.leaseDuration = formData.leaseDuration;
    }

    // Navigate to warehouse list with search parameters
    router.get('/warehouseList', searchParams, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 2xl:px-16 py-4 sm:py-6 md:py-10">
      {/* Search Form */}
      <form onSubmit={handleSearch}>
        <div className="figtree bg-white p-4 sm:p-6 rounded-[15px] shadow-2xl shadow-[#00000040] w-full text-[#286BB6] text-[13px] font-[400]">
          {/* Combined Inputs and Button */}
          <div className="flex flex-col sm:flex-row items-end gap-4">
          {/* Input Fields Container */}
          <div className="flex flex-col sm:flex-row flex-grow gap-4 w-full">
            {/* Warehouse Location */}
            <div className="w-full sm:flex-1">
              <label htmlFor="warehouseLocation" className="block mb-1">
                Warehouse Location
              </label>
              <div className="relative flex items-center">
                {/* Location Icon Placeholder */}
                <img src={locationBlue} className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none" alt="location" />
                <input
                  type="text"
                  id="warehouseLocation"
                  placeholder="Search a location"
                  value={formData.warehouseLocation}
                  onChange={handleInputChange}
                  className="shadow-sm appearance-none w-full border-[1px] border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pl-12 placeholder:text-[#286BB6]"
                />
              </div>
            </div>

            {/* Required Space */}
            <div className="w-full sm:flex-1">
              <label htmlFor="requiredSpace" className="block mb-1">
                Required Space
              </label>
              <div className="relative flex items-center">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                <input
                  type="number"
                  id="requiredSpace"
                  placeholder={requiredSpaceUnit === "cbm" ? "e.g., 500" : "e.g., 10000"}
                  value={formData.requiredSpace}
                  onChange={handleInputChange}
                  className="shadow-sm appearance-none w-full border-[1px] border-[#0000001A] rounded-[8px] py-[16px] pl-12 pr-[92px] leading-tight focus:outline-none focus:shadow-outline placeholder:text-[#286BB6]"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex rounded-[6px] bg-[#F1F5F9] p-1 text-[11px]">
                  {[
                    { value: "sqft", label: "Sq Ft" },
                    { value: "cbm", label: "CBM" },
                  ].map((u) => (
                    <button
                      type="button"
                      key={u.value}
                      onClick={() => setRequiredSpaceUnit(u.value)}
                      className={`px-2.5 py-1.5 rounded-[4px] font-[700] transition-colors ${
                        requiredSpaceUnit === u.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#64748B] hover:text-[#0955AC]"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* When: Flexible or Choose Dates */}
            <div className="w-full sm:flex-[1.6]">
              <div className="flex items-center justify-between mb-1">
                <label>When</label>
                <div className="inline-flex rounded-full bg-[#F1F5F9] p-0.5 text-[10px]">
                  {[
                    { value: "flexible", label: "I'm Flexible" },
                    { value: "choose", label: "Choose Dates" },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => setDateMode(m.value)}
                      className={`px-2.5 py-1 rounded-full font-[700] transition-colors ${
                        dateMode === m.value ? "bg-[#0955AC] text-white" : "text-[#286BB6]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {dateMode === "flexible" ? (
                <div className="flex gap-2 border-[1px] border-[#0000001A] rounded-[8px] p-[10px]">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => onFormChange({ ...formData, leaseDuration: preset.value })}
                      className={`flex-1 py-2 rounded-[6px] text-[12px] font-[700] transition-colors ${
                        formData.leaseDuration === preset.value
                          ? "bg-[#0955AC] text-white"
                          : "bg-[#F4F3F3] text-[#286BB6] hover:bg-[#E8EBEF]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex items-center flex-1">
                    <input
                      type="date"
                      id="moveinDate"
                      placeholder="12/12/2023"
                      value={formData.moveinDate}
                      onChange={handleInputChange}
                      className="shadow-sm w-full border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pr-12 [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                    <img
                      src={calendarBlue}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] cursor-pointer"
                      alt="calendar"
                      onClick={() => document.getElementById('moveinDate').showPicker()}
                    />
                  </div>
                  <select
                    id="leaseDuration"
                    value={formData.leaseDuration}
                    onChange={handleInputChange}
                    className="shadow-sm flex-1 border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline text-[#286BB6]"
                  >
                    <option value="">Select duration</option>
                    <option value="1-3">1-3 months</option>
                    <option value="3-6">3-6 months</option>
                    <option value="6-12">6-12 months</option>
                    <option value="12+">12+ months</option>
                    <option value="long-term">Long-term (2+ years)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Find a Warehouse Button */}
          <button
            type="submit"
            className="bg-[#0955AC] text-white font-bold h-[56px] w-full sm:w-[56px] flex items-center justify-center rounded-[8px] focus:outline-none focus:shadow-outline cursor-pointer mt-4 sm:mt-0 hover:bg-[#074494] transition-colors"
          >
            →
          </button>
        </div>
      </div>
      </form>
    </div>
  );
};

export default WarehouseSearchForm;
