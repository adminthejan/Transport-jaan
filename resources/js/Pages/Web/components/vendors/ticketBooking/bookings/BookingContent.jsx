import React, { useState, useMemo, useEffect } from "react";
import { usePage } from "@inertiajs/react";

import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";

import icon1 from "../../../../assets/vendors/booking/icons/icon1.svg";
import icon2 from "../../../../assets/vendors/booking/icons/icon2.svg";
import icon3 from "../../../../assets/vendors/booking/icons/icon3.svg";
import icon4 from "../../../../assets/vendors/booking/icons/icon4.svg";

import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";

import CarBookingTableTwo from "../../../../components/vendors/ticketBooking/bookings/CarBookingTableTwo";
import BookingBarChart, { aggregateMonthly } from "./BookingBarChart";

const statusColors = {
    Pending: { bg: "#FFCD294D", text: "#7A5B00" },
    Confirmed: { bg: "#ACE199", text: "#3B8F31" },
    Cancelled: { bg: "#FF60608C", text: "#8A1F1F" },
    Completed: { bg: "#0955AC", text: "#FFFFFF" },
};

const paymentStatusColors = {
    Pending: { color: "#FFCD29", bg: "#FFCD294D" },
    Paid: { color: "#3B8F31", bg: "#ACE199" },
    Failed: { color: "#FF6060", bg: "#FF60608C" },
    Refunded: { color: "#7B7B7A", bg: "#E8E8EF" },
};

const BookingContent = () => {
    const { initialBookings = [], server_error } = usePage().props;

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const [bookings, setBookings] = useState(initialBookings);

    // Keep local state in sync if Inertia re-renders this page with fresh props
    // (e.g. after a full page navigation back to /ticketBooking/bookings).
    useEffect(() => {
        setBookings(initialBookings);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBookings]);

    const stats = useMemo(() => {
        const upcoming = bookings.filter((b) => b.status === "Pending" || b.status === "Confirmed").length;
        const pending = bookings.filter((b) => b.status === "Pending").length;
        const cancelled = bookings.filter((b) => b.status === "Cancelled").length;
        const completed = bookings.filter((b) => b.status === "Completed").length;
        return { upcoming, pending, cancelled, completed };
    }, [bookings]);

    const monthlyAggregate = useMemo(() => aggregateMonthly(bookings), [bookings]);
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row gap-5 justify-between items-center mb-6">
                <h1 className="figtree text-[35px] sm:text-[28px] font-[700]">
                    Ticket Bookings
                </h1>
            </div>
            {/* end of header section */}

            {server_error && (
                <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-5 py-3 text-[14px] mb-6">
                    {server_error}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-10 justify-between w-full">
                {/* mini left */}
                <div className="flex flex-col gap-8 w-full">
                    {/* card 1 */}
                    <div
                        className="w-full xl:min-w-[300px] xl:min-h-[91px] h-auto bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon1} alt="Upcoming Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[16px] font-[500] text-[#7B7B7A] text-wrap">
                                    Upcoming Bookings
                                </h1>
                                <h1 className="text-[26px] font-[700]">{stats.upcoming}</h1>
                            </div>
                        </div>
                    </div>
                    {/* end of card 1 */}
                    {/* card 2 */}
                    <div
                        className="w-full xl:min-w-[300px] h-auto xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon2} alt="Pending Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[16px] font-[500] text-[#7B7B7A] text-wrap">
                                    Pending Bookings
                                </h1>
                                <h1 className="text-[26px] font-[700]">{stats.pending}</h1>
                            </div>
                        </div>
                    </div>
                    {/* end of card 2 */}
                    {/* card 3 */}
                    <div
                        className="w-full xl:min-w-[300px] xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon3} alt="Cancelled Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[16px] font-[500] text-[#7B7B7A] text-wrap">
                                    Cancelled Bookings
                                </h1>
                                <h1 className="text-[26px] font-[700]">{stats.cancelled}</h1>
                            </div>
                        </div>
                    </div>
                    {/* end of card 3 */}
                    {/* card 4 */}
                    <div
                        className="w-full xl:min-w-[300px] xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 justify-center items-center">
                            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon4} alt="Completed Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[16px] font-[500] text-[#7B7B7A] text-wrap">
                                    Completed Bookings
                                </h1>
                                <h1 className="text-[26px] font-[700]">{stats.completed}</h1>
                            </div>
                        </div>
                    </div>
                    {/* end of card 4 */}
                </div>

                {/* mini right */}
                <div
                    className="w-full min-h-[437px] bg-[#FFFFFF] rounded-[10px] flex items-center justify-center"
                    style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                    {isMobile ? (
                        <div className="w-full p-4">
                            {monthlyAggregate.length === 0 ? (
                                <div className="text-center text-[#7B7B7A] text-[14px] py-8">
                                    No booking data yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {monthlyAggregate.map((item) => (
                                        <div key={item.key} className="bg-gray-50 rounded-md p-3">
                                            <div className="font-medium text-gray-700 mb-2">
                                                {MONTH_NAMES[item.month]} {item.year}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-blue-600 text-sm">
                                                    {item.done} done
                                                </span>
                                                <span className="font-bold text-red-600 text-sm">
                                                    {item.cancelled} cancelled
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <BookingBarChart bookings={bookings} />
                    )}
                </div>
            </div>

            {/* booking table section */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] py-10 px-5 sm:px-10"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
            >
                <div className="flex xl:flex-row flex-col justify-between">
                    <h1 className="text-[24px] font-[700]">Bus & Train Bookings</h1>
                    <div className="flex xl:flex-row flex-col gap-5 mt-5 xl:mt-0">
                        <div className="xl:w-[253px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                            <img src={miniSearchIcon} alt="Search" />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] truncate"
                                placeholder={"Search client name, unit, etc."}
                            />
                        </div>
                        <div className="xl:w-[155px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img
                                src={filterIcon}
                                className="size-[12px]"
                                alt="Filter"
                            />
                            <h1 className="text-[14px] font-[500] text-[#7B7B7ACC]">
                                Ticket type
                            </h1>
                            <img src={miniDownArrow} alt="Dropdown" />
                        </div>
                        <div className="xl:w-[125px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img
                                src={filterIcon}
                                className="size-[12px]"
                                alt="Filter"
                            />
                            <h1 className="text-[14px] font-[500] text-[#7B7B7ACC]">
                                Status
                            </h1>
                            <img src={miniDownArrow} alt="Dropdown" />
                        </div>
                    </div>
                </div>

                <CarBookingTableTwo
                    bookings={bookings}
                    setBookings={setBookings}
                    statusColors={statusColors}
                    paymentStatusColors={paymentStatusColors}
                />
            </div>
            {/* end */}
        </div>
    );
};

export default BookingContent;
