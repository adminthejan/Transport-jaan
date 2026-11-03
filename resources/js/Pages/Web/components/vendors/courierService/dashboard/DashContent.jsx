import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { CalendarDays, Download, Filter, Search } from "lucide-react";


const METRIC_CARD_CLASSES = {
    delayed: "bg-[#FFE9E9] text-[#8A1C1C]",
    exceptions: "bg-[#FFF2E5] text-[#8A4A00]",
    labelCreated: "bg-[#EAF1FF] text-[#0F3D8A]",
    pendingPickups: "bg-[#F2EEFF] text-[#3F2472]",
    delivered: "bg-[#E8FAEF] text-[#1B6C3A]",
    onTime: "bg-[#E9F8FF] text-[#0F5270]",
    outForDelivery: "bg-[#E6F4FF] text-[#0B4F8A]",
    failedDelivery: "bg-[#FFE9E9] text-[#8A1C1C]",
};

const EMPTY_DASHBOARD = {
    metrics: {
        delayed: 0,
        exceptions: 0,
        labelCreated: 0,
        pendingPickups: 0,
        delivered: 0,
        onTime: 0,
        outForDelivery: 0,
        failedDelivery: 0,
    },
    rows: [],
    filters: {
        q: "",
        status: "",
        service: "",
        category: "",
        fromDate: "",
        toDate: "",
        page: 1,
    },
    pagination: {
        page: 1,
        pageSize: 12,
        total: 0,
        totalPages: 1,
    },
    filterOptions: {
        statuses: [],
        services: [],
        categories: [],
    },
    ops: {
        bookingFunnel: [],
        stageBoard: [],
        providerPerformance: [],
        urgentQueue: [],
    },
};

const statusBadgeCls = (status) => {
    switch (status) {
        case "delivered":
            return "bg-[#E8FAEF] text-[#1B6C3A]";
        case "in_transit":
            return "bg-[#EAF1FF] text-[#0F3D8A]";
        case "confirmed":
            return "bg-[#F2EEFF] text-[#3F2472]";
        case "cancelled":
            return "bg-[#FFE9E9] text-[#8A1C1C]";
        default:
            return "bg-[#F3F3F3] text-[#4F4F4F]";
    }
};

const metricCards = [
    { key: "delayed", label: "Delayed" },
    { key: "exceptions", label: "Exceptions" },
    { key: "labelCreated", label: "Label Created" },
    { key: "delivered", label: "Delivered" },
    { key: "onTime", label: "On Time" },
    { key: "outForDelivery", label: "Out for Delivery" },
    { key: "failedDelivery", label: "Failed Delivery" },
];

