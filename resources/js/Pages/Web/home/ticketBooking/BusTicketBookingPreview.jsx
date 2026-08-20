import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import TripRouteMap from "../../components/ticketBooking/TripRouteMap";
import LocaleSelector from "../../components/ticketBooking/LocaleSelector";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

const COL_LEFT = 2; // two seats left of aisle
const COL_RIGHT = 2; // two seats right of aisle

// seat statuses
const STATUS = {
    AVAILABLE: "available",
    BOOKED: "booked",
};

function buildSeatMap(seatLayout, bookedSeats, bookedSeatGenders) {
    if (!seatLayout) {
        seatLayout = { rows: 13, columns: 4, totalSeats: 52, aisle: 2 };
    }

    let num = 1;
    const map = [];
    const bookedSeatNumbers = bookedSeats || [];
    const genders = bookedSeatGenders || {};

    const makeSeat = (id) => {
        const isBooked = bookedSeatNumbers.includes(id) || bookedSeatNumbers.includes(id.toString());
        return {
            id,
            status: isBooked ? STATUS.BOOKED : STATUS.AVAILABLE,
            // Gender of whoever already booked this seat, if known — undefined
            // for legacy bookings made before seats carried gender data.
            bookedGender: isBooked ? (genders[id] || genders[id.toString()] || null) : null,
        };
    };

    for (let r = 0; r < seatLayout.rows; r++) {
        const row = [];

        for (let c = 0; c < COL_LEFT; c++) {
            if (num <= seatLayout.totalSeats) {
                row.push(makeSeat(num));
                num++;
            }
        }

        row.push(null); // aisle

        for (let c = 0; c < COL_RIGHT; c++) {
            if (num <= seatLayout.totalSeats) {
                row.push(makeSeat(num));
                num++;
            }
        }

        map.push(row);
    }

    return map;
}

const legend = [
    { label: "Available", swatch: "bg-white border-2 border-gray-300" },
    { label: "Selected by You", swatch: "bg-[#62B36F]" },
    { label: "Booked — Male", swatch: "bg-[#2563EB]" },
    { label: "Booked — Female", swatch: "bg-[#D6336C]" },
];

