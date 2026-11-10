import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import VendorShellLayout from "../../../../../Components/vendors/VendorShellLayout";
import {
    Bus,
    Train,
    Plane,
    Wifi,
    Tv,
    Wind,
    Zap,
    Luggage,
    Check,
    Clock,
    Calendar as CalendarIcon,
    ArrowRight,
    MapPin,
    DollarSign,
    Info,
    ChevronLeft,
} from "lucide-react";

import busImage from "../../../assets/ticketBooking/bus.jpg";
import trainImage from "../../../assets/ticketBooking/train.jpg";

const BUS_FACILITIES = [
    { id: "A/C", label: "A/C", icon: Wind },
    { id: "Wi-Fi", label: "Wi-Fi", icon: Wifi },
    { id: "USB / Charging", label: "USB / Charging", icon: Zap },
    { id: "TV", label: "TV", icon: Tv },
    { id: "Luggage Storage", label: "Luggage Storage", icon: Luggage },
];

const TRAIN_FACILITIES = [
    { id: "A/C", label: "A/C", icon: Wind },
    { id: "Wi-Fi", label: "Wi-Fi", icon: Wifi },
    { id: "Charging Port", label: "Charging Port", icon: Zap },
    { id: "Toilet", label: "Toilet", icon: Info },
    { id: "Luggage Storage", label: "Luggage Storage", icon: Luggage },
];

const BUS_TYPES = [
    "Luxury (A/C)",
    "Semi-Luxury",
    "AC",
    "Super Luxury",
    "Normal",
];

const TRAIN_TYPES = [
    "Express",
    "Intercity",
    "Night Mail",
    "Slow / Commuter",
];

const TRAIN_CLASSES = [
    "1st Class",
    "2nd Class",
    "3rd Class",
    "Observation Saloon",
];

const SEAT_LAYOUTS = ["2x2", "2x1", "1x1"];
const SEAT_NUMBERINGS = ["Standard numeric", "Window / Aisle", "Sequential per Coach"];
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const emptyForm = {
    type: "bus",
    // Common / Bus
    name: "",
    bus_number: "",
    train_number: "",
    bus_type: "Luxury (A/C)",
    train_type: "Express",
    operator: "",
    registration_number: "",

    // Route & Schedule
    route_number: "",
    departure_location: "",
    destination: "",
    departure_station: "",
    destination_station: "",
    departure_time: "06:30",
    arrival_time: "09:45",
    operating_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],

    // Seating
    capacity: 45,
    seat_layout: "2x2",
    seat_numbering: "Standard numeric",

    // Train specific coach
    class_type: "1st Class",
    coach_type: "1st Class",
    number_of_coaches: 8,
    seats_per_coach: 64,

    // Facilities
    facilities: ["A/C", "Wi-Fi", "USB / Charging"],

    // Pricing
    base_fare: "1850",
    child_fare: "1200",
    first_class_fare: "2800",
    second_class_fare: "1600",
    third_class_fare: "900",

    // Status & Notes
    status: "active",
    notes: "",
};

