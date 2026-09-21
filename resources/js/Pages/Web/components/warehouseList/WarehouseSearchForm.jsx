import React, { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { CalendarDays, Loader2, LocateFixed, Ruler, Search } from "lucide-react";
import locationBlue from "../../assets/vehicleList/locationBlue.png";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png";
import WarehouseDatePicker from "./WarehouseDatePicker";

const DURATION_LABELS = {
  "6": "6 Months",
  "1": "Month",
  "12": "Year",
};

const GOOGLE_MAPS_API_KEY = "AIzaSyBWjVf-wK6rdmSON8eOXJCgxq2MI10QasE"; // fallback only; prefer env

const WarehouseSearchForm = ({ formData, onFormChange }) => {
  const dateMode = formData.dateMode || "flexible";
  const requiredSpaceUnit = formData.requiredSpaceUnit || "sqft";
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!datePopoverOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setDatePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [datePopoverOpen]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === "warehouseLocation") {
      // Manual edits invalidate any previously detected "nearby" coordinates
      // so the two location modes never silently conflict.
      onFormChange({ ...formData, warehouseLocation: value, nearLat: "", nearLng: "" });
      return;
    }
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

  const dateSummary = () => {
    if (dateMode === "choose") {
      return formData.moveinDate
        ? new Date(formData.moveinDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "Choose dates";
    }
    return formData.leaseDuration ? DURATION_LABELS[formData.leaseDuration] || "Flexible" : "I'm flexible";
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation isn't supported by your browser.");
      return;
    }
    setLocating(true);
    setLocateError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        // Best-effort reverse geocode so the field shows a readable place
        // name instead of raw coordinates; falls back to coordinates if the
        // Geocoding API is unavailable or the key is missing.
        try {
          const apiKey = (import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY || "").trim();
          if (apiKey) {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await res.json();
            if (data?.results?.[0]?.formatted_address) {
              label = data.results[0].formatted_address;
            }
          }
        } catch (err) {
          // silent — coordinate fallback already set above
        }

        onFormChange({
          ...formData,
          warehouseLocation: label,
          nearLat: latitude,
          nearLng: longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : "Couldn't detect your location."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();

    // Build search parameters object
    const searchParams = {};

    if (formData.warehouseLocation) {
      searchParams.warehouseLocation = formData.warehouseLocation;
    }
    if (formData.nearLat && formData.nearLng) {
      searchParams.nearLat = formData.nearLat;
      searchParams.nearLng = formData.nearLng;
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
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-3">
      {/* Search Form */}
      <form onSubmit={handleSearch}>
        <div className="figtree bg-white p-4 sm:p-5 lg:p-6 rounded-[20px] border border-black/5 shadow-[0_12px_32px_rgba(9,85,172,0.10)] w-full text-[#286BB6] text-[13px] font-[400]">
          {/* Combined Inputs and Button */}
          <div className="flex flex-col sm:flex-row items-end gap-3.5 sm:gap-4">
            {/* Input Fields Container */}
            <div className="flex flex-col sm:flex-row flex-grow gap-3.5 sm:gap-4 w-full">
              {/* Warehouse Location */}
              <div className="w-full sm:flex-1">
                <label htmlFor="warehouseLocation" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                  Warehouse Location
                </label>
                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white relative">
                  <img src={locationBlue} className="w-[18px] h-[18px] flex-shrink-0" alt="location" />
                  <input
                    type="text"
                    id="warehouseLocation"
                    placeholder="Search a location"
                    value={formData.warehouseLocation}
                    onChange={handleInputChange}
                    className="appearance-none w-full py-[12px] sm:py-[13px] leading-tight border-0 focus:outline-none focus:ring-0 placeholder:text-[#286BB6]/70 bg-transparent text-[13px] pr-[78px]"
                  />
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    title="Use my current location"
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-[#0955AC] text-white px-2.5 py-1 text-[10.5px] font-[700] shadow-sm hover:bg-[#073E82] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {locating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <LocateFixed className="w-3 h-3" />
                    )}
                    Nearby
                  </button>
                </div>
                {locateError && <p className="text-[10px] text-red-500 mt-1">{locateError}</p>}
              </div>

              {/* Required Space */}
              <div className="w-full sm:flex-1">
                <label htmlFor="requiredSpace" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                  Required Space
                </label>
                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white relative">
                  <Ruler className="w-[18px] h-[18px] text-[#0955AC] flex-shrink-0" />
                  <input
                    type="number"
                    id="requiredSpace"
                    placeholder={requiredSpaceUnit === "cbm" ? "e.g., 500" : "e.g., 10000"}
                    value={formData.requiredSpace}
                    onChange={handleInputChange}
                    className="appearance-none w-full py-[12px] sm:py-[13px] leading-tight border-0 focus:outline-none focus:ring-0 placeholder:text-[#286BB6]/70 bg-transparent text-[13px] pr-[85px]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex rounded-[8px] bg-[#F1F5F9] p-0.5 text-[11px]">
                    {[
                      { value: "sqft", label: "Sq Ft" },
                      { value: "cbm", label: "CBM" },
                    ].map((u) => (
                      <button
                        type="button"
                        key={u.value}
                        onClick={() => setRequiredSpaceUnit(u.value)}
                        className={`px-2 py-1 rounded-[6px] font-[700] transition-colors cursor-pointer ${
                          requiredSpaceUnit === u.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#64748B] hover:text-[#0955AC]"
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Storage Dates: opens popover */}
              <div className="w-full sm:flex-[1.2] relative" ref={popoverRef}>
                <label className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">Storage Dates</label>
                <button
                  type="button"
                  onClick={() => setDatePopoverOpen((v) => !v)}
                  className={`w-full flex items-center justify-between border-[1px] rounded-[10px] px-3 py-[12px] sm:py-[13px] leading-tight text-left transition-colors bg-white cursor-pointer ${
                    datePopoverOpen ? "border-[#0955AC]" : "border-[#0000001A]"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <img src={calendarBlue} className="w-[18px] h-[18px] flex-shrink-0" alt="calendar" />
                    <span className="truncate text-[13px] text-[#0F0F0F]">{dateSummary()}</span>
                  </span>
                  <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                </button>

                {datePopoverOpen && (
                  <WarehouseDatePicker
                    dateMode={dateMode}
                    setDateMode={setDateMode}
                    moveinDate={formData.moveinDate}
                    onSelectDate={(iso) => onFormChange({ ...formData, moveinDate: iso })}
                    leaseDuration={formData.leaseDuration}
                    onSelectDuration={(val) => onFormChange({ ...formData, leaseDuration: val })}
                    onClose={() => setDatePopoverOpen(false)}
                  />
                )}
              </div>
            </div>

            {/* Find a Warehouse Button */}
            <button
              type="submit"
              className="bg-[#0955AC] text-white font-bold h-[52px] w-full sm:w-[52px] flex items-center justify-center rounded-[10px] focus:outline-none cursor-pointer mt-2 sm:mt-0 hover:bg-[#074494] transition-colors shadow-[0_8px_18px_rgba(9,85,172,0.25)] shrink-0"
              title="Search Warehouses"
              aria-label="Search Warehouses"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WarehouseSearchForm;
