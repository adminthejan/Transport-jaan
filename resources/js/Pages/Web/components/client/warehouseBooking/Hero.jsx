import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
    AlertTriangle,
    BookmarkCheck,
    Building2,
    Calendar,
    ChevronRight,
    Clock,
    CreditCard,
    Download,
    FileText,
    Filter,
    Info,
    Link as LinkIcon,
    Loader2,
    MapPin,
    Plus,
    RefreshCcw,
    RefreshCw,
    Search,
    ShieldCheck,
    Snowflake,
    Star,
    TrendingUp,
    X,
    XCircle,
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

const statusStyles = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeStatus = (status) =>
    (status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fallbackImage =
    "https://placehold.co/640x400?text=Warehouse%20Preview";

const iconForType = (type) => {
    const value = (type || "").toLowerCase();
    if (value.includes("cold")) return Snowflake;
    if (value.includes("long")) return Building2;
    if (value.includes("short")) return TrendingUp;
    return Building2;
};

const formatCurrency = (amount, currency = "LKR") => {
    if (amount === null || amount === undefined) return "-";
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
        }).format(Number(amount));
    } catch (err) {
        return `${currency} ${Number(amount).toLocaleString()}`;
    }
};

const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
};

const formatDateTime = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
};

const formatDateRange = (start, end) => {
    if (!start && !end) return "TBC";
    if (!end) return `${formatDate(start)} → TBD`;
    return `${formatDate(start)} → ${formatDate(end)}`;
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
            const d = new Date(r.created_at);
            if (Number.isNaN(d.getTime()) || d.getFullYear() !== y || d.getMonth() !== m) return sum;
            return predicate(r) ? sum + valueFn(r) : sum;
        }, 0);
        return { label, value };
    });
};

