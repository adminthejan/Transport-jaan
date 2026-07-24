import React from "react";
import Header from "./client/ClientHeader";
import HeroSection from "../components/packageDelivery/HeroSection";
import Form from "../components/packageDelivery/Form"
import Footer from "../layouts/Footer";

const PackageDelivery = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            <Form />
            <Footer />
        </div>
    );
};

export default PackageDelivery;
