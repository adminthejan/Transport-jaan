import React from "react";
import { Link, usePage } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import BookingReferenceDisplay from "../../../../Components/BookingReferenceDisplay";

const JourneyLeg = ({ label, booking }) => (
    <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center rounded-md bg-[#0955AC]/10 px-3 py-1 text-xs font-bold text-[#0955AC]">
                {label}
            </span>
            <BookingReferenceDisplay reference={booking.reference} size="small" showCopy={true} />
        </div>
        <div className="flex justify-between items-center">
            <div>
                <p className="font-semibold text-gray-900">{booking.schedule.departure_station}</p>
                <p className="text-sm text-gray-600">{booking.schedule.departure_time}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{booking.schedule.duration}</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-900">{booking.schedule.arrival_station}</p>
                <p className="text-sm text-gray-600">{booking.schedule.arrival_time}</p>
            </div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">{booking.schedule.date}</p>
        <p className="text-center text-xs text-gray-500 mt-1">
            {booking.train.name} · {booking.train.number} · {booking.train.class}
        </p>
    </div>
);

const TrainBookingSuccess = () => {
    const { props } = usePage();
    const { booking, returnBooking } = props;
    const isRoundTrip = booking.trip_type === 'round_trip' && !!returnBooking;
    const combinedTotal = isRoundTrip ? booking.total_amount + returnBooking.total_amount : booking.total_amount;

    return (
        <div>
            <Header />
            <section className="mx-auto w-full max-w-4xl px-4 md:px-6 lg:px-8 py-12">
                {/* Success Message */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                    <p className="text-lg text-gray-600">
                        {isRoundTrip
                            ? "Your round-trip train tickets have been successfully booked."
                            : "Your train ticket has been successfully booked."}
                    </p>
                </div>

                {/* Booking Details */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-[#0955AC] text-white px-6 py-4">
                        <h2 className="text-lg font-semibold mb-3">
                            {isRoundTrip ? "Booking References" : "Booking Reference"}
                        </h2>
                        <BookingReferenceDisplay
                            reference={booking.reference}
                            size="large"
                            showCopy={true}
                            showValidation={true}
                        />
                    </div>

                    <div className="p-6">
                        {/* Passenger Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Passenger Information</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Name:</span> {booking.passenger_name}</p>
                                <p><span className="font-medium">Email:</span> {booking.passenger_email}</p>
                                <p><span className="font-medium">Phone:</span> {booking.passenger_phone}</p>
                                <p><span className="font-medium">Passengers:</span> {booking.adults} Adults, {booking.children} Children, {booking.infants} Infants</p>
                            </div>
                        </div>

                        {/* Journey Details */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                {isRoundTrip ? "Journey Details (Round Trip)" : "Journey Details"}
                            </h3>
                            <div className="space-y-4">
                                <JourneyLeg label={isRoundTrip ? "DEPARTURE" : "JOURNEY"} booking={booking} />
                                {isRoundTrip && <JourneyLeg label="RETURN" booking={returnBooking} />}
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {isRoundTrip ? "Total Amount (Both Legs)" : "Total Amount"}
                            </h3>
                            <p className="text-3xl font-bold text-[#0955AC]">LKR {combinedTotal.toLocaleString()}</p>
                            <p className="text-sm text-gray-600 mt-1">Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</p>
                        </div>

                        {/* Important Notes */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Important Notes</h3>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <ul className="text-sm space-y-1">
                                    <li>• Please arrive at the station 30 minutes before departure</li>
                                    <li>• Carry a valid ID for verification</li>
                                    <li>• Keep this booking reference for future correspondence</li>
                                    {isRoundTrip && <li>• Your outbound and return tickets can be cancelled independently</li>}
                                    <li>• Contact our support for any changes or cancellations</li>
                                </ul>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => window.print()}
                                className="bg-[#0955AC] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#074489] transition-colors"
                            >
                                Print Ticket{isRoundTrip ? "s" : ""}
                            </button>
                            <Link
                                href="/trainTicketBookingDetails"
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-center"
                            >
                                Book Another Ticket
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default TrainBookingSuccess;
