import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Download, ChevronDown as DropdownIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import dollarIcon from "../../../assets/vendors/dashboard/icons/dollarIcon.svg";
import carIcon from "../../../assets/vendors/dashboard/icons/carIcon.svg";
import bookingIcon from "../../../assets/vendors/dashboard/icons/bookingIcon.svg";
import wheelIcon from "../../../assets/vendors/dashboard/icons/wheelIcon.svg";
import upArrow from "../../../assets/vendors/dashboard/icons/upArrow.svg";
import miniDownArrow from "../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import BookingOverviewBarChart from "./BookingOverviewBarChart";
import EarningSummaryChart from "./EarningSummaryChart";
import RealStatusPieChart from "./RealStatusPieChart";
import CarBookingTable from "./CarBookingTable";
import RecentActivities from "./RecentActivities";

import car from "../../../assets/vendors/dashboard/icons/car.svg";
import date from "../../../assets/vendors/dashboard/icons/date.svg";
import clock from "../../../assets/vendors/dashboard/icons/clock.svg";

import filterIcon from "../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";

import car1 from "../../../assets/vendors/dashboard/icons/car1.svg";
import car3 from "../../../assets/vendors/dashboard/icons/car3.svg";

import { Link } from "@inertiajs/react";
import UserDropdown from "../../../components/vendors/UserDropdown";

const PERIOD_OPTIONS = [
    { value: "3m", label: "Last 3 months" },
    { value: "6m", label: "Last 6 months" },
    { value: "8m", label: "Last 8 months" },
    { value: "12m", label: "Last 12 months" },
    { value: "year", label: "This Year" },
];

const normalizePeriod = (period) => {
    if (period === "month") return "12m";
    if (["3m", "6m", "8m", "12m", "year"].includes(period)) return period;
    return "year";
};

const applyPeriodToSeries = (series, period) => {
    const source = Array.isArray(series) ? series : [];
    if (period === "year") return source;

    const months = Number(String(period).replace("m", ""));
    if (!Number.isFinite(months) || months <= 0) return source;
    return source.slice(-months);
};

