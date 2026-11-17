import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import {
  Briefcase,
  Car,
  Check,
  ChevronDown,
  Cog,
  Fuel,
  Gauge,
  LayoutGrid,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Users,
  Wifi,
  X,
  RotateCcw,
} from "lucide-react";

const INDUSTRY_CATEGORIES = [
  { id: "cars_suvs", label: "Cars & SUVs" },
  { id: "vans_minibuses", label: "Vans & Minibuses" },
  { id: "buses", label: "Buses & Coaches" },
  { id: "trucks", label: "Trucks & Commercial" },
  { id: "prime_movers_trailers", label: "Prime Movers & Trailers" },
  { id: "construction_equipment", label: "Equipment & Heavy" },
];

const BODY_TYPES = [
  { id: "sedan", label: "Sedan" },
  { id: "hatchback", label: "Hatchback" },
  { id: "suv", label: "SUV" },
  { id: "crossover", label: "Crossover" },
  { id: "wagon", label: "Station Wagon" },
  { id: "mpv", label: "MPV / Minivan" },
  { id: "van", label: "Van" },
  { id: "pickup", label: "Pickup Truck" },
  { id: "bus", label: "Bus / Coach" },
  { id: "motorcycle", label: "Motorcycle" },
  { id: "three_wheeler", label: "Three-Wheeler" },
  { id: "special_purpose", label: "Special Purpose" },
  { id: "family", label: "Family MBP" },
  { id: "sportcoupe", label: "Sport Coupe" },
  { id: "compact", label: "Compact" },
  { id: "coupe", label: "Coupe" },
  { id: "other", label: "Other" },
];

const EXTRAS = [
  { id: "gps", label: "GPS Navigation", icon: Gauge },
  { id: "child_seat", label: "Child Seat", icon: Users },
  { id: "wifi", label: "Onboard 4G WiFi", icon: Wifi },
  { id: "insurance_coverage", label: "Full Insurance Cover", icon: ShieldCheck },
];

const BRANDS = [
  { id: "toyota", label: "Toyota" },
  { id: "ford", label: "Ford" },
  { id: "honda", label: "Honda" },
  { id: "bmw", label: "BMW" },
  { id: "mercedes", label: "Mercedes-Benz" },
  { id: "audi", label: "Audi" },
  { id: "nissan", label: "Nissan" },
  { id: "mitsubishi", label: "Mitsubishi" },
  { id: "hyundai", label: "Hyundai" },
  { id: "suzuki", label: "Suzuki" },
  { id: "other", label: "Other" },
];

const SEATS_FLOOR = 1;
const SEATS_CEILING = 12;

const PRICE_FLOOR = 0;
const PRICE_CEILING = 3100000;
const PRICE_STEP = 5000;

const LUGGAGE_CAPACITIES = [
  { id: "1-2", label: "1 - 2 Bags" },
  { id: "3-4", label: "3 - 4 Bags" },
  { id: "5plus", label: "5+ Bags" },
];

const TRANSMISSIONS = [
  { id: "automatic", label: "Automatic" },
  { id: "manual", label: "Manual" },
  { id: "amt", label: "Automated Manual (AMT)" },
  { id: "cvt", label: "CVT" },
  { id: "dct", label: "Dual-Clutch (DCT)" },
];

const FUELS = [
  { id: "petrol", label: "Petrol" },
  { id: "diesel", label: "Diesel" },
  { id: "hybrid", label: "Hybrid" },
  { id: "electric", label: "Electric (EV)" },
  { id: "cng", label: "CNG" },
  { id: "lpg", label: "LPG" },
];

