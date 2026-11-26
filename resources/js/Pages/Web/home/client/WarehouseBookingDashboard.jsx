import React from "react";
import { Head } from "@inertiajs/react";
import Header from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Hero from "../../components/client/warehouseBooking/Hero";

const WarehouseBookingDashboard = () => {
    return (
        <div className="bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] min-h-screen">
            <Head title="Warehouse Management Dashboard" />
            <Header />

            <BackToDashboard />

            <Hero />
        </div>
    );
};

export default WarehouseBookingDashboard;
