import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Package,
    FileText,
    Truck,
    Calendar,
    MapPin,
    Search,
    Filter,
    Plus,
    Download,
    ChevronRight,
    Star,
    CreditCard,
    Clock,
    ShieldCheck,
    Weight,
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

// ---------- Mock Data (Courier Bookings) ----------
const monthly = [
    { month: "Jan", document: 180, parcel: 320, freight: 60 },
    { month: "Feb", document: 170, parcel: 340, freight: 70 },
    { month: "Mar", document: 210, parcel: 360, freight: 85 },
    { month: "Apr", document: 220, parcel: 380, freight: 90 },
    { month: "May", document: 240, parcel: 400, freight: 95 },
    { month: "Jun", document: 230, parcel: 420, freight: 100 },
    { month: "Jul", document: 260, parcel: 450, freight: 110 },
    { month: "Aug", document: 270, parcel: 460, freight: 120 },
    { month: "Sep", document: 250, parcel: 430, freight: 105 },
    { month: "Oct", document: 240, parcel: 410, freight: 100 },
    { month: "Nov", document: 230, parcel: 395, freight: 95 },
    { month: "Dec", document: 220, parcel: 380, freight: 90 },
];

const services = {
    document: [
        {
            id: "D-001",
            name: "Same‑day: Colombo → Kandy",
            rating: 4.9,
            origin: "Colombo",
            price: 3.5,
            unit: "doc",
        },
        {
            id: "D-002",
            name: "Express: Colombo → Galle",
            rating: 4.6,
            origin: "Colombo",
            price: 3.0,
            unit: "doc",
        },
        {
            id: "D-003",
            name: "Overnight: Kandy → Colombo",
            rating: 4.7,
            origin: "Kandy",
            price: 2.8,
            unit: "doc",
        },
    ],
    parcel: [
        {
            id: "P-101",
            name: "Parcel: Colombo → Jaffna",
            rating: 4.5,
            origin: "Colombo",
            price: 1.2,
            unit: "kg",
        },
        {
            id: "P-102",
            name: "Parcel: Colombo → Trincomalee",
            rating: 4.4,
            origin: "Colombo",
            price: 1.1,
            unit: "kg",
        },
        {
            id: "P-103",
            name: "Parcel: Galle → Colombo",
            rating: 4.6,
            origin: "Galle",
            price: 1.0,
            unit: "kg",
        },
    ],
    freight: [
        {
            id: "F-501",
            name: "Freight: Colombo ⇄ BIA Warehouse",
            rating: 4.3,
            origin: "Colombo",
            price: 55,
            unit: "cbm",
        },
        {
            id: "F-502",
            name: "Freight: Colombo → Batticaloa",
            rating: 4.2,
            origin: "Colombo",
            price: 48,
            unit: "cbm",
        },
    ],
};

const bookings = [
    {
        code: "CB-202508-001",
        mode: "document",
        item: "Same‑day: Colombo → Kandy",
        from: "2025-08-29 09:00",
        to: "2025-08-29 15:00",
        hub: "Colombo City Hub",
        status: "confirmed",
        amount: 7.0,
    },
    {
        code: "CB-202508-002",
        mode: "parcel",
        item: "Parcel: Colombo → Jaffna (3kg)",
        from: "2025-08-30 17:30",
        to: "2025-09-01 08:00",
        hub: "Ratmalana Sort Center",
        status: "paid",
        amount: 3.6,
    },
    {
        code: "CB-202508-003",
        mode: "freight",
        item: "Freight: Colombo → Batticaloa (2 cbm)",
        from: "2025-09-02 08:00",
        to: "2025-09-03 20:00",
        hub: "Peliyagoda Logistics Park",
        status: "pending",
        amount: 96,
    },
    {
        code: "CB-202508-004",
        mode: "parcel",
        item: "Parcel: Galle → Colombo (1kg)",
        from: "2025-08-28 10:00",
        to: "2025-08-29 14:00",
        hub: "Galle Hub",
        status: "cancelled",
        amount: 1.0,
    },
];

