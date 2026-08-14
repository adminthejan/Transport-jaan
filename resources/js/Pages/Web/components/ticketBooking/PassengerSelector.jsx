import React, { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus, GraduationCap, Accessibility } from "lucide-react";

/**
 * "Passengers" field that opens a popover with age-tier counters (matching
 * how most booking sites split fares: adult / youth / senior) plus student
 * and wheelchair-accessibility flags. Used by both Bus and Train search.
 *
 * `value` shape: { adults, youth, seniors, student, wheelchair }
 */
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
    const bump = (key, delta, min = 0) => update({ [key]: Math.max(min, (value[key] || 0) + delta) });

    const total = (value.adults || 0) + (value.youth || 0) + (value.seniors || 0);

    const tiers = [
        { key: "adults", label: "Adults", hint: "19-59 years", min: 1 },
        { key: "youth", label: "Youth", hint: "0-18 years", min: 0 },
        { key: "seniors", label: "Seniors", hint: "60+ years", min: 0 },
    ];

    return (
        <div className="relative" ref={containerRef}>
            <label className="block mb-1 text-[11px] font-[700] text-[#64748B] tracking-widest">
                {label.toUpperCase()}
            </label>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full h-[52px] rounded-[12px] border border-[#E2E8F0] bg-white pl-11 pr-4 text-left text-[14px] font-[600] text-[#0F172A] relative focus:outline-none focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
            >
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
                {total} passenger{total === 1 ? "" : "s"}
                {(value.student || value.wheelchair) && (
                    <span className="text-[11px] text-[#0955AC] ml-1">
                        ({[value.student && "Student", value.wheelchair && "Wheelchair"].filter(Boolean).join(", ")})
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute z-30 mt-2 w-[300px] rounded-[14px] border border-[#E2E8F0] bg-white shadow-xl p-4">
                    {tiers.map((tier) => (
                        <div key={tier.key} className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-[13px] font-[700] text-[#0F172A]">{tier.label}</p>
                                <p className="text-[11px] text-[#94A3B8]">{tier.hint}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => bump(tier.key, -1, tier.min)}
                                    className="w-7 h-7 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#0955AC] hover:bg-[#0955AC]/10 disabled:opacity-30"
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
                                    className="w-7 h-7 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#0955AC] hover:bg-[#0955AC]/10"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="border-t border-[#F1F5F9] mt-2 pt-3 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-[#0955AC]" />
                                <span>
                                    <span className="block text-[13px] font-[700] text-[#0F172A]">Students</span>
                                    <span className="block text-[11px] text-[#94A3B8]">Discounts may apply with a valid student ID.</span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={!!value.student}
                                onChange={(e) => update({ student: e.target.checked })}
                                className="w-9 h-5 accent-[#0955AC]"
                            />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="flex items-center gap-2">
                                <Accessibility className="w-4 h-4 text-[#0955AC]" />
                                <span>
                                    <span className="block text-[13px] font-[700] text-[#0F172A]">Wheelchair</span>
                                    <span className="block text-[11px] text-[#94A3B8]">Passengers travelling with a wheelchair.</span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={!!value.wheelchair}
                                onChange={(e) => update({ wheelchair: e.target.checked })}
                                className="w-9 h-5 accent-[#0955AC]"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="w-full mt-4 py-2 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] hover:bg-[#073E82] transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};

export default PassengerSelector;
