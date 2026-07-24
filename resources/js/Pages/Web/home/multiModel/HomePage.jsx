import React from "react";
import Header from "../client/ClientHeader";
import Hero from "../../components/multiModel/Hero";
import Destinations from "../../components/multiModel/Destinations";
import AboutUs from "../../components/multiModel/AboutUs";
import Journey from "../../components/multiModel/Journey";
import FAQ from "../../components/multiModel/FAQ";
import Review from "../../components/multiModel/Review";
import ContactUs from "../../components/multiModel/ContactUs";
import Footer from "../../layouts/Footer";

const HomePage = () => {
    return (
        <div>
            <Header />
            <Hero />
            <Destinations />
            <AboutUs />
            <Journey />
            <FAQ />
            <Review />
            <ContactUs />
            <Footer />
        </div>
    );
};

export default HomePage;
