import React from "react";
import { Head, usePage } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import FlightForm from "../../components/ticketBooking/FlightForm";
import { CheckCircle2, AlertCircle, PlaneTakeoff } from "lucide-react";

const FlightBooking = () => {
    const { flash } = usePage().props;

    return (
        <div className="bg-[#F6F7F9] min-h-screen">
            <Head title="Charter Flight Quote Request - Transport Jaan" />
            <Header />

            {/* Page header */}
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82]">
                <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-4">
                        <PlaneTakeoff className="w-7 h-7 text-yellow-400" />
                    </div>
                    <h1 className="text-white text-[26px] sm:text-[32px] font-[800]">
                        Request a Charter Flight Quote
                    </h1>
                    <p className="text-white/80 text-[13px] sm:text-[15px] mt-3 max-w-[560px] mx-auto">
                        We don't run scheduled flight inventory ourselves — tell us where and when you'd like
                        to fly, and our aviation partners will send you tailored pricing and availability.
                    </p>
                </div>
            </div>

            <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
                {/* Success message */}
                {flash?.success && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white border border-emerald-100 shadow-[0_2px_10px_rgba(15,23,42,0.05)] p-5">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[14px] font-[700] text-[#0F172A]">Quote request received</p>
                            <p className="text-[13px] text-[#64748B] mt-0.5">{flash.success}</p>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {flash?.error && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white border border-red-100 shadow-[0_2px_10px_rgba(15,23,42,0.05)] p-5">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-[14px] font-[700] text-[#0F172A]">Something went wrong</p>
                            <p className="text-[13px] text-[#64748B] mt-0.5">{flash.error}</p>
                        </div>
                    </div>
                )}

                <FlightForm />
            </div>
        </div>
    );
};

export default FlightBooking;
