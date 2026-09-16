import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, router } from '@inertiajs/react';
import { route } from "ziggy-js";
import jsPDF from "jspdf";
import {
    launchPayHereOnsiteCheckout,
    launchPayHereRedirectCheckout,
    preloadPayHereOnsiteSdk,
} from "../../../courier/payhereCheckout";
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
    ChevronRight as ChevronRightIcon,
    CreditCard,
    Clock,
    Weight,
    Eye,
    RefreshCw,
    Info,
    X,
    File,
    Wallet,
    AlertCircle,
    PhoneCall,
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

// ---------- Helpers ----------
const ModeIcon = ({ mode, className }) => {
    if (mode === "document") return <FileText className={className} />;
    if (mode === "freight") return <Truck className={className} />;
    return <Package className={className} />; // parcel default
};

const statusMap = {
    pending: { label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    in_transit: { label: "In Transit", tone: "bg-blue-50 text-blue-700 border-blue-200" },
    delivered: { label: "Delivered", tone: "bg-green-50 text-green-700 border-green-200" },
    cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

const formatCodMethod = (method) => {
    if (!method) return "";
    return String(method).replaceAll("_", " ");
};

const formatCodAmount = (amount, currencyCode = "USD") => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return "";
    return `${numericAmount.toFixed(2)} ${currencyCode}`;
};

const formatAmountWithCurrency = (amount, currencyCode = "USD") => {
    const numericAmount = Number(amount);
    const currency = String(currencyCode || "USD").toUpperCase();

    if (!Number.isFinite(numericAmount)) return `0.00 ${currency}`;

    try {
        return new Intl.NumberFormat("en-LK", { style: "currency", currency, minimumFractionDigits: 2 }).format(numericAmount);
    } catch (error) {
        return `${numericAmount.toFixed(2)} ${currency}`;
    }
};

const buildMonthlyTrend = (rows, predicate) => {
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
            return predicate(r) ? sum + 1 : sum;
        }, 0);
        return { label, value };
    });
};

