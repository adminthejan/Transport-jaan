import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { Anchor, Check, Fuel, Gauge, Ship, SlidersHorizontal, Tag, Users, X } from "lucide-react";

const BODY_TYPES = [
  { id: "speedboat", label: "Speedboat" },
  { id: "yacht", label: "Yacht" },
  { id: "catamaran", label: "Catamaran" },
  { id: "sailboat", label: "Sailboat" },
  { id: "fishing_boat", label: "Fishing Boat" },
  { id: "cruise_ship", label: "Cruise Ship" },
  { id: "ferry", label: "Ferry" },
  { id: "houseboat", label: "Houseboat" },
  { id: "jet_ski", label: "Jet Ski" },
  { id: "tugboat", label: "Tugboat" },
  { id: "cargo_vessel", label: "Cargo Vessel" },
  { id: "other", label: "Other" },
];

const BRANDS = [
  { id: "yamahaMarine", label: "Yamaha Marine" },
  { id: "saeDoo", label: "Sea-Doo" },
  { id: "bayliner", label: "Bayliner" },
  { id: "quicksilver", label: "Quicksilver" },
  { id: "beneteau", label: "Beneteau" },
  { id: "princess", label: "Princess" },
  { id: "sunseeker", label: "Sunseeker" },
  { id: "azimutYachts", label: "Azimut Yachts" },
  { id: "ferretti", label: "Ferretti" },
  { id: "masterCraft", label: "Master Craft" },
];

const SEATS_FLOOR = 1;
const SEATS_CEILING = 20;

const PRICE_FLOOR = 0;
const PRICE_CEILING = 2000;
const PRICE_STEP = 25;

const MILEAGES = [
  { id: "limited", label: "Limited" },
  { id: "unlimited", label: "Unlimited" },
];

const FUELS = [
  { id: "diesel", label: "Diesel" },
  { id: "petrol", label: "Petrol" },
  { id: "electric", label: "Electric" },
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

const FilterSection = ({ icon, title, count, children }) => (
  <div className="filter-section mb-7 pb-6 border-b border-[#00000014] last:border-b-0 last:mb-0 last:pb-0">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="bebas-neue text-[18px] text-[#0F0F0F] tracking-wide">{title}</h3>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0955AC1A] text-[#0955AC] text-[10px] font-[700]">
          {count}
        </span>
      )}
    </div>
    {children}
  </div>
);

const THUMB_STYLES =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0955AC] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#0955AC] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer";

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

