import React, { useState } from "react";
import { Link, router } from "@inertiajs/react";
import { Snowflake, Wifi, Usb, Tv, ArmchairIcon, ShowerHead, Clock, Users, MapPin, Radio, ArrowUpDown } from "lucide-react";
import BusCard from "./BusCard";
import LocaleSelector from "./LocaleSelector";
import TripRouteMap from "./TripRouteMap";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

const amenityIcons = {
    "A/C": Snowflake,
    "WiFi": Wifi,
    "USB": Usb,
    "TV": Tv,
    "Recline": ArmchairIcon,
    "Toilet": ShowerHead,
};
const amenities = Object.keys(amenityIcons);

/** Parses durations like "8h 0m" or "5h" into total minutes for sorting. */
function parseDurationMinutes(duration) {
    if (typeof duration === "number") return duration;
    if (!duration) return Number.MAX_SAFE_INTEGER;
    const hoursMatch = duration.match(/(\d+)\s*h/);
    const minutesMatch = duration.match(/(\d+)\s*m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    return hours * 60 + minutes;
}

function BusTripCard({ trip, mode, selected, onSelect, href }) {
    const { formatPrice } = useLocale();
    const inner = (
        <>
            <div className="grid grid-cols-12 items-start sm:items-center gap-4 sm:gap-8">
                {/* Left meta */}
                <div className="col-span-12 sm:col-span-5">
                    <div className="flex items-center justify-between gap-3 sm:gap-6">
                        <div className="w-full">
                            <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-[#0955AC]/10 px-3 py-1 text-[11px] sm:text-[13px] font-bold text-[#0955AC]">
                                    {trip.busType}
                                </span>
                                {trip.expressway && (
                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] sm:text-[13px] font-bold text-amber-700">
                                        ⚡ Expressway
                                    </span>
                                )}
                                {selected && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-[11px] sm:text-[13px] font-bold text-green-700">
                                        ✓ Selected
                                    </span>
                                )}
                            </div>

                            <h3 className="text-[17px] sm:text-[20px] font-[800] text-[#0F172A]">{trip.operator}</h3>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-[14px] text-[#64748B] font-[500]">
                                <span>Route {trip.routeNo}</span>
                                <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                                <span>Bus {trip.busNo}</span>
                            </div>

                            <div className="mt-3 flex gap-2 sm:gap-2.5">
                                {amenities.map((a) => {
                                    const Icon = amenityIcons[a];
                                    return (
                                        <span
                                            key={a}
                                            title={a}
                                            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0955AC]"
                                        >
                                            <Icon className="w-4 h-4" strokeWidth={2} />
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Times */}
                <div className="col-span-12 sm:col-span-4">
                    <div className="flex items-center justify-between sm:justify-start">
                        <div className="text-center sm:text-left">
                            <div className="text-[15px] sm:text-[18px] font-[800] text-[#0F172A]">{trip.depart}</div>
                            <div className="text-[11px] sm:text-[13px] text-[#94A3B8] font-[600]">{trip.day}</div>
                        </div>
                        <div className="flex-1 flex items-center px-3 sm:px-4">
                            <span className="h-[2px] flex-1 bg-[#E2E8F0]" />
                            <Clock className="w-3.5 h-3.5 text-[#94A3B8] mx-1.5 shrink-0" />
                            <span className="h-[2px] flex-1 bg-[#E2E8F0]" />
                        </div>
                        <div className="text-center sm:text-right shrink-0">
                            <div className="text-[15px] sm:text-[18px] font-[800] text-[#0F172A]">{trip.arrive}</div>
                            <div className="text-[11px] sm:text-[13px] text-[#94A3B8] font-[600]">{trip.day}</div>
                        </div>
                    </div>
                    <div className="text-center text-[11px] sm:text-[12px] text-[#0955AC] font-[700] -mt-1 mb-2">{trip.duration}</div>

                    <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-6 text-[12px] sm:text-[13px]">
                        <span className="text-[#64748B]">Boarding &amp; drop-off points shown at checkout</span>
                    </div>
                </div>

                {/* Price / action */}
                <div className="col-span-12 sm:col-span-3">
                    <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-3 sm:gap-3">
                        <div className="text-left sm:text-right">
                            <div className="text-[19px] sm:text-[24px] font-[800] text-[#0955AC]">{formatPrice(trip.price)}</div>
                            <div className="flex items-center gap-1 text-[11px] sm:text-[13px] text-[#64748B] font-[600] sm:justify-end">
                                <Users className="w-3.5 h-3.5" /> {trip.seatsAvailable}/{trip.totalSeats} seats
                            </div>
                        </div>

                        {mode === "select" ? (
                            <button
                                type="button"
                                onClick={() => !trip.soldOut && onSelect(trip.id)}
                                disabled={trip.soldOut}
                                className={`block whitespace-nowrap text-center rounded-full px-5 sm:px-7 py-2.5 sm:py-3 text-[13px] sm:text-[15px] font-[700] text-white w-auto transition-colors ${
                                    trip.soldOut
                                        ? "bg-red-400 cursor-not-allowed"
                                        : selected
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-[#0955AC] hover:bg-[#073E82]"
                                }`}
                            >
                                {trip.soldOut ? "Sold Out" : selected ? "Selected" : "Select"}
                            </button>
                        ) : (
                            <Link
                                href={trip.soldOut ? "#" : href}
                                className={`block whitespace-nowrap text-center rounded-full px-5 sm:px-7 py-2.5 sm:py-3 text-[13px] sm:text-[15px] font-[700] text-white w-auto transition-colors ${
                                    trip.soldOut
                                        ? "bg-red-400 cursor-not-allowed pointer-events-none"
                                        : "bg-[#0955AC] hover:bg-[#073E82]"
                                }`}
                            >
                                {trip.soldOut ? "Sold Out" : "View Seats"}
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer info row */}
            <div className="mt-4 sm:mt-5 pt-4 border-t border-[#F1F5F9] grid grid-cols-1 gap-2 sm:gap-3 text-[12px] sm:text-[13px] text-[#64748B] sm:grid-cols-3">
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0955AC]" />
                    <span className="font-[700] text-[#334155]">From:</span> {trip.departureStation || "—"}
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#EF3826]" />
                    <span className="font-[700] text-[#334155]">To:</span> {trip.arrivalStation || "—"}
                </div>
                <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-green-600" />
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] sm:text-[12px] font-[700] text-green-700">
                        Live GPS Tracking
                    </span>
                </div>
            </div>
        </>
    );

    const cardClass = `block rounded-[16px] border bg-white p-4 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_12px_28px_rgba(9,85,172,0.14)] hover:-translate-y-0.5 w-full text-left ${
        selected ? "border-green-400 ring-2 ring-green-100" : "border-[#EEF2F6]"
    }`;

    if (mode === "select") {
        return <div className={cardClass}>{inner}</div>;
    }

    return (
        <Link href={href} className={cardClass}>
            {inner}
        </Link>
    );
}

const HeroDetailsTwoInner = ({ stations = [], schedules = [], returnSchedules = [], route = null, nearbyDates = [], searchParams = {} }) => {
    const { t } = useLocale();
    const [sortBy, setSortBy] = useState('');
    const [selectedOutboundId, setSelectedOutboundId] = useState(null);
    const [selectedReturnId, setSelectedReturnId] = useState(null);
    // Which leg's results are showing — round trips use tabs instead of a
    // long stacked page, matching how most booking sites do it.
    const [activeLeg, setActiveLeg] = useState('outbound');

    const isRoundTrip = searchParams.tripType === 'roundtrip';

    // Use dynamic data if available, otherwise fall back to static demo data
    let trips = schedules && schedules.length > 0 ? schedules : [
        {
            id: 1,
            operator: "Baby Shan Travels",
            busType: "Luxury (A/C) — 45 Seater",
            routeNo: "064/64R",
            busNo: "NB-1234",
            depart: "7:45 AM",
            arrive: "3:45 PM",
            day: "3 Sep",
            duration: "8h 0m",
            price: 1800,
            seatsAvailable: 36,
            totalSeats: 45,
            expressway: false,
            soldOut: false,
        },
        {
            id: 2,
            operator: "Mathu Express — Highway",
            busType: "Luxury (A/C) — 49 Seater",
            routeNo: "087 (E01)",
            busNo: "NC-4567",
            depart: "5:40 PM",
            arrive: "10:40 PM",
            day: "3 Sep",
            duration: "5h 0m",
            price: 1635,
            seatsAvailable: 0,
            totalSeats: 49,
            expressway: true,
            soldOut: true,
        },
    ];

    let returnTrips = returnSchedules || [];

    const applySort = (list) => {
        if (sortBy === 'cheapest') return [...list].sort((a, b) => a.price - b.price);
        if (sortBy === 'earliest') {
            return [...list].sort((a, b) => new Date('1970/01/01 ' + a.depart) - new Date('1970/01/01 ' + b.depart));
        }
        if (sortBy === 'fastest') return [...list].sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration));
        if (sortBy === 'seats') return [...list].sort((a, b) => b.seatsAvailable - a.seatsAvailable);
        if (sortBy === 'operator') return [...list].sort((a, b) => a.operator.localeCompare(b.operator));
        return list;
    };

    trips = applySort(trips);
    returnTrips = applySort(returnTrips);

    const handleSort = (sortType) => {
        setSortBy(sortBy === sortType ? '' : sortType);
    };

    const bothLegsSelected = isRoundTrip && selectedOutboundId && selectedReturnId;

    // Picking an outbound bus automatically moves you to the Return tab —
    // free to switch back manually, this is just a nudge along the flow.
    const selectOutbound = (id) => {
        setSelectedOutboundId(id);
        setActiveLeg('return');
    };

    const continueToBooking = () => {
        if (!selectedOutboundId) return;
        const params = new URLSearchParams({
            id: selectedOutboundId,
            from: searchParams.from || '',
            to: searchParams.to || '',
            date: searchParams.date || '',
            passengers: searchParams.passengers || 1,
        });
        if (selectedReturnId) {
            params.set('return_id', selectedReturnId);
        }
        router.visit(`/busTicketBookingPreview?${params.toString()}`);
    };

    // Re-runs the search for a different date without going back through the
    // search form — lets people browse nearby dates for a cheaper/earlier trip.
    const changeDate = (newDate) => {
        if (newDate === searchParams.date) return;
        router.get('/busTicketBookingDetails', { ...searchParams, date: newDate }, { preserveScroll: true });
    };

    return (
        <section className="mx-auto w-full max-w-7xl px-6 py-8 pb-28">
            <div className="mb-8 sm:mb-14">
                <BusCard />
            </div>

            <div className={`grid grid-cols-1 gap-6 items-start ${route ? 'lg:grid-cols-3' : ''}`}>
            <div className={route ? 'lg:col-span-2 min-w-0' : 'min-w-0'}>

            {/* Nearby dates — browse a few extra days without re-searching.
                Prices reflect the outbound leg's route. */}
            {nearbyDates.length > 0 && (!isRoundTrip || activeLeg === 'outbound') && (
                <div className="mb-6 flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 bg-white rounded-[14px] border border-[#EEF2F6] shadow-[0_2px_10px_rgba(15,23,42,0.05)] p-3">
                    {nearbyDates.map((d) => {
                        const dateObj = new Date(d.date + 'T00:00:00');
                        const isSelected = d.date === searchParams.date;
                        return (
                            <button
                                key={d.date}
                                type="button"
                                onClick={() => changeDate(d.date)}
                                disabled={d.price == null}
                                className={`flex-shrink-0 min-w-[92px] rounded-[12px] border-2 px-3 py-2.5 text-center transition-colors ${
                                    isSelected
                                        ? 'border-[#0955AC] bg-[#0955AC] text-white shadow-[0_4px_12px_rgba(9,85,172,0.25)]'
                                        : d.price == null
                                        ? 'border-[#E2E8F0] text-[#CBD5E1] cursor-not-allowed'
                                        : 'border-[#E2E8F0] text-[#334155] hover:border-[#0955AC]/50'
                                }`}
                            >
                                <div className={`text-[12px] font-[700] ${isSelected ? 'text-white' : 'text-[#64748B]'}`}>
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
                    <ArrowUpDown className="w-4 h-4" /> Round trip — select your departure, then your return bus
                </div>
            )}

            {/* Outbound / Return tabs (round trip only) */}
            {isRoundTrip && (
                <div className="mb-6 flex items-center gap-8 border-b border-[#E2E8F0]">
                    {[
                        { key: 'outbound', label: 'Outbound', selectedId: selectedOutboundId, sub: `${searchParams.from} → ${searchParams.to}` },
                        { key: 'return', label: 'Return', selectedId: selectedReturnId, sub: `${searchParams.to} → ${searchParams.from}` },
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
                    <span className="text-[13px] sm:text-[14px] font-[700] text-[#0F172A] w-full sm:w-auto mb-1 sm:mb-0">
                        {t('sort_by', 'Sort by')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'cheapest', label: t('cheapest', 'Cheapest') },
                            { key: 'fastest', label: t('fastest', 'Fastest') },
                            { key: 'earliest', label: t('earliest', 'Earliest') },
                            { key: 'seats', label: t('seats', 'Seats') },
                            { key: 'operator', label: t('operator', 'Operator') },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => handleSort(f.key)}
                                className={`rounded-full border px-4 py-1.5 text-[12px] sm:text-[13px] font-[700] transition-colors ${
                                    sortBy === f.key
                                        ? 'border-[#0955AC] text-white bg-[#0955AC]'
                                        : 'border-[#E2E8F0] text-[#475569] hover:border-[#0955AC]/40'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <LocaleSelector />
                    <div className="ml-auto flex items-center gap-2 sm:gap-3 text-[12px] sm:text-[14px] font-[600] text-[#334155] w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                        <span className="truncate">
                            {searchParams.from && searchParams.to ? `${searchParams.from} → ${searchParams.to}` : "Colombo → Negombo"}
                        </span>
                        <span className="hidden sm:inline text-[#CBD5E1]">•</span>
                        <span className="whitespace-nowrap text-[#64748B]">
                            {searchParams.date
                                ? new Date(searchParams.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : "03/09/2025"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Results list — round trips show only the active tab's leg */}
            {(!isRoundTrip || activeLeg === 'outbound') && (
                <div className="space-y-5">
                    {trips && trips.length > 0 ? trips.map((trip) => (
                        <BusTripCard
                            key={trip.id}
                            trip={trip}
                            mode={isRoundTrip ? "select" : "link"}
                            selected={selectedOutboundId === trip.id}
                            onSelect={isRoundTrip ? selectOutbound : setSelectedOutboundId}
                            href={`/busTicketBookingPreview?id=${trip.id}&from=${searchParams.from || 'Colombo'}&to=${searchParams.to || 'Negombo'}&date=${searchParams.date || '2025-09-24'}&passengers=${searchParams.passengers || 1}`}
                        />
                    )) : (
                        <div className="text-center py-8 sm:py-12 bg-white rounded-[16px] border border-[#EEF2F6]">
                            <div className="text-[#334155] text-[15px] sm:text-[17px] font-[700]">
                                No bus schedules found for the selected route and date.
                            </div>
                            <p className="text-[#94A3B8] mt-2 text-[13px] sm:text-[14px]">Please try different stations or dates.</p>
                        </div>
                    )}
                </div>
            )}

            {isRoundTrip && activeLeg === 'return' && (
                <div className="space-y-5">
                    {returnTrips.length > 0 ? returnTrips.map((trip) => (
                        <BusTripCard
                            key={trip.id}
                            trip={trip}
                            mode="select"
                            selected={selectedReturnId === trip.id}
                            onSelect={setSelectedReturnId}
                        />
                    )) : (
                        <div className="text-center py-8 sm:py-12 bg-white rounded-[16px] border border-[#EEF2F6]">
                            <div className="text-[#334155] text-[15px] sm:text-[17px] font-[700]">No return buses found for this date.</div>
                        </div>
                    )}
                </div>
            )}

            </div>

            {/* Side map: shows the searched route so you can see the distance
                at a glance. Nudged down a bit so it doesn't sit flush with
                the date/sort toolbar on the left. */}
            {route && (
                <div className="hidden lg:block lg:col-span-1 sticky top-24 mt-14">
                    <TripRouteMap route={route} className="h-[420px]" />
                </div>
            )}

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
                            Continue to Seat Selection
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

const HeroDetailsTwo = (props) => (
    <LocaleProvider>
        <HeroDetailsTwoInner {...props} />
    </LocaleProvider>
);

export default HeroDetailsTwo;
