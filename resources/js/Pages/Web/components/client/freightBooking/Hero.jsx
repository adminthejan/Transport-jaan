import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
    Ship,
    Plane,
    Boxes,
    Calendar,
    Search,
    Filter,
    Plus,
    Download,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
    X,
    Info,
    FileText,
    File,
    Eye,
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
} from "recharts";

// ---------- Illustrative data ----------
// This dashboard is not yet backed by a per-user freight booking API (the
// `freight_quotes` table has no user linkage), so the monthly volumes and
// sample bookings below remain representative placeholders rather than
// live figures, same as before this redesign.
const monthly = [
    { month: "Jan", fcl: 220, lcl: 140, air: 80 },
    { month: "Feb", fcl: 240, lcl: 130, air: 90 },
    { month: "Mar", fcl: 260, lcl: 160, air: 110 },
    { month: "Apr", fcl: 280, lcl: 170, air: 120 },
    { month: "May", fcl: 300, lcl: 190, air: 130 },
    { month: "Jun", fcl: 290, lcl: 200, air: 150 },
    { month: "Jul", fcl: 310, lcl: 210, air: 160 },
    { month: "Aug", fcl: 320, lcl: 215, air: 170 },
    { month: "Sep", fcl: 300, lcl: 205, air: 155 },
    { month: "Oct", fcl: 280, lcl: 190, air: 145 },
    { month: "Nov", fcl: 270, lcl: 185, air: 135 },
    { month: "Dec", fcl: 260, lcl: 175, air: 120 },
];

const bookings = [
    {
        code: "FB-202508-001",
        mode: "fcl",
        item: "20' FCL – Colombo → Singapore",
        from: "2025-08-30 10:00",
        to: "2025-09-12 16:00",
        hub: "Colombo Port",
        status: "confirmed",
        amount: 1200,
    },
    {
        code: "FB-202508-002",
        mode: "lcl",
        item: "LCL 4.2 cbm – Colombo → Dubai",
        from: "2025-08-29 09:30",
        to: "2025-09-05 18:00",
        hub: "Colombo Port",
        status: "paid",
        amount: 218.4,
    },
    {
        code: "FB-202508-003",
        mode: "air",
        item: "Air 180 kg – CMB → SIN",
        from: "2025-09-02 07:00",
        to: "2025-09-02 20:30",
        hub: "BIA (CMB)",
        status: "pending",
        amount: 702,
    },
    {
        code: "FB-202508-004",
        mode: "fcl",
        item: "40' FCL – Colombo → Jebel Ali",
        from: "2025-08-26 14:00",
        to: "2025-09-09 11:00",
        hub: "Colombo Port",
        status: "cancelled",
        amount: 2100,
    },
];

// ---------- Helpers ----------
const ModeIcon = ({ mode, className }) => {
    if (mode === "air") return <Plane className={className} />;
    if (mode === "lcl") return <Boxes className={className} />;
    return <Ship className={className} />; // fcl default
};

