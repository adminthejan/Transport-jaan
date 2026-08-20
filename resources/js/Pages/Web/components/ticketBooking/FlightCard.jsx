import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { PlaneTakeoff, PlaneLanding, CalendarDays, ArrowRight } from "lucide-react";

// Sample airport/location data - you can replace this with API data
const locations = [
    // Major international airports
    { code: "BIA", name: "Bandaranaike International Airport", city: "Colombo", country: "Sri Lanka" },
    { code: "RML", name: "Ratmalana Airport", city: "Colombo", country: "Sri Lanka" },
    { code: "HRI", name: "Mattala Rajapaksa International Airport", city: "Hambantota", country: "Sri Lanka" },
    { code: "ACJ", name: "Anuradhapura Airport", city: "Anuradhapura", country: "Sri Lanka" },
    { code: "JAF", name: "Jaffna Airport", city: "Jaffna", country: "Sri Lanka" },

    // International destinations
    { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE" },
    { code: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar" },
    { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
    { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
    { code: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },
    { code: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "India" },
    { code: "BOM", name: "Chhatrapati Shivaji International Airport", city: "Mumbai", country: "India" },
    { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India" },
    { code: "LHR", name: "London Heathrow Airport", city: "London", country: "UK" },
    { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "USA" },
    { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "USA" },
    { code: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
    { code: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
    { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },
    { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },
];

// LocationDropdown component
const LocationDropdown = ({ label, id, icon: Icon, iconColor, value, onChange, placeholder, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const [filteredLocations, setFilteredLocations] = useState([]);

    const filterLocations = (term) =>
        locations.filter(location =>
            location.name.toLowerCase().includes(term.toLowerCase()) ||
            location.city.toLowerCase().includes(term.toLowerCase()) ||
            location.code.toLowerCase().includes(term.toLowerCase()) ||
            location.country.toLowerCase().includes(term.toLowerCase())
        );

    const handleInputChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        onChange(term);

        if (term.length > 0) {
            setFilteredLocations(filterLocations(term));
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const handleLocationSelect = (location) => {
        const selectedValue = `${location.name} (${location.code})`;
        setSearchTerm(selectedValue);
        onChange(selectedValue);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        if (searchTerm.length > 0) {
            setFilteredLocations(filterLocations(searchTerm));
            setIsOpen(true);
        }
    };

    const handleInputBlur = () => {
        // Delay hiding dropdown to allow for click events
        setTimeout(() => setIsOpen(false), 150);
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                {label}
            </label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none" style={{ color: iconColor }} />
                <input
                    type="text"
                    id={id}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={`w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
                        error ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                    }`}
                />
            </div>

            {/* Dropdown List */}
            {isOpen && filteredLocations.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-[12px] shadow-lg max-h-60 overflow-y-auto mt-1.5">
                    {filteredLocations.slice(0, 10).map((location, index) => (
                        <div
                            key={`${location.code}-${index}`}
                            onClick={() => handleLocationSelect(location)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-[#0F172A] text-sm">
                                        {location.name}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                        {location.city}, {location.country}
                                    </div>
                                </div>
                                <div className="text-[#0955AC] font-bold text-xs bg-blue-100 px-2 py-1 rounded">
                                    {location.code}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FlightCard = () => {
    const [formData, setFormData] = useState({
        pickupLocation: '',
        pickupDate: '',
        dropoffLocation: '',
        dropoffDate: ''
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

    const validateForm = () => {
        const newErrors = {};

        if (!formData.pickupLocation.trim()) {
            newErrors.pickupLocation = 'Departure airport is required';
        }

        if (!formData.pickupDate.trim()) {
            newErrors.pickupDate = 'Departure date is required';
        }

        if (!formData.dropoffLocation.trim()) {
            newErrors.dropoffLocation = 'Arrival airport is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleStartClick = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                document.getElementById(firstErrorField)?.focus();
            }
            return;
        }

        // Hand off into the flight quote-request form, pre-filled with what
        // was entered here (FlightForm.jsx reads these from the query string).
        router.get('/flightBooking', {
            trip_type: formData.dropoffDate ? 'return' : 'oneway',
            departure_airport: formData.pickupLocation,
            arriving_airport: formData.dropoffLocation,
            departure_date: formData.pickupDate,
            ...(formData.dropoffDate ? { return_date: formData.dropoffDate } : {}),
        });
    };

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(9,85,172,0.10)] border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5 text-center">
                <span className="text-yellow-400 font-bold text-[18px] tracking-wide">Request a Flight Quote</span>
                <p className="text-white/80 text-[12px] mt-1">Tell us your route — we'll follow up with pricing and availability.</p>
            </div>

            <form onSubmit={handleStartClick} className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Departure Location */}
                    <div>
                        <LocationDropdown
                            label="DEPARTURE AIRPORT"
                            id="pickupLocation"
                            icon={PlaneTakeoff}
                            iconColor="#0955AC"
                            value={formData.pickupLocation}
                            onChange={(value) => handleInputChange('pickupLocation', value)}
                            placeholder="Search departure airport"
                            error={errors.pickupLocation}
                        />
                        {errors.pickupLocation && (
                            <p className="text-red-500 text-xs mt-1">{errors.pickupLocation}</p>
                        )}
                    </div>

                    {/* Departure Date */}
                    <div>
                        <label htmlFor="pickupDate" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                            DEPARTURE DATE
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="date"
                                id="pickupDate"
                                value={formData.pickupDate}
                                onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
                                    errors.pickupDate ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                                }`}
                            />
                        </div>
                        {errors.pickupDate && (
                            <p className="text-red-500 text-xs mt-1">{errors.pickupDate}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Arrival Location */}
                    <div>
                        <LocationDropdown
                            label="ARRIVAL AIRPORT"
                            id="dropoffLocation"
                            icon={PlaneLanding}
                            iconColor="#EF3826"
                            value={formData.dropoffLocation}
                            onChange={(value) => handleInputChange('dropoffLocation', value)}
                            placeholder="Search destination airport"
                            error={errors.dropoffLocation}
                        />
                        {errors.dropoffLocation && (
                            <p className="text-red-500 text-xs mt-1">{errors.dropoffLocation}</p>
                        )}
                    </div>

                    {/* Return Date (optional) */}
                    <div>
                        <label htmlFor="dropoffDate" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                            RETURN DATE (OPTIONAL)
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826] pointer-events-none" />
                            <input
                                type="date"
                                id="dropoffDate"
                                value={formData.dropoffDate}
                                onChange={(e) => handleInputChange('dropoffDate', e.target.value)}
                                min={formData.pickupDate || new Date().toISOString().split('T')[0]}
                                className="w-full h-[52px] rounded-[12px] border border-[#E2E8F0] pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    type="submit"
                    className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[15px] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                >
                    Continue to Quote Request
                    <ArrowRight className="w-[18px] h-[18px]" />
                </button>
            </form>
        </div>
    );
};

export default FlightCard;
