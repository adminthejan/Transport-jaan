import React, { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import ClientHeader from "../client/ClientHeader";
import WarehouseFilterSidebar from "../../components/warehouseList/WarehouseFilterSidebar";
import WarehouseSearchForm from "../../components/warehouseList/WarehouseSearchForm";
import WarehouseListContent from "../../components/warehouseList/WarehouseListContent";

const WarehouseList = () => {
  const { props } = usePage();

  const [formData, setFormData] = useState({
    warehouseLocation: "",
    requiredSpace: "",
    moveinDate: "",
    leaseDuration: "",
  });

  useEffect(() => {
    if (props.filters) {
      setFormData((prevData) => ({
        ...prevData,
        ...props.filters,
      }));
    }
  }, [props.filters]);

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