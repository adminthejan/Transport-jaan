import React, { useState } from "react";
import { usePage } from "@inertiajs/react";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import proPicTwo from "../../../../assets/vendors/tracking/proPic.svg";
import car1 from "../../../../assets/vendors/dashboard/icons/car1.svg";

import leftArrow from "../../../../assets/vendors/calendar/leftArrow.svg";
import miniDownArrow from "../../../../assets/vendors/calendar/miniDown.svg";

import CalendarMonthPicker from "./CalendarMonthPicker";
import CalendarGrid from "./CalendarGrid";
import MobileCalendarCard from "./MobileCalendarCard";

import UserDropdown from "../../UserDropdown";

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
    {
        day: 3,
        time: "1:00 PM",
        title: "Toyota Vezel",
        person: "Steve Gibson",
        status: "cancelled",
    },
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
    const user = auth?.user;

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const handlePrevMonth = () => {
        const { auth } = usePage().props;
        const user = auth?.user;

        setCurrentMonth((prev) => {
            if (prev === 0) {
                setCurrentYear((y) => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        const { auth } = usePage().props;
        const user = auth?.user;

        setCurrentMonth((prev) => {
            if (prev === 11) {
                setCurrentYear((y) => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    return (
        <div className="w-full h-auto px-5 lg:pl-4 lg:pr-5 py-10 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-5 justify-between md:items-start items-center">
                <h1 className="figtree text-[25px] md:text-[35px] font-[700] text-wrap">
                    Freight Calendar
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

            <div className="mt-5 md:mt-10 flex flex-col xl:flex-row gap-5 w-full justify-between items-start">
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[10px] flex flex-col gap-5 justify-between px-5 md:px-5 py-5 md:py-5"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                        <img
                            src={proPicTwo}
                            className="size-[60px] md:size-[90px]"
                        />
                        <div className="flex flex-col gap-3">
                            <h1 className="text-[14px] md:text-[16px] font-[700]">
                                Steve Gibson
                            </h1>
                            <div className="flex flex-col sm:flex-row gap-3 text-[10px] md:text-[12px] font-[500]">
                                <div className="flex flex-col gap-3 text-[#00000080]">
                                    <h1>Start Date</h1>
                                    <h1>End Date</h1>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h1>25th June 2025</h1>
                                    <h1>27th June 2025</h1>
                                </div>
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[600] text-[#0955AC]">
                                Client request a child safety seat.
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                        <img
                            src={car1}
                            className="size-[60px] md:size-[90px]"
                        />
                        <div className="flex flex-col gap-2">
                            <h1 className="text-[14px] md:text-[16px] font-[700]">
                                BMW LX3
                            </h1>
                            <div className="flex flex-col sm:flex-row gap-3 text-[10px] md:text-[12px] font-[500]">
                                <div className="flex flex-col gap-2 text-[#00000080]">
                                    <h1>Car Type</h1>
                                    <h1>Car Number</h1>
                                    <h1>Transmission</h1>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h1>SUV</h1>
                                    <h1>CBL 3245</h1>
                                    <h1>Automatic</h1>
                                </div>
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[600] text-[#0955AC]">
                                Client request a child safety seat.
                            </h1>
                        </div>
                    </div>
                </div>
                <div
                    className="w-full h-auto xl:min-h-[428px] bg-[#FFFFFF] rounded-[10px] px-5 py-5"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    {/* Reminder section  */}
                    <div className="flex flex-row items-center justify-between w-full">
                        <h1 className="text-[20px] md:text-[24px] font-[700]">
                            Reminders
                        </h1>
                        <div className="w-[39px] h-[33px] bg-[#D9D9D94F] rounded-[6px] flex justify-center items-center gap-3 text-[#00000080] font-[600] text-[24px] md:text-[30px]">
                            +
                        </div>
                    </div>
                    <div className="py-5 flex flex-col justify-center items-center gap-5">
                        <div className="w-full xl:max-w-[286px] xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                            <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                !
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[500] xl:w-[199px]">
                                Update the car rental plans for the upcoming
                                sessions.
                            </h1>
                        </div>
                        <div className="w-full xl:max-w-[286px] xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                            <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                !
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[500] xl:w-[199px]">
                                Update the car rental plans for the upcoming
                                sessions.
                            </h1>
                        </div>
                        <div className="w-full xl:max-w-[286px] xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                            <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                !
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[500] xl:w-[199px]">
                                Update the car rental plans for the upcoming
                                sessions.
                            </h1>
                        </div>
                        <div className="w-full xl:max-w-[286px] xl:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2">
                            <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                !
                            </div>
                            <h1 className="text-[12px] md:text-[14px] font-[500] xl:w-[199px]">
                                Update the car rental plans for the upcoming
                                sessions.
                            </h1>
                        </div>
                    </div>
                    {/* end */}
                </div>
                <div
                    className="w-full h-auto mx-auto xl:min-h-[428px] bg-[#FFFFFF] rounded-[10px] flex justify-center items-center px-5 py-5"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <CalendarMonthPicker />
                </div>
            </div>

            <div className="mt-10">
                <MobileCalendarCard
                    days={days}
                    times={times}
                    events={events}
                    proPicTwo={proPicTwo}
                />
            </div>

            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] mt-5 md:mt-10 py-5 md:py-10 hidden md:block"
                style={{
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                }}
            >
                <div className="px-5 md:px-20 flex flex-col md:flex-row items-center justify-between gap-5">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
                        <div className="w-[75px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center">
                            Today
                        </div>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer"
                                onClick={handlePrevMonth}
                            >
                                <img src={leftArrow} />
                            </div>
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer"
                                onClick={handleNextMonth}
                            >
                                <img src={leftArrow} className="rotate-180" />
                            </div>
                        </div>
                        <h1 className="text-[16px] md:text-[18px] font-[700]">
                            {monthNames[currentMonth]} {currentYear}
                        </h1>
                    </div>
                    <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-5">
                        <div className="flex flex-row justify-center items-center text-[#0955AC] text-[12px] md:text-[14px] font-[700]">
                            <div className="w-[70px] md:w-[85px] h-[35px] bg-[#F3F3F3] rounded-l-[6px] flex justify-center items-center">
                                All
                            </div>
                            <div className="w-[70px] md:w-[85px] h-[35px] bg-[#F3F3F3] flex justify-center items-center">
                                Pickup
                            </div>
                            <div className="w-[70px] md:w-[85px] h-[35px] bg-[#F3F3F3] rounded-r-[6px] flex justify-center items-center">
                                Return
                            </div>
                        </div>
                        <div className="w-[80px] md:w-[96px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[12px] md:text-[14px] font-[500] text-[#00000080] flex justify-center items-center gap-3">
                            <h1>Week</h1>
                            <img src={miniDownArrow} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-5 md:gap-10 justify-start items-center px-5 md:px-20 py-5">
                    <div className="flex flex-row justify-start items-center gap-5 ">
                        <div className="size-[16px] bg-[#C5E6F9] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[14px] md:text-[16px]">
                            Done
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#FFDBDF] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[14px] md:text-[16px]">
                            Cancelled
                        </h1>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="grid grid-cols-8 border-t border-l border-[#00000026] min-w-[600px]">
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
        </div>
    );
};

export default CalendarContent;
