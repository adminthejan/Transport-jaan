import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { Search, Mail, KeyRound, AlertCircle, ArrowRight, PackageSearch } from "lucide-react";

const STATUS_STYLES = {
    confirmed: "bg-green-50 text-green-700",
    paid: "bg-green-50 text-green-700",
    completed: "bg-green-50 text-green-700",
    delivered: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
};

const statusClass = (status) => STATUS_STYLES[String(status || "").toLowerCase()] || "bg-slate-100 text-slate-700";

/**
 * Compact "track a booking" widget: a search bar plus an inline result,
 * meant to live inside the nav bar's Track dropdown instead of sending
 * people to a separate page just to type a reference number. Falls back to
 * asking for email + PIN (same verification the full tracking pages use)
 * only when a booking is actually found and needs unlocking.
 */
const TrackWidget = ({ onNavigate }) => {
    const [reference, setReference] = useState("");
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // full JSON response from /track/lookup

    const runLookup = async (e) => {
        e?.preventDefault();
        if (!reference.trim()) {
            setResult({ status: "invalid", message: "Enter a reference number." });
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ reference: reference.trim().toUpperCase() });
            if (email.trim()) params.set("email", email.trim());
            if (pin.trim()) params.set("pin", pin.trim());

            const res = await fetch(`/track/lookup?${params.toString()}`);
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({ status: "invalid", message: "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={runLookup} className="space-y-2.5">
                <div className="relative">
                    <PackageSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0955AC] pointer-events-none" />
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => { setReference(e.target.value); setResult(null); }}
                        placeholder="Reference, e.g. BUS-AB12CD-34"
                        className="w-full h-[42px] rounded-[10px] border border-[#E2E8F0] pl-10 pr-3 text-[13px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                    />
                </div>

                {result?.status === "needs_verification" && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0955AC] pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full h-[38px] rounded-[9px] border border-[#E2E8F0] pl-8 pr-2 text-[12.5px] font-[600] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0955AC] pointer-events-none" />
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                placeholder="6-digit PIN"
                                className="w-full h-[38px] rounded-[9px] border border-[#E2E8F0] pl-8 pr-2 text-[12.5px] font-[600] tracking-[0.15em] text-[#0F172A] focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[38px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[13px] rounded-[9px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                    <Search className="w-3.5 h-3.5" />
                    {loading ? "Searching…" : result?.status === "needs_verification" ? "Verify & Track" : "Track"}
                </button>
            </form>

            {/* Simple result area */}
            {result && result.status === "invalid" && (
                <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-red-50 border border-red-200 px-3 py-2.5 text-[12px] text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {result.message}
                </div>
            )}

            {result && result.status === "not_found" && (
                <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-red-50 border border-red-200 px-3 py-2.5 text-[12px] text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    No booking found for that reference. Double-check it and try again.
                </div>
            )}

            {result && result.status === "needs_verification" && !result.message?.startsWith("We couldn't") && (
                <p className="mt-2.5 text-[11.5px] text-[#64748B]">
                    Found it — enter the email and PIN from your confirmation to view details.
                </p>
            )}

            {result && result.status === "result" && (
                <div className="mt-3 rounded-[12px] border border-[#EEF2F6] bg-[#F8FAFC] p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-[800] text-[#0F172A] truncate">{result.data.title}</span>
                        <span className={`shrink-0 text-[10.5px] font-[700] uppercase px-2 py-0.5 rounded-full ${statusClass(result.data.status)}`}>
                            {result.data.status}
                        </span>
                    </div>
                    {(result.data.from || result.data.to) && (
                        <p className="text-[12.5px] text-[#334155] font-[600] truncate">
                            {result.data.from || "—"} <span className="text-[#94A3B8]">→</span> {result.data.to || "—"}
                        </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[11.5px] text-[#64748B]">
                            {[result.data.date, result.data.amount].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                    <Link
                        href={result.detailsUrl}
                        onClick={onNavigate}
                        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-[700] text-[#0955AC] hover:underline"
                    >
                        View full details
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}
        </div>
    );
};

export default TrackWidget;
