import React, { useState, useRef, useEffect } from "react";
import { Users, Minus, Plus } from "lucide-react";
import { FieldLabel } from "./FormElements";

const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First"];

const TIERS = [
  { key: "adults", label: "Adults", hint: "12+ years", min: 1 },
  { key: "children", label: "Children", hint: "2-11 years", min: 0 },
];

/**
 * Skyscanner-style "N travellers, Economy" popover — adult/child steppers
 * (visually matching PassengerSelector.jsx's counters) plus a cabin-class
 * chip select. Pure UI state; the caller folds a summary of it into the
 * existing `special_requests` field rather than this component talking to
 * the backend directly.
 */
const TravellersCabinField = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const update = (patch) => onChange({ ...value, ...patch });
  const bump = (key, delta, min = 0) => update({ [key]: Math.max(min, (value[key] || 0) + delta) });

  const total = (value.adults || 0) + (value.children || 0);

  return (
    <div className="relative" ref={ref}>
      <FieldLabel>TRAVELLERS &amp; CLASS</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-[56px] rounded-[14px] border flex items-center gap-3 px-4 text-left text-[14px] font-[600] text-[#0B1B34] transition-all duration-200 cursor-pointer ${
          open ? "bg-white border-[#0955AC]/40 shadow-[0_0_0_4px_rgba(9,85,172,0.10)]" : "bg-[#F8FAFC] border-transparent hover:bg-[#F1F5F9]"
        }`}
      >
        <span className="w-8 h-8 rounded-full bg-[#EAF1FE] flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-[#0955AC]" />
        </span>
        <span className="truncate">
          {total} traveller{total === 1 ? "" : "s"}, {value.cabinClass}
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-[290px] right-0 rounded-[18px] border border-black/5 bg-white shadow-[0_20px_50px_rgba(11,27,52,0.18)] p-5">
          {TIERS.map((tier) => (
            <div key={tier.key} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-[13px] font-[700] text-[#0F172A]">{tier.label}</p>
                <p className="text-[11px] text-[#94A3B8]">{tier.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => bump(tier.key, -1, tier.min)}
                  disabled={(value[tier.key] || 0) <= tier.min}
                  className="w-8 h-8 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#0955AC] hover:bg-[#0955AC]/10 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-4 text-center text-[14px] font-[700] text-[#0F172A]">{value[tier.key] || 0}</span>
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

          <div className="border-t border-[#F1F5F9] mt-2 pt-4">
            <p className="text-[11px] font-[700] text-[#64748B] tracking-widest mb-2.5">CABIN CLASS</p>
            <div className="grid grid-cols-2 gap-2">
              {CABIN_CLASSES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ cabinClass: c })}
                  className={`px-3 py-2 rounded-[10px] text-[12.5px] font-[700] border transition-colors cursor-pointer ${
                    value.cabinClass === c
                      ? "bg-[#0955AC] text-white border-[#0955AC]"
                      : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0955AC]/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
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

export default TravellersCabinField;
