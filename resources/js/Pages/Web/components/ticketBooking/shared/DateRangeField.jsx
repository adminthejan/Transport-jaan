import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./flightDatePicker.css";
import { CalendarDays } from "lucide-react";
import { FieldLabel, FieldError } from "./FormElements";

// ISO ("YYYY-MM-DD") <-> Date helpers. Kept as ISO strings everywhere outside
// this component so the rest of the flow (query params, FlightForm's native
// date inputs) doesn't need to change shape.
const toISO = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");
const fromISO = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const formatShort = (d) => (d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : null);

/**
 * A single popover, Skyscanner-style date control — one click surfaces a
 * dual-month calendar instead of two separate native <input type="date">
 * fields. In "return" mode it's a range-select (depart + return highlighted
 * together); in "oneway" mode it's a single date.
 */
const DateRangeField = ({ isRange, departureDate, returnDate, onChange, error }) => {
  const [open, setOpen] = useState(false);
  const [monthsShown, setMonthsShown] = useState(typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2);
  const ref = useRef(null);

  useEffect(() => {
    const onResize = () => setMonthsShown(window.innerWidth < 640 ? 1 : 2);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const departure = fromISO(departureDate);
  const arrival = fromISO(returnDate);

  const handleChange = (dates) => {
    if (isRange) {
      const [start, end] = dates;
      onChange({ departureDate: toISO(start), returnDate: toISO(end) });
      if (start && end) setOpen(false);
    } else {
      onChange({ departureDate: toISO(dates), returnDate: "" });
      setOpen(false);
    }
  };

  const label = isRange
    ? departure
      ? `${formatShort(departure)} — ${arrival ? formatShort(arrival) : "Return"}`
      : "Departure — Return"
    : departure
    ? formatShort(departure)
    : "Select date";

  return (
    <div className="relative" ref={ref}>
      <FieldLabel>{isRange ? "DEPART — RETURN" : "DEPARTURE DATE"}</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-[56px] rounded-[14px] border flex items-center gap-3 px-4 text-left text-[14px] transition-all duration-200 cursor-pointer ${
          error
            ? "bg-red-50/60 border-red-300"
            : open
            ? "bg-white border-[#0955AC]/40 shadow-[0_0_0_4px_rgba(9,85,172,0.10)]"
            : "bg-[#F8FAFC] border-transparent hover:bg-[#F1F5F9]"
        }`}
      >
        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${error ? "bg-red-100" : "bg-[#EAF1FE]"}`}>
          <CalendarDays className={`w-4 h-4 ${error ? "text-red-500" : "text-[#0955AC]"}`} />
        </span>
        <span className={`font-[600] ${departure ? "text-[#0B1B34]" : "text-[#94A3B8] font-[500]"}`}>{label}</span>
      </button>
      <FieldError>{error}</FieldError>

      {open && (
        <div className="flight-datepicker absolute z-40 mt-2 bg-white rounded-[18px] border border-black/5 shadow-[0_20px_50px_rgba(11,27,52,0.18)] overflow-x-auto">
          <DatePicker
            inline
            selectsRange={isRange}
            startDate={isRange ? departure : undefined}
            endDate={isRange ? arrival : undefined}
            selected={!isRange ? departure : undefined}
            onChange={handleChange}
            minDate={new Date()}
            monthsShown={monthsShown}
          />
        </div>
      )}
    </div>
  );
};

export default DateRangeField;
