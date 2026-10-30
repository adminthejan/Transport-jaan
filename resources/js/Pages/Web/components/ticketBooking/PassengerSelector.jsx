import React, { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus, GraduationCap, Accessibility } from "lucide-react";

// Modern pill switch, replacing a plain native checkbox for the
// student/wheelchair flags.
const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors duration-200 cursor-pointer ${
            checked ? "bg-[#0955AC]" : "bg-[#E2E8F0]"
        }`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                checked ? "translate-x-4" : "translate-x-0"
            }`}
        />
    </button>
);

/**
 * "Passengers" field that opens a popover with age-tier counters (matching
 * how most booking sites split fares: adult / youth / senior) plus student
 * and wheelchair-accessibility flags. Used by both Bus and Train search.
 *
 * `value` shape: { adults, youth, seniors, student, wheelchair, wheelchairPassengers }
 * `wheelchairPassengers` lists which individual passengers use a wheelchair
 * (ids like "adult-2"), so with several passengers the buyer says *who* needs it.
 */
export const passengerList = (value) => {
    const make = (key, label, count) =>
        Array.from({ length: count || 0 }, (_, i) => ({ id: `${key}-${i + 1}`, label: `${label} ${i + 1}` }));
    return [
        ...make("adult", "Adult", value.adults),
        ...make("youth", "Youth", value.youth),
        ...make("senior", "Senior", value.seniors),
    ];
};
const PassengerSelector = ({ value, onChange, label = "Passengers" }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const update = (patch) => onChange({ ...value, ...patch });
    // When a passenger count changes, drop wheelchair picks that no longer exist.
    const bump = (key, delta, min = 0) => {
        const next = { ...value, [key]: Math.max(min, (value[key] || 0) + delta) };
        if (value.wheelchair) {
            const valid = new Set(passengerList(next).map((p) => p.id));
            let picked = (value.wheelchairPassengers || []).filter((id) => valid.has(id));
            if (picked.length === 0) picked = [passengerList(next)[0].id];
            next.wheelchairPassengers = picked;
        }
        onChange(next);
    };

    const passengers = passengerList(value);
    const toggleWheelchair = (on) => {
        if (!on) return update({ wheelchair: false, wheelchairPassengers: [] });
        update({ wheelchair: true, wheelchairPassengers: passengers.length ? [passengers[0].id] : [] });
    };
    const toggleWheelchairPassenger = (id) => {
        const current = value.wheelchairPassengers || [];
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        if (next.length === 0) return; // at least one; use the switch to turn it off
        update({ wheelchairPassengers: next });
    };

    const total = (value.adults || 0) + (value.youth || 0) + (value.seniors || 0);

    const tiers = [
        { key: "adults", label: "Adults", hint: "18-59 years", min: 1 },
        { key: "youth", label: "Youth", hint: "0-17 years", min: 0 },
        { key: "seniors", label: "Seniors", hint: "60+ years", min: 0 },
    ];

    return (
        <div className="relative" ref={containerRef}>
            <label className="block mb-1 text-[10.5px] font-[700] text-[#64748B] tracking-wider uppercase">
                {label.toUpperCase()}
            </label>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full h-[46px] sm:h-[48px] rounded-[11px] border flex items-center gap-2.5 px-3 sm:px-3.5 text-left text-[13.5px] sm:text-[14px] font-[600] text-[#0F172A] transition-all duration-200 cursor-pointer focus:outline-none bg-white ${
                    open
                        ? "border-[#0955AC] shadow-[0_0_0_3px_rgba(9,85,172,0.10)]"
                        : "border-[#0000001A] hover:border-[#0955AC]/40"
                }`}
            >
                <span className="w-7 h-7 rounded-full bg-[#EAF1FE] flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-[#0955AC]" />
                </span>
                <span>
                    {total} passenger{total === 1 ? "" : "s"}
                    {(value.student || value.wheelchair) && (
                        <span className="text-[11px] text-[#0955AC] ml-1">
                            ({[value.student && "Student", value.wheelchair && `Wheelchair ×${(value.wheelchairPassengers || []).length || 1}`].filter(Boolean).join(", ")})
                        </span>
                    )}
                </span>
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-[18px] border border-black/5 bg-white shadow-[0_20px_50px_rgba(11,27,52,0.18)] p-5">
                    {tiers.map((tier) => (
                        <div key={tier.key} className="flex items-center justify-between py-2.5">
                            <div>
                                <p className="text-[13px] font-[700] text-[#0F172A]">{tier.label}</p>
                                <p className="text-[11px] text-[#94A3B8]">{tier.hint}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => bump(tier.key, -1, tier.min)}
                                    className="w-8 h-8 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#0955AC] hover:bg-[#0955AC]/10 disabled:opacity-30 transition-colors cursor-pointer"
                                    disabled={(value[tier.key] || 0) <= tier.min}
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-4 text-center text-[14px] font-[700] text-[#0F172A]">
                                    {value[tier.key] || 0}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => bump(tier.key, 1)}
                                    className="w-8 h-8 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#0955AC] hover:bg-[#0955AC]/10 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="border-t border-[#F1F5F9] mt-2 pt-4 space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2.5">
                                <GraduationCap className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
                                <span>
                                    <span className="block text-[13px] font-[700] text-[#0F172A]">Students</span>
                                    <span className="block text-[11px] text-[#94A3B8]">Discounts may apply with a valid student ID.</span>
                                </span>
                            </span>
                            <Toggle checked={!!value.student} onChange={(checked) => update({ student: checked })} />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2.5">
                                <Accessibility className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
                                <span>
                                    <span className="block text-[13px] font-[700] text-[#0F172A]">Wheelchair</span>
                                    <span className="block text-[11px] text-[#94A3B8]">Passengers travelling with a wheelchair.</span>
                                </span>
                            </span>
                            <Toggle checked={!!value.wheelchair} onChange={toggleWheelchair} />
                        </label>
                        {value.wheelchair && passengers.length > 1 && (
                            <div className="rounded-[12px] bg-[#F4F8FD] border border-[#0955AC]/15 p-3">
                                <p className="text-[12px] font-[700] text-[#0F172A] mb-2">Who will use the wheelchair?</p>
                                <div className="flex flex-wrap gap-2">
                                    {passengers.map((p) => {
                                        const on = (value.wheelchairPassengers || []).includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => toggleWheelchairPassenger(p.id)}
                                                aria-pressed={on}
                                                className={`px-3 py-1.5 rounded-full border text-[12px] font-[600] transition-colors cursor-pointer ${
                                                    on
                                                        ? "bg-[#0955AC] border-[#0955AC] text-white"
                                                        : "bg-white border-[#CBD5E1] text-[#475569] hover:border-[#0955AC]"
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="w-full mt-5 py-2.5 rounded-[10px] bg-gradient-to-r from-[#0955AC] to-[#073E82] text-white text-[13px] font-[700] hover:shadow-[0_8px_20px_rgba(9,85,172,0.3)] transition-shadow cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};

export default PassengerSelector;
