import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bus, TrainFront, Trash2 } from "lucide-react";
import miniUp from "../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../assets/vendors/dashboard/icons/miniDown.svg";

const formatAmount = (amount) => `$${Number(amount || 0).toFixed(2)}`;

/**
 * bookings: array of
 *  { id, rawId, bookingType, bookingDate, clientName, clientEmail, clientPhone,
 *    unitName, unitNumber, route, travelDate, seats, passengerCount, amount,
 *    status, paymentStatus, cancellationReason, cancelledAt }
 */
const CarBookingTableTwo = ({ bookings = [], setBookings, statusColors = {}, paymentStatusColors = {} }) => {
    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const perPageOptions = [5, 10, 20, 50];
    const totalPages = Math.max(1, Math.ceil(bookings.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const currentBookings = bookings.slice(startIdx, endIdx);

    // State for popup
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [newPaymentStatus, setNewPaymentStatus] = useState("");
    const [newStatus, setNewStatus] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
        return pages;
    };

    const statusStyle = (status) => statusColors[status] || { bg: "#E8E8EF", text: "#7B7B7A" };
    const paymentStyle = (status) => paymentStatusColors[status] || { color: "#7B7B7A", bg: "#E8E8EF" };

    const handleRowClick = (booking, index) => {
        setSelectedBooking({ ...booking, index: startIdx + index });
        setNewPaymentStatus(booking.paymentStatus);
        setNewStatus(booking.status);
        setIsPopupOpen(true);
    };

    const updateLocalBooking = (index, patch) => {
        setBookings((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...patch };
            return updated;
        });
    };

    const handlePopupSubmit = async () => {
        if (!selectedBooking) return;
        setIsSaving(true);
        try {
            const response = await axios.patch(
                route("ticketBooking.api.bookings.update", {
                    bookingType: selectedBooking.bookingType,
                    bookingId: selectedBooking.rawId,
                }),
                {
                    status: newStatus.toLowerCase(),
                    payment_status: newPaymentStatus.toLowerCase(),
                }
            );

            if (response.data?.success) {
                updateLocalBooking(selectedBooking.index, {
                    status: newStatus,
                    paymentStatus: newPaymentStatus,
                });
                setIsPopupOpen(false);
                setSelectedBooking(null);
            } else {
                alert(response.data?.message || "Failed to update booking.");
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update booking. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async (booking, index) => {
        const reason = window.prompt("Reason for cancelling this booking (optional):", "");
        if (reason === null) return; // user hit cancel on the prompt itself

        try {
            const response = await axios.post(
                route("ticketBooking.bookings.cancel", {
                    bookingType: booking.bookingType,
                    bookingId: booking.rawId,
                }),
                { reason: reason.trim() || undefined }
            );

            if (response.data?.success) {
                updateLocalBooking(index, {
                    status: "Cancelled",
                    cancellationReason: reason.trim() || "Cancelled by vendor",
                    cancelledAt: new Date().toISOString().slice(0, 19).replace("T", " "),
                });
            } else {
                alert(response.data?.message || "Failed to cancel booking.");
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to cancel booking. Please try again.");
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const UnitIcon = ({ type }) =>
        type === "train" ? (
            <TrainFront className="w-4 h-4 text-[#0955AC] shrink-0" />
        ) : (
            <Bus className="w-4 h-4 text-[#0955AC] shrink-0" />
        );

    return (
        <div className="py-6 sm:py-10">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div className="min-w-[1150px]">
                    {/* table headings */}
                    <div className="grid grid-cols-9 bg-[#D8E4F2] h-[42px] items-center rounded-[8px] text-[12px] sm:text-[13px] font-[600] px-4 sm:px-10">
                        {[
                            "Book id",
                            "Booking Date",
                            "Client Name",
                            "Unit",
                            "Route",
                            "Travel Date",
                            "Payment",
                            "Status",
                            "Actions",
                        ].map((h, i) => (
                            <div key={i} className={`flex items-center gap-2 ${i === 6 ? "sm:ml-10" : ""}`}>
                                <span>{h}</span>
                                <div className="flex flex-col items-center">
                                    <img src={miniUp} className="w-[6px] h-[4px]" alt="Sort Up" />
                                    <img src={miniDown} className="w-[6px] h-[4px]" alt="Sort Down" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* table rows */}
                    {currentBookings.map((booking, idx) => (
                        <div
                            key={`${booking.bookingType}-${booking.rawId}`}
                            className={`grid grid-cols-9 ${
                                startIdx + idx !== bookings.length - 1 ? "border-b-[1.5px] border-[#00000033]" : ""
                            } min-h-[100px] items-center text-[13px] sm:text-[14px] font-[500] px-4 sm:px-10 hover:bg-gray-100`}
                        >
                            <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                {booking.id}
                            </div>
                            <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                {booking.bookingDate || "—"}
                            </div>
                            <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                <div>{booking.clientName}</div>
                                {booking.clientPhone && (
                                    <div className="text-[11px] text-[#7B7B7A]">{booking.clientPhone}</div>
                                )}
                            </div>

                            {/* Unit */}
                            <div className="flex flex-col gap-1 cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                <div className="flex items-center gap-1.5">
                                    <UnitIcon type={booking.bookingType} />
                                    <span>{booking.unitName}</span>
                                </div>
                                <div className="w-fit px-2 h-[20px] rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] flex justify-center items-center text-[#00000099] text-[11px]">
                                    {booking.unitNumber}
                                </div>
                            </div>

                            <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                {booking.route || "—"}
                            </div>

                            <div
                                className="text-[12px] sm:text-[13px] font-[500] text-[#939392] cursor-pointer"
                                onClick={() => handleRowClick(booking, idx)}
                            >
                                <div className="w-fit px-2 h-[22px] bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[10px] sm:text-[11px] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                    {booking.travelDate || "—"}
                                </div>
                                <div className="mt-1 text-[11px]">
                                    {booking.passengerCount ?? 0} pax
                                    {booking.seats && booking.seats.length > 0
                                        ? ` • Seats ${booking.seats.join(", ")}`
                                        : ""}
                                </div>
                            </div>

                            <div className="flex flex-col items-center cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
                                <div>{formatAmount(booking.amount)}</div>
                                <div
                                    className="w-[70px] sm:w-[80px] h-[20px] border rounded-[4px] text-[10px] sm:text-[11px] text-[#00000099] font-[600] flex justify-center items-center"
                                    style={{
                                        borderColor: paymentStyle(booking.paymentStatus).color,
                                        background: paymentStyle(booking.paymentStatus).bg,
                                    }}
                                >
                                    {booking.paymentStatus}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className="w-[80px] sm:w-[90px] h-[22px] border rounded-[4px] flex justify-center items-center text-[10px] sm:text-[11px] font-[700] cursor-pointer"
                                    style={{
                                        background: statusStyle(booking.status).bg,
                                        borderColor: "#0000004D",
                                        color: statusStyle(booking.status).text,
                                    }}
                                    onClick={() => handleRowClick(booking, idx)}
                                >
                                    {booking.status}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                                {booking.status !== "Cancelled" ? (
                                    <button
                                        onClick={() => handleCancel(booking, startIdx + idx)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Cancel booking"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-[#7B7B7A]">Cancelled</span>
                                )}
                            </div>
                        </div>
                    ))}

                    {bookings.length === 0 && (
                        <div className="py-10 text-center text-[#7B7B7A] text-[14px]">No bookings found.</div>
                    )}
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {currentBookings.map((booking, idx) => (
                    <div
                        key={`${booking.bookingType}-${booking.rawId}`}
                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                        style={{ boxShadow: "2px 2px 8px #0000001A" }}
                        onClick={() => handleRowClick(booking, idx)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-[10px] text-[#7B7B7A] font-[500]">Book ID</div>
                                <div className="text-[16px] font-[700] text-[#0955AC]">{booking.id}</div>
                            </div>
                            <div
                                className="px-3 py-1 rounded-[4px] text-[11px] font-[700]"
                                style={{ background: statusStyle(booking.status).bg, color: statusStyle(booking.status).text }}
                            >
                                {booking.status}
                            </div>
                        </div>

                        <div className="space-y-2 mb-3">
                            <div className="flex justify-between">
                                <span className="text-[12px] text-[#7B7B7A]">Client:</span>
                                <span className="text-[13px] font-[600]">{booking.clientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[12px] text-[#7B7B7A]">Booking Date:</span>
                                <span className="text-[13px] font-[500]">{booking.bookingDate || "—"}</span>
                            </div>
                        </div>

                        <div className="bg-[#F9FAFB] rounded-md p-3 mb-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[12px] text-[#7B7B7A] flex items-center gap-1">
                                    <UnitIcon type={booking.bookingType} /> Unit:
                                </span>
                                <span className="text-[13px] font-[600]">{booking.unitName}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[12px] text-[#7B7B7A]">Number:</span>
                                <div className="px-2 py-1 rounded-[4px] bg-[#D9D9D957] border border-[#0000004D] text-[11px] text-[#00000099]">
                                    {booking.unitNumber}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[12px] text-[#7B7B7A]">Route:</span>
                                <span className="text-[13px] font-[600]">{booking.route || "—"}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <div className="text-[11px] text-[#7B7B7A] mb-1">Travel Date</div>
                                <div className="px-2 py-1 bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[11px] text-[#00000099] rounded-[4px] text-center">
                                    {booking.travelDate || "—"}
                                </div>
                            </div>
                            <div>
                                <div className="text-[11px] text-[#7B7B7A] mb-1">Passengers</div>
                                <div className="px-2 py-1 bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[11px] text-[#00000099] rounded-[4px] text-center">
                                    {booking.passengerCount ?? 0}
                                    {booking.seats && booking.seats.length > 0 ? ` (${booking.seats.join(", ")})` : ""}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <div>
                                <div className="text-[11px] text-[#7B7B7A]">Payment</div>
                                <div className="text-[16px] font-[700]">{formatAmount(booking.amount)}</div>
                            </div>
                            <div
                                className="px-3 py-1 border rounded-[4px] text-[11px] font-[600]"
                                style={{
                                    borderColor: paymentStyle(booking.paymentStatus).color,
                                    background: paymentStyle(booking.paymentStatus).bg,
                                    color: paymentStyle(booking.paymentStatus).color,
                                }}
                            >
                                {booking.paymentStatus}
                            </div>
                        </div>

                        {booking.status !== "Cancelled" && (
                            <div className="mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => handleCancel(booking, startIdx + idx)}
                                    className="w-full py-2 px-3 bg-red-600 text-white rounded-lg text-[13px] font-[600] hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Cancel Booking
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {bookings.length === 0 && (
                    <div className="py-10 text-center text-[#7B7B7A] text-[14px]">No bookings found.</div>
                )}
            </div>

            {/* Popup Modal */}
            {isPopupOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 poppins p-4">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-[420px] shadow-lg">
                        <h2 className="text-[16px] sm:text-[18px] font-[700] mb-4">Edit Booking</h2>

                        {selectedBooking?.status === "Cancelled" && selectedBooking?.cancellationReason && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                                <div className="text-[12px] font-[600] text-red-700 mb-1">BOOKING CANCELLED</div>
                                <div className="text-[13px] text-red-600">
                                    <span className="font-[500]">Reason:</span> {selectedBooking.cancellationReason}
                                </div>
                                {selectedBooking.cancelledAt && (
                                    <div className="text-[11px] text-red-500 mt-1">
                                        Cancelled at: {selectedBooking.cancelledAt}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-4 text-[13px] text-[#7B7B7A]">
                            <div>
                                <span className="font-[600] text-black">{selectedBooking?.unitName}</span>{" "}
                                ({selectedBooking?.unitNumber}) — {selectedBooking?.route}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[13px] sm:text-[14px] font-[500] mb-1">Payment Status</label>
                            <select
                                value={newPaymentStatus}
                                onChange={(e) => setNewPaymentStatus(e.target.value)}
                                disabled={selectedBooking?.status === "Cancelled"}
                                className="w-full p-2 bg-[#F7F7F7] rounded-[5px] outline-none border-0 focus:ring-0 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Failed">Failed</option>
                                <option value="Refunded">Refunded</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[13px] sm:text-[14px] font-[500] mb-1">Status</label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                disabled={selectedBooking?.status === "Cancelled"}
                                className="w-full p-2 bg-[#F7F7F7] rounded-[5px] outline-none border-0 focus:ring-0 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsPopupOpen(false)}
                                className="px-3 sm:px-4 py-2 bg-gray-200 rounded-[5px] text-[13px] sm:text-[14px] font-[700]"
                            >
                                {selectedBooking?.status === "Cancelled" ? "Close" : "Cancel"}
                            </button>
                            {selectedBooking?.status !== "Cancelled" && (
                                <button
                                    onClick={handlePopupSubmit}
                                    disabled={isSaving}
                                    className="px-3 sm:px-4 py-2 bg-[#0955AC] text-white rounded-[5px] text-[13px] sm:text-[14px] font-[700] disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-2 mt-6 sm:mt-10">
                <div className="flex items-center">
                    <span className="mr-2 sm:mr-3 text-[#00000080] text-[13px] sm:text-[15px]">Results per page</span>
                    <select
                        className="rounded px-2 sm:px-3 py-2 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border border-[#BEBEBE] w-[70px] sm:w-[90px] h-[36px] sm:h-[40px] focus:outline-none"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    >
                        {perPageOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full">
                    <button
                        className="size-[36px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 flex-shrink-0"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span className="text-lg">&#60;</span>
                    </button>
                    {getPageNumbers().map((num, idx) =>
                        num === "..." ? (
                            <span key={`dots-${idx}`} className="px-1 sm:px-2">
                                ...
                            </span>
                        ) : (
                            <button
                                key={`p-${num}`}
                                className={`size-[36px] sm:size-[40px] text-[14px] sm:text-[16px] font-[600] rounded-[4px] flex-shrink-0 bg-[#F4F3F3] ${
                                    currentPage === num ? " text-[#0955AC] font-[600] border-[2px] border-[#0955AC]" : ""
                                }`}
                                onClick={() => goToPage(num)}
                            >
                                {num}
                            </button>
                        )
                    )}
                    <button
                        className="size-[36px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 flex-shrink-0"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="text-lg">&#62;</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CarBookingTableTwo;
