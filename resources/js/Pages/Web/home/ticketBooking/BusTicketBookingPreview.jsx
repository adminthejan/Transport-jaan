import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import TripRouteMap from "../../components/ticketBooking/TripRouteMap";

const COL_LEFT = 2; // two seats left of aisle
const COL_RIGHT = 2; // two seats right of aisle

const BoardingOptions = [
    "Pettah Bus Stand",
    "Kelaniya",
    "Kiribathgoda",
    "Ja-Ela",
];

const DestinationOptions = [
    "Negombo Main",
    "Kochchikade",
    "Katunayake",
    "Dankotuwa",
];

// seat statuses
const STATUS = {
    AVAILABLE: "available",
    BOOKED: "booked",
};

function buildSeatMap(seatLayout, bookedSeats) {
    if (!seatLayout) {
        seatLayout = { rows: 13, columns: 4, totalSeats: 52, aisle: 2 };
    }

    let num = 1;
    const map = [];
    const bookedSeatNumbers = bookedSeats || [];

    for (let r = 0; r < seatLayout.rows; r++) {
        const row = [];

        for (let c = 0; c < COL_LEFT; c++) {
            if (num <= seatLayout.totalSeats) {
                row.push({
                    id: num,
                    status: bookedSeatNumbers.includes(num) || bookedSeatNumbers.includes(num.toString())
                        ? STATUS.BOOKED
                        : STATUS.AVAILABLE
                });
                num++;
            }
        }

        row.push(null); // aisle

        for (let c = 0; c < COL_RIGHT; c++) {
            if (num <= seatLayout.totalSeats) {
                row.push({
                    id: num,
                    status: bookedSeatNumbers.includes(num) || bookedSeatNumbers.includes(num.toString())
                        ? STATUS.BOOKED
                        : STATUS.AVAILABLE
                });
                num++;
            }
        }

        map.push(row);
    }

    return map;
}

const legend = [
    { label: "Available", color: "bg-[#62B36F]" },
    { label: "Already Booked", color: "bg-[#C7C7C7]" },
    { label: "Selected", color: "bg-[#0955AC]" },
];

