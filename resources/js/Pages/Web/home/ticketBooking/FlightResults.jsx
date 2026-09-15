import React, { useMemo, useState } from "react";
import { Head, usePage, router, Link } from "@inertiajs/react";
import {
  Pencil,
  Plane,
  Zap,
  Star,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  BellRing,
  Sparkles,
  TrendingUp,
  X,
  Check,
  Calendar,
  Users,
  Search,
  ArrowLeftRight,
} from "lucide-react";
import SkyscannerTopBar from "../../components/ticketBooking/shared/SkyscannerTopBar";
import SkyscannerFooter from "../../components/ticketBooking/shared/SkyscannerFooter";
import FlightFilterSidebar from "../../components/ticketBooking/flightResults/FlightFilterSidebar";
import FlightResultCard from "../../components/ticketBooking/flightResults/FlightResultCard";
import { generateFlights, formatDuration } from "../../components/ticketBooking/flightResults/generateDummyFlights";

const PAGE_SIZE = 6;

const shiftDate = (iso, days) => {
  if (!iso) {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toISOString().split("T")[0];
  }
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatShort = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

const toMinutes = (timeStr) => {
  const [, h, m, period] = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/) || [];
  if (h === undefined) return 0;
  let hour = parseInt(h, 10) % 12;
  if (period === "PM") hour += 12;
  return hour * 60 + parseInt(m, 10);
};

const TIME_RANGES = {
  morning: [5 * 60, 12 * 60],
  afternoon: [12 * 60, 18 * 60],
  evening: [18 * 60, 24 * 60],
};

const AIRPORT_SUGGESTIONS = [
  { code: "CMB", city: "Colombo", label: "Colombo (CMB)" },
  { code: "DXB", city: "Dubai", label: "Dubai (DXB)" },
  { code: "SIN", city: "Singapore", label: "Singapore (SIN)" },
  { code: "MLE", city: "Male", label: "Male (MLE)" },
  { code: "BKK", city: "Bangkok", label: "Bangkok (BKK)" },
  { code: "LHR", city: "London", label: "London Heathrow (LHR)" },
  { code: "KUL", city: "Kuala Lumpur", label: "Kuala Lumpur (KUL)" },
  { code: "JAF", city: "Jaffna", label: "Jaffna (JAF)" },
];

