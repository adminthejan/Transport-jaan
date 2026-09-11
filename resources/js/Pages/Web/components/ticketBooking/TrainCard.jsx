import React, { useState } from "react";
import { MapPin, ArrowLeftRight, CalendarDays, Search, TrainFront } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import PassengerSelector from "./PassengerSelector";
import CardHeader from "./shared/CardHeader";
import { AutoCompleteField, DateField, SubmitButton, SegmentedControl, SwapButton } from "./shared/FormElements";

// Train stations data for Sri Lanka
const trainStations = [
    // Major railway stations in Sri Lanka
    { code: "CMB", name: "Colombo Fort Railway Station", city: "Colombo", province: "Western Province" },
    { code: "MDA", name: "Maradana Railway Station", city: "Colombo", province: "Western Province" },
    { code: "KDT", name: "Kandy Railway Station", city: "Kandy", province: "Central Province" },
    { code: "GAL", name: "Galle Railway Station", city: "Galle", province: "Southern Province" },
    { code: "MTR", name: "Matara Railway Station", city: "Matara", province: "Southern Province" },
    { code: "ANP", name: "Anuradhapura Railway Station", city: "Anuradhapura", province: "North Central Province" },
    { code: "POL", name: "Polonnaruwa Railway Station", city: "Polonnaruwa", province: "North Central Province" },
    { code: "BTL", name: "Batticaloa Railway Station", city: "Batticaloa", province: "Eastern Province" },
    { code: "TNK", name: "Trincomalee Railway Station", city: "Trincomalee", province: "Eastern Province" },
    { code: "KUR", name: "Kurunegala Railway Station", city: "Kurunegala", province: "North Western Province" },
    { code: "PND", name: "Puttalam Railway Station", city: "Puttalam", province: "North Western Province" },
    { code: "RTP", name: "Ratnapura Railway Station", city: "Ratnapura", province: "Sabaragamuwa Province" },
    { code: "BDL", name: "Badulla Railway Station", city: "Badulla", province: "Uva Province" },
    { code: "BAN", name: "Bandarawela Railway Station", city: "Bandarawela", province: "Uva Province" },
    { code: "ELA", name: "Ella Railway Station", city: "Ella", province: "Uva Province" },
    { code: "NWE", name: "Nanu Oya Railway Station", city: "Nuwara Eliya", province: "Central Province" },
    { code: "HTN", name: "Hatton Railway Station", city: "Hatton", province: "Central Province" },
    { code: "NRL", name: "Nawalapitiya Railway Station", city: "Nawalapitiya", province: "Central Province" },
    { code: "PER", name: "Peradeniya Railway Station", city: "Peradeniya", province: "Central Province" },
    { code: "GMP", name: "Gampaha Railway Station", city: "Gampaha", province: "Western Province" },
    { code: "RGM", name: "Ragama Railway Station", city: "Ragama", province: "Western Province" },
    { code: "VYA", name: "Veyangoda Railway Station", city: "Veyangoda", province: "Western Province" },
    { code: "MHO", name: "Mirigama Railway Station", city: "Mirigama", province: "Western Province" },
    { code: "PLM", name: "Pallewela Railway Station", city: "Pallewela", province: "Central Province" },
    { code: "AMB", name: "Ambalangoda Railway Station", city: "Ambalangoda", province: "Southern Province" },
    { code: "HIK", name: "Hikkaduwa Railway Station", city: "Hikkaduwa", province: "Southern Province" },
    { code: "UNW", name: "Unawatuna Railway Station", city: "Unawatuna", province: "Southern Province" },
    { code: "KLT", name: "Kalutara South Railway Station", city: "Kalutara", province: "Western Province" },
    { code: "ALT", name: "Aluthgama Railway Station", city: "Aluthgama", province: "Western Province" },
    { code: "BEN", name: "Bentota Railway Station", city: "Bentota", province: "Southern Province" },
];

const stationSearchText = (s) => `${s.name} ${s.city} ${s.code} ${s.province}`;

const renderStationOption = (station) => (
    <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
            <div className="font-[700] text-[#0F172A] text-[13px] truncate">{station.name}</div>
            <div className="text-[#94A3B8] text-[12px] truncate">{station.city}, {station.province}</div>
        </div>
        <div className="text-[#0955AC] font-[700] text-[11px] bg-[#0955AC]/10 px-2 py-1 rounded shrink-0">{station.code}</div>
    </div>
);

