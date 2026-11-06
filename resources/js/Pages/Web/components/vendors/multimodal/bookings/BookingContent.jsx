import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";

import icon1 from "../../../../assets/vendors/booking/icons/icon1.svg";
import icon2 from "../../../../assets/vendors/booking/icons/icon2.svg";
import icon3 from "../../../../assets/vendors/booking/icons/icon3.svg";
import icon4 from "../../../../assets/vendors/booking/icons/icon4.svg";

import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";

import CarBookingTableTwo from "../../../../components/vendors/multimodal/bookings/CarBookingTableTwo";
import BookingBarChart from "./BookingBarChart";

import UserDropdown from "../../UserDropdown";


const BookingContent = () => {
  const { auth } = usePage().props;
  const user = auth?.user;

    // State for mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Mobile detection effect
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Booking data for mobile list view
    const bookingChartData = [
        { name: "Jan", done: 320, cancelled: 220 },
        { name: "Feb", done: 380, cancelled: 270 },
        { name: "Mar", done: 250, cancelled: 150 },
        { name: "Apr", done: 500, cancelled: 230 },
        { name: "May", done: 310, cancelled: 410 },
        { name: "Jun", done: 370, cancelled: 180 },
        { name: "Jul", done: 420, cancelled: 210 },
        { name: "Aug", done: 480, cancelled: 380 },
        { name: "Sep", done: 270, cancelled: 320 },
        { name: "Oct", done: 390, cancelled: 210 },
        { name: "Nov", done: 320, cancelled: 170 },
        { name: "Dec", done: 500, cancelled: 250 },
    ];

    const paymentStatusColors = {
        Paid: { color: "#3B8F31", bg: "#ACE199" }, // Solid colors for Paid
        Pending: { color: "#FF60608C", bg: "#FF60608C" }, // Solid colors for Pending
    };

    const statusColors = {
        Ongoing: { bg: "#FFCD29", text: "#000000" }, // Yellow background, black text
        Returned: { bg: "#3B8F31", text: "#FFCD29" }, // Dark green background, yellow text
    };

    const [bookings, setBookings] = useState([
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$50",
            paymentStatus: "Pending",
            paymentStatusColor: paymentStatusColors.Pending.color,
            paymentStatusBg: paymentStatusColors.Pending.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
        {
            id: "C-JV1001",
            bookingDate: "May 4, 2025",
            clientName: "Steve Gibson",
            carModel: "Honda Civic",
            carPlate: "CBK - 1475",
            plan: "7 days",
            startDate: "May 10, 2025",
            endDate: "May 17, 2025",
            payment: "$450",
            paymentStatus: "Paid",
            paymentStatusColor: paymentStatusColors.Paid.color,
            paymentStatusBg: paymentStatusColors.Paid.bg,
            status: "Ongoing",
            statusBg: statusColors.Ongoing.bg,
            statusText: statusColors.Ongoing.text,
        },
    ]);

    const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
    const [newBooking, setNewBooking] = useState({
        id: "",
        bookingDate: "",
        clientName: "",
        carModel: "",
        carPlate: "",
        plan: "",
        startDate: "",
        endDate: "",
        payment: "",
        paymentStatus: "Pending",
        status: "Ongoing",
    });

    // Handle input changes for the form
    const handleInputChange = (e) => {
  const { auth } = usePage().props;
  const user = auth?.user;

        const { name, value } = e.target;
        setNewBooking((prev) => ({ ...prev, [name]: value }));
    };

    // Handle form submission to add new booking
    const handleAddBooking = () => {
  const { auth } = usePage().props;
  const user = auth?.user;

        const newBookingEntry = {
            ...newBooking,
            paymentStatusColor:
                paymentStatusColors[newBooking.paymentStatus]?.color ||
                "#FF6060",
            paymentStatusBg:
                paymentStatusColors[newBooking.paymentStatus]?.bg || "#FF6060",
            statusBg: statusColors[newBooking.status]?.bg || "#FFCD29",
            statusText: statusColors[newBooking.status]?.text || "#000000",
        };

        setBookings((prev) => [...prev, newBookingEntry]);
        setIsAddPopupOpen(false);
        setNewBooking({
            id: "",
            bookingDate: "",
            clientName: "",
            carModel: "",
            carPlate: "",
            plan: "",
            startDate: "",
            endDate: "",
            payment: "",
            paymentStatus: "Pending",
            status: "Ongoing",
        });
    };

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center mb-6">
                <h1 className="figtree text-[24px] md:text-[35px] font-[700]">Multimodal Bookings</h1>
                {/* <div className="flex flex-row gap-5">
                    <div className="size-[60px] rounded-[10px] bg-[#E8E8EF] flex justify-center items-center">
                        <img src={search} alt="Search" />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8E8EF] flex justify-center items-center">
                        <img src={settings} alt="Settings" />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8E8EF] flex justify-center items-center">
                        <img src={bell} alt="Notifications" />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8E8EF] flex justify-center items-center">
                        <img src={proPic} alt="Profile" />
                    </div>

                    <div className="figtree flex flex-col justify-center items-start">
                        <h1 className="text-[20px] font-[700]">{user?.name || 'Service Provider'}</h1>
                        <h1 className="text-[16px] font-[600] text-[#7B7B7A]">
                            Service Provider
                        </h1>
                    </div>
                </div> */}
                <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("multimodal.settingsPage")} />
                </div>
            </div>
            {/* end of header section */}

            <div className="flex flex-col xl:flex-row gap-5 xl:gap-10 justify-between py-10 w-full">
                {/* mini left */}
                <div className="flex flex-col gap-4 md:gap-8 w-full xl:w-auto">
                    {/* card 1 */}
                    <div
                        className="w-full h-auto bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                        style={{
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                        }}
                    >
                        <div className="flex flex-row gap-3 md:gap-5 justify-center items-center">
                            <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon1} alt="Upcoming Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[14px] md:text-[16px] font-[500] text-[#7B7B7A] text-nowrap">
                                    Upcoming Bookings
                                </h1>
                                <h1 className="text-[20px] md:text-[26px] font-[700]">145</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] md:text-[14px] font-[500]">
                            <div className="w-[70px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[15px] md:size-[19px]"
                                    alt="Increase"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">from last week</h1>
                        </div>
                    </div>
                    {/* end of card 1 */}
                    {/* card 2 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                        style={{
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                        }}
                    >
                        <div className="flex flex-row gap-3 md:gap-5 justify-center items-center">
                            <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon2} alt="Pending Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[14px] md:text-[16px] font-[500] text-[#7B7B7A] text-nowrap">
                                    Pending Bookings
                                </h1>
                                <h1 className="text-[20px] md:text-[26px] font-[700]">234</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] md:text-[14px] font-[500]">
                            <div className="w-[70px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[15px] md:size-[19px]"
                                    alt="Increase"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">from last week</h1>
                        </div>
                    </div>
                    {/* end of card 2 */}
                    {/* card 3 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                        style={{
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                        }}
                    >
                        <div className="flex flex-row gap-3 md:gap-5 justify-center items-center">
                            <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon3} alt="Cancelled Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[14px] md:text-[16px] font-[500] text-[#7B7B7A] text-nowrap">
                                    Cancelled Bookings
                                </h1>
                                <h1 className="text-[20px] md:text-[26px] font-[700]">24</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] md:text-[14px] font-[500]">
                            <div className="w-[70px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[15px] md:size-[19px]"
                                    alt="Increase"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">from last week</h1>
                        </div>
                    </div>
                    {/* end of card 3 */}
                    {/* card 4 */}
                    <div
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-3 md:px-5 py-2"
                        style={{
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                        }}
                    >
                        <div className="flex flex-row gap-3 md:gap-5 justify-center items-center">
                            <div className="size-[40px] md:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                                <img src={icon4} alt="Completed Bookings" />
                            </div>
                            <div>
                                <h1 className="text-[14px] md:text-[16px] font-[500] text-[#7B7B7A] text-nowrap">
                                    Completed Bookings
                                </h1>
                                <h1 className="text-[20px] md:text-[26px] font-[700]">145</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] md:text-[14px] font-[500]">
                            <div className="w-[70px] md:w-[81px] h-[22px] md:h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className="size-[15px] md:size-[19px]"
                                    alt="Increase"
                                />
                                <h1 className="">+2.86%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">from last week</h1>
                        </div>
                    </div>
                    {/* end of card 4 */}
                </div>

                {/* mini right */}
                <div
                    className="w-full xl:min-w-[680px] min-h-[350px] md:min-h-[437px] bg-[#FFFFFF] rounded-[10px] flex items-center justify-center"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {isMobile ? (
                        // Mobile list view
                        <div className="w-full p-4">
                            <h3 className="text-[18px] font-[700] mb-4 text-center">Monthly Bookings</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {bookingChartData.map((month, index) => (
                                    <div key={index} className="bg-[#F8F9FA] rounded-[8px] p-3 border border-[#E9ECEF]">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-[600] text-[16px]">{month.name}</h4>
                                            <div className="text-right">
                                                <div className="text-[14px] text-[#28A745] font-[600]">
                                                    ✓ {month.done} Done
                                                </div>
                                                <div className="text-[14px] text-[#DC3545] font-[600]">
                                                    ✗ {month.cancelled} Cancelled
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-[#E9ECEF] rounded-full h-2">
                                            <div
                                                className="bg-[#0955AC] h-2 rounded-full"
                                                style={{ width: `${(month.done / (month.done + month.cancelled)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[12px] text-[#6C757D] mt-1 text-center">
                                            {month.done + month.cancelled} total bookings
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Desktop chart view
                        <BookingBarChart />
                    )}
                </div>
            </div>

            {/* car booking section */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] py-5 md:py-10 px-4 md:px-10"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >
                <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-0">
                    <h1 className="text-[20px] md:text-[24px] font-[700]">Car Booking</h1>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-5">
                        <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                            <img src={miniSearchIcon} alt="Search" />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Search client name, car, etc."
                            />
                        </div>
                        <div className="w-full sm:w-[139px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img
                                src={filterIcon}
                                className="size-[12px]"
                                alt="Filter"
                            />
                            <h1 className="text-[14px] font-[500] text-[#7B7B7ACC]">
                                Car type
                            </h1>
                            <img src={miniDownArrow} alt="Dropdown" />
                        </div>
                        <div className="w-full sm:w-[125px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
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
                        <button
                            className="w-full sm:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700]"
                            onClick={() => setIsAddPopupOpen(true)}
                        >
                            Add Booking
                        </button>
                    </div>
                </div>

                {/* Add Booking Popup */}
                {isAddPopupOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 poppins p-4">
                        <div className="bg-white p-4 md:p-10 rounded-[10px] w-full max-w-[600px] shadow-lg max-h-[90vh] overflow-y-auto">
                            <h2 className="text-[18px] md:text-[20px] font-[700] mb-4">
                                Add New Booking
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Booking ID
                                    </label>
                                    <input
                                        type="text"
                                        name="id"
                                        value={newBooking.id}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. C-JV1001"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Booking Date
                                    </label>
                                    <input
                                        type="text"
                                        name="bookingDate"
                                        value={newBooking.bookingDate}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. May 4, 2025"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Client Name
                                    </label>
                                    <input
                                        type="text"
                                        name="clientName"
                                        value={newBooking.clientName}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. Steve Gibson"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Car Model
                                    </label>
                                    <input
                                        type="text"
                                        name="carModel"
                                        value={newBooking.carModel}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. Honda Civic"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Car Plate
                                    </label>
                                    <input
                                        type="text"
                                        name="carPlate"
                                        value={newBooking.carPlate}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. CBK - 1475"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Plan
                                    </label>
                                    <input
                                        type="text"
                                        name="plan"
                                        value={newBooking.plan}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. 7 days"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="text"
                                        name="startDate"
                                        value={newBooking.startDate}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. May 10, 2025"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="text"
                                        name="endDate"
                                        value={newBooking.endDate}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. May 17, 2025"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Payment Amount
                                    </label>
                                    <input
                                        type="text"
                                        name="payment"
                                        value={newBooking.payment}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                        placeholder="e.g. $450"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Payment Status
                                    </label>
                                    <select
                                        name="paymentStatus"
                                        value={newBooking.paymentStatus}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                                <div className="mb-4 md:col-span-2">
                                    <label className="block text-[14px] font-[500] mb-1">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={newBooking.status}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border focus:border-[#000000] rounded-[5px] focus:outline-none focus:ring-0"
                                    >
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Returned">
                                            Returned
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setIsAddPopupOpen(false)}
                                    className="px-4 py-2 bg-gray-200 rounded-[5px] text-[14px] font-[700]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddBooking}
                                    className="px-4 py-2 bg-[#0955AC] text-white rounded-[5px] text-[14px] font-[700]"
                                >
                                    Add Booking
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <CarBookingTableTwo
                    bookings={bookings}
                    setBookings={setBookings}
                    statusColors={statusColors} // Pass statusColors as a prop
                />
            </div>
            {/* end */}
        </div>
    );
};

export default BookingContent;
