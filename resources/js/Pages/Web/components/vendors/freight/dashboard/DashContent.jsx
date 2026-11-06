import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePage } from "@inertiajs/react";
import {
    Search,
    Settings,
    Bell,
    DollarSign,
    CalendarDays,
    Filter,
    ChevronDown,
    ChevronUp,
    ArrowUp,
    Clock,
    Building2,
    Package,
    Boxes,
    Users,
    RefreshCw,
    AlertCircle,
    Download,
    ChevronDown as DropdownIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import dollarIcon from "../../../../assets/vendors/dashboard/icons/dollarIcon.svg";
import carIcon from "../../../../assets/vendors/dashboard/icons/carIcon.svg";
import icon from "../../../../assets/vendors/dashboard/icons/icon.svg";
import icon2 from "../../../../assets/vendors/dashboard/icons/icon2.svg";
import bookingIcon from "../../../../assets/vendors/dashboard/icons/bookingIcon.svg";
import wheelIcon from "../../../../assets/vendors/dashboard/icons/wheelIcon.svg";
import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import BookingOverviewBarChart from "./BookingOverviewBarChart";
import EarningSummaryChart from "./EarningSummaryChart";
import RealStatusPieChart from "./RealStatusPieChart";
import CarBookingTable from "./CarBookingTable";

import car from "../../../../assets/vendors/dashboard/icons/car.svg";
import date from "../../../../assets/vendors/dashboard/icons/date.svg";
import clock from "../../../../assets/vendors/dashboard/icons/clock.svg";

import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";

import car1 from "../../../../assets/vendors/dashboard/icons/car1.svg";
// import car2 from "../../../../assets/vendors/dashboard/icons/car2.svg";
import car3 from "../../../../assets/vendors/dashboard/icons/car3.svg";

import cal from "../../../../assets/vendors/dashboard/icons/cal.svg";

import UserDropdown from "../../UserDropdown";

const carTypes = [
    { name: "Hatchback", percent: 45, img: car1 },
    { name: "SUV", percent: 75, img: car3 },
    { name: "Hatchback", percent: 15, img: car1 },
    { name: "SUV", percent: 75, img: car3 },
    { name: "SUV", percent: 75, img: car3 },
    { name: "SUV", percent: 45, img: car3 },
];

const DashContent = () => {
    const { auth, freightStats } = usePage().props;
    const user = auth?.user;
    const totalUnits = Number(freightStats?.totalUnits ?? 0);

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Freight bookings filter state
    const [showFreightFilters, setShowFreightFilters] = useState(false);
    const [showFreightExportMenu, setShowFreightExportMenu] = useState(false);
    const [freightSearchQuery, setFreightSearchQuery] = useState("");
    const [freightStatusFilter, setFreightStatusFilter] = useState("All");
    const [freightPaymentFilter, setFreightPaymentFilter] = useState("All");
    const [freightDateFromFilter, setFreightDateFromFilter] = useState("");
    const [freightDateToFilter, setFreightDateToFilter] = useState("");
    const freightExportMenuRef = useRef(null);

    // Freight pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Mock bookings data - replace with real data fetching
    const [allBookings] = useState([
        {
            id: "FR001",
            createdAt: "2025-03-10",
            vendor: "John Smith",
            company: "Global Freight Ltd",
            unit: "Container 20ft",
            term: "2 months",
            startDate: "2025-03-15",
            endDate: "2025-05-15",
            rate: "LKR 45,000/mo",
            paymentStatus: "Paid",
            status: "Active"
        },
        {
            id: "FR002",
            createdAt: "2025-03-09",
            vendor: "Sarah Wilson",
            company: "Ocean Logistics",
            unit: "Container 40ft",
            term: "1 month",
            startDate: "2025-03-12",
            endDate: "2025-04-12",
            rate: "LKR 75,000/mo",
            paymentStatus: "Pending",
            status: "Pending"
        },
        {
            id: "FR003",
            createdAt: "2025-03-08",
            vendor: "Mike Johnson",
            company: "Express Cargo",
            unit: "Container 20ft",
            term: "3 months",
            startDate: "2025-03-10",
            endDate: "2025-06-10",
            rate: "LKR 42,000/mo",
            paymentStatus: "Paid",
            status: "Completed"
        }
    ]);

    const [bookings, setBookings] = useState(allBookings);

    // Apply filters to bookings
    const applyFilters = useCallback(() => {
        let filtered = [...allBookings];

        // Search filter
        if (freightSearchQuery.trim()) {
            const searchTerm = freightSearchQuery.toLowerCase();
            filtered = filtered.filter(booking => 
                booking.id.toLowerCase().includes(searchTerm) ||
                booking.vendor.toLowerCase().includes(searchTerm) ||
                booking.company.toLowerCase().includes(searchTerm) ||
                booking.unit.toLowerCase().includes(searchTerm)
            );
        }

        // Status filter
        if (freightStatusFilter !== "All") {
            filtered = filtered.filter(booking => booking.status === freightStatusFilter);
        }

        // Payment status filter
        if (freightPaymentFilter !== "All") {
            filtered = filtered.filter(booking => booking.paymentStatus === freightPaymentFilter);
        }

        // Date range filters
        if (freightDateFromFilter) {
            filtered = filtered.filter(booking => 
                new Date(booking.createdAt) >= new Date(freightDateFromFilter)
            );
        }

        if (freightDateToFilter) {
            filtered = filtered.filter(booking => 
                new Date(booking.createdAt) <= new Date(freightDateToFilter)
            );
        }

        setBookings(filtered);
    }, [allBookings, freightSearchQuery, freightStatusFilter, freightPaymentFilter, freightDateFromFilter, freightDateToFilter]);

    // Apply filters whenever filter values change
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // Reset page when filters update booking set
    useEffect(() => {
        setCurrentPage(1);
    }, [bookings]);

    // Reset page when page size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const totalPages = Math.max(1, Math.ceil(bookings.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value, 10));
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 2) {
            return [1, 2, 3, 4];
        }

        if (currentPage >= totalPages - 1) {
            return [totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (freightExportMenuRef.current && !freightExportMenuRef.current.contains(event.target)) {
                setShowFreightExportMenu(false);
            }
        };

        if (showFreightExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFreightExportMenu]);

    // Reset freight bookings filters
    const handleResetFreightFilters = useCallback(() => {
        setFreightSearchQuery("");
        setFreightStatusFilter("All");
        setFreightPaymentFilter("All");
        setFreightDateFromFilter("");
        setFreightDateToFilter("");
        // Reset will be automatically applied via useEffect
    }, []);

    // Export freight bookings to CSV
    const exportFreightToCSV = () => {
        console.log("Exporting to CSV...", bookings);
        if (!bookings.length) {
            alert("No data to export");
            return;
        }

        try {
            const csvContent = [
                ["Booking ID", "Booking Date", "Client Name", "Company", "Unit", "Term", "Start Date", "End Date", "Rate", "Payment Status", "Status"],
                ...bookings.map((booking) => [
                    booking.id,
                    booking.createdAt,
                    booking.vendor,
                    booking.company,
                    booking.unit,
                    booking.term,
                    booking.startDate,
                    booking.endDate,
                    booking.rate,
                    booking.paymentStatus,
                    booking.status,
                ]),
            ]
                .map((row) => row.map((cell) => `"${cell}"`).join(","))
                .join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `freight-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowFreightExportMenu(false);
            console.log("CSV export completed");
        } catch (error) {
            console.error("CSV export error:", error);
            alert("Error exporting to CSV: " + error.message);
        }
    };

    // Export freight bookings to PDF
    const exportFreightToPDF = () => {
        console.log("Exporting to PDF...", bookings);
        if (!bookings.length) {
            alert("No data to export");
            return;
        }

        try {
            const doc = new jsPDF({ orientation: "landscape" });
            const data = bookings.map((booking) => [
                booking.id,
                booking.createdAt,
                booking.vendor,
                booking.company,
                booking.unit,
                booking.term,
                booking.startDate,
                booking.endDate,
                booking.rate,
                booking.paymentStatus,
                booking.status,
            ]);

            const headers = [["Booking ID", "Booking Date", "Client Name", "Company", "Unit", "Term", "Start Date", "End Date", "Rate", "Payment Status", "Status"]];

            doc.setFontSize(16);
            doc.text("Freight Bookings Report", 14, 10);
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
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, pageHeight - 10);
                }
            });

            doc.save(`freight-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
            setShowFreightExportMenu(false);
            console.log("PDF export completed");
        } catch (error) {
            console.error("PDF export error:", error);
            alert("Error exporting to PDF: " + error.message);
        }
    };

    // Export freight bookings to XLSX
    const exportFreightToXLSX = () => {
        console.log("Exporting to XLSX...", bookings);
        try {
            if (!bookings.length) {
                alert("No data to export");
                return;
            }

            const data = bookings.map((booking) => ({
                "Booking ID": booking.id,
                "Booking Date": booking.createdAt,
                "Client Name": booking.vendor,
                "Company": booking.company,
                "Unit": booking.unit,
                "Term": booking.term,
                "Start Date": booking.startDate,
                "End Date": booking.endDate,
                "Rate": booking.rate,
                "Payment Status": booking.paymentStatus,
                "Status": booking.status,
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Freight Bookings");
            XLSX.writeFile(workbook, `freight-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
            setShowFreightExportMenu(false);
            console.log("XLSX export completed");
        } catch (error) {
            console.error("Error exporting to XLSX:", error);
            alert("Error exporting to XLSX: " + error.message);
        }
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header section */}
            <div className="flex xl:flex-row flex-col gap-5 justify-between items-center">
                <h1 className="figtree text-[28px] md:text-[35px] font-[700]">
                    Freight Dashboard
                </h1>
                {/* <div className="flex flex-row gap-5">
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={search} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={settings} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={bell} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={proPic} />
                    </div>

                    <div className="figtree flex flex-col justify-center items-start">
                        <h1 className="text-[20px] font-[700]">{user?.name || 'Service Provider'}</h1>
                        <h1 className="text-[16px] font-[600] text-[#7B7B7A]">
                            Service Provider
                        </h1>
                    </div>
                </div> */}
                {/* <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown
                        settingsRoute={route("freight.settingsPage")}
                    />
                </div> */}
            </div>
            {/* end of header section */}

            <div className="flex flex-col gap-5 py-10">
                <div className="flex flex-col gap-5">
                    {/* mini left section */}
                    <div className="flex flex-col gap-5 w-full">
                        {/* mini 4 cards */}
                        <div className="flex flex-col gap-5">
                            <div className="flex xl:flex-row flex-col gap-5 xl:w-full">
                                {/* card 1 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <img src={dollarIcon} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Total Revenue
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                LKR 8,450
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="xl:w-[81px] xl:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
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
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <img src={bookingIcon} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Active Bookings
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                350
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="xl:w-[81px] xl:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
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
                            </div>
                            <div className="flex xl:flex-row flex-col gap-5 w-full">
                                {/* card 3 */}
                                <div
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <img src={wheelIcon} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Occupied Units
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                24 Units
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="xl:w-[81px] xl:h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
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
                                    className="xl:min-w-[300px] w-full xl:h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-5 justify-center items-center">
                                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                            <img src={carIcon} />
                                        </div>
                                        <div>
                                            <h1 className="text-[12px] md:text-[16px] font-[500] text-[#7B7B7A]">
                                                Total Units
                                            </h1>
                                            <h1 className="text-[22px] md:text-[26px] font-[700]">
                                                {totalUnits} Units
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end text-[10px] md:text-[14px] font-[500]">
                                        <div className="xl:w-[81px] xl:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
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
                            </div>
                        </div>
                        {/* end of 4 mini cards */}

                        {/* booking chart */}
                        <div
                            className="w-full xl:min-w-[730px] h-auto bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] py-10 px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            {/* Booking Overview header and dropdown */}
                            <div className="flex flex-col xl:flex-row items-center justify-between w-full">
                                <h1 className="text-[24px] font-[700] mb-2 xl:mb-0">
                                    Booking Overview
                                </h1>
                                <div className="xl:w-[113px] xl:h-[33px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3 p-2">
                                    <h1 className="text-[#00000080] font-[600] text-[14px]">
                                        This Year
                                    </h1>
                                    <img src={miniDownArrow} />
                                </div>
                            </div>
                            {/* Booking Overview Bar Chart */}
                            {isMobile ? (
                                <div className="flex flex-col gap-2 w-full">
                                    {[
                                        { name: "Jan", bookings: 450 },
                                        { name: "Feb", bookings: 670 },
                                        { name: "Mar", bookings: 540 },
                                        { name: "Apr", bookings: 900 },
                                        { name: "May", bookings: 800 },
                                        { name: "Jun", bookings: 200 },
                                        { name: "Jul", bookings: 340 },
                                        { name: "Aug", bookings: 859 },
                                        { name: "Sep", bookings: 670 },
                                        { name: "Oct", bookings: 570 },
                                        { name: "Nov", bookings: 400 },
                                        { name: "Dec", bookings: 900 },
                                    ].map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
                                        >
                                            <span className="font-medium text-gray-700">
                                                {item.name}
                                            </span>
                                            <span className="font-bold text-blue-600">
                                                {item.bookings} bookings
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <BookingOverviewBarChart />
                            )}
                        </div>

                        <div
                            className="w-full xl:min-w-[730px] min-h-[381px] bg-[#FFFFFF] rounded-[10px] py-10 px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col xl:flex-row items-center justify-between mb-12 w-full">
                                <h1 className="text-[24px] font-[700] mb-2 xl:mb-0">
                                    Earning Summary
                                </h1>
                                <div className="xl:w-[132px] xl:h-[33px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3 p-2">
                                    <h1 className="text-[#00000080] font-[600] text-[14px]">
                                        Last 8 monts
                                    </h1>
                                    <img src={miniDownArrow} />
                                </div>
                            </div>
                            {isMobile ? (
                                <div className="flex flex-col gap-2">
                                    {[
                                        { name: "Jan", value: 5000 },
                                        { name: "Feb", value: 7000 },
                                        { name: "Mar", value: 6000 },
                                        { name: "Apr", value: 23456 },
                                        { name: "May", value: 8000 },
                                        { name: "Jun", value: 4000 },
                                        { name: "Jul", value: 9000 },
                                        { name: "Aug", value: 12000 },
                                        { name: "Sep", value: 10000 },
                                        { name: "Oct", value: 9500 },
                                        { name: "Nov", value: 15000 },
                                        { name: "Dec", value: 21000 },
                                    ].map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
                                        >
                                            <span className="font-medium text-gray-700">
                                                {item.name}
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
                                <EarningSummaryChart />
                            )}
                        </div>
                    </div>
                </div>

                {/* mini right section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full items-start">
                        <div
                            className="w-full xl:min-h-[427px] bg-[#FFFFFF] rounded-[10px] py-5 px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex xl:flex-row flex-col items-center justify-between w-full">
                                <h1 className="text-[24px] font-[700]">
                                    Real Status
                                </h1>
                                <div className="xl:w-[113px] xl:h-[33px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3 p-2">
                                    <h1 className="text-[#00000080] font-[600] text-[14px]">
                                        This Week
                                    </h1>
                                    <img src={miniDownArrow} />
                                </div>
                            </div>
                            {isMobile ? (
                                <div className="flex flex-col gap-2 mt-4">
                                    {[
                                        {
                                            name: "Hired",
                                            value: 46,
                                            color: "#3DD0FF",
                                        },
                                        {
                                            name: "Pending",
                                            value: 27,
                                            color: "#0955AC",
                                        },
                                        {
                                            name: "Cancelled",
                                            value: 14,
                                            color: "#C4C4C4",
                                        },
                                    ].map((item, index) => {
                                        const total = 46 + 27 + 14;
                                        const percent = Math.round(
                                            (item.value / total) * 100
                                        );
                                        return (
                                            <div
                                                key={index}
                                                className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-4 h-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                item.color,
                                                        }}
                                                    ></span>
                                                    <span className="font-medium text-gray-700">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-gray-800">
                                                    {percent}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <RealStatusPieChart />
                            )}
                        </div>

                        {/* Reminder section  */}
                        <div
                            className="w-full xl:min-h-[427px] bg-[#FFFFFF] rounded-[10px] py-5 px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row items-center justify-between w-full">
                                <h1 className="text-[24px] font-[700]">
                                    Reminders
                                </h1>
                                <div className="w-[39px] h-[33px] bg-[#D9D9D94F] rounded-[6px] flex justify-center items-center gap-3 text-[#00000080] font-[600] text-[30px]">
                                    +
                                </div>
                            </div>
                            <div className="py-10 flex flex-col justify-center items-center gap-2">
                                <div className="w-full xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                                    <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                        !
                                    </div>
                                    <h1 className="text-[14px] font-[500] xl:w-[199px]">
                                        Update the car rental plans for the
                                        upcoming sessions.
                                    </h1>
                                </div>
                                <div className="w-full xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                                    <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                        !
                                    </div>
                                    <h1 className="text-[14px] font-[500] xl:w-[199px]">
                                        Update the car rental plans for the
                                        upcoming sessions.
                                    </h1>
                                </div>
                                <div className="w-full xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                                    <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                        !
                                    </div>
                                    <h1 className="text-[14px] font-[500] xl:w-[199px]">
                                        Update the car rental plans for the
                                        upcoming sessions.
                                    </h1>
                                </div>
                            </div>
                        </div>
                        {/* end */}
                </div>

                {/* car booking section */}

                <div
                    className="w-full max-w-full h-auto bg-white flex flex-col justify-center items-center rounded-[10px] py-6 md:py-15 px-3 md:px-10"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-col gap-4 w-full">
                        {/* Header with Search, Filter, Export */}
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 w-full">
                            <h1 className="text-[20px] md:text-[24px] font-[700]">
                                Freight Clients
                            </h1>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center py-2 px-4">
                                    <Search size={16} className="shrink-0" />
                                    <input
                                        type="text"
                                        value={freightSearchQuery}
                                        onChange={(e) => setFreightSearchQuery(e.target.value)}
                                        className="w-full outline-none bg-transparent placeholder:text-[#7B7B7ACC] border-0 focus:ring-0 text-sm ml-2"
                                        placeholder="Search client name, company, etc."
                                    />
                                </div>

                                <button onClick={() => setShowFreightFilters(!showFreightFilters)}
                                    className="w-full lg:w-auto xl:w-[115px] xl:h-[35px] text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white transition font-[500] text-[14px] border border-gray-300">
                                    <Filter size={14} className="shrink-0" />
                                    <span>Filter</span>
                                </button>

                                <div className="relative" ref={freightExportMenuRef}>
                                    <button
                                        onClick={() => setShowFreightExportMenu(!showFreightExportMenu)}
                                        className="w-full lg:w-auto xl:w-[115px] xl:h-[35px] text-gray-700 rounded-[6px] flex flex-row items-center justify-center gap-2 py-2 px-4 hover:bg-[#0955AC] hover:text-white transition font-[500] text-[14px] border border-gray-300">
                                        <Download size={14} className="shrink-0" />
                                        <span>Export</span>
                                        <DropdownIcon size={12} />
                                    </button>
                                    {showFreightExportMenu && (
                                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-[6px] shadow-lg z-50">
                                            <button
                                                onClick={exportFreightToCSV}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                            >
                                                Export to CSV
                                            </button>
                                            <button
                                                onClick={exportFreightToPDF}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 font-[500] text-[14px] border-b border-gray-200"
                                            >
                                                Export to PDF
                                            </button>
                                            <button
                                                onClick={exportFreightToXLSX}
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
                        {showFreightFilters && (
                            <div className="border border-gray-300 rounded-[8px] p-4 bg-gray-50 w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-[600] text-[16px]">Filters</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleResetFreightFilters}
                                            className="px-3 py-2 text-[14px] bg-white border border-gray-300 rounded-[6px] text-gray-700 hover:bg-[#0955AC] hover:text-white hover:border-[#0955AC] transition font-[500]"
                                        >
                                            Reset Filters
                                        </button>
                                        <button
                                            onClick={() => setShowFreightFilters(false)}
                                            className="text-gray-500 hover:text-gray-700 text-[24px] font-bold"
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
                                            value={freightStatusFilter}
                                            onChange={(e) => setFreightStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        >
                                            <option value="All">All</option>
                                            <option value="Active">Active</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Payment Status */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">Payment Status</label>
                                        <select
                                            value={freightPaymentFilter}
                                            onChange={(e) => setFreightPaymentFilter(e.target.value)}
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
                                            value={freightDateFromFilter}
                                            onChange={(e) => setFreightDateFromFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        />
                                    </div>

                                    {/* To Date */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[12px] font-[600] text-gray-700">To Date</label>
                                        <input
                                            type="date"
                                            value={freightDateToFilter}
                                            onChange={(e) => setFreightDateToFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="py-10 w-full">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-auto">
                                {/* Table Header */}
                                <div className="grid grid-cols-8 bg-[#D8E4F2] min-h-[48px] items-center rounded-[8px] text-[14px] font-[600] px-12 py-3 gap-x-6 min-w-[1200px]">
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Booking ID</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Booking Date</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Client Name</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Company / Unit</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Term</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Dates</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center ml-10">
                                        <h1>Payment</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center">
                                        <h1>Status</h1>
                                        <div className="flex flex-col justify-center items-center">
                                            <ChevronUp className="w-[6px] h-[10px]" />
                                            <ChevronDown className="w-[6px] h-[10px]" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {bookings.length === 0 ? (
                                        <div className="py-10 flex flex-col items-center justify-center h-64 text-gray-500">
                                            <Package size={48} className="mb-4 text-gray-400" />
                                            <span className="text-lg font-medium">No bookings found</span>
                                            <span className="text-sm text-gray-400">Your freight bookings will appear here</span>
                                        </div>
                                    ) : (
                                        paginatedBookings.map((booking, index) => (
                                            <div
                                                key={booking.id}
                                                className={`grid grid-cols-8 min-h-[58px] items-center rounded-[8px] text-[12px] px-12 py-3 gap-x-6 min-w-[1200px] ${
                                                    index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                                                }`}
                                            >
                                                <div className="font-[600] text-[#0955AC]">
                                                    {booking.id}
                                                </div>
                                                <div className="text-[#333333]">
                                                    {booking.createdAt}
                                                </div>
                                                <div className="text-[#333333]">
                                                    {booking.vendor}
                                                </div>
                                                <div className="text-[#333333]">
                                                    <div className="font-[600]">{booking.company}</div>
                                                    <div className="text-[#7B7B7A] text-[10px]">{booking.unit}</div>
                                                </div>
                                                <div className="text-[#333333]">
                                                    {booking.term}
                                                </div>
                                                <div className="text-[#333333]">
                                                    <div className="text-[10px] text-[#7B7B7A]">Start: {booking.startDate}</div>
                                                    <div className="text-[10px] text-[#7B7B7A]">End: {booking.endDate}</div>
                                                </div>
                                                <div className="ml-10">
                                                    <div className="font-[600] text-[#333333]">{booking.rate}</div>
                                                    <div className={`text-[10px] font-[500] ${
                                                        booking.paymentStatus === "Paid" ? "text-green-600" : "text-orange-600"
                                                    }`}>
                                                        {booking.paymentStatus}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-[500] ${
                                                        booking.status === "Active" ? "bg-green-100 text-green-800" :
                                                        booking.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                                        booking.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                                        "bg-red-100 text-red-800"
                                                    }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {bookings.length === 0 ? (
                                    <div className="py-10 flex flex-col items-center justify-center h-64 text-gray-500">
                                        <Package size={48} className="mb-4 text-gray-400" />
                                        <span className="text-lg font-medium">No bookings found</span>
                                        <span className="text-sm text-gray-400">Your freight bookings will appear here</span>
                                    </div>
                                ) : (
                                    paginatedBookings.map((booking, index) => (
                                        <div key={booking.id} className="bg-white border border-gray-200 rounded-[8px] p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-[600] text-[#0955AC] text-[16px]">
                                                    {booking.id}
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-[500] ${
                                                    booking.status === "Active" ? "bg-green-100 text-green-800" :
                                                    booking.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                                    booking.status === "Completed" ? "bg-blue-100 text-blue-800" :
                                                    "bg-red-100 text-red-800"
                                                }`}>
                                                    {booking.status}
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-[14px]">
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Client:</span>
                                                    <span className="font-[500]">{booking.vendor}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Company:</span>
                                                    <span className="font-[500]">{booking.company}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Unit:</span>
                                                    <span className="font-[500]">{booking.unit}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Rate:</span>
                                                    <span className="font-[600]">{booking.rate}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Payment:</span>
                                                    <span className={`font-[500] ${
                                                        booking.paymentStatus === "Paid" ? "text-green-600" : "text-orange-600"
                                                    }`}>
                                                        {booking.paymentStatus}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[#7B7B7A]">Period:</span>
                                                    <span className="text-[12px]">{booking.startDate} to {booking.endDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {bookings.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-8 py-4">
                                    <div className="flex items-center">
                                        <span className="mr-3 text-[#00000080] text-[14px] sm:text-[15px]">
                                            Results per page
                                        </span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={handleItemsPerPageChange}
                                            className="rounded px-3 py-1 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[80px] h-[36px] focus:outline-none"
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="text-lg">&#60;</span>
                                        </button>

                                        {getPageNumbers().map((pageNumber) => (
                                            <button
                                                key={pageNumber}
                                                className={`px-3 py-1 text-[14px] sm:text-[16px] font-[600] rounded-[4px] size-[36px] bg-[#F4F3F3] ${
                                                    currentPage === pageNumber
                                                        ? "text-[#0955AC] border-[2px] border-[#0955AC]"
                                                        : "text-black"
                                                }`}
                                                onClick={() => goToPage(pageNumber)}
                                            >
                                                {pageNumber}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="text-lg">&#62;</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* end */}

                <div className="flex flex-col xl:flex-row gap-5 justify-between">
                    <div
                        className="w-full xl:min-h-[858px] bg-[#FFFFFF] rounded-[10px] px-5 md:px-10 py-5 md:py-10"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row justify-between items-center">
                            <h1 className="text-[20px] md:text-[24px] font-[700]">
                                Car types
                            </h1>
                            <h1 className="text-[20px] md:text-[24px] font-[700]">
                                ...
                            </h1>
                        </div>

                        <div className="mt-5 md:mt-10 flex flex-col gap-3 md:gap-5">
                            {carTypes.map((type, idx) => (
                                <div
                                    key={idx}
                                    className="w-full h-auto md:h-[107px] border-[1px] border-[#00000080] rounded-[9px] flex flex-col sm:flex-row"
                                >
                                    <img
                                        src={type.img}
                                        className="h-auto md:h-[107px] w-full sm:w-[172px]"
                                    />
                                    <div className="flex flex-col justify-center gap-2 md:gap-3 w-full px-3 md:px-5 py-3">
                                        <div className="flex flex-row justify-between items-center text-[12px] md:text-[15px] font-[500]">
                                            <h1 className="text-[#00000080]">
                                                {type.name}
                                            </h1>
                                            <h1 className="pr-3 md:pr-5">
                                                {type.percent}%
                                            </h1>
                                        </div>
                                        <div className="w-full h-[20px] rounded-[4px] bg-[#D8E4F2] relative overflow-hidden">
                                            <div
                                                className="h-full rounded-[4px] absolute top-0 left-0"
                                                style={{
                                                    width: `${type.percent}%`,
                                                    backgroundColor:
                                                        type.percent <= 20
                                                            ? "#F51D1D"
                                                            : "#0955AC",
                                                    transition: "width 0.5s",
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        className="w-full xl:min-h-[858px] bg-[#0F0F0F08] rounded-[10px] px-5 md:px-10 py-5 md:py-10"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    >
                        <div className="flex flex-row justify-between items-center">
                            <h1 className="text-[20px] md:text-[24px] font-[700]">
                                Recent Activities
                            </h1>
                            <h1 className="text-[20px] md:text-[24px] font-[700]">
                                ...
                            </h1>
                        </div>
                        <h1 className="text-[16px] md:text-[20px] font-[600] text-[#0F0F0F80] py-3">
                            Today
                        </h1>

                        <div className="flex flex-row justify-center items-start gap-5 md:gap-10">
                            <div className="flex flex-col items-center py-5">
                                <div className="size-[40px] md:size-[60px] bg-[#FFFFFF] rounded-full flex justify-center items-center">
                                    <img src={cal} />
                                </div>
                                <div className="w-[2px] h-[36px] md:h-[54px] bg-[#00000054]"></div>
                                <div className="size-[40px] md:size-[60px] bg-[#FFFFFF] rounded-full flex justify-center items-center">
                                    <img src={icon} />
                                </div>
                            </div>
                            <div className="flex flex-col py-5 gap-5 md:gap-10 text-[16px] md:text-[20px] font-[700]">
                                <div>
                                    <h1>
                                        Alice Johnson completed a booking for
                                        Toyota Corolla (KX 2345)
                                    </h1>
                                    <h1 className="font-[600] text-[#0F0F0F80]">
                                        10:45 AM
                                    </h1>
                                </div>
                                <div>
                                    <h1>
                                        Bob Smith's booking for Toyota Corolla
                                        (KX 2345) is pending payment
                                    </h1>
                                    <h1 className="font-[600] text-[#0F0F0F80]">
                                        15:45 PM
                                    </h1>
                                </div>
                            </div>
                        </div>

                        <h1 className="text-[16px] md:text-[20px] font-[600] text-[#0F0F0F80] py-3">
                            Yesterday
                        </h1>
                        <div className="flex flex-row justify-center items-start gap-5 md:gap-10">
                            <div className="flex flex-col items-center py-5">
                                <div className="size-[40px] md:size-[60px] bg-[#FFFFFF] rounded-full flex justify-center items-center">
                                    <img src={icon2} />
                                </div>
                                <div className="w-[2px] h-[36px] md:h-[54px] bg-[#00000054]"></div>
                                <div className="size-[40px] md:size-[60px] bg-[#FFFFFF] rounded-full flex justify-center items-center">
                                    <img src={carIcon} />
                                </div>
                                <div className="w-[2px] h-[36px] md:h-[54px] bg-[#00000054]"></div>
                                <div className="size-[40px] md:size-[60px] bg-[#FFFFFF] rounded-full flex justify-center items-center">
                                    <img src={icon} />
                                </div>
                            </div>
                            <div className="flex flex-col py-5 gap-5 md:gap-10 text-[16px] md:text-[20px] font-[700]">
                                <div>
                                    <h1>
                                        Alice Johnson completed a booking for
                                        Toyota Corolla (KX 2345)
                                    </h1>
                                    <h1 className="font-[600] text-[#0F0F0F80]">
                                        10:45 AM
                                    </h1>
                                </div>
                                <div>
                                    <h1>
                                        Bob Smith's booking for Toyota Corolla
                                        (KX 2345) is pending payment
                                    </h1>
                                    <h1 className="font-[600] text-[#0F0F0F80]">
                                        15:45 PM
                                    </h1>
                                </div>
                                <div>
                                    <h1>
                                        Bob Smith's booking for Toyota Corolla
                                        (KX 2345) is pending payment
                                    </h1>
                                    <h1 className="font-[600] text-[#0F0F0F80]">
                                        15:45 PM
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashContent;
