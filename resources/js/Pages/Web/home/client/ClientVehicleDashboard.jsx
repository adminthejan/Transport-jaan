import React from "react";
import { Head } from "@inertiajs/react";
import ClientHeader from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Hero from "../../components/client/Hero";

const ClientVehicleDashboard = ({ bookings = [], vehicles = [], monthlyData = [] }) => {
    return (
        <div className="bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] min-h-screen">
            <Head title="Vehicle Rentals Dashboard" />
            <ClientHeader />

            <BackToDashboard />

            <Hero bookings={bookings} vehicles={vehicles} monthlyData={monthlyData} />
        </div>
    );
};

export default ClientVehicleDashboard;
