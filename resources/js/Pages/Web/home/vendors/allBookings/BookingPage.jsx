import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePage } from "@inertiajs/react";
import {
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    ChevronDown as DropdownIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import VendorShellLayout from "../../../../../Components/vendors/VendorShellLayout";
import icon1 from "../../../assets/vendors/booking/icons/icon1.svg";
import icon2 from "../../../assets/vendors/booking/icons/icon2.svg";
import icon3 from "../../../assets/vendors/booking/icons/icon3.svg";
import icon4 from "../../../assets/vendors/booking/icons/icon4.svg";
import upArrow from "../../../assets/vendors/dashboard/icons/upArrow.svg";
import UnverifiedBanner from "./UnverifiedBanner";
import { API_BASE_URL } from "../../../../../config/api";
import miniSearchIcon from "../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import filterIcon from "../../../assets/vendors/dashboard/icons/filterIcon.svg";
import AllBookingTableTwo from "./AllBookingTableTwo";


// ─── dummy data for unverified vendors ───────────────────────────────────────
const DUMMY_BOOKINGS = [
    { id: 1, booking_code: "BK-001", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Kasun Perera", customer_email: "kasun@gmail.com", customer_phone: "+94 77 123 4567", total_amount: 5000, status: "Confirmed", payment_status: "Paid", booking_date: "2025-06-10", start_date: "2025-07-01", end_date: "2025-07-03" },
    { id: 2, booking_code: "FL-201", booking_type: "flight", service_name: "Flight Ticket", customer_name: "Nimal Fernando", customer_email: "nimal@yahoo.com", customer_phone: "+94 71 234 5678", total_amount: 15000, status: "Paid", payment_status: "Paid", booking_date: "2025-06-08", start_date: "2025-06-20", end_date: "2025-06-20" },
    { id: 3, booking_code: "BK-002", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Dilani Wickramasinghe", customer_email: "dilani@outlook.com", customer_phone: "+94 76 345 6789", total_amount: 8500, status: "Pending", payment_status: "Pending", booking_date: "2025-06-12", start_date: "2025-07-10", end_date: "2025-07-12" },
    { id: 4, booking_code: "FL-202", booking_type: "flight", service_name: "Flight Ticket", customer_name: "Roshan Jayawardena", customer_email: "roshan@gmail.com", customer_phone: "+94 78 456 7890", total_amount: 82500, status: "Completed", payment_status: "Paid", booking_date: "2025-05-29", start_date: "2025-06-05", end_date: "2025-06-07" },
    { id: 5, booking_code: "BK-003", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Sachini Silva", customer_email: "sachini@gmail.com", customer_phone: "+94 70 567 8901", total_amount: 12000, status: "Confirmed", payment_status: "Paid", booking_date: "2025-06-11", start_date: "2025-07-15", end_date: "2025-07-18" },
    { id: 6, booking_code: "BK-004", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Tharindu Bandara", customer_email: "tharindu@live.com", customer_phone: "+94 75 678 9012", total_amount: 6800, status: "Cancelled", payment_status: "Pending", booking_date: "2025-06-05", start_date: "2025-06-25", end_date: "2025-06-26" },
    { id: 7, booking_code: "FL-203", booking_type: "flight", service_name: "Flight Ticket", customer_name: "Priya Rajapaksa", customer_email: "priya@gmail.com", customer_phone: "+94 72 789 0123", total_amount: 98000, status: "Pending", payment_status: "Pending", booking_date: "2025-06-09", start_date: "2025-08-01", end_date: "2025-08-03" },
    { id: 8, booking_code: "BK-005", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Chamara Gunasekara", customer_email: "chamara@gmail.com", customer_phone: "+94 74 890 1234", total_amount: 4200, status: "Completed", payment_status: "Paid", booking_date: "2025-05-20", start_date: "2025-06-10", end_date: "2025-06-11" },
    { id: 9, booking_code: "FL-204", booking_type: "flight", service_name: "Flight Ticket", customer_name: "Sanduni Rathnayake", customer_email: "sanduni@gmail.com", customer_phone: "+94 77 901 2345", total_amount: 52500, status: "Confirmed", payment_status: "Paid", booking_date: "2025-06-14", start_date: "2025-07-20", end_date: "2025-07-22" },
    { id: 10, booking_code: "BK-006", booking_type: "vehicle", service_name: "Vehicle Rental", customer_name: "Isuru Dissanayake", customer_email: "isuru@gmail.com", customer_phone: "+94 71 012 3456", total_amount: 9500, status: "Active", payment_status: "Paid", booking_date: "2025-06-13", start_date: "2025-06-13", end_date: "2025-06-15" },
];

const DUMMY_STATS = { upcoming: 4, pending: 3, cancelled: 1, completed: 2 };

// ─── helpers ─────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
    confirmed: { bg: "#D8E4F2", text: "#000000", border: "#0000004D" },
    paid: { bg: "#ACE19957", text: "#3B8F31", border: "#3B8F314D" },
    pending: { bg: "#FFF7ED", text: "#EA580C", border: "#EA580C4D" },
    completed: { bg: "#D1FAE5", text: "#059669", border: "#06B6D44D" },
    cancelled: { bg: "#F87171", text: "#FFFFFF", border: "#B91C1C" },
    active: { bg: "#E8F5E9", text: "#2E7D32", border: "#2E7D324D" },
    returned: { bg: "#D1FAE5", text: "#059669", border: "#06B6D44D" },
};
const getStatusStyle = (status) =>
    STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES["pending"];

const typeBadge = (type) =>
    type === "flight"
        ? "bg-blue-100 text-blue-700"
        : "bg-orange-100 text-orange-700";

// ─── component ───────────────────────────────────────────────────────────────
const BookingPage = () => {

    const { auth, allBookings: propBookings, bookingStats: propStats } = usePage().props;
    const currentComponent = usePage().component;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    // ── notifications ──
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!auth?.user) return;
        const fetchNotifications = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}vendors/warehouse/notifications/data`);
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unread_count || 0);
                }
            } catch (e) { console.error("Failed to fetch notifications:", e); }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [auth?.user]);

    // ── data source ──
    const rawBookings = useMemo(() => {
        if (!isVerified) return DUMMY_BOOKINGS;
        return propBookings ?? [];
    }, [isVerified, propBookings]);

    const stats = useMemo(() => {
        if (!isVerified) return DUMMY_STATS;
        return propStats ?? DUMMY_STATS;
    }, [isVerified, propStats]);

    // Percentage changes: hardcoded when unverified, from propStats when verified
    const pctUpcoming = isVerified ? (propStats?.upcoming_change ?? 0) : 2.86;
    const pctPending = isVerified ? (propStats?.pending_change ?? 0) : 1.42;
    const pctCancelled = isVerified ? (propStats?.cancelled_change ?? 0) : -0.50;
    const pctCompleted = isVerified ? (propStats?.completed_change ?? 0) : 3.12;

    // ── filter state ──
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    // ── pagination ──
    const [page, setPage] = useState(1);
    const ROWS = 7;

    // ── modal ──
    const [modal, setModal] = useState(null);

    // ── bookings table state ──
    const [bookings, setBookings] = useState(rawBookings);
    const statusColors = {
        Confirmed: { bg: "#D8E4F2", text: "#000000" },
        Paid: { bg: "#ACE19957", text: "#3B8F31" },
        Pending: { bg: "#FFF7ED", text: "#EA580C" },
        Completed: { bg: "#D1FAE5", text: "#059669" },
        Cancelled: { bg: "#F87171", text: "#FFFFFF" },
        Active: { bg: "#E8F5E9", text: "#2E7D32" },
    };

    const resetPage = () => setPage(1);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return rawBookings
            .map((b, sourceIndex) => ({ ...b, __sourceIndex: sourceIndex }))
            .filter((b) => {
            const matchSearch =
                !q ||
                b.booking_code?.toLowerCase().includes(q) ||
                b.customer_name?.toLowerCase().includes(q) ||
                b.service_name?.toLowerCase().includes(q) ||
                b.customer_email?.toLowerCase().includes(q);
            const matchStatus = statusFilter === "All" || b.status?.toLowerCase() === statusFilter.toLowerCase();
            const matchType = typeFilter === "All" || b.booking_type === typeFilter;
            const paymentStatus = (b.payment_status ?? "").toString().toLowerCase();
            const matchPayment = paymentStatusFilter === "All" || paymentStatus === paymentStatusFilter.toLowerCase();
            const bd = b.booking_date ? new Date(b.booking_date) : null;
            const matchFrom = !dateFrom || !bd || bd >= new Date(dateFrom);
            const matchTo = !dateTo || !bd || bd <= new Date(dateTo);
            return matchSearch && matchStatus && matchType && matchPayment && matchFrom && matchTo;
        });
    }, [rawBookings, search, statusFilter, typeFilter, paymentStatusFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
    const paginated = filtered.slice((page - 1) * ROWS, page * ROWS);

    const handleResetFilters = () => {
        setSearch(""); setStatusFilter("All"); setTypeFilter("All");
        setPaymentStatusFilter("All");
        setDateFrom(""); setDateTo(""); resetPage();
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };

        if (showExportMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showExportMenu]);

    // ── exports ──
    const exportCSV = () => {
        const headers = ["Booking Code", "Type", "Service", "Customer", "Phone", "Amount", "Status", "Payment", "Date"];
        const rows = filtered.map((b) =>
            [b.booking_code, b.booking_type, b.service_name, b.customer_name, b.customer_phone,
            b.total_amount, b.status, b.payment_status, b.booking_date]
                .map((v) => `"${v ?? ""}"`)
                .join(",")
        );
        const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        setShowExportMenu(false);
    };

    const exportXLSX = () => {
        const data = [
            ["Booking Code", "Type", "Service", "Customer", "Phone", "Amount", "Status", "Payment", "Date"],
            ...filtered.map((b) => [b.booking_code, b.booking_type, b.service_name, b.customer_name,
            b.customer_phone, b.total_amount, b.status, b.payment_status, b.booking_date]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws["!cols"] = [14, 10, 18, 20, 16, 12, 12, 12, 14].map((w) => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bookings");
        XLSX.writeFile(wb, `bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
        setShowExportMenu(false);
    };

    const exportPDF = () => {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text("All Bookings Report", 14, 14);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 20);
        autoTable(doc, {
            head: [["Code", "Type", "Service", "Customer", "Phone", "Amount", "Status", "Payment", "Date"]],
            body: filtered.map((b) => [b.booking_code, b.booking_type, b.service_name, b.customer_name,
            b.customer_phone, `Rs. ${(b.total_amount || 0).toLocaleString()}`, b.status, b.payment_status, b.booking_date]),
            startY: 25,
            headStyles: { fillColor: [9, 85, 172], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [230, 240, 250] },
        });
        doc.save(`bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowExportMenu(false);
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <VendorShellLayout activeService="All Bookings">
            <div className="px-5 lg:pr-5 lg:pl-6 pt-6 pb-10">
                {/* ── Header ── */}
                <div className="flex md:flex-row flex-col gap-5 justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="figtree text-[35px] sm:text-[28px] font-[700] text-center md:text-left">
                            All Bookings
                        </h1>
                    </div>
                    {/* <div className="hidden lg:flex items-center gap-3">
                        <NotificationDropdown notifications={notifications} unreadCount={unreadCount} />
                        <UserDropdown settingsRoute={route("settingsPage")} />
                    </div> */}
                </div>

                {/* ── Unverified Banner ── */}
                <div className="mt-6">
                    <UnverifiedBanner />
                </div>

                {/* ── Stats Cards (2 × 2) ── */}
                <div className="flex flex-col gap-5 mt-14">
                    <div className="flex xl:flex-row flex-col gap-5 justify-between w-full">
                        {[
                            { icon: icon1, label: "Upcoming", value: stats.upcoming, pct: pctUpcoming },
                            { icon: icon2, label: "Pending", value: stats.pending, pct: pctPending },
                        ].map(({ icon, label, value, pct }) => (
                            <div
                                key={label}
                                className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-3"
                                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                            >
                                <div className="flex flex-row gap-5 justify-center items-center">
                                    <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                        <img src={icon} alt={label} />
                                    </div>
                                    <div>
                                        <h1 className="text-[16px] font-[500] text-[#7B7B7A]">{label} Bookings</h1>
                                        <h1 className="text-[26px] font-[700]">{value}</h1>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end text-[14px] font-[500]">
                                    <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center gap-1 ${pct >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                        <img src={upArrow} className={`size-[19px] ${pct < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                        <h1>{pct >= 0 ? '+' : ''}{pct}%</h1>
                                    </div>
                                    <h1 className="text-[#7B7B7A]">from last week</h1>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex xl:flex-row flex-col gap-5 w-full">
                        {[
                            { icon: icon3, label: "Cancelled", value: stats.cancelled, pct: pctCancelled },
                            { icon: icon4, label: "Completed", value: stats.completed, pct: pctCompleted },
                        ].map(({ icon, label, value, pct }) => (
                            <div
                                key={label}
                                className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-3"
                                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                            >
                                <div className="flex flex-row gap-5 justify-center items-center">
                                    <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                        <img src={icon} alt={label} />
                                    </div>
                                    <div>
                                        <h1 className="text-[16px] font-[500] text-[#7B7B7A]">{label} Bookings</h1>
                                        <h1 className="text-[26px] font-[700]">{value}</h1>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end text-[14px] font-[500]">
                                    <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center gap-1 ${pct >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                        <img src={upArrow} className={`size-[19px] ${pct < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                        <h1>{pct >= 0 ? '+' : ''}{pct}%</h1>
                                    </div>
                                    <h1 className="text-[#7B7B7A]">from last week</h1>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── White Card: Toolbar + Table + Pagination ── */}
                <div
                    className="w-full bg-white rounded-[10px] px-5 py-6 mt-6"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {/* car booking section */}
                    <div
                        className="w-full h-auto bg-[#FFFFFF] rounded-[10px] py-10 px-5 sm:px-10"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex xl:flex-row flex-col justify-between gap-4">
                            <h1 className="text-[24px] font-[700]">All Bookings</h1>
                            <div className="flex flex-col sm:flex-row gap-3 mt-5 xl:mt-0 w-full sm:w-auto">
                                <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center py-2 px-4">
                                    <img src={miniSearchIcon} alt="Search" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            resetPage();
                                        }}
                                        className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] truncate"
                                        placeholder={
                                            "Search client name, airline, etc."
                                        }
                                    />
                                </div>
                                <button onClick={() => setShowFilters((prev) => !prev)}
                                    className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group">
                                    <img
                                        src={filterIcon}
                                        className="size-[14px] shrink-0 brightness-0 group-hover:brightness-0 group-hover:invert"
                                        alt="Filter"
                                    />
                                    <span>Filter</span>
                                </button>

                                <div className="relative" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setShowExportMenu((prev) => !prev)}
                                        className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group"
                                    >
                                        <Download size={14} className="shrink-0" />
                                        <span>Export</span>
                                        <DropdownIcon size={12} />
                                    </button>

                                    {showExportMenu && (
                                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-[6px] shadow-lg z-50">
                                            <button
                                                onClick={exportCSV}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                            >
                                                Export to CSV
                                            </button>
                                            <button
                                                onClick={exportPDF}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                            >
                                                Export to PDF
                                            </button>
                                            <button
                                                onClick={exportXLSX}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px]"
                                            >
                                                Export to XLSX
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="border border-gray-300 rounded-[8px] p-4 bg-gray-50 w-full mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-[600] text-[16px]">Filters</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleResetFilters}
                                            className="px-3 py-2 text-[14px] bg-white border border-gray-300 rounded-[6px] text-gray-700 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500]"
                                        >
                                            Reset Filters
                                        </button>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            className="text-gray-500 hover:text-blue-700 text-[24px] font-bold"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => {
                                                setStatusFilter(e.target.value);
                                                resetPage();
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        >
                                            <option value="All">All</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">Payment</label>
                                        <select
                                            value={paymentStatusFilter}
                                            onChange={(e) => {
                                                setPaymentStatusFilter(e.target.value);
                                                resetPage();
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        >
                                            <option value="All">All</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Pending">Pending</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">From Date</label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => {
                                                setDateFrom(e.target.value);
                                                resetPage();
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">To Date</label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => {
                                                setDateTo(e.target.value);
                                                resetPage();
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 text-[12px] text-gray-500">
                                    Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS + 1} to {Math.min(page * ROWS, filtered.length)} of {filtered.length} bookings
                                </div>
                            </div>
                        )}

                        <AllBookingTableTwo
                            bookings={paginated}
                            setBookings={setBookings}
                            statusColors={statusColors}
                            bookingType="All"
                        />
                    </div>
                    {/* end */}
                </div>
            </div>

            {/* ── Detail Modal ── */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={() => setModal(null)}>
                    <div className="bg-white rounded-[14px] w-full max-w-lg mx-4 p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-[18px] font-[700]">Booking Details</h2>
                            <button onClick={() => setModal(null)}
                                className="p-1 rounded-full hover:bg-gray-100 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3 text-[14px]">
                            {[
                                ["Booking Code", modal.booking_code],
                                ["Type", modal.booking_type === "flight" ? "✈ Flight" : "🚗 Vehicle"],
                                ["Service", modal.service_name],
                                ["Customer", modal.customer_name],
                                ["Email", modal.customer_email],
                                ["Phone", modal.customer_phone],
                                ["Amount", `Rs. ${(modal.total_amount || 0).toLocaleString()}`],
                                ["Status", modal.status],
                                ["Payment", modal.payment_status],
                                ["Booking Date", modal.booking_date],
                                ["Start Date", modal.start_date ?? "—"],
                                ["End Date", modal.end_date ?? "—"],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-gray-500 font-[500]">{label}</span>
                                    <span className="font-[600]">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </VendorShellLayout>
    );
};

export default BookingPage;
