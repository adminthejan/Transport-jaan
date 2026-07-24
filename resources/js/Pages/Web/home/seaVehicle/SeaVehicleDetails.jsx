import React, { useMemo } from "react";
import { usePage } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import SeaVehicleImages from "../../components/SeaVehicleDetails/SeaVehicleImages";
import SeaVehicleSearch from "../../components/SeaVehicleDetails/SeaVehicleSearch";
import SeaVehicleInfo from "../../components/SeaVehicleDetails/SeaVehicleInfo";
import Suggestions from "../../components/SeaVehicleDetails/Suggestions";
import bg from "../../assets/rentAVehicle/bg/bg.png";

const SeaVehicleDetails = () => {
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
            <div className="main-content flex justify-center items-center">
                <div className="py-10 md:px-10 flex flex-col xl:flex-row justify-between w-full gap-10">
                    <div className="flex flex-col gap-10 justify-start items-center w-full">
                        <SeaVehicleImages />
                        <SeaVehicleInfo />
                    </div>
                    <div className="flex flex-col justify-start items-center gap-10">
                        {" "}
                        <SeaVehicleSearch />
                        <Suggestions />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeaVehicleDetails;
