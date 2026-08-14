import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { Search, Package, Truck, CheckCircle, Clock, MapPin, AlertCircle } from "lucide-react";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";

const STATUS_STYLES = {
    pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    confirmed: { label: "Confirmed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
    in_transit: { label: "In Transit", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck },
    out_for_delivery: { label: "Out for Delivery", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck },
    delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
};

const TrackShipment = ({ reference: initialReference, result, notFound }) => {
    const [reference, setReference] = useState(initialReference || "");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reference.trim()) return;
        router.get("/track-shipment", { reference: reference.trim() }, { preserveScroll: true });
    };

    const statusInfo = result ? (STATUS_STYLES[result.status] || STATUS_STYLES.pending) : null;
    const StatusIcon = statusInfo?.icon;

    return (
        <div>
            <Header />
            <section className="mx-auto w-full max-w-3xl px-4 md:px-6 py-12 md:py-16">
                <div className="text-center mb-10">
                    <Package className="w-10 h-10 text-[#0955AC] mx-auto mb-3" />
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Track Your Shipment</h1>
                    <p className="text-[#64748B] mt-2">Enter your courier reference number to see its status — no account needed.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-10">
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. CR-2026-000123"
                        className="flex-1 h-[52px] rounded-[12px] border border-[#E2E8F0] px-4 text-[14px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                    />
                    <button
                        type="submit"
                        className="h-[52px] px-8 bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] rounded-[12px] flex items-center justify-center gap-2 transition-colors"
                    >
                        <Search className="w-[18px] h-[18px]" />
                        Track
                    </button>
                </form>

                {notFound && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-[#EEF2F6] shadow-sm">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <p className="text-[#334155] font-[700]">We couldn't find a shipment with that reference number.</p>
                        <p className="text-[#94A3B8] text-[13px] mt-1">Double-check the reference and try again.</p>
                    </div>
                )}

                {result && (
                    <div className="bg-white rounded-2xl border border-[#EEF2F6] shadow-sm p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-[#F1F5F9]">
                            <div>
                                <p className="text-[12px] text-[#94A3B8] font-[600]">Reference</p>
                                <p className="text-[18px] font-[800] text-[#0F172A]">{result.code}</p>
                            </div>
                            {statusInfo && (
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-[700] text-[13px] ${statusInfo.color}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    {statusInfo.label}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-[#0955AC] mt-0.5" />
                                <div>
                                    <p className="text-[12px] text-[#94A3B8] font-[600]">From</p>
                                    <p className="text-[14px] font-[700] text-[#0F172A]">
                                        {result.from ? [result.from.city, result.from.country].filter(Boolean).join(", ") : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-[#EF3826] mt-0.5" />
                                <div>
                                    <p className="text-[12px] text-[#94A3B8] font-[600]">To</p>
                                    <p className="text-[14px] font-[700] text-[#0F172A]">
                                        {result.to ? [result.to.city, result.to.country].filter(Boolean).join(", ") : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-[15px] font-[800] text-[#0F172A] mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#0955AC]" />
                            Tracking History
                        </h3>
                        <div className="space-y-4">
                            {result.trackingEvents && result.trackingEvents.length > 0 ? (
                                result.trackingEvents.map((event) => (
                                    <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-[#E2E8F0] last:border-0 last:pb-0">
                                        <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-[#0955AC] border-2 border-white" />
                                        <div className="text-[12px] text-[#94A3B8] mb-1">
                                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}
                                        </div>
                                        <div className="text-[14px] font-[700] text-[#0F172A] mb-1">{event.status}</div>
                                        {event.location && <div className="text-[12px] text-[#64748B] mb-1">{event.location}</div>}
                                        {event.description && <div className="text-[12px] text-[#94A3B8]">{event.description}</div>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-[#94A3B8] text-[14px] text-center py-4">No tracking events yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </section>
            <Footer />
        </div>
    );
};

export default TrackShipment;
