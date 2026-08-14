import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import ClientHeader from "../client/ClientHeader";
import WarehouseFilterSidebar from "../../components/warehouseList/WarehouseFilterSidebar";
import WarehouseSearchForm from "../../components/warehouseList/WarehouseSearchForm";
import WarehouseListContent from "../../components/warehouseList/WarehouseListContent";
import WarehouseListMap from "../../components/warehouseList/WarehouseListMap";

const WarehouseList = () => {
  const { props } = usePage();

  const [formData, setFormData] = useState({
    warehouseLocation: "",
    requiredSpace: "",
    requiredSpaceUnit: "sqft",
    moveinDate: "",
    leaseDuration: "",
    dateMode: "flexible",
  });

  useEffect(() => {
    // Backend sends the current query string back as `searchParams` so the
    // form reflects whatever filters are actually active on page load.
    if (props.searchParams) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.searchParams,
      }));
    }
  }, [props.searchParams]);

  const handleFormChange = (newData) => {
    setFormData(newData);
  };

  return (
    <div className="warehouse-list-page bg-[#F6F7F9] min-h-screen">
      <Head title="Find Warehouses - Transport Jaan" />
      <ClientHeader />

      <WarehouseSearchForm formData={formData} onFormChange={handleFormChange} />

      <div className="px-4 sm:px-6 lg:px-10 2xl:px-16 pb-16">
        <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_380px] gap-6 items-start">
          {/* Filters */}
          <div className="order-3 xl:order-1">
            <WarehouseFilterSidebar searchParams={formData} />
          </div>

          {/* Results */}
          <div className="order-2 xl:order-2 min-w-0">
            <WarehouseListContent
              warehouses={props.warehouses}
              authUser={props.auth?.user}
              likedWarehouseIds={props.likedWarehouseIds}
            />
          </div>

          {/* Map — sticky beside the results on desktop, a compact strip above them on mobile */}
          <div className="order-1 xl:order-3 xl:sticky xl:top-6">
            <WarehouseListMap
              warehouses={props.warehouses}
              heightClass="h-[220px] xl:h-[calc(100vh-140px)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseList;