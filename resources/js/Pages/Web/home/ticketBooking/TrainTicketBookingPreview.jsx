import React, { useState } from "react";
import { router, usePage, useForm } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import TripRouteMap from "../../components/ticketBooking/TripRouteMap";
import LocaleSelector from "../../components/ticketBooking/LocaleSelector";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

const TrainTicketBookingPreviewInner = () => {
    const { t, formatPrice } = useLocale();
    const { props } = usePage();
    const {
        outboundSchedule,
        returnSchedule,
        passengers = {},
        totalPrice = 0
    } = props;

    const { data, setData, post, processing, errors } = useForm({
        train_schedule_id: outboundSchedule?.id || '',
        return_schedule_id: returnSchedule?.id || '',
        passenger_name: '',
        passenger_email: '',
        passenger_phone: '',
        adults: passengers.adults || 1,
        children: passengers.children || 0,
        infants: passengers.infants || 0,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/train-bookings');
    };

    return (
        <div>
            <Header />
            <section className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 py-6">
                {/* Back — reached either from the standalone train search page or
                    from the multimodal journey planner's inline results. Honor real
                    navigation history so we return wherever the user actually came
                    from, falling back to the standalone search page only if there's
                    no history to go back to (e.g. page opened directly). */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                                return;
                            }
                            router.visit("/trainTicketBookingDetails");
                        }}
                        className="inline-flex items-center gap-2 text-[#0955AC] text-base font-semibold"
                    >
                        <span className="inline-block rounded-full border border-[#0955AC]/20 p-1 leading-none">
                            ←
                        </span>
                        Back
                    </button>
                </div>

                {/* Title */}
                <div className="flex justify-center mb-2">
                    <LocaleSelector />
                </div>
                <h1 className="text-center text-4xl md:text-5xl font-extrabold tracking-wide text-[#0955AC] uppercase">
                    {t("passenger_information", "Passenger Information")}
                </h1>

                {/* Top two-column: Trip details (left) & Fare summary (right) */}
                <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Itineraries */}
                    <div className="space-y-4">
                        {/* Outbound Journey */}
                        {outboundSchedule && (
                            <div className="rounded-[10px] border border-gray-200 overflow-hidden">
                                <div className="bg-[#0955AC] px-4 py-3 flex items-center gap-2 font-semibold text-[#FFFFFF]">
                                    <span className="text-xl">🚂</span>
                                    {outboundSchedule.departure_station} to {outboundSchedule.arrival_station} - {outboundSchedule.date}
                                </div>
                                <div className="px-4 py-3 text-base leading-6 text-gray-800">
                                    <div>
                                        Depart:{" "}
                                        <span className="font-semibold">{outboundSchedule.departure_time}</span>{" "}
                                        <span className="mx-1">➜</span> Arrival:{" "}
                                        <span className="font-semibold">{outboundSchedule.arrival_time}</span>
                                    </div>
                                    <div>
                                        Class:{" "}
                                        <span className="font-semibold">
                                            {outboundSchedule.class}
                                        </span>
                                    </div>
                                    <div>
                                        Train Number:{" "}
                                        <span className="font-semibold">
                                            {outboundSchedule.train_number}
                                        </span>
                                        , {outboundSchedule.train_name}
                                    </div>
                                    <div>
                                        Total Duration:{" "}
                                        <span className="font-semibold">{outboundSchedule.duration}</span>
                                        , Non-stop
                                    </div>
                                    <div className="italic text-gray-600">
                                        Hand baggage: 20kg/passenger
                                    </div>
                                </div>
                                {outboundSchedule.route && (
                                    <div className="px-4 pb-4">
                                        <TripRouteMap route={outboundSchedule.route} className="h-[220px]" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Return Journey (if exists) */}
                        {returnSchedule && (
                            <div className="rounded-[10px] border border-gray-200 overflow-hidden">
                                <div className="bg-[#0955AC] px-4 py-3 flex items-center gap-2 font-semibold text-[#FFFFFF]">
                                    <span className="text-xl">🚂</span>
                                    {returnSchedule.departure_station} to {returnSchedule.arrival_station} - {returnSchedule.date}
                                </div>
                                <div className="px-4 py-3 text-base leading-6 text-gray-800">
                                    <div>
                                        Depart:{" "}
                                        <span className="font-semibold">{returnSchedule.departure_time}</span>{" "}
                                        <span className="mx-1">➜</span> Arrival:{" "}
                                        <span className="font-semibold">{returnSchedule.arrival_time}</span>
                                    </div>
                                    <div>
                                        Class:{" "}
                                        <span className="font-semibold">
                                            {returnSchedule.class}
                                        </span>
                                    </div>
                                    <div>
                                        Train Number:{" "}
                                        <span className="font-semibold">
                                            {returnSchedule.train_number}
                                        </span>
                                        , {returnSchedule.train_name}
                                    </div>
                                    <div>
                                        Total Duration:{" "}
                                        <span className="font-semibold">{returnSchedule.duration}</span>
                                        , Non-stop
                                    </div>
                                    <div className="italic text-gray-600">
                                        Hand baggage: 20kg/passenger
                                    </div>
                                </div>
                                {returnSchedule.route && (
                                    <div className="px-4 pb-4">
                                        <TripRouteMap route={returnSchedule.route} className="h-[220px]" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Fare breakdown */}
                    <div className="space-y-6">
                        {/* Fare Summary */}
                        <div className="rounded-[10px] border border-gray-200 overflow-hidden bg-gray-50/50">
                            <div className="bg-gray-800 text-white px-4 py-3 font-semibold">
                                {t("fare_summary", "Fare Summary")}
                            </div>
                            <div className="px-4 py-3 space-y-3">
                                <div className="flex justify-between">
                                    <span>{t("adults", "Adults")} ({passengers.adults})</span>
                                    <span>{formatPrice(outboundSchedule?.price * passengers.adults)}</span>
                                </div>
                                {passengers.children > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t("children", "Children")} ({passengers.children})</span>
                                        <span>{formatPrice(outboundSchedule?.price * 0.5 * passengers.children)}</span>
                                    </div>
                                )}
                                {passengers.infants > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t("infants", "Infants")} ({passengers.infants})</span>
                                        <span>Free</span>
                                    </div>
                                )}
                                {returnSchedule && (
                                    <>
                                        <hr className="border-gray-300" />
                                        <div className="text-sm font-medium text-gray-700 mb-2">Return Journey:</div>
                                        <div className="flex justify-between">
                                            <span>{t("adults", "Adults")} ({passengers.adults})</span>
                                            <span>{formatPrice(returnSchedule.price * passengers.adults)}</span>
                                        </div>
                                        {passengers.children > 0 && (
                                            <div className="flex justify-between">
                                                <span>{t("children", "Children")} ({passengers.children})</span>
                                                <span>{formatPrice(returnSchedule.price * 0.5 * passengers.children)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <hr className="border-gray-300" />
                                <div className="flex justify-between text-xl font-bold text-[#0955AC]">
                                    <span>{t("total", "Total")}</span>
                                    <span>{formatPrice(totalPrice)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Passenger Details Form */}
                        <div className="rounded-[10px] border border-gray-200 overflow-hidden">
                            <div className="bg-[#0955AC] text-white px-4 py-3 font-semibold">
                                {t("passenger_details", "Passenger Details")}
                            </div>
                            <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
                                <div>
                                    <label htmlFor="passenger_name" className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("full_name", "Full Name")} *
                                    </label>
                                    <input
                                        type="text"
                                        id="passenger_name"
                                        value={data.passenger_name}
                                        onChange={(e) => setData('passenger_name', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        required
                                    />
                                    {errors.passenger_name && <div className="text-red-500 text-sm mt-1">{errors.passenger_name}</div>}
                                </div>

                                <div>
                                    <label htmlFor="passenger_email" className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("email_address", "Email Address")} *
                                    </label>
                                    <input
                                        type="email"
                                        id="passenger_email"
                                        value={data.passenger_email}
                                        onChange={(e) => setData('passenger_email', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        required
                                    />
                                    {errors.passenger_email && <div className="text-red-500 text-sm mt-1">{errors.passenger_email}</div>}
                                </div>

                                <div>
                                    <label htmlFor="passenger_phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("phone_number", "Phone Number")} *
                                    </label>
                                    <input
                                        type="tel"
                                        id="passenger_phone"
                                        value={data.passenger_phone}
                                        onChange={(e) => setData('passenger_phone', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                        required
                                    />
                                    {errors.passenger_phone && <div className="text-red-500 text-sm mt-1">{errors.passenger_phone}</div>}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
                                            processing
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-[#0955AC] hover:bg-[#074489] focus:outline-none focus:ring-2 focus:ring-[#0955AC]'
                                        }`}
                                    >
                                        {processing ? 'Processing...' : t("confirm_booking", "Confirm Booking")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mt-12 p-6 bg-gray-50 rounded-[10px]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Important Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Booking Policy</h4>
                            <ul className="space-y-1">
                                <li>• Tickets are non-refundable after booking confirmation</li>
                                <li>• Please arrive at the station 30 minutes before departure</li>
                                <li>• Valid ID is required for travel</li>
                                <li>• Children below 6 years travel free (without seat)</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Cancellation Policy</h4>
                            <ul className="space-y-1">
                                <li>• 24+ hours before departure: 90% refund</li>
                                <li>• 12-24 hours before departure: 50% refund</li>
                                <li>• 6-12 hours before departure: 25% refund</li>
                                <li>• Less than 6 hours: No refund</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const TrainTicketBookingPreview = () => (
    <LocaleProvider>
        <TrainTicketBookingPreviewInner />
    </LocaleProvider>
);

export default TrainTicketBookingPreview;