const FilterOption = ({ label, active, onClick }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={active}
    onClick={onClick}
    className={`group flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold mb-1.5 transition-all duration-200 cursor-pointer ${
      active
        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
        : "bg-slate-50/80 hover:bg-slate-100 text-slate-700 border border-slate-200/60 hover:border-slate-300"
    }`}
  >
    <span className="truncate">{label}</span>
    <span
      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        active ? "bg-white text-blue-600" : "border border-slate-300 group-hover:border-slate-400"
      }`}
    >
      {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
    </span>
  </button>
);

const FilterSection = ({ icon, title, count = 0, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  useEffect(() => {
    if (count > 0) setIsOpen(true);
  }, [count]);

  return (
    <div className="filter-section mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-1 group cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            {icon}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
            {title}
          </span>
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-blue-600 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pt-2.5 space-y-1">{children}</div>}
    </div>
  );
};

const THUMB_STYLES =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer";

const PriceRangeSlider = ({ min, max, step, valueMin, valueMax, onCommit }) => {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);

  useEffect(() => setLocalMin(valueMin), [valueMin]);
  useEffect(() => setLocalMax(valueMax), [valueMax]);

  const commit = () => onCommit(localMin, localMax);

  const minPct = ((localMin - min) / (max - min)) * 100;
  const maxPct = ((localMax - min) / (max - min)) * 100;
  const minOnTop = localMin > min + (max - min) * 0.6;

  return (
    <div className="px-1 pt-1">
      <div className="relative h-2 rounded-full bg-slate-100 mt-3 mb-4">
        <div
          className="absolute h-2 rounded-full bg-blue-600"
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
          style={{ zIndex: minOnTop ? 20 : 10 }}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer ${THUMB_STYLES}`}
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
          style={{ zIndex: minOnTop ? 10 : 20 }}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer ${THUMB_STYLES}`}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span>LKR {Number(localMin).toLocaleString()}</span>
        <span>{localMax >= max ? "Any Price" : `LKR ${Number(localMax).toLocaleString()}`}</span>
      </div>
    </div>
  );
};

const LinearStepSlider = ({ min, max, step = 1, value, onCommit, suffix = "Seats" }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const commit = () => onCommit(local);
  const pct = ((local - min) / (max - min)) * 100;

  return (
    <div className="px-1 pt-1">
      <div className="relative h-2 rounded-full bg-slate-100 mt-3 mb-4">
        <div className="absolute h-2 rounded-full bg-blue-600" style={{ left: 0, width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          aria-label={`Minimum ${suffix}`}
          className={`absolute w-full top-1/2 -translate-y-1/2 h-2 appearance-none bg-transparent cursor-pointer ${THUMB_STYLES}`}
        />
      </div>
      <div className="text-xs font-bold text-slate-700">
        At least {local} {suffix}{local >= max ? "+" : ""}
      </div>
    </div>
  );
};

const toList = (val) => (val ? String(val).toLowerCase().split(",").filter(Boolean) : []);

const FilterSidebar = ({ searchParams, onSearch, onCloseMobile }) => {
  const [selectedBodyType, setSelectedBodyType] = useState(() => toList(searchParams?.bodyType));
  const [selectedIndustryCategory, setSelectedIndustryCategory] = useState(() => toList(searchParams?.industryCategory));
  const [selectedBrand, setSelectedBrand] = useState(() => toList(searchParams?.brand));
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
    setSelectedTransmission(toList(searchParams?.transmission));
    setSelectedFuel(toList(searchParams?.fuel));
    setPriceMin(searchParams?.minPrice !== undefined && searchParams?.minPrice !== "" ? Number(searchParams.minPrice) : PRICE_FLOOR);
    setPriceMax(searchParams?.maxPrice !== undefined && searchParams?.maxPrice !== "" ? Number(searchParams.maxPrice) : PRICE_CEILING);
    setMinSeats(searchParams?.minSeats !== undefined && searchParams?.minSeats !== "" ? Number(searchParams.minSeats) : SEATS_FLOOR);
  }, [searchParams]);

  const runSearch = (nextParams) => {
    if (onSearch) {
      onSearch(nextParams);
      return;
    }
    router.get("/vehicleList", nextParams, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  const toggleInList = (list, setList, paramKey) => (value) => {
    const newVal = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setList(newVal);
    runSearch({ ...searchParams, [paramKey]: newVal.join(",") });
  };

  const handleBodyTypeChange = toggleInList(selectedBodyType, setSelectedBodyType, "bodyType");
  const handleBrandChange = toggleInList(selectedBrand, setSelectedBrand, "brand");
  const handleIndustryCategoryChange = toggleInList(selectedIndustryCategory, setSelectedIndustryCategory, "industryCategory");
  const handleExtraToggle = toggleInList(selectedExtras, setSelectedExtras, "extras");
  const handleLuggageChange = toggleInList(selectedLuggage, setSelectedLuggage, "luggage");

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
      maxPrice: max < PRICE_CEILING ? max : "",
    });
  };

  const handleTransmissionChange = toggleInList(selectedTransmission, setSelectedTransmission, "transmission");
  const handleFuelChange = toggleInList(selectedFuel, setSelectedFuel, "fuel");

  const activeCount =
    selectedBodyType.length +
    selectedIndustryCategory.length +
    selectedBrand.length +
    (minSeats > SEATS_FLOOR ? 1 : 0) +
    selectedLuggage.length +
    (priceMin > PRICE_FLOOR || priceMax < PRICE_CEILING ? 1 : 0) +
    selectedExtras.length +
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
      transmission: "",
      fuel: "",
    });
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">Filters</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Refine your search</p>
          </div>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>

      <div className="space-y-1">
        {/* Price Slider */}
        <FilterSection
          icon={<Tag className="w-3.5 h-3.5" />}
          title="Daily Rate (LKR)"
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

        {/* Categories */}
        <FilterSection
          icon={<LayoutGrid className="w-3.5 h-3.5" />}
          title="Category"
          count={selectedIndustryCategory.length}
          defaultOpen={true}
        >
          {INDUSTRY_CATEGORIES.map((cat) => (
            <FilterOption
              key={cat.id}
              label={cat.label}
              active={selectedIndustryCategory.includes(cat.id)}
              onClick={() => handleIndustryCategoryChange(cat.id)}
            />
          ))}
        </FilterSection>

        {/* Vehicle Body Type */}
        <FilterSection
          icon={<Car className="w-3.5 h-3.5" />}
          title="Body Style"
          count={selectedBodyType.length}
          defaultOpen={true}
        >
          {(showAllBodyTypes ? BODY_TYPES : BODY_TYPES.slice(0, 5)).map((type) => (
            <FilterOption
              key={type.id}
              label={type.label}
              active={selectedBodyType.includes(type.id)}
              onClick={() => handleBodyTypeChange(type.id)}
            />
          ))}
          {BODY_TYPES.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllBodyTypes(!showAllBodyTypes)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 pt-1 cursor-pointer"
            >
              {showAllBodyTypes ? "Show Less" : `+${BODY_TYPES.length - 5} More Body Types`}
            </button>
          )}
        </FilterSection>

        {/* Transmission */}
        <FilterSection
          icon={<Cog className="w-3.5 h-3.5" />}
          title="Transmission"
          count={selectedTransmission.length}
          defaultOpen={true}
        >
          {TRANSMISSIONS.map((t) => (
            <FilterOption
              key={t.id}
              label={t.label}
              active={selectedTransmission.includes(t.id)}
              onClick={() => handleTransmissionChange(t.id)}
            />
          ))}
        </FilterSection>

        {/* Fuel Type */}
        <FilterSection
          icon={<Fuel className="w-3.5 h-3.5" />}
          title="Fuel Engine"
          count={selectedFuel.length}
        >
          {FUELS.map((f) => (
            <FilterOption
              key={f.id}
              label={f.label}
              active={selectedFuel.includes(f.id)}
              onClick={() => handleFuelChange(f.id)}
            />
          ))}
        </FilterSection>

        {/* Passenger Seats Slider */}
        <FilterSection
          icon={<Users className="w-3.5 h-3.5" />}
          title="Passenger Seats"
          count={minSeats > SEATS_FLOOR ? 1 : 0}
        >
          <LinearStepSlider
            min={SEATS_FLOOR}
            max={SEATS_CEILING}
            value={minSeats}
            onCommit={handleSeatsCommit}
            suffix="Seats"
          />
        </FilterSection>

        {/* Luggage Capacity */}
        <FilterSection
          icon={<Briefcase className="w-3.5 h-3.5" />}
          title="Luggage Bags"
          count={selectedLuggage.length}
        >
          {LUGGAGE_CAPACITIES.map((lug) => (
            <FilterOption
              key={lug.id}
              label={lug.label}
              active={selectedLuggage.includes(lug.id)}
              onClick={() => handleLuggageChange(lug.id)}
            />
          ))}
        </FilterSection>

        {/* Brand */}
        <FilterSection
          icon={<Tag className="w-3.5 h-3.5" />}
          title="Manufacturer"
          count={selectedBrand.length}
        >
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
              className="text-xs font-bold text-blue-600 hover:text-blue-700 pt-1 cursor-pointer"
            >
              {showAllBrands ? "Show Less" : `+${BRANDS.length - 5} More Brands`}
            </button>
          )}
        </FilterSection>

        {/* Extras & Features */}
        <FilterSection
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          title="Included Features"
          count={selectedExtras.length}
        >
          {EXTRAS.map((extra) => (
            <FilterOption
              key={extra.id}
              label={extra.label}
              active={selectedExtras.includes(extra.id)}
              onClick={() => handleExtraToggle(extra.id)}
            />
          ))}
        </FilterSection>
      </div>
    </div>
  );
};

export default FilterSidebar;
