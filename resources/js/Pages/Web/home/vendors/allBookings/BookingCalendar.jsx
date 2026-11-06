import React, { useState, useRef, useEffect } from "react";
import { usePage, Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import search from "../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../assets/vendors/dashboard/logOutLogo.svg"; // Added

import proPicTwo from "../../../assets/vendors/tracking/proPic.svg";
import car1 from "../../../assets/vendors/dashboard/icons/car1.svg";

import leftArrow from "../../../assets/vendors/calendar/leftArrow.svg";
import miniDownArrow from "../../../assets/vendors/calendar/miniDown.svg";

import CalendarMonthPicker from "../../../components/vendors/calendar/CalendarMonthPicker";
import CalendarGrid from "../../../components/vendors/calendar/CalendarGrid";

import UserDropdown from "../../../components/vendors/UserDropdown";
import UnverifiedBanner from "./UnverifiedBanner";



// Define days, times, and events for the calendar
const days = [
    { label: "Mon", date: 14 },
    { label: "Tue", date: 15 },
    { label: "Wed", date: 16 },
    { label: "Thu", date: 17 },
    { label: "Fri", date: 18 },
    { label: "Sat", date: 19 },
    { label: "Sun", date: 20 },
];

const times = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
];

const events = [
    // Monday
    {
        day: 0,
        time: "8:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 0,
        time: "12:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 0,
        time: "3:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    // Tuesday
    {
        day: 1,
        time: "9:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    {
        day: 1,
        time: "1:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    // Wednesday
    {
        day: 2,
        time: "8:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    // Thursday
    {
        day: 3,
        time: "9:30 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 3,
        time: "9:30 AM",
        title: "Toyota Vezel",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 3,
        time: "12:30 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 3,
        time: "1:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    // {
    //     day: 3,
    //     time: "1:00 PM",
    //     title: "Toyota Vezel",
    //     person: "Steve Gibson",
    //     status: "cancelled",
    // },
    // Friday
    {
        day: 4,
        time: "8:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    {
        day: 4,
        time: "11:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    // Saturday
    {
        day: 5,
        time: "9:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
    // Sunday
    {
        day: 6,
        time: "8:00 AM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    {
        day: 6,
        time: "1:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "cancelled",
    },
    {
        day: 6,
        time: "4:00 PM",
        title: "BMW LX3",
        person: "Steve Gibson",
        status: "done",
    },
];

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const CalendarContent = () => {
    const { auth } = usePage().props;
    const currentComponent = usePage().component;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    // Determine active service based on current component
    const getActiveService = () => {
        const componentMap = {
            'VendorAllBookings': 'All Bookings',
            'TicketBooking': 'Ticket Booking',
            'CourierService': 'Courier Service',
            'WarehouseRental': 'Warehousing',
            'FreightDashboard': 'Freight',
            'Multimodal': 'Multimodal'
        };
        return componentMap[currentComponent] || 'All Bookings';
    };

    const activeService = getActiveService();

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentDay, setCurrentDay] = useState(today.getDate());
    const [currentView, setCurrentView] = useState("day"); // 'day', 'week', 'month', 'year'

    const handlePrev = () => {
        switch (currentView) {
            case "day":
                const prevDay = new Date(
                    currentYear,
                    currentMonth,
                    currentDay - 1
                );
                setCurrentDay(prevDay.getDate());
                setCurrentMonth(prevDay.getMonth());
                setCurrentYear(prevDay.getFullYear());
                break;
            case "week":
                const prevWeek = new Date(
                    currentYear,
                    currentMonth,
                    currentDay - 7
                );
                setCurrentDay(prevWeek.getDate());
                setCurrentMonth(prevWeek.getMonth());
                setCurrentYear(prevWeek.getFullYear());
                break;
            case "month":
                setCurrentMonth((prev) => {
                    if (prev === 0) {
                        setCurrentYear((y) => y - 1);
                        return 11;
                    }
                    return prev - 1;
                });
                break;
            case "year":
                setCurrentYear((y) => y - 1);
                break;
        }
    };

    const handleNext = () => {
        switch (currentView) {
            case "day":
                const nextDay = new Date(
                    currentYear,
                    currentMonth,
                    currentDay + 1
                );
                setCurrentDay(nextDay.getDate());
                setCurrentMonth(nextDay.getMonth());
                setCurrentYear(nextDay.getFullYear());
                break;
            case "week":
                const nextWeek = new Date(
                    currentYear,
                    currentMonth,
                    currentDay + 7
                );
                setCurrentDay(nextWeek.getDate());
                setCurrentMonth(nextWeek.getMonth());
                setCurrentYear(nextWeek.getFullYear());
                break;
            case "month":
                setCurrentMonth((prev) => {
                    if (prev === 11) {
                        setCurrentYear((y) => y + 1);
                        return 0;
                    }
                    return prev + 1;
                });
                break;
            case "year":
                setCurrentYear((y) => y + 1);
                break;
        }
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentDay(today.getDate());
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const getHeaderTitle = () => {
        switch (currentView) {
            case "day":
                const dayDate = new Date(currentYear, currentMonth, currentDay);
                return `${monthNames[currentMonth]} ${currentDay}`;
            case "week":
                const weekDate = new Date(
                    currentYear,
                    currentMonth,
                    currentDay
                );
                const dayOfWeek = weekDate.getDay();
                const monday = new Date(weekDate);
                monday.setDate(weekDate.getDate() - ((dayOfWeek + 6) % 7));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return `${monthNames[monday.getMonth()]
                    } ${monday.getDate()} - ${sunday.getDate()}`;
            case "month":
                return `${monthNames[currentMonth]} ${currentYear}`;
            case "year":
                return `${currentYear}`;
            default:
                return `${monthNames[currentMonth]} ${currentYear}`;
        }
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-5 justify-between lg:items-start items-center mb-6">
                <h1 className="figtree text-[24px] lg:text-[35px] font-[700]">
                    All Booking Calendar
                </h1>
                <div className="flex flex-row gap-5 relative items-center">
                    {/* <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={search} alt="Search" />
          </div>
          <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={settings} alt="Settings" />
          </div>
          <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
            <img src={bell} alt="Notifications" />
          </div> */}
                    {/* 
                    <div className="flex flex-row gap-5 relative items-center">
                        <UserDropdown
                            settingsRoute={route("ticketBooking.settingsPage")}
                        />
                    </div> */}
                </div>
            </div>
            {/* end of header section */}



            {/* Unverified Warning */}
            <div className="mt-6">
                <UnverifiedBanner />
            </div>

            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] mt-10 py-10"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >
                <div className="px-20 flex flex-row items-center justify-between">
                    <div className="flex flex-row justify-center items-center gap-6">
                        <div className="w-[75px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center">
                            Today
                        </div>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer"
                                onClick={handlePrev}
                            >
                                <ChevronLeft size={16} />
                            </div>
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer"
                                onClick={handleNext}
                            >
                                <ChevronRight size={16} />
                            </div>
                        </div>
                        <h1 className="text-[18px] font-[700]">
                            {monthNames[currentMonth]} {currentYear}
                        </h1>
                    </div>
                    <div className="flex flex-row justify-center items-center gap-5">
                        <div className="flex flex-row justify-center items-center text-[#0955AC] text-[14px] font-[700]">
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] rounded-l-[6px] flex justify-center items-center">
                                All
                            </div>
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] flex justify-center items-center">
                                Pickup
                            </div>
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] rounded-r-[6px] flex justify-center items-center">
                                Delivery
                            </div>
                        </div>
                        <div className="w-[96px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center gap-3">
                            <h1>Week</h1>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-row gap-10 justify-start items-center px-20 py-5">
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#C5E6F9] rounded-[4px]" />
                        <h1 className="text-[#00000080] font-[600] text-[16px]">
                            Delivered
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#FFDBDF] rounded-[4px]" />
                        <h1 className="text-[#00000080] font-[600] text-[16px]">
                            Cancelled
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-8 border-t border-l border-[#00000026]">
                    <CalendarGrid
                        days={days}
                        times={times}
                        events={events}
                        proPicTwo={proPicTwo}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                    />
                </div>
            </div>
        </div>
    );
};

export default CalendarContent;
