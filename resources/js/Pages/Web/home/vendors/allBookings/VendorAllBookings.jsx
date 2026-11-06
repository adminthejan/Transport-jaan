import React, { useState, useEffect, useRef } from "react";
import { usePage, Link } from "@inertiajs/react";
import { Download, ChevronDown as DropdownIcon, Plane, Car, Search as SearchIcon, Filter as FilterIcon, ChevronDown, Zap, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import dollarIcon from "../../../assets/vendors/dashboard/icons/dollarIcon.svg";
import carIcon from "../../../assets/vendors/dashboard/icons/carIcon.svg";
import bookingIcon from "../../../assets/vendors/dashboard/icons/bookingIcon.svg";
import wheelIcon from "../../../assets/vendors/dashboard/icons/wheelIcon.svg";
import upArrow from "../../../assets/vendors/dashboard/icons/upArrow.svg";
import UserDropdown from "../../../components/vendors/UserDropdown";
import NotificationDropdown from "../../../components/vendors/warehouse/NotificationDropdown";
import UnverifiedBanner from "./UnverifiedBanner";

import { API_BASE_URL } from "../../../../../config/api";
import miniSearchIcon from "../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import filterIcon from "../../../assets/vendors/dashboard/icons/filterIcon.svg";
import AllBookingTable from "./AllBookingTable";


const VendorAllBookings = ({
    bookings,
    bookingsMeta,
    allBookings = [],
    statistics = {},
    monthlyData = []
}) => {
    const { auth } = usePage().props;
    const currentComponent = usePage().component;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    // Dummy data for unverified vendors
    const dummyBookings = [
        {
            id: "BK-001", date: "Feb 20, 2025", customer: "John Doe",
            car: "Toyota Corolla", plate: "CAB-1234", duration: "Economy",
            startDate: "Mar 1, 2025", endDate: "Mar 5, 2025",
            price: "Rs. 5,000", paymentStatus: "Paid", status: "Ongoing",
            booking_type: "vehicle", service_name: "Vehicle Rental",
            booking_date: "2025-02-20",
        },
        {
            id: "BK-002", date: "Feb 19, 2025", customer: "Jane Smith",
            car: "SriLankan Airlines", plate: "UL315", duration: "Business",
            startDate: "Feb 25, 2025", endDate: "Feb 28, 2025",
            price: "Rs. 15,000", paymentStatus: "Paid", status: "Returned",
            booking_type: "flight", service_name: "Ticket Booking",
            booking_date: "2025-02-19",
        },
        {
            id: "BK-003", date: "Feb 18, 2025", customer: "Ahmed Khan",
            car: "Warehouse Unit A", plate: "WH-001", duration: "Monthly",
            startDate: "Mar 1, 2025", endDate: "Mar 31, 2025",
            price: "Rs. 8,500", paymentStatus: "Pending", status: "Ongoing",
            booking_type: "warehouse", service_name: "Warehouse Rental",
            booking_date: "2025-02-18",
        },
        {
            id: "BK-004", date: "Feb 17, 2025", customer: "Sara Williams",
            car: "Courier Standard", plate: "CR-202", duration: "Express",
            startDate: "Feb 20, 2025", endDate: "Feb 21, 2025",
            price: "Rs. 3,200", paymentStatus: "Paid", status: "Returned",
            booking_type: "courier", service_name: "Courier Service",
            booking_date: "2025-02-17",
        },
        {
            id: "BK-005", date: "Feb 16, 2025", customer: "Mike Johnson",
            car: "Freight Truck", plate: "FT-505", duration: "Full Load",
            startDate: "Feb 22, 2025", endDate: "Feb 25, 2025",
            price: "Rs. 12,000", paymentStatus: "Paid", status: "Ongoing",
            booking_type: "freight", service_name: "Freight Rental",
            booking_date: "2025-02-16",
        },
    ];

    const dummyStatistics = {
        total_bookings: 45,
        active_bookings: 12,
        total_earned: 235000,
        this_month: 35
    };

    // Use dummy data if unverified, real data if verified
    const displayBookings = isVerified ? allBookings : dummyBookings;
    const displayStatistics = isVerified ? statistics : dummyStatistics;

    // Percentage changes: hardcoded when unverified, from statistics when verified
    const pctTotalBookings = isVerified ? (statistics.total_bookings_change ?? 0) : 2.86;
    const pctActiveBookings = isVerified ? (statistics.active_bookings_change ?? 0) : 1.73;
    const pctTotalEarned = isVerified ? (statistics.total_earned_change ?? 0) : 2.86;
    const pctThisMonth = isVerified ? (statistics.this_month_change ?? 0) : 0;

    const [isMobile, setIsMobile] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
    const [dateFromFilter, setDateFromFilter] = useState("");
    const [dateToFilter, setDateToFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const perPageOptions = [10, 20, 50];
    const exportMenuRef = useRef(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
                setShowExportMenu(false);
            }
        };

        if (showExportMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showExportMenu]);

    // Export bookings to CSV
    const exportToCSV = () => {
        try {
            const headers = ["Booking ID", "Booking Date", "Client Name", "Service", "Travel Dates", "Payment Status", "Status"];
            const data = filteredBookings.map(booking => [
                booking.id || "—",
                booking.date || "—",
                booking.customer || "—",
                booking.transport || "—",
                `Start: ${booking.startDate || "—"} | End: ${booking.endDate || "—"}`,
                booking.paymentStatus || "—",
                booking.status || "—"
            ]);

            const csvContent = [
                headers.join(","),
                ...data.map(row => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `vendor-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error exporting to CSV:", error);
            alert("Error exporting to CSV. Please try again.");
        }
        setShowExportMenu(false);
    };

    // Export bookings to PDF
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const data = filteredBookings.map(booking => [
                booking.id || "—",
                booking.date || "—",
                booking.customer || "—",
                booking.transport || "—",
                `Start: ${booking.startDate || "—"} | End: ${booking.endDate || "—"}`,
                booking.paymentStatus || "—",
                booking.status || "—"
            ]);

            const headers = [["Booking ID", "Booking Date", "Client Name", "Service", "Travel Dates", "Payment Status", "Status"]];

            doc.setFontSize(16);
            doc.text("All Bookings Report", 14, 10);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 18);

            autoTable(doc, {
                head: headers,
                body: data,
                startY: 25,
                margin: { top: 20, right: 10, bottom: 10, left: 10 },
                headStyles: { fillColor: [9, 85, 172], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [230, 240, 250] },
                columnStyles: { 0: { halign: 'center' } },
                didDrawPage: (data) => {
                    const pageCount = doc.getNumberOfPages();
                    doc.setFontSize(9);
                    doc.text(
                        `Page ${data.pageNumber} of ${pageCount}`,
                        doc.internal.pageSize.getWidth() / 2,
                        doc.internal.pageSize.getHeight() - 10,
                        { align: 'center' }
                    );
                }
            });

            doc.save(`vendor-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("Error exporting to PDF:", error);
            alert("Error exporting to PDF. Please try again.");
        }
        setShowExportMenu(false);
    };

    // Export bookings to XLSX
    const exportToXLSX = () => {
        try {
            const data = [
                ["Booking ID", "Booking Date", "Client Name", "Service", "Travel Dates", "Payment Status", "Status"]
            ];

            filteredBookings.forEach(booking => {
                data.push([
                    booking.id || "—",
                    booking.date || "—",
                    booking.customer || "—",
                    booking.transport || "—",
                    `Start: ${booking.startDate || "—"} | End: ${booking.endDate || "—"}`,
                    booking.paymentStatus || "—",
                    booking.status || "—"
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "All Bookings");

            const colWidths = [
                { wch: 15 },
                { wch: 12 },
                { wch: 18 },
                { wch: 20 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 }
            ];
            worksheet['!cols'] = colWidths;

            XLSX.writeFile(workbook, `vendor-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        setTypeFilter("All");
        setPaymentStatusFilter("All");
        setDateFromFilter("");
        setDateToFilter("");
        setCurrentPage(1);
    };

    const formatDisplayDate = (value) => {
        if (!value) return "—";
        const text = String(value);
        if (text.includes("T")) return text.split("T")[0];
        return text;
    };

    // Map a booking to the field names AllBookingTable expects
    const mapToRow = (b) => ({
        id: b.id ?? b.booking_code,
        date: formatDisplayDate(b.date ?? b.booking_date),
        customer: b.customer ?? b.customer_name,
        transport: b.transport ?? b.car ?? b.service_name,
        details: b.details ?? b.plate ?? b.booking_type,
        duration: b.duration ?? "—",
        startDate: formatDisplayDate(b.startDate ?? b.start_date),
        endDate: formatDisplayDate(b.endDate ?? b.end_date),
        price: b.price ?? (b.total_amount ? `Rs. ${Number(b.total_amount).toLocaleString()}` : "—"),
        paymentStatus: b.paymentStatus ?? b.payment_status ?? "—",
        status: b.status ?? "—",
    });

    // Apply filters to bookings
    const filteredBookings = (displayBookings || []).filter((booking) => {
        const id = (booking.booking_code ?? booking.id ?? "").toString().toLowerCase();
        const customer = (booking.customer_name ?? booking.customer ?? "").toLowerCase();
        const service = (booking.service_name ?? booking.car ?? "").toLowerCase();
        const q = searchQuery.toLowerCase();

        const matchesSearch = !searchQuery || id.includes(q) || customer.includes(q) || service.includes(q);
        const matchesType = typeFilter === "All" || booking.booking_type === typeFilter;
        const matchesStatus = statusFilter === "All" || booking.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesPayment = paymentStatusFilter === "All" ||
            (booking.payment_status ?? booking.paymentStatus ?? "")?.toLowerCase() === paymentStatusFilter.toLowerCase();
        const bookingDate = new Date(booking.booking_date ?? booking.date);
        const matchesFromDate = !dateFromFilter || bookingDate >= new Date(dateFromFilter);
        const matchesToDate = !dateToFilter || bookingDate <= new Date(dateToFilter);

        return matchesSearch && matchesType && matchesStatus && matchesPayment && matchesFromDate && matchesToDate;
    }).map(mapToRow);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, typeFilter, paymentStatusFilter, dateFromFilter, dateToFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [rowsPerPage]);

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / rowsPerPage));
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
        return pages;
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Get status styling (matching DashContent)
    const getStatusStyle = (status) => {
        const statusLower = status?.toLowerCase() || '';
        const styles = {
            'confirmed': { bg: '#D8E4F2', text: '#000000', border: '#0000004D' },
            'paid': { bg: '#ACE19957', text: '#3B8F31', border: '#3B8F314D' },
            'pending': { bg: '#FFF7ED', text: '#EA580C', border: '#EA580C4D' },
            'completed': { bg: 'transparent', text: '#3B82F6', border: '#D8E4F2' },
            'cancelled': { bg: '#F87171', text: '#FFFFFF', border: '#B91C1C' },
            'active': { bg: '#E8F5E9', text: '#2E7D32', border: '#2E7D324D' }
        };
        return styles[statusLower] || { bg: '#D8E4F2', text: '#000000', border: '#0000004D' };
    };

    return (
        <div className="w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-8 lg:pb-12">
            {/* Header section - matching DashContent */}
            <div className="flex xl:flex-row flex-col gap-5 justify-between items-center mb-6">
                <h1 className="figtree text-[35px] sm:text-[28px] font-[700] text-center">
                    All Bookings Dashboard
                </h1>
            </div>



            {/* Unverified Warning */}
            <div className="mt-6">
                <UnverifiedBanner />
            </div>


            {/* Dashboard Content */}
            <div className="flex flex-col gap-5 py-10">
                {/* KPI Cards - matching DashContent styling */}
                <div className="flex flex-col gap-5">
                    <div className="flex xl:flex-row flex-col gap-5 justify-between w-full">
                        {/* Card 1 - Total Bookings */}
                        <div
                            className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row gap-5 justify-center items-center">
                                <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                    <img src={bookingIcon} alt="booking" />
                                </div>
                                <div>
                                    <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                        Total Bookings
                                    </h1>
                                    <h1 className="text-[20px] font-[700]">
                                        {displayStatistics.total_bookings || 0}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                                <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${pctTotalBookings >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                    <img src={upArrow} className={`size-[19px] ${pctTotalBookings < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                    <h1>{pctTotalBookings >= 0 ? '+' : ''}{pctTotalBookings}%</h1>
                                </div>
                                <h1 className="text-[#7B7B7A]">from last week</h1>
                            </div>
                        </div>

                        {/* Card 2 - Active Bookings */}
                        <div
                            className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row gap-5 justify-center items-center">
                                <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                    <Zap className="w-[24px] h-[24px] text-black" />
                                </div>
                                <div>
                                    <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                        Active Bookings
                                    </h1>
                                    <h1 className="text-[20px] font-[700]">
                                        {displayStatistics.active_bookings || 0}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                                <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${pctActiveBookings >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                    <img src={upArrow} className={`size-[19px] ${pctActiveBookings < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                    <h1>{pctActiveBookings >= 0 ? '+' : ''}{pctActiveBookings}%</h1>
                                </div>
                                <h1 className="text-[#7B7B7A]">from last week</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex xl:flex-row flex-col gap-5 w-full">
                        {/* Card 3 - Total Earned */}
                        <div
                            className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row gap-5 justify-center items-center">
                                <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                    <img src={dollarIcon} alt="earned" />
                                </div>
                                <div>
                                    <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                        Total Earned
                                    </h1>
                                    <h1 className="text-[20px] font-[700]">
                                        Rs. {(displayStatistics.total_earned || 0).toLocaleString()}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                                <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${pctTotalEarned >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                    <img src={upArrow} className={`size-[19px] ${pctTotalEarned < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                    <h1>{pctTotalEarned >= 0 ? '+' : ''}{pctTotalEarned}%</h1>
                                </div>
                                <h1 className="text-[#7B7B7A]">from last week</h1>
                            </div>
                        </div>

                        {/* Card 4 - This Month */}
                        <div
                            className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row gap-5 justify-center items-center">
                                <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                    <Calendar className="w-[24px] h-[24px] text-black" />
                                </div>
                                <div>
                                    <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                        This Month
                                    </h1>
                                    <h1 className="text-[20px] font-[700]">
                                        {displayStatistics.this_month || 0}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                                <div className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${pctThisMonth >= 0 ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'}`}>
                                    <img src={upArrow} className={`size-[19px] ${pctThisMonth < 0 ? 'rotate-180' : ''}`} alt="trend" />
                                    <h1>{pctThisMonth >= 0 ? '+' : ''}{pctThisMonth}%</h1>
                                </div>
                                <h1 className="text-[#7B7B7A]">from last week</h1>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bookings Table Section - matching DashContent styling */}
                <div className="w-full max-w-full overflow-hidden">
                    {/* Bookings table */}
                    <div
                        className="w-full max-w-full h-auto bg-white flex flex-col justify-center items-center rounded-[10px] py-6 md:py-15 px-3 md:px-10"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-col gap-4 w-full">
                            {/* Header and Buttons */}
                            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 w-full">
                                <h1 className="text-[20px] md:text-[24px] font-[700]">
                                    All Bookings
                                </h1>

                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center py-2 px-4">
                                        <img
                                            src={miniSearchIcon}
                                            className="shrink-0"
                                        />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full outline-none bg-transparent placeholder:text-[#7B7B7ACC] border-0 focus:ring-0 text-sm"
                                            placeholder="Search client name, car, etc."
                                        />
                                    </div>

                                    <button onClick={() => setShowFilters(!showFilters)}
                                        className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group">
                                        <img
                                            src={filterIcon}
                                            className="size-[14px] shrink-0 brightness-0 group-hover:brightness-0 group-hover:invert"
                                        />
                                        <span>Filter</span>
                                    </button>

                                    <div className="relative" ref={exportMenuRef}>
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group">
                                            <Download size={14} className="shrink-0" />
                                            <span>Export</span>
                                            <DropdownIcon size={12} />
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
                                <div className="border border-gray-300 rounded-[8px] p-4 bg-gray-50 w-full">
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

                                        {/* Status */}
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
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>

                                        {/* Payment */}
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

                                        {/* From Date */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[12px] font-[600] text-gray-700">From Date</label>
                                            <input
                                                type="date"
                                                value={dateFromFilter}
                                                onChange={(e) => setDateFromFilter(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                            />
                                        </div>

                                        {/* To Date */}
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

                                    {/* Results count */}
                                    <div className="mt-3 text-[12px] text-gray-500">
                                        Showing {filteredBookings.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
                                    </div>
                                </div>
                            )}
                        </div>

                        <AllBookingTable
                            rows={paginatedBookings}
                        />

                        {filteredBookings.length > 0 && (
                            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-2 mt-6 sm:mt-8 px-1">
                                <div className="flex items-center">
                                    <span className="mr-2 sm:mr-3 text-[#00000080] text-[13px] sm:text-[15px]">Results per page</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                        className="rounded px-2 sm:px-3 py-2 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border border-[#BEBEBE] w-[70px] sm:w-[90px] h-[36px] sm:h-[40px] focus:outline-none"
                                    >
                                        {perPageOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="size-[36px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 flex-shrink-0"
                                        aria-label="Previous page"
                                    >
                                        {'<'}
                                    </button>

                                    {getPageNumbers().map((num, i) =>
                                        num === "..." ? (
                                            <span key={`dots-${i}`} className="px-1 sm:px-2">...</span>
                                        ) : (
                                            <button
                                                key={`p-${num}`}
                                                className={`size-[36px] sm:size-[40px] rounded-[4px] text-[14px] sm:text-[16px] font-[600] flex-shrink-0 ${
                                                    currentPage === num
                                                        ? "bg-white border-2 border-[#0955AC] text-[#0955AC]"
                                                        : "bg-[#F4F3F3]"
                                                }`}
                                                onClick={() => setCurrentPage(num)}
                                                aria-current={currentPage === num ? "page" : undefined}
                                            >
                                                {num}
                                            </button>
                                        )
                                    )}

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="size-[36px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 flex-shrink-0"
                                        aria-label="Next page"
                                    >
                                        {'>'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorAllBookings;