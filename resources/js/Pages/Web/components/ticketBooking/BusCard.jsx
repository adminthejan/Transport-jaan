import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { MapPin, ArrowLeftRight, CalendarDays, Search, Bus as BusIcon } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import PassengerSelector from "./PassengerSelector";
import CardHeader from "./shared/CardHeader";
import { AutoCompleteField, DateField, SubmitButton, SegmentedControl, SwapButton } from "./shared/FormElements";

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
        <div className="bg-white rounded-[20px] shadow-[0_12px_40px_rgba(9,85,172,0.12)] border border-black/5 overflow-hidden">
            <CardHeader icon={BusIcon} title={t("find_your_buses", "Find Your Buses")} subtitle="Every route, every operator — one search." />

            <form onSubmit={onSubmitBus} className="p-4 sm:p-5">
                {/* Trip Type Segmented Control */}
                <div className="flex items-center justify-between gap-3 mb-3.5">
                    <SegmentedControl
                        value={tripType}
                        onChange={setTripType}
                        options={[
                            { value: "oneway", label: t("one_way", "One way") },
                            { value: "roundtrip", label: t("round_trip", "Round Trip") },
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
                            className="w-full lg:w-auto h-[46px] sm:h-[48px] px-6 sm:px-7 bg-gradient-to-r from-[#0955AC] to-[#073E82] hover:from-[#0B63C4] hover:to-[#0955AC] text-white font-[700] text-[14px] rounded-[11px] transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)] hover:shadow-[0_12px_28px_rgba(9,85,172,0.32)] hover:-translate-y-0.5 cursor-pointer shrink-0"
                        >
                            <Search className="w-4 h-4" />
                            <span className="whitespace-nowrap">{t("search_buses", "Search Buses")}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BusCard;
