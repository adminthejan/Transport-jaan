
import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import VehicleImages from "../../components/multiModel/vehicleDetails/VehicleImages";
import VehicleInfo from "../../components/multiModel/vehicleDetails/VehicleInfo";
import VehicleSearch from "../../components/multiModel/vehicleDetails/VehicleSearch";
import Suggestions from "../../components/multiModel/vehicleDetails/Suggestions";

const VehicleDetails = ({ vehicle, journey }) => {
    // Get legIndex from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const legIndex = parseInt(urlParams.get('legIndex')) || 0;

    const handleVehicleSelected = (selectedLegIndex, selectionType, cartData) => {
        console.log('Vehicle selected:', {
            legIndex: selectedLegIndex,
            selectionType,
            cart: cartData
        });
        
        // You can add additional logic here if needed before navigation
        // The navigation is already handled in VehicleSearch component
    };

    return (
        <div>
            <Header />
            <div className="main-content flex justify-center items-center">
                <div className="py-10 md:px-10 flex flex-col xl:flex-row justify-between w-full gap-10">
                    <div className="flex flex-col gap-10 justify-start items-center w-full">
                        <VehicleImages vehicle={vehicle} />
                        <VehicleInfo vehicle={vehicle} />
                    </div>
                    <div className="flex flex-col justify-start items-center gap-10">
                        {" "}
                        <VehicleSearch 
                            vehicle={vehicle} 
                            journey={journey} 
                            legIndex={legIndex}
                            onVehicleSelected={handleVehicleSelected}
                        />
                        {/* <Suggestions /> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetails;