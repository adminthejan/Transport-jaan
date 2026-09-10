import React, { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { CalendarDays, Loader2, LocateFixed, Ruler } from "lucide-react";
import locationBlue from "../../assets/vehicleList/locationBlue.png"
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
              <label htmlFor="warehouseLocation" className="block mb-1">Warehouse Location</label>
              <div className="relative flex items-center">
                {/* Location Icon Placeholder */}
                <img src={locationBlue} className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none" alt="location" />
                <input
                  type="text"
                  id="warehouseLocation"
                  placeholder="Search a location"
                  value={formData.warehouseLocation}
                  onChange={handleInputChange}
                  className="shadow-sm appearance-none w-full border-[1px] border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline pl-12 pr-[100px] placeholder:text-[#286BB6]"
                />
                {/* Made into a clearly-visible pill button (was an easy-to-miss
                    10px text link) so people actually notice they can use
                    their current location instead of typing one. */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  title="Use my current location"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full bg-[#0955AC] text-white px-3 py-2 text-[11px] font-[700] shadow-sm hover:bg-[#073E82] transition-colors disabled:opacity-60"
                >
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  Nearby
                </button>
              </div>
              {locateError && <p className="text-[10px] text-red-500 mt-1">{locateError}</p>}
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

            {/* Storage Dates: opens a Warehowz-style popover */}
            <div className="w-full sm:flex-[1.6] relative" ref={popoverRef}>
              <label className="block mb-1">Storage Dates</label>
              <button
                type="button"
                onClick={() => setDatePopoverOpen((v) => !v)}
                className={`shadow-sm w-full flex items-center justify-between border-[1px] rounded-[8px] p-[16px] leading-tight text-left transition-colors ${
                  datePopoverOpen ? "border-[#0955AC]" : "border-[#0000001A]"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <CalendarDays className="w-[18px] h-[18px] text-[#0955AC] shrink-0" />
                  <span className="truncate">{dateSummary()}</span>
                </span>
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