const FlightResults = () => {
  const { url } = usePage();

  const search = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const today = new Date().toISOString().split("T")[0];
    return {
      from: sp.get("departure_airport") || "Colombo (CMB)",
      to: sp.get("arriving_airport") || "Dubai (DXB)",
      date: sp.get("departure_date") || today,
      returnDate: sp.get("return_date") || "",
      tripType: sp.get("trip_type") || "oneway",
      travellers: sp.get("travellers_summary") || "1 Adult, Economy",
      directOnly: sp.get("direct_only") === "1",
    };
  }, [url]);

  const [currentDate, setCurrentDate] = useState(search.date);

  // Inline Search Modifier State
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [editFrom, setEditFrom] = useState(search.from);
  const [editTo, setEditTo] = useState(search.to);
  const [editDate, setEditDate] = useState(search.date);
  const [editTripType, setEditTripType] = useState(search.tripType);
  const [editDirect, setEditDirect] = useState(search.directOnly);

  // Price Alert Modal State
  const [priceAlertModalOpen, setPriceAlertModalOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  const allFlights = useMemo(
    () => generateFlights({ from: search.from, to: search.to, date: currentDate }),
    [search.from, search.to, currentDate]
  );
  const maxPrice = useMemo(() => Math.max(...allFlights.map((f) => f.price), 100), [allFlights]);
  const maxDuration = useMemo(() => Math.max(...allFlights.map((f) => f.durationMinutes), 60), [allFlights]);

  const [filters, setFilters] = useState({
    stops: search.directOnly ? [0] : [],
    airlines: [],
    time: [],
    layovers: [],
    maxPrice,
    maxDuration,
    lowEmissionsOnly: false,
  });
  const [sortBy, setSortBy] = useState("best");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const passesNonSortFilters = (f) => {
    if (filters.stops.length && !filters.stops.some((s) => (s === 2 ? f.stops >= 2 : f.stops === s))) return false;
    if (filters.airlines.length && !filters.airlines.includes(f.airline)) return false;
    if (filters.layovers.length && !filters.layovers.includes(f.layoverCity)) return false;
    if (f.price > filters.maxPrice) return false;
    if (f.durationMinutes > filters.maxDuration) return false;
    if (filters.lowEmissionsOnly && f.co2Percent < 20) return false;
    if (filters.time.length) {
      const mins = toMinutes(f.departTime);
      if (!filters.time.some((t) => mins >= TIME_RANGES[t][0] && mins < TIME_RANGES[t][1])) return false;
    }
    return true;
  };

  const passingFlights = useMemo(() => allFlights.filter(passesNonSortFilters), [allFlights, filters]);

  const tabPreview = useMemo(() => {
    if (passingFlights.length === 0) return { best: null, cheapest: null, fastest: null };
    const cheapest = [...passingFlights].sort((a, b) => a.price - b.price)[0];
    const fastest = [...passingFlights].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
    const best = [...passingFlights].sort((a, b) => a.price + a.durationMinutes * 0.5 - (b.price + b.durationMinutes * 0.5))[0];
    return { best, cheapest, fastest };
  }, [passingFlights]);

  const SORTS = [
    { id: "best", label: "Best", icon: Star, ref: tabPreview.best },
    { id: "cheapest", label: "Cheapest", icon: DollarSign, ref: tabPreview.cheapest },
    { id: "fastest", label: "Fastest", icon: Zap, ref: tabPreview.fastest },
  ];

  const filtered = useMemo(() => {
    let list = [...passingFlights];
    if (sortBy === "cheapest") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "fastest") list.sort((a, b) => a.durationMinutes - b.durationMinutes);
    else list.sort((a, b) => a.price + a.durationMinutes * 0.5 - (b.price + b.durationMinutes * 0.5));
    return list;
  }, [passingFlights, sortBy]);

  const visible = filtered.slice(0, visibleCount);

  // 7-day price matrix calculation around currentDate
  const priceMatrix = useMemo(() => {
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    return offsets.map((off) => {
      const dayIso = shiftDate(currentDate, off);
      const flightsForDay = generateFlights({ from: search.from, to: search.to, date: dayIso });
      const minP = Math.min(...flightsForDay.map((f) => f.price));
      return {
        iso: dayIso,
        offset: off,
        formatted: formatShort(dayIso),
        minPrice: minP,
        isCurrent: off === 0,
      };
    });
  }, [currentDate, search.from, search.to]);

  const lowestMatrixPrice = useMemo(() => {
    return Math.min(...priceMatrix.map((m) => m.minPrice));
  }, [priceMatrix]);

  const handleSelect = (flight) => {
    router.get("/flightReview", {
      flight_id: flight.id,
      departure_airport: search.from,
      arriving_airport: search.to,
      departure_date: currentDate,
      return_date: search.returnDate,
      trip_type: search.tripType,
      travellers_summary: search.travellers,
    });
  };

  const handleApplyInlineSearch = (e) => {
    e.preventDefault();
    setIsEditingSearch(false);
    const params = new URLSearchParams({
      departure_airport: editFrom,
      arriving_airport: editTo,
      departure_date: editDate,
      trip_type: editTripType,
      travellers_summary: search.travellers,
      direct_only: editDirect ? "1" : "0",
    });
    router.visit(`/flightResults?${params.toString()}`);
  };

  const handlePriceAlertSubmit = (e) => {
    e.preventDefault();
    if (!alertEmail.trim()) return;
    setAlertSubmitted(true);
    setTimeout(() => {
      setAlertSubmitted(false);
      setPriceAlertModalOpen(false);
      setAlertEmail("");
    }, 2000);
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen flex flex-col justify-between">
      <div>
        <Head title={`Flights to ${search.to} | Search Results - Transport Jaan`} />
        <SkyscannerTopBar sticky />

        {/* Compact single-line search bar with date-shift arrows & Edit trigger */}
        <div className="bg-[#0B1B34] pb-4 pt-3 px-4 sm:px-6 lg:px-8 border-b border-white/10 shadow-md">
          <div className="max-w-[1400px] mx-auto flex items-center gap-2 sm:gap-3">
            {/* Clickable search pill that expands inline editor */}
            <button
              type="button"
              onClick={() => setIsEditingSearch(!isEditingSearch)}
              className="flex-1 min-w-0 bg-white rounded-[8px] h-11 px-4 flex items-center justify-between text-[13px] font-[700] text-[#0F172A] hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <Pencil className="w-3.5 h-3.5 text-[#0955AC] flex-shrink-0" />
                <span className="truncate">
                  {search.from} → {search.to} · {formatShort(currentDate)} · {search.travellers}
                </span>
              </div>
              <span className="text-[11.5px] font-[700] text-[#0955AC] bg-[#EAF1FE] px-2.5 py-1 rounded hidden sm:inline">
                {isEditingSearch ? "Close" : "Modify Search"}
              </span>
            </button>

            {/* Quick date nudging arrows */}
            <div className="hidden sm:flex items-center bg-white rounded-[8px] h-11 overflow-hidden shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setCurrentDate((d) => shiftDate(d, -1))}
                className="h-full px-3 text-[#0955AC] hover:bg-gray-50 transition-colors cursor-pointer"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-[12.5px] font-[700] text-[#0F172A] whitespace-nowrap">
                {formatShort(currentDate)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentDate((d) => shiftDate(d, 1))}
                className="h-full px-3 text-[#0955AC] hover:bg-gray-50 transition-colors cursor-pointer"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Price Alert Button */}
            <button
              type="button"
              onClick={() => setPriceAlertModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 bg-[#152A4A] hover:bg-[#1D3A63] text-white text-[12.5px] font-[700] h-11 px-4 rounded-[8px] transition-colors cursor-pointer shrink-0 border border-white/10"
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>Get Price Alerts</span>
            </button>
          </div>

          {/* Expandable Inline Skyscanner Search Editor */}
          {isEditingSearch && (
            <form
              onSubmit={handleApplyInlineSearch}
              className="max-w-[1400px] mx-auto mt-4 p-5 bg-white rounded-[14px] shadow-2xl border border-gray-200 text-[#0F172A] animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-4 text-[13px] font-[700]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={editTripType === "return"}
                      onChange={() => setEditTripType("return")}
                      className="accent-[#0955AC]"
                    />
                    <span>Return</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={editTripType === "oneway"}
                      onChange={() => setEditTripType("oneway")}
                      className="accent-[#0955AC]"
                    />
                    <span>One way</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSearch(false)}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                {/* From */}
                <div className="bg-[#F8FAFC] border border-gray-200 rounded-[8px] p-2.5">
                  <label className="text-[10.5px] font-[700] text-gray-500 uppercase block">From</label>
                  <input
                    type="text"
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    className="w-full bg-transparent font-[700] text-[13.5px] text-[#0F172A] focus:outline-none"
                  />
                </div>

                {/* To */}
                <div className="bg-[#F8FAFC] border border-gray-200 rounded-[8px] p-2.5">
                  <label className="text-[10.5px] font-[700] text-gray-500 uppercase block">To</label>
                  <input
                    type="text"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    className="w-full bg-transparent font-[700] text-[13.5px] text-[#0F172A] focus:outline-none"
                  />
                </div>

                {/* Departure Date */}
                <div className="bg-[#F8FAFC] border border-gray-200 rounded-[8px] p-2.5">
                  <label className="text-[10.5px] font-[700] text-gray-500 uppercase block">Depart Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-transparent font-[700] text-[13.5px] text-[#0F172A] focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Action button */}
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[46px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[14px] rounded-[8px] flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Flights</span>
                  </button>
                </div>
              </div>

              {/* Quick Suggestions & Direct flight filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-400 font-[600]">Popular:</span>
                  {AIRPORT_SUGGESTIONS.slice(0, 5).map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => setEditTo(a.label)}
                      className="bg-gray-100 hover:bg-[#EAF1FE] hover:text-[#0955AC] px-2.5 py-1 rounded text-gray-600 font-[600] transition-colors cursor-pointer"
                    >
                      {a.city}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 font-[600] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDirect}
                    onChange={(e) => setEditDirect(e.target.checked)}
                    className="rounded text-[#0955AC] focus:ring-0 cursor-pointer accent-[#0955AC]"
                  />
                  <span>Direct flights only</span>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* 7-Day Price Calendar Matrix Strip */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-[800] uppercase tracking-wider text-[#94A3B8] mr-2 shrink-0 hidden sm:inline">
                Lowest Fares:
              </span>
              {priceMatrix.map((item) => (
                <button
                  key={item.iso}
                  type="button"
                  onClick={() => setCurrentDate(item.iso)}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-[10px] text-left transition-all cursor-pointer shrink-0 border ${
                    item.isCurrent
                      ? "bg-[#0955AC] text-white border-[#0955AC] shadow-sm scale-105"
                      : "bg-[#F8FAFC] hover:bg-gray-100 text-[#0F172A] border-gray-200"
                  }`}
                >
                  <span className={`text-[11px] font-[600] ${item.isCurrent ? "text-white/80" : "text-gray-500"}`}>
                    {item.formatted}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[13px] font-[800] ${item.isCurrent ? "text-white" : "text-[#0B1B34]"}`}>
                      ${item.minPrice}
                    </span>
                    {item.minPrice === lowestMatrixPrice && (
                      <span className={`text-[9px] font-[800] px-1.5 py-0.2 rounded-full uppercase ${
                        item.isCurrent ? "bg-white text-[#0955AC]" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        Cheapest
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header & Results Count */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h1 className="bebas-neue text-[22px] sm:text-[28px] text-[#0B1B34] tracking-wide">
                {filtered.length} <span className="text-[#0955AC]">FLIGHTS FOUND</span> FROM {search.from?.split(" ")[0]} TO {search.to?.split(" ")[0]}
              </h1>
              <p className="text-[12.5px] text-[#64748B]">
                Prices include all mandatory airline taxes and fees. Sorted by {SORTS.find((s) => s.id === sortBy)?.label}.
              </p>
            </div>
          </div>

          {/* Sort tabs with price/duration preview */}
          <div className="inline-flex bg-white rounded-[10px] border border-black/10 shadow-sm mb-6 overflow-hidden w-full sm:w-auto">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                className={`flex-1 sm:flex-none text-left px-5 py-2.5 transition-colors cursor-pointer border-r last:border-r-0 border-black/5 ${
                  sortBy === s.id ? "bg-[#EAF1FE]" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-[700] text-[#0B1B34]">
                  <s.icon className={`w-3.5 h-3.5 ${sortBy === s.id ? "text-[#0955AC]" : "text-[#94A3B8]"}`} />
                  {s.label}
                </div>
                {s.ref ? (
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    ${s.ref.price} <span className="text-[#94A3B8]">· {formatDuration(s.ref.durationMinutes)}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">No matches</p>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">
            {/* Left Filter Sidebar */}
            <div className="order-2 xl:order-1">
              <FlightFilterSidebar flights={allFlights} filters={filters} onChange={setFilters} />
            </div>

            {/* Right Flight Results Cards */}
            <div className="order-1 xl:order-2 min-w-0 space-y-4">
              {visible.map((flight, i) => (
                <React.Fragment key={flight.id}>
                  <FlightResultCard flight={flight} onSelect={handleSelect} />

                  {/* Price Tracker promotional banner after 3rd result */}
                  {i === 2 && visible.length > 3 && (
                    <div className="bg-gradient-to-r from-[#0B1B34] via-[#0955AC] to-[#073E82] rounded-[18px] p-5 sm:p-6 flex items-center justify-between gap-4 text-white shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <p className="font-[800] text-[15px]">Like these flight fares?</p>
                          <p className="text-white/80 text-[12.5px]">We will notify you immediately if prices drop on this route.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPriceAlertModalOpen(true)}
                        className="bg-white text-[#0955AC] font-[800] text-[12.5px] px-4 py-2.5 rounded-[8px] hover:bg-gray-100 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        Track prices
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-black/5">
                  <Plane className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-[#0F0F0F] font-[700] text-[16px]">No flights match your filters</p>
                  <p className="text-[#9CA3AF] text-[13px] mt-1">Try clearing some filters or changing your departure date.</p>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        stops: [],
                        airlines: [],
                        time: [],
                        layovers: [],
                        maxPrice,
                        maxDuration,
                        lowEmissionsOnly: false,
                      })
                    }
                    className="mt-4 bg-[#0955AC] text-white text-[12.5px] font-[700] px-4 py-2 rounded-full cursor-pointer hover:bg-[#073E82]"
                  >
                    Reset all filters
                  </button>
                </div>
              )}

              {visibleCount < filtered.length && (
                <div className="text-center pt-3">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="bg-white border border-gray-300 hover:border-[#0955AC] text-[#0955AC] font-[700] text-[13.5px] py-2.5 px-8 rounded-full transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    Show more results ({filtered.length - visibleCount} more)
                  </button>
                </div>
              )}

              <p className="text-center text-[11.5px] text-[#94A3B8] pt-3">
                Prices checked in real-time. Fares may change due to seat availability at time of booking.
              </p>

              {/* Charter Quote Fallback */}
              <div className="text-center pt-2 pb-2">
                <p className="text-[13px] text-[#64748B]">
                  Looking for private executive aviation?{" "}
                  <Link href="/flightBooking" className="text-[#0955AC] font-[700] hover:underline">
                    Request a custom charter quote
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Price Alert Modal */}
      {priceAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#0955AC]">
                <BellRing className="w-5 h-5 text-[#0955AC]" />
                <h3 className="font-[800] text-[16px] text-[#0B1B34]">Create Flight Price Alert</h3>
              </div>
              <button
                type="button"
                onClick={() => setPriceAlertModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {alertSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-[800] text-[16px] text-[#0B1B34]">Price Alert Activated!</h4>
                <p className="text-[13px] text-gray-500">
                  We'll send updates to <strong>{alertEmail}</strong> when flight prices drop for {search.from} → {search.to}.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePriceAlertSubmit} className="mt-4 space-y-4">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Never miss a fare drop. Enter your email and we'll track prices for{" "}
                  <strong>{search.from}</strong> to <strong>{search.to}</strong>.
                </p>

                <div>
                  <label className="text-[11.5px] font-[700] text-gray-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-gray-300 rounded-[8px] px-3.5 py-2.5 text-[14px] text-[#0F172A] focus:outline-none focus:border-[#0955AC]"
                  />
                </div>

                <div className="p-3 bg-[#EAF1FE] rounded-[10px] text-[12px] text-[#0955AC] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Alerts are 100% free and you can unsubscribe anytime.</span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPriceAlertModalOpen(false)}
                    className="flex-1 py-2.5 rounded-[8px] border border-gray-200 text-[13px] font-[700] text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-[8px] bg-[#0955AC] hover:bg-[#073E82] text-white text-[13px] font-[700] shadow-md cursor-pointer transition-colors"
                  >
                    Set Price Alert
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Complete Skyscanner Footer */}
      <SkyscannerFooter />
    </div>
  );
};

export default FlightResults;
