import React from "react";
import { router, usePage, useForm } from "@inertiajs/react";
import { ArrowLeft, TrainFront, Clock, User, Mail, Phone, ShieldCheck } from "lucide-react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import TripRouteMap from "../../components/ticketBooking/TripRouteMap";
import LocaleSelector from "../../components/ticketBooking/LocaleSelector";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

function JourneyCard({ label, schedule }) {
    if (!schedule) return null;

    return (
        <div className="rounded-2xl border border-[#EEF2F6] bg-white overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white font-[800] text-[14px] sm:text-[15px]">
                    <TrainFront className="w-4 h-4 shrink-0" />
                    <span className="truncate">{schedule.departure_station} → {schedule.arrival_station}</span>
                </div>
                <span className="text-white/85 text-[12px] font-[600] shrink-0">{schedule.date}</span>
            </div>

            <div className="px-5 py-4 grid grid-cols-2 gap-4 text-[13px] border-b border-[#F1F5F9]">
                <div>
                    <div className="flex items-center gap-1.5 text-[#0F172A] font-[800] text-[18px]">
                        {schedule.departure_time}
                    </div>
                    <p className="text-[#94A3B8] font-[600] text-[11px]">Departure</p>
                </div>
                <div className="text-right">
                    <div className="text-[#0F172A] font-[800] text-[18px]">{schedule.arrival_time}</div>
                    <p className="text-[#94A3B8] font-[600] text-[11px]">Arrival</p>
                </div>
                <div className="flex items-center gap-1.5 text-[#64748B] font-[600]">
                    <Clock className="w-3.5 h-3.5 text-[#0955AC]" /> {schedule.duration}
                </div>
                <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-[#0955AC]/10 px-2.5 py-1 text-[11px] font-[700] text-[#0955AC]">
                        {schedule.class}
                    </span>
                </div>
                <div className="col-span-2 text-[#94A3B8] font-[600]">
                    Train {schedule.train_number} · {schedule.train_name}
                </div>
            </div>

            {schedule.route && (
                <div className="p-4">
                    <TripRouteMap route={schedule.route} className="h-[200px]" />
                </div>
            )}
        </div>
    );
}

const inputClass = (hasError) =>
    `w-full h-[48px] rounded-[10px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
        hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
    }`;

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
        <div className="bg-[#F6F7F9] min-h-screen">
            <Header />
            <section className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 py-8">
                {/* Back */}
                <button
                    type="button"
                    onClick={() => {
                        if (window.history.length > 1) {
                            window.history.back();
                            return;
                        }
                        router.visit("/trainTicketBookingDetails");
                    }}
                    className="mb-6 inline-flex items-center gap-2 text-[#0955AC] text-[14px] font-[700] hover:text-[#073E82] transition-colors"
                >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#0955AC]/20 bg-white">
                        <ArrowLeft className="w-4 h-4" />
                    </span>
                    Back
                </button>

                <div className="flex items-center justify-between gap-4 mb-8">
                    <h1 className="text-[24px] sm:text-[30px] font-[800] tracking-tight text-[#0F172A]">
                        {t("passenger_information", "Passenger Information")}
                    </h1>
                    <LocaleSelector />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left: Itineraries */}
                    <div className="lg:col-span-2 space-y-5">
                        <JourneyCard label="Outbound" schedule={outboundSchedule} />
                        <JourneyCard label="Return" schedule={returnSchedule} />

                        {/* Passenger Details Form */}
                        <div className="rounded-2xl border border-[#EEF2F6] bg-white overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                            <div className="px-5 py-4 border-b border-[#F1F5F9]">
                                <h2 className="text-[15px] font-[800] text-[#0F172A]">{t("passenger_details", "Passenger Details")}</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label htmlFor="passenger_name" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                                        {t("full_name", "FULL NAME")} *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
                                        <input
                                            type="text"
                                            id="passenger_name"
                                            value={data.passenger_name}
                                            onChange={(e) => setData('passenger_name', e.target.value)}
                                            className={inputClass(errors.passenger_name)}
                                            required
                                        />
                                    </div>
                                    {errors.passenger_name && <p className="text-red-500 text-xs mt-1">{errors.passenger_name}</p>}
                                </div>

                                <div>
                                    <label htmlFor="passenger_email" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                                        {t("email_address", "EMAIL ADDRESS")} *
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
                                        <input
                                            type="email"
                                            id="passenger_email"
                                            value={data.passenger_email}
                                            onChange={(e) => setData('passenger_email', e.target.value)}
                                            className={inputClass(errors.passenger_email)}
                                            required
                                        />
                                    </div>
                                    {errors.passenger_email && <p className="text-red-500 text-xs mt-1">{errors.passenger_email}</p>}
                                </div>

                                <div>
                                    <label htmlFor="passenger_phone" className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">
                                        {t("phone_number", "PHONE NUMBER")} *
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
                                        <input
                                            type="tel"
                                            id="passenger_phone"
                                            value={data.passenger_phone}
                                            onChange={(e) => setData('passenger_phone', e.target.value)}
                                            className={inputClass(errors.passenger_phone)}
                                            required
                                        />
                                    </div>
                                    {errors.passenger_phone && <p className="text-red-500 text-xs mt-1">{errors.passenger_phone}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={`w-full h-[52px] rounded-[12px] font-[700] text-[15px] text-white transition-colors flex items-center justify-center gap-2 ${
                                        processing
                                            ? 'bg-[#CBD5E1] cursor-not-allowed'
                                            : 'bg-[#0955AC] hover:bg-[#073E82] shadow-[0_8px_20px_rgba(9,85,172,0.25)]'
                                    }`}
                                >
                                    {processing ? 'Processing…' : t("confirm_booking", "Confirm Booking")}
                                </button>
                            </form>
                        </div>

                        {/* Important Information */}
                        <div className="rounded-2xl border border-[#EEF2F6] bg-white p-5 sm:p-6">
                            <h3 className="text-[15px] font-[800] text-[#0F172A] mb-4">Important Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] text-[#64748B]">
                                <div>
                                    <h4 className="font-[700] text-[#334155] mb-2">Booking Policy</h4>
                                    <ul className="space-y-1.5">
                                        <li>• Tickets are non-refundable after booking confirmation</li>
                                        <li>• Please arrive at the station 30 minutes before departure</li>
                                        <li>• Valid ID is required for travel</li>
                                        <li>• Children below 6 years travel free (without seat)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-[700] text-[#334155] mb-2">Cancellation Policy</h4>
                                    <ul className="space-y-1.5">
                                        <li>• 24+ hours before departure: 90% refund</li>
                                        <li>• 12-24 hours before departure: 50% refund</li>
                                        <li>• 6-12 hours before departure: 25% refund</li>
                                        <li>• Less than 6 hours: No refund</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Fare breakdown */}
                    <div className="lg:sticky lg:top-24">
                        <div className="rounded-2xl border border-[#EEF2F6] bg-white overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
                            <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-[#0955AC]" />
                                <h2 className="text-[15px] font-[800] text-[#0F172A]">{t("fare_summary", "Fare Summary")}</h2>
                            </div>
                            <div className="px-5 py-4 space-y-3 text-[13px] text-[#334155]">
                                <div className="flex justify-between">
                                    <span>{t("adults", "Adults")} ({passengers.adults})</span>
                                    <span className="font-[700]">{formatPrice((outboundSchedule?.price || 0) * (passengers.adults || 0))}</span>
                                </div>
                                {passengers.children > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t("children", "Children")} ({passengers.children})</span>
                                        <span className="font-[700]">{formatPrice((outboundSchedule?.price || 0) * 0.5 * passengers.children)}</span>
                                    </div>
                                )}
                                {passengers.infants > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t("infants", "Infants")} ({passengers.infants})</span>
                                        <span className="font-[700] text-green-600">Free</span>
                                    </div>
                                )}
                                {returnSchedule && (
                                    <>
                                        <hr className="border-[#F1F5F9]" />
                                        <div className="text-[12px] font-[700] text-[#94A3B8]">Return Journey</div>
                                        <div className="flex justify-between">
                                            <span>{t("adults", "Adults")} ({passengers.adults})</span>
                                            <span className="font-[700]">{formatPrice(returnSchedule.price * (passengers.adults || 0))}</span>
                                        </div>
                                        {passengers.children > 0 && (
                                            <div className="flex justify-between">
                                                <span>{t("children", "Children")} ({passengers.children})</span>
                                                <span className="font-[700]">{formatPrice(returnSchedule.price * 0.5 * passengers.children)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <hr className="border-[#F1F5F9]" />
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="font-[700] text-[#0F172A]">{t("total", "Total")}</span>
                                    <span className="text-[22px] font-[800] text-[#0955AC]">{formatPrice(totalPrice)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

const TrainTicketBookingPreview = () => (
    <LocaleProvider>
        <TrainTicketBookingPreviewInner />
    </LocaleProvider>
);

export default TrainTicketBookingPreview;