const DashContent = ({ mode = "dashboard" }) => {
    const pageProps = usePage().props;
    const dashboard = pageProps.courierDashboard || EMPTY_DASHBOARD;

    const [localFilters, setLocalFilters] = useState({
        q: dashboard.filters.q || "",
        status: dashboard.filters.status || "",
        service: dashboard.filters.service || "",
        category: dashboard.filters.category || "",
        urgentType: dashboard.filters.urgentType || "",
        bookingRange: dashboard.filters.bookingRange || "this_year",
        earningRange: dashboard.filters.earningRange || "last_12_months",
        statusRange: dashboard.filters.statusRange || "this_week",
        fromDate: dashboard.filters.fromDate || "",
        toDate: dashboard.filters.toDate || "",
    });

    const heading = mode === "bookings" ? "Courier Bookings" : "Courier Service Dashboard";

    const bookingFunnel = Array.isArray(dashboard?.ops?.bookingFunnel) ? dashboard.ops.bookingFunnel : [];
    const stageBoard = Array.isArray(dashboard?.ops?.stageBoard) ? dashboard.ops.stageBoard : [];
    const providerPerformance = Array.isArray(dashboard?.ops?.providerPerformance) ? dashboard.ops.providerPerformance : [];
    const urgentQueue = Array.isArray(dashboard?.ops?.urgentQueue) ? dashboard.ops.urgentQueue : [];
    const topRoutes = Array.isArray(dashboard?.ops?.topRoutes) ? dashboard.ops.topRoutes : [];
    const urgentTypes = Array.isArray(dashboard?.filterOptions?.urgentTypes) ? dashboard.filterOptions.urgentTypes : [];

    const commandCenter = useMemo(
        () => [
            {
                key: "urgent-total",
                label: "Urgent Queue",
                value: urgentQueue.length,
                tone: "bg-[#FFE9E9] text-[#8A1C1C]",
                href: route("courierService.dashboard", { ...localFilters, urgentType: "delayed" }),
                cta: "Focus Delayed",
            },
            {
                key: "exceptions-now",
                label: "Exceptions Now",
                value: dashboard.metrics?.exceptions ?? 0,
                tone: "bg-[#FFF2E5] text-[#8A4A00]",
                href: route("courierService.tracking", { exceptionOnly: "1" }),
                cta: "Open Exceptions",
            },
            {
                key: "pending-pickups",
                label: "Pending Pickups",
                value: dashboard.metrics?.pendingPickups ?? 0,
                tone: "bg-[#F2EEFF] text-[#3F2472]",
                href: route("courierService.dashboard", { ...localFilters, urgentType: "pending_pickup" }),
                cta: "Resolve Pickups",
            },
            {
                key: "sla-delayed",
                label: "SLA Delayed",
                value: dashboard.metrics?.delayed ?? 0,
                tone: "bg-[#EAF1FF] text-[#0F3D8A]",
                href: route("courierService.tracking", { sla: "delayed" }),
                cta: "View SLA Risks",
            },
        ],
        [dashboard.metrics, localFilters, urgentQueue.length],
    );

    const baseRoute = mode === "bookings" ? "courierService.bookings" : "courierService.dashboard";

    const submitFilters = (nextPage = 1) => {
        router.get(
            route(baseRoute),
            {
                ...localFilters,
                page: nextPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const applySingleFilter = (key, value) => {
        const next = { ...localFilters, [key]: value };
        setLocalFilters(next);
        router.get(
            route(baseRoute),
            {
                ...next,
                page: 1,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const reportUrl = useMemo(
        () =>
            route("courierService.dashboard.report", {
                ...dashboard.filters,
                ...localFilters,
                page: 1,
                export: "csv",
            }),
        [dashboard.filters, localFilters],
    );

    return (
        <div className="w-full h-auto px-4 lg:px-6 pt-6 pb-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[30px] lg:text-[34px] font-[700] text-[#111827]">{heading}</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Operational courier overview for approved shipment categories.
                    </p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                        Last refreshed: {dashboard.generatedAt || "-"}
                    </p>
                </div>
                <a
                    href={reportUrl}
                    className="inline-flex items-center justify-center gap-2 h-[40px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[14px] font-[600]"
                >
                    <Download size={16} />
                    Generate Report
                </a>
            </div>

            <div className="bg-white rounded-[10px] shadow-sm p-4 mb-6 border border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[20px] font-[700] text-[#111827]">Dispatch Command Center</h2>
                    <p className="text-[12px] text-[#6B7280]">Live operations shortcuts for fast triage</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {commandCenter.map((item) => (
                        <div key={item.key} className={`rounded-[8px] px-3 py-3 ${item.tone}`}>
                            <p className="text-[12px] font-[700]">{item.label}</p>
                            <p className="text-[24px] font-[700] leading-tight mt-1">{item.value}</p>
                            <a
                                href={item.href}
                                className="inline-flex mt-2 text-[11px] font-[700] underline underline-offset-2"
                            >
                                {item.cta}
                            </a>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {metricCards.map((item) => (
                    <div
                        key={item.key}
                        className={`rounded-[10px] px-4 py-3 shadow-sm ${METRIC_CARD_CLASSES[item.key] || "bg-[#F4F4F5] text-[#1F2937]"}`}
                    >
                        <p className="text-[13px] font-[600]">{item.label}</p>
                        <p className="text-[26px] font-[700] leading-tight mt-1">
                            {dashboard.metrics[item.key] ?? 0}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
                <div className="bg-white rounded-[10px] shadow-sm p-5">
                    <h2 className="text-[22px] font-[700] text-[#111827] mb-3">Booking Funnel</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {bookingFunnel.map((item) => (
                            <div key={item.status} className="rounded-[8px] border border-[#E5E7EB] px-3 py-3">
                                <p className="text-[11px] text-[#6B7280] font-[600]">{item.label}</p>
                                <p className="text-[20px] font-[700] mt-1">{item.count}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[10px] shadow-sm p-5">
                    <h2 className="text-[22px] font-[700] text-[#111827] mb-3">Shipment Stage Board</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {stageBoard.map((item) => (
                            <div key={item.stage} className="rounded-[8px] border border-[#E5E7EB] px-3 py-3">
                                <p className="text-[11px] text-[#6B7280] font-[600]">{item.label}</p>
                                <p className="text-[20px] font-[700] mt-1">{item.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
                <div className="bg-white rounded-[10px] shadow-sm p-5">
                    <h2 className="text-[22px] font-[700] text-[#111827] mb-3">Provider Performance</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-[13px]">
                            <thead className="bg-[#F3F4F6]">
                                <tr>
                                    <th className="px-3 py-2 font-[700]">Provider</th>
                                    <th className="px-3 py-2 font-[700]">Total</th>
                                    <th className="px-3 py-2 font-[700]">Delayed</th>
                                    <th className="px-3 py-2 font-[700]">Exceptions</th>
                                    <th className="px-3 py-2 font-[700]">On-Time %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {providerPerformance.length > 0 ? providerPerformance.map((item) => (
                                    <tr key={item.provider} className="border-b border-[#E5E7EB]">
                                        <td className="px-3 py-2">{item.provider}</td>
                                        <td className="px-3 py-2">{item.total}</td>
                                        <td className="px-3 py-2">{item.delayed}</td>
                                        <td className="px-3 py-2">{item.exceptions}</td>
                                        <td className="px-3 py-2">{item.onTimeRate}%</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-6 text-center text-[#6B7280]">No provider performance records.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-[10px] shadow-sm p-5">
                    <h2 className="text-[22px] font-[700] text-[#111827] mb-3">Urgent Action Queue</h2>
                    <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                        {urgentQueue.length > 0 ? urgentQueue.map((item) => (
                            <div key={item.id} className="border border-[#E5E7EB] rounded-[8px] px-3 py-3">
                                <p className="text-[13px] font-[700]">{item.bookingNumber} • {item.trackingNumber}</p>
                                <p className="text-[12px] text-[#6B7280] mt-1">{item.statusLabel}</p>
                                <div className="flex gap-2 mt-2">
                                    {item.timelineState === "delayed" && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#FFE9E9] text-[#8A1C1C]">Delayed</span>}
                                    {item.hasException && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#FFF2E5] text-[#8A4A00]">Exception</span>}
                                    {item.pendingPickup && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#F2EEFF] text-[#3F2472]">Pending Pickup</span>}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <a
                                        href={route("courierService.tracking", { q: item.trackingNumber })}
                                        className="inline-flex items-center justify-center h-[28px] px-2 rounded-[6px] text-[11px] font-[700] border border-[#0955AC] text-[#0955AC]"
                                    >
                                        Open in Tracking
                                    </a>
                                    <a
                                        href={route("courierService.units", { q: item.trackingNumber })}
                                        className="inline-flex items-center justify-center h-[28px] px-2 rounded-[6px] text-[11px] font-[700] border border-[#111827] text-[#111827]"
                                    >
                                        Open in Shipments
                                    </a>
                                </div>
                            </div>
                        )) : (
                            <p className="text-[13px] text-[#6B7280]">No urgent actions right now.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[10px] shadow-sm p-5 mb-6">
                <h2 className="text-[22px] font-[700] text-[#111827] mb-3">Top Routes (Delay Hotspots)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[13px]">
                        <thead className="bg-[#F3F4F6]">
                            <tr>
                                <th className="px-3 py-2 font-[700]">Route</th>
                                <th className="px-3 py-2 font-[700]">Total Shipments</th>
                                <th className="px-3 py-2 font-[700]">Delayed</th>
                                <th className="px-3 py-2 font-[700]">Delay Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topRoutes.length > 0 ? topRoutes.map((item) => (
                                <tr key={item.route} className="border-b border-[#E5E7EB]">
                                    <td className="px-3 py-2">{item.route}</td>
                                    <td className="px-3 py-2">{item.total}</td>
                                    <td className="px-3 py-2">{item.delayed}</td>
                                    <td className="px-3 py-2">{item.delayRate}%</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-[#6B7280]">No route insights available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-[10px] shadow-sm p-4 lg:p-6">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
                    <h2 className="text-[22px] font-[700] text-[#111827]">All Bookings</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="h-[38px] min-w-[280px] bg-[#F3F4F6] rounded-[8px] px-3 flex items-center gap-2">
                            <Search size={16} className="text-[#6B7280]" />
                            <input
                                type="text"
                                value={localFilters.q}
                                onChange={(e) => setLocalFilters((prev) => ({ ...prev, q: e.target.value }))}
                                placeholder="Search Booking No. or Tracking No."
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-[14px]"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => submitFilters(1)}
                            className="h-[38px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[14px] font-[600]"
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-2 mb-4">
                    <select
                        value={localFilters.status}
                        onChange={(e) => setLocalFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px]"
                    >
                        <option value="">All Statuses</option>
                        {dashboard.filterOptions.statuses.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={localFilters.service}
                        onChange={(e) => setLocalFilters((prev) => ({ ...prev, service: e.target.value }))}
                        className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px]"
                    >
                        <option value="">All Services</option>
                        {dashboard.filterOptions.services.map((service) => (
                            <option key={service} value={service}>
                                {service}
                            </option>
                        ))}
                    </select>

                    <select
                        value={localFilters.category}
                        onChange={(e) => setLocalFilters((prev) => ({ ...prev, category: e.target.value }))}
                        className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px]"
                    >
                        <option value="">All Categories</option>
                        {dashboard.filterOptions.categories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={localFilters.urgentType}
                        onChange={(e) => setLocalFilters((prev) => ({ ...prev, urgentType: e.target.value }))}
                        className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px]"
                    >
                        {urgentTypes.map((item) => (
                            <option key={item.value || "all-priority"} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>

                    <div className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px] flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <input
                            type="date"
                            value={localFilters.fromDate}
                            onChange={(e) => setLocalFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                            className="w-full border-none focus:ring-0 outline-none"
                        />
                    </div>

                    <div className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[14px] flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <input
                            type="date"
                            value={localFilters.toDate}
                            onChange={(e) => setLocalFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                            className="w-full border-none focus:ring-0 outline-none"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => submitFilters(1)}
                        className="h-[38px] rounded-[8px] bg-[#F3F4F6] text-[#111827] text-[14px] font-[600] flex items-center justify-center gap-2"
                    >
                        <Filter size={14} />
                        Apply Filters
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {urgentTypes.filter((item) => item.value !== "").map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                                const next = { ...localFilters, urgentType: item.value };
                                setLocalFilters(next);
                                router.get(route(baseRoute), { ...next, page: 1 }, { preserveScroll: true, preserveState: true, replace: true });
                            }}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-[700] ${localFilters.urgentType === item.value ? "bg-[#0955AC] text-white" : "bg-[#F3F4F6] text-[#374151]"}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    {localFilters.urgentType !== "" && (
                        <button
                            type="button"
                            onClick={() => {
                                const next = { ...localFilters, urgentType: "" };
                                setLocalFilters(next);
                                router.get(route(baseRoute), { ...next, page: 1 }, { preserveScroll: true, preserveState: true, replace: true });
                            }}
                            className="px-3 py-1.5 rounded-full text-[12px] font-[700] border border-[#D1D5DB]"
                        >
                            Clear Priority
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[13px]">
                        <thead className="bg-[#D8E4F2] text-[#1F2937]">
                            <tr>
                                <th className="px-4 py-3 font-[700]">Booking</th>
                                <th className="px-4 py-3 font-[700]">Pickup</th>
                                <th className="px-4 py-3 font-[700]">Delivery</th>
                                <th className="px-4 py-3 font-[700]">Shipment</th>
                                <th className="px-4 py-3 font-[700]">Customer</th>
                                <th className="px-4 py-3 font-[700]">Payment</th>
                                <th className="px-4 py-3 font-[700]">Provider</th>
                                <th className="px-4 py-3 font-[700]">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard.rows.length > 0 ? (
                                dashboard.rows.map((row) => (
                                    <tr key={row.id} className="border-b border-[#E5E7EB] align-top">
                                        <td className="px-4 py-3">
                                            <div className="font-[600]">{row.bookingNumber}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.trackingNumber}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.bookingDate || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>{row.pickupDate || "-"}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.pickupTime || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>{row.estimatedDelivery || "-"}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.deliverySlot || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span>{row.service}</span>
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#F3F4F6] text-[#4B5563]">
                                                    {row.category}
                                                </span>
                                            </div>
                                            <div className="text-[12px] text-[#6B7280]">
                                                {row.packageType} × {row.packageCount} · {row.weightKg} kg
                                            </div>
                                            <div className="text-[12px] text-[#6B7280]">{row.dimensions}</div>
                                            <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-[700] bg-[#EAF1FF] text-[#0F3D8A]">
                                                {row.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 min-w-[200px]">
                                            <div className="font-[600]">{row.customerContact || "-"}</div>
                                            <div className="text-[12px] text-[#6B7280]">From: {row.pickupLocation || "-"}</div>
                                            <div className="text-[12px] text-[#6B7280]">To: {row.deliveryLocation || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-[600]">{row.paymentStatus}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.paymentMethod || "-"}</div>
                                            {row.codAmount != null && (
                                                <div className="text-[12px] text-[#6B7280]">COD: {row.currency} {row.codAmount.toLocaleString()}</div>
                                            )}
                                            <div className="text-[12px] text-[#6B7280]">
                                                Shipping: {row.shippingCharge != null ? `${row.currency} ${row.shippingCharge.toLocaleString()}` : "-"}
                                            </div>
                                            <div className="text-[12px] font-[600]">
                                                Total: {row.totalAmount != null ? `${row.currency} ${row.totalAmount.toLocaleString()}` : "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{row.assignedProvider}</div>
                                            <div className="text-[12px] text-[#6B7280]">{row.providerStatus}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-[700] ${statusBadgeCls(row.status)}`}
                                            >
                                                {row.statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-[#6B7280]">
                                        No courier bookings found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <p className="text-[13px] text-[#6B7280]">
                        Showing page {dashboard.pagination.page} of {dashboard.pagination.totalPages} ({dashboard.pagination.total} records)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={dashboard.pagination.page <= 1}
                            onClick={() => submitFilters(dashboard.pagination.page - 1)}
                            className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={dashboard.pagination.page >= dashboard.pagination.totalPages}
                            onClick={() => submitFilters(dashboard.pagination.page + 1)}
                            className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashContent;
