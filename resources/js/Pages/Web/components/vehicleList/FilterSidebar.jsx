import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { Briefcase, Car, Check, ChevronDown, Cog, Fuel, Gauge, LayoutGrid, ShieldCheck, SlidersHorizontal, Tag, Users, Wifi, X } from "lucide-react";

const INDUSTRY_CATEGORIES = [
  { id: "cars_suvs", label: "Cars & SUVs" },
  { id: "vans_minibuses", label: "Vans & Minibuses" },
  { id: "buses", label: "Buses" },
  { id: "trucks", label: "Trucks" },
  { id: "prime_movers_trailers", label: "Prime Movers & Trailers" },
  { id: "construction_equipment", label: "Construction & Equipment" },
];

const BODY_TYPES = [
  { id: "sedan", label: "Sedan" },
  { id: "hatchback", label: "Hatchback" },
  { id: "suv", label: "SUV" },
  { id: "crossover", label: "Crossover" },
  { id: "wagon", label: "Wagon" },
  { id: "mpv", label: "MPV / Minivan" },
  { id: "van", label: "Van" },
  { id: "pickup", label: "Pickup / Truck" },
  { id: "bus", label: "Bus / Coach" },
  { id: "motorcycle", label: "Motorcycle" },
  { id: "three_wheeler", label: "Three-Wheeler" },
  { id: "special_purpose", label: "Special Purpose Vehicle" },
  { id: "family", label: "Family MBP" },
  { id: "sportcoupe", label: "Sport Coupe" },
  { id: "compact", label: "Compact" },
  { id: "coupe", label: "Coupe" },
  { id: "other", label: "Other" },
];

const EXTRAS = [
  { id: "gps", label: "GPS", icon: Gauge },
  { id: "child_seat", label: "Child Seat", icon: Users },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "insurance_coverage", label: "Insurance Coverage", icon: ShieldCheck },
];

const BRANDS = [
  { id: "toyota", label: "Toyota" },
  { id: "ford", label: "Ford" },
  { id: "honda", label: "Honda" },
  { id: "bmw", label: "BMW" },
  { id: "mercedes", label: "Mercedes-Benz" },
  { id: "audi", label: "Audi" },
  { id: "other", label: "Other" },
];

const SEATS_FLOOR = 1;
const SEATS_CEILING = 12;

const PRICE_FLOOR = 0;
const PRICE_CEILING = 300;
const PRICE_STEP = 5;

const LUGGAGE_CAPACITIES = [
  { id: "1-2", label: "1 - 2 Bags" },
  { id: "3-4", label: "3 - 4 Bags" },
  { id: "5plus", label: "5+ Bags" },
];

const MILEAGES = [
  { id: "limited", label: "Limited" },
  { id: "unlimited", label: "Unlimited" },
];

const TRANSMISSIONS = [
  { id: "automatic", label: "Automatic" },
  { id: "manual", label: "Manual" },
  { id: "amt", label: "AMT" },
  { id: "cvt", label: "CVT" },
  { id: "dct", label: "DCT" },
];

const FUELS = [
  { id: "petrol", label: "Petrol" },
  { id: "diesel", label: "Diesel" },
  { id: "hybrid", label: "Hybrid" },
  { id: "electric", label: "Electric" },
  { id: "cng", label: "CNG" },
  { id: "lpg", label: "LPG" },
  { id: "other", label: "Other" },
];

