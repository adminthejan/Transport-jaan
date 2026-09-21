import React, { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight, Bus as BusIcon, Clock, TrainFront, Wallet } from "lucide-react";

/**
 * "Compare with Train/Bus" card shown on the bus/train results pages. Fetches
 * a same-route, same-date summary from the counterpart mode (matched by
 * city, since bus and train stations are separate named datasets) and shows
 * the cheapest/fastest options side by side.
 *
 * `mode` is the mode currently being viewed ("bus" shows a Train comparison,
 * "train" shows a Bus comparison). `ownSummary` is the already-loaded
 * current-mode summary ({ cheapest, fastest }) so no extra request is needed
 * for that side.
 */
const TransportCompareCard = ({ mode, fromCity, toCity, date, ownSummary }) => {
    const [compare, setCompare] = useState(null);
    const [loading, setLoading] = useState(false);

    const otherMode = mode === "bus" ? "train" : "bus";
    const OtherIcon = otherMode === "train" ? TrainFront : BusIcon;
    const OwnIcon = mode === "train" ? TrainFront : BusIcon;

    useEffect(() => {
        if (!fromCity || !toCity || !date) {
            setCompare(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams({ mode, fromCity, toCity, date });
        fetch(`/transport/compare?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setCompare(data);
            })
            .catch(() => {
                if (!cancelled) setCompare(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [mode, fromCity, toCity, date]);

    if (!fromCity || !toCity || !date) return null;
    if (loading) return null;
    if (!compare || !compare.available) return null;

    return (
        <div className="mb-6 rounded-[16px] border border-[#EEF2F6] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="w-4 h-4 text-[#0955AC] rotate-90 sm:rotate-0" />
                <h3 className="text-[14px] sm:text-[15px] font-[800] text-[#0F172A]">
                    Compare with {otherMode === "train" ? "Train" : "Bus"}
                </h3>
                <span className="text-[11px] text-[#94A3B8] font-[600]">
                    {compare.count} option{compare.count === 1 ? "" : "s"} found for this route
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Current mode */}
                <div className="rounded-[14px] border border-[#0955AC]/15 bg-[#0955AC]/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <OwnIcon className="w-4 h-4 text-[#0955AC]" />
                        <span className="text-[13px] font-[800] text-[#0955AC] uppercase tracking-wide">
                            {mode === "train" ? "Train" : "Bus"} (current)
                        </span>
                    </div>
                    {ownSummary?.cheapest ? (
                        <div className="space-y-1.5 text-[13px] text-[#334155]">
                            <div className="flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-[#0955AC]" />
                                From LKR {Math.round(ownSummary.cheapest.price).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#0955AC]" />
                                Fastest: {ownSummary.fastest?.duration || ownSummary.cheapest.duration}
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] text-[#94A3B8]">See results below</p>
                    )}
                </div>

                {/* Counterpart mode */}
                <div className="rounded-[14px] border border-[#EEF2F6] bg-[#F8FAFC] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <OtherIcon className="w-4 h-4 text-[#64748B]" />
                        <span className="text-[13px] font-[800] text-[#334155] uppercase tracking-wide">
                            {otherMode === "train" ? "Train" : "Bus"}
                        </span>
                    </div>
                    <div className="space-y-1.5 text-[13px] text-[#334155] mb-3">
                        <div className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#64748B]" />
                            From LKR {Math.round(compare.cheapest.price).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                            Fastest: {compare.fastest.duration}
                        </div>
                    </div>
                    <Link
                        href={compare.searchUrl}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-[700] text-[#0955AC] hover:underline"
                    >
                        See {otherMode === "train" ? "Train" : "Bus"} options
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default TransportCompareCard;