const AddUnit = () => {
    const { editing, busStations = [], trainStations = [] } = usePage().props;
    const isEdit = Boolean(editing);

    const [form, setForm] = useState(() => {
        if (!editing) return emptyForm;
        return {
            ...emptyForm,
            type: editing.type || "bus",
            name: editing.name || "",
            bus_number: editing.type === "bus" ? editing.number || "" : "",
            train_number: editing.type === "train" ? editing.number || "" : "",
            bus_type: editing.type === "bus" ? editing.subType || "Luxury (A/C)" : "Luxury (A/C)",
            train_type: editing.type === "train" ? editing.subType || "Express" : "Express",
            class_type: editing.subType || "1st Class",
            route_number: editing.routeNumber || "",
            facilities: editing.facilities || [],
            capacity: editing.capacity || 45,
            operator: editing.operator || "",
            status: editing.status || "active",
        };
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleFacility = (facilityId) => {
        setForm((prev) => ({
            ...prev,
            facilities: prev.facilities.includes(facilityId)
                ? prev.facilities.filter((f) => f !== facilityId)
                : [...prev.facilities, facilityId],
        }));
    };

    const toggleDay = (day) => {
        setForm((prev) => ({
            ...prev,
            operating_days: prev.operating_days.includes(day)
                ? prev.operating_days.filter((d) => d !== day)
                : [...prev.operating_days, day],
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Auto-compute train capacity
    const handleCoachSeatsChange = (numCoaches, seatsPerCoach) => {
        const total = (parseInt(numCoaches) || 0) * (parseInt(seatsPerCoach) || 0);
        setForm((prev) => ({
            ...prev,
            number_of_coaches: numCoaches,
            seats_per_coach: seatsPerCoach,
            capacity: total > 0 ? total : prev.capacity,
        }));
    };

    const payload = useMemo(() => {
        const base = {
            name: form.name,
            route_number: form.route_number || "Route 01",
            facilities: form.facilities,
            capacity: parseInt(form.capacity) || 45,
            operator: form.operator,
            status: form.status,
            specs: {
                registration_number: form.registration_number,
                departure_location: form.type === "bus" ? form.departure_location : form.departure_station,
                destination: form.type === "bus" ? form.destination : form.destination_station,
                departure_time: form.departure_time,
                arrival_time: form.arrival_time,
                operating_days: form.operating_days,
                seat_layout: form.seat_layout,
                seat_numbering: form.seat_numbering,
                base_fare: form.base_fare,
                child_fare: form.child_fare,
                first_class_fare: form.first_class_fare,
                second_class_fare: form.second_class_fare,
                third_class_fare: form.third_class_fare,
                notes: form.notes,
            },
        };

        if (form.type === "bus") {
            return {
                ...base,
                type: "bus",
                bus_number: form.bus_number,
                bus_type: form.bus_type || "Luxury (A/C)",
            };
        }

        return {
            ...base,
            type: "train",
            train_number: form.train_number,
            class_type: form.class_type || "1st Class",
            train_type: form.train_type || "Express",
        };
    }, [form]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const options = {
            preserveScroll: true,
            onError: (errs) => {
                setErrors(errs);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                router.visit(route("ticketBooking.units"));
            },
            onFinish: () => setIsSubmitting(false),
        };

        if (isEdit) {
            router.put(route("ticketBooking.units.update", { type: editing.type, id: editing.id }), payload, options);
        } else {
            router.post(route("ticketBooking.units.store"), payload, options);
        }
    };

    const facilityList = form.type === "bus" ? BUS_FACILITIES : TRAIN_FACILITIES;

    return (
        <VendorShellLayout activeService="Ticket Booking">
            <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
                {/* Back / Title bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <button
                            type="button"
                            onClick={() => router.visit(route("ticketBooking.units"))}
                            className="inline-flex items-center gap-1.5 text-[13px] font-[600] text-[#0955AC] hover:underline mb-2 cursor-pointer"
                        >
                            <ChevronLeft size={16} /> Back to Units
                        </button>
                        <h1 className="figtree text-[28px] md:text-[32px] font-[700] text-[#111827]">
                            {isEdit ? `Edit ${form.type === "bus" ? "Bus" : "Train"} Unit` : "Add Unit"}
                        </h1>
                        <p className="text-[13px] text-[#6B7280] mt-1">
                            {form.type === "bus"
                                ? "Add a new bus or train unit to your ticket booking service."
                                : "Add your transport service details to start selling tickets."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.visit(route("ticketBooking.units"))}
                            className="px-4 py-2 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] text-[#374151] hover:bg-gray-50"
                        >
                            Back to List
                        </button>
                        <button
                            type="submit"
                            form="ticket-unit-form"
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm disabled:opacity-60"
                        >
                            {isSubmitting ? "Saving..." : "Save Unit"}
                        </button>
                    </div>
                </div>

                {/* Unit Type Selector tabs */}
                <div className="bg-white rounded-[12px] p-4 shadow-sm border border-[#E5E7EB] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-[12px] font-[700] text-[#4B5563] uppercase tracking-wider mb-2">Unit Type</p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, type: "bus" }))}
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[8px] font-[700] text-[14px] transition-all cursor-pointer ${
                                    form.type === "bus"
                                        ? "bg-[#0955AC] text-white shadow-md shadow-blue-900/20"
                                        : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                                }`}
                            >
                                <Bus size={18} />
                                <span>Bus</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, type: "train" }))}
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[8px] font-[700] text-[14px] transition-all cursor-pointer ${
                                    form.type === "train"
                                        ? "bg-[#0955AC] text-white shadow-md shadow-blue-900/20"
                                        : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                                }`}
                            >
                                <Train size={18} />
                                <span>Train</span>
                            </button>

                            <button
                                type="button"
                                disabled
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] font-[600] text-[13px] bg-[#F9FAFB] text-[#9CA3AF] opacity-60 cursor-not-allowed"
                            >
                                <Plane size={16} />
                                <span>Flight (Managed)</span>
                            </button>
                        </div>
                    </div>

                    {/* Preview banner images */}
                    <div className="hidden lg:flex items-center gap-4 pr-2">
                        <div className="h-16 w-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                            <img src={busImage} alt="Bus" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-[600]">Bus</span>
                        </div>
                        <div className="h-16 w-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                            <img src={trainImage} alt="Train" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-[600]">Train</span>
                        </div>
                    </div>
                </div>

                <form id="ticket-unit-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* BUS SPECIFIC FORM */}
                    {form.type === "bus" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left column (2 cols) */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Basic Information */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Basic Information</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Identify the bus vehicle and operator branding.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Bus Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Superline Express"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                            {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Bus Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="bus_number"
                                                value={form.bus_number}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. NB-1234"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                            {errors.bus_number && <p className="text-red-500 text-[11px] mt-1">{errors.bus_number}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Bus Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="bus_type"
                                                value={form.bus_type}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {BUS_TYPES.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Operator / Display Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="operator"
                                                value={form.operator}
                                                onChange={handleChange}
                                                placeholder="e.g. Superline Travels"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Registration Number (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="registration_number"
                                                value={form.registration_number}
                                                onChange={handleChange}
                                                placeholder="e.g. WP NB-1234 / Provincial Reg"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Route & Schedule */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1 flex items-center gap-2">
                                        <MapPin size={18} className="text-[#0955AC]" /> Route & Schedule
                                    </h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Set default service route, station stops, and timings.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Route Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="route_number"
                                                value={form.route_number}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Route 01, Colombo - Kandy"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Departure Location <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="departure_location"
                                                value={form.departure_location}
                                                onChange={handleChange}
                                                placeholder="e.g. Colombo (Bastian Mawatha)"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Destination <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="destination"
                                                value={form.destination}
                                                onChange={handleChange}
                                                placeholder="e.g. Kandy Good Shed"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Departure Time <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    name="departure_time"
                                                    value={form.departure_time}
                                                    onChange={handleChange}
                                                    className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Arrival Time <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="time"
                                                    name="arrival_time"
                                                    value={form.arrival_time}
                                                    onChange={handleChange}
                                                    className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2 mt-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-2">
                                                Operating Days <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {DAYS_OF_WEEK.map((day) => {
                                                    const active = form.operating_days.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleDay(day)}
                                                            className={`w-12 h-9 rounded-[8px] text-[13px] font-[700] transition-all cursor-pointer ${
                                                                active
                                                                    ? "bg-[#0955AC] text-white shadow-sm"
                                                                    : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Seating Details */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Seating Details</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Configure passenger seat configuration and layout numbering.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Total Capacity (Seats) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                name="capacity"
                                                value={form.capacity}
                                                onChange={handleChange}
                                                required
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Seat Layout <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="seat_layout"
                                                value={form.seat_layout}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {SEAT_LAYOUTS.map((l) => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Seat Numbering <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="seat_numbering"
                                                value={form.seat_numbering}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {SEAT_NUMBERINGS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right column (Facilities, Pricing, Status) */}
                            <div className="space-y-6">
                                {/* Facilities */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Facilities</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-4">Select the facilities available on this bus.</p>

                                    <div className="space-y-2.5">
                                        {facilityList.map(({ id, label, icon: Icon }) => {
                                            const active = form.facilities.includes(id);
                                            return (
                                                <label
                                                    key={id}
                                                    onClick={() => toggleFacility(id)}
                                                    className={`flex items-center justify-between p-3 rounded-[8px] border cursor-pointer transition-all ${
                                                        active
                                                            ? "border-[#0955AC] bg-[#F0F6FF] text-[#0955AC]"
                                                            : "border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon size={18} className={active ? "text-[#0955AC]" : "text-[#6B7280]"} />
                                                        <span className="text-[13px] font-[600]">{label}</span>
                                                    </div>
                                                    <div
                                                        className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                                                            active ? "bg-[#0955AC] border-[#0955AC] text-white" : "border-[#D1D5DB] bg-white"
                                                        }`}
                                                    >
                                                        {active && <Check size={14} />}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Pricing</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-4">Set fare rate for this service.</p>

                                    <div className="space-y-3.5">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Base Fare (LKR) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[700] text-[#6B7280]">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="50"
                                                    name="base_fare"
                                                    value={form.base_fare}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="1850.00"
                                                    className="w-full h-[40px] pl-12 pr-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Child Fare (Optional) (LKR)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[700] text-[#6B7280]">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="50"
                                                    name="child_fare"
                                                    value={form.child_fare}
                                                    onChange={handleChange}
                                                    placeholder="1200.00"
                                                    className="w-full h-[40px] pl-12 pr-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Status</h2>
                                    <div className="flex items-center gap-6 mt-3">
                                        <label className="flex items-center gap-2 text-[13px] font-[600] text-[#374151] cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="active"
                                                checked={form.status === "active"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#0955AC] focus:ring-[#0955AC]"
                                            />
                                            <span>Active</span>
                                        </label>

                                        <label className="flex items-center gap-2 text-[13px] font-[600] text-[#374151] cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="inactive"
                                                checked={form.status === "inactive"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#0955AC] focus:ring-[#0955AC]"
                                            />
                                            <span>Inactive</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRAIN SPECIFIC FORM */}
                    {form.type === "train" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left column (2 cols) */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Basic Information */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Basic Information</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Railway train name, number, and service classification.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Train Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={form.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Podi Menike"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                            {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Train Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="train_number"
                                                value={form.train_number}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. 1005"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                            {errors.train_number && <p className="text-red-500 text-[11px] mt-1">{errors.train_number}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Train Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="train_type"
                                                value={form.train_type}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {TRAIN_TYPES.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Operator / Display Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="operator"
                                                value={form.operator}
                                                onChange={handleChange}
                                                placeholder="e.g. Sri Lanka Railways"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Route & Schedule */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1 flex items-center gap-2">
                                        <MapPin size={18} className="text-[#0955AC]" /> Route & Schedule
                                    </h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Set stations line, departure, arrival, and running schedule.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Route Number / Line <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="route_number"
                                                value={form.route_number}
                                                onChange={handleChange}
                                                required
                                                placeholder="e.g. Main Line 01"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Departure Station <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="departure_station"
                                                value={form.departure_station}
                                                onChange={handleChange}
                                                placeholder="e.g. Colombo Fort"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Destination Station <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="destination_station"
                                                value={form.destination_station}
                                                onChange={handleChange}
                                                placeholder="e.g. Badulla"
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Departure Time <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                name="departure_time"
                                                value={form.departure_time}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Arrival Time <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                name="arrival_time"
                                                value={form.arrival_time}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 mt-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-2">
                                                Operating Days <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {DAYS_OF_WEEK.map((day) => {
                                                    const active = form.operating_days.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleDay(day)}
                                                            className={`w-12 h-9 rounded-[8px] text-[13px] font-[700] transition-all cursor-pointer ${
                                                                active
                                                                    ? "bg-[#0955AC] text-white shadow-sm"
                                                                    : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Coach & Seating */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Coach & Seating</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-5">Define passenger coaches, class type, and seating capacity.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Coach Type / Class <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="class_type"
                                                value={form.class_type}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {TRAIN_CLASSES.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Number of Coaches <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="30"
                                                name="number_of_coaches"
                                                value={form.number_of_coaches}
                                                onChange={(e) => handleCoachSeatsChange(e.target.value, form.seats_per_coach)}
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Seats per Coach <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                name="seats_per_coach"
                                                value={form.seats_per_coach}
                                                onChange={(e) => handleCoachSeatsChange(form.number_of_coaches, e.target.value)}
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Total Capacity (Seats) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                name="capacity"
                                                value={form.capacity}
                                                onChange={handleChange}
                                                required
                                                className="w-full h-[40px] px-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-gray-50 font-[700] text-[#0955AC]"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Seat Numbering <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="seat_numbering"
                                                value={form.seat_numbering}
                                                onChange={handleChange}
                                                className="w-full h-[40px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            >
                                                {SEAT_NUMBERINGS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-6">
                                {/* Facilities */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Facilities</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-4">Select the facilities available on this train.</p>

                                    <div className="space-y-2.5">
                                        {facilityList.map(({ id, label, icon: Icon }) => {
                                            const active = form.facilities.includes(id);
                                            return (
                                                <label
                                                    key={id}
                                                    onClick={() => toggleFacility(id)}
                                                    className={`flex items-center justify-between p-3 rounded-[8px] border cursor-pointer transition-all ${
                                                        active
                                                            ? "border-[#0955AC] bg-[#F0F6FF] text-[#0955AC]"
                                                            : "border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon size={18} className={active ? "text-[#0955AC]" : "text-[#6B7280]"} />
                                                        <span className="text-[13px] font-[600]">{label}</span>
                                                    </div>
                                                    <div
                                                        className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                                                            active ? "bg-[#0955AC] border-[#0955AC] text-white" : "border-[#D1D5DB] bg-white"
                                                        }`}
                                                    >
                                                        {active && <Check size={14} />}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Pricing</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-4">Set ticket fares by class tier.</p>

                                    <div className="space-y-3.5">
                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                First Class Fare (LKR) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[700] text-[#6B7280]">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    name="first_class_fare"
                                                    value={form.first_class_fare}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="2800.00"
                                                    className="w-full h-[40px] pl-12 pr-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Second Class Fare (LKR) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[700] text-[#6B7280]">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    name="second_class_fare"
                                                    value={form.second_class_fare}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="1600.00"
                                                    className="w-full h-[40px] pl-12 pr-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[13px] font-[600] text-[#374151] mb-1.5">
                                                Third Class Fare (LKR) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[700] text-[#6B7280]">LKR</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    name="third_class_fare"
                                                    value={form.third_class_fare}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="900.00"
                                                    className="w-full h-[40px] pl-12 pr-3.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Status</h2>
                                    <div className="flex items-center gap-6 mt-3">
                                        <label className="flex items-center gap-2 text-[13px] font-[600] text-[#374151] cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="active"
                                                checked={form.status === "active"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#0955AC] focus:ring-[#0955AC]"
                                            />
                                            <span>Active</span>
                                        </label>

                                        <label className="flex items-center gap-2 text-[13px] font-[600] text-[#374151] cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="inactive"
                                                checked={form.status === "inactive"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#0955AC] focus:ring-[#0955AC]"
                                            />
                                            <span>Inactive</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="bg-white rounded-[12px] p-6 shadow-sm border border-[#E5E7EB]">
                                    <h2 className="text-[17px] font-[700] text-[#111827] mb-1">Additional Information</h2>
                                    <p className="text-[12px] text-[#6B7280] mb-3">Notes / Description (Optional)</p>
                                    <textarea
                                        rows={3}
                                        name="notes"
                                        value={form.notes}
                                        onChange={handleChange}
                                        placeholder="Add any instructions, passenger rules, or stopover remarks..."
                                        className="w-full p-3 rounded-[8px] border border-[#D1D5DB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
                        <button
                            type="button"
                            onClick={() => router.visit(route("ticketBooking.units"))}
                            className="px-5 py-2.5 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[600] text-[#374151] hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-7 py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm disabled:opacity-60"
                        >
                            {isSubmitting ? "Saving..." : isEdit ? "Update Unit" : "Add Unit"}
                        </button>
                    </div>
                </form>
            </div>
        </VendorShellLayout>
    );
};

export default AddUnit;
