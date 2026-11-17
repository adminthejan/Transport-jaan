import React from "react";
import LocationSuggestInput from "../rentAVehicle/LocationSuggestInput";
import { router } from "@inertiajs/react";
import { Search, MapPin, Calendar, User, Sparkles, Navigation } from "lucide-react";

const SearchForm = ({ formData, onFormChange, onSearch, redirectToFirstVehicle = false }) => {
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    onFormChange({
      ...formData,
      [id]: value,
    });
  };

  const handleSearch = async () => {
    if (onSearch) {
      onSearch(formData);
      return;
    }

    const params = new URLSearchParams();
    if (formData.pickupLocation) params.set("pickupLocation", formData.pickupLocation);
    if (formData.pickupDate) params.set("pickupDate", formData.pickupDate);
    if (formData.dropoffLocation) params.set("dropoffLocation", formData.dropoffLocation);
    if (formData.dropoffDate) params.set("dropoffDate", formData.dropoffDate);
    if (formData.withDriver) params.set("withDriver", "true");

    const queryString = params.toString();

    if (redirectToFirstVehicle) {
      try {
        const response = await fetch(queryString ? `/vehicleList/json?${queryString}` : "/vehicleList/json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const vehicles = Array.isArray(data?.vehicles)
          ? data.vehicles
          : Array.isArray(data?.vehicles?.data)
          ? data.vehicles.data
          : [];
        const firstVehicle = vehicles[0];

        if (firstVehicle?.id) {
          router.visit(`/vehicleDetails/${firstVehicle.id}${queryString ? `?${queryString}` : ""}`, {
            method: "get",
            preserveScroll: true,
          });
          return;
        }
      } catch (error) {
        console.error("Failed to find a vehicle:", error);
      }
    }

    const url = queryString ? `/vehicleList?${queryString}` : "/vehicleList";
    router.visit(url, { method: "get", preserveScroll: true });
  };

  return (
    <div className="w-full">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-4 sm:p-5 lg:p-6 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Pick-up Location */}
          <div className="space-y-1.5">
            <label htmlFor="pickupLocation" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Pick-up Location</span>
            </label>
            <div className="flex items-center gap-2.5 h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
              <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
              <LocationSuggestInput
                id="pickupLocation"
                placeholder="City, airport, or hotel"
                value={formData.pickupLocation}
                onChange={handleInputChange}
                inputClassName="w-full text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 leading-tight"
              />
            </div>
          </div>

          {/* Pick-up Date */}
          <div className="space-y-1.5">
            <label htmlFor="pickupDate" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Pick-up Date</span>
            </label>
            <div className="flex items-center gap-2.5 h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all cursor-pointer"
                 onClick={() => document.getElementById("pickupDate")?.showPicker?.()}>
              <input
                type="date"
                id="pickupDate"
                value={formData.pickupDate}
                onChange={handleInputChange}
                className="w-full text-sm font-medium text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Drop-off Location */}
          <div className="space-y-1.5">
            <label htmlFor="dropoffLocation" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drop-off Location</span>
            </label>
            <div className="flex items-center gap-2.5 h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
              <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
              <LocationSuggestInput
                id="dropoffLocation"
                placeholder="Same as pickup or new location"
                value={formData.dropoffLocation}
                onChange={handleInputChange}
                inputClassName="w-full text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 leading-tight"
              />
            </div>
          </div>

          {/* Drop-off Date */}
          <div className="space-y-1.5">
            <label htmlFor="dropoffDate" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drop-off Date</span>
            </label>
            <div className="flex items-center gap-2.5 h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all cursor-pointer"
                 onClick={() => document.getElementById("dropoffDate")?.showPicker?.()}>
              <input
                type="date"
                id="dropoffDate"
                value={formData.dropoffDate}
                onChange={handleInputChange}
                className="w-full text-sm font-medium text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Driver Option & Submit CTA */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Driver Preference Segmented Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0 hidden md:inline">Drive Mode:</span>
            <div className="inline-flex w-full sm:w-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
              {[
                { value: false, label: "Self-Drive" },
                { value: true, label: "With Chauffeur" },
              ].map((opt) => {
                const active = Boolean(formData.withDriver) === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onFormChange({ ...formData, withDriver: opt.value })}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      active
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Button */}
          <button
            type="button"
            onClick={handleSearch}
            className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>Search Available Cars</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
