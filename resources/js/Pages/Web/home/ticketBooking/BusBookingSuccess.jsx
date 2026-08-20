import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Bus, Users, Download, Eye, Mail, Home, Info } from 'lucide-react';
import Header from '../client/ClientHeader';
import Footer from '../../layouts/Footer';
import BookingReferenceDisplay from '../../../../Components/BookingReferenceDisplay';

const emailTicket = (reference, email) => {
    if (!confirm('Send ticket to ' + (email || 'your email') + '?')) return;
    fetch(`/bus-ticket/email/${reference}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
            'Accept': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => alert(data.success ? data.message : 'Failed to send email. Please try again.'))
        .catch(() => alert('Failed to send email. Please try again.'));
};

const InfoField = ({ label, value }) => (
    <div>
        <p className="text-[11px] font-[700] text-[#94A3B8] tracking-widest uppercase">{label}</p>
        <p className="mt-0.5 text-[14px] font-[700] text-[#0F172A]">{value}</p>
    </div>
);

const LegCard = ({ label, booking }) => (
    <div className="border-t border-[#F1F5F9] px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="inline-flex items-center gap-2 text-[15px] font-[800] text-[#0F172A]">
                <Bus className="w-4 h-4 text-[#0955AC]" /> {label}
            </h2>
            <BookingReferenceDisplay reference={booking.reference} size="small" showCopy={true} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4 mb-5">
            <InfoField label="From" value={booking.departureStation} />
            <InfoField label="To" value={booking.arrivalStation} />
            <InfoField label="Date" value={booking.departureDate} />
            <InfoField label="Time" value={`${booking.departureTime} - ${booking.arrivalTime}`} />
            <InfoField label="Bus" value={`${booking.busOperator} · ${booking.busNumber}`} />
            <InfoField
                label="Seats"
                value={`${Array.isArray(booking.seats) ? booking.seats.sort((a, b) => a - b).join(', ') : booking.seats} · LKR ${booking.totalPrice.toLocaleString()}`}
            />
        </div>

        <div className="flex flex-wrap gap-2.5">
            <a
                href={`/bus-ticket/download/${booking.reference}`}
                className="inline-flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] px-4 py-2 rounded-full text-[13px] font-[700] transition-colors"
                target="_blank"
                rel="noreferrer"
            >
                <Download className="w-4 h-4" /> Download
            </a>
            <a
                href={`/bus-ticket/view/${booking.reference}`}
                className="inline-flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] px-4 py-2 rounded-full text-[13px] font-[700] transition-colors"
                target="_blank"
                rel="noreferrer"
            >
                <Eye className="w-4 h-4" /> View
            </a>
            <button
                onClick={() => emailTicket(booking.reference, booking.passengerEmail)}
                className="inline-flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] px-4 py-2 rounded-full text-[13px] font-[700] transition-colors"
            >
                <Mail className="w-4 h-4" /> Email
            </button>
        </div>
    </div>
);

const BusBookingSuccess = ({ booking, returnBooking }) => {
    const isRoundTrip = booking.tripType === 'round_trip' && !!returnBooking;
    const combinedTotal = isRoundTrip ? booking.totalPrice + returnBooking.totalPrice : booking.totalPrice;

    return (
        <div className="bg-[#F6F7F9] min-h-screen">
            <Head title="Booking Confirmed - Transport Jaan" />
            <Header />

            <div className="py-10 sm:py-14 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.05)] overflow-hidden">
                    {/* Success header */}
                    <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] text-white px-6 py-10 sm:py-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/15">
                            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.75} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-[800] mb-2">Booking Confirmed!</h1>
                        <p className="text-[14px] sm:text-[16px] text-white/90">
                            {isRoundTrip ? "Your round-trip bus booking is confirmed" : "Thank you for your booking"}
                        </p>
                        <div className="mt-5 inline-flex">
                            <BookingReferenceDisplay reference={booking.reference} size="medium" showCopy={true} showValidation={false} />
                        </div>
                    </div>

                    {/* Passenger details */}
                    <div className="px-5 sm:px-7 py-5 sm:py-6">
                        <h2 className="inline-flex items-center gap-2 text-[15px] font-[800] text-[#0F172A] mb-4">
                            <Users className="w-4 h-4 text-[#0955AC]" /> Passenger Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                            <InfoField label="Name" value={booking.passengerName} />
                            <InfoField label="Contact" value={booking.passengerPhone} />
                            {booking.passengerEmail && (
                                <div className="md:col-span-2">
                                    <InfoField label="Email" value={booking.passengerEmail} />
                                </div>
                            )}
                        </div>
                    </div>

                    <LegCard label={isRoundTrip ? "Departure" : "Trip Details"} booking={booking} />
                    {isRoundTrip && <LegCard label="Return" booking={returnBooking} />}

                    {/* Payment summary */}
                    <div className="border-t border-[#F1F5F9] px-5 sm:px-7 py-5 sm:py-6">
                        <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3.5">
                            <div>
                                <p className="text-[11px] font-[700] text-[#94A3B8] tracking-widest uppercase">Status</p>
                                <span className="inline-flex items-center gap-1.5 mt-0.5 text-[13px] font-[800] text-green-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> {booking.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-[700] text-[#94A3B8] tracking-widest uppercase">
                                    {isRoundTrip ? "Total (Both Legs)" : "Total Amount"}
                                </p>
                                <p className="text-[#0955AC] text-[20px] font-[800]">LKR {combinedTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 sm:px-7 py-5 sm:py-6 border-t border-[#F1F5F9] flex flex-wrap gap-3 justify-end">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-[#0955AC] hover:bg-[#073E82] text-white px-6 py-3 rounded-full text-[14px] font-[700] transition-colors shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                        >
                            <Home className="w-4 h-4" /> Back to Home
                        </Link>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="max-w-3xl mx-auto mt-6">
                    <div className="rounded-2xl bg-white border border-[#EEF2F6] shadow-[0_2px_10px_rgba(15,23,42,0.05)] p-5 sm:p-6">
                        <h3 className="inline-flex items-center gap-2 font-[800] text-[#0F172A] text-[15px] mb-3">
                            <Info className="w-4 h-4 text-[#0955AC]" /> Important Information
                        </h3>
                        <ul className="space-y-2 text-[13px] sm:text-[14px] text-[#64748B]">
                            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8] shrink-0" /> Please arrive at the bus station at least 30 minutes before departure time.</li>
                            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8] shrink-0" /> You must present your booking reference number when boarding.</li>
                            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8] shrink-0" /> Luggage allowance: 2 pieces per passenger, not exceeding 20kg total.</li>
                            {isRoundTrip && (
                                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8] shrink-0" /> Your departure and return tickets can be cancelled independently.</li>
                            )}
                            <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[#94A3B8] shrink-0" /> For cancellations and refunds, please contact customer service at least 24 hours before departure.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default BusBookingSuccess;
