import React from 'react';
import { Link } from '@inertiajs/react';
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

const LegCard = ({ label, booking }) => (
    <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">{label}</h2>
            <BookingReferenceDisplay reference={booking.reference} size="small" showCopy={true} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600 mb-4">
            <div>
                <p className="text-sm font-medium text-gray-500">From</p>
                <p>{booking.departureStation}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">To</p>
                <p>{booking.arrivalStation}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p>{booking.departureDate}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p>{booking.departureTime} - {booking.arrivalTime}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Bus</p>
                <p>{booking.busOperator} · {booking.busNumber} ({booking.busType})</p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">Seats</p>
                <p>
                    {Array.isArray(booking.seats) ? booking.seats.sort((a, b) => a - b).join(', ') : booking.seats}
                    {' '}({Array.isArray(booking.seats) ? booking.seats.length : 0} total) · LKR {booking.totalPrice.toLocaleString()}
                </p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <a
                href={`/bus-ticket/download/${booking.reference}`}
                className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                target="_blank"
                rel="noreferrer"
            >
                📄 Download
            </a>
            <a
                href={`/bus-ticket/view/${booking.reference}`}
                className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                target="_blank"
                rel="noreferrer"
            >
                👁️ View
            </a>
            <button
                onClick={() => emailTicket(booking.reference, booking.passengerEmail)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                📧 Email
            </button>
        </div>
    </div>
);

const BusBookingSuccess = ({ booking, returnBooking }) => {
    const isRoundTrip = booking.tripType === 'round_trip' && !!returnBooking;
    const combinedTotal = isRoundTrip ? booking.totalPrice + returnBooking.totalPrice : booking.totalPrice;

    return (
        <div>
            <Header />

            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                    {/* Success header */}
                    <div className="bg-[#0955AC] text-white px-6 py-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
                        <p className="text-xl opacity-90">
                            {isRoundTrip ? "Your round-trip bus booking is confirmed" : "Thank you for your booking"}
                        </p>
                    </div>

                    {/* Passenger details */}
                    <div className="border-b px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Passenger Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Name</p>
                                <p>{booking.passengerName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Contact</p>
                                <p>{booking.passengerPhone}</p>
                            </div>
                            {booking.passengerEmail && (
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-gray-500">Email</p>
                                    <p>{booking.passengerEmail}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <LegCard label={isRoundTrip ? "Departure" : "Trip Details"} booking={booking} />
                    {isRoundTrip && <LegCard label="Return" booking={returnBooking} />}

                    {/* Payment summary */}
                    <div className="border-b px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Payment</h2>
                        <p className="text-gray-600">
                            <span className="font-medium">Status:</span>{' '}
                            <span className="text-green-600 font-semibold">{booking.status.toUpperCase()}</span>
                        </p>
                        <p className="text-gray-600">
                            <span className="font-medium">{isRoundTrip ? "Total Amount (Both Legs):" : "Total Amount:"}</span>{' '}
                            <span className="text-[#0955AC] font-bold">LKR {combinedTotal.toLocaleString()}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-6 flex flex-wrap gap-4 justify-end">
                        <Link
                            href="/flight-booking"
                            className="inline-block bg-[#0955AC] hover:bg-[#074489] text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="max-w-3xl mx-auto mt-8 px-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Important Information:</h3>
                    <ul className="list-disc pl-5 text-gray-600 space-y-1 text-sm">
                        <li>Please arrive at the bus station at least 30 minutes before departure time.</li>
                        <li>You must present your booking reference number when boarding.</li>
                        <li>Luggage allowance: 2 pieces per passenger, not exceeding 20kg total.</li>
                        {isRoundTrip && <li>Your departure and return tickets can be cancelled independently.</li>}
                        <li>For cancellations and refunds, please contact customer service at least 24 hours before departure.</li>
                    </ul>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default BusBookingSuccess;
