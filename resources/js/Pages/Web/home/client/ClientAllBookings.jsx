import React from "react";
import { Head } from "@inertiajs/react";
import Hero from "../../components/client/allBooking/Hero";

// Hero renders the full page chrome for this dashboard (persistent sidebar,
// topbar, content, right rail) — a self-contained shell, distinct from the
// site-wide ClientHeader used elsewhere.
const ClientAllBookings = ({ allBookings = [], statistics = {}, monthlyData = [] }) => {
    return (
        <>
            <Head title="Dashboard — All Bookings" />
            <Hero
                allBookings={allBookings}
                statistics={statistics}
                monthlyData={monthlyData}
            />
        </>
    );
};

export default ClientAllBookings;
