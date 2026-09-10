import React, { useMemo, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { Clock, Users, TrainFront, ArrowUpDown, Snowflake, Droplet, Tv, Usb, Camera, Wifi, HelpCircle } from "lucide-react";
import TrainCard from "./TrainCard";
import LocaleSelector from "./LocaleSelector";
import TripRouteMap from "./TripRouteMap";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

// Trains store facilities as short codes (see trains.facilities migration
// comment: ["AC","W","TV","USB","CCTV","WIFI"]) — shown as bare text before,
// which meant nobody could tell what "W" or "CCTV" meant at a glance.
const FACILITY_META = {
    AC: { label: "Air Conditioning", icon: Snowflake },
    W: { label: "Drinking Water", icon: Droplet },
    TV: { label: "TV", icon: Tv },
    USB: { label: "USB Charging", icon: Usb },
    CCTV: { label: "CCTV Security", icon: Camera },
    WIFI: { label: "WiFi", icon: Wifi },
};

// Quick departure-time filters (Busbud/Omio-style "Departure time" sidebar
// group) — buckets a "7:45 AM" style string into a 24h hour for comparison.
const DEPARTURE_TIME_BUCKETS = [
    { key: "night", label: "Nighttime", hint: "Before 6am", test: (h) => h < 6 },
    { key: "early", label: "Early", hint: "6am – 11am", test: (h) => h >= 6 && h < 11 },
    { key: "midday", label: "Midday", hint: "11am – 5pm", test: (h) => h >= 11 && h < 17 },
    { key: "late", label: "Late", hint: "After 5pm", test: (h) => h >= 17 },
];

function parseDepartureHour(depart) {
    if (!depart) return null;
    const match = String(depart).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const meridiem = (match[3] || "").toUpperCase();
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour;
}

/** Parses durations like "8h 0m" or "45m" into total minutes for sorting. */
function parseDurationMinutes(duration) {
    if (typeof duration === "number") return duration;
    if (!duration) return Number.MAX_SAFE_INTEGER;
    const hoursMatch = duration.match(/(\d+)\s*h/);
    const minutesMatch = duration.match(/(\d+)\s*m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    return hours * 60 + minutes;
}

function TripResultCard({ trip, mode, selected, onSelect, href }) {
    const { formatPrice } = useLocale();
    const content = (
        <div className="grid grid-cols-12 items-start sm:items-center gap-4 sm:gap-8">
            {/* Left meta */}
            <div className="col-span-12 sm:col-span-5">
                <div className="flex items-center justify-between gap-4 sm:gap-6">
                    <div>
                        <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0955AC]/10 px-3 py-1 text-[12px] sm:text-[13px] font-bold text-[#0955AC]">
                                <TrainFront className="w-3.5 h-3.5" /> {trip.class}
                            </span>
                            {selected && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-[11px] sm:text-[13px] font-bold text-green-700">
                                    ✓ Selected
                                </span>
                            )}
                        </div>
                        <h3 className="text-[17px] sm:text-[20px] font-[800] text-[#0F172A]">{trip.name}</h3>
                        <p className="mt-1 text-[13px] sm:text-[15px] text-[#64748B] font-[500]">{trip.route}</p>
                        <p className="text-[12px] sm:text-[13px] text-[#94A3B8] font-[500]">
                            Train {trip.train_number} · {trip.operator}
                        </p>
                    </div>
                    {trip.facilities && trip.facilities.length > 0 && (
                        <div className="hidden gap-2 sm:flex">
                            {trip.facilities.map((facility, index) => {
                                const meta = FACILITY_META[facility] || { label: facility, icon: HelpCircle };
                                const Icon = meta.icon;
                                return (
                                    <span
                                        key={index}
                                        title={meta.label}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0955AC]"
                                    >
                                        <Icon className="w-4 h-4" strokeWidth={2} />
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Times */}
            <div className="col-span-12 sm:col-span-4">
                <div className="flex items-center justify-between sm:justify-start">
                    <div className="text-center sm:text-left">
                        <div className="text-[15px] sm:text-[18px] font-[800] text-[#0F172A]">{trip.depart}</div>
                        <div className="text-[11px] sm:text-[13px] text-[#94A3B8] font-[600]">{trip.date}</div>
                    </div>
                    <div className="flex-1 flex items-center px-3 sm:px-4">
                        <span className="h-[2px] flex-1 bg-[#E2E8F0]" />
                        <Clock className="w-3.5 h-3.5 text-[#94A3B8] mx-1.5 shrink-0" />
                        <span className="h-[2px] flex-1 bg-[#E2E8F0]" />
                    </div>
                    <div className="text-center sm:text-right shrink-0">
                        <div className="text-[15px] sm:text-[18px] font-[800] text-[#0F172A]">{trip.arrive}</div>
                        <div className="text-[11px] sm:text-[13px] text-[#94A3B8] font-[600]">{trip.date}</div>
                    </div>
                </div>
                <div className="text-center text-[11px] sm:text-[12px] text-[#0955AC] font-[700] -mt-1">{trip.duration}</div>
            </div>

            {/* Price / action */}
            <div className="col-span-12 sm:col-span-3">
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-3">
                    <div className="text-left sm:text-right">
                        <div className="text-[19px] sm:text-[24px] font-[800] text-[#0955AC]">{formatPrice(trip.price)}</div>
                        <div className="flex items-center gap-1 text-[11px] sm:text-[13px] text-[#64748B] font-[600] sm:justify-end">
                            <Users className="w-3.5 h-3.5" /> {trip.available_seats}/{trip.total_capacity} seats
                        </div>
                    </div>
                    <span
                        className={`inline-block whitespace-nowrap text-center rounded-full px-5 sm:px-7 py-2.5 sm:py-3 text-[13px] sm:text-[15px] font-[700] text-white w-auto transition-colors ${
                            trip.soldOut
                                ? "bg-red-400"
                                : selected
                                ? "bg-green-600 group-hover:bg-green-700"
                                : "bg-[#0955AC] group-hover:bg-[#073E82]"
                        }`}
                    >
                        {trip.soldOut ? "Sold Out" : mode === "select" ? (selected ? "Selected" : "Select") : (trip.status || "Book Now")}
                    </span>
                </div>
            </div>
        </div>
    );

    const cardClass = `group block w-full text-left rounded-[16px] border bg-white p-4 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_12px_28px_rgba(9,85,172,0.14)] hover:-translate-y-0.5 ${
        selected ? "border-green-400 ring-2 ring-green-100" : "border-[#EEF2F6]"
    }`;

    if (mode === "select") {
        return (
            <button type="button" onClick={() => !trip.soldOut && onSelect(trip.id)} disabled={trip.soldOut} className={cardClass}>
                {content}
            </button>
        );
    }

    return (
        <Link href={trip.soldOut ? "#" : href} className={`${cardClass} ${trip.soldOut ? "pointer-events-none" : ""}`}>
            {content}
        </Link>
    );
}

function HeroDetailsInner({
    outboundSchedules: propOutbound,
    returnSchedules: propReturn,
    route: propRoute,
    nearbyDates: propNearbyDates,
    searchParams: propSearchParams,
    fromStationName: propFromStation,
    toStationName: propToStation,
    hasActiveFilters: propHasFilters,
    isShowingAllTrains: propShowAll,
    inline = false,
}) {
    const { t } = useLocale();
    // Use props if provided (inline mode), otherwise fall back to usePage (standalone page mode)
    let pageProps = {};
    try {
        if (!inline) {
            const page = usePage();
            pageProps = page.props || {};
        }
    } catch (e) {
        // usePage might fail when embedded inline outside Inertia page context
    }

    const searchParams = propSearchParams ?? pageProps.searchParams ?? {};
    const outboundSchedules = propOutbound ?? pageProps.outboundSchedules ?? [];
    const returnSchedules = propReturn ?? pageProps.returnSchedules ?? [];
    const route = propRoute ?? pageProps.route ?? null;
    const nearbyDates = propNearbyDates ?? pageProps.nearbyDates ?? [];
    const fromStationName = propFromStation ?? pageProps.fromStationName ?? '';
    const toStationName = propToStation ?? pageProps.toStationName ?? '';
    const hasActiveFilters = propHasFilters ?? pageProps.hasActiveFilters ?? false;
    const isShowingAllTrains = propShowAll ?? pageProps.isShowingAllTrains ?? false;

    const isRoundTrip = searchParams.tripType === 'roundtrip';

    const [sortBy, setSortBy] = useState('fare');
    const [departureTimeFilters, setDepartureTimeFilters] = useState([]);
    const toggleDepartureTimeFilter = (key) => {
        setDepartureTimeFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    };
    const matchesDepartureTimeFilter = (trip) => {
        if (departureTimeFilters.length === 0) return true;
        const hour = parseDepartureHour(trip.depart);
        if (hour === null) return true;
        return DEPARTURE_TIME_BUCKETS.some((b) => departureTimeFilters.includes(b.key) && b.test(hour));
    };
    const [selectedOutboundId, setSelectedOutboundId] = useState(null);
    const [selectedReturnId, setSelectedReturnId] = useState(null);
    // Round trips use tabs instead of a long stacked page, matching the
    // pattern used on the bus results page.
    const [activeLeg, setActiveLeg] = useState('outbound');

    // Sort schedules based on selected criteria
    const sortSchedules = (schedules, criteria) => {
        return [...schedules].sort((a, b) => {
            switch (criteria) {
                case 'fare':
                    return a.price - b.price;
                case 'departure':
                    return a.depart.localeCompare(b.depart);
                case 'arrival':
                    return a.arrive.localeCompare(b.arrive);
                case 'fastest':
                    return parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration);
                case 'seats':
                    return b.available_seats - a.available_seats;
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    };

    const sortedOutboundSchedules = sortSchedules(outboundSchedules.filter(matchesDepartureTimeFilter), sortBy);
    const sortedReturnSchedules = sortSchedules(returnSchedules.filter(matchesDepartureTimeFilter), sortBy);

    // Which facility icons actually show up in this result set, so the
    // legend only explains icons the passenger is actually seeing.
    const facilitiesInView = useMemo(() => {
        const codes = new Set();
        [...outboundSchedules, ...returnSchedules].forEach((trip) => {
            (trip.facilities || []).forEach((f) => codes.add(f));
        });
        return Array.from(codes);
    }, [outboundSchedules, returnSchedules]);

    // Falls back explicitly — this page is also embedded inside the
    // multimodal journey planner, which doesn't always pass passenger counts
    // in searchParams, and an unset value here previously serialized as the
    // literal string "undefined" in the URL (crashed the preview page).
    const passengerQuery = `adults=${searchParams.adults ?? 1}&children=${searchParams.children ?? 0}&infants=${searchParams.infants ?? 0}`;

    const bothLegsSelected = isRoundTrip && selectedOutboundId && selectedReturnId;

    // Picking an outbound train automatically moves you to the Return tab —
    // free to switch back manually, this is just a nudge along the flow.
    const selectOutbound = (id) => {
        setSelectedOutboundId(id);
        setActiveLeg('return');
    };

    const continueToBooking = () => {
        if (!selectedOutboundId) return;
        const params = new URLSearchParams({
            schedule_id: selectedOutboundId,
            adults: searchParams.adults ?? 1,
            children: searchParams.children ?? 0,
            infants: searchParams.infants ?? 0,
        });
        if (selectedReturnId) {
            params.set('return_schedule_id', selectedReturnId);
        }
        router.visit(`/trainTicketBookingPreview?${params.toString()}`);
    };

    // Re-runs the search for a different date without going back through the
    // search form — lets people browse nearby dates for a cheaper/earlier trip.
    const changeDate = (newDate) => {
        if (newDate === searchParams.departureDate || inline) return;
        router.get('/trainTicketBookingDetails', { ...searchParams, departureDate: newDate }, { preserveScroll: true });
    };

    return (
        <section className="mx-auto w-full max-w-7xl px-6 py-8 pb-28">

            {/* Search Summary */}
            {hasActiveFilters && (
                <div className="mb-6 p-5 bg-[#0955AC]/5 rounded-[16px] border border-[#0955AC]/10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[15px] font-[800] text-[#0F172A] mb-3">Search Results</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px]">
                                <div>
                                    <span className="font-[600] text-[#64748B]">From:</span>
                                    <p className="text-[#0955AC] font-[700]">{fromStationName || searchParams.from}</p>
                                </div>
                                <div>
                                    <span className="font-[600] text-[#64748B]">To:</span>
                                    <p className="text-[#0955AC] font-[700]">{toStationName || searchParams.to}</p>
                                </div>
                                <div>
                                    <span className="font-[600] text-[#64748B]">Date:</span>
                                    <p className="text-[#0955AC] font-[700]">{searchParams.departureDate}</p>
                                </div>
                                <div>
                                    <span className="font-[600] text-[#64748B]">Passengers:</span>
                                    <p className="text-[#0955AC] font-[700]">
                                        {Math.max(0, (searchParams.adults || 0) - (searchParams.seniors || 0))} Adults
                                        {searchParams.children > 0 ? `, ${searchParams.children} Youth` : ""}
                                        {searchParams.seniors > 0 ? `, ${searchParams.seniors} Seniors` : ""}
                                        {searchParams.student ? ", Student" : ""}
                                        {searchParams.wheelchair ? ", Wheelchair" : ""}
                                    </p>
                                </div>
                            </div>
                            {isRoundTrip && (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-[700] text-[#0955AC] border border-[#0955AC]/20">
                                    <ArrowUpDown className="w-3.5 h-3.5" /> Round trip
                                </div>
                            )}
                        </div>
                        {!inline && (
                            <button
                                onClick={() => router.get('/trainTicketBookingDetails')}
                                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-[#334155] rounded-full transition-colors border border-[#E2E8F0] font-[700] text-[13px] shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isShowingAllTrains && (
                <div className="mb-6 p-4 bg-[#0955AC]/5 rounded-[16px] border-l-4 border-[#0955AC]">
                    <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0955AC] mr-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-[13px] font-[700] text-[#0F172A]">Showing all available trains</p>
                            <p className="text-[13px] text-[#64748B] mt-1">
                                Use the search form above to filter trains by route, date, and passengers.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search form for modification */}
            {!inline && (
                <div className="mb-8 sm:mb-14">
                    <TrainCard />
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Quick filters — departure time buckets, sits to the side of
                the results like Busbud/Omio's filter panel. */}
            <div className="hidden lg:block lg:w-[220px] lg:shrink-0 lg:sticky lg:top-24">
                <div className="rounded-[16px] border border-[#EEF2F6] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                    <h3 className="text-[13px] font-[800] text-[#0F172A] mb-3">Quick Filters</h3>
                    <p className="text-[11px] font-[700] text-[#64748B] tracking-wide uppercase mb-2">Departure Time</p>
                    <div className="space-y-2">
                        {DEPARTURE_TIME_BUCKETS.map((bucket) => (
                            <label key={bucket.key} className="flex items-center justify-between gap-2 cursor-pointer text-[13px] text-[#334155]">
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={departureTimeFilters.includes(bucket.key)}
                                        onChange={() => toggleDepartureTimeFilter(bucket.key)}
                                        className="w-4 h-4 accent-[#0955AC]"
                                    />
                                    {bucket.label}
                                </span>
                                <span className="text-[11px] text-[#94A3B8]">{bucket.hint}</span>
                            </label>
                        ))}
                    </div>
                    {departureTimeFilters.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setDepartureTimeFilters([])}
                            className="mt-3 text-[11px] font-[700] text-[#0955AC] hover:underline"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 items-start flex-1 min-w-0 ${route ? 'lg:grid-cols-3' : ''}`}>
            <div className={`min-w-0 ${route ? 'lg:col-span-2' : ''}`}>

            {/* Nearby dates — browse a few extra days without re-searching. */}
            {nearbyDates.length > 0 && (!isRoundTrip || activeLeg === 'outbound') && (
                <div className="mb-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {nearbyDates.map((d) => {
                        const dateObj = new Date(d.date + 'T00:00:00');
                        const isSelected = d.date === searchParams.departureDate;
                        return (
                            <button
                                key={d.date}
                                type="button"
                                onClick={() => changeDate(d.date)}
                                disabled={d.price == null}
                                className={`flex-shrink-0 min-w-[84px] rounded-[12px] border px-3 py-2 text-center transition-colors ${
                                    isSelected
                                        ? 'border-[#0955AC] bg-[#0955AC] text-white'
                                        : d.price == null
                                        ? 'border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'
                                        : 'border-[#E2E8F0] text-[#334155] hover:border-[#0955AC]/50'
                                }`}
                            >
                                <div className={`text-[11px] font-[700] ${isSelected ? 'text-white' : 'text-[#64748B]'}`}>
                                    {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
                                </div>
                                <div className="text-[15px] font-[800]">
                                    {dateObj.getDate()}
                                </div>
                                <div className={`text-[10px] font-[700] mt-0.5 ${isSelected ? 'text-white/90' : 'text-[#0955AC]'}`}>
                                    {d.price != null ? `LKR ${Math.round(d.price).toLocaleString()}` : '—'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {isRoundTrip && (
                <div className="mb-6 flex items-center gap-2 rounded-full bg-[#0955AC]/10 px-4 py-2 text-[13px] font-[700] text-[#0955AC] w-fit">
                    <ArrowUpDown className="w-4 h-4" /> Round trip — select your departure, then your return train
                </div>
            )}

            {/* Outbound / Return tabs (round trip only) */}
            {isRoundTrip && (
                <div className="mb-6 flex items-center gap-8 border-b border-[#E2E8F0]">
                    {[
                        { key: 'outbound', label: 'Outbound', selectedId: selectedOutboundId, sub: `${fromStationName || searchParams.from} → ${toStationName || searchParams.to}` },
                        { key: 'return', label: 'Return', selectedId: selectedReturnId, sub: `${toStationName || searchParams.to} → ${fromStationName || searchParams.from}` },
                    ].map((leg) => (
                        <button
                            key={leg.key}
                            type="button"
                            onClick={() => setActiveLeg(leg.key)}
                            className={`relative pb-3 text-[15px] sm:text-[17px] font-[800] transition-colors ${
                                activeLeg === leg.key ? 'text-[#0955AC]' : 'text-[#94A3B8] hover:text-[#475569]'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                {leg.label}
                                {leg.selectedId && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px]">✓</span>
                                )}
                            </span>
                            <span className="block text-[11px] font-[500] text-[#94A3B8] normal-case">{leg.sub}</span>
                            {activeLeg === leg.key && (
                                <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] bg-[#0955AC] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="sticky top-0 z-10 -mx-6 mb-6 bg-white/90 backdrop-blur px-4 sm:px-6 py-4 rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.05)] border border-[#EEF2F6]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-[13px] sm:text-[14px] font-[700] text-[#0F172A] w-full sm:w-auto mb-1 sm:mb-0">{t('sort_by', 'Sort by')}</span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'fare', label: t('cheapest', 'Cheapest') },
                            { key: 'fastest', label: t('fastest', 'Fastest') },
                            { key: 'departure', label: t('earliest', 'Earliest') },
                            { key: 'arrival', label: t('arrival', 'Arrival') },
                            { key: 'seats', label: t('seats', 'Seats') },
                            { key: 'name', label: t('name', 'Name') },
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setSortBy(filter.key)}
                                className={`rounded-full border px-4 py-1.5 text-[12px] sm:text-[13px] font-[700] transition-colors ${sortBy === filter.key
                                        ? 'border-[#0955AC] bg-[#0955AC] text-white'
                                        : 'border-[#E2E8F0] text-[#475569] hover:border-[#0955AC]/40'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <LocaleSelector />
                    {hasActiveFilters && (
                        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-[12px] sm:text-[14px] font-[600] text-[#334155] w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                            <span className="truncate">{fromStationName} → {toStationName}</span>
                            <span className="hidden sm:inline text-[#CBD5E1]">•</span>
                            <span className="whitespace-nowrap text-[#64748B]">{searchParams.departureDate}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Amenities legend — explains the icons shown on each result card */}
            {facilitiesInView.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[14px] border border-[#EEF2F6] bg-white px-4 py-3 text-[12px] text-[#64748B]">
                    <span className="font-[700] text-[#0F172A]">Amenities:</span>
                    {facilitiesInView.map((code) => {
                        const meta = FACILITY_META[code] || { label: code, icon: HelpCircle };
                        const Icon = meta.icon;
                        return (
                            <span key={code} className="inline-flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-[#0955AC]" /> {meta.label}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Results list — round trips show only the active tab's leg */}
            {(!isRoundTrip || activeLeg === 'outbound') && (
                <div className="space-y-5">
                    {sortedOutboundSchedules.length > 0 ? (
                        sortedOutboundSchedules.map((trip) => (
                            <TripResultCard
                                key={trip.id}
                                trip={trip}
                                mode={isRoundTrip ? "select" : "link"}
                                selected={selectedOutboundId === trip.id}
                                onSelect={isRoundTrip ? selectOutbound : setSelectedOutboundId}
                                href={`/trainTicketBookingPreview?schedule_id=${trip.id}&${passengerQuery}`}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 sm:py-12 bg-white rounded-[16px] border border-[#EEF2F6]">
                            <div className="text-[#334155] text-[15px] sm:text-[17px] font-[700]">No trains found for your search criteria.</div>
                            <p className="text-[#94A3B8] mt-2 text-[13px] sm:text-[14px]">Please try different dates or stations.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Return journey schedules for round trip */}
            {isRoundTrip && activeLeg === 'return' && (
                <div className="space-y-5">
                    {sortedReturnSchedules.length > 0 ? (
                        sortedReturnSchedules.map((trip) => (
                            <TripResultCard
                                key={trip.id}
                                trip={trip}
                                mode="select"
                                selected={selectedReturnId === trip.id}
                                onSelect={setSelectedReturnId}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 sm:py-12 bg-white rounded-[16px] border border-[#EEF2F6]">
                            <div className="text-[#334155] text-[15px] sm:text-[17px] font-[700]">No return trains found for this date.</div>
                        </div>
                    )}
                </div>
            )}

            </div>

            {/* Side map: shows the searched route so you can see the distance at a glance */}
            {route && (
                <div className="hidden lg:block lg:col-span-1 sticky top-24">
                    <TripRouteMap route={route} className="h-[420px]" />
                </div>
            )}

            </div>
            </div>

            {/* Sticky continue bar for round trips */}
            {isRoundTrip && (selectedOutboundId || selectedReturnId) && (
                <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#EEF2F6] bg-white/95 backdrop-blur px-6 py-4 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        <div className="text-[13px] sm:text-[15px] font-[600]">
                            <span className={selectedOutboundId ? "text-green-600 font-[700]" : "text-[#94A3B8]"}>
                                ✓ Departure {selectedOutboundId ? "selected" : "pending"}
                            </span>
                            <span className="mx-3 text-[#E2E8F0]">|</span>
                            <span className={selectedReturnId ? "text-green-600 font-[700]" : "text-[#94A3B8]"}>
                                ✓ Return {selectedReturnId ? "selected" : "pending"}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={continueToBooking}
                            disabled={!bothLegsSelected}
                            className={`rounded-full px-8 py-3 text-[14px] sm:text-[16px] font-[700] text-white transition-colors ${
                                bothLegsSelected ? "bg-[#0955AC] hover:bg-[#073E82]" : "bg-[#CBD5E1] cursor-not-allowed"
                            }`}
                        >
                            Continue to Booking
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default function HeroDetails(props) {
    return (
        <LocaleProvider>
            <HeroDetailsInner {...props} />
        </LocaleProvider>
    );
}
