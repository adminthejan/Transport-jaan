import React, { useState, useRef, useEffect } from "react";
import { usePage, Link } from "@inertiajs/react";
import { Download, ChevronDown as DropdownIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../../assets/vendors/dashboard/logOutLogo.svg"; // Add this import
import { ChevronDown } from "lucide-react";
import dollarIcon from "../../../../assets/vendors/dashboard/icons/dollarIcon.svg";
import carIcon from "../../../../assets/vendors/dashboard/icons/carIcon.svg";
import icon from "../../../../assets/vendors/dashboard/icons/icon.svg";
import icon2 from "../../../../assets/vendors/dashboard/icons/icon2.svg";
import bookingIcon from "../../../../assets/vendors/dashboard/icons/bookingIcon.svg";
import wheelIcon from "../../../../assets/vendors/dashboard/icons/wheelIcon.svg";
import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";
import BookingOverviewBarChart from "./BookingOverviewBarChart";
import EarningSummaryChart from "./EarningSummaryChart";
import RealStatusPieChart from "./RealStatusPieChart";
import FlightBookingTable from "./FlightBookingTable";


import UserDropdown from "../../UserDropdown";

import {
    Plane,
    Ticket,
    TicketCheck,
    DollarSign,
    Search as SearchIcon,
    Settings as SettingsIcon,
    Bell as BellIcon,
    Calendar as CalendarIcon,
    Clock as ClockIcon,
    Filter as FilterIcon,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

const STATUS_STYLES = {
    Confirmed: { statusBg: "#D8E4F2", statusBorder: "#0000004D", statusText: "#000000" },
    Completed: { statusBg: "transparent", statusBorder: "#D8E4F2", statusText: "#3B82F6" },
    Pending: { statusBg: "#FFF3C4", statusBorder: "#D4A80099", statusText: "#7A5B00" },
    Cancelled: { statusBg: "#F87171", statusBorder: "#B91C1C", statusText: "#FFFFFF" },
};

const PAYMENT_STYLES = {
    Paid: { paymentColor: "#3B8F314D", paymentBg: "#ACE19957" },
    Pending: { paymentColor: "#FF6060", paymentBg: "#FF60608C" },
    Failed: { paymentColor: "#B91C1C", paymentBg: "#F8717157" },
    Refunded: { paymentColor: "#7B7B7A4D", paymentBg: "#D9D9D957" },
};

const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "-";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const DashContent = () => {
    const { auth, ticketStats, recentBookings, revenueChart, server_error } = usePage().props;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';
    const stats = ticketStats ?? {};
    const bookings = Array.isArray(recentBookings) ? recentBookings : [];
    const revenueSeries = Array.isArray(revenueChart) ? revenueChart : [];

    const [isMobile, setIsMobile] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    // Filter state for Flight Bookings
    const [showFlightFilters, setShowFlightFilters] = useState(false);
    const [flightSearchQuery, setFlightSearchQuery] = useState("");
    const [flightStatusFilter, setFlightStatusFilter] = useState("All");
    const [flightPaymentFilter, setFlightPaymentFilter] = useState("All");
    const [flightDateFromFilter, setFlightDateFromFilter] = useState("");
    const [flightDateToFilter, setFlightDateToFilter] = useState("");

    // Period state for charts
    const [boPeriod, setBoPeriod] = useState("year");
    const [esPeriod, setEsPeriod] = useState("8m");

    // Period options for dropdowns
    const PERIOD_OPTIONS = [
        { label: "Last 3 months", value: "3m" },
        { label: "Last 6 months", value: "6m" },
        { label: "Last 8 months", value: "8m" },
        { label: "Last 12 months", value: "12m" },
        { label: "This Year", value: "year" },
    ];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640); // sm breakpoint
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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

    // Helper function to apply period filtering
    const applyPeriodToSeries = (series, period) => {
        const source = Array.isArray(series) ? series : [];
        if (period === "year") return source;
        const months = Number(String(period).replace("m", ""));
        if (!Number.isFinite(months) || months <= 0) return source;
        return source.slice(-months);
    };

    // Booking counts per month, derived from the recent bookings we do have,
    // bucketed against the same 6 months the backend gives us revenue for.
    const bookingOverviewData = revenueSeries.map((month) => {
        const count = bookings.filter((b) => {
            const d = b.bookingDate ? new Date(b.bookingDate) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            return d.toLocaleString("en-US", { month: "short" }) === month.name;
        }).length;
        return { name: month.name, bookings: count };
    });

    // Earnings summary comes straight from the backend's 6-month revenue series.
    const earningSummaryData = revenueSeries.map((month) => ({
        name: month.name,
        value: Number(month.revenue ?? 0),
    }));

    // Filtered data based on period selection
    const filteredBookingData = applyPeriodToSeries(bookingOverviewData, boPeriod);
    const filteredEarningsData = applyPeriodToSeries(earningSummaryData, esPeriod);

    // Booking status breakdown, derived from the recent bookings list.
    const statusBreakdown = (() => {
        const total = bookings.length;
        if (total === 0) {
            return [
                { name: "Confirmed", value: 0, color: "#3DD0FF" },
                { name: "Pending", value: 0, color: "#0955AC" },
                { name: "Cancelled", value: 0, color: "#C4C4C4" },
            ];
        }
        const counts = bookings.reduce((acc, b) => {
            const key = b.status === "Completed" ? "Confirmed" : b.status;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return [
            { name: "Confirmed", value: Math.round(((counts.Confirmed || 0) / total) * 100), color: "#3DD0FF" },
            { name: "Pending", value: Math.round(((counts.Pending || 0) / total) * 100), color: "#0955AC" },
            { name: "Cancelled", value: Math.round(((counts.Cancelled || 0) / total) * 100), color: "#C4C4C4" },
        ];
    })();

    // Export ticket bookings to CSV
    const exportToCSV = () => {
        try {
            const headers = ["Booking ID", "Booking Date", "Client Name", "Type", "Unit", "Route", "Travel Date", "Seats", "Amount", "Payment Status", "Status"];
            const data = filteredFlightBookings.map(booking => [
                booking.id,
                booking.date,
                booking.customer,
                booking.type,
                booking.unitLabel,
                booking.route,
                booking.travelDate,
                booking.seatsLabel,
                booking.price,
                booking.paymentStatus,
                booking.status
            ]);

            const csvContent = [
                headers.join(","),
                ...data.map(row => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `ticket-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
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

    // Export ticket bookings to PDF
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const data = filteredFlightBookings.map(booking => [
                booking.id,
                booking.date,
                booking.customer,
                booking.type,
                booking.unitLabel,
                booking.route,
                booking.travelDate,
                booking.seatsLabel,
                booking.price,
                booking.paymentStatus,
                booking.status
            ]);

            const headers = [["Booking ID", "Booking Date", "Client Name", "Type", "Unit", "Route", "Travel Date", "Seats", "Amount", "Payment Status", "Status"]];

            doc.setFontSize(16);
            doc.text("Ticket Bookings Report", 14, 10);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 18);

            autoTable(doc, {
                head: headers,
                body: data,
                startY: 25,
                margin: { top: 20, right: 10, bottom: 10, left: 10 },
                headStyles: { fillColor: [9, 85, 172], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [230, 240, 250] },
                columnStyles: { 0: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
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

            doc.save(`ticket-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("Error exporting to PDF:", error);
            alert("Error exporting to PDF. Please try again.");
        }
        setShowExportMenu(false);
    };

    // Export ticket bookings to XLSX
    const exportToXLSX = () => {
        try {
            const data = [
                ["Booking ID", "Booking Date", "Client Name", "Type", "Unit", "Route", "Travel Date", "Seats", "Amount", "Payment Status", "Status"]
            ];

            filteredFlightBookings.forEach(booking => {
                data.push([
                    booking.id,
                    booking.date,
                    booking.customer,
                    booking.type,
                    booking.unitLabel,
                    booking.route,
                    booking.travelDate,
                    booking.seatsLabel,
                    booking.price,
                    booking.paymentStatus,
                    booking.status
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ticket Bookings");

            // Auto-size columns
            const colWidths = [
                { wch: 15 }, // Booking ID
                { wch: 15 }, // Booking Date
                { wch: 18 }, // Client Name
                { wch: 10 }, // Type
                { wch: 18 }, // Unit
                { wch: 20 }, // Route
                { wch: 15 }, // Travel Date
                { wch: 15 }, // Seats
                { wch: 12 }, // Amount
                { wch: 15 }, // Payment Status
                { wch: 12 }  // Status
            ];
            worksheet['!cols'] = colWidths;

            XLSX.writeFile(workbook, `ticket-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (error) {
            console.error("Error exporting to XLSX:", error);
            alert("Error exporting to XLSX. Please try again.");
        }
        setShowExportMenu(false);
    };

    // Reset flight filters
    const handleResetFlightFilters = () => {
        setFlightSearchQuery("");
        setFlightStatusFilter("All");
        setFlightPaymentFilter("All");
        setFlightDateFromFilter("");
        setFlightDateToFilter("");
    };

    // Real ticket bookings, mapped from the `recentBookings` prop into the shape
    // the table/exports need (formatted dates, style tokens for status/payment badges).
    const flightBookingsData = bookings.map((b) => {
        const statusStyle = STATUS_STYLES[b.status] || STATUS_STYLES.Confirmed;
        const paymentStyle = PAYMENT_STYLES[b.paymentStatus] || PAYMENT_STYLES.Pending;
        const type = b.bookingType === "train" ? "Train" : "Bus";
        return {
            id: b.id,
            rawId: b.rawId,
            date: formatDisplayDate(b.bookingDate),
            rawDate: b.bookingDate,
            customer: b.clientName,
            customerEmail: b.clientEmail,
            type,
            unitName: b.unitName,
            unitLabel: `${type} · ${b.unitNumber ?? "-"}`,
            route: b.route,
            travelDate: formatDisplayDate(b.travelDate),
            seatsLabel: Array.isArray(b.seats) && b.seats.length ? b.seats.join(", ") : "-",
            passengerCount: b.passengerCount,
            price: `$${Number(b.amount ?? 0).toLocaleString()}`,
            paymentStatus: b.paymentStatus,
            ...paymentStyle,
            status: b.status,
            ...statusStyle,
        };
    });

    // Apply filters to ticket bookings
    const filteredFlightBookings = flightBookingsData.filter((booking) => {
        // Search filter
        const matchesSearch = !flightSearchQuery ||
            booking.id?.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
            booking.customer?.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
            booking.unitName?.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
            booking.route?.toLowerCase().includes(flightSearchQuery.toLowerCase());

        // Status filter
        const matchesStatus = flightStatusFilter === "All" || booking.status?.toLowerCase() === flightStatusFilter.toLowerCase();

        // Payment filter
        const matchesPayment = flightPaymentFilter === "All" || booking.paymentStatus?.toLowerCase() === flightPaymentFilter.toLowerCase();

        // Date filters (against the raw booking date)
        const bookingDate = booking.rawDate ? new Date(booking.rawDate) : null;
        const matchesFromDate = !flightDateFromFilter || (bookingDate && bookingDate >= new Date(flightDateFromFilter));
        const matchesToDate = !flightDateToFilter || (bookingDate && bookingDate <= new Date(flightDateToFilter));

        return matchesSearch && matchesStatus && matchesPayment && matchesFromDate && matchesToDate;
    });

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header section */}
            <div className="flex xl:flex-row flex-col gap-5 justify-between items-center mb-6">
                <h1 className="figtree text-[35px] sm:text-[28px] font-[700] text-center md:text-left">
                    Ticket Booking Dashboard
                </h1>
            </div>
            {/* end of header section */}

            {server_error && (
                <div className="w-full mb-6 px-4 py-3 rounded-[8px] bg-[#FEE2E2] border border-[#F87171] text-[#B91C1C] text-[14px] font-[500]">
                    {server_error}
                </div>
            )}

            {/* === REST OF THE DASHBOARD (UNCHANGED) === */}
            <div className="flex flex-col gap-5">
                {/* Top Section: Cards + Seat Availability */}
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                    {/* card 1 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={dollarIcon} />
                            </div>
                            <div>
                                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                    Total Revenue
                                </h1>
                                <h1 className="text-[20px] font-[700]">
                                    ${Number(stats.totalRevenue ?? 0).toLocaleString()}
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                            <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[19px]"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">
                                from last week
                            </h1>
                        </div>
                    </div>
                    {/* end of card 1 */}

                    {/* card 2 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={bookingIcon} />
                            </div>
                            <div>
                                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                    New Bookings
                                </h1>
                                <h1 className="text-[20px] font-[700]">
                                    {stats.newBookings ?? 0}
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                            <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[19px]"
                                />
                                <h1 className="">+1.73%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">
                                from last week
                            </h1>
                        </div>
                    </div>
                    {/* end of card 2 */}

                    {/* card 3 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={wheelIcon} />
                            </div>
                            <div>
                                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                    Confirmed Bookings
                                </h1>
                                <h1 className="text-[20px] font-[700]">
                                    {stats.confirmedBookings ?? 0} Bookings
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                            <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[19px] rotate-180"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">
                                from last week
                            </h1>
                        </div>
                    </div>
                    {/* end of card 3 */}

                    {/* card 4 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={carIcon} />
                            </div>
                            <div>
                                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                    Total Bookings
                                </h1>
                                <h1 className="text-[20px] font-[700]">
                                    {stats.totalBookings ?? 0} Bookings
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                            <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[19px]"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">
                                from last week
                            </h1>
                        </div>
                    </div>
                    {/* end of card 4 */}

                    {/* card 5 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon2} />
                            </div>
                            <div>
                                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                    Fleet Size
                                </h1>
                                <h1 className="text-[20px] font-[700]">
                                    {stats.fleetCount ?? 0} Units
                                </h1>
                            </div>
                        </div>
                    </div>
                    {/* end of card 5 */}
                </div>

                {/* Bottom Section: Flight Bookings, Overview & Earnings */}
                <div className="flex flex-col gap-10 w-full">
                    {/* Flight Bookings */}
                    <div className="w-full max-w-full overflow-hidden">
                        <div
                            className="w-full max-w-full h-auto bg-[#FFFFFF] rounded-[10px] py-10 px-5 sm:px-10"
                            style={{ boxShadow: "4px 4px 4px #0000001A" }}
                        >
                            <div className="flex flex-col gap-4 w-full">
                                <div className="flex md:flex-row flex-col justify-between">
                                    <h1 className="text-[24px] font-[700]">
                                        Ticket Bookings
                                    </h1>
                                    <div className="flex md:flex-row flex-col gap-3 mt-5 lg:mt-0">
                                        <div className="xl:w-[253px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                                            <SearchIcon className="size-[16px]" />
                                            <input
                                                type="text"
                                                value={flightSearchQuery}
                                                onChange={(e) => setFlightSearchQuery(e.target.value)}
                                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                                placeholder="Search client, unit no., route..."
                                            />
                                        </div>

                                        <button onClick={() => setShowFlightFilters(!showFlightFilters)}
                                            className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group">
                                            <FilterIcon className="size-[14px] shrink-0" />
                                            <span>Filter</span>
                                        </button>

                                        <div className="relative" ref={exportMenuRef}>
                                            <button
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                                className="w-full sm:w-auto min-w-[110px] h-[35px] bg-white border border-gray-300 text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500] text-[14px] group"
                                            >
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
                                {showFlightFilters && (
                                    <div className="border border-gray-300 rounded-[8px] p-4 bg-gray-50 w-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-[600] text-[16px]">Filters</h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleResetFlightFilters}
                                                    className="px-3 py-2 text-[14px] bg-white border border-gray-300 rounded-[6px] text-gray-700 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500]"
                                                >
                                                    Reset Filters
                                                </button>
                                                <button
                                                    onClick={() => setShowFlightFilters(false)}
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
                                                    value={flightStatusFilter}
                                                    onChange={(e) => setFlightStatusFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                >
                                                    <option value="All">All</option>
                                                    <option value="Confirmed">Confirmed</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            {/* Payment */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">Payment</label>
                                                <select
                                                    value={flightPaymentFilter}
                                                    onChange={(e) => setFlightPaymentFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                >
                                                    <option value="All">All</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Failed">Failed</option>
                                                    <option value="Refunded">Refunded</option>
                                                </select>
                                            </div>

                                            {/* From Date */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">From Date</label>
                                                <input
                                                    type="date"
                                                    value={flightDateFromFilter}
                                                    onChange={(e) => setFlightDateFromFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>

                                            {/* To Date */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[12px] font-[600] text-gray-700">To Date</label>
                                                <input
                                                    type="date"
                                                    value={flightDateToFilter}
                                                    onChange={(e) => setFlightDateToFilter(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                                />
                                            </div>
                                        </div>

                                        {/* Results count */}
                                        <div className="mt-3 text-[12px] text-gray-500">
                                            Showing {filteredFlightBookings.length} of {flightBookingsData.length} bookings
                                        </div>
                                    </div>
                                )}
                            </div>
                            <FlightBookingTable bookings={filteredFlightBookings} />
                        </div>
                    </div>

                    {/* Flight Booking Overview */}
                    <div className="overflow-x-auto w-full">
                        <div
                            className="w-full max-w-full mx-auto overflow-auto h-auto bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] py-8 px-3"
                            style={{ boxShadow: "4px 4px 4px #0000001A" }}
                        >
                            <div className="flex flex-col xl:flex-row items-center justify-between mb-12 w-full px-5">
                                <h1 className="text-[24px] font-[700]">
                                    Ticket Booking Overview
                                </h1>
                                <select
                                    value={boPeriod}
                                    onChange={(e) => setBoPeriod(e.target.value)}
                                    className="xl:w-[154px] xl:h-[45px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3 p-2 mt-3 xl:mt-0 text-[14px] focus:outline-none cursor-pointer"
                                >
                                    {PERIOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {isMobile ? (
                                <div className="w-full">
                                    <div className="flex flex-col gap-2">
                                        {filteredBookingData.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {item.name} 2025
                                                </span>
                                                <span className="font-bold text-blue-600">
                                                    {item.bookings} bookings
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <BookingOverviewBarChart data={filteredBookingData} />
                            )}
                        </div>
                    </div>

                    {/* Earnings Summary */}
                    <div className="overflow-x-auto w-full mx-auto">
                        <div
                            className="w-full max-w-full xl:h-[381px] bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] py-10 px-5 sm:px-10"
                            style={{ boxShadow: "4px 4px 4px #0000001A" }}
                        >
                            <div className="flex flex-col xl:flex-row items-center justify-between mb-12 w-full">
                                <h1 className="text-[24px] font-[700]">
                                    Earnings Summary
                                </h1>
                                <select
                                    value={esPeriod}
                                    onChange={(e) => setEsPeriod(e.target.value)}
                                    className="xl:w-[154px] xl:h-[45px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3 p-2 text-[14px] focus:outline-none cursor-pointer"
                                >
                                    {PERIOD_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {isMobile ? (
                                <div className="flex flex-col gap-2">
                                    {filteredEarningsData.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
                                        >
                                            <span className="font-medium text-gray-700">
                                                {item.name} 2025
                                            </span>
                                            <span className="font-bold text-green-600">
                                                $
                                                {Number(
                                                    item.value
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EarningSummaryChart data={filteredEarningsData} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-5 justify-between">
                    <div
                        className="w-full xl:max-w-[420px] h-auto bg-[#FFFFFF] rounded-[10px] px-5 sm:px-10 py-10 flex flex-col gap-5"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                    >
                        <div className="flex flex-row justify-between items-center">
                            <h1 className="text-[24px] font-[700]">
                                Booking Status
                            </h1>
                        </div>
                        <RealStatusPieChart data={statusBreakdown} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashContent;
