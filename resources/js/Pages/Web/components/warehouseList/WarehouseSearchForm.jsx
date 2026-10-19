import React, { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { CalendarDays, Check, ChevronDown, ListChecks, Loader2, LocateFixed, Ruler, Search, Thermometer, Wallet } from "lucide-react";
import locationBlue from "../../assets/vehicleList/locationBlue.png";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png";
import WarehouseDatePicker from "./WarehouseDatePicker";
import { PROVINCES } from "./warehouseLocations";
import { RATE_TYPES, SERVICES, TEMPERATURE_PRESETS, asArray } from "./warehouseFilters";

const DURATION_LABELS = {
  "6": "6 Months",
  "1": "Month",
  "12": "Year",
};

const GOOGLE_MAPS_API_KEY = "AIzaSyBWjVf-wK6rdmSON8eOXJCgxq2MI10QasE"; // fallback only; prefer env

const WarehouseSearchForm = ({ formData, onFormChange }) => {
  const dateMode = formData.dateMode || "flexible";
  const rateType = RATE_TYPES.some((r) => r.value === formData.rateType) ? formData.rateType : "per_sqft";
  const activeRateType = RATE_TYPES.find((r) => r.value === rateType) || RATE_TYPES[0];
  const requiredSpaceUnit = rateType === "per_cbm" ? "cbm" : "sqft";
  const isFlatRate = rateType === "flat_rate";
  const selectedServices = asArray(formData.services);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef(null);
  const [customTemperature, setCustomTemperature] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const popoverRef = useRef(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef(null);

  useEffect(() => {
    if (!locationOpen) return;
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setLocationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [locationOpen]);

  // All districts grouped by province, filtered by whatever is typed.
  const locationQuery = (formData.warehouseLocation || "").trim().toLowerCase();
  const filteredProvinces = PROVINCES.map((province) => ({
    ...province,
    districts: province.districts.filter(
      (d) => !locationQuery || d.label.toLowerCase().includes(locationQuery) || province.label.toLowerCase().includes(locationQuery)
    ),
  })).filter((province) => province.districts.length > 0);

  const selectLocation = (label) => {
    onFormChange({ ...formData, warehouseLocation: label, nearLat: "", nearLng: "" });
    setLocationOpen(false);
  };

  useEffect(() => {
    if (!servicesOpen) return;
    const handleClickOutside = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [servicesOpen]);

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

  const setRateType = (value) => {
    onFormChange({
      ...formData,
      rateType: value,
      requiredSpaceUnit: value === "per_cbm" ? "cbm" : "sqft",
      // a flat rate is priced per booking, so any entered space no longer applies
      ...(value === "flat_rate" ? { requiredSpace: "" } : {}),
    });
  };

  const toggleService = (serviceId) => {
    const next = selectedServices.includes(serviceId)
      ? selectedServices.filter((id) => id !== serviceId)
      : [...selectedServices, serviceId];
    onFormChange({ ...formData, services: next });
  };

  const temperatureValue = formData.temperature === undefined || formData.temperature === null ? "" : String(formData.temperature);
  const matchesPreset = TEMPERATURE_PRESETS.some((p) => p.value === temperatureValue);
  const temperatureMode = customTemperature || !matchesPreset ? "custom" : temperatureValue;

  const handleTemperatureSelect = (value) => {
    if (value === "custom") {
      setCustomTemperature(true);
      return;
    }
    setCustomTemperature(false);
    onFormChange({ ...formData, temperature: value });
  };

  const servicesSummary = () => {
    if (selectedServices.length === 0) return "Any service";
    if (selectedServices.length === 1) {
      return SERVICES.find((s) => s.id === selectedServices[0])?.label || "1 selected";
    }
    return `${selectedServices.length} services selected`;
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
    searchParams.rateType = rateType;
    if (formData.requiredSpace && !isFlatRate) {
      searchParams.requiredSpace = formData.requiredSpace;
      searchParams.requiredSpaceUnit = requiredSpaceUnit;
    }
    if (temperatureValue !== "" && Number.isFinite(Number(temperatureValue))) {
      searchParams.temperature = temperatureValue;
    }
    if (selectedServices.length > 0) {
      searchParams.services = selectedServices;
    }
    if (formData.budgetMin !== undefined && formData.budgetMin !== "" && Number(formData.budgetMin) >= 0) {
      searchParams.budgetMin = formData.budgetMin;
    }
    if (formData.budgetMax !== undefined && formData.budgetMax !== "" && Number(formData.budgetMax) > 0) {
      searchParams.budgetMax = formData.budgetMax;
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
              <div className="w-full sm:flex-1 relative" ref={locationRef}>
                <label htmlFor="warehouseLocation" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                  Warehouse Location
                </label>
                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white relative">
                  <img src={locationBlue} className="w-[18px] h-[18px] flex-shrink-0" alt="location" />
                  <input
                    type="text"
                    id="warehouseLocation"
                    placeholder="Search or select a location"
                    value={formData.warehouseLocation}
                    onChange={(e) => {
                      handleInputChange(e);
                      setLocationOpen(true);
                    }}
                    onFocus={() => setLocationOpen(true)}
                    autoComplete="off"
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
                {locationOpen && (
                  <div className="absolute z-50 mt-1 w-full sm:w-[280px] max-h-[280px] overflow-y-auto bg-white border border-[#0000001A] rounded-[10px] shadow-[0_12px_32px_rgba(11,27,52,0.15)] py-1">
                    {filteredProvinces.length === 0 ? (
                      <p className="px-3 py-2 text-[12px] text-[#64748B]">No matching locations</p>
                    ) : (
                      filteredProvinces.map((province) => (
                        <div key={province.id}>
                          <p className="px-3 pt-2 pb-1 text-[10px] font-[700] uppercase tracking-wide text-[#94A3B8]">
                            {province.label} Province
                          </p>
                          {province.districts.map((district) => (
                            <button
                              type="button"
                              key={district.id}
                              onClick={() => selectLocation(district.label)}
                              className={`block w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#0955AC0D] hover:text-[#0955AC] cursor-pointer ${
                                formData.warehouseLocation === district.label ? "text-[#0955AC] font-[700]" : "text-[#0F0F0F]"
                              }`}
                            >
                              {district.label}
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {locateError && <p className="text-[10px] text-red-500 mt-1">{locateError}</p>}
              </div>

              {/* Rate Type (price by sq ft, CBM or a flat rate) */}
              <div className="w-full sm:flex-[0.8]">
                <label htmlFor="rateType" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                  Rate Type
                </label>
                <div className="relative flex items-center border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                  <Wallet className="w-[18px] h-[18px] text-[#0955AC] flex-shrink-0" />
                  <select
                    id="rateType"
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value)}
                    className="appearance-none w-full py-[12px] sm:py-[13px] pl-2 pr-6 leading-tight border-0 focus:outline-none focus:ring-0 bg-transparent text-[13px] text-[#0F0F0F] cursor-pointer"
                  >
                    {RATE_TYPES.map((rate) => (
                      <option key={rate.value} value={rate.value}>
                        {rate.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Required Space */}
              <div className="w-full sm:flex-1">
                <label htmlFor="requiredSpace" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                  Required Space{activeRateType.unit ? ` (${activeRateType.unit})` : ""}
                </label>
                <div className={`flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors relative ${isFlatRate ? "bg-[#F4F7FB]" : "bg-white"}`}>
                  <Ruler className="w-[18px] h-[18px] text-[#0955AC] flex-shrink-0" />
                  <input
                    type="number"
                    id="requiredSpace"
                    min="0"
                    disabled={isFlatRate}
                    placeholder={activeRateType.placeholder}
                    value={isFlatRate ? "" : formData.requiredSpace}
                    onChange={handleInputChange}
                    className="appearance-none w-full py-[12px] sm:py-[13px] leading-tight border-0 focus:outline-none focus:ring-0 placeholder:text-[#286BB6]/70 bg-transparent text-[13px] disabled:cursor-not-allowed"
                  />
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

          {/* More filters: storage temperature, required services and budget range */}
          <div className="mt-4 pt-4 border-t border-[#0000000F] grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Storage Temperature */}
            <div>
              <label htmlFor="storageTemperature" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Storage Temperature
              </label>
              <div className="relative flex items-center border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors bg-white">
                <Thermometer className="w-[18px] h-[18px] text-[#0955AC] flex-shrink-0" />
                <select
                  id="storageTemperature"
                  value={temperatureMode}
                  onChange={(e) => handleTemperatureSelect(e.target.value)}
                  className="appearance-none w-full py-[12px] sm:py-[13px] pl-2 pr-6 leading-tight border-0 focus:outline-none focus:ring-0 bg-transparent text-[13px] text-[#0F0F0F] cursor-pointer"
                >
                  {TEMPERATURE_PRESETS.map((preset) => (
                    <option key={preset.value || "any"} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                  <option value="custom">Custom temperature...</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
              </div>
              {temperatureMode === "custom" && (
                <div className="mt-2 flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] bg-white">
                  <input
                    type="number"
                    step="0.5"
                    min="-60"
                    max="60"
                    value={temperatureValue}
                    onChange={(e) => onFormChange({ ...formData, temperature: e.target.value })}
                    placeholder="Required temperature"
                    className="appearance-none w-full py-[10px] leading-tight border-0 focus:outline-none focus:ring-0 placeholder:text-[#286BB6]/70 bg-transparent text-[13px]"
                  />
                  <span className="text-[12px] text-[#64748B] shrink-0">&deg;C</span>
                </div>
              )}
            </div>

            {/* Required Services (multi-select dropdown) */}
            <div className="relative" ref={servicesRef}>
              <label className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">Required Services</label>
              <button
                type="button"
                onClick={() => setServicesOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-2 border-[1px] rounded-[10px] px-3 py-[12px] sm:py-[13px] leading-tight text-left transition-colors bg-white cursor-pointer ${
                  servicesOpen ? "border-[#0955AC]" : "border-[#0000001A]"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <ListChecks className="w-[18px] h-[18px] text-[#0955AC] flex-shrink-0" />
                  <span className="truncate text-[13px] text-[#0F0F0F]">{servicesSummary()}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
              </button>
              {servicesOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-[#0000001A] rounded-[10px] shadow-[0_12px_32px_rgba(11,27,52,0.15)] py-1">
                  {SERVICES.map((service) => {
                    const checked = selectedServices.includes(service.id);
                    return (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-[#0F0F0F] hover:bg-[#0955AC0D] cursor-pointer"
                      >
                        <span className={checked ? "text-[#0955AC] font-[700]" : ""}>{service.label}</span>
                        {checked && <Check className="w-4 h-4 text-[#0955AC]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Budget Range */}
            <div>
              <label htmlFor="budgetMin" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                Budget Range <span className="font-[400] text-[#64748B]">(LKR / month)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="budgetMin"
                  min="0"
                  placeholder="Min"
                  value={formData.budgetMin ?? ""}
                  onChange={handleInputChange}
                  className="w-full border-[1px] border-[#0000001A] rounded-[10px] px-3 py-[12px] sm:py-[13px] leading-tight focus:outline-none focus:border-[#0955AC] placeholder:text-[#286BB6]/70 bg-white text-[13px] text-[#0F0F0F]"
                />
                <span className="text-[#64748B]">-</span>
                <input
                  type="number"
                  id="budgetMax"
                  min="0"
                  placeholder="Max"
                  value={formData.budgetMax ?? ""}
                  onChange={handleInputChange}
                  className="w-full border-[1px] border-[#0000001A] rounded-[10px] px-3 py-[12px] sm:py-[13px] leading-tight focus:outline-none focus:border-[#0955AC] placeholder:text-[#286BB6]/70 bg-white text-[13px] text-[#0F0F0F]"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WarehouseSearchForm;