const Sparkline = ({ data, color, id }) => (
    <div className="hidden sm:block h-10 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`cspark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#cspark-${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const Hero = ({ shipments = [], statistics = {}, monthlyData = [], leftColumnSlot = null }) => {
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [sort, setSort] = useState("recent");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showExportModal, setShowExportModal] = useState(false);
    const [paymentCheckoutSessionByShipment, setPaymentCheckoutSessionByShipment] = useState({});
    const [paymentLaunchStateByShipment, setPaymentLaunchStateByShipment] = useState({});
    const [paymentErrorByShipment, setPaymentErrorByShipment] = useState({});
    const listRef = useRef(null);

    const scrollToList = () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const setShipmentPaymentError = (shipmentId, message) => {
        setPaymentErrorByShipment((previous) => ({ ...previous, [shipmentId]: message || "" }));
    };

    const setShipmentPaymentLaunching = (shipmentId, isLaunching) => {
        setPaymentLaunchStateByShipment((previous) => ({ ...previous, [shipmentId]: Boolean(isLaunching) }));
    };

    const handleContinuePayment = async (shipment) => {
        const shipmentId = shipment?.id;
        const checkoutUrl = shipment?.paymentCheckoutUrl;
        if (!shipmentId || !checkoutUrl) return;

        setShipmentPaymentError(shipmentId, "");
        setShipmentPaymentLaunching(shipmentId, true);

        try {
            preloadPayHereOnsiteSdk().catch(() => {});

            let checkoutSession = paymentCheckoutSessionByShipment[shipmentId];
            if (!checkoutSession?.checkout?.isReady) {
                const response = await fetch(checkoutUrl, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                });

                if (!response.ok) throw new Error("Unable to load checkout session.");

                const result = await response.json();
                if (!result?.checkout?.isReady) {
                    setShipmentPaymentError(shipmentId, result?.checkout?.reason || "Checkout is not ready right now. Please try again.");
                    return;
                }

                checkoutSession = result;
                setPaymentCheckoutSessionByShipment((previous) => ({ ...previous, [shipmentId]: result }));
            }

            await launchPayHereOnsiteCheckout(checkoutSession.checkout, {
                onCompleted: () => {
                    router.reload({ only: ["shipments", "statistics", "monthlyData"], preserveScroll: true });
                },
                onDismissed: () => {
                    setShipmentPaymentError(shipmentId, "Checkout was closed before completion. You can continue payment anytime.");
                },
                onError: () => {
                    setShipmentPaymentError(shipmentId, "PayHere reported an issue while starting onsite checkout.");
                },
            });
        } catch (error) {
            console.warn("[CourierDashboard] Onsite checkout unavailable. Falling back to checkout page.", error);
            try {
                const checkoutSession = paymentCheckoutSessionByShipment[shipmentId];
                if (checkoutSession?.checkout?.isReady) {
                    launchPayHereRedirectCheckout(checkoutSession.checkout);
                    return;
                }

                router.visit(checkoutUrl, { method: "get", preserveScroll: true });
            } catch (fallbackError) {
                setShipmentPaymentError(shipmentId, "Unable to start checkout right now. Please try again.");
            }
        } finally {
            setShipmentPaymentLaunching(shipmentId, false);
        }
    };

    // Calculate statistics from props or use defaults
    const stats = {
        document: statistics.document || 0,
        parcel: statistics.parcel || 0,
        freight: statistics.freight || 0,
        total: statistics.total || 0,
        confirmed: statistics.confirmed || 0,
        inTransit: statistics.inTransit || 0,
        delivered: statistics.delivered || 0,
        pending: statistics.pending || 0,
        cancelled: statistics.cancelled || 0,
    };

    const totalPackages = stats.document + stats.parcel + stats.freight;

    // Last 6 months of the 12-month series for a consistent "recent trend" chart
    const chartMonthlyData = useMemo(() => {
        const source =
            monthlyData && monthlyData.length > 0
                ? monthlyData
                : Array.from({ length: 12 }, (_, i) => ({
                      month: new Date(0, i).toLocaleString("default", { month: "short" }),
                      document: 0,
                      parcel: 0,
                      freight: 0,
                  }));
        return source.slice(-6);
    }, [monthlyData]);

    const pieData = useMemo(
        () =>
            [
                { name: "Document", value: stats.document },
                { name: "Parcel", value: stats.parcel },
                { name: "Freight", value: stats.freight },
            ].filter((item) => item.value > 0),
        [stats]
    );
    const pieColors = { Document: "#3b82f6", Parcel: "#0955AC", Freight: "#8b5cf6" };

    const totalTrend = useMemo(() => buildMonthlyTrend(shipments, () => true), [shipments]);
    const inTransitTrend = useMemo(() => buildMonthlyTrend(shipments, (s) => s.status === "in_transit"), [shipments]);
    const pendingTrend = useMemo(() => buildMonthlyTrend(shipments, (s) => s.status === "pending"), [shipments]);
    const deliveredTrend = useMemo(() => buildMonthlyTrend(shipments, (s) => s.status === "delivered"), [shipments]);
    const cancelledTrend = useMemo(() => buildMonthlyTrend(shipments, (s) => s.status === "cancelled"), [shipments]);

    const kpiCards = [
        { id: "total", label: "Total Shipments", sub: "Documents • Parcels • Freight", value: stats.total, icon: Package, tint: "bg-blue-50 text-blue-600", color: "#3b82f6", trend: totalTrend },
        { id: "transit", label: "In Transit", sub: "Shipments on the way", value: stats.inTransit, icon: Truck, tint: "bg-indigo-50 text-indigo-600", color: "#6366f1", trend: inTransitTrend },
        { id: "pending", label: "Pending", sub: "Awaiting pickup/payment", value: stats.pending, icon: Clock, tint: "bg-amber-50 text-amber-600", color: "#f59e0b", trend: pendingTrend },
        { id: "delivered", label: "Delivered", sub: "Successfully delivered", value: stats.delivered, icon: FileText, tint: "bg-emerald-50 text-emerald-600", color: "#10b981", trend: deliveredTrend },
        { id: "cancelled", label: "Cancelled", sub: "Cancelled shipments", value: stats.cancelled, icon: X, tint: "bg-rose-50 text-rose-600", color: "#f43f5e", trend: cancelledTrend },
    ];

    const typeOptions = useMemo(() => {
        const set = new Set();
        shipments.forEach((s) => {
            (s.packageTypes || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => set.add(t));
        });
        return Array.from(set);
    }, [shipments]);

    const paymentStatusOptions = useMemo(() => {
        const set = new Set();
        shipments.forEach((s) => {
            if (s.paymentStatus) set.add(s.paymentStatus);
        });
        return Array.from(set);
    }, [shipments]);

    const attentionItems = useMemo(() => {
        const paymentNeeded = shipments.filter((s) => s.requiresCardPayment && s.paymentStatus !== "paid").length;
        const awaitingPickup = shipments.filter((s) => s.status === "pending").length;
        return [
            { key: "payment", label: "Payment required", count: paymentNeeded, icon: CreditCard, tone: "text-rose-600 bg-rose-50" },
            { key: "pickup", label: "Awaiting pickup", count: awaitingPickup, icon: Clock, tone: "text-amber-600 bg-amber-50" },
        ].filter((i) => i.count > 0);
    }, [shipments]);

    // Filter and sort shipments
    const filteredShipments = useMemo(() => {
        let filtered = [...shipments];

        if (q) {
            const query = q.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.code?.toLowerCase().includes(query) ||
                    s.from?.city?.toLowerCase().includes(query) ||
                    s.to?.city?.toLowerCase().includes(query) ||
                    s.from?.full?.toLowerCase().includes(query) ||
                    s.to?.full?.toLowerCase().includes(query) ||
                    s.packageTypes?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "all") filtered = filtered.filter((s) => s.status === statusFilter);
        if (typeFilter !== "all") filtered = filtered.filter((s) => (s.packageTypes || "").includes(typeFilter));
        if (paymentFilter !== "all") filtered = filtered.filter((s) => s.paymentStatus === paymentFilter);

        if (startDate || endDate) {
            filtered = filtered.filter((s) => {
                const d = new Date(s.createdAt);
                if (Number.isNaN(d.getTime())) return true;
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            });
        }

        filtered.sort((a, b) => {
            if (sort === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
            if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
            if (sort === "cost") return (b.totalCost || 0) - (a.totalCost || 0);
            return 0;
        });

        return filtered;
    }, [shipments, q, statusFilter, typeFilter, paymentFilter, sort, startDate, endDate]);

    // Upcoming deliveries (confirmed or in transit)
    const upcoming = useMemo(() => filteredShipments.filter((s) => ["confirmed", "in_transit", "pending"].includes(s.status)).slice(0, 3), [filteredShipments]);

    const handleNewBooking = () => router.visit('/couriers/create');

    const handleClearFilters = () => {
        setQ("");
        setStatusFilter("all");
        setTypeFilter("all");
        setPaymentFilter("all");
        setSort("recent");
        setStartDate("");
        setEndDate("");
    };

    const handleExport = () => setShowExportModal(true);

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
            alert("No shipments to export for the selected filters.");
            return;
        }
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(","), ...rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(","))];
        downloadTextFile(`${csvLines.join("\n")}\n`, fileName, "text/csv;charset=utf-8;");
    };

    const downloadPdf = (rows, fileName) => {
        if (rows.length === 0) {
            alert("No shipments to export for the selected filters.");
            return;
        }

        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const margin = 36;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const lineHeight = 16;

        const columns = [
            { key: "Code", label: "Code", width: 120 },
            { key: "From", label: "From", width: 170 },
            { key: "To", label: "To", width: 170 },
            { key: "Status", label: "Status", width: 80 },
            { key: "Pickup", label: "Pickup", width: 90 },
            { key: "Packages", label: "Packages", width: 80 },
            { key: "Weight", label: "Weight", width: 80 },
            { key: "Cost", label: "Cost", width: 70 },
            { key: "Currency", label: "Currency", width: 60 },
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
        const rows = filteredShipments.map((shipment) => ({
            Code: shipment.code || shipment.id || "",
            From: shipment.from?.full || shipment.from?.city || "",
            To: shipment.to?.full || shipment.to?.city || "",
            Status: shipment.status || "",
            Pickup: formatExportDate(shipment.pickupDate),
            Packages: shipment.packages?.length ?? 0,
            Weight: Number(shipment.totalWeight || 0).toFixed(2),
            Cost: Number(shipment.displayAmount ?? shipment.totalCost ?? 0).toFixed(2),
            Currency: String(shipment.displayCurrency || shipment.currencyCode || "USD").toUpperCase(),
            CodEnabled: shipment.codEnabled ? "Yes" : "No",
            CodAmount: shipment.codEnabled ? formatCodAmount(shipment.codAmount, shipment.currencyCode || "LKR") : "",
            CodMethod: shipment.codEnabled ? formatCodMethod(shipment.codPaymentMethod) : "",
        }));

        const dateStamp = new Date().toISOString().split("T")[0];
        const baseName = `courier-shipments-${dateStamp}`;

        if (format === "PDF") downloadPdf(rows, `${baseName}.pdf`);
        else if (format === "Excel") downloadCsv(rows, `${baseName}.xlsx`);
        else downloadCsv(rows, `${baseName}.csv`);

        setShowExportModal(false);
    };

    const handleRefresh = () => window.location.reload();

    const handleViewShipment = (id) => router.visit(`/courier-shipment/${id}`);

    const quickActionTiles = [
        { icon: Plus, label: "New Shipment", tint: "bg-blue-50 text-blue-600", onClick: handleNewBooking },
        { icon: Truck, label: "Track Shipments", tint: "bg-indigo-50 text-indigo-600", onClick: () => { setStatusFilter("in_transit"); scrollToList(); } },
        { icon: Wallet, label: "Payments", tint: "bg-teal-50 text-teal-600", onClick: () => router.visit(route("client.wallet.dashboard")) },
        { icon: FileText, label: "Invoices", tint: "bg-emerald-50 text-emerald-600", onClick: handleExport },
        { icon: Clock, label: "View History", tint: "bg-amber-50 text-amber-600", onClick: () => { setStatusFilter("delivered"); scrollToList(); } },
        { icon: PhoneCall, label: "Contact Support", tint: "bg-rose-50 text-rose-600", onClick: () => (window.location.href = "mailto:support@transport-jaan.com") },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F4F6F9] poppins">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl md:text-[26px] font-[700] text-slate-900">
                            <span className="text-[#0955AC]">Courier Booking</span> Dashboard
                        </h1>
                        <p className="text-slate-500 text-[13px] mt-1">Manage and track your courier shipments — Documents • Parcels • Freight</p>
                    </div>
                    <button
                        onClick={handleNewBooking}
                        className="inline-flex items-center h-11 px-5 rounded-xl bg-[#0955AC] text-white text-[14px] font-[600] hover:bg-[#0744a0] transition-colors shrink-0 self-start md:self-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Booking
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-5">
                    {kpiCards.map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${card.tint}`}>
                                    <card.icon className="w-[18px] h-[18px]" />
                                </span>
                                <p className="text-[19px] font-[700] text-slate-900 leading-tight truncate">{card.value}</p>
                                <p className="text-[11.5px] font-[600] text-slate-600 mt-0.5">{card.label}</p>
                                <p className="text-[10.5px] text-slate-400 truncate">{card.sub}</p>
                            </div>
                            <Sparkline data={card.trend} color={card.color} id={card.id} />
                        </div>
                    ))}
                </div>

                {/* Search & Filters */}
                <div ref={listRef} className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search shipments, locations, tracking ID..."
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
                        <button onClick={handleExport} className="inline-flex items-center h-10 px-3.5 rounded-lg border border-slate-300 text-[13px] font-medium hover:bg-slate-50 whitespace-nowrap">
                            <Download className="mr-1.5 h-4 w-4" /> Export
                        </button>
                        <button onClick={handleRefresh} className="inline-flex items-center h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showAdvancedFilters && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-3.5 mt-3.5 border-t border-slate-100">
                                    <div>
                                        <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in_transit">In Transit</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Shipment Type</label>
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                        >
                                            <option value="all">All Types</option>
                                            {typeOptions.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Payment Status</label>
                                        <select
                                            value={paymentFilter}
                                            onChange={(e) => setPaymentFilter(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                        >
                                            <option value="all">All Payments</option>
                                            {paymentStatusOptions.map((p) => (
                                                <option key={p} value={p}>
                                                    {p.replaceAll("_", " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Sort By</label>
                                        <select
                                            value={sort}
                                            onChange={(e) => setSort(e.target.value)}
                                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                        >
                                            <option value="recent">Most Recent</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="cost">Highest Cost</option>
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
                                    <div className="flex items-end">
                                        <button onClick={handleClearFilters} className="h-9 w-full inline-flex items-center justify-center gap-2 px-3 rounded-lg border border-slate-300 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50">
                                            <X className="h-3.5 w-3.5" /> Clear
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[11.5px] text-slate-500">
                                    <Info className="h-3.5 w-3.5" />
                                    <span>Showing {filteredShipments.length} of {shipments.length} shipments</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Shipments & Upcoming */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[15px] font-[700] text-slate-800">Your Shipments ({filteredShipments.length})</h2>
                        </div>

                        {filteredShipments.length > 0 ? (
                            <div className="space-y-4">
                                {filteredShipments.map((shipment) => (
                                    <motion.div key={shipment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                                        <div className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="px-5 sm:px-6 pt-5 pb-4">
                                                <div className="flex items-start justify-between gap-3 mb-3.5">
                                                    <div className="flex items-start gap-2.5">
                                                        <span className="w-9 h-9 rounded-lg bg-[#EAF1FE] flex items-center justify-center shrink-0">
                                                            <ModeIcon mode={shipment.packageTypes?.toLowerCase().includes("document") ? "document" : shipment.packageTypes?.toLowerCase().includes("freight") ? "freight" : "parcel"} className="w-4 h-4 text-[#0955AC]" />
                                                        </span>
                                                        <div>
                                                            <h3 className="text-[15px] font-[700] text-slate-900 leading-tight">{shipment.code}</h3>
                                                            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                                {shipment.from?.full || "N/A"} → {shipment.to?.full || "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${statusMap[shipment.status]?.tone || "bg-slate-50 text-slate-700"}`}>
                                                        {statusMap[shipment.status]?.label || shipment.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3.5 text-[12.5px]">
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Package className="h-3.5 w-3.5" />
                                                        <span>{shipment.packages?.length || 0} pkg(s)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Weight className="h-3.5 w-3.5" />
                                                        <span>{Number(shipment.totalWeight || 0).toFixed(2)} kg</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>{shipment.pickupDate || "Not scheduled"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-[700]">
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        <span>{formatAmountWithCurrency(shipment.displayAmount ?? shipment.totalCost, shipment.displayCurrency || shipment.currencyCode || "USD")}</span>
                                                    </div>
                                                </div>

                                                {shipment.latestTracking && (
                                                    <div className="mb-3.5 text-[12px] text-slate-500 flex items-center gap-1.5">
                                                        <Truck className="h-3.5 w-3.5" />
                                                        Latest update: {shipment.latestTracking.description || shipment.latestTracking.status}
                                                        {shipment.latestTracking.location ? ` • ${shipment.latestTracking.location}` : ""}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {shipment.serviceLevel && (
                                                        <span className="text-[11px] text-slate-500 bg-slate-50 rounded-full px-2.5 py-1">Service: {shipment.serviceLevel}</span>
                                                    )}
                                                    {shipment.paymentStatus && (
                                                        <span className={`text-[11px] rounded-full px-2.5 py-1 font-[600] capitalize ${shipment.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                                            Payment: {shipment.paymentStatusLabel || shipment.paymentStatus}
                                                        </span>
                                                    )}
                                                    {shipment.codEnabled && (
                                                        <span className="inline-flex flex-wrap items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-[600] text-emerald-700">
                                                            COD
                                                            {shipment.codAmount !== null && shipment.codAmount !== undefined && <span>• {formatCodAmount(shipment.codAmount, shipment.currencyCode || "LKR")}</span>}
                                                            {shipment.codPaymentMethod && <span className="capitalize">• {formatCodMethod(shipment.codPaymentMethod)}</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="px-5 sm:px-6 pb-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                                                <div className="text-[11.5px] text-slate-400">Created: {new Date(shipment.createdAt).toLocaleDateString()}</div>
                                                <div className="flex items-center gap-2">
                                                    {shipment.requiresCardPayment && shipment.paymentStatus !== "paid" && shipment.paymentCheckoutUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleContinuePayment(shipment)}
                                                            disabled={Boolean(paymentLaunchStateByShipment[shipment.id])}
                                                            className="h-9 px-3.5 rounded-lg border border-[#0955AC] text-[#0955AC] text-[12.5px] font-[600] hover:bg-[#EAF2FD] inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <CreditCard className="h-3.5 w-3.5" />
                                                            {Boolean(paymentLaunchStateByShipment[shipment.id]) ? "Opening..." : shipment.paymentStatus === "pending" ? "Continue Payment" : "Pay Now"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleViewShipment(shipment.id)}
                                                        className="h-9 px-3.5 rounded-lg bg-[#0955AC] text-white text-[12.5px] font-[600] hover:bg-[#0744a0] inline-flex items-center gap-1.5"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                            {paymentErrorByShipment[shipment.id] && <div className="px-5 sm:px-6 pb-4 text-[12px] font-medium text-rose-600">{paymentErrorByShipment[shipment.id]}</div>}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border-dashed border-2 border-slate-200 bg-white">
                                <div className="px-4 py-16 text-center text-slate-500">
                                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-[15px] font-[600] mb-1">No shipments found</p>
                                    <p className="text-[13px] mb-4">{q || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first courier booking to get started"}</p>
                                    {!q && statusFilter === "all" && (
                                        <button onClick={handleNewBooking} className="mt-2 px-6 py-2 rounded-xl bg-[#0955AC] text-white hover:bg-[#0744a0]">
                                            Create Booking
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {leftColumnSlot && <div className="mt-6">{leftColumnSlot}</div>}
                    </div>

                    {/* Sidebar: Upcoming + Attention + Quick Actions */}
                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <h3 className="text-[14px] font-[700] text-slate-800 mb-1">Upcoming Deliveries</h3>
                            <p className="text-[11.5px] text-slate-400 mb-3.5">Active shipments</p>
                            {upcoming.length > 0 ? (
                                <div className="space-y-3">
                                    {upcoming.map((shipment) => (
                                        <div key={shipment.id} className="rounded-xl border border-slate-200 p-3.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-slate-700 min-w-0">
                                                    <Package className="h-4 w-4 shrink-0" />
                                                    <span className="font-[600] text-[12.5px] truncate">
                                                        {shipment.from?.city || "N/A"} → {shipment.to?.city || "N/A"}
                                                    </span>
                                                </div>
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap ${statusMap[shipment.status]?.tone}`}>{statusMap[shipment.status]?.label}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{shipment.pickupDate || "TBD"}</span>
                                            </div>
                                            <div className="mt-1 text-[12px] font-[700] text-slate-800">
                                                {formatAmountWithCurrency(shipment.displayAmount ?? shipment.totalCost, shipment.displayCurrency || shipment.currencyCode || "USD")}
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[11.5px]">
                                                <span className="text-slate-400">Ref: {shipment.code}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {shipment.requiresCardPayment && shipment.paymentStatus !== "paid" && shipment.paymentCheckoutUrl && (
                                                        <Link href={shipment.paymentCheckoutUrl} className="h-7 px-2.5 rounded-lg border border-[#0955AC] text-[#0955AC] hover:bg-[#EAF2FD] text-[11.5px] font-[600] inline-flex items-center">
                                                            Pay
                                                        </Link>
                                                    )}
                                                    <button onClick={() => handleViewShipment(shipment.id)} className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11.5px] font-[600]">
                                                        View
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12.5px] text-slate-400 text-center py-6">No active shipments</p>
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

                        {attentionItems.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Attention Required</h3>
                                <div className="space-y-1">
                                    {attentionItems.map((item) => (
                                        <button key={item.key} onClick={scrollToList} className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 text-left transition-colors">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.tone}`}>
                                                <item.icon className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-[12.5px] font-[600] text-slate-700">{item.label}</span>
                                            <span className="text-[11px] font-[700] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 mb-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Booking Trends</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Documents • Parcels • Freight (last 6 months)</p>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartMonthlyData} margin={{ left: -20, right: 10, top: 10 }}>
                                    <defs>
                                        <linearGradient id="gDoc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="gParcel" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0955AC" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#0955AC" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="gFreight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                                    <RTooltip />
                                    <Area type="monotone" dataKey="document" name="Document" stroke="#3b82f6" fill="url(#gDoc)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="parcel" name="Parcel" stroke="#0955AC" fill="url(#gParcel)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="freight" name="Freight" stroke="#8b5cf6" fill="url(#gFreight)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Category Mix</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Share of total packages</p>
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
                                <p className="text-[20px] font-[700] text-slate-900">{totalPackages}</p>
                                <p className="text-[10px] text-slate-400">Total Packages</p>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {pieData.length === 0 ? (
                                <p className="text-[12px] text-slate-400 text-center">No packages yet.</p>
                            ) : (
                                pieData.map((d) => (
                                    <div key={d.name} className="flex items-center justify-between text-[12px]">
                                        <span className="flex items-center gap-2 text-slate-600">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[d.name] }} />
                                            {d.name}
                                        </span>
                                        <span className="font-[600] text-slate-700">
                                            {totalPackages > 0 ? Math.round((d.value / totalPackages) * 100) : 0}% ({d.value})
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
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
                                    <h2 className="text-[18px] font-semibold text-slate-900">Export Shipments</h2>
                                    <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="px-6 py-4">
                                    <p className="text-[14px] text-slate-600 mb-4">Export all {filteredShipments.length} filtered shipments</p>

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

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pb-2">© {new Date().getFullYear()} Courier Portal · Manage your shipments with ease</div>
            </div>
        </div>
    );
};

export default Hero;
