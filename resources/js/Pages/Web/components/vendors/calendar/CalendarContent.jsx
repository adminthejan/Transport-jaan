// resources/js/Pages/Web/components/vendors/calendar/CalendarContent.jsx
import React, { useState, useEffect, useRef } from "react";
import { usePage, router, Link } from "@inertiajs/react";

import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../assets/vendors/dashboard/logOutLogo.svg"; // ← NEW

import proPicTwo from "../../../assets/vendors/tracking/proPic.svg";
import car1 from "../../../assets/vendors/dashboard/icons/car1.svg";

import leftArrow from "../../../assets/vendors/calendar/leftArrow.svg";
import miniDownArrow from "../../../assets/vendors/calendar/miniDown.svg";

import CalendarMonthPicker from "./CalendarMonthPicker";
import CalendarGrid from "./CalendarGrid";

import UserDropdown from "../../../components/vendors/UserDropdown.jsx";

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

const CalendarContent = ({
    events: initialEvents,
    clients,
    currentMonth: initialMonth,
    currentYear: initialYear,
    selectedUserId,
}) => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(
        initialMonth || today.getMonth()
    );
    const [currentYear, setCurrentYear] = useState(
        initialYear || today.getFullYear()
    );
    const [selectedUser, setSelectedUser] = useState(selectedUserId || null);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Update when props change
    useEffect(() => {
        if (initialMonth !== undefined) setCurrentMonth(initialMonth);
        if (initialYear !== undefined) setCurrentYear(initialYear);
    }, [initialMonth, initialYear]);

    // Set first booking as selected by default
    useEffect(() => {
        if (initialEvents && initialEvents.length > 0 && !selectedBooking) {
            setSelectedBooking(initialEvents[0]);
        }
    }, [initialEvents]);

    const handlePrevMonth = () => {
        const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        router.get(
            "/vendors/calendar",
            { month: newMonth + 1, year: newYear, user_id: selectedUser },
            { preserveState: true }
        );
    };

    const handleNextMonth = () => {
        const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        router.get(
            "/vendors/calendar",
            { month: newMonth + 1, year: newYear, user_id: selectedUser },
            { preserveState: true }
        );
    };

    const handleUserChange = (userId) => {
        setSelectedUser(userId);
        router.get(
            "/vendors/calendar",
            { month: currentMonth + 1, year: currentYear, user_id: userId },
            { preserveState: true }
        );
    };

    const handleTodayClick = () => {
        const today = new Date();
        const newMonth = today.getMonth();
        const newYear = today.getFullYear();
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        router.get(
            "/vendors/calendar",
            { month: newMonth + 1, year: newYear, user_id: selectedUser },
            { preserveState: true }
        );
    };

    // Convert events
    const processedEvents =
        initialEvents?.map((event) => {
            const pickupDate = new Date(event.pickup_at);
            const dayOfWeek = (pickupDate.getDay() + 6) % 7; // Monday = 0
            return {
                day: dayOfWeek,
                time: event.pickup_time,
                title: event.title,
                person: event.person,
                personImage: event.personImage,
                vehicleImage: event.vehicleImage,
                status: event.status,
                bookingId: event.id,
                fullData: event,
            };
        }) || [];

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

    return (
        <div className="flex flex-col gap-10 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* ==================== HEADER WITH DROPDOWN ==================== */}
            <div className="flex flex-col sm:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[25px] sm:text-[35px] font-[700]">Vehicle Rental Calendar</h1>

                {/* <div className="flex flex-row gap-5 relative items-center">
                    <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div>
                </div> */}
            </div>

            {/* ==================== TOP ROW: Booking + Reminders + Month Picker ==================== */}
            <div className="mt-10 flex flex-col lg:flex-row gap-5 w-full justify-between">
                {/* Selected Booking Details */}
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[10px] flex flex-col gap-5 justify-between px-8 py-10"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {selectedBooking ? (
                        <>
                            <div className="flex flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                                <img
                                    src={
                                        user?.image || selectedBooking.personImage
                                    }
                                    className="size-[90px] rounded-full object-cover"
                                    alt="client"
                                />
                                <div className="flex flex-col gap-3">
                                    <h1 className="text-[18px] font-[700]">
                                        {selectedBooking.client?.name ||
                                            selectedBooking.person}
                                    </h1>
                                    <div className="flex flex-col sm:flex-row gap-10 text-[16px] font-[500]">
                                        <div className="flex flex-col gap-3 text-[#00000080]">
                                            <h1>Start Date</h1>
                                            <h1>End Date</h1>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <h1>
                                                {new Date(
                                                    selectedBooking.pickup_at
                                                ).toLocaleDateString("en-GB", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </h1>
                                            <h1>
                                                {new Date(
                                                    selectedBooking.dropoff_at
                                                ).toLocaleDateString("en-GB", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </h1>
                                        </div>
                                    </div>
                                    {selectedBooking.notes && (
                                        <h1 className="text-[16px] font-[600] text-[#0955AC]">
                                            {selectedBooking.notes}
                                        </h1>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                                <img
                                    src={selectedBooking.vehicleImage || car1}
                                    className="size-[90px] object-cover rounded"
                                    alt="vehicle"
                                />
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[18px] font-[700]">
                                        {selectedBooking.vehicle?.name ||
                                            selectedBooking.title}
                                    </h1>
                                    <div className="flex flex-col sm:flex-row gap-10 text-[16px] font-[500]">
                                        <div className="flex flex-col gap-2 text-[#00000080]">
                                            <h1>Car Type</h1>
                                            <h1>Car Number</h1>
                                            <h1>Transmission</h1>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h1>
                                                {selectedBooking.vehicle
                                                    ?.type || "N/A"}
                                            </h1>
                                            <h1>
                                                {selectedBooking.vehicle
                                                    ?.plate_number || "N/A"}
                                            </h1>
                                            <h1>
                                                {selectedBooking.vehicle
                                                    ?.transmission || "N/A"}
                                            </h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            No booking selected
                        </div>
                    )}
                </div>

                {/* Reminders */}
                <div
                    className="w-full lg:min-w-[349px] lg:w-full h-auto min-h-[428px] bg-[#FFFFFF] rounded-[10px] px-10 py-10"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row items-center justify-between w-full">
                        <h1 className="text-[24px] font-[700]">Reminders</h1>
                        <div className="w-[39px] h-[33px] bg-[#D9D9D94F] rounded-[6px] flex justify-center items-center gap-3 text-[#00000080] font-[600] text-[30px] cursor-pointer">
                            +
                        </div>
                    </div>
                    <div className="py-5 flex flex-col justify-center items-center gap-5">
                        {initialEvents?.slice(0, 4).map((event, idx) => (
                            <div
                                key={idx}
                                className="w-full max-w-[286px] h-[68px] bg-[#D8E4F2] rounded-[10px] flex flex-row justify-center items-center gap-5 px-3 py-2"
                            >
                                <div className="size-[24px] border-[1px] border-[#FF0000] rounded-full bg-[#FFFFFF] flex justify-center items-center text-[18px] font-[600] text-[#FF0000]">
                                    !
                                </div>
                                <h1 className="text-[14px] font-[500] flex-1">
                                    {event.title} pickup at {event.pickup_time}{" "}
                                    on {event.pickup_date}
                                </h1>
                            </div>
                        ))}
                        {(!initialEvents || initialEvents.length === 0) && (
                            <p className="text-gray-500 text-sm">
                                No upcoming reminders
                            </p>
                        )}
                    </div>
                </div>

                {/* Calendar Month Picker */}
                <div
                    className="w-full lg:min-w-[315px] lg:w-full h-auto min-h-[428px] bg-[#FFFFFF] rounded-[10px] flex justify-center items-center px-5 py-5"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <CalendarMonthPicker />
                </div>
            </div>

            {/* ==================== MAIN CALENDAR GRID ==================== */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] mt-10 py-10"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >
                <div className="px-5 sm:px-10 lg:px-20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                        <div
                            className="w-[75px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center cursor-pointer hover:bg-[#e0e0e0]"
                            onClick={handleTodayClick}
                        >
                            Today
                        </div>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#e0e0e0]"
                                onClick={handlePrevMonth}
                            >
                                <img src={leftArrow} alt="previous" />
                            </div>
                            <div
                                className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#e0e0e0]"
                                onClick={handleNextMonth}
                            >
                                <img
                                    src={leftArrow}
                                    className="rotate-180"
                                    alt="next"
                                />
                            </div>
                        </div>
                        <h1 className="text-[18px] font-[700]">
                            {monthNames[currentMonth]} {currentYear}
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
                        {/* Client Filter */}
                        {clients && clients.length > 0 && (
                            <select
                                value={selectedUser || ""}
                                onChange={(e) =>
                                    handleUserChange(e.target.value || null)
                                }
                                className="w-full sm:w-[200px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] px-3"
                            >
                                <option value="">All Clients</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="flex flex-row justify-center items-center text-[#0955AC] text-[14px] font-[700]">
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] rounded-l-[6px] flex justify-center items-center">
                                All
                            </div>
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] flex justify-center items-center">
                                Pickup
                            </div>
                            <div className="w-[85px] h-[35px] bg-[#F3F3F3] rounded-r-[6px] flex justify-center items-center">
                                Return
                            </div>
                        </div>

                        <div className="w-full sm:w-[96px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center gap-3">
                            <h1>Week</h1>
                            <img src={miniDownArrow} alt="dropdown" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-row gap-10 justify-start items-center px-5 sm:px-10 lg:px-20 py-5">
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#C5E6F9] rounded-[4px]" />
                        <h1 className="text-[#00000080] font-[600] text-[16px]">
                            Done
                        </h1>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-5">
                        <div className="size-[16px] bg-[#FFDBDF] rounded-[4px]" />
                        <h1 className="text-[#00000080] font-[600] text-[16px]">
                            Cancelled
                        </h1>
                    </div>
                </div>

                <div className="sm:overflow-x-auto">
                    <div className="sm:grid sm:grid-cols-8 sm:border-t sm:border-l sm:border-[#00000026] sm:min-w-[1400px]">
                        <CalendarGrid
                            times={times}
                            events={processedEvents}
                            proPicTwo={proPicTwo}
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            onEventClick={(event) =>
                                setSelectedBooking(event.fullData)
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarContent;
