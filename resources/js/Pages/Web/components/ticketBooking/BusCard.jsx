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
        <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
            <CardHeader icon={BusIcon} title={t("find_your_buses", "Find Your Buses")} subtitle="Every route, every operator — one search." />

            <form onSubmit={onSubmitBus} className="p-6 sm:p-8">
                <SegmentedControl
                    value={tripType}
                    onChange={setTripType}
                    options={[
                        { value: "oneway", label: t("one_way", "One way") },
                        { value: "roundtrip", label: t("round_trip", "Round Trip") },
                    ]}
                />

                {/* From / To with swap button */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-14 mb-4">
                    <AutoCompleteField
                        label={t("from", "FROM").toUpperCase()}
                        id="busFrom"
                        value={busFrom}
                        onChange={setBusFrom}
                        placeholder="Search departure station"
                        error={errors.busFrom && "Departure station is required"}
                        icon={MapPin}
                        iconColor="text-[#0955AC]"
                        options={stationOptions}
                    />
                    <AutoCompleteField
                        label={t("to", "TO").toUpperCase()}
                        id="busTo"
                        value={busTo}
                        onChange={setBusTo}
                        placeholder="Search destination station"
                        error={errors.busTo && "Destination station is required"}
                        icon={MapPin}
                        iconBg="bg-[#FDEDEA]"
                        iconColor="text-[#EF3826]"
                        options={stationOptions}
                    />
                    <SwapButton onClick={swapStations} icon={ArrowLeftRight} />
                </div>

                {/* Dates */}
                <div className={`grid gap-4 mb-6 ${tripType === 'roundtrip' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <DateField
                        label={t("journey_date", "JOURNEY DATE").toUpperCase()}
                        id="busDate"
                        value={busDate}
                        onChange={(e) => setBusDate(e.target.value)}
                        error={errors.busDate && "Journey date is required"}
                        icon={CalendarDays}
                        iconColor="text-[#0955AC]"
                        min={new Date().toISOString().split('T')[0]}
                    />

                    {tripType === 'roundtrip' && (
                        <DateField
                            label={t("return_date", "RETURN DATE").toUpperCase()}
                            id="returnDate"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            error={errors.returnDate && "Return date is required"}
                            icon={CalendarDays}
                            iconBg="bg-[#FDEDEA]"
                            iconColor="text-[#EF3826]"
                            min={busDate || new Date().toISOString().split('T')[0]}
                        />
                    )}
                </div>

                <div className="mb-7">
                    <PassengerSelector value={passengers} onChange={setPassengers} />
                </div>

                <SubmitButton icon={Search} iconPosition="left">{t("search_buses", "Search Buses")}</SubmitButton>
            </form>
        </div>
    );
};

export default BusCard;
