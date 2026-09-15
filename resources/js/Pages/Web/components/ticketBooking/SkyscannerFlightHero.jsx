import React, { useState, useRef, useEffect } from "react";
import { router } from "@inertiajs/react";
import {
  ArrowLeftRight,
  Bed,
  Bus,
  Car,
  Check,
  ChevronDown,
  Compass,
  Minus,
  Plane,
  Plus,
  Sparkles,
  TrainFront,
} from "lucide-react";
import SkyscannerTopBar from "./shared/SkyscannerTopBar";
import flightHeroImg from "../../assets/ticketBooking/flight_hero_2k.jpg";

const AIRPORTS = [
  { code: "CMB", name: "Bandaranaike International", city: "Colombo", country: "Sri Lanka", label: "Colombo (CMB)" },
  { code: "RML", name: "Ratmalana Airport", city: "Colombo", country: "Sri Lanka", label: "Colombo Ratmalana (RML)" },
  { code: "HRI", name: "Mattala Rajapaksa International", city: "Hambantota", country: "Sri Lanka", label: "Hambantota (HRI)" },
  { code: "JAF", name: "Jaffna Airport", city: "Jaffna", country: "Sri Lanka", label: "Jaffna (JAF)" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", label: "Dubai (DXB)" },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", label: "Doha (DOH)" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", label: "Singapore (SIN)" },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", label: "Bangkok (BKK)" },
  { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", label: "Kuala Lumpur (KUL)" },
  { code: "MLE", name: "Velana International", city: "Male", country: "Maldives", label: "Male (MLE)" },
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "India", label: "New Delhi (DEL)" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", country: "India", label: "Mumbai (BOM)" },
  { code: "MAA", name: "Chennai International", city: "Chennai", country: "India", label: "Chennai (MAA)" },
  { code: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom", label: "London Heathrow (LHR)" },
  { code: "LGW", name: "Gatwick Airport", city: "London", country: "United Kingdom", label: "London Gatwick (LGW)" },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", label: "New York (JFK)" },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", label: "Sydney (SYD)" },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia", label: "Melbourne (MEL)" },
];

const CABIN_CLASSES = ["Economy", "Premium Economy", "Business", "First class"];

const SkyscannerFlightHero = ({ onSelectTab }) => {
  const [tripType, setTripType] = useState("return"); // 'return', 'oneway', 'multicity'
  const [showTripTypeMenu, setShowTripTypeMenu] = useState(false);

  const [fromQuery, setFromQuery] = useState("Colombo (Any)");
  const [toQuery, setToQuery] = useState("");
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);

  // Dates
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [departDate, setDepartDate] = useState(today);
  const [returnDate, setReturnDate] = useState(nextWeek);

  // Travellers & Cabin
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [cabinClass, setCabinClass] = useState("Economy");
  const [showTravellersModal, setShowTravellersModal] = useState(false);

  // Checkboxes
  const [nearDepart, setNearDepart] = useState(false);
  const [nearArrive, setNearArrive] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [addHotel, setAddHotel] = useState(true);

  // Refs for outside click handling
  const tripMenuRef = useRef(null);
  const travellersRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (tripMenuRef.current && !tripMenuRef.current.contains(e.target)) {
        setShowTripTypeMenu(false);
      }
      if (travellersRef.current && !travellersRef.current.contains(e.target)) {
        setShowTravellersModal(false);
      }
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setFromFocused(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setToFocused(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const swapLocations = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const temp = fromQuery;
    setFromQuery(toQuery || "Colombo (Any)");
    setToQuery(temp);
  };

  const filteredFromAirports = AIRPORTS.filter((a) => {
    if (!fromQuery || fromQuery === "Colombo (Any)") return true;
    const q = fromQuery.toLowerCase();
    return (
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  });

  const filteredToAirports = AIRPORTS.filter((a) => {
    if (!toQuery) return true;
    const q = toQuery.toLowerCase();
    return (
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  });

  const travellersSummary = `${adults} Adult${adults > 1 ? "s" : ""}${
    childrenCount > 0 ? `, ${childrenCount} Child` : ""
  }, ${cabinClass}`;

  const handleSearch = (e) => {
    e.preventDefault();

    // Matches Skyscanner's own behaviour: searching opens the results in a
    // new tab rather than navigating the search page away.
    const params = new URLSearchParams({
      trip_type: tripType,
      departure_airport: fromQuery || "Colombo (CMB)",
      arriving_airport: toQuery || "Dubai (DXB)",
      departure_date: departDate,
      ...(tripType === "return" && returnDate ? { return_date: returnDate } : {}),
      travellers_summary: travellersSummary,
      direct_only: directOnly ? "1" : "0",
    });

    window.open(`/flightResults?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="skyscanner-experience bg-[#0B1B34] text-white w-full">
      <SkyscannerTopBar sticky />

      {/* Hero Body with High-Resolution Airplane Image */}
      <div className="relative overflow-hidden w-full lg:min-h-[500px] flex flex-col justify-center">
        {/* High Resolution Background Image & Overlays */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={flightHeroImg}
            alt="Commercial Flight"
            className="w-full h-full object-cover object-[62%_34%] opacity-100 transition-opacity duration-700"
          />
          {/* Subtle Protective Gradient: ensures text readability while letting the airliner shine with full clarity */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,27,52,0.22) 0%, rgba(11,27,52,0.05) 30%, rgba(11,27,52,0.45) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(11,27,52,0.35) 0%, transparent 45%)",
            }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-9 pb-14 sm:pb-20 w-full">
          {/* Ticket Switcher Component (Switch to Train & Bus Ticket pages) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Ticket Booking Modes Switcher */}
          <div className="inline-flex items-center p-1 bg-[#152A4A] rounded-full border border-white/15 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-2 bg-[#0955AC] text-white font-[700] text-[13px] px-4 sm:px-5 py-2 rounded-full shadow-sm cursor-default">
              <Plane className="w-4 h-4" />
              <span>Air Tickets</span>
            </div>

            <button
              type="button"
              onClick={() => router.visit("/busTicketBookingDetails")}
              className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/10 font-[600] text-[13px] px-4 sm:px-5 py-2 rounded-full transition-colors cursor-pointer"
              title="Switch to Bus Ticket Booking"
            >
              <Bus className="w-4 h-4 text-white/80" />
              <span>Bus Tickets</span>
            </button>

            <button
              type="button"
              onClick={() => router.visit("/trainTicketBookingDetails")}
              className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/10 font-[600] text-[13px] px-4 sm:px-5 py-2 rounded-full transition-colors cursor-pointer"
              title="Switch to Train Ticket Booking"
            >
              <TrainFront className="w-4 h-4 text-white/80" />
              <span>Train Tickets</span>
            </button>
          </div>

          {/* Additional Travel Services */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.visit("/warehouseList")}
              className="text-white/90 hover:text-white bg-[#152A4A]/80 hover:bg-[#152A4A] border border-white/20 hover:border-white/50 font-[600] text-[12.5px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Bed className="w-3.5 h-3.5 text-white/80" />
              <span>Stays</span>
            </button>
            <button
              type="button"
              onClick={() => router.visit("/vehicleList")}
              className="text-white/90 hover:text-white bg-[#152A4A]/80 hover:bg-[#152A4A] border border-white/20 hover:border-white/50 font-[600] text-[12.5px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Car className="w-3.5 h-3.5 text-white/80" />
              <span>Cars</span>
            </button>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-[800] tracking-tight leading-tight mb-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
          Millions of cheap flights. One simple search.
        </h1>

        {/* Top Dropdown Pills: Return / One way, Bags */}
        <div className="flex items-center gap-2 mb-3">
          {/* Trip Type Dropdown */}
          <div className="relative" ref={tripMenuRef}>
            <button
              type="button"
              onClick={() => setShowTripTypeMenu((v) => !v)}
              className="bg-[#152A4A] hover:bg-[#1D3A63] text-white text-[13px] font-[600] px-3.5 py-1.5 rounded-[8px] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>
                {tripType === "return" ? "Return" : tripType === "oneway" ? "One way" : "Multi-city"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTripTypeMenu ? "rotate-180" : ""}`} />
            </button>

            {showTripTypeMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-40 bg-white text-[#0F172A] rounded-[8px] shadow-xl border border-gray-100 py-1.5 z-40">
                {[
                  { id: "return", label: "Return" },
                  { id: "oneway", label: "One way" },
                  { id: "multicity", label: "Multi-city" },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => {
                      setTripType(t.id);
                      setShowTripTypeMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] font-[600] flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                      tripType === t.id ? "text-[#0955AC]" : "text-[#0F172A]"
                    }`}
                  >
                    {t.label}
                    {tripType === t.id && <Check className="w-4 h-4 text-[#0955AC]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bags / Class Dropdown */}
          <button
            type="button"
            onClick={() => setShowTravellersModal(true)}
            className="bg-[#152A4A] hover:bg-[#1D3A63] text-white text-[13px] font-[600] px-3.5 py-1.5 rounded-[8px] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Bags</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Connected Search Bar Form */}
        <form onSubmit={handleSearch}>
          <div className="bg-white rounded-[10px] sm:rounded-[12px] shadow-2xl p-1 grid grid-cols-1 lg:grid-cols-[1.4fr_auto_1.4fr_1fr_1fr_1.3fr_auto] items-stretch divide-y lg:divide-y-0 lg:divide-x divide-gray-200 border border-black/10">
            {/* From Segment */}
            <div className="relative p-2.5 sm:px-4 sm:py-2 flex flex-col justify-center" ref={fromRef}>
              <span className="text-[11px] font-[700] text-[#68697F] uppercase tracking-wider block mb-0.5">
                From
              </span>
              <input
                type="text"
                value={fromQuery}
                onFocus={() => setFromFocused(true)}
                onChange={(e) => setFromQuery(e.target.value)}
                placeholder="Country, city or airport"
                className="w-full text-[14px] font-[700] text-[#0F172A] placeholder:text-gray-400 focus:outline-none bg-transparent"
              />

              {fromFocused && (
                <div className="absolute left-0 top-full mt-2 w-full sm:w-[320px] bg-white rounded-[10px] shadow-2xl border border-gray-100 max-h-[260px] overflow-y-auto py-1 z-50 text-left">
                  <div className="px-3 py-1.5 text-[11px] font-[700] text-gray-400 uppercase">
                    Suggested Airports
                  </div>
                  {filteredFromAirports.map((airport) => (
                    <button
                      type="button"
                      key={airport.code}
                      onClick={() => {
                        setFromQuery(airport.label);
                        setFromFocused(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#EAF1FE] flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[13px] font-[700] text-[#0F172A]">{airport.city}</div>
                        <div className="text-[11.5px] text-gray-500">{airport.name}</div>
                      </div>
                      <span className="text-[11px] font-[800] bg-[#EAF1FE] text-[#0955AC] px-2 py-0.5 rounded">
                        {airport.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button ⇄ */}
            <div className="hidden lg:flex items-center justify-center px-1">
              <button
                type="button"
                onClick={swapLocations}
                title="Swap departure and destination"
                className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center shadow-sm text-gray-600 hover:text-[#0955AC] transition-colors cursor-pointer -mx-3.5 z-10"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* To Segment */}
            <div className="relative p-2.5 sm:px-4 sm:py-2 flex flex-col justify-center" ref={toRef}>
              <span className="text-[11px] font-[700] text-[#68697F] uppercase tracking-wider block mb-0.5">
                To
              </span>
              <input
                type="text"
                value={toQuery}
                onFocus={() => setToFocused(true)}
                onChange={(e) => setToQuery(e.target.value)}
                placeholder="Country, city or airport"
                className="w-full text-[14px] font-[700] text-[#0F172A] placeholder:text-gray-400 focus:outline-none bg-transparent"
              />

              {toFocused && (
                <div className="absolute left-0 top-full mt-2 w-full sm:w-[320px] bg-white rounded-[10px] shadow-2xl border border-gray-100 max-h-[260px] overflow-y-auto py-1 z-50 text-left">
                  <div className="px-3 py-1.5 text-[11px] font-[700] text-gray-400 uppercase">
                    Destinations
                  </div>
                  {filteredToAirports.map((airport) => (
                    <button
                      type="button"
                      key={airport.code}
                      onClick={() => {
                        setToQuery(airport.label);
                        setToFocused(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#EAF1FE] flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[13px] font-[700] text-[#0F172A]">{airport.city}</div>
                        <div className="text-[11.5px] text-gray-500">{airport.name}</div>
                      </div>
                      <span className="text-[11px] font-[800] bg-[#EAF1FE] text-[#0955AC] px-2 py-0.5 rounded">
                        {airport.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Depart Segment */}
            <div className="p-2.5 sm:px-4 sm:py-2 flex flex-col justify-center relative cursor-pointer">
              <span className="text-[11px] font-[700] text-[#68697F] uppercase tracking-wider block mb-0.5">
                Depart
              </span>
              <input
                type="date"
                value={departDate}
                min={today}
                onChange={(e) => setDepartDate(e.target.value)}
                className="w-full text-[13.5px] font-[700] text-[#0F172A] focus:outline-none bg-transparent cursor-pointer"
              />
            </div>

            {/* Return Segment */}
            <div
              className={`p-2.5 sm:px-4 sm:py-2 flex flex-col justify-center relative ${
                tripType === "oneway" ? "opacity-50 cursor-not-allowed bg-gray-50/50" : "cursor-pointer"
              }`}
            >
              <span className="text-[11px] font-[700] text-[#68697F] uppercase tracking-wider block mb-0.5">
                Return
              </span>
              {tripType === "oneway" ? (
                <span className="text-[13.5px] font-[600] text-gray-400">One way only</span>
              ) : (
                <input
                  type="date"
                  value={returnDate}
                  min={departDate || today}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full text-[13.5px] font-[700] text-[#0F172A] focus:outline-none bg-transparent cursor-pointer"
                />
              )}
            </div>

            {/* Travellers and cabin class Segment */}
            <div
              className="p-2.5 sm:px-4 sm:py-2 flex flex-col justify-center relative cursor-pointer"
              ref={travellersRef}
              onClick={() => setShowTravellersModal((v) => !v)}
            >
              <span className="text-[11px] font-[700] text-[#68697F] uppercase tracking-wider block mb-0.5">
                Travellers and cabin class
              </span>
              <div className="text-[13.5px] font-[700] text-[#0F172A] truncate">
                {travellersSummary}
              </div>

              {/* Travellers Popover */}
              {showTravellersModal && (
                <div
                  className="absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] bg-white rounded-[12px] shadow-2xl border border-gray-100 p-4 z-50 text-left text-[#0F172A]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="font-[700] text-[14px]">Cabin class</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 my-3">
                    {CABIN_CLASSES.map((cls) => (
                      <button
                        type="button"
                        key={cls}
                        onClick={() => setCabinClass(cls)}
                        className={`text-[12px] font-[600] py-1.5 px-2 rounded-[6px] border text-center transition-colors cursor-pointer ${
                          cabinClass === cls
                            ? "bg-[#0955AC] text-white border-[#0955AC]"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    {/* Adults */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-[700]">Adults</div>
                        <div className="text-[11px] text-gray-500">12+ years</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={adults <= 1}
                          onClick={() => setAdults((a) => Math.max(1, a - 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-[700] text-[14px]">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults((a) => Math.min(8, a + 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Children */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-[700]">Children</div>
                        <div className="text-[11px] text-gray-500">2 - 11 years</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={childrenCount <= 0}
                          onClick={() => setChildrenCount((c) => Math.max(0, c - 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-[700] text-[14px]">{childrenCount}</span>
                        <button
                          type="button"
                          onClick={() => setChildrenCount((c) => Math.min(6, c + 1))}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTravellersModal(false)}
                    className="mt-4 w-full bg-[#0955AC] text-white font-[700] text-[13px] py-2 rounded-[6px] hover:bg-[#073E82] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Blue Search Button in Current Theme */}
            <div className="p-1 flex items-center justify-center">
              <button
                type="submit"
                className="w-full lg:w-auto bg-[#0955AC] hover:bg-[#073E82] active:scale-[0.99] text-white font-[700] text-[16px] px-8 py-3.5 rounded-[8px] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(9,85,172,0.35)] transition-all cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* Skyscanner Checkboxes Row precisely aligned with search columns */}
          <div className="mt-3.5 px-1 text-[13px] font-[500] text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
              <div className="flex flex-wrap items-center gap-x-8 sm:gap-x-14 gap-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nearDepart}
                    onChange={(e) => setNearDepart(e.target.checked)}
                    className="rounded-[3px] border-white/40 text-[#0955AC] focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer accent-[#0955AC]"
                  />
                  <span>Add nearby airports</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nearArrive}
                    onChange={(e) => setNearArrive(e.target.checked)}
                    className="rounded-[3px] border-white/40 text-[#0955AC] focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer accent-[#0955AC]"
                  />
                  <span>Add nearby airports</span>
                </label>
              </div>

              {/* Right side: Add a place to stay */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addHotel}
                  onChange={(e) => setAddHotel(e.target.checked)}
                  className="rounded-[3px] border-[#0955AC] bg-[#0955AC] text-[#0955AC] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer accent-[#0955AC]"
                />
                <span>Add a place to stay</span>
              </label>
            </div>

            {/* Second row: Direct flights under first Add nearby airports */}
            <div className="mt-2 flex items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                  className="rounded-[3px] border-white/40 text-[#0955AC] focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4 cursor-pointer accent-[#0955AC]"
                />
                <span>Direct flights</span>
              </label>
            </div>
          </div>
        </form>

        {/* 4 Bottom Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8">
          <div
            onClick={() => router.visit("/flightResults")}
            className="bg-[#0B1B34]/65 hover:bg-[#0B1B34]/85 backdrop-blur-md border border-white/20 hover:border-white/40 px-5 py-3.5 rounded-[8px] flex items-center gap-3 cursor-pointer transition-all shadow-sm hover:shadow-md"
          >
            <Sparkles className="w-5 h-5 text-white shrink-0" />
            <span className="font-[700] text-[14px] text-white">Search with AI</span>
          </div>

          <div
            onClick={() => router.visit("/warehouseList")}
            className="bg-[#0B1B34]/65 hover:bg-[#0B1B34]/85 backdrop-blur-md border border-white/20 hover:border-white/40 px-5 py-3.5 rounded-[8px] flex items-center gap-3 cursor-pointer transition-all shadow-sm hover:shadow-md"
          >
            <Bed className="w-5 h-5 text-white shrink-0" />
            <span className="font-[700] text-[14px] text-white">Stays</span>
          </div>

          <div
            onClick={() => router.visit("/vehicleList")}
            className="bg-[#0B1B34]/65 hover:bg-[#0B1B34]/85 backdrop-blur-md border border-white/20 hover:border-white/40 px-5 py-3.5 rounded-[8px] flex items-center gap-3 cursor-pointer transition-all shadow-sm hover:shadow-md"
          >
            <Car className="w-5 h-5 text-white shrink-0" />
            <span className="font-[700] text-[14px] text-white">Cars</span>
          </div>

          <div
            onClick={() => router.visit("/flightResults")}
            className="bg-[#0B1B34]/65 hover:bg-[#0B1B34]/85 backdrop-blur-md border border-white/20 hover:border-white/40 px-5 py-3.5 rounded-[8px] flex items-center gap-3 cursor-pointer transition-all shadow-sm hover:shadow-md"
          >
            <Compass className="w-5 h-5 text-white shrink-0" />
            <span className="font-[700] text-[14px] text-white">Explore everywhere</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default SkyscannerFlightHero;
