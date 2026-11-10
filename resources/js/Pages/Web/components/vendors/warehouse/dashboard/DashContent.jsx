import React, { useState, useMemo } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    Clock,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Building2,
    Box,
    Layers,
    Shield,
    Video,
    Thermometer,
    Check,
    X,
    ExternalLink,
    Edit3,
    AlertCircle,
    RotateCcw,
} from "lucide-react";

// Mock/Initial Bookings data for the calendar day view
const INITIAL_DAY_BOOKINGS = [
    {
        id: "WH-3391",
        unitCode: "Unit C-12",
        unitType: "Cold Storage",
        warehouseName: "Colombo Cold Storage",
        clientName: "Ceylon Seafoods Ltd",
        timeRange: "08:00 AM - ongoing",
        checkInTime: "08:00 AM",
        date: "24 Sep 2026",
        status: "Confirmed",
        capacityUsage: "18 / 20 pallets",
        usedPallets: 18,
        totalPallets: 20,
        tempControl: true,
        access24h: true,
        cctv: true,
        contactPerson: "Nimal Fernando",
        contactEmail: "nimal@ceylonseafoods.lk",
        contactPhone: "+94 77 234 5612",
    },
    {
        id: "WH-3392",
        unitCode: "Unit D-04",
        unitType: "Dry Storage",
        warehouseName: "Kelaniya Warehouse",
        clientName: "Sunrise Traders",
        timeRange: "09:30 AM - 3 days",
        checkInTime: "09:30 AM",
        date: "24 Sep 2026",
        status: "Confirmed",
        capacityUsage: "45 / 50 pallets",
        usedPallets: 45,
        totalPallets: 50,
        tempControl: false,
        access24h: true,
        cctv: true,
        contactPerson: "Samantha Perera",
        contactEmail: "contact@sunrisetraders.lk",
        contactPhone: "+94 71 889 0012",
    },
    {
        id: "WH-3393",
        unitCode: "Unit B-02",
        unitType: "Bonded Storage",
        warehouseName: "Colombo Cold Storage",
        clientName: "Lanka Imports PLC",
        timeRange: "11:00 AM - 12 days",
        checkInTime: "11:00 AM",
        date: "24 Sep 2026",
        status: "Pending",
        capacityUsage: "30 / 35 pallets",
        usedPallets: 30,
        totalPallets: 35,
        tempControl: false,
        access24h: false,
        cctv: true,
        contactPerson: "Dinesh Silva",
        contactEmail: "dinesh@lankaimports.lk",
        contactPhone: "+94 76 554 1190",
    },
    {
        id: "WH-3394",
        unitCode: "Unit C-07",
        unitType: "Cold Storage",
        warehouseName: "Kelaniya Warehouse",
        clientName: "Ceylon Fresh Exports",
        timeRange: "02:15 PM - 5 days",
        checkInTime: "02:15 PM",
        date: "24 Sep 2026",
        status: "Confirmed",
        capacityUsage: "15 / 15 pallets",
        usedPallets: 15,
        totalPallets: 15,
        tempControl: true,
        access24h: true,
        cctv: true,
        contactPerson: "Roshan Jayasuriya",
        contactEmail: "roshan@freshfruits.lk",
        contactPhone: "+94 75 901 2234",
    },
];

const DashContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [viewMode, setViewMode] = useState("Month"); // Month, Week, Day, Today
    const [selectedDate, setSelectedDate] = useState(24);
    const [selectedBooking, setSelectedBooking] = useState(INITIAL_DAY_BOOKINGS[0]);

    // Quick filters
    const [filterUnitType, setFilterUnitType] = useState("all");
    const [filterZone, setFilterZone] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    // Days with bookings in September 2026 for mini calendar dots
    const bookingDates = [4, 7, 9, 11, 14, 15, 17, 18, 20, 21, 22, 23, 24, 25, 28, 29];

    const filteredBookings = useMemo(() => {
        return INITIAL_DAY_BOOKINGS.filter((b) => {
            if (filterUnitType !== "all" && !b.unitType.toLowerCase().includes(filterUnitType.toLowerCase())) return false;
            if (filterZone !== "all" && !b.warehouseName.toLowerCase().includes(filterZone.toLowerCase())) return false;
            if (filterStatus !== "all" && b.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
            return true;
        });
    }, [filterUnitType, filterZone, filterStatus]);

    const handleClearFilters = () => {
        setFilterUnitType("all");
        setFilterZone("all");
        setFilterStatus("all");
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Top Title & View selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Warehouse booking calendar
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        View and manage unit bookings, track occupancy and keep storage schedules on track.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Month Picker dropdown / label */}
                    <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-[8px] border border-[#E5E7EB] shadow-sm text-[13px] font-[600] text-[#374151]">
                        <CalendarIcon size={16} className="text-[#0955AC]" />
                        <span>September 2026</span>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center bg-[#F3F4F6] p-1 rounded-[8px] border border-[#E5E7EB]">
                        {["Month", "Week", "Day", "Today"].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-[600] transition-colors cursor-pointer ${
                                    viewMode === mode
                                        ? "bg-white text-[#0955AC] shadow-sm font-[700]"
                                        : "text-[#6B7280] hover:text-[#111827]"
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top 5 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
                {/* Total units */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Total units</p>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">86</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+4.1% vs last month</span>
                    </div>
                </div>

                {/* Total bookings */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Total bookings</p>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">312</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+9.4% vs last month</span>
                    </div>
                </div>

                {/* Confirmed bookings */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Confirmed bookings</p>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">268</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+7.8% vs last month</span>
                    </div>
                </div>

                {/* Available space */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Available space</p>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">41%</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#DC2626]">
                        <TrendingDown size={13} />
                        <span>-2.4% vs last month</span>
                    </div>
                </div>

                {/* Cancelled / delayed */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Cancelled / delayed</p>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">9</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingDown size={13} />
                        <span>-3.1% vs last month</span>
                    </div>
                </div>
            </div>

            {/* Middle 3 Cards: Unit type breakdown, Needs attention, Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* 1. Unit type breakdown */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                            <h2 className="text-[15px] font-[700] text-[#111827] flex items-center gap-2">
                                <Box size={16} className="text-[#0955AC]" /> Unit type breakdown
                            </h2>
                            <button
                                type="button"
                                onClick={() => router.visit(route("vendors.warehouse.units"))}
                                className="text-[12px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
                            >
                                View all
                            </button>
                        </div>

                        <div className="space-y-3.5 mt-3.5">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563] flex items-center gap-2 font-[500]">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Cold storage
                                </span>
                                <div className="text-right">
                                    <span className="font-[700] text-[#111827]">18 units</span>
                                    <span className="text-[11px] text-[#6B7280] ml-2">96 bookings</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563] flex items-center gap-2 font-[500]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Dry storage
                                </span>
                                <div className="text-right">
                                    <span className="font-[700] text-[#111827]">52 units</span>
                                    <span className="text-[11px] text-[#6B7280] ml-2">178 bookings</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563] flex items-center gap-2 font-[500]">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Bonded storage
                                </span>
                                <div className="text-right">
                                    <span className="font-[700] text-[#111827]">16 units</span>
                                    <span className="text-[11px] text-[#6B7280] ml-2">38 bookings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Needs attention */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                            <h2 className="text-[15px] font-[700] text-[#111827] flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" /> Needs attention
                            </h2>
                            <button
                                type="button"
                                onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                                className="text-[12px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
                            >
                                View all
                            </button>
                        </div>

                        <div className="space-y-2.5 mt-3">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563]">Cancelled bookings</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-red-100 text-red-700">4</span>
                                    <span className="text-[11px] text-[#0955AC] cursor-pointer hover:underline">View</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563]">Overdue payments</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-amber-100 text-amber-700">6</span>
                                    <span className="text-[11px] text-[#0955AC] cursor-pointer hover:underline">View</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563]">Fully booked units</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-blue-100 text-blue-700">5</span>
                                    <span className="text-[11px] text-[#0955AC] cursor-pointer hover:underline">View</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-[#4B5563]">Schedule changes</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-purple-100 text-purple-700">3</span>
                                    <span className="text-[11px] text-[#0955AC] cursor-pointer hover:underline">View</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Quick Filters */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                            <h2 className="text-[15px] font-[700] text-[#111827] flex items-center gap-2">
                                <Filter size={16} className="text-[#0955AC]" /> Filters
                            </h2>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="text-[12px] font-[600] text-[#0955AC] hover:underline cursor-pointer"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="space-y-3 mt-3">
                            <div>
                                <label className="block text-[11px] font-[600] text-[#6B7280] mb-1">Unit type</label>
                                <select
                                    value={filterUnitType}
                                    onChange={(e) => setFilterUnitType(e.target.value)}
                                    className="w-full h-[34px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                                >
                                    <option value="all">All types</option>
                                    <option value="cold">Cold Storage</option>
                                    <option value="dry">Dry Storage</option>
                                    <option value="bonded">Bonded Storage</option>
                                    <option value="climate">Climate Controlled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-[600] text-[#6B7280] mb-1">Zone / location</label>
                                <select
                                    value={filterZone}
                                    onChange={(e) => setFilterZone(e.target.value)}
                                    className="w-full h-[34px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                                >
                                    <option value="all">All zones</option>
                                    <option value="colombo">Colombo</option>
                                    <option value="kelaniya">Kelaniya</option>
                                    <option value="biyagama">Biyagama</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-[600] text-[#6B7280] mb-1">Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full h-[34px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                                >
                                    <option value="all">All status</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom 3 Columns: Mini Calendar | Bookings on Date | Selected Booking Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Column 1: Mini Month Calendar (4 cols on lg) */}
                <div className="lg:col-span-4 bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" className="p-1 rounded-md hover:bg-gray-100 text-[#4B5563]">
                            <ChevronLeft size={18} />
                        </button>
                        <h3 className="text-[15px] font-[700] text-[#111827]">September 2026</h3>
                        <button type="button" className="p-1 rounded-md hover:bg-gray-100 text-[#4B5563]">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Days of week header */}
                    <div className="grid grid-cols-7 text-center text-[12px] font-[600] text-[#9CA3AF] mb-2">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                    </div>

                    {/* Calendar Day Grid (September 2026 starts on Tuesday = index 2) */}
                    <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
                        {/* Empty padding days for Aug */}
                        <span className="py-2 text-gray-300">30</span>
                        <span className="py-2 text-gray-300">31</span>

                        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                            const isSelected = selectedDate === day;
                            const hasBookings = bookingDates.includes(day);

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setSelectedDate(day)}
                                    className={`py-2 rounded-[8px] flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                                        isSelected
                                            ? "bg-[#0955AC] text-white font-[700] shadow-sm"
                                            : "hover:bg-gray-100 text-[#1F2937]"
                                    }`}
                                >
                                    <span>{day}</span>
                                    {hasBookings && (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                                isSelected ? "bg-white" : "bg-[#0955AC]"
                                            }`}
                                        />
                                    )}
                                </button>
                            );
                        })}

                        {/* Trailing days for Oct */}
                        <span className="py-2 text-gray-300">1</span>
                        <span className="py-2 text-gray-300">2</span>
                        <span className="py-2 text-gray-300">3</span>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> Has bookings
                        </span>
                        <span>312 bookings total</span>
                    </div>
                </div>

                {/* Column 2: Bookings on Selected Date (4 cols on lg) */}
                <div className="lg:col-span-4 bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6]">
                            <div>
                                <h3 className="text-[15px] font-[700] text-[#111827]">
                                    Bookings on Sep {selectedDate}, 2026
                                </h3>
                                <p className="text-[11px] text-[#6B7280]">{filteredBookings.length} bookings listed</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-[700] bg-[#EEF2FF] text-[#0955AC]">
                                {filteredBookings.length} bookings
                            </span>
                        </div>

                        {/* List of bookings */}
                        <div className="space-y-3">
                            {filteredBookings.map((b) => {
                                const isSelected = selectedBooking?.id === b.id;
                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => setSelectedBooking(b)}
                                        className={`p-3.5 rounded-[10px] border transition-all cursor-pointer ${
                                            isSelected
                                                ? "border-[#0955AC] bg-[#F0F6FF] shadow-sm"
                                                : "border-[#E5E7EB] bg-white hover:border-[#0955AC]/40 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[13px] font-[700] text-[#111827]">
                                                    {b.unitType} - {b.unitCode}
                                                </p>
                                                <p className="text-[11px] text-[#6B7280] mt-0.5">
                                                    {b.warehouseName} • {b.clientName}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-[700] ${
                                                    b.status === "Confirmed"
                                                        ? "bg-[#DCFCE7] text-[#166534]"
                                                        : "bg-[#FEF3C7] text-[#92400E]"
                                                }`}
                                            >
                                                {b.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 text-[11px] text-[#4B5563]">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} className="text-[#6B7280]" />
                                                {b.timeRange}
                                            </span>
                                            <span className="font-[600] text-[#0955AC]">{b.capacityUsage}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.visit(route("vendors.warehouse.calendar"))}
                        className="mt-4 w-full py-2.5 rounded-[8px] bg-[#F3F4F6] text-[#0955AC] text-[12px] font-[700] hover:bg-[#E5E7EB] transition-colors"
                    >
                        Open Full Calendar View →
                    </button>
                </div>

                {/* Column 3: Booking Details Side Panel (4 cols on lg) */}
                <div className="lg:col-span-4 bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                    {selectedBooking ? (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
                                <h3 className="text-[15px] font-[700] text-[#111827]">Booking details</h3>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${
                                        selectedBooking.status === "Confirmed"
                                            ? "bg-[#DCFCE7] text-[#166534]"
                                            : "bg-[#FEF3C7] text-[#92400E]"
                                    }`}
                                >
                                    {selectedBooking.status}
                                </span>
                            </div>

                            {/* Client & Unit header */}
                            <div className="mb-4">
                                <p className="text-[12px] text-[#6B7280] font-[500]">{selectedBooking.clientName}</p>
                                <h2 className="text-[18px] font-[700] text-[#111827] mt-0.5">
                                    {selectedBooking.unitType} - {selectedBooking.unitCode}
                                </h2>
                            </div>

                            {/* Key attributes grid */}
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] text-[12px] mb-4">
                                <div>
                                    <p className="text-[#6B7280] text-[11px]">Booking ID</p>
                                    <p className="font-[700] text-[#111827] mt-0.5">{selectedBooking.id}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280] text-[11px]">Check-in time</p>
                                    <p className="font-[600] text-[#111827] mt-0.5">{selectedBooking.checkInTime}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280] text-[11px]">Date</p>
                                    <p className="font-[600] text-[#111827] mt-0.5">{selectedBooking.date}</p>
                                </div>
                                <div>
                                    <p className="text-[#6B7280] text-[11px]">Location</p>
                                    <p className="font-[600] text-[#111827] mt-0.5 truncate">{selectedBooking.warehouseName}</p>
                                </div>
                            </div>

                            {/* Capacity & Usage Bar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-[12px] mb-1.5">
                                    <span className="font-[600] text-[#374151]">Capacity & usage</span>
                                    <span className="font-[700] text-[#0955AC]">{selectedBooking.capacityUsage}</span>
                                </div>
                                <div className="w-full bg-[#E5E7EB] h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-[#0955AC] h-full rounded-full transition-all duration-300"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                (selectedBooking.usedPallets / selectedBooking.totalPallets) * 100
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Amenities badges */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {selectedBooking.tempControl && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-[600] bg-blue-50 text-blue-700 border border-blue-200">
                                        <Thermometer size={12} /> Temp control
                                    </span>
                                )}
                                {selectedBooking.access24h && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-[600] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <Clock size={12} /> 24hr access
                                    </span>
                                )}
                                {selectedBooking.cctv && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-[600] bg-purple-50 text-purple-700 border border-purple-200">
                                        <Video size={12} /> CCTV
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                                    className="w-full py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm transition-colors cursor-pointer"
                                >
                                    View full booking
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                                    className="w-full py-2 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-[600] hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Edit booking
                                </button>
                                <button
                                    type="button"
                                    onClick={() => alert(`Cancelling booking ${selectedBooking.id}`)}
                                    className="w-full py-2 text-[12px] font-[600] text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                                >
                                    Cancel booking
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-[#6B7280]">
                            <p className="text-[14px]">Select a booking on the left to inspect details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashContent;
