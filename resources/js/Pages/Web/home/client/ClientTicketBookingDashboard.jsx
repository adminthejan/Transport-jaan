import React from "react";
import { Link } from "@inertiajs/react";
import Header from "./ClientHeader";
import Hero from "../../components/client/ticketBooking/Hero";

const ClientTicketBookingDashboard = ({ bookings, monthlyData }) => {
    return (
        <div className="bg-[#F4F6F9] min-h-screen">
            <Header />

            {/* Back Button */}
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
                <div className="py-3">
                    <Link
                        href="/clientAllBookings"
                        className="inline-flex items-center text-[#0955AC] hover:text-[#0744a0] font-medium text-[13.5px] transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Main Dashboard
                    </Link>
                </div>
            </div>

            <Hero bookings={bookings} monthlyData={monthlyData} />
        </div>
    );
};

export default ClientTicketBookingDashboard;
