import React from "react";
import Header from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Hero from "../../components/client/ticketBooking/Hero";

const ClientTicketBookingDashboard = ({ bookings, monthlyData }) => {
    return (
        <div className="bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] min-h-screen">
            <Header />

            <BackToDashboard />

            <Hero bookings={bookings} monthlyData={monthlyData} />
        </div>
    );
};

export default ClientTicketBookingDashboard;
