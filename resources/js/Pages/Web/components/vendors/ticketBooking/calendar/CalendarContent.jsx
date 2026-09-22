import React, { useMemo } from "react";
import { usePage, router } from "@inertiajs/react";

import proPicTwo from "../../../../assets/vendors/tracking/proPic.svg";
import car1 from "../../../../assets/vendors/dashboard/icons/car1.svg";

import CalendarMonthPicker from "./CalendarMonthPicker";
import CalendarGrid from "./CalendarGrid";

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
    const {
        auth,
        events: propsEvents,
        currentMonth,
        currentYear,
        server_error,
    } = usePage().props;
    const user = auth?.user;
    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    const events = useMemo(() => propsEvents || [], [propsEvents]);

    // currentMonth from the backend is 1-12; the month picker/grid work with
    // both 1-12 (CalendarGrid) and 0-11 (CalendarMonthPicker), so keep both.
    const monthIndex0 = (currentMonth || 1) - 1;

    const navigateToMonth = (month0Indexed, year) => {
        router.get(
            route("ticketBooking.calendar", { month: month0Indexed + 1, year }),
            {},
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePrevMonth = () => {
        if (monthIndex0 === 0) {
            navigateToMonth(11, currentYear - 1);
        } else {
            navigateToMonth(monthIndex0 - 1, currentYear);
        }
    };

    const handleNextMonth = () => {
        if (monthIndex0 === 11) {
            navigateToMonth(0, currentYear + 1);
        } else {
            navigateToMonth(monthIndex0 + 1, currentYear);
        }
    };

    const handleToday = () => {
        const today = new Date();
        navigateToMonth(today.getMonth(), today.getFullYear());
    };

    // Aggregate stats derived from the real schedule events for this month.
    const busEvents = events.filter((e) => e.type === "bus");
    const trainEvents = events.filter((e) => e.type === "train");
    const totalBookings = events.reduce((sum, e) => sum + (e.bookingsCount || 0), 0);
    const attentionEvents = events
        .filter((e) => e.status === "cancelled" || e.status === "delayed")
        .slice(0, 4);

    const eventDates = useMemo(
        () => Array.from(new Set(events.map((e) => e.date).filter(Boolean))),
        [events]
    );

    return (
        <div className="w-full h-auto px-5 lg:pl-4 lg:pr-5 py-5 lg:py-10 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-5 justify-between lg:items-start items-center">
                <h1 className="figtree text-[24px] lg:text-[35px] font-[700]">
                    Ticket Booking Calendar
                </h1>
            </div>
            {/* end of header section */}

            {server_error && (
                <div className="mt-6 w-full rounded-[10px] border border-[#FF0000] bg-[#FF00000D] px-5 py-4 text-[14px] font-[600] text-[#FF0000]">
                    {server_error}
                </div>
            )}

            <div className="mt-10 flex flex-col xl:flex-row gap-5 w-full justify-between">
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[10px] flex flex-col gap-5 justify-between px-5 lg:px-8 py-10"
                    style={{
                        boxShadow: "4px 4px 4px #0000001A",
                    }}
                >
                    {/* Month schedule overview */}
                    <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                        <img
                            src={proPicTwo}
                            className="size-[90px]"
                            alt="Schedules"
                        />
                        <div className="flex flex-col gap-3 items-center text-center lg:items-start lg:text-start">
                            <h1 className="text-[18px] font-[700]">
                                {monthNames[monthIndex0]} {currentYear} Overview
                            </h1>
                            <div className="flex flex-row md:gap-10 gap-5 text-[16px] font-[500]">
                                <div className="flex flex-col gap-3 text-[#00000080]">
                                    <h1>Total Schedules</h1>
                                    <h1>Total Bookings</h1>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h1>{events.length}</h1>
                                    <h1>{totalBookings}</h1>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fleet breakdown */}
                    <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                        <img src={car1} className="size-[90px]" alt="Fleet" />
                        <div className="flex flex-col gap-2 items-center text-center lg:items-start lg:text-start">
                            <h1 className="text-[18px] font-[700]">Fleet Breakdown</h1>
                            <div className="flex flex-row md:gap-10 gap-5 text-[16px] font-[500]">
                                <div className="flex flex-col gap-2 text-[#00000080]">
                                    <h1>Bus Schedules</h1>
                                    <h1>Train Schedules</h1>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h1>{busEvents.length}</h1>
                                    <h1>{trainEvents.length}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    className="xl:max-w-[300px] xl:min-w-[349px] w-full h-auto xl:min-h-[428px] bg-[#FFFFFF] rounded-[10px] px-5 lg:px-10 py-10"
                    style={{
                        boxShadow: "4px 4px 4px #0000001A",
                    }}
                >
                    {/* Attention needed section (cancelled/delayed schedules) */}
                    <div className="flex flex-row items-center justify-between w-full">
                        <h1 className="text-[24px] font-[700]">Needs Attention</h1>
                    </div>
                    <div className="py-5 flex flex-col justify-center items-center gap-5">
                        {attentionEvents.length === 0 && (
                            <div className="text-[14px] text-[#00000080] font-[500] text-center">
                                No cancelled or delayed schedules this month.
                            </div>
                        )}
                        {attentionEvents.map((event) => (
                            <div
                                key={event.id}
                                className="w-full xl:w-[286px] md:h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2"
                            >
                                <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                    !
                                </div>
                                <h1 className="text-[14px] font-[500] xl:w-[199px]">
                                    {event.title} ({event.type}) on {event.date} is{" "}
                                    {event.status}.
                                </h1>
                            </div>
                        ))}
                    </div>
                    {/* end */}
                </div>
                <div
                    className="w-full h-auto mx-auto xl:min-h-[428px] bg-[#FFFFFF] rounded-[10px] flex justify-center items-center px-5 py-5"
                    style={{
                        boxShadow: "4px 4px 4px #0000001A",
                    }}
                >
                    <CalendarMonthPicker
                        month={monthIndex0}
                        year={currentYear}
                        eventDates={eventDates}
                        onMonthChange={navigateToMonth}
                    />
                </div>
            </div>

            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] mt-10 py-10"
                style={{
                    boxShadow: "4px 4px 4px #0000001A",
                }}
            >
                <div className="px-5 lg:px-20 flex flex-col xl:flex-row items-center justify-between">
                    <div className="flex md:flex-row flex-col justify-center items-center gap-3">
                        <div
                            className="md:w-[75px] md:h-[35px] p-2 bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                            onClick={handleToday}
                        >
                            Today
                        </div>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <div
                                className="md:w-[35px] md:h-[35px] p-2 bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                                onClick={handlePrevMonth}
                            >
                                <span className="text-lg">&#60;</span>
                            </div>
                            <div
                                className="md:w-[35px] md:h-[35px] p-2 bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                                onClick={handleNextMonth}
                            >
                                <span className="text-lg">&#62;</span>
                            </div>
                        </div>
                        <h1 className="text-[18px] font-[700]">
                            {monthNames[monthIndex0]} {currentYear}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-row gap-5 md:gap-10 justify-start items-center px-5 lg:px-20 py-5 flex-wrap">
                    <div className="flex flex-row justify-start items-center gap-5 ">
                        <div className="size-[16px] bg-[#C5E6F9] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[16px]">
                            Active
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#D6F5DD] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[16px]">
                            Completed
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#FFE9C2] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[16px]">
                            Delayed
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#FFDBDF] rounded-[4px]" />
                        <h1 className=" text-[#00000080] font-[600] text-[16px]">
                            Cancelled
                        </h1>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <CalendarGrid
                        events={events}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                    />
                </div>
            </div>
        </div>
    );
};

export default CalendarContent;
