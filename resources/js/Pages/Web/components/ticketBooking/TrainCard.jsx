import React, { useMemo, useState } from "react";
import { MapPin, ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import PassengerSelector from "./PassengerSelector";
import TripRouteMap from "./TripRouteMap";
import { AutoCompleteField, DateField, SubmitButton, SegmentedControl, SwapButton } from "./shared/FormElements";

// Train stations data for Sri Lanka — lat/lng are placeholder coordinates
// (no geocoding backend yet) used only to preview the route on a map.
const trainStations = [
    // Major railway stations in Sri Lanka
    { code: "CMB", name: "Colombo Fort Railway Station", city: "Colombo", province: "Western Province", lat: 6.9344, lng: 79.8428 },
    { code: "MDA", name: "Maradana Railway Station", city: "Colombo", province: "Western Province", lat: 6.9291, lng: 79.8636 },
    { code: "KDT", name: "Kandy Railway Station", city: "Kandy", province: "Central Province", lat: 7.2924, lng: 80.6337 },
    { code: "GAL", name: "Galle Railway Station", city: "Galle", province: "Southern Province", lat: 6.0329, lng: 80.2168 },
    { code: "MTR", name: "Matara Railway Station", city: "Matara", province: "Southern Province", lat: 5.9549, lng: 80.5540 },
    { code: "ANP", name: "Anuradhapura Railway Station", city: "Anuradhapura", province: "North Central Province", lat: 8.3114, lng: 80.4037 },
    { code: "POL", name: "Polonnaruwa Railway Station", city: "Polonnaruwa", province: "North Central Province", lat: 7.9403, lng: 81.0188 },
    { code: "BTL", name: "Batticaloa Railway Station", city: "Batticaloa", province: "Eastern Province", lat: 7.7170, lng: 81.7000 },
    { code: "TNK", name: "Trincomalee Railway Station", city: "Trincomalee", province: "Eastern Province", lat: 8.5711, lng: 81.2335 },
    { code: "KUR", name: "Kurunegala Railway Station", city: "Kurunegala", province: "North Western Province", lat: 7.4867, lng: 80.3647 },
    { code: "PND", name: "Puttalam Railway Station", city: "Puttalam", province: "North Western Province", lat: 8.0362, lng: 79.8283 },
    { code: "RTP", name: "Ratnapura Railway Station", city: "Ratnapura", province: "Sabaragamuwa Province", lat: 6.6828, lng: 80.3992 },
    { code: "BDL", name: "Badulla Railway Station", city: "Badulla", province: "Uva Province", lat: 6.9934, lng: 81.0550 },
    { code: "BAN", name: "Bandarawela Railway Station", city: "Bandarawela", province: "Uva Province", lat: 6.8333, lng: 80.9833 },
    { code: "ELA", name: "Ella Railway Station", city: "Ella", province: "Uva Province", lat: 6.8667, lng: 81.0466 },
    { code: "NWE", name: "Nanu Oya Railway Station", city: "Nuwara Eliya", province: "Central Province", lat: 6.9497, lng: 80.7590 },
    { code: "HTN", name: "Hatton Railway Station", city: "Hatton", province: "Central Province", lat: 6.8917, lng: 80.5956 },
    { code: "NRL", name: "Nawalapitiya Railway Station", city: "Nawalapitiya", province: "Central Province", lat: 7.0533, lng: 80.5333 },
    { code: "PER", name: "Peradeniya Railway Station", city: "Peradeniya", province: "Central Province", lat: 7.2694, lng: 80.5972 },
    { code: "GMP", name: "Gampaha Railway Station", city: "Gampaha", province: "Western Province", lat: 7.0917, lng: 80.0000 },
    { code: "RGM", name: "Ragama Railway Station", city: "Ragama", province: "Western Province", lat: 7.0297, lng: 79.9186 },
    { code: "VYA", name: "Veyangoda Railway Station", city: "Veyangoda", province: "Western Province", lat: 7.1550, lng: 80.0656 },
    { code: "MHO", name: "Mirigama Railway Station", city: "Mirigama", province: "Western Province", lat: 7.2494, lng: 80.1236 },
    { code: "PLM", name: "Pallewela Railway Station", city: "Pallewela", province: "Central Province", lat: 7.1667, lng: 80.4167 },
    { code: "AMB", name: "Ambalangoda Railway Station", city: "Ambalangoda", province: "Southern Province", lat: 6.2354, lng: 80.0540 },
    { code: "HIK", name: "Hikkaduwa Railway Station", city: "Hikkaduwa", province: "Southern Province", lat: 6.1408, lng: 80.1017 },
    { code: "UNW", name: "Unawatuna Railway Station", city: "Unawatuna", province: "Southern Province", lat: 6.0108, lng: 80.2500 },
    { code: "KLT", name: "Kalutara South Railway Station", city: "Kalutara", province: "Western Province", lat: 6.5831, lng: 79.9608 },
    { code: "ALT", name: "Aluthgama Railway Station", city: "Aluthgama", province: "Western Province", lat: 6.4292, lng: 79.9958 },
    { code: "BEN", name: "Bentota Railway Station", city: "Bentota", province: "Southern Province", lat: 6.4260, lng: 80.0004 },
];

const STATION_BY_LABEL = trainStations.reduce((map, s) => {
    map[`${s.name} (${s.code})`] = s;
    return map;
}, {});

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

    // Preview route on a map once both stations are picked and recognized —
    // uses the placeholder coordinates above since there's no geocoding yet.
    const previewRoute = useMemo(() => {
        const origin = STATION_BY_LABEL[formData.fromStation];
        const destination = STATION_BY_LABEL[formData.toStation];
        if (!origin || !destination) return null;
        return {
            origin: { lat: origin.lat, lng: origin.lng, label: origin.name },
            destination: { lat: destination.lat, lng: destination.lng, label: destination.name },
        };
    }, [formData.fromStation, formData.toStation]);

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
        <div className="figtree bg-white p-4 sm:p-5 lg:p-6 rounded-[20px] border border-black/5 shadow-[0_12px_32px_rgba(9,85,172,0.10)]">
            <form onSubmit={onSubmitTrain}>
                <div className="mb-3 sm:mb-3.5">
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
                            id="fromStation"
                            value={formData.fromStation}
                            onChange={(value) => handleInputChange('fromStation', value)}
                            placeholder="Search departure station"
                            error={errors.fromStation}
                            icon={MapPin}
                            iconColor="text-[#0955AC]"
                            variant="outline"
                            options={trainStations}
                            getSearchText={stationSearchText}
                            getKey={(s) => s.code}
                            getValue={(s) => `${s.name} (${s.code})`}
                            renderOption={renderStationOption}
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
                            id="toStation"
                            value={formData.toStation}
                            onChange={(value) => handleInputChange('toStation', value)}
                            placeholder="Search destination station"
                            error={errors.toStation}
                            icon={MapPin}
                            iconBg="bg-[#FDEDEA]"
                            iconColor="text-[#EF3826]"
                            variant="outline"
                            options={trainStations}
                            getSearchText={stationSearchText}
                            getKey={(s) => s.code}
                            getValue={(s) => `${s.name} (${s.code})`}
                            renderOption={renderStationOption}
                        />
                    </div>

                    {/* Departure Date */}
                    <div className={`w-full ${tripType === 'roundtrip' ? 'lg:w-[145px] xl:w-[160px]' : 'lg:w-[160px] xl:w-[180px]'} shrink-0`}>
                        <DateField
                            label={t("departure_date", "DEPARTURE DATE").toUpperCase()}
                            id="departureDate"
                            value={formData.departureDate}
                            onChange={(e) => handleInputChange('departureDate', e.target.value)}
                            error={errors.departureDate}
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
                                value={formData.returnDate}
                                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                error={errors.returnDate}
                                icon={CalendarDays}
                                iconBg="bg-[#FDEDEA]"
                                iconColor="text-[#EF3826]"
                                variant="outline"
                                min={formData.departureDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    )}

                    {/* Passengers */}
                    <div className={`w-full ${tripType === 'roundtrip' ? 'lg:w-[145px] xl:w-[160px]' : 'lg:w-[160px] xl:w-[180px]'} shrink-0`}>
                        <PassengerSelector value={passengers} onChange={setPassengers} />
                    </div>

                    {/* Search Trains Button */}
                    <div className="w-full lg:w-auto shrink-0 flex flex-col justify-end pt-5 lg:pt-0">
                        <div className="hidden lg:block h-[18px]" /> {/* Spacer aligning with field label */}
                        <button
                            type="submit"
                            title={t("search_trains", "Search Trains")}
                            aria-label={t("search_trains", "Search Trains")}
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

export default TrainCard;
