import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    Plus,
    RotateCcw,
    Layers,
    Warehouse,
    Box,
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Info,
} from "lucide-react";

const INITIAL_UNITS = [
    {
        id: "WH-A-001",
        name: "Unit A-01",
        size: "2,000 sqft",
        type: "Cold Storage",
        color: "blue",
    },
    {
        id: "WH-A-002",
        name: "Unit A-02",
        size: "1,500 sqft",
        type: "Dry Storage",
        color: "emerald",
    },
    {
        id: "WH-B-001",
        name: "Unit B-01",
        size: "3,000 sqft",
        type: "Bonded Storage",
        color: "amber",
    },
    {
        id: "WH-B-002",
        name: "Unit B-02",
        size: "1,800 sqft",
        type: "Hazardous Storage",
        color: "rose",
    },
];

const INITIAL_TIMELINE_EVENTS = [
    {
        id: 1,
        unitId: "WH-A-001",
        type: "Inbound",
        client: "ARC Logistics",
        startDay: 19,
        endDay: 19,
        pallets: "200 Pallets",
        status: "Inbound",
        colorBg: "bg-blue-100 border-blue-400 text-blue-900",
        badgeBg: "bg-blue-600 text-white",
    },
    {
        id: 2,
        unitId: "WH-A-001",
        type: "Outbound",
        client: "Global Trade Ltd",
        startDay: 22,
        endDay: 22,
        pallets: "180 Pallets",
        status: "Outbound",
        colorBg: "bg-teal-100 border-teal-400 text-teal-900",
        badgeBg: "bg-teal-600 text-white",
    },
    {
        id: 3,
        unitId: "WH-A-002",
        type: "Storage",
        client: "Fresh Foods Co",
        startDay: 20,
        endDay: 21,
        pallets: "150 Pallets",
        status: "In Progress",
        colorBg: "bg-pink-100 border-pink-400 text-pink-900",
        badgeBg: "bg-pink-600 text-white",
    },
    {
        id: 4,
        unitId: "WH-A-002",
        type: "Storage",
        client: "Prime Frozen",
        startDay: 22,
        endDay: 23,
        pallets: "120 Pallets",
        status: "Confirmed",
        colorBg: "bg-indigo-100 border-indigo-400 text-indigo-900",
        badgeBg: "bg-indigo-600 text-white",
    },
    {
        id: 5,
        unitId: "WH-B-001",
        type: "Storage",
        client: "BioPharma Ltd",
        startDay: 21,
        endDay: 21,
        pallets: "300 Pallets",
        status: "In Progress",
        colorBg: "bg-purple-100 border-purple-400 text-purple-900",
        badgeBg: "bg-purple-600 text-white",
    },
    {
        id: 6,
        unitId: "WH-B-001",
        type: "Reserved",
        client: "Pharma Health",
        startDay: 24,
        endDay: 24,
        pallets: "250 Pallets",
        status: "Reserved",
        colorBg: "bg-amber-100 border-amber-400 text-amber-900",
        badgeBg: "bg-amber-600 text-white",
    },
    {
        id: 7,
        unitId: "WH-B-002",
        type: "Outbound",
        client: "Urban Retailers",
        startDay: 19,
        endDay: 19,
        pallets: "140 Pallets",
        status: "Outbound",
        colorBg: "bg-cyan-100 border-cyan-400 text-cyan-900",
        badgeBg: "bg-cyan-600 text-white",
    },
    {
        id: 8,
        unitId: "WH-B-002",
        type: "Maintenance",
        client: "Floor Renovation",
        startDay: 22,
        endDay: 22,
        pallets: "All Units",
        status: "Maintenance",
        colorBg: "bg-rose-100 border-rose-400 text-rose-900",
        badgeBg: "bg-rose-600 text-white",
    },
];

const DAYS = [19, 20, 21, 22, 23, 24, 25];

