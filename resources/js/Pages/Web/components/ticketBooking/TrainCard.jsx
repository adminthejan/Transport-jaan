import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { Search } from "lucide-react";

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

// LocationDropdown component for train stations
const StationDropdown = ({ label, id, value, onChange, placeholder, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const [filteredStations, setFilteredStations] = useState([]);

    const handleInputChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        onChange(term);

        if (term.length > 0) {
            const filtered = trainStations.filter(station =>
                station.name.toLowerCase().includes(term.toLowerCase()) ||
                station.city.toLowerCase().includes(term.toLowerCase()) ||
                station.code.toLowerCase().includes(term.toLowerCase()) ||
                station.province.toLowerCase().includes(term.toLowerCase())
            );
            setFilteredStations(filtered);
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const handleStationSelect = (station) => {
        const selectedValue = `${station.name} (${station.code})`;
        setSearchTerm(selectedValue);
        onChange(selectedValue);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        if (searchTerm.length > 0) {
            const filtered = trainStations.filter(station =>
                station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                station.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                station.province.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredStations(filtered);
            setIsOpen(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding dropdown to allow for click events
        setTimeout(() => setIsOpen(false), 150);
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block mb-1 text-[#286BB6] text-[13px] font-[400]">
                {label}
            </label>
            <input
                type="text"
                id={id}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={placeholder}
                className={`appearance-none w-full border-[1px] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline placeholder:text-[#286BB6] ${
                    error ? 'border-red-500' : 'border-[#0000001A]'
                }`}
                autoComplete="off"
                required
            />

            {/* Dropdown List */}
            {isOpen && filteredStations.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-60 overflow-y-auto mt-1">
                    {filteredStations.slice(0, 10).map((station, index) => (
                        <div
                            key={`${station.code}-${index}`}
                            onClick={() => handleStationSelect(station)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-[#286BB6] text-sm">
                                        {station.name}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                        {station.city}, {station.province}
                                    </div>
                                </div>
                                <div className="text-[#0955AC] font-bold text-xs bg-blue-100 px-2 py-1 rounded">
                                    {station.code}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TrainCard = () => {
    const [tripType, setTripType] = useState("oneway");
    const [formData, setFormData] = useState({
        fromStation: '',
        toStation: '',
        departureDate: '',
        returnDate: ''
    });

    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);

    const [errors, setErrors] = useState({});

    const handleCount = (setter, delta) => {
        setter((prev) => Math.max(0, prev + delta));
    };

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

        // If validation passes, navigate to train booking details
        const url = `/trainTicketBookingDetails?from=${encodeURIComponent(formData.fromStation)}&to=${encodeURIComponent(formData.toStation)}&departureDate=${formData.departureDate}&returnDate=${formData.returnDate}&tripType=${tripType}&adults=${adults}&children=${children}&infants=${infants}`;
        window.location.href = url;
    };

    const onSubmitTrain = (e) => {
        e.preventDefault();
        handleSearchClick(e);
    };

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(9,85,172,0.10)] border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5 text-center">
                <span className="text-yellow-400 font-bold text-[18px] tracking-wide">Find Your Trains</span>
            </div>

            <form onSubmit={onSubmitTrain} className="figtree flex flex-col justify-center items-center bg-white p-6 sm:p-10 w-full h-auto text-[#286BB6] text-[13px] font-[400] space-y-6">
                {/* Trip Type segmented control */}
                <div className="inline-flex bg-[#F1F5F9] rounded-full p-1 w-full sm:w-auto">
                    {["One way", "Round Trip"].map(
                        (type, index) => {
                            const value = type.toLowerCase().replace(" ", "");
                            const isActive = tripType === value;
                            return (
                                <button
                                    type="button"
                                    key={index}
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full text-[13px] font-[700] transition-all ${
                                        isActive ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                                    }`}
                                    onClick={() => setTripType(value)}
                                >
                                    {type}
                                </button>
                            );
                        }
                    )}
                </div>

                {/* From & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 justify-between w-full gap-4">
                    <div>
                        <StationDropdown
                            label="From Station *"
                            id="fromStation"
                            value={formData.fromStation}
                            onChange={(value) => handleInputChange('fromStation', value)}
                            placeholder="Search departure station"
                            error={errors.fromStation}
                        />
                        {errors.fromStation && (
                            <p className="text-red-500 text-xs mt-1">{errors.fromStation}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="departureDate" className="block mb-1 text-[#286BB6] text-[13px] font-[400]">
                            Departure Date *
                        </label>
                        <input
                            type="text"
                            id="departureDate"
                            value={formData.departureDate}
                            onChange={(e) => handleInputChange('departureDate', e.target.value)}
                            placeholder="DD/MM/YYYY"
                            className={`w-full border-[1px] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline placeholder:text-[#286BB6] ${
                                errors.departureDate ? 'border-red-500' : 'border-[#0000001A]'
                            }`}
                            onFocus={(e) => (e.target.type = "date")}
                            onBlur={(e) => (e.target.type = "text")}
                            required
                        />
                        {errors.departureDate && (
                            <p className="text-red-500 text-xs mt-1">{errors.departureDate}</p>
                        )}
                    </div>
                </div>

                {/* To (+ Return Date when Round Trip) */}
                {tripType === "roundtrip" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 justify-between w-full gap-4">
                        <div>
                            <StationDropdown
                                label="To Station *"
                                id="toStation"
                                value={formData.toStation}
                                onChange={(value) => handleInputChange('toStation', value)}
                                placeholder="Search destination station"
                                error={errors.toStation}
                            />
                            {errors.toStation && (
                                <p className="text-red-500 text-xs mt-1">{errors.toStation}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="returnDate" className="block mb-1 text-[#286BB6] text-[13px] font-[400]">
                                Return Date *
                            </label>
                            <input
                                type="text"
                                id="returnDate"
                                value={formData.returnDate}
                                onChange={(e) => handleInputChange('returnDate', e.target.value)}
                                placeholder="DD/MM/YYYY"
                                className={`w-full border-[1px] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline placeholder:text-[#286BB6] ${
                                    errors.returnDate ? 'border-red-500' : 'border-[#0000001A]'
                                }`}
                                onFocus={(e) => (e.target.type = "date")}
                                onBlur={(e) => (e.target.type = "text")}
                                required
                            />
                            {errors.returnDate && (
                                <p className="text-red-500 text-xs mt-1">{errors.returnDate}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full">
                        <StationDropdown
                            label="To Station *"
                            id="toStation"
                            value={formData.toStation}
                            onChange={(value) => handleInputChange('toStation', value)}
                            placeholder="Search destination station"
                            error={errors.toStation}
                        />
                        {errors.toStation && (
                            <p className="text-red-500 text-xs mt-1">{errors.toStation}</p>
                        )}
                    </div>
                )}

                {/* Counters */}
                <div className="grid grid-cols-3 gap-4 w-full">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center border-[1px] border-[#0000001A] rounded-[8px]">
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-l-[8px]"
                                onClick={() => handleCount(setAdults, -1)}
                            >
                                -
                            </button>
                            <span className="px-4 py-2 text-[#286BB6] font-medium">{adults}</span>
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-r-[8px]"
                                onClick={() => handleCount(setAdults, 1)}
                            >
                                +
                            </button>
                        </div>
                        <p className="text-[11px] mt-1 text-[#286BB6]">Adults (≥10 years)</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center border-[1px] border-[#0000001A] rounded-[8px]">
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-l-[8px]"
                                onClick={() => handleCount(setChildren, -1)}
                            >
                                -
                            </button>
                            <span className="px-4 py-2 text-[#286BB6] font-medium">{children}</span>
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-r-[8px]"
                                onClick={() => handleCount(setChildren, 1)}
                            >
                                +
                            </button>
                        </div>
                        <p className="text-[11px] mt-1 text-[#286BB6]">Children (6-10 years)</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center border-[1px] border-[#0000001A] rounded-[8px]">
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-l-[8px]"
                                onClick={() => handleCount(setInfants, -1)}
                            >
                                -
                            </button>
                            <span className="px-4 py-2 text-[#286BB6] font-medium">{infants}</span>
                            <button
                                type="button"
                                className="px-3 py-2 text-[#286BB6] hover:bg-blue-50 rounded-r-[8px]"
                                onClick={() => handleCount(setInfants, 1)}
                            >
                                +
                            </button>
                        </div>
                        <p className="text-[11px] mt-1 text-[#286BB6]">Infant (&lt;6 years)</p>
                    </div>
                </div>

                {/* Search Button */}
                <button
                    type="button"
                    onClick={handleSearchClick}
                    className="bg-[#0955AC] text-white font-bold h-[52px] w-full rounded-[12px] focus:outline-none focus:shadow-outline cursor-pointer hover:bg-[#073E82] transition-colors flex justify-center items-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                >
                    <Search className="w-[18px] h-[18px]" />
                    Search Trains
                </button>
            </form>
        </div>
    );
};

export default TrainCard;
