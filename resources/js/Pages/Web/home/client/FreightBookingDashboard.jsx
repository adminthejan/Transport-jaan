import React from 'react'
import Header from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Hero from "../../components/client/freightBooking/Hero";

const FreightBookingDashboard = () => {
  return (
    <div className="bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] min-h-screen">
     <Header />

     <BackToDashboard />

     <Hero />
    </div>
  )
}

export default FreightBookingDashboard;