const CalendarContent = () => {
    // Filter states
    const [warehouseFilter, setWarehouseFilter] = useState("all");
    const [unitSearch, setUnitSearch] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [storageTypeFilter, setStorageTypeFilter] = useState("all");
    const [commodityFilter, setCommodityFilter] = useState("all");
    const [inOutFilter, setInOutFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [startDate, setStartDate] = useState("2026-10-19");
    const [endDate, setEndDate] = useState("2026-10-25");

    // View controls
    const [viewMode, setViewMode] = useState("Week"); // Day, Week, Year
    const [viewAspect, setViewAspect] = useState("Unit View"); // Unit View, Availability, Occupancy
    const [selectedEvent, setSelectedEvent] = useState(null);

    const filteredEvents = useMemo(() => {
        return INITIAL_TIMELINE_EVENTS.filter((e) => {
            if (unitSearch && !e.unitId.toLowerCase().includes(unitSearch.toLowerCase())) return false;
            if (clientSearch && !e.client.toLowerCase().includes(clientSearch.toLowerCase())) return false;
            if (inOutFilter !== "all" && e.type.toLowerCase() !== inOutFilter.toLowerCase()) return false;
            if (statusFilter !== "all" && e.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
            return true;
        });
    }, [unitSearch, clientSearch, inOutFilter, statusFilter]);

    const handleReset = () => {
        setWarehouseFilter("all");
        setUnitSearch("");
        setClientSearch("");
        setStorageTypeFilter("all");
        setCommodityFilter("all");
        setInOutFilter("all");
        setStatusFilter("all");
        setStartDate("2026-10-19");
        setEndDate("2026-10-25");
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Warehouse Calendar
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        View and manage warehouse unit bookings, availability and occupancy.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm transition-colors cursor-pointer"
                    >
                        <Plus size={16} /> New Booking
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mb-4">
                    {/* Warehouse */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Warehouse
                        </label>
                        <select
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Warehouses</option>
                            <option value="colombo">Colombo Central Logistics Hub</option>
                            <option value="kelaniya">Kelaniya Warehouse Facility</option>
                        </select>
                    </div>

                    {/* Unit ID / Unit Name */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Unit ID / Unit Name
                        </label>
                        <input
                            type="text"
                            value={unitSearch}
                            onChange={(e) => setUnitSearch(e.target.value)}
                            placeholder="e.g. WH-A-001"
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* Client Name */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Client Name
                        </label>
                        <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            placeholder="Search client company"
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* Storage Type */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Storage Type
                        </label>
                        <select
                            value={storageTypeFilter}
                            onChange={(e) => setStorageTypeFilter(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Types</option>
                            <option value="cold">Cold Storage</option>
                            <option value="dry">Dry Storage</option>
                            <option value="bonded">Bonded Storage</option>
                            <option value="hazmat">Hazardous Material</option>
                        </select>
                    </div>

                    {/* Commodity Type */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Commodity Type
                        </label>
                        <select
                            value={commodityFilter}
                            onChange={(e) => setCommodityFilter(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Commodities</option>
                            <option value="fmcg">Food & FMCG</option>
                            <option value="pharma">Pharmaceuticals</option>
                            <option value="industrial">Industrial Chemicals</option>
                            <option value="apparel">Apparel & Textiles</option>
                        </select>
                    </div>

                    {/* Inbound / Outbound */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Inbound / Outbound
                        </label>
                        <select
                            value={inOutFilter}
                            onChange={(e) => setInOutFilter(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All</option>
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                            <option value="storage">Storage</option>
                        </select>
                    </div>

                    {/* Booking Status */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Booking Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in progress">In Progress</option>
                            <option value="reserved">Reserved</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* Apply & Reset Buttons */}
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            className="flex-1 h-[36px] rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[600] hover:bg-[#0744a0] transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[#4B5563] text-[12px] font-[600] hover:bg-gray-50 transition-colors"
                            title="Reset filters"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline Controls Header */}
            <div className="bg-white rounded-t-[12px] px-5 py-4 border-t border-x border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 border border-[#D1D5DB] rounded-[6px] p-0.5">
                        <button type="button" className="p-1 text-[#4B5563] hover:bg-gray-100 rounded">
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" className="p-1 text-[#4B5563] hover:bg-gray-100 rounded">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className="px-3 py-1 rounded-[6px] border border-[#D1D5DB] text-[12px] font-[600] text-[#374151] hover:bg-gray-50"
                    >
                        Today
                    </button>
                    <span className="text-[15px] font-[700] text-[#111827]">
                        October 19 - 25, 2026
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Day / Week / Year */}
                    <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
                        {["Day", "Week", "Year"].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 rounded-[4px] text-[12px] font-[600] transition-colors ${
                                    viewMode === mode
                                        ? "bg-white text-[#0955AC] shadow-xs font-[700]"
                                        : "text-[#6B7280] hover:text-[#111827]"
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Unit View / Availability / Occupancy */}
                    <div className="flex items-center bg-[#F3F4F6] p-0.5 rounded-[6px] border border-[#E5E7EB]">
                        {["Unit View", "Availability", "Occupancy"].map((aspect) => (
                            <button
                                key={aspect}
                                type="button"
                                onClick={() => setViewAspect(aspect)}
                                className={`px-3 py-1 rounded-[4px] text-[12px] font-[600] transition-colors ${
                                    viewAspect === aspect
                                        ? "bg-[#0955AC] text-white shadow-xs font-[700]"
                                        : "text-[#6B7280] hover:text-[#111827]"
                                }`}
                            >
                                {aspect}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline Matrix (Gantt Chart View) */}
            <div className="bg-white border border-[#E5E7EB] overflow-x-auto shadow-sm">
                <div className="min-w-[900px]">
                    {/* Header: Units column + Day columns */}
                    <div className="grid grid-cols-12 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-[700] text-[#4B5563]">
                        <div className="col-span-3 px-4 py-3 border-r border-[#E5E7EB]">
                            Warehouse Unit
                        </div>
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className={`col-span-1 px-2 py-3 text-center border-r border-[#E5E7EB] ${
                                    day === 22 ? "bg-blue-50/60 text-[#0955AC] font-[800]" : ""
                                }`}
                            >
                                <span className="block text-[11px] text-[#9CA3AF] uppercase">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(day - 19) % 7]}
                                </span>
                                <span>{day}</span>
                            </div>
                        ))}
                        {/* Occupancy column */}
                        <div className="col-span-2 px-3 py-3 text-center">
                            Occupancy
                        </div>
                    </div>

                    {/* Unit Rows */}
                    {INITIAL_UNITS.map((unit) => {
                        const unitEvents = filteredEvents.filter((e) => e.unitId === unit.id);

                        return (
                            <div
                                key={unit.id}
                                className="grid grid-cols-12 border-b border-[#E5E7EB] min-h-[90px] hover:bg-[#FAFAFA] transition-colors"
                            >
                                {/* Unit Info Sidebar */}
                                <div className="col-span-3 px-4 py-3.5 border-r border-[#E5E7EB] flex flex-col justify-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-[700] text-[14px] text-[#111827]">{unit.id}</span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-[#4B5563] font-[600]">
                                            {unit.type}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#6B7280] mt-0.5">{unit.name} • {unit.size}</p>
                                </div>

                                {/* 7 Day Grid Cells for this unit */}
                                <div className="col-span-7 grid grid-cols-7 relative h-full">
                                    {DAYS.map((day) => (
                                        <div
                                            key={day}
                                            className={`border-r border-[#E5E7EB] h-full ${
                                                day === 22 ? "bg-blue-50/20" : ""
                                            }`}
                                        />
                                    ))}

                                    {/* Overlay Event Blocks */}
                                    {unitEvents.map((event) => {
                                        const startIndex = DAYS.indexOf(event.startDay);
                                        const endIndex = DAYS.indexOf(event.endDay);
                                        const span = endIndex - startIndex + 1;
                                        const leftPercent = (startIndex / 7) * 100;
                                        const widthPercent = (span / 7) * 100;

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                style={{
                                                    left: `${leftPercent}%`,
                                                    width: `${widthPercent}%`,
                                                }}
                                                className={`absolute top-2 bottom-2 px-2.5 py-1.5 rounded-[8px] border shadow-xs cursor-pointer flex flex-col justify-between overflow-hidden transition-transform hover:scale-[1.02] ${event.colorBg}`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="font-[700] text-[11px] truncate">{event.client}</span>
                                                    <span className={`text-[9px] font-[700] px-1.5 py-0.5 rounded ${event.badgeBg}`}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-[600] opacity-80">{event.pallets}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Occupancy Bar cell */}
                                <div className="col-span-2 px-4 py-3 flex flex-col justify-center items-center">
                                    <div className="w-full">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="text-[#6B7280]">Capacity</span>
                                            <span className="font-[700] text-[#0955AC]">85%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                            <div className="bg-[#0955AC] h-full rounded-full" style={{ width: "85%" }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Status Legend & KPI Footer */}
            <div className="bg-white rounded-b-[12px] p-4 border-x border-b border-[#E5E7EB] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-[12px]">
                    <span className="font-[700] text-[#374151]">Status Legend:</span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-indigo-600"></span> Confirmed (8)
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-pink-600"></span> In Progress (5)
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-600"></span> Inbound (3)
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-teal-600"></span> Outbound (2)
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-600"></span> Maintenance (1)
                    </span>

                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-600"></span> Reserved (2)
                    </span>
                </div>

                <div className="flex items-center gap-4 text-[12px]">
                    <div className="flex items-center gap-2 bg-[#F0F6FF] px-3 py-1.5 rounded-[6px] border border-blue-200">
                        <span className="font-[600] text-[#0955AC]">Overall Warehouse Occupancy:</span>
                        <span className="font-[800] text-[#0955AC]">85% Occupied</span>
                    </div>
                </div>
            </div>

            {/* Modal for inspect event if clicked */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-white rounded-[12px] p-6 max-w-md w-full shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="text-[17px] font-[700] text-[#111827]">Booking Timeline Event</h3>
                            <button
                                type="button"
                                onClick={() => setSelectedEvent(null)}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-[13px]">
                            <p><span className="font-[600] text-[#6B7280]">Client:</span> {selectedEvent.client}</p>
                            <p><span className="font-[600] text-[#6B7280]">Unit:</span> {selectedEvent.unitId}</p>
                            <p><span className="font-[600] text-[#6B7280]">Type:</span> {selectedEvent.type}</p>
                            <p><span className="font-[600] text-[#6B7280]">Dates:</span> Oct {selectedEvent.startDay} - Oct {selectedEvent.endDay}, 2026</p>
                            <p><span className="font-[600] text-[#6B7280]">Volume / Pallets:</span> {selectedEvent.pallets}</p>
                            <p><span className="font-[600] text-[#6B7280]">Status:</span> {selectedEvent.status}</p>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedEvent(null)}
                                className="px-4 py-2 rounded-[6px] border border-[#D1D5DB] text-[13px] font-[600]"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                                className="px-4 py-2 rounded-[6px] bg-[#0955AC] text-white text-[13px] font-[600]"
                            >
                                View Reservation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarContent;
