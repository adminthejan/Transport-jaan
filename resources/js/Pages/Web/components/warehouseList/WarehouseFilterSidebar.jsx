import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { Check, ChevronDown, MapPin, PackageSearch, SlidersHorizontal, Warehouse, X } from "lucide-react";

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

// Sri Lanka's real 9-province / 25-district administrative hierarchy.
const PROVINCES = [
  {
    id: "western",
    label: "Western",
    districts: [
      { id: "colombo", label: "Colombo" },
      { id: "gampaha", label: "Gampaha" },
      { id: "kalutara", label: "Kalutara" },
    ],
  },
  {
    id: "central",
    label: "Central",
    districts: [
      { id: "kandy", label: "Kandy" },
      { id: "matale", label: "Matale" },
      { id: "nuwara_eliya", label: "Nuwara Eliya" },
    ],
  },
  {
    id: "southern",
    label: "Southern",
    districts: [
      { id: "galle", label: "Galle" },
      { id: "matara", label: "Matara" },
      { id: "hambantota", label: "Hambantota" },
    ],
  },
  {
    id: "northern",
    label: "Northern",
    districts: [
      { id: "jaffna", label: "Jaffna" },
      { id: "kilinochchi", label: "Kilinochchi" },
      { id: "mannar", label: "Mannar" },
      { id: "vavuniya", label: "Vavuniya" },
      { id: "mullaitivu", label: "Mullaitivu" },
    ],
  },
  {
    id: "eastern",
    label: "Eastern",
    districts: [
      { id: "trincomalee", label: "Trincomalee" },
      { id: "batticaloa", label: "Batticaloa" },
      { id: "ampara", label: "Ampara" },
    ],
  },
  {
    id: "north_western",
    label: "North Western",
    districts: [
      { id: "kurunegala", label: "Kurunegala" },
      { id: "puttalam", label: "Puttalam" },
    ],
  },
  {
    id: "north_central",
    label: "North Central",
    districts: [
      { id: "anuradhapura", label: "Anuradhapura" },
      { id: "polonnaruwa", label: "Polonnaruwa" },
    ],
  },
  {
    id: "uva",
    label: "Uva",
    districts: [
      { id: "badulla", label: "Badulla" },
      { id: "monaragala", label: "Monaragala" },
    ],
  },
  {
    id: "sabaragamuwa",
    label: "Sabaragamuwa",
    districts: [
      { id: "ratnapura", label: "Ratnapura" },
      { id: "kegalle", label: "Kegalle" },
    ],
  },
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

// A collapsible province header with its district checkboxes underneath —
// same chip visual language as FilterOption, grouped under a toggle row.
const ProvinceGroup = ({ province, selectedDistricts, onToggleDistrict, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const activeInProvince = province.districts.filter((d) => selectedDistricts.includes(d.id)).length;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-[8px] text-[12px] font-[700] text-[#0F0F0F] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {province.label}
          {activeInProvince > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#0955AC1A] text-[#0955AC] text-[9px] font-[700]">
              {activeInProvince}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pl-2 pt-1.5">
          {province.districts.map((district) => (
            <FilterOption
              key={district.id}
              label={district.label}
              active={selectedDistricts.includes(district.id)}
              onClick={() => onToggleDistrict(district.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedTypes(asArray(searchParams?.warehouseType));
    setSelectedServices(asArray(searchParams?.services));
    setSelectedDistricts(asArray(searchParams?.location).map((v) => v.toLowerCase()));
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

  const handleDistrictToggle = (districtId) => {
    const next = toggleInList(selectedDistricts, districtId);
    setSelectedDistricts(next);
    runSearch({ ...searchParams, location: next });
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const activeCount = selectedTypes.length + selectedServices.length + selectedDistricts.length;

  const clearAll = () => {
    setSelectedTypes([]);
    setSelectedServices([]);
    setSelectedDistricts([]);
    runSearch({ ...searchParams, warehouseType: [], services: [], location: [] });
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
          subtitle="Province and district."
          count={selectedDistricts.length}
        >
          {PROVINCES.map((province) => (
            <ProvinceGroup
              key={province.id}
              province={province}
              selectedDistricts={selectedDistricts}
              onToggleDistrict={handleDistrictToggle}
              defaultOpen={province.districts.some((d) => selectedDistricts.includes(d.id))}
            />
          ))}
        </FilterSection>
      </div>
    </>
  );
};

export default WarehouseFilterSidebar;