/** One leg's trip-info card + map + seat grid. Fully presentational. */
function TripSeatPanel({ label, trip, seatLayout, bookedSeats, bookedSeatGenders, selected, onToggle, genders }) {
    const { formatPrice } = useLocale();
    const seatMap = useMemo(
        () => buildSeatMap(seatLayout, bookedSeats, bookedSeatGenders),
        [seatLayout, bookedSeats, bookedSeatGenders]
    );

    if (!trip) return null;

    return (
        <div className="rounded-2xl border border-[#EEF2F6] overflow-hidden bg-white shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-4 sm:px-5 py-3.5 flex items-center justify-between">
                <span className="font-[800] text-white text-[16px] sm:text-lg">{label}</span>
                <span className="text-white/90 text-sm font-[600]">{trip.day}</span>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b border-[#F1F5F9]">
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
                    <p className="font-medium text-[#0955AC]">{formatPrice(trip.price)}</p>
                </div>
            </div>

            {trip.route && (
                <div className="p-4 sm:p-5 border-b border-[#F1F5F9]">
                    <TripRouteMap route={trip.route} className="h-[180px] rounded-xl overflow-hidden" />
                </div>
            )}

            <div className="p-4 sm:p-6 flex justify-center">
                <div className="inline-block items-center">
                    <div className="mx-auto mb-4 w-[120px] rounded-full bg-[#F1F5F9] py-2 text-center text-[#334155] font-[700] text-sm">
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
                                            selectedGender={genders[s.id]}
                                            onClick={() => onToggle(s.id, s.status)}
                                        />
                                    ))}
                                    <div className="w-6" />
                                    {row.slice(COL_LEFT + 1).filter((s) => s !== null).map((s) => (
                                        <SeatButton
                                            key={s.id}
                                            seat={s}
                                            selected={selected.includes(s.id)}
                                            selectedGender={genders[s.id]}
                                            onClick={() => onToggle(s.id, s.status)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#F1F5F9] pt-3">
                <span className="text-[#0955AC] font-[700] text-sm">Seats</span>
                {selected.length === 0 ? (
                    <p className="text-red-500 text-sm mt-2">Please select your seats</p>
                ) : (
                    <p className="mt-2 text-[#0F172A] font-[700] text-sm">
                        {[...selected].sort((a, b) => a - b).join(", ")}
                    </p>
                )}
            </div>
        </div>
    );
}

/** "Select Gender" popup shown the moment a passenger picks an available seat. */
function GenderPromptModal({ seatId, onSelect, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between px-6 pt-5">
                    <h3 className="text-lg font-[800] text-gray-900">Select Gender</h3>
                    <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>
                <p className="px-6 mt-2 text-sm text-gray-500">
                    Seat {seatId} — please be mindful if the next seat is booked by a passenger of the opposite gender.
                </p>
                <div className="flex gap-3 px-6 mt-5">
                    <button
                        type="button"
                        onClick={() => onSelect("male")}
                        className="flex-1 py-3 rounded-lg bg-[#0955AC] text-white font-[700] hover:bg-[#073E82] transition-colors"
                    >
                        Male
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelect("female")}
                        className="flex-1 py-3 rounded-lg bg-[#D6336C] text-white font-[700] hover:bg-[#B02A5B] transition-colors"
                    >
                        Female
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full mt-4 py-3 border-t border-gray-100 text-gray-500 font-[600] text-sm hover:bg-gray-50 rounded-b-xl"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

const BusTicketBookingPreviewInner = ({ trip, searchParams, bookedSeats, bookedSeatGenders, seatLayout, returnTrip, returnBookedSeats, returnBookedSeatGenders, returnSeatLayout }) => {
    const { t, formatPrice } = useLocale();
    const isRoundTrip = !!returnTrip;

    const [selected, setSelected] = useState([]);
    const [returnSelected, setReturnSelected] = useState([]);
    const [seatGenders, setSeatGenders] = useState({});
    const [returnSeatGenders, setReturnSeatGenders] = useState({});
    const [passengerName, setPassengerName] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [boarding, setBoarding] = useState("");
    const [destination, setDestination] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Which seat is currently waiting on a gender pick: { leg: 'outbound'|'return', seatId }
    const [genderPrompt, setGenderPrompt] = useState(null);

    // Boarding/drop-off choices follow whatever route was actually searched —
    // sub-stops near the departure/arrival station — instead of a fixed list.
    const boardingOptions = trip?.boardingPoints?.length
        ? trip.boardingPoints
        : (trip?.departureStation ? [trip.departureStation] : []);
    const destinationOptions = trip?.dropoffPoints?.length
        ? trip.dropoffPoints
        : (trip?.arrivalStation ? [trip.arrivalStation] : []);

    // Selecting a new seat doesn't add it right away — gender is required up
    // front, so we ask for it first and only add the seat once it's answered.
    // Clicking an already-selected seat still deselects it immediately.
    const toggleSeat = (seatId, status) => {
        if (status === STATUS.BOOKED) return;
        if (selected.includes(seatId)) {
            setSelected((prev) => prev.filter((id) => id !== seatId));
            setSeatGenders((prev) => {
                const next = { ...prev };
                delete next[seatId];
                return next;
            });
            return;
        }
        setGenderPrompt({ leg: "outbound", seatId });
    };

    const toggleReturnSeat = (seatId, status) => {
        if (status === STATUS.BOOKED) return;
        if (returnSelected.includes(seatId)) {
            setReturnSelected((prev) => prev.filter((id) => id !== seatId));
            setReturnSeatGenders((prev) => {
                const next = { ...prev };
                delete next[seatId];
                return next;
            });
            return;
        }
        setGenderPrompt({ leg: "return", seatId });
    };

    const confirmGenderPrompt = (gender) => {
        if (!genderPrompt) return;
        const { leg, seatId } = genderPrompt;
        if (leg === "return") {
            setReturnSelected((prev) => (prev.includes(seatId) ? prev : [...prev, seatId]));
            setReturnSeatGenders((prev) => ({ ...prev, [seatId]: gender }));
        } else {
            setSelected((prev) => (prev.includes(seatId) ? prev : [...prev, seatId]));
            setSeatGenders((prev) => ({ ...prev, [seatId]: gender }));
        }
        setGenderPrompt(null);
    };

    const cancelGenderPrompt = () => setGenderPrompt(null);

    const outboundTotal = selected.length * (trip?.price || 0);
    const returnTotal = returnSelected.length * (returnTrip?.price || 0);
    const total = outboundTotal + returnTotal;

    const allSeatsHaveGender = (seatIds, genders) => seatIds.every((id) => genders[id]);

    const canContinue =
        selected.length > 0 &&
        allSeatsHaveGender(selected, seatGenders) &&
        (!isRoundTrip || (returnSelected.length > 0 && allSeatsHaveGender(returnSelected, returnSeatGenders))) &&
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
            seat_genders: seatGenders,
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
            bookingData.return_seat_genders = returnSeatGenders;
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
        <div className="bg-[#F6F7F9] min-h-screen">
            <Head title="Select Your Seats - Transport Jaan" />
            <Header />
            <section className="mx-auto w-full max-w-[1300px] px-4 md:px-6 lg:px-8 py-10 sm:py-14">
                {/* Back — this page is reached either from the standalone bus search
                    (busTicketBookingDetails) or from the multimodal journey planner,
                    which embeds the exact same results list inline. A hardcoded link
                    to busTicketBookingDetails would silently hijack users coming from
                    the planner, so honor real navigation history instead and only
                    fall back to a fixed destination when there's nowhere to go back to
                    (e.g. the page was opened directly). */}
                <div className="mb-5">
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
                        className="inline-flex items-center gap-2 text-[#0955AC] text-[14px] font-[700] hover:text-[#073E82] transition-colors"
                    >
                        <span className="inline-block rounded-full border border-[#0955AC]/20 bg-white p-1.5 leading-none shadow-[0_2px_10px_rgba(15,23,42,0.05)]">←</span>
                        Back
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-2xl md:text-3xl font-[800] text-[#0F172A]">
                        {isRoundTrip ? t("select_seats_both", "Select seats for both journeys") : t("select_seats_form", "Select seats & fill form")}
                    </h1>
                    <LocaleSelector />
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Seat layout(s) */}
                    <div className="lg:col-span-2 space-y-6">
                        <TripSeatPanel
                            label={isRoundTrip ? "Departure" : "Your Trip"}
                            trip={trip}
                            seatLayout={seatLayout}
                            bookedSeats={bookedSeats}
                            bookedSeatGenders={bookedSeatGenders}
                            selected={selected}
                            onToggle={toggleSeat}
                            genders={seatGenders}
                        />
                        {isRoundTrip && (
                            <TripSeatPanel
                                label="Return"
                                trip={returnTrip}
                                seatLayout={returnSeatLayout}
                                bookedSeats={returnBookedSeats}
                                bookedSeatGenders={returnBookedSeatGenders}
                                selected={returnSelected}
                                onToggle={toggleReturnSeat}
                                genders={returnSeatGenders}
                            />
                        )}
                    </div>

                    {/* Right side: form & legend */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-[#EEF2F6] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.05)] overflow-hidden">
                            <div className="px-5 py-5 bg-gradient-to-r from-[#0955AC] to-[#073E82]">
                                <h2 className="text-lg font-[800] text-white">{t("passenger_details", "Passenger Details")}</h2>
                            </div>

                            <form onSubmit={onSubmit} className="px-5 py-5 space-y-4">
                                {isRoundTrip && (
                                    <div className="space-y-2 pb-3 border-b border-[#F1F5F9]">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#64748B]">Departure ({selected.length} seats)</span>
                                            <span className="font-[700] text-[#334155]">{formatPrice(outboundTotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#64748B]">Return ({returnSelected.length} seats)</span>
                                            <span className="font-[700] text-[#334155]">{formatPrice(returnTotal)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3">
                                    <span className="text-[#334155] font-[700] text-sm">Total</span>
                                    <span className="text-[#0955AC] text-xl font-[800]">{formatPrice(total)}</span>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[12px] font-[700] text-[#64748B] tracking-wide">{t("passenger_name", "Passenger Name")}</label>
                                    <input
                                        type="text"
                                        value={passengerName}
                                        onChange={(e) => setPassengerName(e.target.value)}
                                        placeholder="Enter passenger name"
                                        className="w-full rounded-[12px] border border-[#E2E8F0] px-3.5 py-3 text-[14px] font-[600] text-[#0F172A] outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[12px] font-[700] text-[#64748B] tracking-wide">{t("mobile_number", "Mobile Number")}</label>
                                    <input
                                        type="tel"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        placeholder="071 234 5678"
                                        className="w-full rounded-[12px] border border-[#E2E8F0] px-3.5 py-3 text-[14px] font-[600] text-[#0F172A] outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[12px] font-[700] text-[#64748B] tracking-wide">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@domain.com"
                                        className="w-full rounded-[12px] border border-[#E2E8F0] px-3.5 py-3 text-[14px] font-[600] text-[#0F172A] outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[12px] font-[700] text-[#64748B] tracking-wide">{t("boarding_place", "Boarding Place")}</label>
                                    <select
                                        value={boarding}
                                        onChange={(e) => setBoarding(e.target.value)}
                                        className="w-full rounded-[12px] border border-[#E2E8F0] px-3.5 py-3 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                    >
                                        <option value="" disabled>Select your boarding point</option>
                                        {boardingOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-[12px] font-[700] text-[#64748B] tracking-wide">{t("dropoff_place", "Drop-off Place")}</label>
                                    <select
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className="w-full rounded-[12px] border border-[#E2E8F0] px-3.5 py-3 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                    >
                                        <option value="" disabled>Select your drop-off point</option>
                                        {destinationOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!canContinue || submitting}
                                    className={`mt-2 w-full rounded-[12px] px-6 py-4 text-white font-[700] text-[15px] transition-colors ${
                                        canContinue && !submitting
                                            ? "bg-[#0955AC] hover:bg-[#073E82] shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                                            : "bg-[#CBD5E1] cursor-not-allowed"
                                    }`}
                                >
                                    {submitting ? "Processing…" : isRoundTrip ? "Confirm Round Trip Booking" : t("continue_to_pay", "Continue to pay")}
                                </button>
                            </form>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 rounded-2xl border border-[#EEF2F6] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                            <ul className="space-y-3">
                                {legend.map((l) => (
                                    <li key={l.label} className="flex items-center gap-3">
                                        <span className={`inline-block h-5 w-5 rounded-md ${l.swatch}`} />
                                        <span className="text-[#334155] text-[14px] font-[600]">{l.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {genderPrompt && (
                <GenderPromptModal
                    seatId={genderPrompt.seatId}
                    onSelect={confirmGenderPrompt}
                    onCancel={cancelGenderPrompt}
                />
            )}
        </div>
    );
};

/**
 * Available seats are outlined, selected seats are green, and already-booked
 * seats are coloured by who booked them (blue = male, pink = female) instead
 * of a flat grey — legacy bookings with no recorded gender fall back to grey.
 * A selected seat also carries a small coloured dot marking the gender the
 * current passenger picked for it.
 */
const SeatButton = ({ seat, selected, selectedGender, onClick }) => {
    const base = "relative h-10 w-10 rounded-md text-xs font-semibold flex items-center justify-center transition-all";

    let cls = "";
    let isDisabled = false;
    let title = "Click to select this seat";

    if (seat.status === STATUS.BOOKED) {
        isDisabled = true;
        if (seat.bookedGender === "male") {
            cls = "bg-[#2563EB] text-white cursor-not-allowed";
            title = "Already booked (Male)";
        } else if (seat.bookedGender === "female") {
            cls = "bg-[#D6336C] text-white cursor-not-allowed";
            title = "Already booked (Female)";
        } else {
            cls = "bg-[#C7C7C7] text-gray-600 cursor-not-allowed";
            title = "This seat is already booked";
        }
    } else {
        cls = "bg-white border-2 border-gray-300 text-gray-700 hover:border-[#62B36F] cursor-pointer";
    }

    if (selected && !isDisabled) {
        cls = "bg-[#62B36F] text-white cursor-pointer";
        title = "Click to deselect this seat";
    }

    return (
        <button
            type="button"
            className={`${base} ${cls}`}
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            title={title}
        >
            {seat.id}
            {selected && selectedGender && (
                <span
                    className={`absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        selectedGender === "female" ? "bg-[#D6336C]" : "bg-[#2563EB]"
                    }`}
                    title={selectedGender === "female" ? "Female" : "Male"}
                />
            )}
        </button>
    );
};

const BusTicketBookingPreview = (props) => (
    <LocaleProvider>
        <BusTicketBookingPreviewInner {...props} />
    </LocaleProvider>
);

export default BusTicketBookingPreview;
