import React from 'react';
import Header from "./client/ClientHeader";
import  HeroSection from "../components/bookATicket/HeroSection"
import Footer from "../layouts/Footer";

const BookingHomePage = () => {
  return (
    <div>
      <Header />
      <HeroSection />
      <Footer />
    </div>
  );
};

export default BookingHomePage;