// ---------- Helpers ----------
const ModeIcon = ({ mode, className }) => {
    if (mode === "document") return <FileText className={className} />;
    if (mode === "freight") return <Truck className={className} />;
    return <Package className={className} />; // parcel default
};

const statusMap = {
    confirmed: {
        label: "Confirmed",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    paid: { label: "Paid", tone: "bg-blue-50 text-blue-700 border-blue-200" },
    pending: {
        label: "Pending",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    cancelled: {
        label: "Cancelled",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
};

const pieData = [
    { name: "Document", value: monthly.reduce((a, b) => a + b.document, 0) },
    { name: "Parcel", value: monthly.reduce((a, b) => a + b.parcel, 0) },
    { name: "Freight", value: monthly.reduce((a, b) => a + b.freight, 0) },
];

const Hero = () => {
    const [mode, setMode] = useState("all");
    const [q, setQ] = useState("");
    const [origin, setOrigin] = useState("all");
    const [sort, setSort] = useState("popular");

    const filteredServices = useMemo(() => {
        const pool =
            mode === "all"
                ? [
                      ...services.document,
                      ...services.parcel,
                      ...services.freight,
                  ]
                : services[mode] ?? [];
        return pool
            .filter((s) => {
                const text = `${s.name} ${s.origin}`.toLowerCase();
                const okQ = q ? text.includes(q.toLowerCase()) : true;
                const okLoc = origin === "all" ? true : s.origin === origin;
                return okQ && okLoc;
            })
            .sort((a, b) => {
                if (sort === "price") return a.price - b.price;
                if (sort === "rating") return b.rating - a.rating;
                return b.rating - a.rating; // popular ~ rating
            });
    }, [mode, q, origin, sort]);

    const origins = useMemo(() => {
        const set = new Set([
            "Colombo",
            "Kandy",
            "Galle",
            "Ratmalana",
            "Peliyagoda",
        ]);
        return ["all", ...Array.from(set)];
    }, []);

    const upcoming = bookings.filter((r) =>
        ["confirmed", "paid", "pending"].includes(r.status)
    );

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC] md:p-20 poppins">
            <div className="mx-auto max-w-[1300px]">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold tracking-tight md:text-[35px]">
                            <span className="text-[#0955AC]">
                                Courier Booking
                            </span>{" "}
                            Dashboard
                        </h1>
                        <p className="text-slate-600 text-[14px]">
                            Book and manage deliveries for Documents • Parcels •
                            Freight.
                        </p>
                    </div>
                    <div className="flex gap-2 justify-center items-center">
                        <button className="inline-flex items-center h-10 px-6 py-6 rounded-2xl border border-slate-200 text-[16px] font-medium">
                            <Download className="mr-2 h-7 w-7" /> Export
                        </button>
                        <button className="inline-flex items-center h-10 px-6 py-6 rounded-2xl bg-[#0955AC] text-white text-[16px] font-medium">
                            <Plus className="mr-2 h-6 w-6" /> New Booking
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="bg-white rounded-2xl shadow-sm">
                        <div className="px-5 pt-5 pb-2">
                            <p className="flex items-center gap-3 text-[#7B7B7A] text-[16px] font-[700]">
                                <FileText className="h-8 w-8" /> Docs Today
                            </p>
                            <h3 className="text-[26px] font-[700] text-[#0955AC]">
                                86
                            </h3>
                        </div>
                        <div className="px-5 pb-5 text-[12px] text-[#7B7B7A]">
                            +12 vs yesterday
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm">
                        <div className="px-5 pt-5 pb-2">
                            <p className="flex items-center gap-3 text-[#7B7B7A] text-[16px] font-[700]">
                                <Package className="h-8 w-8" /> Parcels In
                                Transit
                            </p>
                            <h3 className="text-[26px] font-[700] text-[#0955AC]">
                                312
                            </h3>
                        </div>
                        <div className="px-5 pb-5 text-[12px] text-[#7B7B7A]">
                            15 hubs active
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm">
                        <div className="px-5 pt-5 pb-2">
                            <p className="flex items-center gap-3 text-[#7B7B7A] text-[16px] font-[700]">
                                <Truck className="h-8 w-8" /> Freight This Month
                            </p>
                            <h3 className="text-[26px] font-[700] text-[#0955AC]">
                                1,030 cbm
                            </h3>
                        </div>
                        <div className="px-5 pb-5 text-[12px] text-[#7B7B7A]">
                            +8% vs last month
                        </div>
                    </div>
                </div>

                {/* Top Row: Filters + Charts */}
                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Area chart card */}
                    <div className="lg:col-span-2 bg-white rounded-[10px] shadow-sm">
                        <div className="px-10 pt-10 pb-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold leading-none tracking-tight text-[16px]">
                                        Bookings by Month
                                    </h3>
                                    <p className="text-[14px] text-slate-500 pt-1">
                                        Documents • Parcels • Freight (year to
                                        date)
                                    </p>
                                </div>
                                <button className="inline-flex items-center h-10 px-3 rounded-xl border border-slate-200 text-[12px] font-[600] hover:bg-slate-100">
                                    <Filter className="mr-2 h-4 w-4" /> View
                                </button>
                            </div>
                        </div>
                        <div className="px-10 pb-10 pt-10">
                            <div
                                className="h-[350px] w-full focus:outline-none"
                                style={{
                                    WebkitTapHighlightColor: "transparent",
                                    outline: "none",
                                }}
                            >
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    className="focus:outline-none"
                                    tabIndex={-1}
                                    style={{
                                        WebkitTapHighlightColor: "transparent",
                                        outline: "none",
                                    }}
                                >
                                    <AreaChart
                                        data={monthly}
                                        margin={{ left: 8, right: 8, top: 10 }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id="gDoc"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor="#3b82f6"
                                                    stopOpacity={0.35}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="#3b82f6"
                                                    stopOpacity={0.02}
                                                />
                                            </linearGradient>
                                            <linearGradient
                                                id="gParcel"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor="#0955AC"
                                                    stopOpacity={0.35}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="#0955AC"
                                                    stopOpacity={0.02}
                                                />
                                            </linearGradient>
                                            <linearGradient
                                                id="gFreight"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor="#6366f1"
                                                    stopOpacity={0.35}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="#6366f1"
                                                    stopOpacity={0.02}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            vertical={false}
                                            horizontal={true}
                                        />
                                        <XAxis
                                            dataKey="month"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RTooltip />
                                        <Area
                                            type="monotone"
                                            dataKey="document"
                                            name="Document"
                                            stroke="#3b82f6"
                                            fill="url(#gDoc)"
                                            strokeWidth={4}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="parcel"
                                            name="Parcel"
                                            stroke="#0955AC"
                                            fill="url(#gParcel)"
                                            strokeWidth={4}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="freight"
                                            name="Freight"
                                            stroke="#6366f1"
                                            fill="url(#gFreight)"
                                            strokeWidth={4}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Pie card */}
                    <div className="bg-white rounded-2xl shadow-sm">
                        <div className="px-10 pt-10">
                            <h3 className="font-semibold leading-none tracking-tight text-[16px]">
                                Category Mix
                            </h3>
                            <p className="text-[14px] text-slate-500 mt-1">
                                Share of total bookings
                            </p>
                        </div>
                        <div className="px-10 pb-10">
                            <div
                                className="h-[350px] w-full"
                                style={{
                                    WebkitTapHighlightColor: "transparent",
                                    outline: "none",
                                }}
                            >
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    className="focus:outline-none"
                                    tabIndex={-1}
                                    style={{
                                        WebkitTapHighlightColor: "transparent",
                                        outline: "none",
                                    }}
                                >
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={90}
                                            outerRadius={140}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="name"
                                            cornerRadius={8}
                                        >
                                            {pieData.map((_, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={
                                                        [
                                                            "#3b82f6",
                                                            "#0955AC",
                                                            "#6366f1",
                                                        ][i]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <RTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-4 text-[14px] text-slate-600">
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-[#3b82f6]" />{" "}
                                    Document
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-[#0955AC]" />{" "}
                                    Parcel
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-indigo-500" />{" "}
                                    Freight
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="mb-8 rounded-2xl">
                    <div className="px-4 pb-4 pt-6">
                        <div className="grid items-center gap-3 md:grid-cols-2 lg:grid-cols-4 font-[600]">
                            {/* Search */}
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search routes, hubs…"
                                    className="h-12 w-full rounded-[10px] border border-slate-300 bg-white pl-9 px-3 text-[14px] placeholder:text-slate-400 focus:outline-none"
                                />
                            </div>

                            {/* Mode select */}
                            <div>
                                <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value)}
                                    className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[14px] focus:outline-none"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="document">Document</option>
                                    <option value="parcel">Parcel</option>
                                    <option value="freight">Freight</option>
                                </select>
                            </div>

                            {/* Origin select */}
                            <div>
                                <select
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[14px] focus:outline-none"
                                >
                                    {origins.map((o) => (
                                        <option key={o} value={o}>
                                            {o === "all" ? "All Origins" : o}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort select */}
                            <div>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[14px] focus:outline-none"
                                >
                                    <option value="popular">
                                        Most Popular
                                    </option>
                                    <option value="price">Price (Asc)</option>
                                    <option value="rating">
                                        Rating (Desc)
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Services & Upcoming */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[20px] font-[600]">
                                Available Services
                            </h2>

                            {/* Tabs */}
                            <div className="hidden sm:block">
                                <div className="rounded-2xl inline-flex gap-2">
                                    {[
                                        {
                                            val: "all",
                                            label: "All",
                                            icon: null,
                                        },
                                        {
                                            val: "document",
                                            label: "Document",
                                            icon: FileText,
                                        },
                                        {
                                            val: "parcel",
                                            label: "Parcel",
                                            icon: Package,
                                        },
                                        {
                                            val: "freight",
                                            label: "Freight",
                                            icon: Truck,
                                        },
                                    ].map(({ val, label, icon: Icon }) => {
                                        const active =
                                            mode === val ||
                                            (val === "all" && mode === "all");
                                        return (
                                            <button
                                                key={val}
                                                onClick={() => setMode(val)}
                                                className={`px-8 py-2 rounded-xl border text-[12px] font-[600] transition ${
                                                    active
                                                        ? "bg-[#0955AC] text-white border-[#0955AC]"
                                                        : "border-slate-200 hover:bg-slate-100"
                                                }`}
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    {Icon ? (
                                                        <Icon className="h-8 w-8" />
                                                    ) : null}
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Service grid */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {filteredServices.map((s) => (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <div className="group rounded-2xl bg-white border border-slate-200 shadow-sm">
                                        <div className="px-10 pt-10 pb-5">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-[18px] font-semibold leading-none tracking-tight">
                                                        {s.name}
                                                    </h3>
                                                    <p className="mt-1 flex items-center gap-2 text-[12px] text-slate-500">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {s.origin}
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold bg-slate-50 text-slate-700">
                                                    <Star className="mr-1 h-4 w-4" />
                                                    {s.rating}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="px-10 pb-10 flex items-end justify-between gap-2">
                                            <div className="text-[14px] text-slate-600">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <CreditCard className="h-4 w-4" />
                                                    <span className="font-medium">
                                                        {s.unit === "kg" ||
                                                        s.unit === "cbm"
                                                            ? `${s.price}/${s.unit}`
                                                            : `LKR ${s.price}`}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-slate-500">
                                                    <ShieldCheck className="h-4 w-4" />{" "}
                                                    Insurance available
                                                </div>
                                            </div>
                                            <button className="h-10 px-4 rounded-xl bg-[#0955AC] text-white text-[14px] font-medium hover:bg-[#0955AC]">
                                                Book{" "}
                                                <ChevronRight className="ml-1 h-4 w-4 inline-block" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {filteredServices.length === 0 && (
                                <div className="rounded-2xl border-dashed border border-slate-200 bg-white">
                                    <div className="px-4 py-10 text-center text-slate-500">
                                        No results. Try changing filters.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Upcoming + Quick Actions */}
                    <div className="space-y-4">
                        {/* Upcoming */}
                        <div className="rounded-2xl bg-white shadow-sm">
                            <div className="px-10 pt-10 pb-5">
                                <h3 className="font-semibold leading-none tracking-tight text-[18px]">
                                    Upcoming Deliveries
                                </h3>
                                <p className="text-[14px] text-slate-500 mt-1">
                                    Next pickups & drop‑offs
                                </p>
                            </div>
                            <div className="px-10 pb-10 space-y-6 text-[14px]">
                                {upcoming.map((r) => (
                                    <div
                                        key={r.code}
                                        className="rounded-2xl border p-5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <ModeIcon
                                                    mode={r.mode}
                                                    className="h-7 w-7"
                                                />
                                                <span className="font-medium">
                                                    {r.item}
                                                </span>
                                            </div>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                                    statusMap[r.status].tone
                                                }`}
                                            >
                                                {statusMap[r.status].label}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-600">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {r.from} → {r.to}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-sm text-slate-500">
                                            Hub: {r.hub}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-[12px]">
                                            <span className="text-slate-500">
                                                Ref: {r.code}
                                            </span>
                                            <button className="h-8 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm">
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div className="px-10 pt-10 pb-5">
                                <h3 className="font-semibold leading-none tracking-tight text-[18px]">
                                    Quick Actions
                                </h3>
                                <p className="text-[14px] text-slate-500 mt-1">
                                    Common tasks
                                </p>
                            </div>
                            <div className="px-10 pb-10 grid grid-cols-2 gap-2 font-[500]">
                                <button className="h-12 px-3 rounded-2xl border border-slate-200 text-left text-[12px] hover:bg-slate-100 inline-flex items-center">
                                    <Package className="mr-2 h-7 w-7" /> Create
                                    Parcel
                                </button>
                                <button className="h-12 px-3 rounded-2xl border border-slate-200 text-left text-[12px] hover:bg-slate-100 inline-flex items-center">
                                    <FileText className="mr-2 h-7 w-7" /> Send
                                    Document
                                </button>
                                <button className="h-12 px-3 rounded-2xl border border-slate-200 text-left text-[12px] hover:bg-slate-100 inline-flex items-center">
                                    <Truck className="mr-2 h-7 w-7" /> Book
                                    Freight
                                </button>
                                <button className="h-12 px-3 rounded-2xl border border-slate-200 text-left text-[12px] hover:bg-slate-100 inline-flex items-center">
                                    <Calendar className="mr-2 h-7 w-7" /> Change
                                    Dates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="mt-8 rounded-2xl bg-white shadow-sm">
                    <div className="px-10 pt-10 pb-5">
                        <h3 className="font-semibold leading-none tracking-tight text-[18px]">
                            Recent Activity
                        </h3>
                        <p className="text-[14px] text-slate-500 mt-1">
                            Latest courier bookings and updates
                        </p>
                    </div>
                    <div className="px-10 pb-10">
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto border-separate border-spacing-y-5 text-[14px]">
                                <thead>
                                    <tr className="text-left text-slate-500">
                                        <th className="px-3 py-2">Category</th>
                                        <th className="px-3 py-2">Service</th>
                                        <th className="px-3 py-2">Pickup</th>
                                        <th className="px-3 py-2">Drop‑off</th>
                                        <th className="px-3 py-2">Hub</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2 text-right">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((r) => (
                                        <tr
                                            key={r.code}
                                            className="rounded-xl bg-white shadow-sm"
                                        >
                                            <td className="px-3 py-3">
                                                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 text-slate-700">
                                                    <ModeIcon
                                                        mode={r.mode}
                                                        className="h-4 w-4"
                                                    />
                                                    {r.mode.toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 font-medium">
                                                {r.item}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600">
                                                {r.from}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600">
                                                {r.to}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600">
                                                {r.hub}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`rounded-full border px-2 py-0.5 text-xs ${
                                                        statusMap[r.status].tone
                                                    }`}
                                                >
                                                    {statusMap[r.status].label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-medium">
                                                {typeof r.amount === "number"
                                                    ? `LKR ${r.amount.toFixed(
                                                          2
                                                      )}`
                                                    : r.amount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} Courier Portal · Document •
                    Parcel • Freight
                </div>
            </div>
        </div>
    );
};

export default Hero;
