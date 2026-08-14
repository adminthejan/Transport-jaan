import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";

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

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

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

  const locations = [
    { id: "colombo", label: "Colombo" },
    { id: "gampaha", label: "Gampaha" },
    { id: "kalutara", label: "Kalutara" },
    { id: "kandy", label: "Kandy" },
    { id: "galle", label: "Galle" },
    { id: "matara", label: "Matara" }
  ];

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed bottom-4 right-4 z-40 bg-[#0955AC] text-white px-4 py-2 rounded-full shadow-lg"
      >
        {isOpen ? "Close Filters" : "Show Filters"}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`poppins text-[#0F0F0F80] text-[12px] font-[400] filter-sidebar bg-[#F4F3F3] rounded-[10px] p-5
          fixed md:static
          top-0 left-0
          h-full md:h-auto
          overflow-y-auto
          w-[283px] md:w-[283px]
          transform transition-transform duration-300 ease-in-out
          z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ml-0 md:ml-10 mt-0 md:mt-10`}
      >
        {/* Close button for mobile */}
        <button
          onClick={toggleSidebar}
          className="md:hidden absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          ×
        </button>

        <div className="filter-section mb-10 mt-5 pb-5 border-b border-[#00000026]">
          <h3 className="bebas-neue text-[20px] text-[#0000008C] mb-2.5">
            WAREHOUSE TYPE
          </h3>
          <p className="text-[10px] text-[#0F0F0F66] mb-2">The kind of facility.</p>
          {WAREHOUSE_TYPES.map((type) => (
            <div key={type.id} className="mb-1.5 flex items-center">
              <input
                type="checkbox"
                id={`type-${type.id}`}
                name="warehouseType"
                value={type.id}
                className="mr-1.5"
                checked={selectedTypes.includes(type.id)}
                onChange={() => handleTypeChange(type.id)}
              />
              <label htmlFor={`type-${type.id}`}>{type.label}</label>
            </div>
          ))}
        </div>

        <div className="filter-section mb-10 pb-5 border-b border-[#00000026]">
          <h3 className="bebas-neue text-[20px] text-[#0000008C] mb-2.5">
            SERVICES
          </h3>
          <p className="text-[10px] text-[#0F0F0F66] mb-2">What can be booked on top of storage.</p>
          {SERVICES.map((service) => (
            <div key={service.id} className="mb-1.5 flex items-center">
              <input
                type="checkbox"
                id={`service-${service.id}`}
                name="services"
                value={service.id}
                className="mr-1.5"
                checked={selectedServices.includes(service.id)}
                onChange={() => handleServiceChange(service.id)}
              />
              <label htmlFor={`service-${service.id}`}>{service.label}</label>
            </div>
          ))}
        </div>

        <div className="filter-section mb-10">
          <h3 className="bebas-neue text-[20px] text-[#0000008C] mb-2.5 pb-2 border-b border-[#00000026]">
            LOCATION
          </h3>
          {locations.map((location) => (
            <div key={location.id} className="mb-1.5 flex items-center">
              <input
                type="checkbox"
                id={location.id}
                name="location"
                value={location.id}
                className="mr-1.5"
                checked={selectedLocation === location.id}
                onChange={() => handleLocationChange(location.id)}
              />
              <label htmlFor={location.id}>{location.label}</label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default WarehouseFilterSidebar;
