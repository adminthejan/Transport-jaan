import React, { useState } from "react";
import Header from "./client/ClientHeader";
import Filter from "../components/driverSearchResults/Filter";
import SearchForm from "../components/driverSearchResults/SearchForm";
import DriversList from "../components/driverSearchResults/DriversList";
import Footer from "../layouts/Footer";

const DriverSearchResults = () => {
    // Add state for formData
    const [formData, setFormData] = useState({
        pickupLocation: "",
        pickupDate: "",
        dropoffLocation: "",
        dropoffDate: "",
    });

    // Add handler to update formData
    const handleFormChange = (newFormData) => {
        setFormData(newFormData);
    };

    return (
        <div>
            <Header />

            <div className="flex flex-row">
                <Filter />

                <div className="w-full">
                    <SearchForm
                        formData={formData}
                        onFormChange={handleFormChange}
                    />
                    <DriversList />
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default DriverSearchResults;
