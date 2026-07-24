import React from "react";
import Header from "../client/ClientHeader";
import HeroSection from "../../components/driver/driverCourierTrack/HeroSection";
import TrackForm from "../../components/driver/driverCourierTrack/TrackForm";
import Map from "../../components/driver/driverCourierTrack/Map";
import AvailableDelivery from "../../components/driver/driverCourierTrack/AvailableDelivery";
import Footer from "../../layouts/Footer";

const DriverCourierTrack = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            <TrackForm />
            <Map />
            <AvailableDelivery />
            <Footer />
        </div>
    );
};

export default DriverCourierTrack;
