import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { PlaneTakeoff, PlaneLanding, CalendarDays, ArrowRight, Plane } from "lucide-react";
import CardHeader from "./shared/CardHeader";
import { AutoCompleteField, DateField, SubmitButton } from "./shared/FormElements";

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

const airportSearchText = (l) => `${l.name} ${l.city} ${l.code} ${l.country}`;

const renderAirportOption = (location) => (
    <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
            <div className="font-[700] text-[#0F172A] text-[13px] truncate">{location.name}</div>
            <div className="text-[#94A3B8] text-[12px] truncate">{location.city}, {location.country}</div>
        </div>
        <div className="text-[#0955AC] font-[700] text-[11px] bg-[#0955AC]/10 px-2 py-1 rounded shrink-0">{location.code}</div>
    </div>
);

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
        <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
            <CardHeader icon={Plane} title="Request a Flight Quote" subtitle="Tell us your route — we'll follow up with pricing and availability." />

            <form onSubmit={handleStartClick} className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <AutoCompleteField
                        label="DEPARTURE AIRPORT"
                        id="pickupLocation"
                        value={formData.pickupLocation}
                        onChange={(value) => handleInputChange('pickupLocation', value)}
                        placeholder="Search departure airport"
                        error={errors.pickupLocation}
                        icon={PlaneTakeoff}
                        iconColor="text-[#0955AC]"
                        options={locations}
                        getSearchText={airportSearchText}
                        getKey={(l) => l.code}
                        getValue={(l) => `${l.name} (${l.code})`}
                        renderOption={renderAirportOption}
                    />

                    <DateField
                        label="DEPARTURE DATE"
                        id="pickupDate"
                        value={formData.pickupDate}
                        onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                        error={errors.pickupDate}
                        icon={CalendarDays}
                        iconColor="text-[#0955AC]"
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <AutoCompleteField
                        label="ARRIVAL AIRPORT"
                        id="dropoffLocation"
                        value={formData.dropoffLocation}
                        onChange={(value) => handleInputChange('dropoffLocation', value)}
                        placeholder="Search destination airport"
                        error={errors.dropoffLocation}
                        icon={PlaneLanding}
                        iconBg="bg-[#FDEDEA]"
                        iconColor="text-[#EF3826]"
                        options={locations}
                        getSearchText={airportSearchText}
                        getKey={(l) => l.code}
                        getValue={(l) => `${l.name} (${l.code})`}
                        renderOption={renderAirportOption}
                    />

                    <DateField
                        label="RETURN DATE (OPTIONAL)"
                        id="dropoffDate"
                        value={formData.dropoffDate}
                        onChange={(e) => handleInputChange('dropoffDate', e.target.value)}
                        icon={CalendarDays}
                        iconBg="bg-[#FDEDEA]"
                        iconColor="text-[#EF3826]"
                        min={formData.pickupDate || new Date().toISOString().split('T')[0]}
                    />
                </div>

                <SubmitButton icon={ArrowRight}>Continue to Quote Request</SubmitButton>
            </form>
        </div>
    );
};

export default FlightCard;