const Sparkline = ({ data, color, id }) => (
    <div className="hidden sm:block h-9 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`wspark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#wspark-${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const Hero = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState(null);
    const [cancellationPreview, setCancellationPreview] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState(null);
    const [isViewCancellationModalOpen, setIsViewCancellationModalOpen] = useState(false);
    const [cancellationToView, setCancellationToView] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        location: "all",
        sort: "dateDesc",
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showExportModal, setShowExportModal] = useState(false);
    const [liked, setLiked] = useState(new Set());

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(
                route("client.warehouses.dashboard-data")
            );
            setDashboard(data);
        } catch (err) {
            if (err.response?.status === 401) {
                setError("Please sign in to manage your warehouses.");
            } else {
                setError("We couldn't load your warehouse dashboard. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (dashboard?.likedWarehouseIds) {
            setLiked(new Set(dashboard.likedWarehouseIds));
        }
    }, [dashboard]);

    const stats = dashboard?.stats ?? {};
    const recentActivity = dashboard?.recentActivity ?? [];
    const myBookings = dashboard?.recentActivity ?? []; // Use recent activity as bookings
    const wishlist = dashboard?.wishlist ?? [];
    const upcoming = dashboard?.upcoming ?? [];
    const billing = dashboard?.billing ?? {};
    const documents = dashboard?.documents ?? [];
    const filtersData = dashboard?.filters ?? {
        types: [],
        locations: [],
        amenities: [],
    };

    const priceOf = (warehouse) =>
        Number(warehouse.monthly_rate ?? warehouse.base_price ?? 0);

    const resolveWishlistUrl = () => {
        if (typeof route === "function") {
            try {
                return route("client.warehouse.like.toggle");
            } catch (error) {
                console.warn("Falling back to hardcoded wishlist URL", error);
            }
        }

        return "/api/warehouse/like-toggle";
    };

    const filteredBookings = useMemo(() => {
        return myBookings
            .filter((booking) => {
                if (filters.status === "all") return true;
                return (booking.status || "").toLowerCase() === filters.status.toLowerCase();
            })
            .filter((booking) => {
                if (filters.location === "all") return true;
                const warehouseCity = (booking.warehouse?.city || "").toLowerCase();
                return warehouseCity === filters.location.toLowerCase();
            })
            .filter((booking) => {
                if (!filters.search) return true;
                const haystack = `${booking.warehouse?.name || ""} ${booking.warehouse?.address || ""} ${booking.reference || ""}`.toLowerCase();
                return haystack.includes(filters.search.toLowerCase());
            })
            .sort((a, b) => {
                switch (filters.sort) {
                    case "priceAsc":
                        return (a.amount || 0) - (b.amount || 0);
                    case "priceDesc":
                        return (b.amount || 0) - (a.amount || 0);
                    case "dateAsc":
                        return new Date(a.start_date || 0) - new Date(b.start_date || 0);
                    case "dateDesc":
                    default:
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
            });
    }, [filters, myBookings]);

    const handleLikeToggle = async (warehouseId) => {
        try {
            const { data } = await axios.post(
                resolveWishlistUrl(),
                { warehouse_id: warehouseId }
            );

            if (Array.isArray(data.likedWarehouseIds)) {
                setLiked(new Set(data.likedWarehouseIds));
            } else {
                setLiked((prev) => {
                    const next = new Set(prev);
                    if (data.is_liked) {
                        next.add(warehouseId);
                    } else {
                        next.delete(warehouseId);
                    }
                    return next;
                });
            }

            setDashboard((prev) => {
                if (!prev) {
                    return prev;
                }

                const nextDashboard = {
                    ...prev,
                    stats: {
                        ...prev.stats,
                        likedWarehouses:
                            typeof data.likedCount === "number"
                                ? data.likedCount
                                : prev.stats?.likedWarehouses ?? 0,
                    },
                };

                if (Array.isArray(data.wishlist)) {
                    nextDashboard.wishlist = data.wishlist;
                }

                if (Array.isArray(data.likedWarehouseIds) && Array.isArray(prev.recommended)) {
                    const likedSet = new Set(data.likedWarehouseIds);
                    nextDashboard.recommended = prev.recommended.map((warehouse) => ({
                        ...warehouse,
                        is_liked: likedSet.has(warehouse.id),
                    }));
                }

                return nextDashboard;
            });
        } catch (err) {
            if (err.response?.status === 401) {
                router.visit(route("signin.signin"));
                return;
            }
            setError("Unable to update wishlist right now. Please retry.");
        }
    };

    const handleCancelClick = async (booking) => {
        setBookingToCancel(booking);
        setCancelModalOpen(true);
        setCancellationPreview(null);
        setCancelReason('');
        setCancelSuccess(null);

        // Fetch cancellation preview
        try {
            const { data } = await axios.get(`/warehouse-bookings/booking/${booking.id}/cancel-preview`);
            if (data.success) {
                setCancellationPreview(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch cancellation preview:', err);
        }
    };

    const handleViewCancellationClick = (booking) => {
        setCancellationToView(booking);
        setIsViewCancellationModalOpen(true);
    };

    const closeViewCancellationModal = () => {
        setIsViewCancellationModalOpen(false);
        setCancellationToView(null);
    };

    const handleConfirmCancel = async () => {
        if (!bookingToCancel) return;

        setCancelling(true);
        try {
            const { data } = await axios.post(`/warehouse-bookings/booking/${bookingToCancel.id}/cancel`, {
                reason: cancelReason || 'Customer requested cancellation'
            });

            if (data.success) {
                setCancelSuccess(data);
                // Refresh dashboard data
                setTimeout(() => {
                    fetchDashboard();
                    setCancelModalOpen(false);
                    setBookingToCancel(null);
                    setCancellationPreview(null);
                    setCancelReason('');
                    // Show success message briefly
                    setTimeout(() => setCancelSuccess(null), 5000);
                }, 2000);
            }
        } catch (err) {
            console.error('Cancellation failed:', err);
            alert(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    const handleViewDetails = (warehouse) => {
        router.visit("/warehouseDetails", {
            method: "get",
            data: {
                warehouse,
            },
            preserveState: true,
        });
    };

    const handleClearFilters = () => {
        setFilters({
            search: "",
            status: "all",
            location: "all",
            sort: "dateDesc",
        });
        setStartDate("");
        setEndDate("");
    };

    const formatExportDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toISOString().split("T")[0];
    };

    const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        if (/[",\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
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
        const csvLines = [
            headers.join(","),
            ...rows.map((row) =>
                headers.map((key) => escapeCsvValue(row[key])).join(",")
            ),
        ];
        downloadTextFile(
            `${csvLines.join("\n")}\n`,
            fileName,
            "text/csv;charset=utf-8;"
        );
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
            { key: "Warehouse", label: "Warehouse", width: 200 },
            { key: "City", label: "City", width: 90 },
            { key: "Status", label: "Status", width: 80 },
            { key: "Start", label: "Start", width: 90 },
            { key: "End", label: "End", width: 90 },
            { key: "Amount", label: "Amount", width: 70 },
            { key: "Currency", label: "Currency", width: 60 },
            { key: "Reference", label: "Reference", width: 120 },
            { key: "Booked", label: "Booked", width: 90 },
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
        const rows = filteredBookings.map((booking) => ({
            Warehouse: booking.warehouse?.name || "Warehouse",
            City: booking.warehouse?.city || "",
            Status: booking.status || "",
            Start: formatExportDate(booking.start_date),
            End: formatExportDate(booking.end_date),
            Amount: Number(booking.amount || 0).toFixed(2),
            Currency: "LKR",
            Reference: booking.reference || booking.id || "",
            Booked: formatExportDate(booking.created_at),
        }));

        const dateStamp = new Date().toISOString().split("T")[0];
        const baseName = `warehouse-bookings-${dateStamp}`;

        if (format.toLowerCase() === "pdf") {
            downloadPdf(rows, `${baseName}.pdf`);
        } else if (format.toLowerCase() === "excel") {
            downloadCsv(rows, `${baseName}.xlsx`);
        } else {
            downloadCsv(rows, `${baseName}.csv`);
        }

        setShowExportModal(false);
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const quickActions = [
        {
            label: "Browse Warehouses",
            description: "Discover approved space across the network",
            icon: Search,
            onClick: () => router.visit(route("warehouse.list")),
        },
        {
            label: "My Bookings",
            description: "Track, extend or cancel reservations",
            icon: BookmarkCheck,
            onClick: () => router.visit(route("warehouse-bookings.list")),
        },
        // {
        //     label: "Checkout",
        //     description: "Finish a draft warehouse reservation",
        //     icon: CreditCard,
        //     onClick: () => router.visit(route("warehouse-bookings.checkout")),
        // },
        // {
        //     label: "Payments",
        //     description: "Review invoices and payment options",
        //     icon: TrendingUp,
        //     onClick: () => router.visit(route("warehouse-bookings.payments")),
        // },
    ];

    const activeBookingsTrend = useMemo(
        () => buildMonthlyTrend(recentActivity, (r) => ["confirmed", "active", "paid", "pending"].includes(r.status)),
        [recentActivity]
    );
    const pendingPaymentsTrend = useMemo(
        () => buildMonthlyTrend(recentActivity, (r) => r.status === "pending"),
        [recentActivity]
    );
    const spendTrend = useMemo(
        () => buildMonthlyTrend(recentActivity, (r) => ["confirmed", "active", "paid", "completed"].includes(r.status), (r) => Number(r.amount || 0)),
        [recentActivity]
    );

    const statusDistribution = useMemo(() => {
        const counts = {};
        recentActivity.forEach((r) => {
            const key = normalizeStatus(r.status) || "Other";
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [recentActivity]);
    const statusColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b"];

    const statCards = [
        {
            key: "activeBookings",
            label: "Active bookings",
            value: stats.activeBookings ?? 0,
            helper: `${stats.upcomingMoveIns ?? 0} move-ins scheduled`,
            icon: BookmarkCheck,
            tint: "bg-blue-50 text-blue-600",
            color: "#3b82f6",
            trend: activeBookingsTrend,
        },
        {
            key: "pendingPayments",
            label: "Pending payments",
            value: stats.pendingPayments ?? 0,
            helper: "Requires attention",
            icon: Clock,
            tint: "bg-amber-50 text-amber-600",
            color: "#f59e0b",
            trend: pendingPaymentsTrend,
        },
        {
            key: "totalSpend",
            label: "Lifetime spend",
            value: formatCurrency(stats.totalSpend ?? 0),
            helper: `${stats.completedBookings ?? 0} completed reservations`,
            icon: CreditCard,
            tint: "bg-emerald-50 text-emerald-600",
            color: "#10b981",
            trend: spendTrend,
        },
        {
            key: "likedWarehouses",
            label: "Saved warehouses",
            value: stats.likedWarehouses ?? 0,
            helper: "Wishlist items",
            icon: Building2,
            tint: "bg-indigo-50 text-indigo-600",
            color: "#6366f1",
            trend: null,
        },
        {
            key: "expiringSoon",
            label: "Renewals due (30d)",
            value: stats.expiringSoon ?? 0,
            helper: "Prepare renewals & extensions",
            icon: Calendar,
            tint: "bg-rose-50 text-rose-600",
            color: "#f43f5e",
            trend: null,
        },
    ];

    const renderBookingCard = (booking) => {
        const warehouse = booking.warehouse || {};
        const Icon = iconForType(warehouse.type);
        const tone = statusStyles[booking.status] || "bg-slate-100 text-slate-700 border-slate-200";
        
        return (
            <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-[200px] w-full overflow-hidden bg-slate-100">
                        <img
                            src={warehouse.main_image || fallbackImage}
                            alt={warehouse.name || "Warehouse"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(event) => {
                                event.currentTarget.src = fallbackImage;
                            }}
                        />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                            <Icon className="h-4 w-4" />
                            {normalizeStatus(warehouse.type)}
                        </div>
                        <div className={`absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
                            {normalizeStatus(booking.status)}
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {warehouse.name || "Warehouse"}
                                </h3>
                                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <MapPin className="h-4 w-4" />
                                    {warehouse.city || warehouse.address || "N/A"}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                    Ref: #{booking.reference}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">
                                {formatCurrency(booking.amount || 0)}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDateRange(booking.start_date, booking.end_date)}
                            </span>
                        </div>

                        <div className="text-xs text-slate-500">
                            <div>Booked: {formatDateTime(booking.created_at)}</div>
                            {booking.company_name && (
                                <div className="mt-1">Company: {booking.company_name}</div>
                            )}
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-3">
                            <button
                                onClick={() => setSelectedBooking(booking)}
                                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                View details
                            </button>
                            
                            {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                                <>
                                    <button
                                        onClick={() => handleCancelClick(booking)}
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                        title="Cancel booking"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => router.visit(route("warehouse-bookings.summary", { bookingId: booking.id }))}
                                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0955AC] text-sm font-semibold text-white transition hover:bg-[#084a97]"
                                    >
                                        Manage
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                </>
                            ) : booking.status === 'cancelled' ? (
                                <>
                                    <button
                                        onClick={() => handleViewCancellationClick(booking)}
                                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        View Cancellation
                                        <FileText className="ml-2 h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => router.visit(route("warehouse-bookings.summary", { bookingId: booking.id }))}
                                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0955AC] text-sm font-semibold text-white transition hover:bg-[#084a97]"
                                    >
                                        Details
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => router.visit(route("warehouse-bookings.summary", { bookingId: booking.id }))}
                                    className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0955AC] text-sm font-semibold text-white transition hover:bg-[#084a97]"
                                >
                                    View Details
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderWarehouseCard = (warehouse) => {
        const Icon = iconForType(warehouse.type);
        return (
            <motion.div
                key={warehouse.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-[200px] w-full overflow-hidden bg-slate-100">
                        <img
                            src={warehouse.main_image || fallbackImage}
                            alt={warehouse.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(event) => {
                                event.currentTarget.src = fallbackImage;
                            }}
                        />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                            <Icon className="h-4 w-4" />
                            {normalizeStatus(warehouse.type)}
                        </div>
                        <button
                            onClick={() => handleLikeToggle(warehouse.id)}
                            className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-sm transition ${
                                liked.has(warehouse.id)
                                    ? "border-[#0955AC] text-[#0955AC]"
                                    : "border-slate-200 text-slate-500 hover:border-[#0955AC]/40 hover:text-[#0955AC]"
                            }`}
                            aria-label={
                                liked.has(warehouse.id)
                                    ? "Remove from wishlist"
                                    : "Add to wishlist"
                            }
                        >
                            <BookmarkCheck className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {warehouse.name}
                                </h3>
                                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <MapPin className="h-4 w-4" />
                                    {warehouse.city}
                                </div>
                                {warehouse.liked_at ? (
                                    <div className="mt-1 text-xs text-slate-400">
                                        Saved {formatDate(warehouse.liked_at)}
                                    </div>
                                ) : null}
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Star className="h-4 w-4" />
                                {(warehouse.avg_rating ?? 0).toFixed(1)}
                                <span className="text-amber-500">
                                    ({warehouse.reviews_count ?? 0})
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">
                                {formatCurrency(priceOf(warehouse), warehouse.currency)} / month
                            </span>
                            {warehouse.capacity ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {Number(warehouse.capacity).toLocaleString()} {warehouse.capacity_unit || "units"}
                                </span>
                            ) : null}
                            {warehouse.available_from ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    <Calendar className="h-3.5 w-3.5" /> Available {formatDate(warehouse.available_from)}
                                </span>
                            ) : null}
                        </div>

                        {warehouse.amenities?.length ? (
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                {warehouse.amenities.slice(0, 4).map((amenity) => (
                                    <span
                                        key={`${warehouse.id}-${amenity}`}
                                        className="rounded-full border border-slate-200 px-3 py-1"
                                    >
                                        {amenity}
                                    </span>
                                ))}
                                {warehouse.amenities.length > 4 ? (
                                    <span className="text-slate-400">
                                        +{warehouse.amenities.length - 4} more
                                    </span>
                                ) : null}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">
                                Provider has not published amenities yet.
                            </div>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-3">
                            <button
                                onClick={() => handleViewDetails(warehouse)}
                                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                View details
                            </button>
                            {/* <button
                                onClick={() => router.visit(route("warehouse-bookings.checkout"))}
                                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0955AC] text-sm font-semibold text-white transition hover:bg-[#084a97]"
                            >
                                Start booking
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </button> */}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-[#F4F6F9] md:p-20 poppins">
                <div className="mx-auto flex h-full max-w-[700px] flex-col items-center justify-center gap-4 rounded-3xl bg-white p-12 text-center shadow-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-[#0955AC]" />
                    <p className="text-sm text-slate-500">
                        Loading your warehouse dashboard…
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen w-full bg-[#F4F6F9] md:p-20 poppins">
                <div className="mx-auto flex h-full max-w-[700px] flex-col items-center justify-center gap-6 rounded-3xl bg-white p-12 text-center shadow-sm">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
                        <p className="mt-2 text-sm text-slate-500">{error}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.visit(route("signin.signin"))}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Sign in
                        </button>
                        <button
                            onClick={fetchDashboard}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0955AC] px-5 text-sm font-semibold text-white hover:bg-[#084a97]"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#F4F6F9] poppins">
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl md:text-[26px] font-[700] tracking-tight text-slate-900">
                            Warehouse Management
                            <span className="text-[#0955AC]"> Dashboard</span>
                        </h1>
                        <p className="flex flex-col md:flex-row md:items-center gap-3 text-sm text-slate-500">
                            End-to-end control for your warehouse reservations
                            {dashboard?.lastUpdated ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5" />
                                    Updated {formatDateTime(dashboard.lastUpdated)}
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                            onClick={() => router.visit(route("warehouse.list"))}
                            className="inline-flex h-12 items-center justify-center rounded-xl bg-[#0955AC] px-6 text-sm font-semibold text-white transition hover:bg-[#084a97]"
                        >
                            <Plus className="mr-2 h-4 w-4" /> New booking
                        </button>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.key}
                                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-2"
                            >
                                <div className="min-w-0">
                                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${card.tint}`}>
                                        <Icon className="w-[18px] h-[18px]" />
                                    </span>
                                    <p className="text-[19px] font-[700] text-slate-900 leading-tight truncate">
                                        {card.key === "totalSpend"
                                            ? card.value
                                            : Number(card.value ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-[11.5px] font-[600] text-slate-600 mt-0.5">{card.label}</p>
                                    <p className="text-[10.5px] text-slate-400 truncate">{card.helper}</p>
                                </div>
                                {card.trend && <Sparkline data={card.trend} color={card.color} id={card.key} />}
                            </div>
                        );
                    })}
                </div>

                {/* Search & Filters */}
                <div className="mb-3 md:mb-4 bg-white rounded-2xl shadow-sm">
                    <div className="px-6 py-6">
                        {/* Main Filter Row - Search, Location, and Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[250px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={filters.search}
                                    onChange={(event) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            search: event.target.value,
                                        }))
                                    }
                                    placeholder="Search warehouses, cities or types"
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[14px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                                />
                                {filters.search && (
                                    <button
                                        onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Location select */}
                            <div className="flex-1 min-w-[150px]">
                                <select
                                    value={filters.location}
                                    onChange={(event) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            location: event.target.value,
                                        }))
                                    }
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent appearance-none cursor-pointer"
                                >
                                    <option value="all">All locations</option>
                                    {filtersData.locations.map((city) => (
                                        <option key={city} value={city.toLowerCase()}>
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 items-center flex-wrap">
                                <button 
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`inline-flex items-center h-11 px-4 rounded-lg text-[14px] font-medium transition whitespace-nowrap ${
                                        showAdvancedFilters 
                                            ? "bg-[#0955AC] text-white border border-[#0955AC]" 
                                            : "border border-slate-300 hover:bg-slate-50"
                                    }`}>
                                    <Filter className="mr-2 h-4 w-4" /> Filters
                                </button>
                                <button 
                                    onClick={() => setShowExportModal(true)}
                                    className="inline-flex items-center h-11 px-4 rounded-lg border border-slate-300 text-[14px] font-medium hover:bg-slate-50 transition whitespace-nowrap">
                                    <Download className="mr-2 h-4 w-4" /> Export
                                </button>
                                <button 
                                    onClick={handleRefresh}
                                    className="inline-flex items-center h-11 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 transition">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters Panel (Collapsible) */}
                        <AnimatePresence>
                            {showAdvancedFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                                        {/* Status */}
                                        <div>
                                            <label className="block text-[12px] text-slate-600 mb-1.5 font-medium">Status</label>
                                            <select
                                                value={filters.status}
                                                onChange={(event) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        status: event.target.value,
                                                    }))
                                                }
                                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent appearance-none cursor-pointer"
                                            >
                                                <option value="all">All status</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="active">Active</option>
                                                <option value="paid">Paid</option>
                                                <option value="pending">Pending</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>

                                        {/* Sort */}
                                        <div>
                                            <label className="block text-[12px] text-slate-600 mb-1.5 font-medium">Sort By</label>
                                            <select
                                                value={filters.sort}
                                                onChange={(event) =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        sort: event.target.value,
                                                    }))
                                                }
                                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent appearance-none cursor-pointer"
                                            >
                                                <option value="dateDesc">Latest first</option>
                                                <option value="dateAsc">Oldest first</option>
                                                <option value="priceAsc">Price (low → high)</option>
                                                <option value="priceDesc">Price (high → low)</option>
                                            </select>
                                        </div>

                                        {/* Start Date */}
                                        <div>
                                            <label className="block text-[12px] text-slate-600 mb-1.5 font-medium">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent cursor-pointer"
                                            />
                                        </div>

                                        {/* End Date */}
                                        <div>
                                            <label className="block text-[12px] text-slate-600 mb-1.5 font-medium">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent cursor-pointer"
                                            />
                                        </div>

                                        {/* Clear Filters Button */}
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleClearFilters}
                                                className="h-10 w-full inline-flex items-center justify-center px-4 rounded-lg border border-slate-200 text-[14px] font-medium hover:bg-slate-50 transition"
                                            >
                                                <X className="mr-2 h-4 w-4" /> Clear
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Showing count */}
                                    <div className="mt-4 flex items-center gap-2 text-[14px] text-slate-600">
                                        <Info className="h-4 w-4" />
                                        <span>Showing {filteredBookings.length} of {myBookings.length} bookings</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="mb-3 md:mb-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-900">
                                My Booked Warehouses
                            </h2>
                            <span className="text-sm text-slate-500">
                                {filteredBookings.length} booking(s)
                            </span>
                        </div>

                        {filteredBookings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
                                No bookings match your filters. Adjust filters or make a new booking.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {filteredBookings.slice(0, 6).map((booking) =>
                                    renderBookingCard(booking)
                                )}
                            </div>
                        )}

                        <div className="mt-10">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Saved warehouses
                                </h2>
                                <button
                                    onClick={() => router.visit(route("warehouse.list"))}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Browse catalog
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>

                            {wishlist.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
                                    You have not saved any warehouses yet. Use the wishlist button to keep interesting spaces handy.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    {wishlist.slice(0, 6).map((warehouse) =>
                                        renderWarehouseCard(warehouse)
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Upcoming reservations
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Confirm move-ins, extensions and handovers
                                    </p>
                                </div>
                                {/* <button
                                    onClick={() => router.visit(route("warehouse-bookings.list"))}
                                    className="inline-flex itemsCenter gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Manage all
                                    <ChevronRight className="h-3 w-3" />
                                </button> */}
                            </div>
                            <div className="space-y-4">
                                {upcoming.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                        You have no upcoming reservations. Browse warehouses to make a booking.
                                    </div>
                                ) : (
                                    upcoming.map((booking) => {
                                        const Icon = iconForType(booking.warehouse?.type);
                                        const tone = statusStyles[booking.status] || "bg-slate-100 text-slate-700 border-slate-200";
                                        return (
                                            <div
                                                key={booking.id}
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                                        <Icon className="h-5 w-5 text-[#0955AC]" />
                                                        <div>
                                                            <p className="font-semibold text-slate-800">
                                                                {booking.warehouse?.name ?? "Warehouse"}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {booking.warehouse?.address}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
                                                        {normalizeStatus(booking.status)}
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDateRange(booking.start_date, booking.end_date)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4" />
                                                        {formatCurrency(booking.amount)}
                                                    </span>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                                    <span>Reference #{booking.reference}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() =>
                                                                router.visit(
                                                                    route(
                                                                        "warehouse-bookings.show",
                                                                        { id: booking.id }
                                                                    )
                                                                )
                                                            }
                                                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100"
                                                        >
                                                            View details
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                router.visit(
                                                                    route(
                                                                        "warehouse-bookings.summary",
                                                                        { bookingId: booking.id }
                                                                    )
                                                                )
                                                            }
                                                            className="inline-flex items-center rounded-lg border border-[#0955AC]/20 bg-[#0955AC]/10 px-3 py-1 font-semibold text-[#0955AC] hover:bg-[#0955AC]/20"
                                                        >
                                                            Manage booking
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Quick actions
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Stay on top of key warehouse tasks
                                    </p>
                                </div>
                                <Filter className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-3">
                                {quickActions.map((action) => {
                                    const ActionIcon = action.icon;
                                    return (
                                        <button
                                            key={action.label}
                                            onClick={action.onClick}
                                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-[#0955AC] hover:bg-[#F3F8FF]"
                                        >
                                            <span className="flex items-center gap-3">
                                                <ActionIcon className="h-5 w-5 text-[#0955AC]" />
                                                <span>
                                                    {action.label}
                                                    <span className="block text-xs font-normal text-slate-500">
                                                        {action.description}
                                                    </span>
                                                </span>
                                            </span>
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {(stats.pendingPayments > 0 || stats.expiringSoon > 0) && (
                            <div className="rounded-2xl bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                    Attention required
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    Items that need action soon
                                </p>
                                <div className="space-y-1">
                                    {stats.pendingPayments > 0 && (
                                        <button
                                            onClick={() => setShowAdvancedFilters(true)}
                                            className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 text-left transition-colors"
                                        >
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                                                <Clock className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-sm font-semibold text-slate-700">Payments pending</span>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {stats.pendingPayments}
                                            </span>
                                        </button>
                                    )}
                                    {stats.expiringSoon > 0 && (
                                        <button
                                            onClick={() => setShowAdvancedFilters(true)}
                                            className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 text-left transition-colors"
                                        >
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
                                                <AlertTriangle className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-sm font-semibold text-slate-700">Renewals due within 30 days</span>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {stats.expiringSoon}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Billing snapshot
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Quickly review your billing position
                                    </p>
                                </div>
                                <CreditCard className="h-5 w-5 text-[#0955AC]" />
                            </div>
                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="text-slate-600">Outstanding balance</span>
                                    <span className="font-semibold text-slate-900">
                                        {formatCurrency(billing.outstanding ?? 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="text-slate-600">Paid this year</span>
                                    <span className="font-semibold text-slate-900">
                                        {formatCurrency(billing.paidThisYear ?? 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="text-slate-600">Next invoice date</span>
                                    <span className="font-semibold text-slate-900">
                                        {billing.nextInvoiceDate ? formatDate(billing.nextInvoiceDate) : "TBD"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Documents & agreements
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Leases, invoices and compliance documents
                                    </p>
                                </div>
                                <FileText className="h-5 w-5 text-[#0955AC]" />
                            </div>
                            <div className="mt-4 space-y-3">
                                {documents.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                                        No documents uploaded for your bookings yet.
                                    </div>
                                ) : (
                                    documents.slice(0, 5).map((doc) => (
                                        <a
                                            key={`${doc.booking_id}-${doc.name}`}
                                            href={doc.url || "#"}
                                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-[#0955AC] hover:bg-[#F3F8FF]"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <span className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-[#0955AC]" />
                                                <span>
                                                    {doc.name}
                                                    <span className="block text-xs text-slate-500">
                                                        Booking #{doc.reference}
                                                    </span>
                                                </span>
                                            </span>
                                            <LinkIcon className="h-4 w-4 text-slate-400" />
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Booking Trends</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Bookings created per month (last 6 months)</p>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activeBookingsTrend} margin={{ left: -20, right: 10, top: 10 }}>
                                    <defs>
                                        <linearGradient id="gWarehouseBookings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0955AC" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#0955AC" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                                    <RTooltip />
                                    <Area type="monotone" dataKey="value" name="Bookings" stroke="#0955AC" fill="url(#gWarehouseBookings)" strokeWidth={2.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-[15px] font-[700] text-slate-800">Status Distribution</h3>
                        <p className="text-[12px] text-slate-400 mb-2">Recent activity by status</p>
                        {statusDistribution.length === 0 ? (
                            <p className="text-[12px] text-slate-400 text-center py-16">No activity yet.</p>
                        ) : (
                            <>
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={statusDistribution} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name" cornerRadius={6}>
                                                {statusDistribution.map((d, i) => (
                                                    <Cell key={d.name} fill={statusColors[i % statusColors.length]} />
                                                ))}
                                            </Pie>
                                            <RTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    {statusDistribution.map((d, i) => (
                                        <div key={d.name} className="flex items-center justify-between text-[12px]">
                                            <span className="flex items-center gap-2 text-slate-600">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColors[i % statusColors.length] }} />
                                                {d.name}
                                            </span>
                                            <span className="font-[600] text-slate-700">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Recent activity
                            </h3>
                            <p className="text-xs text-slate-500">
                                Last 25 booking updates, payments and status changes
                            </p>
                        </div>
                        {/* <button
                            onClick={() => router.visit(route("warehouse-bookings.list"))}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Export CSV
                            <Download className="h-3 w-3" />
                        </button> */}
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full table-auto text-left text-sm">
                            <thead>
                                <tr className="text-xs uppercase tracking-wide text-slate-400">
                                    <th className="py-3 pr-6 font-semibold">Booking</th>
                                    <th className="py-3 pr-6 font-semibold">Warehouse</th>
                                    <th className="py-3 pr-6 font-semibold">Start</th>
                                    <th className="py-3 pr-6 font-semibold">End</th>
                                    <th className="py-3 pr-6 font-semibold">Status</th>
                                    <th className="py-3 pr-6 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                                            No historical activity yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((activity) => {
                                        const tone = statusStyles[activity.status] || "bg-slate-100 text-slate-700 border-slate-200";
                                        return (
                                            <tr key={activity.id} className="border-b border-slate-100 text-sm text-slate-600 last:border-0">
                                                <td className="py-4 pr-6">
                                                    <div className="font-semibold text-slate-800">
                                                        #{activity.reference}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {formatDateTime(activity.created_at)}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-6">
                                                    <div className="font-medium text-slate-800">
                                                        {activity.warehouse?.name ?? "Warehouse"}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {activity.warehouse?.address}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-6 text-xs text-slate-500">
                                                    {formatDate(activity.start_date)}
                                                </td>
                                                <td className="py-4 pr-6 text-xs text-slate-500">
                                                    {formatDate(activity.end_date)}
                                                </td>
                                                <td className="py-4 pr-6">
                                                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
                                                        {normalizeStatus(activity.status)}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-6 text-right font-semibold text-slate-800">
                                                    {formatCurrency(activity.amount)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-10 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} Transport Jaan · Client Warehouse Management Suite
                </div>
            </div>

            {/* Booking Details Popup */}
            {selectedBooking && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setSelectedBooking(null)}
                >
                    <div 
                        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-8 py-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    Booking Details
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Reference: #{selectedBooking.reference}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                                    statusStyles[selectedBooking.status] || "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                    {normalizeStatus(selectedBooking.status)}
                                </span>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-900">
                                        {formatCurrency(selectedBooking.amount || 0)}
                                    </div>
                                    <div className="text-xs text-slate-500">Total amount</div>
                                </div>
                            </div>

                            {/* Warehouse Info */}
                            <div className="rounded-xl border border-slate-200 p-6">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                    <Building2 className="h-5 w-5 text-[#0955AC]" />
                                    Warehouse Information
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Name</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {selectedBooking.warehouse?.name || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Location</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {selectedBooking.warehouse?.address || selectedBooking.warehouse?.city || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Type</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {normalizeStatus(selectedBooking.warehouse?.type || "N/A")}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Capacity</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {selectedBooking.warehouse?.capacity ? 
                                                `${Number(selectedBooking.warehouse.capacity).toLocaleString()} ${selectedBooking.warehouse.capacity_unit || "units"}` 
                                                : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="rounded-xl border border-slate-200 p-6">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                    <Calendar className="h-5 w-5 text-[#0955AC]" />
                                    Booking Details
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Start Date</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {formatDate(selectedBooking.start_date)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">End Date</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {formatDate(selectedBooking.end_date)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Booked On</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {formatDateTime(selectedBooking.created_at)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase">Duration</div>
                                        <div className="mt-1 text-sm text-slate-900">
                                            {selectedBooking.duration_months ? `${selectedBooking.duration_months} month(s)` : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Company Details */}
                            {selectedBooking.company_name && (
                                <div className="rounded-xl border border-slate-200 p-6">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                        <Building2 className="h-5 w-5 text-[#0955AC]" />
                                        Company Details
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase">Company Name</div>
                                            <div className="mt-1 text-sm text-slate-900">
                                                {selectedBooking.company_name}
                                            </div>
                                        </div>
                                        {selectedBooking.contact_person && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Contact Person</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.contact_person}
                                                </div>
                                            </div>
                                        )}
                                        {selectedBooking.email && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Email</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.email}
                                                </div>
                                            </div>
                                        )}
                                        {selectedBooking.phone && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Phone</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.phone}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Storage Details */}
                            {selectedBooking.storage_type && (
                                <div className="rounded-xl border border-slate-200 p-6">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                        <ShieldCheck className="h-5 w-5 text-[#0955AC]" />
                                        Storage Details
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 uppercase">Storage Type</div>
                                            <div className="mt-1 text-sm text-slate-900">
                                                {normalizeStatus(selectedBooking.storage_type)}
                                            </div>
                                        </div>
                                        {selectedBooking.required_space && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Required Space</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.required_space} units
                                                </div>
                                            </div>
                                        )}
                                        {selectedBooking.goods_type && (
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Goods Type</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.goods_type}
                                                </div>
                                            </div>
                                        )}
                                        {selectedBooking.goods_description && (
                                            <div className="md:col-span-2">
                                                <div className="text-xs font-semibold text-slate-500 uppercase">Goods Description</div>
                                                <div className="mt-1 text-sm text-slate-900">
                                                    {selectedBooking.goods_description}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="flex-1 inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedBooking(null);
                                        router.visit(route("warehouse-bookings.summary", { bookingId: selectedBooking.id }));
                                    }}
                                    className="flex-1 inline-flex h-12 items-center justify-center rounded-xl bg-[#0955AC] text-sm font-semibold text-white transition hover:bg-[#084a97]"
                                >
                                    Manage Booking
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Cancellation Modal */}
            {cancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Cancel Booking</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Review refund details before confirming
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setCancelModalOpen(false);
                                    setBookingToCancel(null);
                                    setCancellationPreview(null);
                                    setCancelSuccess(null);
                                }}
                                className="rounded-full p-2 hover:bg-slate-100 transition"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {cancelSuccess ? (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                        <ShieldCheck className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                        Booking Cancelled Successfully
                                    </h3>
                                    <p className="text-slate-600 mb-4">
                                        Booking #{bookingToCancel?.reference} has been cancelled
                                    </p>
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                                        <div className="text-sm font-semibold text-green-900 mb-1">
                                            Refund: {cancelSuccess.data?.refund_percentage}%
                                        </div>
                                        <div className="text-2xl font-bold text-green-700">
                                            LKR {cancelSuccess.data?.refund_amount}
                                        </div>
                                        <div className="text-xs text-green-600 mt-2">
                                            {cancelSuccess.data?.refund_info}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Refund will be processed within 5-7 business days
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Booking Info */}
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <h3 className="font-semibold text-slate-900 mb-2">
                                            {bookingToCancel?.warehouse?.name || 'Warehouse'}
                                        </h3>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div>Booking Ref: #{bookingToCancel?.reference}</div>
                                            <div>Start Date: {formatDate(bookingToCancel?.start_date)}</div>
                                            <div>Amount: {formatCurrency(bookingToCancel?.amount || 0)}</div>
                                        </div>
                                    </div>

                                    {/* Cancellation Preview */}
                                    {cancellationPreview ? (
                                        <div className="space-y-4">
                                            {/* Refund Info */}
                                            <div className={`rounded-xl p-6 ${
                                                cancellationPreview.refund_percentage >= 100 
                                                    ? 'bg-green-50 border border-green-200' 
                                                    : 'bg-amber-50 border border-amber-200'
                                            }`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-700">Refund Amount</div>
                                                        <div className={`text-3xl font-bold ${
                                                            cancellationPreview.refund_percentage >= 100 
                                                                ? 'text-green-700' 
                                                                : 'text-amber-700'
                                                        }`}>
                                                            LKR {cancellationPreview.refund_amount}
                                                        </div>
                                                    </div>
                                                    <div className={`text-right px-4 py-2 rounded-lg ${
                                                        cancellationPreview.refund_percentage >= 100 
                                                            ? 'bg-green-100' 
                                                            : 'bg-amber-100'
                                                    }`}>
                                                        <div className="text-xs font-semibold text-slate-600">Refund</div>
                                                        <div className={`text-2xl font-bold ${
                                                            cancellationPreview.refund_percentage >= 100 
                                                                ? 'text-green-700' 
                                                                : 'text-amber-700'
                                                        }`}>
                                                            {cancellationPreview.refund_percentage}%
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-slate-600">
                                                    {cancellationPreview.reason}
                                                </div>
                                            </div>

                                            {/* Policy Details */}
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                    <div className="text-sm text-blue-900">
                                                        <div className="font-semibold mb-1">Cancellation Policy</div>
                                                        <div>{cancellationPreview.policy_text}</div>
                                                        <div className="mt-2 text-xs">
                                                            Days before booking: {cancellationPreview.days_before_booking} days
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cancellation Reason */}
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                    Reason for Cancellation (Optional)
                                                </label>
                                                <textarea
                                                    value={cancelReason}
                                                    onChange={(e) => setCancelReason(e.target.value)}
                                                    placeholder="Please let us know why you're cancelling..."
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    rows={3}
                                                    maxLength={500}
                                                />
                                                <div className="text-xs text-slate-500 mt-1 text-right">
                                                    {cancelReason.length}/500
                                                </div>
                                            </div>

                                            {/* Warning */}
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                    <div className="text-sm text-red-900">
                                                        <div className="font-semibold mb-1">Important</div>
                                                        <div>This action cannot be undone. Once cancelled, you'll need to make a new booking if you change your mind.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500">Loading cancellation details...</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {!cancelSuccess && cancellationPreview && (
                            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setCancelModalOpen(false);
                                        setBookingToCancel(null);
                                        setCancellationPreview(null);
                                    }}
                                    className="flex-1 h-12 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-100 transition"
                                    disabled={cancelling}
                                >
                                    Keep Booking
                                </button>
                                <button
                                    onClick={handleConfirmCancel}
                                    disabled={cancelling}
                                    className="flex-1 h-12 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {cancelling ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cancelling...
                                        </>
                                    ) : (
                                        'Confirm Cancellation'
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Success Toast */}
            {cancelSuccess && !cancelModalOpen && (
                <div className="fixed bottom-4 right-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3"
                    >
                        <ShieldCheck className="h-5 w-5" />
                        <div>
                            <div className="font-semibold">Booking Cancelled</div>
                            <div className="text-sm opacity-90">Refund: {cancelSuccess.data?.refund_percentage}% (LKR {cancelSuccess.data?.refund_amount})</div>
                        </div>
                        <button
                            onClick={() => setCancelSuccess(null)}
                            className="ml-4 p-1 hover:bg-green-700 rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                </div>
            )}

            {/* View Cancellation Details Modal */}
            {isViewCancellationModalOpen && cancellationToView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold">Cancellation Details</h3>
                                    <p className="mt-1 text-sm text-blue-100">
                                        Booking ID: {cancellationToView.id}
                                    </p>
                                </div>
                                <button
                                    onClick={closeViewCancellationModal}
                                    className="p-2 hover:bg-white/20 rounded-lg transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Cancellation Info Alert */}
                            <div className={`rounded-xl border-2 p-5 ${
                                cancellationToView.cancelled_by === 'vendor' 
                                    ? 'bg-orange-50 border-orange-200' 
                                    : 'bg-blue-50 border-blue-200'
                            }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full ${
                                        cancellationToView.cancelled_by === 'vendor' 
                                            ? 'bg-orange-100' 
                                            : 'bg-blue-100'
                                    }`}>
                                        <AlertTriangle className={`h-6 w-6 ${
                                            cancellationToView.cancelled_by === 'vendor' 
                                                ? 'text-orange-600' 
                                                : 'text-blue-600'
                                        }`} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-lg font-bold mb-2 ${
                                            cancellationToView.cancelled_by === 'vendor' 
                                                ? 'text-orange-900' 
                                                : 'text-blue-900'
                                        }`}>
                                            Cancelled by: {cancellationToView.cancelled_by === 'vendor' ? 'Service Provider' : 'You (Customer)'}
                                        </h4>
                                        <div className="space-y-1.5">
                                            <div className={`flex items-center gap-2 text-sm ${
                                                cancellationToView.cancelled_by === 'vendor' 
                                                    ? 'text-orange-800' 
                                                    : 'text-blue-800'
                                            }`}>
                                                <Calendar className="h-4 w-4" />
                                                <span className="font-semibold">Cancelled on:</span>
                                                <span>{cancellationToView.cancelled_at ? new Date(cancellationToView.cancelled_at).toLocaleString('en-US', { 
                                                    dateStyle: 'medium', 
                                                    timeStyle: 'short' 
                                                }) : 'N/A'}</span>
                                            </div>
                                            <div className={`flex items-center gap-2 text-sm ${
                                                cancellationToView.cancelled_by === 'vendor' 
                                                    ? 'text-orange-800' 
                                                    : 'text-blue-800'
                                            }`}>
                                                <CreditCard className="h-4 w-4" />
                                                <span className="font-semibold">Refund:</span>
                                                <span className="font-bold">{cancellationToView.refund_percentage || 0}% - Rs {parseFloat(cancellationToView.refund_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-slate-600" />
                                    Booking Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Warehouse</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.warehouse?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Location</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.warehouse?.address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Storage Type</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.warehouse?.type || cancellationToView.storage_type || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Space Required</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.required_space ? `${cancellationToView.required_space} sq ft` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Start Date</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.start_date ? new Date(cancellationToView.start_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">End Date</p>
                                        <p className="font-semibold text-slate-900">{cancellationToView.end_date ? new Date(cancellationToView.end_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Booking Amount</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        Rs {parseFloat(cancellationToView.final_amount || cancellationToView.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Cancellation Reason */}
                            {cancellationToView.cancellation_reason && (
                                <div className="bg-slate-50 rounded-xl p-5">
                                    <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-slate-600" />
                                        Cancellation Reason
                                    </h4>
                                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {cancellationToView.cancellation_reason}
                                    </p>
                                </div>
                            )}

                            {/* Refund Status */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-green-100 rounded-full">
                                        <ShieldCheck className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-green-900">Refund Information</h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-800">Refund Percentage:</span>
                                        <span className="font-bold text-green-900">{cancellationToView.refund_percentage || 0}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-800">Refund Amount:</span>
                                        <span className="font-bold text-green-900">Rs {parseFloat(cancellationToView.refund_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                        <span className="text-sm text-green-800">Status:</span>
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                                            {cancellationToView.refund_status || 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={closeViewCancellationModal}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
                    >
                        <div className="border-b border-slate-200 px-6 py-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Export Bookings</h3>
                                    <p className="mt-1 text-sm text-slate-500">Choose your preferred format</p>
                                </div>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="rounded-lg p-1 hover:bg-slate-100 transition"
                                >
                                    <X className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-6 space-y-3">
                            <button
                                onClick={() => handleExportFormat("pdf")}
                                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-red-50 p-3">
                                        <FileText className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900">PDF Document</div>
                                        <div className="text-xs text-slate-500">Professional format</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#0955AC]" />
                            </button>

                            <button
                                onClick={() => handleExportFormat("excel")}
                                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-green-50 p-3">
                                        <FileText className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900">Excel Sheet</div>
                                        <div className="text-xs text-slate-500">Spreadsheet format</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#0955AC]" />
                            </button>

                            <button
                                onClick={() => handleExportFormat("csv")}
                                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900">CSV File</div>
                                        <div className="text-xs text-slate-500">Universal format</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#0955AC]" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Hero;
