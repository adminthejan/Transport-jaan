import React, { useState, useEffect } from "react";
import axios from "axios";
import miniUp from "../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../assets/vendors/dashboard/icons/miniDown.svg";
import { Trash2, UserCog, Check, X } from "lucide-react";
import VendorCancellationModal from "./VendorCancellationModal";
import AssignDriverModal from "./AssignDriverModal";

/** Hide the plate chip if it's empty or just a dash */
const hasRealPlate = (p) => {
  if (p === null || p === undefined) return false;
  const t = String(p).trim();
  return t !== "" && t !== "-" && t !== "—";
};

/**
 * bookings: array of
 *  { id, bookingDate, clientName, carModel, carPlate, plan, startDate, endDate,
 *    payment, paymentStatus, status, paymentStatusColor, paymentStatusBg,
 *    statusBg, statusText }
 */
const CarBookingTableTwo = ({ bookings = [], setBookings, statusColors, drivers = [] }) => {
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const perPageOptions = [5, 10, 20, 50];

  const totalPages = Math.max(1, Math.ceil(bookings.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentBookings = bookings.slice(startIdx, endIdx);

  // Popup
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newPayment, setNewPayment] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Cancellation Modal
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Assign Driver Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [bookingToAssign, setBookingToAssign] = useState(null);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
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

  const handleRowClick = (booking, index) => {
    if (booking?.editable === false) return;
    setSelectedBooking({ ...booking, index: startIdx + index });
    setNewPayment(booking.payment);
    setNewPaymentStatus(booking.paymentStatus);
    setNewStatus(booking.status);
    setIsPopupOpen(true);
  };

  const handlePopupSubmit = async () => {
    if (!selectedBooking) return;
    
    try {
      // Map UI status to backend status
      const backendStatus = newStatus.toLowerCase();
      
      // Call backend API to update booking
      const bookingType = selectedBooking.bookingType || "land";
      const bookingId = selectedBooking.rawId ?? selectedBooking.id;
      const response = await axios.patch(`/vendors/api/bookings/${bookingType}/${bookingId}`, {
        status: backendStatus,
        payment_status: newPaymentStatus.toLowerCase(),
        total_amount: parseFloat(newPayment)
      });
      
      if (response.data.success) {
        const updated = [...bookings];
        const paymentStatusColors = {
          Paid: { color: "#3B8F31", bg: "#ACE199" },
          Pending: { color: "#FF6060", bg: "#FF60608C" },
        };

        updated[selectedBooking.index] = {
          ...selectedBooking,
          payment: newPayment,
          paymentStatus: newPaymentStatus,
          paymentStatusColor: paymentStatusColors[newPaymentStatus]?.color || "#7B7B7A",
          paymentStatusBg: paymentStatusColors[newPaymentStatus]?.bg || "#E8E8EF",
          status: newStatus,
          statusBg: statusColors?.[newStatus]?.bg || "#FF9800",
          statusText: statusColors?.[newStatus]?.text || "#FFFFFF",
        };

        setBookings(updated);
        setIsPopupOpen(false);
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Failed to update booking:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update booking. Please try again.';
      alert(errorMessage);
    }
  };

  const applyStatusUpdate = (booking, statusLabel) => {
    const idx = bookings.findIndex(
      (b) => b.bookingType === booking.bookingType && b.rawId === booking.rawId
    );
    if (idx === -1) return;

    const updated = [...bookings];
    updated[idx] = {
      ...updated[idx],
      status: statusLabel,
      statusBg: statusColors?.[statusLabel]?.bg || updated[idx].statusBg,
      statusText: statusColors?.[statusLabel]?.text || updated[idx].statusText,
    };
    setBookings(updated);
  };

  const handleAccept = async (booking) => {
    try {
      const res = await axios.post(
        `/multiModel/vendor/booking/approve/${booking.rawId}/${booking.bookingType}`
      );
      if (res.data?.success) {
        applyStatusUpdate(booking, "Confirmed");
      } else {
        alert(res.data?.message || "Failed to accept booking.");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to accept booking.");
    }
  };

  const handleReject = async (booking) => {
    const reason = window.prompt("Reason for rejecting this booking:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    try {
      const res = await axios.post(
        `/multiModel/vendor/booking/reject/${booking.rawId}/${booking.bookingType}`,
        { reason: reason.trim() }
      );
      if (res.data?.success) {
        applyStatusUpdate(booking, "Cancelled");
      } else {
        alert(res.data?.message || "Failed to reject booking.");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to reject booking.");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  return (
    <div className="py-6 sm:py-10">
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[800px] lg:min-w-[1100px]">
          {/* headings */}
          <div className="grid grid-cols-9 bg-[#D8E4F2] h-[42px] items-center rounded-[8px] text-[12px] sm:text-[14px] font-[600] px-4 sm:px-10">
            {[
              "Book id",
              "Booking Date",
              "Client Name",
              "Car Model",
              "Plan",
              "Date",
              "Payment",
              "Status",
              "Actions",
            ].map((h, i) => (
              <div key={i} className={`flex items-center gap-2 ${i === 6 ? "sm:ml-10" : ""}`}>
                <span>{h}</span>
                <div className="flex flex-col items-center">
                  <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                  <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
                </div>
              </div>
            ))}
          </div>

      {/* rows */}
      {currentBookings.map((booking, idx) => (
        <div
          key={startIdx + idx}
          className={`grid grid-cols-9 ${
            startIdx + idx !== bookings.length - 1 ? "border-b-[1.5px] border-[#00000033]" : ""
          } h-[100px] items-center text-[13px] sm:text-[15px] font-[500] px-4 sm:px-10 hover:bg-gray-100`}
        >
          <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>{booking.id}</div>
          <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>{booking.bookingDate}</div>
          <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>{booking.clientName}</div>

          {/* Car Model (no blank space if plate is missing) */}
          <div className="flex flex-col cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
            {booking.carModel ? <div>{booking.carModel}</div> : null}

            {hasRealPlate(booking.carPlate) && (
              <div
                className={`inline-flex ${booking.carModel ? "mt-1" : ""} w-[87px] h-[22px] rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] justify-center items-center text-[#00000099] text-[11px] sm:text-[13px]`}
              >
                {booking.carPlate}
              </div>
            )}
          </div>

          <div className="cursor-pointer" onClick={() => handleRowClick(booking, idx)}>{booking.plan}</div>

          <div className="text-[12px] sm:text-[14px] font-[500] text-[#939392] cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
            <div className="flex gap-2 items-center">
              <span>Start</span>
              <div className="w-[80px] sm:w-[92px] h-[22px] bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[10px] sm:text-[11px] text-[#00000099] flex justify-center items-center rounded-[4px]">
                {booking.startDate}
              </div>
            </div>
            <div className="flex gap-3 items-center mt-1">
              <span>End</span>
              <div className="w-[80px] sm:w-[92px] h-[22px] bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[10px] sm:text-[11px] text-[#00000099] flex justify-center items-center rounded-[4px]">
                {booking.endDate}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center cursor-pointer" onClick={() => handleRowClick(booking, idx)}>
            <div>{booking.payment}</div>
            <div
              className="w-[70px] sm:w-[80px] h-[20px] border rounded-[4px] text-[10px] sm:text-[11px] text-[#00000099] font-[600] flex justify-center items-center"
              style={{ borderColor: booking.paymentStatusColor, background: booking.paymentStatusBg }}
            >
              {booking.paymentStatus}
            </div>
          </div>

          <div
            className="w-[76px] sm:w-[86px] h-[22px] border rounded-[4px] flex justify-center items-center text-[10px] sm:text-[11px] font-[700] cursor-pointer"
            style={{ background: booking.statusBg, borderColor: "#0000004D", color: booking.statusText }}
            onClick={() => handleRowClick(booking, idx)}
          >
            {booking.status}
          </div>

          {/* Actions Column */}
          <div className="flex flex-col justify-center items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {booking.assignedDriverName && (
              <span
                className="text-[10px] text-[#0955AC] font-[600] truncate max-w-[130px]"
                title={booking.assignedDriverName}
              >
                {booking.assignedDriverName}
              </span>
            )}
            <div className="flex items-center gap-1">
              {booking.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleAccept(booking)}
                    className="p-2 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                    title="Accept booking"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleReject(booking)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Reject booking"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
              {booking.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    setBookingToAssign(booking);
                    setShowAssignModal(true);
                  }}
                  className="p-2 text-[#0955AC] hover:bg-blue-50 rounded-lg transition-colors"
                  title={booking.assignedDriverName ? "Reassign driver" : "Assign driver"}
                >
                  <UserCog className="h-5 w-5" />
                </button>
              )}
              {booking.canCancel !== false && booking.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    setBookingToCancel(booking);
                    setShowCancellationModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cancel booking"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
        </div>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="lg:hidden space-y-4">
        {currentBookings.map((booking, idx) => (
          <div
            key={startIdx + idx}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
            style={{ boxShadow: "2px 2px 8px #0000001A" }}
            onClick={() => handleRowClick(booking, idx)}
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-[10px] text-[#7B7B7A] font-[500]">Book ID</div>
                <div className="text-[16px] font-[700] text-[#0955AC]">{booking.id}</div>
              </div>
              <div
                className="px-3 py-1 rounded-[4px] text-[11px] font-[700]"
                style={{ background: booking.statusBg, color: booking.statusText }}
              >
                {booking.status}
              </div>
            </div>

            {/* Client & Date Info */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between">
                <span className="text-[12px] text-[#7B7B7A]">Client:</span>
                <span className="text-[13px] font-[600]">{booking.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-[#7B7B7A]">Booking Date:</span>
                <span className="text-[13px] font-[500]">{booking.bookingDate}</span>
              </div>
            </div>

            {/* Car Info */}
            <div className="bg-[#F9FAFB] rounded-md p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-[#7B7B7A]">Car Model:</span>
                <span className="text-[13px] font-[600]">{booking.carModel}</span>
              </div>
              {hasRealPlate(booking.carPlate) && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] text-[#7B7B7A]">Plate:</span>
                  <div className="px-2 py-1 rounded-[4px] bg-[#D9D9D957] border border-[#0000004D] text-[11px] text-[#00000099]">
                    {booking.carPlate}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[#7B7B7A]">Plan:</span>
                <span className="text-[13px] font-[600]">{booking.plan}</span>
              </div>
              {booking.assignedDriverName && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[12px] text-[#7B7B7A]">Driver:</span>
                  <span className="text-[13px] font-[600] text-[#0955AC]">{booking.assignedDriverName}</span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[11px] text-[#7B7B7A] mb-1">Start Date</div>
                <div className="px-2 py-1 bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[11px] text-[#00000099] rounded-[4px] text-center">
                  {booking.startDate}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#7B7B7A] mb-1">End Date</div>
                <div className="px-2 py-1 bg-[#D9D9D957] border-[0.5px] border-[#0000004D] text-[11px] text-[#00000099] rounded-[4px] text-center">
                  {booking.endDate}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <div>
                <div className="text-[11px] text-[#7B7B7A]">Payment</div>
                <div className="text-[16px] font-[700]">{booking.payment}</div>
              </div>
              <div
                className="px-3 py-1 border rounded-[4px] text-[11px] font-[600]"
                style={{ borderColor: booking.paymentStatusColor, background: booking.paymentStatusBg, color: booking.paymentStatusColor }}
              >
                {booking.paymentStatus}
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              {booking.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleAccept(booking)}
                    className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg text-[13px] font-[600] hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(booking)}
                    className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-[13px] font-[600] hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </>
              )}
              {booking.editable !== false && (
                <button
                  onClick={() => handleRowClick(booking, idx)}
                  className="flex-1 py-2 px-3 bg-[#0955AC] text-white rounded-lg text-[13px] font-[600] hover:bg-[#0744a0] transition-colors"
                >
                  View Details
                </button>
              )}
              {booking.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    setBookingToAssign(booking);
                    setShowAssignModal(true);
                  }}
                  className="flex-1 py-2 px-3 bg-[#0955AC] text-white rounded-lg text-[13px] font-[600] hover:bg-[#0744a0] transition-colors flex items-center justify-center gap-2"
                >
                  <UserCog className="h-4 w-4" />
                  {booking.assignedDriverName ? "Reassign" : "Driver"}
                </button>
              )}
              {booking.canCancel !== false && booking.status !== "Cancelled" && (
                <button
                  onClick={() => {
                    setBookingToCancel(booking);
                    setShowCancellationModal(true);
                  }}
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-[13px] font-[600] hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-[420px] shadow-lg">
            <h2 className="text-[16px] sm:text-[18px] font-[700] mb-4">Edit Booking</h2>

            {/* Show cancellation reason if booking is cancelled */}
            {selectedBooking?.status === 'Cancelled' && selectedBooking?.cancellationReason && (
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

            <div className="mb-4">
              <label className="block text-[13px] sm:text-[14px] font-[500] mb-1">Payment Amount</label>
              <input
                type="text"
                value={newPayment}
                onChange={(e) => setNewPayment(e.target.value)}
                disabled={selectedBooking?.status === 'Cancelled'}
                className="w-full p-2 bg-[#F7F7F7] rounded-[5px] outline-none border-0 focus:ring-0 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter payment amount"
              />
            </div>

            <div className="mb-4">
              <label className="block text-[13px] sm:text-[14px] font-[500] mb-1">Payment Status</label>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value)}
                disabled={selectedBooking?.status === 'Cancelled'}
                className="w-full p-2 bg-[#F7F7F7] rounded-[5px] outline-none border-0 focus:ring-0 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-[13px] sm:text-[14px] font-[500] mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={selectedBooking?.status === 'Cancelled'}
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
                {selectedBooking?.status === 'Cancelled' ? 'Close' : 'Cancel'}
              </button>
              {selectedBooking?.status !== 'Cancelled' && (
                <button
                  onClick={handlePopupSubmit}
                  className="px-3 sm:px-4 py-2 bg-[#0955AC] text-white rounded-[5px] text-[13px] sm:text-[14px] font-[700]"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
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
            &lt;
          </button>

          {getPageNumbers().map((num, i) =>
            num === "..." ? (
              <span key={`dots-${i}`} className="px-1 sm:px-2">...</span>
            ) : (
              <button
                key={`p-${num}`}
                className={`size-[36px] sm:size-[40px] rounded-[4px] text-[14px] sm:text-[16px] font-[600] flex-shrink-0 ${
                  currentPage === num
                    ? "bg-white border-2 border-[#0955AC] text-[#0955AC]"
                    : "bg-[#F4F3F3]"
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
            &gt;
          </button>
        </div>
      </div>

      {/* Cancellation Modal */}
      <VendorCancellationModal
        booking={bookingToCancel}
        isOpen={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setBookingToCancel(null);
        }}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Assign Driver Modal */}
      <AssignDriverModal
        booking={bookingToAssign}
        drivers={drivers}
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setBookingToAssign(null);
        }}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};

export default CarBookingTableTwo;
