import React from "react";
import Header from "./client/ClientHeader";
import Filter from "../components/driverSearchResults/Filter";
import HeroSection from "../components/driverDetails/HeroSection";
import ReviewSection from "../components/vehicleDetails/ReviewSection";
import Footer from "../layouts/Footer";

const DriverDetails = () => {
    return (
        <div>
            <Header />

            <div className="flex flex-row bg-[#E7E7E7] py-10">
                <Filter />

                <div className="w-full p-10 flex flex-col gap-10 items-center">
                    <HeroSection />
                    <ReviewSection/>
                </div>x
            </div>

            <Footer />
        </div>
    );
};

export default DriverDetails;
