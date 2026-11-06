import React, { useEffect, useMemo, useState, useRef } from "react";
import { Download, Search, Filter, X, ChevronDown as DropdownIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import upArrow from "../../../assets/vendors/dashboard/icons/upArrow.svg";
import NotificationDropdown from "../NotificationDropdown";

import icon1 from "../../../assets/vendors/booking/icons/icon1.svg";
import icon2 from "../../../assets/vendors/booking/icons/icon2.svg";
import icon3 from "../../../assets/vendors/booking/icons/icon3.svg";
import icon4 from "../../../assets/vendors/booking/icons/icon4.svg";

import BookingBarChart from "./BookingBarChart";
import CarBookingTableTwo from "./CarBookingTableTwo";

import UserDropdown from "../UserDropdown";

// ----- color lookups -----
const paymentStatusColors = {
    Paid: { color: "#3B8F31", bg: "#ACE199" },
    Pending: { color: "#FF6060", bg: "#FF60608C" },
};
const statusColors = {
    Pending: { bg: "#FF9800", text: "#FFFFFF" },
    Confirmed: { bg: "#FFCD29", text: "#000000" },
    Ongoing: { bg: "#FFCD29", text: "#000000" },
    Completed: { bg: "#3B8F31", text: "#FFFFFF" },
    Returned: { bg: "#3B8F31", text: "#FFFFFF" },
    Cancelled: { bg: "#FF6060", text: "#FFFFFF" },
};

// decorate a booking with table-friendly color fields
const decorateBooking = (b) => ({
    ...b,
    paymentStatusColor:
        paymentStatusColors[b.paymentStatus]?.color ?? "#7B7B7A",
    paymentStatusBg: paymentStatusColors[b.paymentStatus]?.bg ?? "#E8E8EF",
    statusBg: statusColors[b.status]?.bg ?? "#FF9800",
    statusText: statusColors[b.status]?.text ?? "#FFFFFF",
});

const BookingContent = ({
    initialBookings = [],
    bookingData = [], // [{name:'Jan', done:120, cancelled:12}, ...]
    vendorUser = { name: "Service Provider", role: "Service Provider" },
    unreadNotifications = 0, // NEW
    drivers = [],
}) => {
    const [bookings, setBookings] = useState(() =>
        (initialBookings || []).map(decorateBooking)
    );

    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const wrapperRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
    const [dateFromFilter, setDateFromFilter] = useState("");
    const [dateToFilter, setDateToFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // // Close dropdown when clicking outside or pressing Escape
    // useEffect(() => {
    //     const handleClickOutside = (e) => {
    //         if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
    //             setShowUserDropdown(false);
    //         }
    //     };

    //     const handleKey = (e) => {
    //         if (e.key === "Escape") setShowUserDropdown(false);
    //     };

    //     document.addEventListener("mousedown", handleClickOutside);
    //     document.addEventListener("keydown", handleKey);
    //     return () => {
    //         document.removeEventListener("mousedown", handleClickOutside);
    //         document.removeEventListener("keydown", handleKey);
    //     };
    // }, []);

    useEffect(() => {
        setBookings((initialBookings || []).map(decorateBooking));
    }, [initialBookings]);

    // KPIs derived from current bookings
    const kpis = useMemo(() => {
        const today = new Date();
        const parse = (s) => (s ? new Date(s) : null);

        const upcoming = bookings.filter((b) => {
            const sd = parse(b.startDate);
            return sd && sd > today && b.status !== "Cancelled";
        }).length;

        const pending = bookings.filter(
            (b) => b.paymentStatus === "Pending"
        ).length;
        const cancelled = bookings.filter(
            (b) => b.status === "Cancelled"
        ).length;
        const completed = bookings.filter(
            (b) => b.status === "Returned"
        ).length;

        return { upcoming, pending, cancelled, completed };
    }, [bookings]);

    // Filtered bookings based on search and filter criteria
    const filteredBookings = useMemo(() => {
        let filtered = bookings;

        // Status filter
        if (statusFilter !== "All") {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        // Payment status filter
        if (paymentStatusFilter !== "All") {
            filtered = filtered.filter(b => b.paymentStatus === paymentStatusFilter);
        }

        // Date range filter
        if (dateFromFilter) {
            const fromDate = new Date(dateFromFilter);
            filtered = filtered.filter(b => {
                const startDate = new Date(b.startDate);
                return startDate >= fromDate;
            });
        }

        if (dateToFilter) {
            const toDate = new Date(dateToFilter);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(b => {
                const startDate = new Date(b.startDate);
                return startDate <= toDate;
            });
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                b.customerName?.toLowerCase().includes(query) ||
                b.vehicleName?.toLowerCase().includes(query) ||
                b.bookingRef?.toLowerCase().includes(query) ||
                b.email?.toLowerCase().includes(query) ||
                b.phone?.includes(query)
            );
        }

        return filtered;
    }, [bookings, statusFilter, paymentStatusFilter, dateFromFilter, dateToFilter, searchQuery]);

    // Export to CSV function
    const exportToCSV = () => {
        if (filteredBookings.length === 0) {
            alert("No bookings to export");
            return;
        }

        const headers = ["Booking Ref", "Customer", "Vehicle", "Start Date", "End Date", "Status", "Payment Status", "Total Price"];
        const data = filteredBookings.map(b => [
            b.bookingRef || "",
            b.customerName || "",
            b.vehicleName || "",
            b.startDate || "",
            b.endDate || "",
            b.status || "",
            b.paymentStatus || "",
            b.totalPrice || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...data.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `car-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    const exportToPDF = () => {
        if (filteredBookings.length === 0) {
            alert("No bookings to export");
            return;
        }

        const doc = new jsPDF();
        const headers = [["Booking Ref", "Customer", "Vehicle", "Start Date", "End Date", "Status", "Payment Status", "Total Price"]];
        const data = filteredBookings.map(b => [
            b.bookingRef || "",
            b.customerName || "",
            b.vehicleName || "",
            b.startDate || "",
            b.endDate || "",
            b.status || "",
            b.paymentStatus || "",
            b.totalPrice || ""
        ]);

        doc.setFontSize(16);
        doc.text("Car Bookings Report", 14, 10);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 18);

        autoTable(doc, {
            head: headers,
            body: data,
            startY: 25,
            margin: { top: 20, right: 10, bottom: 10, left: 10 },
            headStyles: { fillColor: [9, 85, 172], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [230, 240, 250] },
            didDrawPage: (data) => {
                const pageCount = doc.internal.getPages().length;
                doc.setFontSize(9);
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        doc.save(`car-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowExportMenu(false);
    };

    const exportToXLSX = () => {
        try {
            if (filteredBookings.length === 0) {
                alert("No bookings to export");
                return;
            }

            const data = [
                ["Booking Ref", "Customer", "Vehicle", "Start Date", "End Date", "Status", "Payment Status", "Total Price"],
                ...filteredBookings.map(b => [
                    b.bookingRef || "",
                    b.customerName || "",
                    b.vehicleName || "",
                    b.startDate || "",
                    b.endDate || "",
                    b.status || "",
                    b.paymentStatus || "",
                    b.totalPrice || ""
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Car Bookings");

            XLSX.writeFile(workbook, `car-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            console.error("Error exporting to XLSX:", error);
            alert("Error exporting to XLSX. Please try again.");
        }
        setShowExportMenu(false);
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearchQuery("");
        setStatusFilter("All");
        setPaymentStatusFilter("All");
        setDateFromFilter("");
        setDateToFilter("");
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-5 justify-between items-center mb-6">
                <h1 className="figtree text-[20px] sm:text-[24px] lg:text-[28px] xl:text-[35px] font-[700]">
                    Vehicle Rental Bookings
                </h1>
                {/* <div className="flex flex-row gap-3 sm:gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div> */}
            </div>{" "}
            {/* KPI row */}
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-10 justify-between w-full mb-6">
                <div className="flex flex-col gap-3 sm:gap-4 lg:gap-8">
                    {/* Upcoming */}
                    <div
                        className="w-full xl:min-w-[300px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 sm:px-5 py-3"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row gap-3 sm:gap-5 items-center">
                            <div className="size-[40px] sm:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center flex-shrink-0">
                                <img
                                    src={icon1}
                                    alt="Upcoming Bookings"
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                            </div>
                            <div>
                                <div className="text-[12px] sm:text-[16px] font-[500] text-[#7B7B7A]">
                                    Upcoming Bookings
                                </div>
                                <div className="text-[20px] sm:text-[26px] font-[700]">
                                    {kpis.upcoming}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 items-end text-[12px] sm:text-[14px] font-[500]">
                            <div className="w-[70px] sm:w-[81px] h-[24px] sm:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[16px] sm:size-[19px]"
                                    alt=""
                                />
                                <span>+2.86%</span>
                            </div>
                            <span className="text-[#7B7B7A] hidden sm:inline">
                                from last week
                            </span>
                        </div>
                    </div>

                    {/* Pending */}
                    <div
                        className="w-full xl:min-w-[300px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 sm:px-5 py-3"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row gap-3 sm:gap-5 items-center">
                            <div className="size-[40px] sm:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center flex-shrink-0">
                                <img
                                    src={icon2}
                                    alt="Pending Bookings"
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                            </div>
                            <div>
                                <div className="text-[12px] sm:text-[16px] font-[500] text-[#7B7B7A]">
                                    Pending Bookings
                                </div>
                                <div className="text-[20px] sm:text-[26px] font-[700]">
                                    {kpis.pending}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 items-end text-[12px] sm:text-[14px] font-[500]">
                            <div className="w-[70px] sm:w-[81px] h-[24px] sm:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[16px] sm:size-[19px]"
                                    alt=""
                                />
                                <span>+2.86%</span>
                            </div>
                            <span className="text-[#7B7B7A] hidden sm:inline">
                                from last week
                            </span>
                        </div>
                    </div>

                    {/* Cancelled */}
                    <div
                        className="w-full xl:min-w-[300px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 sm:px-5 py-3"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row gap-3 sm:gap-5 items-center">
                            <div className="size-[40px] sm:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center flex-shrink-0">
                                <img
                                    src={icon3}
                                    alt="Cancelled Bookings"
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                            </div>
                            <div>
                                <div className="text-[12px] sm:text-[16px] font-[500] text-[#7B7B7A]">
                                    Cancelled Bookings
                                </div>
                                <div className="text-[20px] sm:text-[26px] font-[700]">
                                    {kpis.cancelled}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 items-end text-[12px] sm:text-[14px] font-[500]">
                            <div className="w-[70px] sm:w-[81px] h-[24px] sm:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[16px] sm:size-[19px]"
                                    alt=""
                                />
                                <span>+2.86%</span>
                            </div>
                            <span className="text-[#7B7B7A] hidden sm:inline">
                                from last week
                            </span>
                        </div>
                    </div>

                    {/* Completed */}
                    <div
                        className="w-full xl:min-w-[300px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 sm:px-5 py-3"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row gap-3 sm:gap-5 items-center">
                            <div className="size-[40px] sm:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center flex-shrink-0">
                                <img
                                    src={icon4}
                                    alt="Completed Bookings"
                                    className="w-5 h-5 sm:w-6 sm:h-6"
                                />
                            </div>
                            <div>
                                <div className="text-[12px] sm:text-[16px] font-[500] text-[#7B7B7A]">
                                    Completed Bookings
                                </div>
                                <div className="text-[20px] sm:text-[26px] font-[700]">
                                    {kpis.completed}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 items-end text-[12px] sm:text-[14px] font-[500]">
                            <div className="w-[70px] sm:w-[81px] h-[24px] sm:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[16px] sm:size-[19px]"
                                    alt=""
                                />
                                <span>+2.86%</span>
                            </div>
                            <span className="text-[#7B7B7A] hidden sm:inline">
                                from last week
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Chart */}
                <div
                    className="w-full min-w-[280px] lg:min-w-[495px] xl:max-w-[700px] min-h-[250px] sm:min-h-[300px] lg:min-h-[437px] bg-white rounded-[8px] sm:rounded-[10px] flex items-center justify-center overflow-x-auto"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {isMobile ? (
                        <div className="w-full p-4">
                            <div className="flex flex-col gap-2">
                                {/* Placeholder data for mobile since we can't access the chart's state */}
                                {[
                                    { name: "Jan", done: 320, cancelled: 220 },
                                    { name: "Feb", done: 380, cancelled: 270 },
                                    { name: "Mar", done: 250, cancelled: 150 },
                                    { name: "Apr", done: 500, cancelled: 230 },
                                    { name: "May", done: 310, cancelled: 410 },
                                    { name: "Jun", done: 370, cancelled: 180 },
                                    { name: "Jul", done: 420, cancelled: 210 },
                                    { name: "Aug", done: 480, cancelled: 380 },
                                ].map((item, index) => (
                                    <div key={index} className="bg-gray-50 rounded-md p-3">
                                        <div className="font-medium text-gray-700 mb-2">{item.name}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-blue-600 text-sm">{item.done} done</span>
                                            <span className="font-bold text-red-600 text-sm">{item.cancelled} cancelled</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <BookingBarChart bookingData={bookingData} />
                    )}
                </div>
            </div>
            {/* Table */}
            <div
                className="w-full bg-white rounded-[8px] sm:rounded-[10px] py-4 sm:py-6 lg:py-10 px-3 sm:px-4 lg:px-10 overflow-x-auto mt-6 sm:mt-0"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >
                <div className="flex flex-col gap-4">
                    {/* Header and Export */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h2 className="text-[16px] sm:text-[18px] lg:text-[24px] font-[700]">
                            Car Booking
                        </h2>
                        <div className="flex flex-row gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0955AC] text-white rounded-[6px] hover:bg-[#073a7a] transition"
                            >
                                <Filter size={18} />
                                <span className="hidden sm:inline">Filter</span>
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#3B8F31] text-white rounded-[6px] hover:bg-[#2d6b25] transition"
                                >
                                    <Download size={18} />
                                    <span className="hidden sm:inline">Export</span>
                                    <DropdownIcon size={14} />
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-[6px] shadow-lg z-50">
                                        <button
                                            onClick={exportToCSV}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                        >
                                            Export to CSV
                                        </button>
                                        <button
                                            onClick={exportToPDF}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                        >
                                            Export to PDF
                                        </button>
                                        <button
                                            onClick={exportToXLSX}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px]"
                                        >
                                            Export to XLSX
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="border border-gray-200 rounded-[8px] p-4 bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-[600] text-[16px]">Filters</h3>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] font-[600] text-gray-700">Search</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Customer, vehicle, ref..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] font-[600] text-gray-700">Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                    >
                                        <option value="All">All</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Returned">Returned</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Payment Status Filter */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] font-[600] text-gray-700">Payment</label>
                                    <select
                                        value={paymentStatusFilter}
                                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                    >
                                        <option value="All">All</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>

                                {/* Date From */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] font-[600] text-gray-700">From Date</label>
                                    <input
                                        type="date"
                                        value={dateFromFilter}
                                        onChange={(e) => setDateFromFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                    />
                                </div>

                                {/* Date To */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[12px] font-[600] text-gray-700">To Date</label>
                                    <input
                                        type="date"
                                        value={dateToFilter}
                                        onChange={(e) => setDateToFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                    />
                                </div>
                            </div>

                            {/* Reset Button */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleResetFilters}
                                    className="px-4 py-2 text-[14px] text-gray-600 hover:text-gray-900 border border-gray-300 rounded-[6px] hover:bg-gray-100 transition"
                                >
                                    Reset Filters
                                </button>
                            </div>

                            {/* Results count */}
                            <div className="mt-3 text-[12px] text-gray-500">
                                Showing {filteredBookings.length} of {bookings.length} bookings
                            </div>
                        </div>
                    )}
                </div>

                <CarBookingTableTwo
                    bookings={Array.isArray(filteredBookings) ? filteredBookings : []}
                    setBookings={setBookings}
                    statusColors={statusColors}
                    drivers={drivers}
                />
            </div>
        </div>
    );
};

export default BookingContent;
