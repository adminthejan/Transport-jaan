import React, { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { API_BASE_URL } from "../../../../../../config/api";


import proPicTwo from "../../../../assets/vendors/tracking/proPic.svg";

import leftArrow from "../../../../assets/vendors/calendar/leftArrow.svg";
import miniDownArrow from "../../../../assets/vendors/calendar/miniDown.svg";

import { Boxes } from "lucide-react";

import CalendarMonthPicker from "./CalendarMonthPicker";
import CalendarGrid from "./CalendarGrid";

import UserDropdown from "../../UserDropdown";
import NotificationDropdown from "../NotificationDropdown";

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
    const [currentDay, setCurrentDay] = useState(today.getDate());
    const [currentView, setCurrentView] = useState('week'); // 'day', 'week', 'month', 'year'
    const [selectedUser, setSelectedUser] = useState(selectedUserId || null);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Notifications
    const [warehouseNotifications, setWarehouseNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

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

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!auth?.user) return;

            try {
                const response = await fetch(`${API_BASE_URL}vendors/warehouse/notifications/data`);
                if (response.ok) {
                    const data = await response.json();
                    setWarehouseNotifications(data.notifications || []);
                    setNotificationUnreadCount(data.unread_count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        if (auth?.user) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [auth?.user]);

    const handlePrev = () => {
        switch (currentView) {
            case 'day':
                const prevDay = new Date(currentYear, currentMonth, currentDay - 1);
                setCurrentDay(prevDay.getDate());
                setCurrentMonth(prevDay.getMonth());
                setCurrentYear(prevDay.getFullYear());
                break;
            case 'week':
                const prevWeek = new Date(currentYear, currentMonth, currentDay - 7);
                setCurrentDay(prevWeek.getDate());
                setCurrentMonth(prevWeek.getMonth());
                setCurrentYear(prevWeek.getFullYear());
                break;
            case 'month':
                setCurrentMonth((prev) => {
                    if (prev === 0) {
                        setCurrentYear((y) => y - 1);
                        return 11;
                    }
                    return prev - 1;
                });
                break;
            case 'year':
                setCurrentYear((y) => y - 1);
                break;
        }
    };

    const handleNext = () => {
        switch (currentView) {
            case 'day':
                const nextDay = new Date(currentYear, currentMonth, currentDay + 1);
                setCurrentDay(nextDay.getDate());
                setCurrentMonth(nextDay.getMonth());
                setCurrentYear(nextDay.getFullYear());
                break;
            case 'week':
                const nextWeek = new Date(currentYear, currentMonth, currentDay + 7);
                setCurrentDay(nextWeek.getDate());
                setCurrentMonth(nextWeek.getMonth());
                setCurrentYear(nextWeek.getFullYear());
                break;
            case 'month':
                setCurrentMonth((prev) => {
                    if (prev === 11) {
                        setCurrentYear((y) => y + 1);
                        return 0;
                    }
                    return prev + 1;
                });
                break;
            case 'year':
                setCurrentYear((y) => y + 1);
                break;
        }
    };

    const handleUserChange = (userId) => {
        setSelectedUser(userId);
        router.get(
            "/vendors/warehouse/calendar",
            { month: currentMonth + 1, year: currentYear, user_id: userId },
            { preserveState: true }
        );
    };

    const handleTodayClick = () => {
        const today = new Date();
        setCurrentDay(today.getDate());
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const getHeaderTitle = () => {
        switch (currentView) {
            case 'day':
                const dayDate = new Date(currentYear, currentMonth, currentDay);
                return `${monthNames[currentMonth]} ${currentDay}`;
            case 'week':
                const weekDate = new Date(currentYear, currentMonth, currentDay);
                const dayOfWeek = weekDate.getDay();
                const monday = new Date(weekDate);
                monday.setDate(weekDate.getDate() - ((dayOfWeek + 6) % 7));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${sunday.getDate()}`;
            case 'month':
                return `${monthNames[currentMonth]} ${currentYear}`;
            case 'year':
                return `${currentYear}`;
            default:
                return `${monthNames[currentMonth]} ${currentYear}`;
        }
    };


    // Convert backend events
    const processedEvents = initialEvents && initialEvents.length > 0
        ? initialEvents.map((event) => {
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
        })
        : [];


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
        <div className="w-full h-auto px-4 sm:px-6 lg:pl-4 lg:pr-5 pt-6 pb-12">
            {/* Header section */}
            <div className="flex md:flex-row flex-col gap-5 justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left md:mt-0">
                        Warehouse Calendar
                    </h1>
                </div>
                {/* <div className="hidden lg:flex items-center gap-3">
                    <NotificationDropdown
                        notifications={warehouseNotifications}
                        unreadCount={notificationUnreadCount}
                    />
                    <UserDropdown settingsRoute={route("warehouse.settingsPage")} />
                </div> */}
            </div>
            {/* end of header section */}

            {/* <div className="mt-10 flex flex-col lg:flex-row gap-5 w-full justify-between">
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[10px] flex flex-col gap-5 justify-between px-5 lg:px-8 py-10"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    {selectedBooking ? (
                        <>
                            <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                                <img
                                    src={selectedBooking.personImage || proPicTwo}
                                    className="size-[90px] rounded-full object-cover"
                                    alt="Client"
                                />
                                <div className="flex flex-col gap-3">
                                    <h1 className="text-[18px] font-[700]">
                                        {selectedBooking.client?.name || selectedBooking.person}
                                    </h1>
                                    <div className="flex flex-row gap-10 text-[16px] font-[500]">
                                        <div className="flex flex-col gap-3 text-[#00000080]">
                                            <h1>Start Date</h1>
                                            <h1>End Date</h1>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <h1>
                                                {new Date(selectedBooking.pickup_at).toLocaleDateString("en-GB", {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </h1>
                                            <h1>
                                                {new Date(selectedBooking.dropoff_at).toLocaleDateString("en-GB", {
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

                            <div className="flex flex-col xl:flex-row gap-2 justify-center items-center w-full h-auto bg-[#E5E5E5] rounded-[10px] px-5 py-5">
                                <Boxes className="size-[90px] text-[#2E4683]" />
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[18px] font-[700]">
                                        {selectedBooking.vehicle?.name || selectedBooking.title}
                                    </h1>
                                    <div className="flex flex-row gap-10 text-[16px] font-[500]">
                                        <div className="flex flex-col gap-2 text-[#00000080]">
                                            <h1>Storage Type</h1>
                                            <h1>Booking Ref</h1>
                                            <h1>Space</h1>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h1>{selectedBooking.vehicle?.type || "N/A"}</h1>
                                            <h1>{selectedBooking.vehicle?.plate_number || "N/A"}</h1>
                                            <h1>{selectedBooking.vehicle?.transmission || "N/A"}</h1>
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
            </div> */}

            <div className="flex flex-col gap-5 py-10">
                {/* ==================== MAIN CALENDAR GRID ==================== */}
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[8px] py-10"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="px-5 lg:px-20 flex flex-col xl:flex-row items-center justify-between">
                        <div className="flex flex-row justify-center items-center gap-3">
                            <div
                                className="w-[75px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                                onClick={handleTodayClick}
                            >
                                Today
                            </div>
                            <div className="flex flex-row justify-center items-center gap-2">
                                <div
                                    className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                                    onClick={handlePrev}
                                >
                                    <img src={leftArrow} alt="Previous" />
                                </div>
                                <div
                                    className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center cursor-pointer hover:bg-[#E0E0E0] transition-colors"
                                    onClick={handleNext}
                                >
                                    <img
                                        src={leftArrow}
                                        className="rotate-180"
                                        alt="Next"
                                    />
                                </div>
                            </div>
                            <h1 className="text-[18px] font-[700]">
                                {getHeaderTitle()}
                            </h1>
                        </div>

                        <div className="flex flex-col md:flex-row justify-center items-center gap-5 mt-5 xl:mt-0">
                            {/* Client Filter */}
                            {clients && clients.length > 0 && (
                                <select
                                    value={selectedUser || ""}
                                    onChange={(e) =>
                                        handleUserChange(e.target.value || null)
                                    }
                                    className="w-[200px] h-[35px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#00000080] px-3"
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
                                    Inbound
                                </div>
                                <div className="w-[85px] h-[35px] bg-[#F3F3F3] rounded-r-[6px] flex justify-center items-center">
                                    Outbound
                                </div>
                            </div>

                            <div className="flex flex-row justify-center items-center text-[14px] font-[600]">
                                <div
                                    className={`w-[70px] h-[35px] rounded-l-[6px] flex justify-center items-center cursor-pointer transition-colors ${currentView === 'day' ? 'bg-[#0955AC] text-white' : 'bg-[#F3F3F3] text-[#00000080] hover:bg-[#E0E0E0]'
                                        }`}
                                    onClick={() => setCurrentView('day')}
                                >
                                    Day
                                </div>
                                <div
                                    className={`w-[70px] h-[35px] flex justify-center items-center cursor-pointer transition-colors ${currentView === 'week' ? 'bg-[#0955AC] text-white' : 'bg-[#F3F3F3] text-[#00000080] hover:bg-[#E0E0E0]'
                                        }`}
                                    onClick={() => setCurrentView('week')}
                                >
                                    Week
                                </div>
                                <div
                                    className={`w-[70px] h-[35px] flex justify-center items-center cursor-pointer transition-colors ${currentView === 'month' ? 'bg-[#0955AC] text-white' : 'bg-[#F3F3F3] text-[#00000080] hover:bg-[#E0E0E0]'
                                        }`}
                                    onClick={() => setCurrentView('month')}
                                >
                                    Month
                                </div>
                                <div
                                    className={`w-[70px] h-[35px] rounded-r-[6px] flex justify-center items-center cursor-pointer transition-colors ${currentView === 'year' ? 'bg-[#0955AC] text-white' : 'bg-[#F3F3F3] text-[#00000080] hover:bg-[#E0E0E0]'
                                        }`}
                                    onClick={() => setCurrentView('year')}
                                >
                                    Year
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row gap-10 justify-start items-center px-5 lg:px-20 py-5">
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

                    <div className="overflow-x-auto">
                        <div className={`${currentView === 'year' || currentView === 'month' ? '' : currentView === 'day' ? '' : 'grid grid-cols-8 border-t border-l border-[#00000026] min-w-[800px]'}`}>
                            <CalendarGrid
                                times={times}
                                events={processedEvents}
                                proPicTwo={proPicTwo}
                                currentMonth={currentMonth}
                                currentYear={currentYear}
                                currentDay={currentDay}
                                currentView={currentView}
                                onEventClick={(event) =>
                                    setSelectedBooking(event.fullData)
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarContent;
