import React from "react";
import Header from "./client/ClientHeader";
import HeroSection from "../components/driverBooking/HeroSection";
import About from "../components/driverBooking/About";
import FeaturedService from "../components/driverBooking/FeaturedService";
import DriversProfile from "../components/driverBooking/DriversProfile";
import HowsItWorks from "../components/driverBooking/HowsItWorks";
import FAQ from "../components/driverBooking/FAQ"
import ClientSay from "../components/driverBooking/ClientsSay"
import Footer from "../layouts/Footer";

const DriversHomePage = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            <About />
            <FeaturedService />
            <DriversProfile />
            <HowsItWorks />
            <FAQ />
            <ClientSay />
            <Footer />
        </div>
    );
};

export default DriversHomePage;