const DashContent = ({
    cards,
    bookingOverview,
    earningSummary,
    realStatus,
    carTypes,
    bookings,
    bookingsMeta,
    filters,
    vendorUser,
    recentActivities, // <— NEW (from controller)
    unreadNotifications = 0, // NEW
    drivers = [], // NEW - drivers list for expired license alerts
}) => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

    // Helper to check if license is expired
    const isLicenseExpired = (expiry) => {
        if (!expiry) return false;
        return new Date(expiry) < new Date();
    };

    // Filter drivers with expired licenses that are not pending review
    const expiredDrivers = (drivers ?? []).filter(r => 
        isLicenseExpired(r.license_expiry) && r.license_review_status !== 'pending_review'
    );

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

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
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
    const [dateFromFilter, setDateFromFilter] = useState("");
    const [dateToFilter, setDateToFilter] = useState("");
    const [boPeriod, setBoPeriod] = useState(normalizePeriod(filters?.bo_period));
    const [esPeriod, setEsPeriod] = useState(normalizePeriod(filters?.es_period));

    useEffect(() => {
        setBoPeriod(normalizePeriod(filters?.bo_period));
        setEsPeriod(normalizePeriod(filters?.es_period));
    }, [filters?.bo_period, filters?.es_period]);

    const normalizedBookings = useMemo(() => {
        if (Array.isArray(bookings)) return bookings;
        if (Array.isArray(bookings?.data)) return bookings.data;
        return [];
    }, [bookings]);

    const parseDateSafe = (value) => {
        if (!value) return null;
        const dateObj = new Date(value);
        if (!Number.isNaN(dateObj.getTime())) return dateObj;

        const normalized = String(value).replace(/,/g, "").trim();
        const retry = new Date(normalized);
        if (!Number.isNaN(retry.getTime())) return retry;

        return null;
    };

    const filteredBookings = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const fromDate = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`) : null;
        const toDate = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null;

        return normalizedBookings.filter((row) => {
            const rowStatus = String(row?.status ?? "");
            const rowPayment = String(row?.paymentStatus ?? "");

            const rowDate = parseDateSafe(row?.date) || parseDateSafe(row?.startDate);

            const haystack = [
                row?.id,
                row?.customer,
                row?.car,
                row?.plate,
                row?.status,
                row?.paymentStatus,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = !query || haystack.includes(query);
            const matchesStatus = statusFilter === "All" || rowStatus.toLowerCase() === statusFilter.toLowerCase();
            const matchesPayment =
                paymentStatusFilter === "All" ||
                rowPayment.toLowerCase() === paymentStatusFilter.toLowerCase();
            const matchesFrom = !fromDate || (rowDate && rowDate >= fromDate);
            const matchesTo = !toDate || (rowDate && rowDate <= toDate);

            return matchesSearch && matchesStatus && matchesPayment && matchesFrom && matchesTo;
        });
    }, [normalizedBookings, searchQuery, statusFilter, paymentStatusFilter, dateFromFilter, dateToFilter]);

    const bookingOverviewDisplay = useMemo(() => {
        return applyPeriodToSeries(bookingOverview, boPeriod);
    }, [bookingOverview, boPeriod]);

    const earningSummaryDisplay = useMemo(() => {
        return applyPeriodToSeries(earningSummary, esPeriod);
    }, [earningSummary, esPeriod]);

    useLayoutEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Export bookings to CSV
    const exportToCSV = () => {
        if (!filteredBookings || filteredBookings.length === 0) {
            alert("No bookings to export");
            return;
        }

        const headers = ["Booking Ref", "Booking Date", "Client Name", "Vehicle", "Plate", "Plan", "Start Date", "End Date", "Payment", "Payment Status", "Status"];
        const data = filteredBookings.map(b => [
            b.id || "",
            b.date || "",
            b.customer || "",
            b.car || "",
            b.plate || "",
            b.duration || "",
            b.startDate || "",
            b.endDate || "",
            b.price || "",
            b.paymentStatus || "",
            b.status || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...data.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `vehicle-bookings-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    // Export bookings to PDF
    const exportToPDF = () => {
        if (!filteredBookings || filteredBookings.length === 0) {
            alert("No bookings to export");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        const data = filteredBookings.map(b => [
            b.id || "",
            b.date || "",
            b.customer || "",
            b.car || "",
            b.plate || "",
            b.duration || "",
            b.startDate || "",
            b.endDate || "",
            b.price || "",
            b.paymentStatus || "",
            b.status || ""
        ]);

        const headers = [["Booking Ref", "Booking Date", "Client Name", "Vehicle", "Plate", "Plan", "Start Date", "End Date", "Payment", "Pay. Status", "Status"]];

        doc.setFontSize(16);
        doc.text("Vehicle Bookings Report", 14, 10);
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
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(9);
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        doc.save(`vehicle-bookings-${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowExportMenu(false);
    };

    // Export bookings to XLSX
    const exportToXLSX = () => {
        try {
            if (!filteredBookings || filteredBookings.length === 0) {
                alert("No bookings to export");
                return;
            }

            const data = [
                ["Booking Ref", "Booking Date", "Client Name", "Vehicle", "Plate", "Plan", "Start Date", "End Date", "Payment", "Payment Status", "Status"],
                ...filteredBookings.map(b => [
                    b.id || "",
                    b.date || "",
                    b.customer || "",
                    b.car || "",
                    b.plate || "",
                    b.duration || "",
                    b.startDate || "",
                    b.endDate || "",
                    b.price || "",
                    b.paymentStatus || "",
                    b.status || ""
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Bookings");

            XLSX.writeFile(workbook, `vehicle-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

    // UserDropdown component handles its own open/close logic

    const computedCarTypes = (carTypes ?? []).map((t) => ({
        name: t.name ?? "Unknown",
        percent: Number(t.percent ?? 0),
        img: (t.name || "").toLowerCase().includes("suv") ? car3 : car1,
    }));

    const fmtMoney = (n) =>
        typeof n === "number"
            ? n.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
              })
            : n;

    return (
        <div className="w-full max-w-full px-3 sm:px-5 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12 overflow-x-hidden">
            {/* Header */}
            <div className="flex md:flex-row flex-col gap-5 justify-between xl:items-start items-start mb-6">
                <h1 className="figtree text-[24px] sm:text-[28px] md:text-[35px] font-[700] text-left break-words">
                    Vehicle Rental Dashboard
                </h1>
            </div>

            {/* License Expired Alert */}
            {expiredDrivers.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3 mb-6">
                    <svg className="flex-shrink-0 mt-0.5 text-red-500" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-semibold text-red-800 text-[14px]">License Expired — Action Required</p>
                        <p className="text-red-700 text-[13px] mt-0.5">The following driver(s) have been deactivated due to an expired license. Submit a renewed license document for admin review to reactivate.</p>
                        <ul className="mt-2 space-y-1">
                            {expiredDrivers.map(r => (
                                <li key={r.id} className="text-red-700 text-[12px] flex flex-wrap items-start gap-2">
                                    <span className="font-semibold">{r.full_name}</span>
                                    <span>— expired {r.license_expiry}</span>
                                    <Link
                                        href="/vendors/drivers"
                                        className="ml-1 text-[11px] px-2 py-0.5 bg-red-100 border border-red-300 rounded text-red-700 hover:bg-red-200 font-semibold inline-block"
                                    >
                                        Renew License
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-5 w-full">
                {/* Top Section: KPI Cards */}
                <div className="flex flex-col xl:flex-row gap-5 w-full xl:items-start">
                    {/* Cards */}
                    <div className="flex flex-col gap-10 w-full">
                        {/* Cards */}
                        <div className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                                {/* Total Revenue */}
                                <div
                                    className="w-full min-h-[91px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-2 md:gap-5 items-center min-w-0 flex-1">
                                        <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center shrink-0">
                                            <img
                                                src={dollarIcon}
                                                className="w-5 md:w-6"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-[12px] md:text-[14px] font-[500] text-[#7B7B7A]">
                                                Total Revenue
                                            </h1>
                                            <h1 className="text-[18px] md:text-[24px] font-[700] leading-tight">
                                                {fmtMoney(
                                                    cards?.totalRevenue ?? 0
                                                )}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 md:gap-2 items-end text-[10px] md:text-[14px] font-[500] shrink-0">
                                        <div className="w-[60px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <img
                                                src={upArrow}
                                                className="size-[14px] md:size-[19px]"
                                            />
                                            <h1 className="text-[10px] md:text-sm">
                                                —
                                            </h1>
                                        </div>
                                        <h1 className="text-[10px] md:text-sm text-[#7B7B7A] hidden md:block">
                                            from last period
                                        </h1>
                                    </div>
                                </div>

                                {/* New Bookings */}
                                <div
                                    className="w-full min-h-[91px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-2 md:gap-5 items-center min-w-0 flex-1">
                                        <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center shrink-0">
                                            <img
                                                src={bookingIcon}
                                                className="w-5 md:w-6"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-[12px] md:text-[14px] font-[500] text-[#7B7B7A]">
                                                New Bookings
                                            </h1>
                                            <h1 className="text-[18px] md:text-[24px] font-[700]">
                                                {cards?.newBookings ?? 0}
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 md:gap-2 items-end text-[10px] md:text-[14px] font-[500] shrink-0">
                                        <div className="w-[60px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <img
                                                src={upArrow}
                                                className="size-[14px] md:size-[19px]"
                                            />
                                            <h1 className="text-[10px] md:text-sm">
                                                —
                                            </h1>
                                        </div>
                                        <h1 className="text-[10px] md:text-sm text-[#7B7B7A] hidden md:block">
                                            from last week
                                        </h1>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                                {/* Rented Cars */}
                                <div
                                    className="w-full min-h-[91px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-2 md:gap-5 items-center min-w-0 flex-1">
                                        <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center shrink-0">
                                            <img
                                                src={wheelIcon}
                                                className="w-5 md:w-6"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-[12px] md:text-[14px] font-[500] text-[#7B7B7A]">
                                                Rented Vehicles
                                            </h1>
                                            <h1 className="text-[18px] md:text-[24px] font-[700]">
                                                {cards?.rentedCars ?? 0} Units
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 md:gap-2 items-end text-[10px] md:text-[14px] font-[500] shrink-0">
                                        <div className="w-[60px] md:w-[81px] h-[22px] md:h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                                            <img
                                                src={upArrow}
                                                className="size-[14px] md:size-[19px] rotate-180"
                                            />
                                            <h1 className="text-[10px] md:text-sm">
                                                —
                                            </h1>
                                        </div>
                                        <h1 className="text-[10px] md:text-sm text-[#7B7B7A] hidden md:block">
                                            from last week
                                        </h1>
                                    </div>
                                </div>

                                {/* Total Cars */}
                                <div
                                    className="w-full md:max-w-none min-h-[91px] bg-white rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                                    style={{
                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    <div className="flex flex-row gap-2 md:gap-5 items-center min-w-0 flex-1">
                                        <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center shrink-0">
                                            <img
                                                src={carIcon}
                                                className="w-5 md:w-6"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-[12px] md:text-[14px] font-[500] text-[#7B7B7A]">
                                                Total Vehicles
                                            </h1>
                                            <h1 className="text-[18px] md:text-[24px] font-[700]">
                                                {cards?.totalCars ?? 0} Units
                                            </h1>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 md:gap-2 items-end text-[10px] md:text-[14px] font-[500] shrink-0">
                                        <div className="w-[60px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                            <img
                                                src={upArrow}
                                                className="size-[14px] md:size-[19px]"
                                            />
                                            <h1 className="text-[10px] md:text-sm">
                                                —
                                            </h1>
                                        </div>
                                        <h1 className="text-[10px] md:text-sm text-[#7B7B7A] hidden md:block">
                                            from last week
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Booking, Overview & Earning */}
                <div className="flex flex-col gap-10 w-full">
                        {/* Bookings table */}
                        <div
                            className="w-full max-w-full h-auto bg-white flex flex-col justify-center items-center rounded-[10px] py-6 md:py-10 px-3 sm:px-5 md:px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col gap-4 w-full">
                                {/* Header and Buttons */}
                                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 w-full">
                                    <h1 className="text-[20px] md:text-[24px] font-[700]">
                                        Vehicle Booking
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
                                            Showing {filteredBookings.length} of {normalizedBookings.length} bookings
                                        </div>
                                    </div>
                                )}
                            </div>

                            <CarBookingTable
                                rows={filteredBookings}
                            />
                        </div>

                        {/* Booking Overview */}
                        <div
                            className="w-full max-w-full h-auto bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] py-8 md:py-10 px-4 sm:px-6 md:px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-16 w-full gap-4">
                                <h1 className="text-[20px] md:text-[24px] font-[700]">
                                    Booking Overview
                                </h1>
                                <div className="relative w-[154px] h-[38px] bg-[#D9D9D94F] rounded-[6px]">
                                    <select
                                        value={boPeriod}
                                        onChange={(e) => setBoPeriod(e.target.value)}
                                        className="w-full h-full rounded-[6px] bg-transparent text-[#00000080] font-[600] text-[14px] pl-3 pr-8 appearance-none outline-none cursor-pointer"
                                        aria-label="Booking overview period"
                                    >
                                        {PERIOD_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <img src={miniDownArrow} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" alt="" />
                                </div>
                            </div>
                            <div className="w-full min-w-0 flex flex-col justify-center items-center">
                                {isMobile ? (
                                    <div className="flex flex-col gap-2">
                                        {bookingOverviewDisplay.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md">
                                                <span className="font-medium text-gray-700">{item.name}</span>
                                                <span className="font-bold text-blue-600">{item.bookings} bookings</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <BookingOverviewBarChart
                                        data={bookingOverviewDisplay}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Earning Summary */}
                        <div
                            className="w-full max-w-full min-h-[381px] bg-[#FFFFFF] rounded-[10px] py-8 md:py-10 px-4 sm:px-6 md:px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-12 w-full gap-4">
                                <h1 className="text-[20px] md:text-[24px] font-[700]">
                                    Earning Summary
                                </h1>
                                <div className="relative w-[154px] h-[38px] bg-[#D9D9D94F] rounded-[6px]">
                                    <select
                                        value={esPeriod}
                                        onChange={(e) => setEsPeriod(e.target.value)}
                                        className="w-full h-full rounded-[6px] bg-transparent text-[#00000080] font-[600] text-[14px] pl-3 pr-8 appearance-none outline-none cursor-pointer"
                                        aria-label="Earning summary period"
                                    >
                                        {PERIOD_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <img src={miniDownArrow} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" alt="" />
                                </div>
                            </div>
                            <div className="w-full min-w-0">
                                {isMobile ? (
                                    <div className="flex flex-col gap-2">
                                        {earningSummaryDisplay.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md">
                                                <span className="font-medium text-gray-700">{item.name}</span>
                                                <span className="font-bold text-green-600">${Number(item.value || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EarningSummaryChart
                                        data={earningSummaryDisplay}
                                    />
                                )}
                            </div>
                        </div>
                        </div>
                    </div>


                        {/* <div 
                            className="w-full max-w-[320px] md:max-w-none min-h-[427px] bg-white rounded-[10px] py-5 px-3 md:px-10 overflow-x-auto"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                                <h1 className="text-[20px] md:text-[24px] font-[700]">
                                    Real Status
                                </h1>
                                <div className="w-[113px] h-[33px] bg-[#D9D9D94F] rounded-[6px] flex flex-row justify-center items-center gap-3">
                                    <h1 className="text-[#00000080] font-[600] text-[14px]">
                                        {filters?.rs_period === "month"
                                            ? "This Month"
                                            : "This Week"}
                                    </h1>
                                    <img src={miniDownArrow} />
                                </div>
                            </div>
                            <div className="w-full min-w-0">
                                {isMobile ? (
                                    <div className="flex flex-col gap-2 mt-4">
                                        {(realStatus ?? []).map((item, index) => (
                                            <div key={index} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-md">
                                                <span className="font-medium text-gray-700">{item.name}</span>
                                                <span className="font-bold text-purple-600">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <RealStatusPieChart data={realStatus ?? []} />
                                )}
                            </div>
                        </div>  */}

           
                        {/* <div
                            className="hidden xl:block w-full min-w-[320px] xl:min-h-[400px] bg-white rounded-[10px] py-5 px-3 md:px-10"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex flex-row items-center justify-between w-full">
                                <h1 className="text-[20px] md:text-[24px] font-[700]">
                                    Reminders
                                </h1>
                                <button className="w-[39px] h-[33px] bg-[#D9D9D94F] rounded-[6px] flex justify-center items-center text-[#00000080] font-[600] text-[30px] border-0 focus:ring-0">
                                    +
                                </button>
                            </div>
                        </div> */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full">
                    {/* Car Types - Full width on mobile */}
                    {/* <div className="w-full">
                        <div
                            className="w-full min-h-full bg-white rounded-[10px] py-6 px-4 md:px-8"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-[20px] md:text-[24px] font-bold">
                                    Car Types
                                </h2>
                                <span className="text-2xl font-bold text-gray-400">
                                    ...
                                </span>
                            </div>
                            <div className="space-y-4">
                                {computedCarTypes.length > 0 ? (
                                    computedCarTypes.slice(0, 4).map(
                                        (
                                            type,
                                            idx // Show only top 4
                                        ) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3 border border-gray-300 rounded-lg overflow-hidden"
                                            >
                                                <img
                                                    src={type.img}
                                                    alt={type.name}
                                                    className="w-20 md:w-24 h-16 md:h-20 object-cover"
                                                />
                                                <div className="flex-1 pr-3">
                                                    <div className="flex justify-between text-sm font-medium mb-1">
                                                        <span className="text-gray-600 truncate">
                                                            {type.name}
                                                        </span>
                                                        <span>
                                                            {type.percent}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full transition-all duration-700"
                                                            style={{
                                                                width: `${type.percent}%`,
                                                                backgroundColor:
                                                                    type.percent <=
                                                                    30
                                                                        ? "#ef4444"
                                                                        : "#0955AC",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <p className="text-center text-gray-500 py-8">
                                        No car type data yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    {/* </div> */}

                    {/* Recent Activities - Compact & Reduced Size */}
                    {/* <div className="w-full mx-auto">
                        {" "}
                        <div
                            className="w-full bg-white rounded-[10px] py-5 px-4 md:px-6 h-96 md:h-[380px] overflow-y-auto"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[20px] md:text-[22px] font-bold">
                                    Recent Activities
                                </h2>
                                {unreadNotifications > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {unreadNotifications}
                                    </span>
                                )}
                            </div>

                            <RecentActivities activities={recentActivities} />
                        </div>
                    </div> */}

                </div>
            </div>
    );
};

export default DashContent;