const TrainCard = () => {
    const { t } = useLocale();
    const [tripType, setTripType] = useState("oneway");
    const [formData, setFormData] = useState({
        fromStation: '',
        toStation: '',
        departureDate: '',
        returnDate: ''
    });

    const [passengers, setPassengers] = useState({
        adults: 1,
        youth: 0,
        seniors: 0,
        student: false,
        wheelchair: false,
    });

    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const swapStations = () => {
        setFormData(prev => ({ ...prev, fromStation: prev.toStation, toStation: prev.fromStation }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fromStation.trim()) {
            newErrors.fromStation = 'From station is required';
        }

        if (!formData.toStation.trim()) {
            newErrors.toStation = 'To station is required';
        }

        if (!formData.departureDate.trim()) {
            newErrors.departureDate = 'Departure date is required';
        }

        // For round trip, return date is also required
        if (tripType === 'roundtrip' && !formData.returnDate.trim()) {
            newErrors.returnDate = 'Return date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSearchClick = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            // Scroll to first error field
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                document.getElementById(firstErrorField)?.focus();
            }
            return;
        }

        // If validation passes, navigate to train booking details.
        // Seniors are billed at the same (full) fare as adults, so they're
        // folded into the `adults` count here — the fare calc downstream
        // never needed to change. `youth` reuses the existing "children"
        // discounted-fare tier. Student/wheelchair are captured for future
        // use but don't affect pricing yet.
        const billedAdults = passengers.adults + passengers.seniors;
        const url = `/trainTicketBookingDetails?from=${encodeURIComponent(formData.fromStation)}&to=${encodeURIComponent(formData.toStation)}&departureDate=${formData.departureDate}&returnDate=${formData.returnDate}&tripType=${tripType}&adults=${billedAdults}&children=${passengers.youth}&infants=0&seniors=${passengers.seniors}&student=${passengers.student ? 1 : 0}&wheelchair=${passengers.wheelchair ? 1 : 0}`;
        window.location.href = url;
    };

    const onSubmitTrain = (e) => {
        e.preventDefault();
        handleSearchClick(e);
    };

    return (
        <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
            <CardHeader icon={TrainFront} title={t("find_your_trains", "Find Your Trains")} subtitle="Scenic and intercity routes, seat reserved instantly." />

            <form onSubmit={onSubmitTrain} className="p-6 sm:p-8">
                <SegmentedControl
                    value={tripType}
                    onChange={setTripType}
                    options={[
                        { value: "oneway", label: t("one_way", "One way") },
                        { value: "roundtrip", label: t("round_trip", "Round Trip") },
                    ]}
                />

                {/* From / To with swap button */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <AutoCompleteField
                        label={t("from", "FROM").toUpperCase()}
                        id="fromStation"
                        value={formData.fromStation}
                        onChange={(value) => handleInputChange('fromStation', value)}
                        placeholder="Search departure station"
                        error={errors.fromStation}
                        icon={MapPin}
                        iconColor="text-[#0955AC]"
                        options={trainStations}
                        getSearchText={stationSearchText}
                        getKey={(s) => s.code}
                        getValue={(s) => `${s.name} (${s.code})`}
                        renderOption={renderStationOption}
                    />
                    <AutoCompleteField
                        label={t("to", "TO").toUpperCase()}
                        id="toStation"
                        value={formData.toStation}
                        onChange={(value) => handleInputChange('toStation', value)}
                        placeholder="Search destination station"
                        error={errors.toStation}
                        icon={MapPin}
                        iconBg="bg-[#FDEDEA]"
                        iconColor="text-[#EF3826]"
                        options={trainStations}
                        getSearchText={stationSearchText}
                        getKey={(s) => s.code}
                        getValue={(s) => `${s.name} (${s.code})`}
                        renderOption={renderStationOption}
                    />
                    <SwapButton onClick={swapStations} icon={ArrowLeftRight} />
                </div>

                {/* Dates */}
                <div className={`grid gap-4 mb-6 ${tripType === 'roundtrip' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <DateField
                        label={t("departure_date", "DEPARTURE DATE")}
                        id="departureDate"
                        value={formData.departureDate}
                        onChange={(e) => handleInputChange('departureDate', e.target.value)}
                        error={errors.departureDate}
                        icon={CalendarDays}
                        iconColor="text-[#0955AC]"
                        min={new Date().toISOString().split('T')[0]}
                    />

                    {tripType === 'roundtrip' && (
                        <DateField
                            label={t("return_date", "RETURN DATE")}
                            id="returnDate"
                            value={formData.returnDate}
                            onChange={(e) => handleInputChange('returnDate', e.target.value)}
                            error={errors.returnDate}
                            icon={CalendarDays}
                            iconBg="bg-[#FDEDEA]"
                            iconColor="text-[#EF3826]"
                            min={formData.departureDate || new Date().toISOString().split('T')[0]}
                        />
                    )}
                </div>

                {/* Passengers */}
                <div className="mb-7">
                    <PassengerSelector value={passengers} onChange={setPassengers} />
                </div>

                <SubmitButton icon={Search} iconPosition="left">{t("search_trains", "Search Trains")}</SubmitButton>
            </form>
        </div>
    );
};

export default TrainCard;