const FilterSidebar = ({ searchParams, onSearch }) => {
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [minSeats, setMinSeats] = useState(
    searchParams?.minSeats !== undefined && searchParams?.minSeats !== "" ? Number(searchParams.minSeats) : SEATS_FLOOR
  );
  const [priceMin, setPriceMin] = useState(
    searchParams?.minPrice !== undefined && searchParams?.minPrice !== "" ? Number(searchParams.minPrice) : PRICE_FLOOR
  );
  const [priceMax, setPriceMax] = useState(
    searchParams?.maxPrice !== undefined && searchParams?.maxPrice !== "" ? Number(searchParams.maxPrice) : PRICE_CEILING
  );
  const [selectedMileage, setSelectedMileage] = useState("");
  const [selectedFuel, setSelectedFuel] = useState("");

  useEffect(() => {
    if (searchParams?.bodyType) {
      setSelectedBodyType(searchParams.bodyType.toLowerCase());
    }
    if (searchParams?.brand) {
      setSelectedBrand(searchParams.brand.toLowerCase());
    }
    setPriceMin(searchParams?.minPrice !== undefined && searchParams?.minPrice !== "" ? Number(searchParams.minPrice) : PRICE_FLOOR);
    setPriceMax(searchParams?.maxPrice !== undefined && searchParams?.maxPrice !== "" ? Number(searchParams.maxPrice) : PRICE_CEILING);
    setMinSeats(searchParams?.minSeats !== undefined && searchParams?.minSeats !== "" ? Number(searchParams.minSeats) : SEATS_FLOOR);
  }, [searchParams]);

  const runSearch = (nextParams) => {
    if (onSearch) {
      onSearch(nextParams);
      return;
    }
    router.get('/seaVehicleList', nextParams, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  const handleBodyTypeChange = (bodyType) => {
    const newVal = selectedBodyType === bodyType ? "" : bodyType;
    setSelectedBodyType(newVal);
    runSearch({ ...searchParams, bodyType: newVal });
  };

  const handleBrandChange = (brand) => {
    const newVal = selectedBrand === brand ? "" : brand;
    setSelectedBrand(newVal);
    runSearch({ ...searchParams, brand: newVal });
  };

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

  const handleMileageChange = (mileage) => {
    const newVal = selectedMileage === mileage ? "" : mileage;
    setSelectedMileage(newVal);
    runSearch({ ...searchParams, mileage: newVal });
  };

  const handleFuelChange = (fuel) => {
    const newVal = selectedFuel === fuel ? "" : fuel;
    setSelectedFuel(newVal);
    runSearch({ ...searchParams, fuel: newVal });
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const activeCount =
    (selectedBodyType ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (minSeats > SEATS_FLOOR ? 1 : 0) +
    (priceMin > PRICE_FLOOR || priceMax < PRICE_CEILING ? 1 : 0) +
    (selectedMileage ? 1 : 0) +
    (selectedFuel ? 1 : 0);

  const clearAll = () => {
    setSelectedBodyType("");
    setSelectedBrand("");
    setMinSeats(SEATS_FLOOR);
    setPriceMin(PRICE_FLOOR);
    setPriceMax(PRICE_CEILING);
    setSelectedMileage("");
    setSelectedFuel("");
    runSearch({
      ...searchParams,
      bodyType: "",
      brand: "",
      minSeats: "",
      minPrice: "",
      maxPrice: "",
      mileage: "",
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
        className={`poppins text-[#0F0F0F80] text-[12px] font-[400] filter-sidebar bg-white rounded-[15px] shadow-lg shadow-[#00000014] border border-[#0000000D] p-5
          fixed xl:sticky xl:top-6
          top-0 left-0
          h-full xl:h-auto
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

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#00000014]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0955AC]" />
            <h2 className="bebas-neue text-[22px] text-[#0F0F0F] tracking-wide">FILTERS</h2>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        <FilterSection icon={<Ship className="w-4 h-4 text-[#0955AC]" />} title="VEHICLE TYPE" count={selectedBodyType ? 1 : 0}>
          {BODY_TYPES.map((type) => (
            <FilterOption
              key={type.id}
              label={type.label}
              active={selectedBodyType === type.id}
              onClick={() => handleBodyTypeChange(type.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Tag className="w-4 h-4 text-[#0955AC]" />} title="BRANDS" count={selectedBrand ? 1 : 0}>
          {BRANDS.map((brand) => (
            <FilterOption
              key={brand.id}
              label={brand.label}
              active={selectedBrand === brand.id}
              onClick={() => handleBrandChange(brand.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Users className="w-4 h-4 text-[#0955AC]" />} title="CAPACITY" count={minSeats > SEATS_FLOOR ? 1 : 0}>
          <MinValueSlider min={SEATS_FLOOR} max={SEATS_CEILING} value={minSeats} suffix="Guests" onCommit={handleSeatsCommit} />
        </FilterSection>

        <FilterSection
          icon={<Gauge className="w-4 h-4 text-[#0955AC]" />}
          title="PRICE PER DAY"
          count={priceMin > PRICE_FLOOR || priceMax < PRICE_CEILING ? 1 : 0}
        >
          <PriceRangeSlider min={PRICE_FLOOR} max={PRICE_CEILING} step={PRICE_STEP} valueMin={priceMin} valueMax={priceMax} onCommit={handlePriceCommit} />
        </FilterSection>

        <FilterSection icon={<Anchor className="w-4 h-4 text-[#0955AC]" />} title="MILEAGE" count={selectedMileage ? 1 : 0}>
          {MILEAGES.map((m) => (
            <FilterOption
              key={m.id}
              label={m.label}
              active={selectedMileage === m.id}
              onClick={() => handleMileageChange(m.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Fuel className="w-4 h-4 text-[#0955AC]" />} title="FUEL TYPE" count={selectedFuel ? 1 : 0}>
          {FUELS.map((f) => (
            <FilterOption
              key={f.id}
              label={f.label}
              active={selectedFuel === f.id}
              onClick={() => handleFuelChange(f.id)}
            />
          ))}
        </FilterSection>
      </div>
    </>
  );
};

export default FilterSidebar;
