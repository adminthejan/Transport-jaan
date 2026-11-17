import React, { useMemo, useRef, useState } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import { route } from "ziggy-js";
import QuoteModal from "../../components/LandVehicleDetails/QuoteModal";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Download,
  ArrowRight,
  Copy,
  Car,
  Fuel,
  Settings2,
  Users,
  Navigation,
  FileCheck,
  Sparkles,
} from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const Summary = () => {
  const { props } = usePage();
  const booking = props.booking;
  const schedule = booking?.schedule;
  const vehicle = booking?.vehicle;
  const provider = vehicle?.provider;
  const client = booking?.customer;

  const C = booking?.currency || "LKR";
  const n = (v) => Number(v || 0);
  const money = (v) => `${C} ${n(v).toFixed(2)}`;

  const baseTotal = n(booking?.price_per_day) * n(booking?.rental_days);
  const addonsTotal = n(booking?.addons_total);
  const total = n(booking?.total_amount);
  const deposit = n(booking?.deposit_amount);

  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const paidFromRows = payments
    .filter((p) => (p?.status || "").toLowerCase() === "paid")
    .reduce((sum, p) => sum + n(p?.amount_paid), 0);

  const paidRaw = paidFromRows > 0 ? paidFromRows : n(booking?.amount_paid ?? booking?.advance_paid_amount ?? 0);
  const dueRemaining = Math.max(total - paidRaw, 0);

  const [copiedRef, setCopiedRef] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const quoteRef = useRef(null);

  const copyReference = () => {
    if (booking?.booking_reference) {
      navigator.clipboard.writeText(booking.booking_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const fmtDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const fmtTime = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const downloadSummaryPDF = async () => {
    if (!quoteRef.current) return;

    try {
      const canvas = await html2canvas(quoteRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;
      const imgW = contentW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let y = margin;

      pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
      heightLeft -= (pageH - margin * 2);

      while (heightLeft > 0) {
        pdf.addPage();
        const offset = margin - (imgH - heightLeft);
        pdf.addImage(imgData, "PNG", margin, offset, imgW, imgH);
        heightLeft -= (pageH - margin * 2);
      }

      pdf.save(`Booking_Confirmation_${booking?.booking_reference || booking?.id}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export booking voucher PDF.");
    }
  };

  const vehicleImg = vehicle?.primary_image_url || vehicle?.primaryImage?.url || placeholderImg;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased flex flex-col justify-between">
      <Header />

      {/* Voucher PDF Modal */}
      <QuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)}>
        <div ref={quoteRef} className="p-8 text-slate-800 text-xs bg-white space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-black text-blue-600">JAAN TRANSPORT</h2>
              <p className="text-xs text-slate-500">Official Vehicle Rental Voucher</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 block">Reference</span>
              <span className="text-sm font-black text-slate-900">{booking?.booking_reference || `#${booking?.id}`}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50">
            <div>
              <span className="text-slate-400 font-bold block mb-1">Renter</span>
              <span className="font-bold text-slate-800 block">{client?.name || "Valued Customer"}</span>
              <span className="text-slate-500">{client?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block mb-1">Vehicle</span>
              <span className="font-bold text-slate-800 block">{vehicle?.manufacturer} {vehicle?.model}</span>
              <span className="text-slate-500">{booking?.rental_days} Days Rental ({booking?.needs_driver ? "Chauffeur" : "Self-Drive"})</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-xl">
              <span className="text-slate-400 font-bold block">Pick-up Location & Schedule</span>
              <p className="font-bold text-slate-800 mt-1">{schedule?.pickup_location || "Standard Hub"}</p>
              <p className="text-slate-500">{fmtDate(schedule?.pickup_at)} at {fmtTime(schedule?.pickup_at)}</p>
            </div>
            <div className="p-3 border rounded-xl">
              <span className="text-slate-400 font-bold block">Drop-off Location & Schedule</span>
              <p className="font-bold text-slate-800 mt-1">{schedule?.dropoff_location || "Standard Hub"}</p>
              <p className="text-slate-500">{fmtDate(schedule?.dropoff_at)} at {fmtTime(schedule?.dropoff_at)}</p>
            </div>
          </div>

          <div className="border rounded-xl divide-y text-xs">
            <div className="flex justify-between p-3">
              <span>Total Rental Value</span>
              <span className="font-bold">{money(total)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span>Refundable Deposit</span>
              <span>{money(deposit)}</span>
            </div>
            <div className="flex justify-between p-3 bg-emerald-50 text-emerald-800 font-bold">
              <span>Amount Paid</span>
              <span>{money(paidRaw + deposit)}</span>
            </div>
            {dueRemaining > 0 && (
              <div className="flex justify-between p-3 bg-slate-50 text-slate-600 font-bold">
                <span>Balance Due at Pick-up</span>
                <span>{money(dueRemaining)}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t">
            Please present this voucher and your original driving license/NIC at the time of vehicle pickup.
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={downloadSummaryPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Voucher PDF</span>
          </button>
        </div>
      </QuoteModal>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full">
        {/* Success Hero Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)] p-6 sm:p-10 text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Booking Confirmed
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            You're All Set for the Road!
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Your vehicle reservation has been successfully confirmed. A receipt and handover details have been sent to your email.
          </p>

          {/* Reference Pill */}
          {booking?.booking_reference && (
            <div className="inline-flex items-center gap-3 mt-6 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500">Booking Reference:</span>
              <span className="text-sm font-black text-blue-600 tracking-wider">
                {booking.booking_reference}
              </span>
              <button
                type="button"
                onClick={copyReference}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Copy Reference"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copiedRef && <span className="text-[11px] font-bold text-emerald-600">Copied!</span>}
            </div>
          )}
        </div>

        {/* Trip & Vehicle Overview Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)] p-6 sm:p-8 mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-20 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                <img src={vehicleImg} alt="Vehicle" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  {vehicle?.manufacturer}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {vehicle?.manufacturer} {vehicle?.model}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {booking?.rental_days} {booking?.rental_days === 1 ? "Day Rental" : "Days Rental"} • {booking?.needs_driver ? "With Chauffeur" : "Self-Drive"}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 font-semibold block">Total Booking Value</span>
              <span className="text-xl font-black text-slate-900">{money(total + deposit)}</span>
            </div>
          </div>

          {/* Schedule Route */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                Pick-up Location
              </span>
              <h4 className="text-sm font-bold text-slate-800">{schedule?.pickup_location || "Standard Service Hub"}</h4>
              <p className="text-xs text-slate-500 font-medium">
                {fmtDate(schedule?.pickup_at)} at {fmtTime(schedule?.pickup_at)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                Drop-off Location
              </span>
              <h4 className="text-sm font-bold text-slate-800">{schedule?.dropoff_location || "Standard Service Hub"}</h4>
              <p className="text-xs text-slate-500 font-medium">
                {fmtDate(schedule?.dropoff_at)} at {fmtTime(schedule?.dropoff_at)}
              </p>
            </div>
          </div>

          {/* Payment & Security Ledger */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Paid Today</span>
              <span className="font-bold text-emerald-700">{money(paidRaw + deposit)}</span>
            </div>
            {dueRemaining > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Remaining Balance on Pickup</span>
                <span className="font-bold text-slate-800">{money(dueRemaining)}</span>
              </div>
            )}
            {deposit > 0 && (
              <div className="flex justify-between text-slate-500 pt-1 border-t border-blue-200/60">
                <span>Refundable Deposit (Returned after trip)</span>
                <span className="font-semibold">{money(deposit)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowQuoteModal(true)}
            className="w-full sm:w-auto px-6 h-12 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download Trip Voucher (PDF)</span>
          </button>

          {booking?.id && (
            <Link
              href={route("vehicles.track.public") + `?ref=${booking.booking_reference || booking.id}`}
              className="w-full sm:w-auto px-6 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Track Live Status</span>
            </Link>
          )}

          <Link
            href="/vehicleList"
            className="w-full sm:w-auto px-8 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2"
          >
            <span>Browse More Vehicles</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Summary;
