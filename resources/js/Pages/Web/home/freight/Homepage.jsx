import React from "react";
import Header from "../client/ClientHeader";
import HeroSection from "../../components/freight/HeroSection";
import Brands from "../../components/freight/Brands";
import AboutUs from "../../components/freight/AboutUs";
import Explore from "../../components/freight/Explore";
import Why from "../../components/freight/why";
import ContactUs from "../../components/freight/ContactUs";
import FAQ from "../../components/freight/FAQ";
import Review from "../../components/freight/Review";
import Footer from "../../layouts/Footer";

const Homepage = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            <Brands />
            <AboutUs />
            <Explore />
            <Why />
            <ContactUs />
            <FAQ />
            <Review />
            <Footer />
        </div>
    );
};

export default Homepage;
