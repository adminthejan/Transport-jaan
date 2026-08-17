import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { Car, Check, Cog, Fuel, Gauge, SlidersHorizontal, Tag, Users, X } from "lucide-react";

const BODY_TYPES = [
  { id: "suv", label: "SUV" },
  { id: "crossover", label: "Crossover" },
  { id: "wagon", label: "Wagon" },
  { id: "family", label: "Family MBP" },
  { id: "sportcoupe", label: "Sport Coupe" },
  { id: "compact", label: "Compact" },
  { id: "coupe", label: "Coupe" },
  { id: "truck", label: "Truck" },
  { id: "other", label: "Other" },
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

const CAPACITIES = [
  { id: "2person", label: "2 Person" },
  { id: "4person", label: "4 Person" },
  { id: "6person", label: "6 Person" },
  { id: "8ormore", label: "8 or More" },
];

const PRICES = [
  { id: "0-50", label: "US$ 0 - US$ 50" },
  { id: "50-100", label: "US$ 50 - US$ 100" },
  { id: "100-150", label: "US$ 100 - US$ 150" },
  { id: "150-200", label: "US$ 150 - US$ 200" },
  { id: "200plus", label: "US$ 200+" },
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

const FilterSidebar = ({ searchParams }) => {
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCapacity, setSelectedCapacity] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedMileage, setSelectedMileage] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");
  const [selectedFuel, setSelectedFuel] = useState("");

  useEffect(() => {
    if (searchParams?.bodyType) {
      setSelectedBodyType(searchParams.bodyType.toLowerCase());
    }
    if (searchParams?.brand) {
      setSelectedBrand(searchParams.brand.toLowerCase());
    }
  }, [searchParams]);

  const runSearch = (nextParams) => {
    router.get('/vehicleList', nextParams, {
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

  const handleCapacityChange = (capacity) => {
    const newVal = selectedCapacity === capacity ? "" : capacity;
    setSelectedCapacity(newVal);
    runSearch({ ...searchParams, capacity: newVal });
  };

  const handlePriceChange = (priceRange) => {
    const newVal = selectedPrice === priceRange ? "" : priceRange;
    setSelectedPrice(newVal);
    runSearch({ ...searchParams, price: newVal });
  };

  const handleMileageChange = (mileage) => {
    const newVal = selectedMileage === mileage ? "" : mileage;
    setSelectedMileage(newVal);
    runSearch({ ...searchParams, mileage: newVal });
  };

  const handleTransmissionChange = (transmission) => {
    const newVal = selectedTransmission === transmission ? "" : transmission;
    setSelectedTransmission(newVal);
    runSearch({ ...searchParams, transmission: newVal });
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
    (selectedCapacity ? 1 : 0) +
    (selectedPrice ? 1 : 0) +
    (selectedMileage ? 1 : 0) +
    (selectedTransmission ? 1 : 0) +
    (selectedFuel ? 1 : 0);

  const clearAll = () => {
    setSelectedBodyType("");
    setSelectedBrand("");
    setSelectedCapacity("");
    setSelectedPrice("");
    setSelectedMileage("");
    setSelectedTransmission("");
    setSelectedFuel("");
    runSearch({
      ...searchParams,
      bodyType: "",
      brand: "",
      capacity: "",
      price: "",
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

        <FilterSection icon={<Car className="w-4 h-4 text-[#0955AC]" />} title="VEHICLE TYPE" count={selectedBodyType ? 1 : 0}>
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

        <FilterSection icon={<Users className="w-4 h-4 text-[#0955AC]" />} title="CAPACITY" count={selectedCapacity ? 1 : 0}>
          {CAPACITIES.map((cap) => (
            <FilterOption
              key={cap.id}
              label={cap.label}
              active={selectedCapacity === cap.id}
              onClick={() => handleCapacityChange(cap.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Gauge className="w-4 h-4 text-[#0955AC]" />} title="PRICE PER DAY" count={selectedPrice ? 1 : 0}>
          {PRICES.map((p) => (
            <FilterOption
              key={p.id}
              label={p.label}
              active={selectedPrice === p.id}
              onClick={() => handlePriceChange(p.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Gauge className="w-4 h-4 text-[#0955AC]" />} title="MILEAGE" count={selectedMileage ? 1 : 0}>
          {MILEAGES.map((m) => (
            <FilterOption
              key={m.id}
              label={m.label}
              active={selectedMileage === m.id}
              onClick={() => handleMileageChange(m.id)}
            />
          ))}
        </FilterSection>

        <FilterSection icon={<Cog className="w-4 h-4 text-[#0955AC]" />} title="TRANSMISSION" count={selectedTransmission ? 1 : 0}>
          {TRANSMISSIONS.map((t) => (
            <FilterOption
              key={t.id}
              label={t.label}
              active={selectedTransmission === t.id}
              onClick={() => handleTransmissionChange(t.id)}
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
