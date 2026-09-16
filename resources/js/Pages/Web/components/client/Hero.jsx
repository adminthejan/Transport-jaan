import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@inertiajs/react";
import jsPDF from "jspdf";
import BookingCancellationModal from "./allBooking/BookingCancellationModal";
import {
    Car,
    Plane,
    Ship,
    Calendar,
    MapPin,
    Search,
    Filter,
    Plus,
    Download,
    ChevronRight,
    ChevronLeft,
    CreditCard,
    Clock,
    RefreshCw,
    X,
    Info,
    FileText,
    File,
    Eye,
    Trash2,
    Wallet,
    AlertCircle,
    DollarSign,
    ChevronRight as ChevronRightIcon,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
    BarChart,
    Bar,
} from "recharts";

// ---------- Helpers ----------
const ModeIcon = ({ mode, className }) => {
    if (mode === "air") return <Plane className={className} />;
    if (mode === "sea") return <Ship className={className} />;
    return <Car className={className} />;
};

const statusMap = {
    confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    paid: { label: "Paid", tone: "bg-blue-50 text-blue-700 border-blue-200" },
    pending: { label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-200" },
    active: { label: "Active", tone: "bg-green-50 text-green-700 border-green-200" },
    completed: { label: "Completed", tone: "bg-slate-100 text-slate-600 border-slate-200" },
};

const TABS = [
    { key: "all", label: "All" },
    { key: "land", label: "Land" },
    { key: "air", label: "Air" },
    { key: "sea", label: "Sea" },
    { key: "active", label: "Active" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
];

const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatMoney = (amount, currency = "LKR") =>
    `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isActiveRow = (r) => {
    if (r.status === "active") return true;
    if (["confirmed", "paid"].includes(r.status)) {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const now = new Date();
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) return start <= now && now <= end;
    }
    return false;
};

const isUpcomingRow = (r) => {
    if (!["confirmed", "paid", "pending"].includes(r.status)) return false;
    const start = new Date(r.startDate);
    return !Number.isNaN(start.getTime()) && start > new Date();
};

const isCompletedRow = (r) => {
    if (["completed", "delivered"].includes(r.status)) return true;
    const end = new Date(r.endDate);
    return !Number.isNaN(end.getTime()) && end < new Date() && r.status !== "cancelled";
};

const isCancelledRow = (r) => r.status === "cancelled";

const matchesTab = (row, tab) => {
    switch (tab) {
        case "all":
            return true;
        case "land":
        case "air":
        case "sea":
            return row.mode === tab;
        case "active":
            return isActiveRow(row);
        case "upcoming":
            return isUpcomingRow(row);
        case "completed":
            return isCompletedRow(row);
        case "cancelled":
            return isCancelledRow(row);
        default:
            return true;
    }
};

const normalizeRow = (b) => {
    const category = (b.vehicle_category || "").toLowerCase();
    const mode =
        category.includes("air") || category.includes("plane") || category.includes("flight")
            ? "air"
            : category.includes("sea") || category.includes("boat") || category.includes("ship")
            ? "sea"
            : "land";
    return {
        id: b.id,
        raw: b,
        mode,
        name: b.vehicle_name || b.item || "Vehicle",
        location: b.pickup_location || b.pickup || "N/A",
        startDate: b.start_date || b.from,
        endDate: b.end_date || b.to,
        status: (b.status || "pending").toLowerCase(),
        amount: Number(b.total_amount || b.amount || 0),
        currency: b.currency || "LKR",
        bookingCode: b.booking_code || b.code || `BK-${b.id}`,
        createdAt: b.created_at || b.booking_date,
        summaryUrl: b.summary_url || `/client/bookings/${b.id}/summary`,
        canCancel: Boolean(b.can_cancel),
    };
};

const buildMonthlyTrend = (rows, predicate, valueFn = () => 1) => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString("en-US", { month: "short" }) });
    }
    return months.map(({ y, m, label }) => {
        const value = rows.reduce((sum, r) => {
            const d = new Date(r.createdAt);
            if (Number.isNaN(d.getTime()) || d.getFullYear() !== y || d.getMonth() !== m) return sum;
            if (!predicate(r)) return sum;
            return sum + valueFn(r);
        }, 0);
        return { label, value };
    });
};

const Sparkline = ({ data, color, id }) => (
    <div className="hidden sm:block h-10 w-20 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#spark-${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const Hero = ({ bookings = [], vehicles = [], monthlyData = [] }) => {
    const [activeTab, setActiveTab] = useState("all");
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recent");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [bookingToCancell, setBookingToCancell] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 5;
    const tableRef = useRef(null);

    const scrollToTable = () => {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleNewBooking = () => {
        window.location.href = "/multiModel/plan-journey";
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleClearFilters = () => {
        setQ("");
        setActiveTab("all");
        setSort("recent");
        setStartDate("");
        setEndDate("");
    };

    const handleCancellationSuccess = () => {
        setShowCancellationModal(false);
        setBookingToCancell(null);
        window.location.reload();
    };

    const handleCancelAction = (booking) => {
        if (!booking?.id) return;
        setBookingToCancell(booking);
        setShowCancellationModal(true);
    };

    // ---------- Derived rows & KPIs ----------
    const kpi = useMemo(() => {
        const rows = bookings.map(normalizeRow);
        const now = new Date();

        const activeRentals = rows.filter(isActiveRow).length;

        const upcomingReservations = rows.filter((r) => {
            if (!isUpcomingRow(r)) return false;
            const diffDays = (new Date(r.startDate) - now) / 86400000;
            return diffDays <= 30;
        }).length;

        const dueToday = rows.filter((r) => {
            if (!["active", "confirmed", "paid"].includes(r.status)) return false;
            const end = new Date(r.endDate);
            return !Number.isNaN(end.getTime()) && end.toDateString() === now.toDateString();
        }).length;

        const totalSpendingThisMonth = rows
            .filter((r) => {
                if (!["paid", "completed", "delivered"].includes(r.status)) return false;
                const d = new Date(r.createdAt);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, r) => sum + r.amount, 0);

        return { rows, activeRentals, upcomingReservations, dueToday, totalSpendingThisMonth };
    }, [bookings]);

    const attention = useMemo(() => {
        const now = new Date();
        const paymentPendingCount = kpi.rows.filter((r) => r.status === "pending").length;
        const endingSoonCount = kpi.rows.filter((r) => {
            if (!["active", "confirmed", "paid"].includes(r.status)) return false;
            const end = new Date(r.endDate);
            if (Number.isNaN(end.getTime())) return false;
            const diffDays = (end - now) / 86400000;
            return diffDays > 0 && diffDays <= 3;
        }).length;
        return { paymentPendingCount, endingSoonCount };
    }, [kpi.rows]);

    const attentionItems = useMemo(
        () =>
            [
                { key: "due", label: "Rentals due today", count: kpi.dueToday, icon: Clock, tone: "text-amber-600 bg-amber-50" },
                { key: "pending", label: "Payment pending", count: attention.paymentPendingCount, icon: DollarSign, tone: "text-rose-600 bg-rose-50" },
                { key: "ending", label: "Ending in 3 days", count: attention.endingSoonCount, icon: AlertCircle, tone: "text-blue-600 bg-blue-50" },
            ].filter((i) => i.count > 0),
        [kpi.dueToday, attention]
    );

    const activeTrend = useMemo(() => buildMonthlyTrend(kpi.rows, isActiveRow), [kpi.rows]);
    const upcomingTrend = useMemo(() => buildMonthlyTrend(kpi.rows, isUpcomingRow), [kpi.rows]);
    const dueTodayTrend = useMemo(
        () => buildMonthlyTrend(kpi.rows, (r) => ["active", "confirmed", "paid"].includes(r.status)),
        [kpi.rows]
    );
    const spendingTrend = useMemo(
        () => buildMonthlyTrend(kpi.rows, (r) => ["paid", "completed", "delivered"].includes(r.status), (r) => r.amount),
        [kpi.rows]
    );

    const kpiCards = [
        { id: "active", label: "Active Rentals", sub: "Land • Air • Sea", value: kpi.activeRentals, icon: Car, tint: "bg-blue-50 text-blue-600", color: "#3b82f6", trend: activeTrend },
        { id: "upcoming", label: "Upcoming Reservations", sub: "Next 30 days", value: kpi.upcomingReservations, icon: Calendar, tint: "bg-emerald-50 text-emerald-600", color: "#10b981", trend: upcomingTrend },
        { id: "due", label: "Rentals Due Today", sub: "Requires return/action", value: kpi.dueToday, icon: Clock, tint: "bg-amber-50 text-amber-600", color: "#f59e0b", trend: dueTodayTrend },
        { id: "spend", label: "Total Spending", sub: "This month", value: formatMoney(kpi.totalSpendingThisMonth), icon: Wallet, tint: "bg-purple-50 text-purple-600", color: "#8b5cf6", trend: spendingTrend },
    ];

    const typeOverview = useMemo(() => {
        const build = (type) => {
            const rows = kpi.rows.filter((r) => r.mode === type);
            const activeCount = rows.filter(isActiveRow).length;
            const upcomingCount = rows.filter(isUpcomingRow).length;
            let label = "No bookings";
            if (activeCount > 0) label = "Active";
            else if (upcomingCount > 0) label = "Upcoming";
            return { count: rows.length, label };
        };
        return { land: build("land"), air: build("air"), sea: build("sea") };
    }, [kpi.rows]);

    const upcomingList = useMemo(
        () =>
            kpi.rows
                .filter(isUpcomingRow)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .slice(0, 4),
        [kpi.rows]
    );

    // Chart data: prefer server-provided monthlyData, else derive from bookings
    const chartData = useMemo(() => {
        if (monthlyData && monthlyData.length > 0) return monthlyData;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = new Date().getFullYear();
        return months.map((month, index) => {
            const monthRows = kpi.rows.filter((r) => {
                const d = new Date(r.createdAt);
                return !Number.isNaN(d.getTime()) && d.getMonth() === index && d.getFullYear() === year;
            });
            return {
                month,
                land: monthRows.filter((r) => r.mode === "land").length,
                air: monthRows.filter((r) => r.mode === "air").length,
                sea: monthRows.filter((r) => r.mode === "sea").length,
            };
        });
    }, [monthlyData, kpi.rows]);

    const pieColors = { Land: "#3b82f6", Air: "#10b981", Sea: "#8b5cf6" };
    const pieData = useMemo(
        () =>
            [
                { name: "Land", value: kpi.rows.filter((r) => r.mode === "land").length },
                { name: "Air", value: kpi.rows.filter((r) => r.mode === "air").length },
                { name: "Sea", value: kpi.rows.filter((r) => r.mode === "sea").length },
            ].filter((d) => d.value > 0),
        [kpi.rows]
    );
    const totalBookings = kpi.rows.length;

    // ---------- Filtering / sorting / pagination ----------
    const filteredRows = useMemo(() => {
        return kpi.rows
            .filter((r) => matchesTab(r, activeTab))
            .filter((r) => {
                if (!q) return true;
                const text = `${r.name} ${r.location} ${r.bookingCode}`.toLowerCase();
                return text.includes(q.toLowerCase());
            })
            .filter((r) => {
                if (startDate && endDate) {
                    const d = new Date(r.createdAt);
                    return d >= new Date(startDate) && d <= new Date(endDate);
                }
                return true;
            })
            .sort((a, b) => {
                if (sort === "amount") return b.amount - a.amount;
                if (sort === "upcoming") return new Date(a.startDate) - new Date(b.startDate);
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }, [kpi.rows, activeTab, q, startDate, endDate, sort]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

    useEffect(() => setPage(1), [activeTab, q, sort, startDate, endDate]);
    useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

    const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

    const pageNumbers = useMemo(() => {
        const maxButtons = 5;
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, start + maxButtons - 1);
        start = Math.max(1, end - maxButtons + 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [page, totalPages]);

    // ---------- Export ----------
    const formatExportDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toISOString().split("T")[0];
    };

    const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
    };

    const downloadTextFile = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const downloadCsv = (rows, fileName) => {
        if (rows.length === 0) {
            alert("No bookings to export for the selected filters.");
            return;
        }
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(","), ...rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(","))];
        downloadTextFile(`${csvLines.join("\n")}\n`, fileName, "text/csv;charset=utf-8;");
    };

    const downloadPdf = (rows, fileName) => {
        if (rows.length === 0) {
            alert("No bookings to export for the selected filters.");
            return;
        }

        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const margin = 36;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const lineHeight = 16;

        const columns = [
            { key: "Type", label: "Type", width: 100 },
            { key: "Vehicle", label: "Vehicle", width: 200 },
            { key: "Location", label: "Location", width: 160 },
            { key: "Start", label: "Start", width: 90 },
            { key: "End", label: "End", width: 90 },
            { key: "Status", label: "Status", width: 80 },
            { key: "Amount", label: "Amount", width: 70 },
            { key: "Currency", label: "Currency", width: 60 },
            { key: "Reference", label: "Reference", width: 140 },
        ];

        const maxWidth = pageWidth - margin * 2;
        const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
        const scale = totalWidth > maxWidth ? maxWidth / totalWidth : 1;
        columns.forEach((col) => {
            col.width = col.width * scale;
        });

        let y = margin;

        const drawHeader = () => {
            pdf.setFontSize(11);
            let x = margin;
            columns.forEach((col) => {
                pdf.text(col.label, x, y);
                x += col.width;
            });
            y += lineHeight;
            pdf.setDrawColor(220);
            pdf.line(margin, y - 10, margin + maxWidth, y - 10);
        };

        const drawRow = (row) => {
            pdf.setFontSize(9);
            let x = margin;
            columns.forEach((col) => {
                const value = String(row[col.key] ?? "");
                const clipped = value.length > 32 ? `${value.slice(0, 29)}...` : value;
                pdf.text(clipped, x, y);
                x += col.width;
            });
            y += lineHeight;
            if (y > pageHeight - margin) {
                pdf.addPage();
                y = margin;
                drawHeader();
            }
        };

        drawHeader();
        rows.forEach(drawRow);
        pdf.save(fileName);
    };

    const handleExportFormat = (format) => {
        const rows = filteredRows.map((r) => ({
            Type: r.mode,
            Vehicle: r.name,
            Location: r.location,
            Start: formatExportDate(r.startDate),
            End: formatExportDate(r.endDate),
            Status: r.status,
            Amount: r.amount.toFixed(2),
            Currency: r.currency,
            Reference: r.bookingCode,
        }));

        const dateStamp = new Date().toISOString().split("T")[0];
        const baseName = `vehicle-bookings-${dateStamp}`;

        if (format === "PDF") downloadPdf(rows, `${baseName}.pdf`);
        else if (format === "Excel") downloadCsv(rows, `${baseName}.xlsx`);
        else downloadCsv(rows, `${baseName}.csv`);

        setShowExportModal(false);
    };

    const quickActionTiles = [
        { icon: Car, label: "Rent Land Vehicle", tint: "bg-blue-50 text-blue-600", onClick: () => (window.location.href = "/vehicleList") },
        { icon: Plane, label: "Charter Aircraft", tint: "bg-emerald-50 text-emerald-600", onClick: () => (window.location.href = "/airVehicleList") },
        { icon: Ship, label: "Book Yacht/Boat", tint: "bg-indigo-50 text-indigo-600", onClick: () => (window.location.href = "/seaVehicleList") },
        { icon: Calendar, label: "View Bookings", tint: "bg-amber-50 text-amber-600", onClick: scrollToTable },
        { icon: RefreshCw, label: "Extend Rental", tint: "bg-teal-50 text-teal-600", onClick: () => { setActiveTab("active"); scrollToTable(); } },
        { icon: Download, label: "Download Invoice", tint: "bg-rose-50 text-rose-600", onClick: () => setShowExportModal(true) },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F4F6F9] poppins">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-[26px] font-[700] text-slate-900">
                            <span className="text-[#0955AC]">Vehicle Rentals</span> Dashboard
                        </h1>
                        <p className="text-slate-500 text-[13px] mt-1">Plan, book and manage your Land, Air &amp; Sea rentals</p>
                    </div>
                    <button
                        onClick={handleNewBooking}
                        className="inline-flex items-center h-11 px-5 rounded-xl bg-[#0955AC] text-white text-[14px] font-[600] hover:bg-[#0744a0] transition-colors shrink-0 self-start md:self-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Booking
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
                    {kpiCards.map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${card.tint}`}>
                                    <card.icon className="w-[18px] h-[18px]" />
                                </span>
                                <p className="text-[19px] font-[700] text-slate-900 leading-tight truncate">{card.value}</p>
                                <p className="text-[11.5px] font-[600] text-slate-600 mt-0.5">{card.label}</p>
                                <p className="text-[10.5px] text-slate-400">{card.sub}</p>
                            </div>
                            <Sparkline data={card.trend} color={card.color} id={card.id} />
                        </div>
                    ))}
                </div>

                {/* My Rentals Overview */}
                <div className="mb-5">
                    <h2 className="text-[15px] font-[700] text-slate-800 mb-3">My Rentals Overview</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        {[
                            { type: "land", title: "Land Rentals", icon: Car, tint: "bg-blue-50 text-blue-600" },
                            { type: "air", title: "Air Rentals", icon: Plane, tint: "bg-emerald-50 text-emerald-600" },
                            { type: "sea", title: "Sea Rentals", icon: Ship, tint: "bg-indigo-50 text-indigo-600" },
                        ].map((t) => {
                            const ov = typeOverview[t.type];
                            return (
                                <div key={t.type} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.tint}`}>
                                            <t.icon className="w-5 h-5" />
                                        </span>
                                        {ov.count > 0 && (
                                            <span
                                                className={`text-[11px] font-[700] px-2.5 py-1 rounded-full ${
                                                    ov.label === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                }`}
                                            >
                                                {ov.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13.5px] font-[600] text-slate-600">{t.title}</p>
                                    <p className="text-[26px] font-[700] text-slate-900 leading-tight">{String(ov.count).padStart(2, "0")}</p>
                                    <button
                                        onClick={() => {
                                            setActiveTab(t.type);
                                            scrollToTable();
                                        }}
                                        className="mt-2 text-[12px] font-[700] text-[#0955AC] hover:underline inline-flex items-center gap-1"
                                    >
                                        View Details <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bookings table + right rail */}
                <div ref={tableRef} className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start mb-6">
                    <div className="space-y-4 min-w-0">
                        {/* Tabs + search + filters */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                            <div className="flex flex-wrap items-center gap-2 mb-3.5">
                                {TABS.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setActiveTab(t.key)}
                                        className={`h-9 px-3.5 rounded-lg text-[12.5px] font-[600] transition-colors whitespace-nowrap ${
                                            activeTab === t.key ? "bg-[#0955AC] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative flex-1 min-w-[220px]">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search booking ID, vehicle, or location..."
                                        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                    />
                                    {q && (
                                        <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowAdvancedFilters((v) => !v)}
                                    className={`inline-flex items-center h-10 px-3.5 rounded-lg border text-[13px] font-medium transition-colors whitespace-nowrap ${
                                        showAdvancedFilters ? "bg-[#0955AC] text-white border-[#0955AC]" : "border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <Filter className="mr-1.5 h-4 w-4" /> Filters
                                </button>
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="inline-flex items-center h-10 px-3.5 rounded-lg border border-slate-300 text-[13px] font-medium hover:bg-slate-50 whitespace-nowrap"
                                >
                                    <Download className="mr-1.5 h-4 w-4" /> Export
                                </button>
                                <button onClick={handleRefresh} className="inline-flex items-center h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>

                            <AnimatePresence>
                                {showAdvancedFilters && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                                            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                                                <div>
                                                    <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Sort By</label>
                                                    <select
                                                        value={sort}
                                                        onChange={(e) => setSort(e.target.value)}
                                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                                    >
                                                        <option value="recent">Most Recent</option>
                                                        <option value="upcoming">Upcoming First</option>
                                                        <option value="amount">Highest Amount</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11.5px] font-medium text-slate-700 mb-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button onClick={handleClearFilters} className="h-9 w-full inline-flex items-center justify-center gap-2 px-3 rounded-lg border border-slate-300 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50">
                                                        <X className="h-3.5 w-3.5" /> Clear
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-slate-500">
                                                <Info className="h-3.5 w-3.5" />
                                                <span>Showing {filteredRows.length} of {bookings.length} bookings</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Table */}
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                                <h3 className="text-[15px] font-[700] text-slate-800">My Bookings ({filteredRows.length})</h3>
                            </div>
                            {pagedRows.length === 0 ? (
                                <div className="px-4 py-16 text-center">
                                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-[14px] font-medium">No bookings found</p>
                                    <p className="text-slate-400 text-[12.5px] mt-1">Try adjusting your filters or make a new booking</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                                                <th className="px-4 py-2.5 font-[600]">Booking ID</th>
                                                <th className="px-2 py-2.5 font-[600]">Mode</th>
                                                <th className="px-2 py-2.5 font-[600]">Vehicle / Service</th>
                                                <th className="px-2 py-2.5 font-[600] hidden sm:table-cell">Location</th>
                                                <th className="px-2 py-2.5 font-[600] hidden md:table-cell">Pickup / Start</th>
                                                <th className="px-2 py-2.5 font-[600] hidden md:table-cell">Return / End</th>
                                                <th className="px-2 py-2.5 font-[600]">Status</th>
                                                <th className="px-2 py-2.5 font-[600] text-right">Amount</th>
                                                <th className="px-4 py-2.5 font-[600] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedRows.map((r) => (
                                                <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-3 text-[12.5px] font-[600] text-slate-500 whitespace-nowrap">{r.bookingCode}</td>
                                                    <td className="px-2 py-3">
                                                        <span className="inline-flex w-8 h-8 rounded-lg bg-slate-50 items-center justify-center">
                                                            <ModeIcon mode={r.mode} className="w-4 h-4 text-[#0955AC]" />
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <p className="text-[13px] font-[600] text-slate-800 truncate max-w-[180px]">{r.name}</p>
                                                    </td>
                                                    <td className="px-2 py-3 text-[12.5px] text-slate-500 hidden sm:table-cell truncate max-w-[160px]">{r.location}</td>
                                                    <td className="px-2 py-3 text-[12.5px] text-slate-500 whitespace-nowrap hidden md:table-cell">{formatDate(r.startDate)}</td>
                                                    <td className="px-2 py-3 text-[12.5px] text-slate-500 whitespace-nowrap hidden md:table-cell">{formatDate(r.endDate)}</td>
                                                    <td className="px-2 py-3">
                                                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusMap[r.status]?.tone || statusMap.pending.tone}`}>
                                                            {statusMap[r.status]?.label || r.status || "Pending"}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 text-right whitespace-nowrap">
                                                        <span className="text-[13px] font-[700] text-[#0955AC]">{formatMoney(r.amount, r.currency)}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link href={r.summaryUrl} title="View details" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Link>
                                                            {r.canCancel && ["confirmed", "pending", "paid"].includes(r.status) && (
                                                                <button
                                                                    onClick={() => handleCancelAction(r.raw)}
                                                                    title="Cancel booking"
                                                                    className="w-8 h-8 rounded-lg border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {filteredRows.length > 0 && (
                                <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className="text-[12.5px] text-slate-500">
                                        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} bookings
                                    </p>
                                    <div className="inline-flex items-center gap-1.5">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        {pageNumbers.map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => setPage(n)}
                                                className={`w-8 h-8 rounded-lg text-[12.5px] font-[600] ${
                                                    page === n ? "bg-[#0955AC] text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right rail */}
                    <div className="space-y-5">
                        {/* Upcoming Reservations */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-3.5">
                                <h3 className="text-[14px] font-[700] text-slate-800">Upcoming Reservations</h3>
                                <button onClick={() => setActiveTab("upcoming")} className="text-[11.5px] font-[700] text-[#0955AC] hover:underline">
                                    View All
                                </button>
                            </div>
                            {upcomingList.length === 0 ? (
                                <p className="text-[12.5px] text-slate-400 text-center py-6">No upcoming reservations.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingList.map((r) => (
                                        <div key={r.id} className="flex items-center gap-3">
                                            <span className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                                <ModeIcon mode={r.mode} className="w-4 h-4 text-[#0955AC]" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12.5px] font-[600] text-slate-800 truncate">{r.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {formatDate(r.startDate)} • {r.location}
                                                </p>
                                            </div>
                                            <span className={`text-[10.5px] font-[700] px-2 py-0.5 rounded-full whitespace-nowrap ${statusMap[r.status]?.tone || statusMap.pending.tone}`}>
                                                {statusMap[r.status]?.label || r.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickActionTiles.map((a) => (
                                    <button
                                        key={a.label}
                                        onClick={a.onClick}
                                        className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-center"
                                    >
                                        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${a.tint}`}>
                                            <a.icon className="w-4 h-4" />
                                        </span>
                                        <span className="text-[11.5px] font-[600] text-slate-700 leading-tight">{a.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Attention Required */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Attention Required</h3>
                            {attentionItems.length === 0 ? (
                                <p className="text-[12.5px] text-slate-400 text-center py-6">Nothing needs your attention right now.</p>
                            ) : (
                                <div className="space-y-1">
                                    {attentionItems.map((item) => (
                                        <button
                                            key={item.key}
                                            onClick={() => {
                                                setActiveTab("all");
                                                scrollToTable();
                                            }}
                                            className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 text-left transition-colors"
                                        >
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.tone}`}>
                                                <item.icon className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-[12.5px] font-[600] text-slate-700">{item.label}</span>
                                            <span className="text-[11px] font-[700] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Booking Trends</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Land • Air • Sea (year to date)</p>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                                    <RTooltip />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                    <Line type="monotone" dataKey="land" name="Land" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="air" name="Air" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="sea" name="Sea" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Rental Distribution</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Share of total bookings</p>
                        <div className="relative h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name" cornerRadius={6}>
                                        {pieData.map((d) => (
                                            <Cell key={d.name} fill={pieColors[d.name]} />
                                        ))}
                                    </Pie>
                                    <RTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[20px] font-[700] text-slate-900">{totalBookings}</p>
                                <p className="text-[10px] text-slate-400">Total Bookings</p>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {pieData.length === 0 ? (
                                <p className="text-[12px] text-slate-400 text-center">No bookings yet.</p>
                            ) : (
                                pieData.map((d) => (
                                    <div key={d.name} className="flex items-center justify-between text-[12px]">
                                        <span className="flex items-center gap-2 text-slate-600">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[d.name] }} />
                                            {d.name} Rentals
                                        </span>
                                        <span className="font-[600] text-slate-700">
                                            {totalBookings > 0 ? Math.round((d.value / totalBookings) * 100) : 0}% ({d.value})
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Spending Overview</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Monthly total (last 6 months)</p>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spendingTrend} margin={{ left: -20, right: 10, top: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                                    <RTooltip formatter={(value) => formatMoney(value)} />
                                    <Bar dataKey="value" name="Spending" fill="#0955AC" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pb-2">
                    © {new Date().getFullYear()} Rental Portal · Land • Air • Sea
                </div>
            </div>

            {/* Booking Cancellation Modal */}
            {bookingToCancell && (
                <BookingCancellationModal
                    booking={bookingToCancell}
                    isOpen={showCancellationModal}
                    onClose={() => {
                        setShowCancellationModal(false);
                        setBookingToCancell(null);
                    }}
                    onSuccess={handleCancellationSuccess}
                />
            )}

            {/* Export Modal */}
            <AnimatePresence>
                {showExportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setShowExportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full"
                        >
                            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-[18px] font-semibold text-slate-900">Export Bookings</h2>
                                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="px-6 py-4">
                                <p className="text-[14px] text-slate-600 mb-4">Export all {filteredRows.length} filtered bookings</p>

                                <div className="space-y-2">
                                    <button onClick={() => handleExportFormat("PDF")} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-[#0955AC] transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[14px] font-medium text-slate-900">Export as PDF</p>
                                                <p className="text-[12px] text-slate-500">Printable document format</p>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-[#0955AC]" />
                                    </button>

                                    <button onClick={() => handleExportFormat("Excel")} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-[#0955AC] transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                <File className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[14px] font-medium text-slate-900">Export as Excel</p>
                                                <p className="text-[12px] text-slate-500">Spreadsheet format (.xlsx)</p>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-[#0955AC]" />
                                    </button>

                                    <button onClick={() => handleExportFormat("CSV")} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-[#0955AC] transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[14px] font-medium text-slate-900">Export as CSV</p>
                                                <p className="text-[12px] text-slate-500">Comma-separated values</p>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-[#0955AC]" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Hero;
