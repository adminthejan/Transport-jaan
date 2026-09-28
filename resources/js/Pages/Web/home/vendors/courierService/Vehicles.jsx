import React from "react";
import VendorShellLayout from "../../../../../Components/vendors/VendorShellLayout";
import VehicleContent from "../../../components/vendors/courierService/units/VehicleContent";

const Vehicles = () => {
    return (
        <VendorShellLayout activeService="Courier Service">
            <VehicleContent />
        </VendorShellLayout>
    );
};

export default Vehicles;