const FilterOption = ({ label, active, onClick }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={active}
    onClick={onClick}
    className={`flex items-center justify-between w-full px-3 py-2 rounded-[8px] text-[12px] font-[500] mb-1.5 border transition-colors cursor-pointer ${
      active
        ? "bg-[#0955AC] border-[#0955AC] text-white"
        : "bg-white border-[#0000001A] text-[#4B5563] hover:border-[#0955AC] hover:text-[#0955AC]"
    }`}
  >
    <span>{label}</span>
    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

const FilterSection = ({ icon, title, count = 0, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  useEffect(() => {
    if (count > 0) setIsOpen(true);
  }, [count]);

  return (
    <div className="filter-section mb-4 pb-4 border-b border-[#00000014] last:border-b-0 last:mb-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-1 group cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="bebas-neue text-[17px] text-[#0F0F0F] tracking-wide group-hover:text-[#0955AC] transition-colors">
            {title}
          </h3>
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0955AC1A] text-[#0955AC] text-[10px] font-[700]">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 group-hover:text-[#0955AC] ${
            isOpen ? "rotate-180 text-[#0955AC]" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pt-2">{children}</div>}
    </div>
  );
};

const THUMB_STYLES =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0955AC] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0955AC] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer";

// Dual-handle price range slider. Drag updates the visual position and the
// "US$ X - US$ Y" readout instantly (local state), but only actually
// triggers a search (a full round trip) once you release the handle —
// otherwise every pixel of drag would fire a request.
const PriceRangeSlider = ({ min, max, step, valueMin, valueMax, onCommit }) => {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);

  useEffect(() => setLocalMin(valueMin), [valueMin]);
  useEffect(() => setLocalMax(valueMax), [valueMax]);

  const commit = () => onCommit(localMin, localMax);

  const minPct = ((localMin - min) / (max - min)) * 100;
  const maxPct = ((localMax - min) / (max - min)) * 100;
  // Keep whichever handle is closer to the max end on top, so the two
  // thumbs stay independently grabbable even when they're near each other.
  const minOnTop = localMin > min + (max - min) * 0.6;

  return (
    <div className="px-1 pt-1">
      <div className="relative h-1.5 rounded-full bg-[#E2E8F0] mt-3 mb-4">
        <div
          className="absolute h-1.5 rounded-full bg-[#0955AC]"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={(e) => setLocalMin(Math.min(Number(e.target.value), localMax - step))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          aria-label="Minimum price per day"
          style={{ zIndex: minOnTop ? 5 : 3 }}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-1.5 appearance-none bg-transparent pointer-events-none ${THUMB_STYLES}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={(e) => setLocalMax(Math.max(Number(e.target.value), localMin + step))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          aria-label="Maximum price per day"
          style={{ zIndex: minOnTop ? 3 : 5 }}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-1.5 appearance-none bg-transparent pointer-events-none ${THUMB_STYLES}`}
        />
      </div>
      <div className="flex items-center justify-between text-[12px] font-[700] text-[#334155]">
        <span>US$ {localMin}</span>
        <span>US$ {localMax}{localMax >= max ? "+" : ""}</span>
      </div>
    </div>
  );
};

// Single-handle linear slider — "at least N seats" reads more naturally as
// a magnitude you drag up, rather than a min/max range like price does.
const MinValueSlider = ({ min, max, value, suffix, onCommit }) => {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const pct = ((local - min) / (max - min)) * 100;

  return (
    <div className="px-1 pt-1">
      <div className="relative h-1.5 rounded-full bg-[#E2E8F0] mt-3 mb-4">
        <div className="absolute h-1.5 rounded-full bg-[#0955AC]" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
          onMouseUp={() => onCommit(local)}
          onTouchEnd={() => onCommit(local)}
          onKeyUp={() => onCommit(local)}
          aria-label={`Minimum ${suffix}`}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-1.5 appearance-none bg-transparent cursor-pointer ${THUMB_STYLES}`}
        />
      </div>
      <div className="text-[12px] font-[700] text-[#334155]">
        At least {local} {suffix}{local >= max ? "+" : ""}
      </div>
    </div>
  );
};

// Splits a comma-separated query param into a lowercase array — every
// multi-select filter section below uses this same shape.
const toList = (val) => (val ? String(val).toLowerCase().split(',').filter(Boolean) : []);

const FilterSidebar = ({ searchParams, onSearch }) => {
  const [selectedBodyType, setSelectedBodyType] = useState(() => toList(searchParams?.bodyType));
  const [selectedIndustryCategory, setSelectedIndustryCategory] = useState(() => toList(searchParams?.industryCategory));
  const [selectedBrand, setSelectedBrand] = useState(() => toList(searchParams?.brand));
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState(() => toList(searchParams?.extras));
  const [minSeats, setMinSeats] = useState(
    searchParams?.minSeats !== undefined && searchParams?.minSeats !== "" ? Number(searchParams.minSeats) : SEATS_FLOOR
  );
  const [selectedLuggage, setSelectedLuggage] = useState(() => toList(searchParams?.luggage));
  const [priceMin, setPriceMin] = useState(
    searchParams?.minPrice !== undefined && searchParams?.minPrice !== "" ? Number(searchParams.minPrice) : PRICE_FLOOR
  );
  const [priceMax, setPriceMax] = useState(
    searchParams?.maxPrice !== undefined && searchParams?.maxPrice !== "" ? Number(searchParams.maxPrice) : PRICE_CEILING
  );
  const [selectedMileage, setSelectedMileage] = useState(() => toList(searchParams?.mileage));
  const [selectedTransmission, setSelectedTransmission] = useState(() => toList(searchParams?.transmission));
  const [selectedFuel, setSelectedFuel] = useState(() => toList(searchParams?.fuel));
  const [showAllBodyTypes, setShowAllBodyTypes] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);

  useEffect(() => {
    setSelectedBodyType(toList(searchParams?.bodyType));
    setSelectedBrand(toList(searchParams?.brand));
    setSelectedIndustryCategory(toList(searchParams?.industryCategory));
    setSelectedExtras(toList(searchParams?.extras));
    setSelectedLuggage(toList(searchParams?.luggage));
    setSelectedMileage(toList(searchParams?.mileage));
    setSelectedTransmission(toList(searchParams?.transmission));
    setSelectedFuel(toList(searchParams?.fuel));
    setPriceMin(searchParams?.minPrice !== undefined && searchParams?.minPrice !== "" ? Number(searchParams.minPrice) : PRICE_FLOOR);
    setPriceMax(searchParams?.maxPrice !== undefined && searchParams?.maxPrice !== "" ? Number(searchParams.maxPrice) : PRICE_CEILING);
    setMinSeats(searchParams?.minSeats !== undefined && searchParams?.minSeats !== "" ? Number(searchParams.minSeats) : SEATS_FLOOR);
  }, [searchParams]);

  const runSearch = (nextParams) => {
    // Inside the multimodal Journey Planner this is rendered inline, and a
    // hard navigation here used to boot the user out to the standalone
    // /vehicleList page — losing the Land/Sea/Air tabs entirely.
    if (onSearch) {
      onSearch(nextParams);
      return;
    }
    router.get('/vehicleList', nextParams, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  // Every filter section below is a checkbox group, not radio buttons — more
  // than one option per section (and across sections) can be active at once.
  const toggleInList = (list, setList, paramKey) => (value) => {
    const newVal = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setList(newVal);
    runSearch({ ...searchParams, [paramKey]: newVal.join(',') });
  };

  const handleBodyTypeChange = toggleInList(selectedBodyType, setSelectedBodyType, 'bodyType');
  const handleBrandChange = toggleInList(selectedBrand, setSelectedBrand, 'brand');
  const handleIndustryCategoryChange = toggleInList(selectedIndustryCategory, setSelectedIndustryCategory, 'industryCategory');
  const handleExtraToggle = toggleInList(selectedExtras, setSelectedExtras, 'extras');
  const handleLuggageChange = toggleInList(selectedLuggage, setSelectedLuggage, 'luggage');

  const handleSeatsCommit = (val) => {
    setMinSeats(val);
    runSearch({ ...searchParams, minSeats: val > SEATS_FLOOR ? val : "" });
  };

  const handlePriceCommit = (min, max) => {
    setPriceMin(min);
    setPriceMax(max);
    runSearch({
      ...searchParams,
      minPrice: min > PRICE_FLOOR ? min : "",
      // At the ceiling it means "no upper bound" — omit it entirely instead
      // of sending 300, so anything priced above the slider's own max still
      // matches (see ClientVehicleController's minPrice/maxPrice handling).
      maxPrice: max < PRICE_CEILING ? max : "",
    });
  };

  const handleMileageChange = toggleInList(selectedMileage, setSelectedMileage, 'mileage');
  const handleTransmissionChange = toggleInList(selectedTransmission, setSelectedTransmission, 'transmission');
  const handleFuelChange = toggleInList(selectedFuel, setSelectedFuel, 'fuel');

  const toggleSidebar = () => setIsOpen(!isOpen);

  const activeCount =
    selectedBodyType.length +
    selectedIndustryCategory.length +
    selectedBrand.length +
    (minSeats > SEATS_FLOOR ? 1 : 0) +
    selectedLuggage.length +
    (priceMin > PRICE_FLOOR || priceMax < PRICE_CEILING ? 1 : 0) +
    selectedExtras.length +
    selectedMileage.length +
    selectedTransmission.length +
    selectedFuel.length;

  const clearAll = () => {
    setSelectedBodyType([]);
    setSelectedIndustryCategory([]);
    setSelectedBrand([]);
    setMinSeats(SEATS_FLOOR);
    setSelectedLuggage([]);
    setPriceMin(PRICE_FLOOR);
    setPriceMax(PRICE_CEILING);
    setSelectedExtras([]);
    setSelectedMileage([]);
    setSelectedTransmission([]);
    setSelectedFuel([]);
    runSearch({
      ...searchParams,
      bodyType: "",
      industryCategory: "",
      brand: "",
      minSeats: "",
      luggage: "",
      minPrice: "",
      maxPrice: "",
      extras: "",
      mileage: "",
      transmission: "",
      fuel: "",
    });
  };

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={toggleSidebar}
        className="xl:hidden fixed bottom-4 right-4 z-40 bg-[#0955AC] text-white pl-4 pr-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-[13px] font-[600]"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {isOpen ? "Close Filters" : "Show Filters"}
        {!isOpen && activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#0955AC] text-[10px] font-[700]">
            {activeCount}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`poppins text-[#0F0F0F80] text-[12px] font-[400] filter-sidebar bg-white rounded-[20px] shadow-[0_8px_24px_rgba(11,27,52,0.08)] border border-black/5 p-4 sm:p-5
          fixed xl:sticky xl:top-4
          top-0 left-0
          h-full xl:h-auto
          xl:max-h-[calc(100vh-2rem)]
          overflow-y-auto
          w-[283px] xl:w-[260px] xl:shrink-0
          transform transition-transform duration-300 ease-in-out
          z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}
      >
        {/* Close button for mobile */}
        <button
          onClick={toggleSidebar}
          className="xl:hidden absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#00000014]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0955AC]" />
            <h2 className="bebas-neue text-[20px] text-[#0F0F0F] tracking-wide">FILTERS</h2>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
            >
              Clear All ({activeCount})
            </button>
          )}
        </div>

        <FilterSection icon={<LayoutGrid className="w-4 h-4 text-[#0955AC]" />} title="USE / CATEGORY" count={selectedIndustryCategory.length} defaultOpen={true}>
          {INDUSTRY_CATEGORIES.map((cat) => (
            <FilterOption
              key={cat.id}
              label={cat.label}
              active={selectedIndustryCategory.includes(cat.id)}
              onClick={() => handleIndustryCategoryChange(cat.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Car className="w-4 h-4 text-[#0955AC]" />} title="VEHICLE TYPE" count={selectedBodyType.length} defaultOpen={true}>
          {(showAllBodyTypes ? BODY_TYPES : BODY_TYPES.slice(0, 6)).map((type) => (
            <FilterOption
              key={type.id}
              label={type.label}
              active={selectedBodyType.includes(type.id)}
              onClick={() => handleBodyTypeChange(type.id)}
            />
          ))}
          {BODY_TYPES.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllBodyTypes(!showAllBodyTypes)}
              className="text-[11px] font-[600] text-[#0955AC] hover:underline mt-1 pt-1 block cursor-pointer"
            >
              {showAllBodyTypes ? "Show Less" : `+ Show All (${BODY_TYPES.length})`}
            </button>
          )}
        </FilterSection>

        <FilterSection
          icon={<Gauge className="w-4 h-4 text-[#0955AC]" />}
          title="PRICE PER DAY"
          count={priceMin > PRICE_FLOOR || priceMax < PRICE_CEILING ? 1 : 0}
          defaultOpen={true}
        >
          <PriceRangeSlider
            min={PRICE_FLOOR}
            max={PRICE_CEILING}
            step={PRICE_STEP}
            valueMin={priceMin}
            valueMax={priceMax}
            onCommit={handlePriceCommit}
          />
        </FilterSection>

        <FilterSection icon={<Tag className="w-4 h-4 text-[#0955AC]" />} title="BRANDS" count={selectedBrand.length} defaultOpen={selectedBrand.length > 0}>
          {(showAllBrands ? BRANDS : BRANDS.slice(0, 5)).map((brand) => (
            <FilterOption
              key={brand.id}
              label={brand.label}
              active={selectedBrand.includes(brand.id)}
              onClick={() => handleBrandChange(brand.id)}
            />
          ))}
          {BRANDS.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="text-[11px] font-[600] text-[#0955AC] hover:underline mt-1 pt-1 block cursor-pointer"
            >
              {showAllBrands ? "Show Less" : `+ Show All (${BRANDS.length})`}
            </button>
          )}
        </FilterSection>

        <FilterSection icon={<Users className="w-4 h-4 text-[#0955AC]" />} title="CAPACITY" count={minSeats > SEATS_FLOOR ? 1 : 0} defaultOpen={minSeats > SEATS_FLOOR}>
          <MinValueSlider
            min={SEATS_FLOOR}
            max={SEATS_CEILING}
            value={minSeats}
            suffix="Seats"
            onCommit={handleSeatsCommit}
          />
        </FilterSection>

        <FilterSection icon={<Briefcase className="w-4 h-4 text-[#0955AC]" />} title="LUGGAGE CAPACITY" count={selectedLuggage.length} defaultOpen={selectedLuggage.length > 0}>
          {LUGGAGE_CAPACITIES.map((l) => (
            <FilterOption
              key={l.id}
              label={l.label}
              active={selectedLuggage.includes(l.id)}
              onClick={() => handleLuggageChange(l.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<ShieldCheck className="w-4 h-4 text-[#0955AC]" />} title="EXTRAS" count={selectedExtras.length} defaultOpen={selectedExtras.length > 0}>
          {EXTRAS.map((extra) => (
            <FilterOption
              key={extra.id}
              label={extra.label}
              active={selectedExtras.includes(extra.id)}
              onClick={() => handleExtraToggle(extra.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Gauge className="w-4 h-4 text-[#0955AC]" />} title="MILEAGE" count={selectedMileage.length} defaultOpen={selectedMileage.length > 0}>
          {MILEAGES.map((m) => (
            <FilterOption
              key={m.id}
              label={m.label}
              active={selectedMileage.includes(m.id)}
              onClick={() => handleMileageChange(m.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Cog className="w-4 h-4 text-[#0955AC]" />} title="TRANSMISSION" count={selectedTransmission.length} defaultOpen={selectedTransmission.length > 0}>
          {TRANSMISSIONS.map((t) => (
            <FilterOption
              key={t.id}
              label={t.label}
              active={selectedTransmission.includes(t.id)}
              onClick={() => handleTransmissionChange(t.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Fuel className="w-4 h-4 text-[#0955AC]" />} title="FUEL TYPE" count={selectedFuel.length} defaultOpen={selectedFuel.length > 0}>
          {FUELS.map((f) => (
            <FilterOption
              key={f.id}
              label={f.label}
              active={selectedFuel.includes(f.id)}
              onClick={() => handleFuelChange(f.id)}
            />
          ))}
        </FilterSection>
      </div>
    </>
  );
};

export default FilterSidebar;
