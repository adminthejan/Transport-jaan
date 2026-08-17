import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { Check, MapPin, PackageSearch, SlidersHorizontal, Warehouse, X } from "lucide-react";

// Warehouse Type describes the facility itself; Services describes what a
// client can book on top of storage. Kept as two separate filter groups to
// match how vendors configure their listings (see WarehouseUnitController).
const WAREHOUSE_TYPES = [
  { id: "general_warehouse", label: "General Warehouse" },
  { id: "bonded_warehouse", label: "Bonded Warehouse" },
  { id: "cold_storage", label: "Cold Storage" },
  { id: "distribution_center", label: "Distribution Center" },
  { id: "fulfillment_center", label: "Fulfillment Center" },
  { id: "smart_warehouse", label: "Smart Warehouse" },
];

const SERVICES = [
  { id: "storage", label: "Storage" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "distribution", label: "Distribution" },
  { id: "value_added_services", label: "Value Added Services" },
  { id: "customs_services", label: "Customs Services" },
  { id: "transportation", label: "Transportation" },
];

const LOCATIONS = [
  { id: "colombo", label: "Colombo" },
  { id: "gampaha", label: "Gampaha" },
  { id: "kalutara", label: "Kalutara" },
  { id: "kandy", label: "Kandy" },
  { id: "galle", label: "Galle" },
  { id: "matara", label: "Matara" },
];

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

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

const FilterSection = ({ icon, title, subtitle, count, children }) => (
  <div className="filter-section mb-7 pb-6 border-b border-[#00000014] last:border-b-0 last:mb-0 last:pb-0">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <h3 className="bebas-neue text-[18px] text-[#0F0F0F] tracking-wide">{title}</h3>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0955AC1A] text-[#0955AC] text-[10px] font-[700]">
          {count}
        </span>
      )}
    </div>
    {subtitle && <p className="text-[10px] text-[#0F0F0F66] mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    {children}
  </div>
);

const WarehouseFilterSidebar = ({ searchParams }) => {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedTypes(asArray(searchParams?.warehouseType));
    setSelectedServices(asArray(searchParams?.services));
    if (searchParams?.location) {
      setSelectedLocation(searchParams.location.toLowerCase());
    }
  }, [searchParams]);

  const runSearch = (nextParams) => {
    router.get('/warehouseList', nextParams, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  const toggleInList = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleTypeChange = (typeId) => {
    const next = toggleInList(selectedTypes, typeId);
    setSelectedTypes(next);
    runSearch({ ...searchParams, warehouseType: next });
  };

  const handleServiceChange = (serviceId) => {
    const next = toggleInList(selectedServices, serviceId);
    setSelectedServices(next);
    runSearch({ ...searchParams, services: next });
  };

  const handleLocationChange = (location) => {
    const newLocation = selectedLocation === location ? "" : location;
    setSelectedLocation(newLocation);
    runSearch({ ...searchParams, location: newLocation });
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const activeCount = selectedTypes.length + selectedServices.length + (selectedLocation ? 1 : 0);

  const clearAll = () => {
    setSelectedTypes([]);
    setSelectedServices([]);
    setSelectedLocation("");
    runSearch({ ...searchParams, warehouseType: [], services: [], location: "" });
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

        <FilterSection
          icon={<Warehouse className="w-4 h-4 text-[#0955AC]" />}
          title="WAREHOUSE TYPE"
          subtitle="The kind of facility."
          count={selectedTypes.length}
        >
          {WAREHOUSE_TYPES.map((type) => (
            <FilterOption
              key={type.id}
              label={type.label}
              active={selectedTypes.includes(type.id)}
              onClick={() => handleTypeChange(type.id)}
            />
          ))}
        </FilterSection>

        <FilterSection
          icon={<PackageSearch className="w-4 h-4 text-[#0955AC]" />}
          title="SERVICES"
          subtitle="What can be booked on top of storage."
          count={selectedServices.length}
        >
          {SERVICES.map((service) => (
            <FilterOption
              key={service.id}
              label={service.label}
              active={selectedServices.includes(service.id)}
              onClick={() => handleServiceChange(service.id)}
            />
          ))}
        </FilterSection>

        <FilterSection
          icon={<MapPin className="w-4 h-4 text-[#0955AC]" />}
          title="LOCATION"
          count={selectedLocation ? 1 : 0}
        >
          {LOCATIONS.map((location) => (
            <FilterOption
              key={location.id}
              label={location.label}
              active={selectedLocation === location.id}
              onClick={() => handleLocationChange(location.id)}
            />
          ))}
        </FilterSection>
      </div>
    </>
  );
};

export default WarehouseFilterSidebar;
