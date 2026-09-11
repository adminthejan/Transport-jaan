import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { Search, PackageSearch, Mail, KeyRound, Truck, Car, Ticket, AlertCircle } from "lucide-react";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";

// Every booking reference across the platform is PREFIX-XXXXXX-YY (see
// BookingReferenceGenerator::getBookingType()) plus courier's CR-XXXXXXXX —
// the prefix alone is enough to know which service's tracking page (and
// verification logic) to hand this off to, so this page doesn't need to
// duplicate any of that lookup logic itself.
const SERVICE_ROUTES = {
    CR: { path: "/track-shipment", label: "Courier Shipment", icon: PackageSearch },
    VEH: { path: "/track-vehicle-booking", label: "Vehicle Rental (Land)", icon: Car },
    AIR: { path: "/track-vehicle-booking", label: "Vehicle Rental (Air)", icon: Car },
    SEA: { path: "/track-vehicle-booking", label: "Vehicle Rental (Sea)", icon: Car },
    BUS: { path: "/track-ticket-booking", label: "Bus Ticket", icon: Ticket },
    TRN: { path: "/track-ticket-booking", label: "Train Ticket", icon: Ticket },
};

function detectService(reference) {
    const trimmed = reference.trim().toUpperCase();
    const prefix = trimmed.split("-")[0];
    return SERVICE_ROUTES[prefix] || null;
}

const EXAMPLES = [
    { label: "Courier", example: "CR-2026-000123", icon: PackageSearch },
    { label: "Vehicle Rental", example: "VEH-XXXXXX-YY", icon: Car },
    { label: "Bus / Train", example: "BUS-XXXXXX-YY", icon: Ticket },
];

const TrackOrder = () => {
    const [reference, setReference] = useState("");
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!reference.trim()) {
            setError("Please enter your booking or shipment reference.");
            return;
        }

        const service = detectService(reference);
        if (!service) {
            setError("We couldn't recognize that reference format. Double-check it against the examples below.");
            return;
        }

        const params = { reference: reference.trim().toUpperCase() };
        if (email.trim()) params.email = email.trim();
        if (pin.trim()) params.pin = pin.trim();

        router.get(service.path, params, { preserveScroll: true });
    };

    return (
        <div>
            <Header />
            <section className="mx-auto w-full max-w-3xl px-4 md:px-6 py-12 md:py-16">
                <div className="text-center mb-10">
                    <Truck className="w-10 h-10 text-[#0955AC] mx-auto mb-3" />
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Track Any Order</h1>
                    <p className="text-[#64748B] mt-2">
                        One box for everything — courier shipments, vehicle rentals, and bus/train tickets.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EEF2F6] shadow-sm p-5 md:p-6 mb-6 space-y-3">
                    <div className="relative">
                        <PackageSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => { setReference(e.target.value); if (error) setError(""); }}
                            placeholder="Reference number, e.g. CR-2026-000123 or BUS-AB12CD-34"
                            className="w-full h-[52px] rounded-[12px] border border-[#E2E8F0] pl-12 pr-4 text-[14px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email on the booking"
                                className="w-full h-[52px] rounded-[12px] border border-[#E2E8F0] pl-12 pr-4 text-[14px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                placeholder="6-digit tracking PIN"
                                className="w-full h-[52px] rounded-[12px] border border-[#E2E8F0] pl-12 pr-4 text-[14px] font-[600] tracking-[0.3em] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[15px] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                    >
                        <Search className="w-[18px] h-[18px]" />
                        Track
                    </button>
                    <p className="text-[12px] text-[#94A3B8] text-center">
                        Your PIN was included in your booking confirmation email.
                    </p>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {EXAMPLES.map(({ label, example, icon: Icon }) => (
                        <div key={label} className="rounded-[12px] border border-[#EEF2F6] bg-white px-4 py-3 text-center">
                            <Icon className="w-4 h-4 text-[#0955AC] mx-auto mb-1.5" />
                            <p className="text-[12px] font-[700] text-[#0F172A]">{label}</p>
                            <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">{example}</p>
                        </div>
                    ))}
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default TrackOrder;
