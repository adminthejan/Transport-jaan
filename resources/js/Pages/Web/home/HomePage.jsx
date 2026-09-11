import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Header from "../../../../js/Pages/Web/home/client/ClientHeader";
import HeroSection from "../components/rentAVehicle/HeroSection";
import WhyChooseUs from "../components/rentAVehicle/WhyChooseUs";
import RentByBrands from "../components/rentAVehicle/RentByBrands";
import RentByBodyType from "../components/rentAVehicle/RentByBodyType";
import VehicleCollection from "../components/rentAVehicle/VehicleCollection";
import PopularRentals from "../components/rentAVehicle/PopularRentals";
import HowItWorks from "../components/rentAVehicle/HowItWorks";
import ContactStrip from "../components/rentAVehicle/ContactStrip";
import Footer from "../layouts/Footer";

const HomePage = ({ auth ,vehicles,selectedType}) => {
    const { bodyTypes } = usePage().props;

    const [formData, setFormData] = useState({
        pickupLocation: "",
        pickupDate: "",
        dropoffLocation: "",
        dropoffDate: "",
    });

    const [vehicleType, setVehicleType] = useState(selectedType || "land");

     const handleVehicleTypeChange =(newType) =>{
        setVehicleType(newType);   

        router.get(route("client.home", { type: newType }));
     }

    const handleFormChange = (newData) => setFormData(newData);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!auth?.user) {
            alert("You must be registered and logged in to find a vehicle.");
            window.location.href = "/register";
            return;
        }
        router.visit("/couriers", {
            data: { searchParams: formData },
            method: "get",
        });
    };

    return (
        <div className="relative flex flex-col">
            <Header />
            <HeroSection
                formData={formData}
                onFormChange={handleFormChange}
                onSubmit={handleFormSubmit}
                onVehicleTypeChange={handleVehicleTypeChange}
            />
            <WhyChooseUs />
            <RentByBrands selectedType={vehicleType} />
            <RentByBodyType selectedType={vehicleType} />
            <VehicleCollection vehicles={vehicles} selectedType={vehicleType} />
            <PopularRentals />
            <HowItWorks />
            <ContactStrip />
            <Footer />
        </div>
    );
};

export default HomePage;
