import React, { useMemo } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import FlightForm from "../../components/ticketBooking/FlightForm";
import { CheckCircle2, AlertCircle, PlaneTakeoff, PlaneLanding, CalendarDays, Users, ArrowRight, Sparkles } from "lucide-react";

// Illustrative example routes only — this platform runs on a "request a
// quote" model (no live flight inventory), so these are clearly labeled as
// examples rather than presented as bookable search results. Mirrors the
// shape of the flight entry already used in TicketBooking.jsx's popular
// routes list.
const EXAMPLE_ROUTES = [
    {
        operator: "Cinnamon Air",
        badge: "Scenic Seaplane",
        from: "Colombo (Waters Edge)",
        to: "Castlereagh (Hatton)",
        duration: "30m",
        price: "from USD 180",
        amenities: ["Seaplane", "Luggage 20kg", "VIP Lounge"],
    },
    {
        operator: "Charter Aviation Partner",
        badge: "Domestic Air",
        from: "Colombo (Ratmalana)",
        to: "Jaffna",
        duration: "~1h 15m",
        price: "from USD 220",
        amenities: ["Twin-Engine Aircraft", "6 Seats", "Door-to-Door Transfer"],
    },
    {
        operator: "Charter Aviation Partner",
        badge: "Domestic Air",
        from: "Colombo (BIA)",
        to: "Trincomalee",
        duration: "~1h",
        price: "from USD 250",
        amenities: ["Private Charter", "Flexible Schedule", "Priority Check-in"],
    },
];

const FlightBooking = () => {
    const { props: { flash }, url } = usePage();

    // Read back what was searched (if the visitor arrived via a search card)
    // to show a Skyscanner-style trip summary above the quote form.
    const search = useMemo(() => {
        if (typeof window === "undefined") return null;
        const sp = new URLSearchParams(window.location.search || "");
        const departure = sp.get("departure_airport");
        const arrival = sp.get("arriving_airport");
        if (!departure && !arrival) return null;
        return {
            departure,
            arrival,
            departureDate: sp.get("departure_date"),
            returnDate: sp.get("return_date"),
            tripType: sp.get("trip_type") || "oneway",
            travellers: sp.get("travellers_summary"),
        };
    }, [url]);

    const requestRouteQuote = (route) => {
        router.get("/flightBooking", {
            departure_airport: route.from,
            arriving_airport: route.to,
            subject: `${route.operator} — ${route.badge}`,
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    };

    return (
        <div className="bg-[#F6F7F9] min-h-screen">
            <Head title="Charter Flight Quote Request - Transport Jaan" />
            <Header />

            <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
                <ModuleTabs active="ticket" />
                <div className="mt-4 sm:mt-6">
                    <TicketSubTabs active="flight" />
                </div>
            </div>

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
                {/* Trip summary — echoes back what was searched, if the visitor arrived via a search card */}
                {search && (
                    <div className="mb-6 bg-white rounded-[18px] border border-black/5 shadow-[0_2px_10px_rgba(15,23,42,0.05)] p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2">
                            <PlaneTakeoff className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
                            <span className="text-[14px] font-[700] text-[#0F172A]">{search.departure || "?"}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
                        <div className="flex items-center gap-2">
                            <PlaneLanding className="w-4 h-4 text-[#EF3826] flex-shrink-0" />
                            <span className="text-[14px] font-[700] text-[#0F172A]">{search.arrival || "?"}</span>
                        </div>
                        {search.departureDate && (
                            <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-[600]">
                                <CalendarDays className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
                                {search.departureDate}{search.returnDate ? ` — ${search.returnDate}` : ""}
                            </div>
                        )}
                        {search.travellers && (
                            <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-[600]">
                                <Users className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
                                {search.travellers}
                            </div>
                        )}
                    </div>
                )}

                {/* Example routes — illustrative only (no live inventory), not search results */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-[#0955AC]" />
                        <h2 className="text-[12px] font-[700] text-[#64748B] uppercase tracking-widest">
                            Popular Charter Routes — For Illustration
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {EXAMPLE_ROUTES.map((route, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-[16px] border border-black/5 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
                            >
                                <div>
                                    <span className="inline-flex items-center gap-1 bg-[#EAF1FE] text-[#0955AC] text-[10.5px] font-[700] px-2.5 py-1 rounded-full mb-3">
                                        {route.badge}
                                    </span>
                                    <p className="text-[12px] text-[#64748B] font-[600] mb-1.5">{route.operator}</p>
                                    <div className="flex items-center gap-1.5 text-[13px] font-[700] text-[#0F172A] mb-1">
                                        <span className="truncate">{route.from}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                                        <span className="truncate">{route.to}</span>
                                    </div>
                                    <p className="text-[11px] text-[#94A3B8] mb-3">{route.duration}</p>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {route.amenities.map((a) => (
                                            <span key={a} className="text-[10px] font-[600] text-[#475569] bg-[#F8FAFC] border border-black/5 px-1.5 py-0.5 rounded">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F1F5F9]">
                                    <span className="text-[14px] font-[800] text-[#0955AC]">{route.price}</span>
                                    <button
                                        type="button"
                                        onClick={() => requestRouteQuote(route)}
                                        className="text-[11.5px] font-[700] text-[#0955AC] hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        Request Quote <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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
