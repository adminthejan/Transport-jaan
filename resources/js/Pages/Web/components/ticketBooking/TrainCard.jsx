import React, { useState } from "react";
import { MapPin, ArrowLeftRight, CalendarDays, Search } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import PassengerSelector from "./PassengerSelector";

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

// Autocomplete station field styled to match BusCard's inputs (icon vertically
// centered with absolute + -translate-y-1/2, 52px field height, same border
// language) while keeping the search-as-you-type dropdown behavior.
const StationDropdown = ({ label, id, value, onChange, placeholder, error, iconColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredStations, setFilteredStations] = useState([]);

    const runFilter = (term) => {
        return trainStations.filter(station =>
            station.name.toLowerCase().includes(term.toLowerCase()) ||
            station.city.toLowerCase().includes(term.toLowerCase()) ||
            station.code.toLowerCase().includes(term.toLowerCase()) ||
            station.province.toLowerCase().includes(term.toLowerCase())
        );
    };

    const handleInputChange = (e) => {
        const term = e.target.value;
        onChange(term);

        if (term.length > 0) {
            setFilteredStations(runFilter(term));
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const handleStationSelect = (station) => {
        onChange(`${station.name} (${station.code})`);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        if (value.length > 0) {
            setFilteredStations(runFilter(value));
            setIsOpen(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding dropdown to allow for click events
        setTimeout(() => setIsOpen(false), 150);
    };

    return (
        <div>
            <label htmlFor={id} className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                {label}
            </label>
            <div className="relative">
                <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${iconColor}`} />
                <input
                    type="text"
                    id={id}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    className={`w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white appearance-none outline-none transition-colors ${
                        error ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                    }`}
                    autoComplete="off"
                />

                {/* Dropdown List */}
                {isOpen && filteredStations.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-[12px] shadow-lg max-h-60 overflow-y-auto mt-1.5">
                        {filteredStations.slice(0, 10).map((station, index) => (
                            <div
                                key={`${station.code}-${index}`}
                                onClick={() => handleStationSelect(station)}
                                className="px-4 py-3 hover:bg-[#0955AC]/5 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <div className="font-[700] text-[#0F172A] text-[13px] truncate">
                                            {station.name}
                                        </div>
                                        <div className="text-[#94A3B8] text-[12px] truncate">
                                            {station.city}, {station.province}
                                        </div>
                                    </div>
                                    <div className="text-[#0955AC] font-[700] text-[11px] bg-[#0955AC]/10 px-2 py-1 rounded shrink-0">
                                        {station.code}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

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
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(9,85,172,0.10)] border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5 text-center">
                <span className="text-yellow-400 font-bold text-[18px] tracking-wide">{t("find_your_trains", "Find Your Trains")}</span>
            </div>

            <form onSubmit={onSubmitTrain} className="p-6 sm:p-8">
                {/* Trip Type segmented control */}
                <div className="inline-flex bg-[#F1F5F9] rounded-full p-1 mb-6">
                    {[
                        { value: "oneway", label: t("one_way", "One way") },
                        { value: "roundtrip", label: t("round_trip", "Round Trip") },
                    ].map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setTripType(opt.value)}
                            className={`px-6 py-2 rounded-full text-[13px] font-[700] transition-all ${
                                tripType === opt.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* From / To with swap button */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <StationDropdown
                        label={t("from", "FROM").toUpperCase()}
                        id="fromStation"
                        value={formData.fromStation}
                        onChange={(value) => handleInputChange('fromStation', value)}
                        placeholder="Search departure station"
                        error={errors.fromStation}
                        iconColor="text-[#0955AC]"
                    />
                    <StationDropdown
                        label={t("to", "TO").toUpperCase()}
                        id="toStation"
                        value={formData.toStation}
                        onChange={(value) => handleInputChange('toStation', value)}
                        placeholder="Search destination station"
                        error={errors.toStation}
                        iconColor="text-[#EF3826]"
                    />

                    {/* Swap button, centered on the seam between the two fields */}
                    <button
                        type="button"
                        onClick={swapStations}
                        title="Swap stations"
                        className="hidden md:flex absolute left-1/2 top-[34px] -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-[#0955AC] text-[#0955AC] items-center justify-center shadow-sm hover:bg-[#0955AC] hover:text-white transition-colors z-10"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Dates */}
                <div className={`grid gap-4 mb-6 ${tripType === 'roundtrip' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                        <label htmlFor="departureDate" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                            {t("departure_date", "DEPARTURE DATE")}
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="date"
                                id="departureDate"
                                value={formData.departureDate}
                                onChange={(e) => handleInputChange('departureDate', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white appearance-none outline-none transition-colors ${
                                    errors.departureDate ? 'border-red-400 ring-1 ring-red-200' : 'border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15'
                                }`}
                            />
                        </div>
                        {errors.departureDate && (
                            <p className="text-red-500 text-xs mt-1">{errors.departureDate}</p>
                        )}
                    </div>

                    {tripType === 'roundtrip' && (
                        <div>
                            <label htmlFor="returnDate" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                                {t("return_date", "RETURN DATE")}
                            </label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826] pointer-events-none" />
                                <input
                                    type="date"
                                    id="returnDate"
                                    value={formData.returnDate}
                                    onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                    min={formData.departureDate || new Date().toISOString().split('T')[0]}
                                    className={`w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white appearance-none outline-none transition-colors ${
                                        errors.returnDate ? 'border-red-400 ring-1 ring-red-200' : 'border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15'
                                    }`}
                                />
                            </div>
                            {errors.returnDate && (
                                <p className="text-red-500 text-xs mt-1">{errors.returnDate}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Passengers */}
                <div className="mb-6">
                    <PassengerSelector value={passengers} onChange={setPassengers} />
                </div>

                {/* Search Button */}
                <button
                    type="submit"
                    className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[15px] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                >
                    <Search className="w-[18px] h-[18px]" />
                    {t("search_trains", "Search Trains")}
                </button>
            </form>
        </div>
    );
};

export default TrainCard;
