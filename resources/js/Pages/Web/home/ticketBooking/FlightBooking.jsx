import React from "react";
import Header from "../client/ClientHeader";
import FlightForm from "../../components/ticketBooking/FlightForm";
import { usePage } from "@inertiajs/react";

const FlightBooking = () => {
    const { flash } = usePage().props;

    return (
        <div className="">
            <Header />

            {/* Success/Error Messages */}
            {flash.success && (
                <div className="mx-20 mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    {flash.success}
                </div>
            )}

            {flash.error && (
                <div className="mx-20 mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {flash.error}
                </div>
            )}

            <FlightForm />
        </div>
    );
};

export default FlightBooking;
