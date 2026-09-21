import React, { useState } from "react";
import {
  ArrowRight,
  Heart,
  ChevronDown,
  Luggage,
  Utensils,
  Wifi,
  Zap,
  Clock,
  Plane,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { formatDuration } from "./generateDummyFlights";

const STOP_LABEL = (flight) => {
  if (flight.stops === 0) return "Direct";
  return `${flight.stops} stop${flight.stops > 1 ? "s" : ""} · ${flight.layoverCity}`;
};

/**
 * Skyscanner Flight Result Row with Expandable Journey Details:
 * airline badge, flight times, duration, stops, price, deals count, and expandable timeline.
 */
const FlightResultCard = ({ flight, onSelect, compact = false }) => {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Simulated alternate provider prices
  const otherProviders = [
    { name: "Official Airline Direct", price: flight.price, badge: "Official" },
    { name: "Trip.com", price: flight.price + 6 },
    { name: "Expedia", price: flight.price + 11 },
    { name: "Booking.com", price: flight.price + 14 },
  ];

  return (
    <div
      className={`group relative bg-white rounded-[18px] border border-black/5 shadow-[0_2px_10px_rgba(11,27,52,0.05)] ${
        compact ? "p-4" : "p-4 sm:p-5 hover:shadow-[0_16px_32px_rgba(9,85,172,0.12)] hover:border-[#0955AC]/30"
      } transition-all duration-200 overflow-hidden`}
    >
      {!compact && (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-[600] text-[#0955AC] bg-[#EAF1FE] px-2.5 py-0.5 rounded-full">
              <Zap className="w-3 h-3 text-[#0955AC]" />
              <span>Emits {flight.co2Percent}% less CO2e than typical flights</span>
            </span>

            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              aria-label={saved ? "Remove from saved" : "Save flight"}
              className="text-gray-300 hover:text-[#EF3826] transition-colors cursor-pointer p-1"
            >
              <Heart className={`w-[18px] h-[18px] ${saved ? "fill-[#EF3826] text-[#EF3826]" : ""}`} />
            </button>
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Airline & Flight Number */}
        <div className="flex items-center gap-3 sm:w-[190px] shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-[800] text-white text-[13px] shadow-sm flex-shrink-0"
            style={{ backgroundColor: flight.logoBg || "#0955AC" }}
          >
            {flight.airlineCode}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-[800] text-[#0B1B34] truncate">{flight.airline}</p>
            <p className="text-[11px] font-[600] text-[#94A3B8]">{flight.flightNumber}</p>
          </div>
        </div>

        {/* Times & Journey Path */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
          <div className="text-left">
            <p className="text-[17px] sm:text-[20px] font-[800] text-[#0B1B34] leading-none">{flight.departTime}</p>
            <p className="text-[11.5px] font-[700] text-[#64748B] mt-1">{flight.departAirport?.split(" ")[0] || "CMB"}</p>
          </div>

          <div className="flex-1 flex flex-col items-center min-w-[80px]">
            <span className="text-[11px] font-[700] text-[#94A3B8] mb-1">{formatDuration(flight.durationMinutes)}</span>
            <div className="w-full h-[2px] bg-[#E2E8F0] relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0955AC]" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0955AC]" />
              {flight.stops > 0 && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-white shadow-sm" />
              )}
            </div>
            <span
              className={`text-[10.5px] font-[700] mt-1 ${
                flight.stops === 0 ? "text-emerald-600" : "text-[#B45309]"
              }`}
            >
              {STOP_LABEL(flight)}
            </span>
          </div>

          <div className="text-right">
            <p className="text-[17px] sm:text-[20px] font-[800] text-[#0B1B34] leading-none">
              {flight.arriveTime}
              {flight.nextDayArrival && <sup className="text-[10.5px] font-[800] text-[#EF3826] ml-0.5">+1</sup>}
            </p>
            <p className="text-[11.5px] font-[700] text-[#64748B] mt-1">{flight.arriveAirport?.split(" ")[0] || "DXB"}</p>
          </div>
        </div>

        {/* Price & CTA */}
        {!compact && (
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1.5 sm:w-[150px] shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]">
            <div className="text-left sm:text-right">
              <span className="text-[10.5px] text-[#94A3B8] font-[600] block">{flight.dealsCount} deals from</span>
              <span className="text-[20px] sm:text-[23px] font-[800] text-[#0955AC] leading-none">${flight.price}</span>
              <span className="text-[#94A3B8] text-[10.5px] font-[600] block mt-0.5">per person</span>
            </div>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(flight)}
                className="poppins bg-[#0955AC] hover:bg-[#073E82] active:scale-[0.98] text-white text-[12.5px] font-[700] py-2 px-5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                Select
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Flight Details Toggle Bar */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[12px] font-[700] text-[#64748B]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <Luggage className="w-3.5 h-3.5 text-[#0955AC]" />
              <span>{flight.baggage?.split("·")[0] || "30kg Baggage"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <Utensils className="w-3.5 h-3.5 text-[#0955AC]" />
              <span>In-flight Meal</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-500 hidden sm:inline-flex">
              <Wifi className="w-3.5 h-3.5 text-[#0955AC]" />
              <span>Wi-Fi</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[#0955AC] hover:text-[#073E82] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{expanded ? "Hide flight details" : "Flight details"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* Expandable Flight Timeline & Breakdown */}
      {expanded && !compact && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 bg-[#F8FAFC] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-5 space-y-4">
          <div className="flex items-center justify-between text-[12px] font-[700] text-[#0B1B34] border-b border-gray-200 pb-2">
            <span>Flight Journey & Aircraft Information</span>
            <span className="text-[#0955AC]">{flight.aircraft}</span>
          </div>

          {/* Segment 1 */}
          <div className="relative pl-6 border-l-2 border-[#0955AC] space-y-2 py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-[800] text-[#0B1B34]">{flight.departTime} · {flight.departAirport}</p>
                <p className="text-[11.5px] text-[#64748B]">{flight.departTerminal}</p>
              </div>
              <span className="text-[11.5px] font-[700] text-[#0955AC] bg-[#EAF1FE] px-2.5 py-0.5 rounded">
                Flight {flight.flightNumber}
              </span>
            </div>

            <div className="text-[12px] text-[#64748B] flex items-center gap-4 py-1">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Flight time: {formatDuration(flight.durationMinutes)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Plane className="w-3.5 h-3.5" />
                <span>{flight.aircraft}</span>
              </span>
            </div>

            {flight.stops > 0 && (
              <div className="my-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{flight.layoverDuration || "1h 45m"}</strong> connection in <strong>{flight.layoverCity}</strong>. Checked luggage is transferred automatically.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[14px] font-[800] text-[#0B1B34]">{flight.arriveTime} · {flight.arriveAirport}</p>
                <p className="text-[11.5px] text-[#64748B]">{flight.arriveTerminal}</p>
              </div>
            </div>
          </div>

          {/* Fare Inclusions & Amenities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[12px] text-[#475569]">
            <div className="bg-white p-3 rounded-[10px] border border-gray-200 space-y-1.5">
              <span className="font-[800] text-[#0B1B34] block">Included with Fare:</span>
              <p className="flex items-center gap-1.5">
                <Luggage className="w-3.5 h-3.5 text-[#0955AC]" />
                <span>{flight.baggage}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#0955AC]" />
                <span>{flight.meal}</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded-[10px] border border-gray-200 space-y-1.5">
              <span className="font-[800] text-[#0B1B34] block">On-board Experience:</span>
              <p className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-[#0955AC]" />
                <span>{flight.wifi}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{flight.seatPitch}</span>
              </p>
            </div>
          </div>

          {/* Provider Price Comparison */}
          <div className="pt-2">
            <span className="text-[11px] font-[800] text-[#94A3B8] uppercase tracking-wider block mb-2">
              Compare All Booking Options
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {otherProviders.map((p) => (
                <div
                  key={p.name}
                  onClick={() => onSelect && onSelect(flight)}
                  className="bg-white p-2.5 rounded-[8px] border border-gray-200 hover:border-[#0955AC] flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <span className="text-[11.5px] font-[700] text-[#0B1B34] truncate">{p.name}</span>
                  <span className="text-[14px] font-[800] text-[#0955AC] mt-1">${p.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightResultCard;
