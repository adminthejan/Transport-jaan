import React, { useMemo } from "react";
import { usePage } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import BackButton from "../../components/BackBtn";
import VehicleImages from "../../components/LandVehicleDetails/VehicleImages";
import PlaneSearch from "../../components/AirVehicleDetails/PlaneSearch";
import PlaneInfo from "../../components/AirVehicleDetails/PlaneInfo";
import Suggestions from "../../components/LandVehicleDetails/Suggestions";
import bg from "../../assets/rentAVehicle/bg/bg.png";

const AirVehicleDetails = () => {
    const { props } = usePage();
    const { vehicle } = props;

    const memoizedVehicle = useMemo(() => {
        if (!vehicle) return null;
        return {
            ...vehicle,
            name: vehicle.model || vehicle.name,
            price: vehicle.price,
            image: vehicle.image,
        };
    }, [vehicle]);

    if (!memoizedVehicle) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-xl">No vehicle selected</p>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <div className="pt-6 px-5 md:px-10 max-w-[1800px] mx-auto">
                <BackButton />
            </div>
            <div className="main-content flex justify-center items-center">
                <div className="py-10 md:px-10 flex flex-col xl:flex-row justify-between w-full gap-10">
                    <div className="flex flex-col gap-10 justify-start items-center w-full">
                        <VehicleImages />
                        <PlaneInfo />
                    </div>
                    <div className="flex flex-col justify-start items-center gap-10">
                        {" "}
                        <PlaneSearch />
                        <Suggestions />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirVehicleDetails;
