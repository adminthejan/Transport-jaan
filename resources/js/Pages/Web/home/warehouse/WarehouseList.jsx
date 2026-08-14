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
    <div className="warehouse-list-page">
      <Head title="Find Warehouses - Transport Jaan" />
      <ClientHeader />
      <div className="main-content flex">
        <WarehouseFilterSidebar searchParams={formData} />
        <div className="warehouse-list-container flex-1">
          <WarehouseSearchForm formData={formData} onFormChange={handleFormChange} />
          <div className="px-4 md:px-40">
            <WarehouseListMap warehouses={props.warehouses} />
          </div>
          <WarehouseListContent
            warehouses={props.warehouses}
            authUser={props.auth?.user}                
            likedWarehouseIds={props.likedWarehouseIds} 
          />
        </div>
      </div>
    </div>
  );
};

export default WarehouseList;