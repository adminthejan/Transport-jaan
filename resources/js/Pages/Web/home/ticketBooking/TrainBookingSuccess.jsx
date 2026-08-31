import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { CheckCircle2, TrainFront, Clock, Printer, ArrowRight, Info, KeyRound } from "lucide-react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import BookingReferenceDisplay from "../../../../Components/BookingReferenceDisplay";

const JourneyLeg = ({ label, booking }) => (
    <div className="rounded-2xl border border-[#EEF2F6] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#F6F7F9] border-b border-[#EEF2F6]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0955AC]/10 px-3 py-1 text-[11px] font-[800] text-[#0955AC] tracking-wide">
                <TrainFront className="w-3.5 h-3.5" /> {label}
            </span>
            <BookingReferenceDisplay reference={booking.reference} size="small" showCopy={true} />
        </div>
        <div className="px-5 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-[800] text-[#0F172A] text-[16px]">{booking.schedule.departure_station}</p>
                    <p className="text-[13px] text-[#64748B] font-[600]">{booking.schedule.departure_time}</p>
                </div>
                <div className="flex flex-col items-center px-3 text-[#94A3B8]">
                    <Clock className="w-3.5 h-3.5 mb-1" />
                    <span className="text-[11px] font-[700]">{booking.schedule.duration}</span>
                </div>
                <div className="text-right">
                    <p className="font-[800] text-[#0F172A] text-[16px]">{booking.schedule.arrival_station}</p>
                    <p className="text-[13px] text-[#64748B] font-[600]">{booking.schedule.arrival_time}</p>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[12px] text-[#94A3B8] font-[600]">
                <span>{booking.schedule.date}</span>
                <span>{booking.train.name} · {booking.train.number} · {booking.train.class}</span>
            </div>
        </div>
    </div>
);

const TrainBookingSuccess = () => {
    const { props } = usePage();
    const { booking, returnBooking } = props;
    const isRoundTrip = booking.trip_type === 'round_trip' && !!returnBooking;
    const combinedTotal = isRoundTrip ? booking.total_amount + returnBooking.total_amount : booking.total_amount;

    return (
        <div className="bg-[#F6F7F9] min-h-screen">
            <Header />
            <section className="mx-auto w-full max-w-4xl px-4 md:px-6 lg:px-8 py-10 sm:py-14">
                {/* Success Message */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                        <CheckCircle2 className="w-10 h-10 text-green-600" strokeWidth={2} />
                    </div>
                    <h1 className="text-[26px] sm:text-[32px] font-[800] text-[#0F172A] mb-2">Booking Confirmed!</h1>
                    <p className="text-[15px] sm:text-[16px] text-[#64748B] font-[500]">
                        {isRoundTrip
                            ? "Your round-trip train tickets have been successfully booked."
                            : "Your train ticket has been successfully booked."}
                    </p>
                </div>

                {/* Booking Details */}
                <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.05)] border border-[#EEF2F6] overflow-hidden">
                    <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5">
                        <h2 className="text-white/85 text-[12px] font-[700] tracking-widest uppercase mb-2">
                            {isRoundTrip ? "Booking References" : "Booking Reference"}
                        </h2>
                        <BookingReferenceDisplay
                            reference={booking.reference}
                            size="large"
                            showCopy={true}
                            showValidation={true}
                        />
                        {booking.tracking_pin && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 text-[13px] font-[700] text-white">
                                <KeyRound className="h-4 w-4" />
                                Tracking PIN: <span className="tracking-[0.2em]">{booking.tracking_pin}</span>
                            </div>
                        )}
                    </div>

                    <div className="p-5 sm:p-7 space-y-7">
                        {/* Passenger Information */}
                        <div>
                            <h3 className="text-[15px] font-[800] text-[#0F172A] mb-3">Passenger Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px] text-[#334155]">
                                <p><span className="font-[700] text-[#64748B]">Name:</span> {booking.passenger_name}</p>
                                <p><span className="font-[700] text-[#64748B]">Phone:</span> {booking.passenger_phone}</p>
                                <p className="sm:col-span-2"><span className="font-[700] text-[#64748B]">Email:</span> {booking.passenger_email}</p>
                                <p className="sm:col-span-2"><span className="font-[700] text-[#64748B]">Passengers:</span> {booking.adults} Adults, {booking.children} Children, {booking.infants} Infants</p>
                            </div>
                        </div>

                        {/* Journey Details */}
                        <div>
                            <h3 className="text-[15px] font-[800] text-[#0F172A] mb-3">
                                {isRoundTrip ? "Journey Details (Round Trip)" : "Journey Details"}
                            </h3>
                            <div className="space-y-3">
                                <JourneyLeg label={isRoundTrip ? "Departure" : "Journey"} booking={booking} />
                                {isRoundTrip && <JourneyLeg label="Return" booking={returnBooking} />}
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="rounded-2xl bg-[#0955AC]/5 border border-[#0955AC]/10 px-6 py-5 text-center">
                            <h3 className="text-[13px] font-[700] text-[#64748B] tracking-wide uppercase mb-1">
                                {isRoundTrip ? "Total Amount (Both Legs)" : "Total Amount"}
                            </h3>
                            <p className="text-[30px] font-[800] text-[#0955AC]">LKR {combinedTotal.toLocaleString()}</p>
                            <p className="text-[13px] text-[#64748B] font-[600] mt-1">
                                Status: <span className="text-green-600 font-[700]">{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                            </p>
                        </div>

                        {/* Important Notes */}
                        <div>
                            <h3 className="text-[15px] font-[800] text-[#0F172A] mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-[#0955AC]" /> Important Notes
                            </h3>
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
                                <ul className="text-[13px] text-[#334155] space-y-1.5">
                                    <li>• Please arrive at the station 30 minutes before departure</li>
                                    <li>• Carry a valid ID for verification</li>
                                    <li>• Keep this booking reference for future correspondence</li>
                                    {isRoundTrip && <li>• Your outbound and return tickets can be cancelled independently</li>}
                                    <li>• Contact our support for any changes or cancellations</li>
                                </ul>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 h-[52px] inline-flex items-center justify-center gap-2 bg-[#0955AC] hover:bg-[#073E82] text-white rounded-[12px] font-[700] text-[14px] transition-colors shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                            >
                                <Printer className="w-4 h-4" /> Print Ticket{isRoundTrip ? "s" : ""}
                            </button>
                            <Link
                                href="/trainTicketBookingDetails"
                                className="flex-1 h-[52px] inline-flex items-center justify-center gap-2 bg-white border border-[#E2E8F0] hover:border-[#0955AC]/40 text-[#334155] rounded-[12px] font-[700] text-[14px] transition-colors"
                            >
                                Book Another Ticket <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default TrainBookingSuccess;