const statusMap = {
    confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    paid: { label: "Paid", tone: "bg-blue-50 text-blue-700 border-blue-200" },
    pending: { label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

const TABS = [
    { key: "all", label: "All" },
    { key: "fcl", label: "FCL" },
    { key: "lcl", label: "LCL" },
    { key: "air", label: "Air" },
    { key: "confirmed", label: "Confirmed" },
    { key: "pending", label: "Pending" },
    { key: "cancelled", label: "Cancelled" },
];

const matchesTab = (row, tab) => {
    switch (tab) {
        case "all":
            return true;
        case "fcl":
        case "lcl":
        case "air":
            return row.mode === tab;
        case "confirmed":
            return ["confirmed", "paid"].includes(row.status);
        case "pending":
            return row.status === "pending";
        case "cancelled":
            return row.status === "cancelled";
        default:
            return true;
    }
};

const Sparkline = ({ data, dataKey, color, id }) => (
    <div className="hidden sm:block h-10 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`fspark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#fspark-${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const Hero = () => {
    const [activeTab, setActiveTab] = useState("all");
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recent");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 5;
    const tableRef = useRef(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const recentTrend = useMemo(() => monthly.slice(-6), []);

    const totalFCL = useMemo(() => monthly.reduce((a, b) => a + b.fcl, 0), []);
    const totalLCL = useMemo(() => monthly.reduce((a, b) => a + b.lcl, 0), []);
    const totalAir = useMemo(() => monthly.reduce((a, b) => a + b.air, 0), []);
    const totalVolume = totalFCL + totalLCL + totalAir;

    const activeBookings = bookings.filter((b) => ["confirmed", "paid", "pending"].includes(b.status)).length;

    const kpiCards = [
        { id: "fcl", label: "TEUs This Month", sub: "+4% vs last month", value: totalFCL, icon: Ship, tint: "bg-blue-50 text-blue-600", color: "#3b82f6", dataKey: "fcl" },
        { id: "lcl", label: "LCL in Transit (cbm)", sub: "6 groupage lanes", value: totalLCL, icon: Boxes, tint: "bg-indigo-50 text-indigo-600", color: "#6366f1", dataKey: "lcl" },
        { id: "air", label: "Air Booked (kg)", sub: "3 flights this week", value: totalAir, icon: Plane, tint: "bg-purple-50 text-purple-600", color: "#8b5cf6", dataKey: "air" },
        { id: "active", label: "Active Bookings", sub: `${bookings.length - activeBookings} cancelled`, value: activeBookings, icon: FileText, tint: "bg-emerald-50 text-emerald-600", color: "#10b981", dataKey: null },
    ];

    const pieData = [
        { name: "FCL", value: totalFCL },
        { name: "LCL", value: totalLCL },
        { name: "Air", value: totalAir },
    ];
    const pieColors = { FCL: "#3b82f6", LCL: "#0955AC", Air: "#8b5cf6" };

    const filteredRows = useMemo(() => {
        return bookings
            .filter((b) => matchesTab(b, activeTab))
            .filter((b) => {
                if (!q) return true;
                const text = `${b.code} ${b.item} ${b.hub}`.toLowerCase();
                return text.includes(q.toLowerCase());
            })
            .filter((b) => {
                if (startDate || endDate) {
                    const d = new Date(b.from);
                    if (startDate && d < new Date(startDate)) return false;
                    if (endDate && d > new Date(endDate)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                if (sort === "amount") return b.amount - a.amount;
                if (sort === "oldest") return new Date(a.from) - new Date(b.from);
                return new Date(b.from) - new Date(a.from);
            });
    }, [activeTab, q, startDate, endDate, sort]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    useEffect(() => setPage(1), [activeTab, q, sort, startDate, endDate]);
    useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
    const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

    const upcoming = useMemo(() => bookings.filter((r) => ["confirmed", "paid", "pending"].includes(r.status)), []);

    const handleClearFilters = () => {
        setQ("");
        setActiveTab("all");
        setSort("recent");
        setStartDate("");
        setEndDate("");
    };

    const handleRefresh = () => window.location.reload();

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
            { key: "Mode", label: "Mode", width: 60 },
            { key: "Service", label: "Service", width: 220 },
            { key: "From", label: "From", width: 110 },
            { key: "To", label: "To", width: 110 },
            { key: "Hub", label: "Hub", width: 120 },
            { key: "Status", label: "Status", width: 80 },
            { key: "Amount", label: "Amount", width: 70 },
            { key: "Currency", label: "Currency", width: 60 },
            { key: "Reference", label: "Reference", width: 120 },
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
        const rows = filteredRows.map((booking) => ({
            Mode: (booking.mode || "").toUpperCase(),
            Service: booking.item || "",
            From: formatExportDate(booking.from),
            To: formatExportDate(booking.to),
            Hub: booking.hub || "",
            Status: booking.status || "",
            Amount: Number(booking.amount || 0).toFixed(2),
            Currency: "LKR",
            Reference: booking.code || "",
        }));

        const dateStamp = new Date().toISOString().split("T")[0];
        const baseName = `freight-bookings-${dateStamp}`;

        if (format === "PDF") downloadPdf(rows, `${baseName}.pdf`);
        else if (format === "Excel") downloadCsv(rows, `${baseName}.xlsx`);
        else downloadCsv(rows, `${baseName}.csv`);

        setShowExportModal(false);
    };

    const quickActionTiles = [
        { icon: Ship, label: "Book FCL", tint: "bg-blue-50 text-blue-600", onClick: () => (window.location.href = "/ffreight") },
        { icon: Boxes, label: "Book LCL", tint: "bg-indigo-50 text-indigo-600", onClick: () => (window.location.href = "/ffreight") },
        { icon: Plane, label: "Book Air", tint: "bg-purple-50 text-purple-600", onClick: () => (window.location.href = "/ffreight") },
        { icon: FileText, label: "View Bookings", tint: "bg-amber-50 text-amber-600", onClick: scrollToTable },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F4F6F9] poppins">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-[26px] font-[700] text-slate-900">
                            <span className="text-[#0955AC]">Freight Booking</span> Dashboard
                        </h1>
                        <p className="text-slate-500 text-[13px] mt-1">Plan, book and manage shipments across FCL, LCL &amp; Air</p>
                    </div>
                    <a
                        href="/ffreight"
                        className="inline-flex items-center h-11 px-5 rounded-xl bg-[#0955AC] text-white text-[14px] font-[600] hover:bg-[#0744a0] transition-colors shrink-0 self-start md:self-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Booking
                    </a>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
                    {kpiCards.map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${card.tint}`}>
                                    <card.icon className="w-[18px] h-[18px]" />
                                </span>
                                <p className="text-[19px] font-[700] text-slate-900 leading-tight truncate">{card.value.toLocaleString()}</p>
                                <p className="text-[11.5px] font-[600] text-slate-600 mt-0.5">{card.label}</p>
                                <p className="text-[10.5px] text-slate-400 truncate">{card.sub}</p>
                            </div>
                            {card.dataKey && <Sparkline data={recentTrend} dataKey={card.dataKey} color={card.color} id={card.id} />}
                        </div>
                    ))}
                </div>

                {/* Bookings table + right rail */}
                <div ref={tableRef} className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start mb-6">
                    <div className="space-y-4 min-w-0">
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
                                        placeholder="Search bookings, reference numbers..."
                                        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                    />
                                    {q && (
                                        <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`inline-flex items-center h-10 px-3.5 rounded-lg border text-[13px] font-medium transition-colors whitespace-nowrap ${
                                        showAdvancedFilters ? "bg-[#0955AC] text-white border-[#0955AC]" : "border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <Filter className="mr-1.5 h-4 w-4" /> Filters
                                </button>
                                <button onClick={() => setShowExportModal(true)} className="inline-flex items-center h-10 px-3.5 rounded-lg border border-slate-300 text-[13px] font-medium hover:bg-slate-50 whitespace-nowrap">
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
                                                        <option value="oldest">Oldest First</option>
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

                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                                <h3 className="text-[15px] font-[700] text-slate-800">My Bookings ({filteredRows.length})</h3>
                            </div>
                            {pagedRows.length === 0 ? (
                                <div className="px-4 py-16 text-center">
                                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-[14px] font-medium">No bookings found</p>
                                    <p className="text-slate-400 text-[12.5px] mt-1">Try adjusting your filters or request a new quote</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                                                <th className="px-4 py-2.5 font-[600]">Reference</th>
                                                <th className="px-2 py-2.5 font-[600]">Mode</th>
                                                <th className="px-2 py-2.5 font-[600]">Service</th>
                                                <th className="px-2 py-2.5 font-[600] hidden sm:table-cell">Hub</th>
                                                <th className="px-2 py-2.5 font-[600] hidden md:table-cell">Departure</th>
                                                <th className="px-2 py-2.5 font-[600]">Status</th>
                                                <th className="px-2 py-2.5 font-[600] text-right">Amount</th>
                                                <th className="px-4 py-2.5 font-[600] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedRows.map((r) => (
                                                <tr key={r.code} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-3 text-[12.5px] font-[600] text-slate-500 whitespace-nowrap">{r.code}</td>
                                                    <td className="px-2 py-3">
                                                        <span className="inline-flex w-8 h-8 rounded-lg bg-slate-50 items-center justify-center">
                                                            <ModeIcon mode={r.mode} className="w-4 h-4 text-[#0955AC]" />
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3">
                                                        <p className="text-[13px] font-[600] text-slate-800 truncate max-w-[220px]">{r.item}</p>
                                                    </td>
                                                    <td className="px-2 py-3 text-[12.5px] text-slate-500 hidden sm:table-cell truncate max-w-[140px]">{r.hub}</td>
                                                    <td className="px-2 py-3 text-[12.5px] text-slate-500 whitespace-nowrap hidden md:table-cell">{r.from}</td>
                                                    <td className="px-2 py-3">
                                                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusMap[r.status]?.tone || statusMap.pending.tone}`}>
                                                            {statusMap[r.status]?.label || r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 text-right whitespace-nowrap">
                                                        <span className="text-[13px] font-[700] text-[#0955AC]">LKR {Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end">
                                                            <button title="View details" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
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
                                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-[12.5px] text-slate-500 px-2">
                                            Page {page} of {totalPages}
                                        </span>
                                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right rail */}
                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[14px] font-[700] text-slate-800 mb-1">Upcoming Shipments</h3>
                            <p className="text-[11.5px] text-slate-400 mb-3.5">Next sailings and flights</p>
                            {upcoming.length === 0 ? (
                                <p className="text-[12.5px] text-slate-400 text-center py-6">No upcoming shipments.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcoming.map((r) => (
                                        <div key={r.code} className="rounded-xl border border-slate-200 p-3.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-700 min-w-0">
                                                    <ModeIcon mode={r.mode} className="h-4 w-4 shrink-0" />
                                                    <span className="font-[600] text-[12.5px] truncate">{r.item}</span>
                                                </div>
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap ${statusMap[r.status]?.tone}`}>{statusMap[r.status]?.label}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>
                                                    {r.from} → {r.to}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[11.5px] text-slate-400">Hub: {r.hub}</div>
                                            <div className="mt-2 text-[11.5px] text-slate-400">Ref: {r.code}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickActionTiles.map((a) => (
                                    <button key={a.label} onClick={a.onClick} className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-center">
                                        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${a.tint}`}>
                                            <a.icon className="w-4 h-4" />
                                        </span>
                                        <span className="text-[11.5px] font-[600] text-slate-700 leading-tight">{a.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Booking Trends</h3>
                        <p className="text-[12px] text-slate-400 mb-2">FCL • LCL • Air (year to date)</p>
                        {isMobile ? (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-xl">
                                    <span className="inline-flex items-center gap-2 text-blue-700 font-[600] text-[13px]"><Ship className="h-4 w-4" /> FCL</span>
                                    <span className="text-[15px] font-[700] text-blue-700">{totalFCL}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 bg-indigo-50 rounded-xl">
                                    <span className="inline-flex items-center gap-2 text-indigo-700 font-[600] text-[13px]"><Boxes className="h-4 w-4" /> LCL</span>
                                    <span className="text-[15px] font-[700] text-indigo-700">{totalLCL}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 bg-purple-50 rounded-xl">
                                    <span className="inline-flex items-center gap-2 text-purple-700 font-[600] text-[13px]"><Plane className="h-4 w-4" /> Air</span>
                                    <span className="text-[15px] font-[700] text-purple-700">{totalAir}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthly} margin={{ left: -20, right: 10, top: 10 }}>
                                        <defs>
                                            <linearGradient id="gFCL" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gLCL" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0955AC" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#0955AC" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gAirFreight" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                                        <YAxis tickLine={false} axisLine={false} fontSize={11} />
                                        <RTooltip />
                                        <Area type="monotone" dataKey="fcl" name="FCL" stroke="#3b82f6" fill="url(#gFCL)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="lcl" name="LCL" stroke="#0955AC" fill="url(#gLCL)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="air" name="Air" stroke="#8b5cf6" fill="url(#gAirFreight)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Category Mix</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Share of total volume</p>
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
                                <p className="text-[20px] font-[700] text-slate-900">{totalVolume.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-400">Total Volume</p>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {pieData.map((d) => (
                                <div key={d.name} className="flex items-center justify-between text-[12px]">
                                    <span className="flex items-center gap-2 text-slate-600">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[d.name] }} />
                                        {d.name}
                                    </span>
                                    <span className="font-[600] text-slate-700">
                                        {totalVolume > 0 ? Math.round((d.value / totalVolume) * 100) : 0}% ({d.value.toLocaleString()})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pb-2">© {new Date().getFullYear()} Freight Portal · FCL • LCL • Air</div>
            </div>

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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full">
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
