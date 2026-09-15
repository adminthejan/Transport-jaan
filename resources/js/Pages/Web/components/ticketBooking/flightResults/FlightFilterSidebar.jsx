import React, { useMemo } from "react";
import { SlidersHorizontal, Check, Plane, Clock, Wallet, Timer, MapPinned, Leaf } from "lucide-react";
import { formatDuration } from "./generateDummyFlights";

const STOP_TIERS = [
  { id: 0, label: "Direct" },
  { id: 1, label: "1 Stop" },
  { id: 2, label: "2+ Stops" },
];

const TIME_TIERS = [
  { id: "morning", label: "Morning", hint: "5AM–12PM", from: 5 * 60, to: 12 * 60 },
  { id: "afternoon", label: "Afternoon", hint: "12PM–6PM", from: 12 * 60, to: 18 * 60 },
  { id: "evening", label: "Evening", hint: "6PM–12AM", from: 18 * 60, to: 24 * 60 },
];

const toMinutes = (timeStr) => {
  const [, h, m, period] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/) || [];
  if (h === undefined) return 0;
  let hour = parseInt(h, 10) % 12;
  if (period === "PM") hour += 12;
  return hour * 60 + parseInt(m, 10);
};

const FilterSection = ({ icon: Icon, title, children, action }) => (
  <div className="filter-section mb-6 pb-6 border-b border-black/[0.06] last:border-b-0 last:mb-0 last:pb-0">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#0955AC]" />
        <h3 className="bebas-neue text-[16px] text-[#0F0F0F] tracking-wide">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const FilterOption = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-between w-full px-3 py-2 rounded-[8px] text-[12.5px] font-[600] mb-1.5 border transition-colors cursor-pointer ${
      active ? "bg-[#0955AC] border-[#0955AC] text-white" : "bg-white border-black/10 text-[#4B5563] hover:border-[#0955AC]"
    }`}
  >
    <span>{label}{count !== undefined ? <span className={active ? "text-white/70" : "text-[#94A3B8]"}> ({count})</span> : null}</span>
    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

/**
 * Filters for the dummy flight results list. Mirrors the visual language of
 * components/vehicleList/FilterSidebar.jsx (FilterSection/FilterOption,
 * same rounded-card + border-b sections), adapted for flights.
 */
const FlightFilterSidebar = ({ flights, filters, onChange }) => {
  const airlines = useMemo(() => [...new Set(flights.map((f) => f.airline))], [flights]);
  const layoverCities = useMemo(
    () => [...new Set(flights.filter((f) => f.stops > 0).map((f) => f.layoverCity))],
    [flights]
  );
  const maxPrice = useMemo(() => Math.max(...flights.map((f) => f.price), 100), [flights]);
  const maxDuration = useMemo(() => Math.max(...flights.map((f) => f.durationMinutes), 60), [flights]);

  const toggle = (key, value) => {
    const list = filters[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ ...filters, [key]: next });
  };

  const countFor = {
    stops: (id) => flights.filter((f) => (id === 2 ? f.stops >= 2 : f.stops === id)).length,
    airline: (name) => flights.filter((f) => f.airline === name).length,
    layover: (city) => flights.filter((f) => f.layoverCity === city).length,
    time: (tier) => flights.filter((f) => {
      const mins = toMinutes(f.departTime);
      return mins >= tier.from && mins < tier.to;
    }).length,
  };

  return (
    <div className="poppins text-[#0F0F0F80] text-[12px] font-[400] bg-white rounded-[20px] shadow-[0_8px_24px_rgba(11,27,52,0.08)] border border-black/5 p-5">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0955AC]" />
          <h2 className="bebas-neue text-[20px] text-[#0F0F0F] tracking-wide">FILTERS</h2>
        </div>
        <button
          type="button"
          onClick={() => onChange({ stops: [], airlines: [], time: [], layovers: [], maxPrice, maxDuration, lowEmissionsOnly: false })}
          className="text-[11px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
        >
          Clear All
        </button>
      </div>

      <FilterSection icon={Plane} title="STOPS">
        {STOP_TIERS.map((tier) => (
          <FilterOption
            key={tier.id}
            label={tier.label}
            count={countFor.stops(tier.id)}
            active={filters.stops.includes(tier.id)}
            onClick={() => toggle("stops", tier.id)}
          />
        ))}
      </FilterSection>

      <FilterSection icon={Clock} title="DEPARTURE TIME">
        {TIME_TIERS.map((tier) => (
          <FilterOption
            key={tier.id}
            label={`${tier.label} (${tier.hint})`}
            count={countFor.time(tier)}
            active={filters.time.includes(tier.id)}
            onClick={() => toggle("time", tier.id)}
          />
        ))}
      </FilterSection>

      <FilterSection icon={Timer} title="JOURNEY DURATION">
        <div className="px-1 pt-1">
          <input
            type="range"
            min={30}
            max={maxDuration}
            step={15}
            value={filters.maxDuration ?? maxDuration}
            onChange={(e) => onChange({ ...filters, maxDuration: Number(e.target.value) })}
            className="w-full accent-[#0955AC] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[12px] font-[700] text-[#334155] mt-1">
            <span>30m</span>
            <span>Up to {formatDuration(filters.maxDuration ?? maxDuration)}</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection icon={Wallet} title="MAX PRICE">
        <div className="px-1 pt-1">
          <input
            type="range"
            min={50}
            max={maxPrice}
            step={5}
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full accent-[#0955AC] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[12px] font-[700] text-[#334155] mt-1">
            <span>$50</span>
            <span>Up to ${filters.maxPrice}</span>
          </div>
        </div>
      </FilterSection>

      {layoverCities.length > 0 && (
        <FilterSection icon={MapPinned} title="LAYOVER AIRPORTS">
          {layoverCities.map((city) => (
            <FilterOption
              key={city}
              label={city}
              count={countFor.layover(city)}
              active={filters.layovers.includes(city)}
              onClick={() => toggle("layovers", city)}
            />
          ))}
        </FilterSection>
      )}

      <FilterSection
        icon={Plane}
        title="AIRLINES"
        action={
          <div className="flex items-center gap-2 text-[10.5px] font-[700]">
            <button type="button" onClick={() => onChange({ ...filters, airlines: [...airlines] })} className="text-[#0955AC] hover:underline cursor-pointer">
              Select all
            </button>
            <span className="text-black/15">|</span>
            <button type="button" onClick={() => onChange({ ...filters, airlines: [] })} className="text-[#0955AC] hover:underline cursor-pointer">
              Clear
            </button>
          </div>
        }
      >
        {airlines.map((name) => (
          <FilterOption
            key={name}
            label={name}
            count={countFor.airline(name)}
            active={filters.airlines.includes(name)}
            onClick={() => toggle("airlines", name)}
          />
        ))}
      </FilterSection>

      <FilterSection icon={Leaf} title="FLIGHT EMISSIONS">
        <label className="flex items-center justify-between w-full px-3 py-2 rounded-[8px] text-[12.5px] font-[600] border border-black/10 cursor-pointer hover:border-[#0955AC] transition-colors">
          <span className="text-[#4B5563]">Only show lower CO2e flights</span>
          <input
            type="checkbox"
            checked={!!filters.lowEmissionsOnly}
            onChange={(e) => onChange({ ...filters, lowEmissionsOnly: e.target.checked })}
            className="accent-[#0955AC] w-4 h-4 cursor-pointer"
          />
        </label>
      </FilterSection>
    </div>
  );
};

export default FlightFilterSidebar;
