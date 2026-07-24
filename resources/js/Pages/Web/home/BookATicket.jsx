import React, { useState } from "react";
import Header from "./client/ClientHeader";
import FilterSidebar from "../components/bookATicket/filters";
import SearchForm from "../components/bookATicket/SearchForm";
import Footer from "../layouts/Footer";

const BookATicket = () => {
    const [formData, setFormData] = useState({
        pickupLocation: "",
        pickupDate: "",
        dropoffLocation: "",
        dropoffDate: "",
    });

    const handleFormChange = (newData) => {
        setFormData(newData);
    };

    return (
        <div>
            <Header />
            <div className="flex flex-row bg-[#FFFFFF]">
                <FilterSidebar />
                <SearchForm
                    formData={formData}
                    onFormChange={handleFormChange}
                />
            </div>

            <Footer />
        </div>
    );
};

export default BookATicket;
