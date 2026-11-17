import React, { useEffect, useMemo, useState, useRef } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Check,
  ArrowRight,
  Download,
  Info,
  Sparkles,
  UserCheck,
  FileText,
  AlertCircle,
} from "lucide-react";
import QuoteModal from "./QuoteModal";
import useScrollLock from "./useScrollLock";
import VehicleLocationMap from "./VehicleLocationMap";
import axios from "axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import LocaleSelector from "../ticketBooking/LocaleSelector";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

const VehicleSearchInner = ({ vehicleId: vehicleIdProp, vehicle: vehicleProp }) => {
  const { formatPrice } = useLocale();
  const { props } = usePage();
  const vehicle = vehicleProp || props.vehicle || null;
  const vehicleId = vehicleIdProp || vehicle?.id;
  const provider = vehicle?.provider || null;
  const authUser = props?.authUser;

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quote, setQuote] = useState(null);
  const [availability, setAvailability] = useState(null);
  useScrollLock(showQuoteModal);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [needsDriver, setNeedsDriver] = useState(false);
  const DRIVER_FEE_RATE = 0.20;

  // Initialize from URL query params
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || "");
      const pLoc = sp.get("pickupLocation") || sp.get("pickup_location");
      const dLoc = sp.get("dropoffLocation") || sp.get("dropoff_location");
      const pDate = sp.get("pickupDate") || sp.get("pickup_date");
      const dDate = sp.get("dropoffDate") || sp.get("dropoff_date");
      const pTime = sp.get("pickupTime") || sp.get("pickup_time");
      const dTime = sp.get("dropoffTime") || sp.get("dropoff_time");
      const withDriver = sp.get("withDriver") || sp.get("needs_driver");

      if (pLoc && !pickupLocation) setPickupLocation(pLoc);
      if (dLoc && !dropoffLocation) setDropoffLocation(dLoc);
      if (pDate && !pickupDate) setPickupDate(pDate);
      if (dDate && !dropoffDate) setDropoffDate(dDate);
      if (pTime && (pickupTime === "0:00" || !pickupTime)) setPickupTime(pTime);
      if (dTime && (dropoffTime === "0:00" || !dropoffTime)) setDropoffTime(dTime);
      if (withDriver === "true" || withDriver === "1") setNeedsDriver(true);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [serverExtras, setServerExtras] = useState(
    Array.isArray(props?.extras) ? props.extras : []
  );

  const showCenter = (text, title = "Notice", icon = "error") =>
    Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: "OK",
      confirmButtonColor: "#2563EB",
      heightAuto: false,
      allowOutsideClick: true,
      backdrop: true,
    });

  useEffect(() => {
    if (Array.isArray(props?.extras)) setServerExtras(props.extras);
  }, [props?.extras]);

  useEffect(() => {
    if ((!serverExtras || serverExtras.length === 0) && vehicleId) {
      axios
        .get(route("client.vehicles.extras", vehicleId))
        .then(({ data }) => setServerExtras(data?.extras || []))
        .catch(() => {});
    }
  }, [vehicleId, serverExtras?.length]);

  useEffect(() => {
    const msg = props?.errors?.availability;
    if (msg) showCenter(msg, "Unavailable", "error");
  }, [props?.errors?.availability]);

  const featureList = useMemo(() => {
    const raw = Array.isArray(serverExtras) ? serverExtras : [];
    return raw
      .map((item) => ({
        name: item?.additional_feature_name ?? item?.name ?? "",
        price: Number(item?.additional_feature_price ?? item?.price ?? 0),
      }))
      .filter((item) => item.name);
  }, [serverExtras]);

  const priceByName = useMemo(() => {
    const map = {};
    featureList.forEach((f) => (map[f.name] = f.price));
    return map;
  }, [featureList]);

  const [extras, setExtras] = useState({});

  useEffect(() => {
    if (featureList.length) {
      setExtras((prev) => {
        const next = { ...prev };
        featureList.forEach((f) => {
          if (next[f.name] === undefined) next[f.name] = false;
        });
        return next;
      });
    }
  }, [featureList]);

  const toggleExtra = (name) =>
    setExtras((prev) => ({ ...prev, [name]: !prev[name] }));

  const selectedAddons = () =>
    Object.entries(extras)
      .filter(([, active]) => active)
      .map(([name]) => ({ name, qty: 1 }));

  const requestQuote = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) return null;

    const { data, status } = await axios.get(route("client.bookings.quote"), {
      params: {
        vehicle_id: vehicleId,
        pickup_date: pickupDate,
        pickup_time: pickupTime || "10:00",
        dropoff_date: dropoffDate,
        dropoff_time: dropoffTime || "10:00",
        needs_driver: needsDriver ? "1" : "0",
        addons: selectedAddons(),
      },
    });

    setQuote(data);
    setAvailability({
      available: status === 200 && data.available !== false,
      message: data.message || null,
    });
    return { available: status === 200 && data.available !== false, message: data.message };
  };

  useEffect(() => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      setQuote(null);
      setAvailability(null);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      requestQuote().catch(() => setQuote(null));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, pickupDate, pickupTime, dropoffDate, dropoffTime, needsDriver, extras]);

  const continueToCheckout = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please select your pick-up and drop-off dates first.", "Missing Trip Dates", "info");
      return;
    }

    try {
      const result = await requestQuote();
      if (result && !result.available) {
        showCenter(result.message || "This vehicle is not available for the selected dates.", "Dates Unavailable", "error");
        return;
      }

      router.visit(route("client.bookings.checkout"), {
        method: "get",
        data: {
          vehicle_id: vehicleId,
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          pickup_date: pickupDate,
          pickup_time: pickupTime || "10:00",
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime || "10:00",
          addons: selectedAddons(),
          needs_driver: needsDriver,
        },
        preserveScroll: true,
      });
    } catch (e) {
      showCenter("Unable to proceed to checkout. Please check the dates and try again.", "Error", "error");
    }
  };

  /* ===================== DOWNLOAD QUOTATION PDF ===================== */
  const quoteRef = useRef(null);

  const downloadQuote = async () => {
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

      const fileName = `quotation_${(vehicle?.manufacturer || "vehicle").toString().toLowerCase()}_${vehicleId}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert("Failed to export quotation PDF.");
    }
  };

  const handleOpenQuoteModal = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please choose pick-up and drop-off dates first.", "Select Dates", "info");
      return;
    }
    await requestQuote();
    setShowQuoteModal(true);
  };

  return (
    <div className="w-full">
      {/* Quotation Modal */}
      <QuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)}>
        <div ref={quoteRef} className="p-6 text-slate-800 text-xs bg-white space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-blue-600">JAAN TRANSPORT</h2>
              <p className="text-[11px] text-slate-400">Official Rental Quotation</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>Vehicle: {vehicle?.manufacturer} {vehicle?.model}</p>
              <p>Registration: {vehicle?.registration_number || "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2 bg-slate-50 p-3 rounded-xl">
            <div>
              <span className="font-bold text-slate-500 block">Pick-up:</span>
              <span>{pickupLocation || "Standard Hub"} ({pickupDate} at {pickupTime})</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">Drop-off:</span>
              <span>{dropoffLocation || "Standard Hub"} ({dropoffDate} at {dropoffTime})</span>
            </div>
          </div>

          {quote && (
            <div className="border rounded-xl divide-y text-xs">
              <div className="flex justify-between p-2.5">
                <span>Rental Duration</span>
                <span className="font-bold">{quote.rental_days} {quote.rental_days === 1 ? "day" : "days"}</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span>Daily Base Rate</span>
                <span>{quote.currency || "LKR"} {Number(quote.price_per_day).toFixed(2)}</span>
              </div>
              {Number(quote.driver_fee_total) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span>Chauffeur Service Fee</span>
                  <span>{quote.currency || "LKR"} {Number(quote.driver_fee_total).toFixed(2)}</span>
                </div>
              )}
              {Number(quote.addons_total) > 0 && (
                <div className="flex justify-between p-2.5">
                  <span>Included Extras</span>
                  <span>{quote.currency || "LKR"} {Number(quote.addons_total).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between p-2.5 bg-blue-50/50 font-bold text-blue-700">
                <span>Estimated Total</span>
                <span>{quote.currency || "LKR"} {Number(quote.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 pt-2 border-t">
            <p className="font-semibold text-slate-700">Terms & Conditions:</p>
            <p>Quotations are valid for 7 days. Final price subject to host availability upon reservation.</p>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={downloadQuote}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </QuoteModal>

      {/* Main Booking Card */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)] p-5 sm:p-7 space-y-6">
        {/* Header Price Bar */}
        <div className="flex items-start justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatPrice(vehicle?.rental_price_per_day ?? 0, vehicle?.currency || "LKR")}
              </span>
              <span className="text-xs font-semibold text-slate-400">/day</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Best price guaranteed · All taxes included
            </p>
          </div>

          <div className="shrink-0">
            <LocaleSelector />
          </div>
        </div>

        {/* Live Availability Warning */}
        {availability && availability.available === false && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>{availability.message || "Vehicle is unavailable for these selected dates. Rates shown for reference."}</div>
          </div>
        )}

        {/* Schedule & Location Inputs */}
        <div className="space-y-3.5">
          {/* Pick-up */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Pick-up Location</span>
            </label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Colombo International Airport (CMB)"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Pick-up Date
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Time
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Drop-off */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drop-off Location</span>
            </label>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="e.g. Same as pickup location"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Drop-off Date
              </label>
              <input
                type="date"
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Time
              </label>
              <input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Route Map Preview */}
        {pickupLocation.trim() && (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <VehicleLocationMap
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              className="h-[180px]"
            />
          </div>
        )}

        {/* Chauffeur vs Self-Drive Option */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Drive Preference
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
            {[
              { value: false, label: "Self-Drive" },
              { value: true, label: "With Chauffeur" },
            ].map((opt) => (
              <button
                type="button"
                key={String(opt.value)}
                onClick={() => setNeedsDriver(opt.value)}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  needsDriver === opt.value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {needsDriver && (
            <p className="text-[11px] font-medium text-blue-600 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Chauffeur service adds {(DRIVER_FEE_RATE * 100).toFixed(0)}% daily rate.</span>
            </p>
          )}
        </div>

        {/* Add-ons & Extras */}
        {Object.keys(extras).length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Trip Extras
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {Object.keys(extras).map((name) => (
                <label
                  key={name}
                  className="flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={!!extras[name]}
                      onChange={() => toggleExtra(name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-semibold text-slate-800">{name}</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    +LKR {priceByName[name] !== undefined ? priceByName[name].toFixed(2) : "0.00"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Live Quotation Summary */}
        {quote && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center justify-between">
              <span>Estimated Breakdown</span>
              <span className="text-[11px] font-semibold text-blue-600">{quote.rental_days} {quote.rental_days === 1 ? "day" : "days"}</span>
            </h4>

            <div className="space-y-1.5 text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Base Vehicle Rental</span>
                <span className="font-semibold text-slate-800">
                  {quote.currency || "LKR"} {(Number(quote.price_per_day) * Number(quote.rental_days)).toFixed(2)}
                </span>
              </div>

              {Number(quote.driver_fee_total) > 0 && (
                <div className="flex justify-between">
                  <span>Chauffeur Fee</span>
                  <span className="font-semibold text-slate-800">
                    {quote.currency || "LKR"} {Number(quote.driver_fee_total).toFixed(2)}
                  </span>
                </div>
              )}

              {Number(quote.addons_total) > 0 && (
                <div className="flex justify-between">
                  <span>Additional Extras</span>
                  <span className="font-semibold text-slate-800">
                    {quote.currency || "LKR"} {Number(quote.addons_total).toFixed(2)}
                  </span>
                </div>
              )}

              {Number(quote.deposit_amount) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Refundable Security Deposit</span>
                  <span className="font-semibold">
                    {quote.currency || "LKR"} {Number(quote.deposit_amount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-blue-200/60 font-bold text-slate-900 text-sm">
                <span>Total Amount</span>
                <span className="text-blue-600 font-black">
                  {quote.currency || "LKR"} {Number(quote.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={continueToCheckout}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Reservation</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleOpenQuoteModal}
            className="w-full h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Generate Official Quotation</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Instant Confirmation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Free Cancellation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleSearch = (props) => (
  <LocaleProvider>
    <VehicleSearchInner {...props} />
  </LocaleProvider>
);

export default VehicleSearch;
