import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { router } from "@inertiajs/react";
import { route } from "ziggy-js";
import jsPDF from "jspdf";
import {
  Plane,
  TrainFront,
  Bus,
  Calendar,
  Search,
  Filter,
  Plus,
  Download,
  ChevronRight,
  ChevronLeft,
  Clock,
  Ticket,
  XCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Info,
  FileText,
  File,
  Eye,
  Wallet,
  DollarSign,
  Users,
  ArrowLeftRight,
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
  BarChart,
  Bar,
} from "recharts";

const ModeIcon = ({ mode, className }) => {
  if (mode === "flight") return <Plane className={className} />;
  if (mode === "train") return <TrainFront className={className} />;
  return <Bus className={className} />;
};

const statusMap = {
  confirmed: { label: "Confirmed", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paid: { label: "Paid", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  pending: { label: "Pending", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { label: "Cancelled", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatMoney = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizeRow = (b) => ({
  id: b.id,
  raw: b,
  mode: b.mode,
  type: b.type,
  reference: b.reference,
  name: b.name,
  from: b.from,
  to: b.to,
  departureDate: b.departure_date,
  departureTime: b.departure_time || null,
  arrivalTime: b.arrival_time || null,
  seats: b.seats,
  passengerCount: b.passenger_count,
  amount: Number(b.total_price || 0),
  status: (b.status || "pending").toLowerCase(),
  bookingDate: b.booking_date,
  cancelledAt: b.cancelled_at,
  refundAmount: b.refund_amount,
});

const isUpcomingRow = (r) => {
  if (!["confirmed", "paid", "pending"].includes(r.status)) return false;
  if (!r.departureDate) return false;
  const d = new Date(r.departureDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(d.getTime()) && d >= today;
};

const isCompletedRow = (r) => {
  if (r.status === "cancelled") return false;
  if (!r.departureDate) return false;
  const d = new Date(r.departureDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(d.getTime()) && d < today;
};

const matchesTab = (row, tab) => {
  switch (tab) {
    case "all":
      return true;
    case "upcoming":
      return isUpcomingRow(row);
    case "completed":
      return isCompletedRow(row);
    case "pending":
      return row.status === "pending";
    case "cancelled":
      return row.status === "cancelled";
    default:
      return true;
  }
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
      const d = new Date(r.bookingDate);
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
          <linearGradient id={`tspark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#tspark-${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const Hero = ({ bookings = [], monthlyData = [] }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const tableRef = useRef(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [policyDetails, setPolicyDetails] = useState(null);

  const [searchMode, setSearchMode] = useState("flight");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchPassengers, setSearchPassengers] = useState(1);

  const scrollToTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (searchMode === "bus") {
      router.get("/busTicketBookingDetails", {
        from: searchFrom,
        to: searchTo,
        date: searchDate,
        tripType: "oneway",
        passengers: searchPassengers,
        adults: searchPassengers,
      });
    } else if (searchMode === "train") {
      router.get("/trainTicketBookingDetails", {
        from: searchFrom,
        to: searchTo,
        departureDate: searchDate,
        tripType: "oneway",
        adults: searchPassengers,
      });
    } else {
      const params = new URLSearchParams({
        trip_type: "oneway",
        departure_airport: searchFrom,
        arriving_airport: searchTo,
        departure_date: searchDate,
        travellers_summary: `${searchPassengers} Adult${searchPassengers === 1 ? "" : "s"}, Economy`,
      });
      router.visit(`/flightResults?${params.toString()}`);
    }
  };

  const rows = useMemo(() => bookings.map(normalizeRow), [bookings]);

  const kpi = useMemo(() => {
    const now = new Date();
    const addedThisMonth = rows.filter((r) => {
      const d = new Date(r.bookingDate);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const upcomingRows = rows.filter(isUpcomingRow).sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));
    const pendingPayments = rows.filter((r) => r.status === "pending").length;
    const totalSpentThisYear = rows
      .filter((r) => ["confirmed", "paid"].includes(r.status) && new Date(r.bookingDate).getFullYear() === now.getFullYear())
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      totalBookings: rows.length,
      addedThisMonth,
      upcomingCount: upcomingRows.length,
      nextTrip: upcomingRows[0] || null,
      pendingPayments,
      totalSpentThisYear,
    };
  }, [rows]);

  const bookingTrend = useMemo(() => buildMonthlyTrend(rows, () => true), [rows]);
  const upcomingTrend = useMemo(() => buildMonthlyTrend(rows, isUpcomingRow), [rows]);
  const pendingTrend = useMemo(() => buildMonthlyTrend(rows, (r) => r.status === "pending"), [rows]);
  const spendingTrend = useMemo(() => buildMonthlyTrend(rows, (r) => ["confirmed", "paid"].includes(r.status), (r) => r.amount), [rows]);

  const kpiCards = [
    { id: "total", label: "Total Bookings", sub: `+${kpi.addedThisMonth} this month`, value: kpi.totalBookings, icon: Ticket, tint: "bg-blue-50 text-blue-600", color: "#3b82f6", trend: bookingTrend },
    { id: "upcoming", label: "Upcoming Trips", sub: kpi.nextTrip ? `Next: ${formatDate(kpi.nextTrip.departureDate)}` : "No upcoming trips", value: kpi.upcomingCount, icon: Calendar, tint: "bg-emerald-50 text-emerald-600", color: "#10b981", trend: upcomingTrend },
    { id: "pending", label: "Pending Payments", sub: kpi.pendingPayments > 0 ? "Action Required" : "All settled", value: kpi.pendingPayments, icon: Clock, tint: "bg-amber-50 text-amber-600", color: "#f59e0b", trend: pendingTrend },
    { id: "spend", label: "Total Spent", sub: "This year", value: formatMoney(kpi.totalSpentThisYear), icon: Wallet, tint: "bg-purple-50 text-purple-600", color: "#8b5cf6", trend: spendingTrend },
  ];

  const travelAlerts = useMemo(() => {
    const now = new Date();
    const alerts = [];

    rows.filter(isUpcomingRow).forEach((r) => {
      const d = new Date(r.departureDate);
      if (d.toDateString() === now.toDateString()) {
        alerts.push({ id: `checkin-${r.id}`, tone: "bg-amber-50 text-amber-600", icon: AlertCircle, text: `Check-in may be open today for ${r.name} (${r.reference})`, time: r.bookingDate });
      }
    });

    rows
      .filter((r) => ["confirmed", "paid"].includes(r.status))
      .forEach((r) => {
        const d = new Date(r.bookingDate);
        const diffDays = (now - d) / 86400000;
        if (diffDays >= 0 && diffDays <= 2) {
          alerts.push({ id: `paid-${r.id}`, tone: "bg-emerald-50 text-emerald-600", icon: CheckCircle, text: `Payment received for ${r.reference}`, time: r.bookingDate });
        }
      });

    rows
      .filter((r) => r.status === "cancelled" && r.cancelledAt)
      .forEach((r) => {
        const d = new Date(r.cancelledAt);
        const diffDays = (now - d) / 86400000;
        if (diffDays >= 0 && diffDays <= 3) {
          alerts.push({ id: `cancel-${r.id}`, tone: "bg-rose-50 text-rose-600", icon: XCircle, text: `Booking ${r.reference} was cancelled${r.refundAmount ? ` • Refund ${formatMoney(r.refundAmount)}` : ""}`, time: r.cancelledAt });
        }
      });

    return alerts.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 4);
  }, [rows]);

  const activityData = useMemo(
    () => [
      { name: "Flight", value: rows.filter((r) => r.mode === "flight").length },
      { name: "Train", value: rows.filter((r) => r.mode === "train").length },
      { name: "Bus", value: rows.filter((r) => r.mode === "bus").length },
    ],
    [rows]
  );

  const paymentSummary = useMemo(() => {
    const pendingAmount = rows.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);
    const completedAmount = rows.filter((r) => ["confirmed", "paid"].includes(r.status)).reduce((sum, r) => sum + r.amount, 0);
    const refundsDue = rows.filter((r) => r.status === "cancelled" && r.refundAmount).reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    return { pendingAmount, completedAmount, refundsDue };
  }, [rows]);

  // ---------- Filtering / sorting / pagination ----------
  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => matchesTab(r, activeTab))
      .filter((r) => modeFilter === "all" || r.mode === modeFilter)
      .filter((r) => {
        if (!q) return true;
        const text = `${r.name} ${r.reference} ${r.from} ${r.to}`.toLowerCase();
        return text.includes(q.toLowerCase());
      })
      .filter((r) => {
        if (startDate || endDate) {
          const d = new Date(r.departureDate || r.bookingDate);
          if (Number.isNaN(d.getTime())) return true;
          if (startDate && d < new Date(startDate)) return false;
          if (endDate && d > new Date(endDate)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "amount") return b.amount - a.amount;
        if (sort === "date") return new Date(a.departureDate || a.bookingDate) - new Date(b.departureDate || b.bookingDate);
        return new Date(b.bookingDate) - new Date(a.bookingDate);
      });
  }, [rows, activeTab, modeFilter, q, startDate, endDate, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  useEffect(() => setPage(1), [activeTab, modeFilter, q, sort, startDate, endDate]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const handleClearFilters = () => {
    setQ("");
    setModeFilter("all");
    setActiveTab("all");
    setSort("recent");
    setStartDate("");
    setEndDate("");
  };

  const handleRefresh = () => window.location.reload();

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

  const downloadCsv = (dataRows, fileName) => {
    if (dataRows.length === 0) {
      alert("No bookings to export for the selected filters.");
      return;
    }
    const headers = Object.keys(dataRows[0]);
    const csvLines = [headers.join(","), ...dataRows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(","))];
    downloadTextFile(`${csvLines.join("\n")}\n`, fileName, "text/csv;charset=utf-8;");
  };

  const downloadPdf = (dataRows, fileName) => {
    if (dataRows.length === 0) {
      alert("No bookings to export for the selected filters.");
      return;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const margin = 36;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const lineHeight = 16;

    const columns = [
      { key: "Mode", label: "Mode", width: 70 },
      { key: "Reference", label: "Reference", width: 130 },
      { key: "Service", label: "Service", width: 220 },
      { key: "From", label: "From", width: 110 },
      { key: "To", label: "To", width: 110 },
      { key: "Date", label: "Date", width: 90 },
      { key: "Status", label: "Status", width: 80 },
      { key: "Amount", label: "Amount", width: 70 },
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
    dataRows.forEach(drawRow);
    pdf.save(fileName);
  };

  const handleExportFormat = (format) => {
    const exportRows = filteredRows.map((r) => ({
      Mode: (r.mode || "").toUpperCase(),
      Reference: r.reference || "",
      Service: r.name || "",
      From: r.from || "",
      To: r.to || "",
      Date: formatExportDate(r.departureDate || r.bookingDate),
      Status: r.status || "",
      Amount: r.amount.toFixed(2),
      Currency: "LKR",
    }));

    const dateStamp = new Date().toISOString().split("T")[0];
    const baseName = `ticket-bookings-${dateStamp}`;

    if (format === "PDF") downloadPdf(exportRows, `${baseName}.pdf`);
    else if (format === "Excel") downloadCsv(exportRows, `${baseName}.xlsx`);
    else downloadCsv(exportRows, `${baseName}.csv`);

    setShowExportModal(false);
  };

  // ---------- Cancellation (unchanged business logic) ----------
  const handleCancelClick = async (booking) => {
    setSelectedBooking(booking);
    setPolicyDetails(null);

    if (booking.type === "bus") {
      try {
        const response = await fetch(`/bus-bookings/${booking.reference}/cancellation-policy`, {
          headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content },
        });
        const data = await response.json();
        if (data.success && data.can_cancel) {
          setPolicyDetails(data.refund_details);
        }
      } catch (error) {
        console.error("Failed to fetch cancellation policy:", error);
      }
    }

    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    setCancelling(true);

    try {
      let url = "";
      if (selectedBooking.type === "bus") url = `/bus-bookings/${selectedBooking.reference}/cancel`;
      else if (selectedBooking.type === "train") url = `/train-bookings/${selectedBooking.reference}/cancel`;
      else if (selectedBooking.type === "flight") url = `/flight-bookings/${selectedBooking.reference}/cancel`;

      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
      if (!csrfToken) {
        alert("Security token not found. Please refresh the page and try again.");
        setCancelling(false);
        return;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken, Accept: "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text.substring(0, 500));
        alert(`Server error (${response.status}). Please check if you're logged in and try again.`);
        setCancelling(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        router.reload();
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelReason("");
      } else {
        alert(data.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Cancellation failed:", error);
      alert("Failed to cancel booking. Please check the console and try again.");
    } finally {
      setCancelling(false);
    }
  };

  const canCancelBooking = (booking) => booking.status !== "cancelled" && ["confirmed", "paid"].includes(booking.status);

  const quickActionTiles = [
    { icon: Plane, label: "Book Flight", tint: "bg-blue-50 text-blue-600", onClick: () => router.visit("/ticketBooking?type=flight") },
    { icon: TrainFront, label: "Book Train", tint: "bg-emerald-50 text-emerald-600", onClick: () => router.visit("/trainTicketBookingDetails") },
    { icon: Bus, label: "Book Bus", tint: "bg-indigo-50 text-indigo-600", onClick: () => router.visit("/busTicketBookingDetails") },
    { icon: Ticket, label: "My Tickets", tint: "bg-amber-50 text-amber-600", onClick: () => { setActiveTab("all"); scrollToTable(); } },
    { icon: Wallet, label: "Payments", tint: "bg-teal-50 text-teal-600", onClick: () => router.visit(route("client.wallet.dashboard")) },
    { icon: RefreshCw, label: "Refunds", tint: "bg-rose-50 text-rose-600", onClick: () => { setActiveTab("cancelled"); scrollToTable(); } },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F4F6F9] poppins">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-[26px] font-[700] text-slate-900">
              <span className="text-[#0955AC]">Ticket Booking</span> Dashboard
            </h1>
            <p className="text-slate-500 text-[13px] mt-1">Book and manage your Bus, Train &amp; Flight tickets</p>
          </div>
          <button
            onClick={() => router.visit("/busTicketBookingDetails")}
            className="inline-flex items-center h-11 px-5 rounded-xl bg-[#0955AC] text-white text-[14px] font-[600] hover:bg-[#0744a0] transition-colors shrink-0 self-start md:self-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </button>
        </div>

        {/* Quick Booking */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <h3 className="text-[15px] font-[700] text-slate-800 mb-3.5">Quick Booking</h3>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[
              { val: "flight", label: "Flight", icon: Plane },
              { val: "train", label: "Train", icon: TrainFront },
              { val: "bus", label: "Bus", icon: Bus },
            ].map(({ val, label, icon: Icon }) => (
              <button
                key={val}
                onClick={() => setSearchMode(val)}
                className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-[600] transition-colors ${
                  searchMode === val ? "bg-[#0955AC] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">From</label>
              <input
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                placeholder="Select departure"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
              <input
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                placeholder="Select destination"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Journey Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Passengers</label>
              <input
                type="number"
                min={1}
                value={searchPassengers}
                onChange={(e) => setSearchPassengers(Math.max(1, Number(e.target.value) || 1))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button type="submit" className="h-10 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] transition-colors">
                <Search className="w-4 h-4" /> Search &amp; Book Tickets
              </button>
            </div>
          </form>
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
                <p className="text-[10.5px] text-slate-400 truncate">{card.sub}</p>
              </div>
              <Sparkline data={card.trend} color={card.color} id={card.id} />
            </div>
          ))}
        </div>

        {/* Next Trip + Travel Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Next Trip</h3>
            {kpi.nextTrip ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-[#EAF1FE] flex items-center justify-center">
                      <ModeIcon mode={kpi.nextTrip.mode} className="w-5 h-5 text-[#0955AC]" />
                    </span>
                    <div>
                      <p className="text-[14px] font-[700] text-slate-900">
                        {kpi.nextTrip.from} <ArrowLeftRight className="inline w-3.5 h-3.5 mx-1 text-slate-400" /> {kpi.nextTrip.to}
                      </p>
                      <p className="text-[11.5px] text-slate-400">
                        {formatDate(kpi.nextTrip.departureDate)}
                        {kpi.nextTrip.departureTime ? ` • ${kpi.nextTrip.departureTime}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-[700] px-2.5 py-1 rounded-full whitespace-nowrap ${statusMap[kpi.nextTrip.status]?.tone || statusMap.pending.tone}`}>
                    {statusMap[kpi.nextTrip.status]?.label || kpi.nextTrip.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12.5px] text-slate-600 mb-4">
                  <p>
                    <span className="text-slate-400">Service:</span> {kpi.nextTrip.name}
                  </p>
                  <p>
                    <span className="text-slate-400">Reference:</span> {kpi.nextTrip.reference}
                  </p>
                  {kpi.nextTrip.seats && (
                    <p>
                      <span className="text-slate-400">Seats:</span> {kpi.nextTrip.seats}
                    </p>
                  )}
                  {kpi.nextTrip.passengerCount && (
                    <p>
                      <span className="text-slate-400">Passengers:</span> {kpi.nextTrip.passengerCount}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {kpi.nextTrip.type === "bus" && (
                    <>
                      <button onClick={() => window.open(`/bus-ticket/view/${kpi.nextTrip.reference}`, "_blank")} className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[12.5px] font-[600]">
                        View Ticket
                      </button>
                      <button onClick={() => (window.location.href = `/bus-ticket/download/${kpi.nextTrip.reference}`)} className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[12.5px] font-[600] inline-flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </>
                  )}
                  {kpi.nextTrip.type === "train" && (
                    <button onClick={() => router.visit(`/train-booking-success/${kpi.nextTrip.reference}`)} className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[12.5px] font-[600]">
                      View Ticket
                    </button>
                  )}
                  {canCancelBooking(kpi.nextTrip) && (
                    <button onClick={() => handleCancelClick(kpi.nextTrip.raw)} className="h-9 px-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[12.5px] font-[600]">
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-slate-400 text-center py-10">No upcoming trips booked.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Travel Alerts</h3>
            {travelAlerts.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 text-center py-10">No alerts right now.</p>
            ) : (
              <div className="space-y-3">
                {travelAlerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tone}`}>
                      <a.icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-[600] text-slate-700">{a.text}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(a.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Your Bookings */}
        <div ref={tableRef} className="space-y-4 mb-6">
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
                  placeholder="Search booking, route, or reference..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
                />
                {q && (
                  <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:border-transparent"
              >
                <option value="all">All Services</option>
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="bus">Bus</option>
              </select>
              <button
                onClick={() => setShowAdvancedFilters((v) => !v)}
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
                          <option value="date">Departure Date</option>
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
              <h3 className="text-[15px] font-[700] text-slate-800">Your Bookings ({filteredRows.length})</h3>
            </div>
            {pagedRows.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <Ticket className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-[14px] font-medium">No bookings found</p>
                <p className="text-slate-400 text-[12.5px] mt-1">Try adjusting your filters or book your first ticket</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2.5 font-[600]">Type</th>
                      <th className="px-2 py-2.5 font-[600]">Route / Service</th>
                      <th className="px-2 py-2.5 font-[600] hidden md:table-cell">Date &amp; Time</th>
                      <th className="px-2 py-2.5 font-[600] hidden sm:table-cell">Passenger(s)</th>
                      <th className="px-2 py-2.5 font-[600] text-right">Payment</th>
                      <th className="px-2 py-2.5 font-[600]">Status</th>
                      <th className="px-4 py-2.5 font-[600] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r) => (
                      <tr key={`${r.type}-${r.id}`} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex w-8 h-8 rounded-lg bg-slate-50 items-center justify-center">
                            <ModeIcon mode={r.mode} className="w-4 h-4 text-[#0955AC]" />
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <p className="text-[13px] font-[600] text-slate-800 truncate max-w-[200px]">{r.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {r.from} → {r.to} • {r.reference}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-[12.5px] text-slate-500 whitespace-nowrap hidden md:table-cell">
                          {formatDate(r.departureDate)}
                          {r.departureTime ? ` • ${r.departureTime}` : ""}
                        </td>
                        <td className="px-2 py-3 text-[12.5px] text-slate-500 hidden sm:table-cell">{r.passengerCount || r.seats || "1"}</td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">
                          <span className="text-[13px] font-[700] text-[#0955AC]">{formatMoney(r.amount)}</span>
                        </td>
                        <td className="px-2 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusMap[r.status]?.tone || statusMap.pending.tone}`}>
                            {statusMap[r.status]?.label || r.status}
                          </span>
                          {r.status === "cancelled" && r.refundAmount ? <p className="text-[10px] text-slate-400 mt-0.5">Refund {formatMoney(r.refundAmount)}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {r.status !== "cancelled" && r.type === "bus" && (
                              <>
                                <button onClick={() => window.open(`/bus-ticket/view/${r.reference}`, "_blank")} title="View ticket" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => (window.location.href = `/bus-ticket/download/${r.reference}`)} title="Download ticket" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {r.status !== "cancelled" && r.type === "train" && (
                              <button onClick={() => router.visit(`/train-booking-success/${r.reference}`)} title="View details" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {r.status !== "cancelled" && r.type === "flight" && (
                              <button onClick={() => alert("Flight booking details: " + r.reference)} title="View details" className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canCancelBooking(r) && (
                              <button onClick={() => handleCancelClick(r.raw)} title="Cancel booking" className="w-8 h-8 rounded-lg border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50">
                                <XCircle className="w-3.5 h-3.5" />
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
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers.map((n) => (
                    <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded-lg text-[12.5px] font-[600] ${page === n ? "bg-[#0955AC] text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[15px] font-[700] text-slate-800">Travel Spending</h3>
            <p className="text-[12px] text-slate-400 mb-2">Last 6 months</p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrend} margin={{ left: -20, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0955AC" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0955AC" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <RTooltip formatter={(value) => formatMoney(value)} />
                  <Area type="monotone" dataKey="value" name="Spending" stroke="#0955AC" fill="url(#gSpend)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[15px] font-[700] text-slate-800">Booking Activity</h3>
            <p className="text-[12px] text-slate-400 mb-2">By ticket type</p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} layout="vertical" margin={{ left: 10, right: 20, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={50} />
                  <RTooltip />
                  <Bar dataKey="value" name="Bookings" fill="#0955AC" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <h3 className="text-[15px] font-[700] text-slate-800 mb-3.5">Payment Summary</h3>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-slate-500">Pending Payments</span>
                <span className="text-[13px] font-[700] text-amber-600">{formatMoney(paymentSummary.pendingAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-slate-500">Completed Payments</span>
                <span className="text-[13px] font-[700] text-emerald-600">{formatMoney(paymentSummary.completedAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-slate-500">Refunds Due</span>
                <span className="text-[13px] font-[700] text-rose-600">{formatMoney(paymentSummary.refundsDue)}</span>
              </div>
            </div>
            <button
              onClick={() => router.visit(route("client.wallet.dashboard"))}
              className="mt-4 text-[12px] font-[700] text-[#0955AC] hover:underline inline-flex items-center gap-1 self-start"
            >
              View All Payments <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Quick Actions</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
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

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-2">© {new Date().getFullYear()} Transport Jaan · Flight • Train • Bus</div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Cancel Booking</h3>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedBooking(null);
                    setCancelReason("");
                    setPolicyDetails(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Are you sure you want to cancel this booking?</p>
                    <p className="text-xs text-amber-700 mt-1">Ref: {selectedBooking.reference}</p>
                  </div>
                </div>
              </div>

              {policyDetails && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Refund Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Original Amount:</span>
                      <span className="font-medium text-blue-900">LKR {Number(selectedBooking.total_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Refund Amount ({policyDetails.refund_percentage}%):</span>
                      <span className="font-medium text-green-600">LKR {Number(policyDetails.refund_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Cancellation Fee:</span>
                      <span className="font-medium text-rose-600">LKR {Number(policyDetails.cancellation_fee || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">{policyDetails.policy_message}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for cancellation (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{cancelReason.length}/500 characters</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                  setCancelReason("");
                  setPolicyDetails(null);
                }}
                className="flex-1 h-10 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white"
                disabled={cancelling}
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 h-10 px-4 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
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
