import React from "react";
import ClientHeader from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Hero from "../../components/client/Hero";

const ClientVehicleDashboard = ({ bookings = [], vehicles = [], monthlyData = [] }) => {
    return (
        <div className="bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] min-h-screen">
            <ClientHeader />

            <BackToDashboard />

            <Hero bookings={bookings} vehicles={vehicles} monthlyData={monthlyData} />
        </div>
    );
};

export default ClientVehicleDashboard;
