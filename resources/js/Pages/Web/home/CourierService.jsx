import React from "react";
import { Link } from "@inertiajs/react";
import Header from "./client/ClientHeader";
import HeroSection from "../components/courierService/HeroSection";
import WhyOurService from "../components/courierService/WhyOurService";
import Process from "../components/courierService/Process";
import Services from "../components/courierService/Services";
import ShippingSolution from "../components/courierService/ShippingSolution";
import FAQ from "../components/courierService/FAQ";
import Footer from "../layouts/Footer";

const CourierService = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            <WhyOurService />
            <Process />
            <Services />
            {/* <ShippingSolution /> */}
            <FAQ />
            <Footer />
        </div>
    );
};

export default CourierService;