/** One leg's trip-info card + map + seat grid. Fully presentational. */
function TripSeatPanel({ label, trip, seatLayout, bookedSeats, selected, onToggle }) {
    const seatMap = useMemo(() => buildSeatMap(seatLayout, bookedSeats), [seatLayout, bookedSeats]);

    if (!trip) return null;

    return (
        <div className="rounded-[10px] border border-gray-200 overflow-hidden bg-white">
            <div className="bg-[#0955AC] px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-white text-lg">{label}</span>
                <span className="text-white/90 text-sm">{trip.day}</span>
            </div>

            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b border-gray-100">
                <div>
                    <span className="text-gray-500">From:</span>
                    <p className="font-medium">{trip.departureStation}</p>
                </div>
                <div>
                    <span className="text-gray-500">To:</span>
                    <p className="font-medium">{trip.arrivalStation}</p>
                </div>
                <div>
                    <span className="text-gray-500">Time:</span>
                    <p className="font-medium">{trip.depart} - {trip.arrive}</p>
                </div>
                <div>
                    <span className="text-gray-500">Price/seat:</span>
                    <p className="font-medium text-[#0955AC]">LKR {trip.price}</p>
                </div>
            </div>

            {trip.route && (
                <div className="p-4 border-b border-gray-100">
                    <TripRouteMap route={trip.route} className="h-[180px]" />
                </div>
            )}

            <div className="p-4 flex justify-center">
                <div className="inline-block items-center">
                    <div className="mx-auto mb-3 w-[110px] rounded-md bg-gray-100 py-2 text-center text-gray-700 font-semibold text-sm">
                        Front
                    </div>
                    <div className="flex">
                        <div className="mr-3 flex flex-col items-end pr-2">
                            {Array.from({ length: seatMap.length }).map((_, i) => (
                                <div key={i} className="h-10 leading-[40px] text-gray-600 font-medium text-sm">
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                        <div className="grid gap-2">
                            {seatMap.map((row, rIdx) => (
                                <div key={rIdx} className="flex items-center gap-2">
                                    {row.slice(0, COL_LEFT).filter((s) => s !== null).map((s) => (
                                        <SeatButton
                                            key={s.id}
                                            seat={s}
                                            selected={selected.includes(s.id)}
                                            onClick={() => onToggle(s.id, s.status)}
                                        />
                                    ))}
                                    <div className="w-6" />
                                    {row.slice(COL_LEFT + 1).filter((s) => s !== null).map((s) => (
                                        <SeatButton
                                            key={s.id}
                                            seat={s}
                                            selected={selected.includes(s.id)}
                                            onClick={() => onToggle(s.id, s.status)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[#0955AC] font-[700] text-sm">Seats</span>
                {selected.length === 0 ? (
                    <span className="text-red-500 text-sm">Please select your seats</span>
                ) : (
                    <span className="text-gray-800 font-[700]">{[...selected].sort((a, b) => a - b).join(", ")}</span>
                )}
            </div>
        </div>
    );
}

const BusTicketBookingPreview = ({ trip, searchParams, bookedSeats, seatLayout, returnTrip, returnBookedSeats, returnSeatLayout }) => {
    const isRoundTrip = !!returnTrip;

    const [selected, setSelected] = useState([]);
    const [returnSelected, setReturnSelected] = useState([]);
    const [passengerName, setPassengerName] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [boarding, setBoarding] = useState("");
    const [destination, setDestination] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const toggleSeat = (seatId, status) => {
        if (status === STATUS.BOOKED) return;
        setSelected((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]));
    };

    const toggleReturnSeat = (seatId, status) => {
        if (status === STATUS.BOOKED) return;
        setReturnSelected((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]));
    };

    const outboundTotal = selected.length * (trip?.price || 0);
    const returnTotal = returnSelected.length * (returnTrip?.price || 0);
    const total = outboundTotal + returnTotal;

    const canContinue =
        selected.length > 0 &&
        (!isRoundTrip || returnSelected.length > 0) &&
        passengerName.trim().length > 2 &&
        mobile.trim().length >= 9 &&
        boarding &&
        destination;

    const onSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        const bookingData = {
            schedule_id: trip?.id,
            seat_numbers: selected,
            passenger_count: selected.length,
            passenger_name: passengerName,
            passenger_phone: mobile,
            passenger_email: email,
            boarding_point: boarding,
            destination_point: destination,
            total_price: outboundTotal,
        };

        if (isRoundTrip) {
            bookingData.return_schedule_id = returnTrip?.id;
            bookingData.return_seat_numbers = returnSelected;
        }

        fetch('/bus-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: JSON.stringify(bookingData)
        })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                    return null;
                }
                return response.json().catch(() => null);
            })
            .then(data => {
                if (data === null) return;

                if (data && data.redirect) {
                    window.location.href = data.redirect;
                } else if (data && data.reference) {
                    window.location.href = `/bus-booking-success/${data.reference}`;
                } else if (data && data.success) {
                    alert('Booking successful!');
                    window.location.href = '/flight-booking';
                } else if (data && data.errors) {
                    const errorMessage = Object.values(data.errors).flat().join("\n");
                    alert(`Error: ${errorMessage}`);
                } else {
                    alert('Booking completed but encountered an unexpected response. Please check your bookings.');
                    window.location.href = '/flight-booking';
                }
            })
            .catch(error => {
                console.error('Booking error:', error);
                alert('There was an error processing your booking. Please try again.');
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div>
            <Header />
            <section className="mx-auto w-full max-w-[1300px] px-4 md:px-6 lg:px-8 py-20">
                {/* Back — this page is reached either from the standalone bus search
                    (busTicketBookingDetails) or from the multimodal journey planner,
                    which embeds the exact same results list inline. A hardcoded link
                    to busTicketBookingDetails would silently hijack users coming from
                    the planner, so honor real navigation history instead and only
                    fall back to a fixed destination when there's nowhere to go back to
                    (e.g. the page was opened directly). */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                                return;
                            }
                            const fallback = searchParams
                                ? `/busTicketBookingDetails?from=${searchParams.from}&to=${searchParams.to}&date=${searchParams.date}&passengers=${searchParams.passengers}`
                                : "/busTicketBookingDetails";
                            router.visit(fallback);
                        }}
                        className="inline-flex items-center gap-2 text-[#0955AC] text-base font-semibold"
                    >
                        <span className="inline-block rounded-full border border-[#0955AC]/20 p-1 leading-none">←</span>
                        Back
                    </button>
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-[#0955AC]">
                    {isRoundTrip ? "Select seats for both journeys" : "Select seats & fill form"}
                </h1>

                <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Seat layout(s) */}
                    <div className="lg:col-span-2 space-y-6">
                        <TripSeatPanel
                            label={isRoundTrip ? "Departure" : "Your Trip"}
                            trip={trip}
                            seatLayout={seatLayout}
                            bookedSeats={bookedSeats}
                            selected={selected}
                            onToggle={toggleSeat}
                        />
                        {isRoundTrip && (
                            <TripSeatPanel
                                label="Return"
                                trip={returnTrip}
                                seatLayout={returnSeatLayout}
                                bookedSeats={returnBookedSeats}
                                selected={returnSelected}
                                onToggle={toggleReturnSeat}
                            />
                        )}
                    </div>

                    {/* Right side: form & legend */}
                    <div className="lg:col-span-1">
                        <div className="rounded-[10px] border border-gray-200 bg-gray-50">
                            <div className="px-5 py-6 border-b border-gray-200 rounded-t-[10px] bg-[#0955AC]">
                                <h2 className="text-xl font-[700] text-[#FFFFFF]">Passenger Details</h2>
                            </div>

                            <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
                                {isRoundTrip && (
                                    <div className="space-y-2 pb-2 border-b border-gray-200">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Departure ({selected.length} seats)</span>
                                            <span className="font-semibold text-gray-800">LKR {outboundTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Return ({returnSelected.length} seats)</span>
                                            <span className="font-semibold text-gray-800">LKR {returnTotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-[#0955AC] font-[700]">Total</span>
                                    <span className="text-[#0955AC] text-xl font-bold">{total.toLocaleString()} LKR</span>
                                </div>

                                <div className="text-[#0955AC]">
                                    <label className="mb-1 block text-sm font-[600] text-[#0955AC]">Passenger Name</label>
                                    <input
                                        type="text"
                                        value={passengerName}
                                        onChange={(e) => setPassengerName(e.target.value)}
                                        placeholder="Enter passenger name"
                                        className="w-full rounded-[10px] border px-3 py-4 placeholder:text-[#0955AC] border-[#0955AC] focus:ring-[#0955AC]"
                                    />
                                </div>

                                <div className="text-[#0955AC]">
                                    <label className="mb-1 block text-sm font-[600] text-[#0955AC]">Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        placeholder="071 234 5678"
                                        className="w-full rounded-[10px] border px-3 py-4 placeholder:text-[#0955AC] border-[#0955AC] focus:ring-[#0955AC]"
                                    />
                                </div>

                                <div className="text-[#0955AC]">
                                    <label className="mb-1 block text-sm font-[600] text-[#0955AC]">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@domain.com"
                                        className="w-full rounded-[10px] border px-3 py-4 placeholder:text-[#0955AC] border-[#0955AC] focus:ring-[#0955AC]"
                                    />
                                </div>

                                <div className="text-[#0955AC]">
                                    <label className="mb-1 block text-sm font-[600] text-[#0955AC]">Boarding Place</label>
                                    <select
                                        value={boarding}
                                        onChange={(e) => setBoarding(e.target.value)}
                                        className="w-full rounded-[10px] border  px-3 py-4 placeholder:text-[#0955AC] border-[#0955AC] focus:ring-[#0955AC]"
                                    >
                                        <option value="">Select your boarding point</option>
                                        {BoardingOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="text-[#0955AC]">
                                    <label className="mb-1 block text-sm font-[600] text-[#0955AC]">Destination Place</label>
                                    <select
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full rounded-[10px] border px-3 py-4 border-[#0955AC] focus:ring-[#0955AC]"
                                    >
                                        <option value="">Select your destination point</option>
                                        {DestinationOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!canContinue || submitting}
                                    className={`mt-2 w-full rounded-[10px] px-6 py-5 text-white font-[700] ${
                                        canContinue && !submitting
                                            ? "bg-[#0955AC] hover:bg-[#074489]"
                                            : "bg-[#0955AC]/40 cursor-not-allowed"
                                    }`}
                                >
                                    {submitting ? "Processing…" : isRoundTrip ? "Confirm Round Trip Booking" : "Continue to pay"}
                                </button>
                            </form>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 rounded-[10px] border border-gray-200 p-4">
                            <ul className="space-y-3">
                                {legend.map((l) => (
                                    <li key={l.label} className="flex items-center gap-3">
                                        <span className={`inline-block h-6 w-6 rounded ${l.color}`} />
                                        <span className="text-gray-700">{l.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const SeatButton = ({ seat, selected, onClick }) => {
    const base = "h-10 w-10 rounded-md text-xs font-semibold flex items-center justify-center transition-all";

    let cls = "";
    let isDisabled = false;

    if (seat.status === STATUS.BOOKED) {
        cls = "bg-[#C7C7C7] text-gray-600 cursor-not-allowed";
        isDisabled = true;
    } else if (seat.status === STATUS.AVAILABLE) {
        cls = "bg-[#62B36F] text-white hover:bg-[#62B36F]/80 cursor-pointer";
    }

    if (selected && !isDisabled) {
        cls = "bg-[#0955AC] text-white ring-2 ring-[#0955AC]/50 cursor-pointer";
    }

    return (
        <button
            type="button"
            className={`${base} ${cls}`}
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            title={isDisabled ? "This seat is already booked" : "Click to select this seat"}
        >
            {seat.id}
        </button>
    );
};

export default BusTicketBookingPreview;
