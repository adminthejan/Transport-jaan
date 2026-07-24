import React from "react";
import { Head } from "@inertiajs/react";
import Header from "./client/ClientHeader";
import HeroSection from "../components/trackCouriers/HeroSection";
import TrackForm from "../components/trackCouriers/TrackForm";
import Map from "../components/trackCouriers/Map";
import History from "../components/trackCouriers/History";
import Footer from "../layouts/Footer";

export default function TrackCouriersForm() {
    return (
        <div>
            <Header />
            <HeroSection />
            <TrackForm />
            <Map />
            <History />
            <Footer />
        </div>
    );
}
