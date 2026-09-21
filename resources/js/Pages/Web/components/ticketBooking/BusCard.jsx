import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { MapPin, ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import PassengerSelector from "./PassengerSelector";
import TripRouteMap from "./TripRouteMap";
import { AutoCompleteField, DateField, SubmitButton, SegmentedControl, SwapButton } from "./shared/FormElements";

// Approximate coordinates for each bus station — placeholder data so the
// search form can preview the route on a map before results load (no
// geocoding backend yet).
const BUS_STATION_COORDS = {
    "Colombo Central Bus Stand": { lat: 6.9319, lng: 79.8478 },
    "Pettah Bus Station": { lat: 6.9358, lng: 79.8500 },
    "Kandy Bus Terminal": { lat: 7.2924, lng: 80.6337 },
    "Galle Bus Station": { lat: 6.0329, lng: 80.2168 },
    "Matara Bus Station": { lat: 5.9549, lng: 80.5540 },
    "Anuradhapura Bus Station": { lat: 8.3114, lng: 80.4037 },
    "Kurunegala Bus Station": { lat: 7.4867, lng: 80.3647 },
    "Ratnapura Bus Station": { lat: 6.6828, lng: 80.3992 },
    "Badulla Bus Station": { lat: 6.9934, lng: 81.0550 },
    "Jaffna Bus Station": { lat: 9.6615, lng: 80.0255 },
    "Negombo Bus Station": { lat: 7.2083, lng: 79.8358 },
    "Gampaha Bus Station": { lat: 7.0917, lng: 80.0000 },
    "Kalutara Bus Station": { lat: 6.5854, lng: 79.9607 },
    "Hambantota Bus Station": { lat: 6.1246, lng: 81.1185 },
    "Trincomalee Bus Station": { lat: 8.5711, lng: 81.2335 },
    "Batticaloa Bus Station": { lat: 7.7170, lng: 81.7000 },
    "Polonnaruwa Bus Station": { lat: 7.9403, lng: 81.0188 },
    "Nuwara Eliya Bus Station": { lat: 6.9497, lng: 80.7891 },
    "Bandarawela Bus Station": { lat: 6.8333, lng: 80.9833 },
    "Chilaw Bus Station": { lat: 7.5750, lng: 79.7953 },
};

const BusCard = () => {
    const { t } = useLocale();
    const [tripType, setTripType] = useState("oneway");
    const [busFrom, setBusFrom] = useState("");
    const [busTo, setBusTo] = useState("");
    const [busDate, setBusDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [errors, setErrors] = useState({});
    // Bus seats are picked individually at checkout, so this is a search-time
    // preference (shown on results, used as a soft filter) rather than a hard
    // headcount — actual passenger count is still however many seats you pick.
    const [passengers, setPassengers] = useState({
        adults: 1,
        youth: 0,
        seniors: 0,
        student: false,
        wheelchair: false,
    });

    const stationOptions = [
        "Colombo Central Bus Stand",
        "Pettah Bus Station",
        "Kandy Bus Terminal",
        "Galle Bus Station",
        "Matara Bus Station",
        "Anuradhapura Bus Station",
        "Kurunegala Bus Station",
        "Ratnapura Bus Station",
        "Badulla Bus Station",
        "Jaffna Bus Station",
        "Negombo Bus Station",
        "Gampaha Bus Station",
        "Kalutara Bus Station",
        "Hambantota Bus Station",
        "Trincomalee Bus Station",
        "Batticaloa Bus Station",
        "Polonnaruwa Bus Station",
        "Nuwara Eliya Bus Station",
        "Bandarawela Bus Station",
        "Chilaw Bus Station"
    ];

    const swapStations = () => {
        setBusFrom(busTo);
        setBusTo(busFrom);
    };

    // Preview route on a map once both stations are picked and recognized —
    // uses the placeholder coordinates above since there's no geocoding yet.
    const previewRoute = useMemo(() => {
        const origin = BUS_STATION_COORDS[busFrom];
        const destination = BUS_STATION_COORDS[busTo];
        if (!origin || !destination) return null;
        return {
            origin: { ...origin, label: busFrom },
            destination: { ...destination, label: busTo },
        };
    }, [busFrom, busTo]);

    const onSubmitBus = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!busFrom) newErrors.busFrom = true;
        if (!busTo) newErrors.busTo = true;
        if (!busDate) newErrors.busDate = true;
        if (tripType === 'roundtrip' && !returnDate) newErrors.returnDate = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        router.get('/busTicketBookingDetails', {
            from: busFrom,
            to: busTo,
            date: busDate,
            tripType,
            returnDate: tripType === 'roundtrip' ? returnDate : undefined,
            passengers: passengers.adults + passengers.youth + passengers.seniors,
            adults: passengers.adults,
            youth: passengers.youth,
            seniors: passengers.seniors,
            student: passengers.student ? 1 : 0,
            wheelchair: passengers.wheelchair ? 1 : 0,
        });
    };

    return (
        <div className="figtree bg-white p-4 sm:p-5 lg:p-6 rounded-[20px] border border-black/5 shadow-[0_12px_32px_rgba(9,85,172,0.10)]">
            <form onSubmit={onSubmitBus}>
                {/* Trip Type Segmented Control */}
                <div className="flex items-center justify-between gap-3 mb-3.5">
                    <SegmentedControl
                        value={tripType}
                        onChange={setTripType}
                        variant="boxed"
                        options={[
                            { value: "oneway", label: t("one_way", "One way") },
                            { value: "roundtrip", label: t("round_trip", "Round Trip") },
                            { value: "multicity", label: t("multi_city", "Multi-city") },
                        ]}
                    />
                </div>

                {/* All Search Contents in ONE Horizontal Row */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-2.5 sm:gap-3">
                    {/* From Station */}
                    <div className="flex-1 min-w-0">
                        <AutoCompleteField
                            label={t("from", "FROM").toUpperCase()}
                            id="busFrom"
                            value={busFrom}
                            onChange={setBusFrom}
                            placeholder="Departure station"
                            error={errors.busFrom && "Required"}
                            icon={MapPin}
                            iconColor="text-[#0955AC]"
                            variant="outline"
                            options={stationOptions}
                        />
                    </div>

                    {/* Swap Button */}
                    <div className="hidden lg:flex items-center justify-center pt-5 shrink-0">
                        <button
                            type="button"
                            onClick={swapStations}
                            title="Swap departure and destination"
                            className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-[#EAF1FE] text-[#0955AC] flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* To Station */}
                    <div className="flex-1 min-w-0">
                        <AutoCompleteField
                            label={t("to", "TO").toUpperCase()}
                            id="busTo"
                            value={busTo}
                            onChange={setBusTo}
                            placeholder="Destination station"
                            error={errors.busTo && "Required"}
                            icon={MapPin}
                            iconBg="bg-[#FDEDEA]"
                            iconColor="text-[#EF3826]"
                            variant="outline"
                            options={stationOptions}
                        />
                    </div>

                    {/* Journey Date */}
                    <div className={`w-full ${tripType === 'roundtrip' ? 'lg:w-[145px] xl:w-[160px]' : 'lg:w-[160px] xl:w-[180px]'} shrink-0`}>
                        <DateField
                            label={t("journey_date", "JOURNEY DATE").toUpperCase()}
                            id="busDate"
                            value={busDate}
                            onChange={(e) => setBusDate(e.target.value)}
                            error={errors.busDate && "Required"}
                            icon={CalendarDays}
                            iconColor="text-[#0955AC]"
                            variant="outline"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Return Date if Round Trip */}
                    {tripType === 'roundtrip' && (
                        <div className="w-full lg:w-[145px] xl:w-[160px] shrink-0">
                            <DateField
                                label={t("return_date", "RETURN DATE").toUpperCase()}
                                id="returnDate"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                error={errors.returnDate && "Required"}
                                icon={CalendarDays}
                                iconBg="bg-[#FDEDEA]"
                                iconColor="text-[#EF3826]"
                                variant="outline"
                                min={busDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    )}

                    {/* Passengers */}
                    <div className={`w-full ${tripType === 'roundtrip' ? 'lg:w-[145px] xl:w-[160px]' : 'lg:w-[160px] xl:w-[180px]'} shrink-0`}>
                        <PassengerSelector value={passengers} onChange={setPassengers} />
                    </div>

                    {/* Search Buses Button */}
                    <div className="w-full lg:w-auto shrink-0 flex flex-col justify-end pt-5 lg:pt-0">
                        <div className="hidden lg:block h-[18px]" /> {/* Spacer aligning with field label */}
                        <button
                            type="submit"
                            title={t("search_buses", "Search Buses")}
                            aria-label={t("search_buses", "Search Buses")}
                            className="bg-[#0955AC] text-white font-bold h-[46px] sm:h-[48px] w-full lg:w-[48px] flex items-center justify-center rounded-[10px] focus:outline-none cursor-pointer hover:bg-[#074494] transition-colors shadow-[0_8px_18px_rgba(9,85,172,0.25)] shrink-0"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {previewRoute && (
                    <div className="mt-3.5">
                        <TripRouteMap route={previewRoute} className="h-[200px]" />
                    </div>
                )}
            </form>
        </div>
    );
};

export default BusCard;
