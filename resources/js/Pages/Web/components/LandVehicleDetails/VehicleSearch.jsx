import React, { useEffect, useMemo, useState, useRef } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import clock from "../../assets/landVehicleDetails/clock.svg";
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
  const [dateError, setDateError] = useState("");
  const [needsDriver, setNeedsDriver] = useState(false);
  const DRIVER_FEE_RATE = 0.20;

  // Initialize form values from URL query params (if present)
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
    // run once on mount
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
      confirmButtonColor: "#0955AC",
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
        .catch(() => { });
    }
  }, [vehicleId, serverExtras?.length]);

  useEffect(() => {
    const msg = props?.errors?.availability;
    if (msg) showCenter(msg, "Unavailable", "error");
  }, [props?.errors?.availability]);

  const featureList = useMemo(() => {
    const raw = Array.isArray(serverExtras) ? serverExtras : [];
    return raw
      .map((e) => ({
        name: e?.name ?? e?.additional_feature_name ?? "",
        price: Number(e?.price ?? e?.additional_feature_price ?? 0),
      }))
      .filter((x) => x.name);
  }, [serverExtras]);

  const priceByName = useMemo(() => {
    const map = {};
    featureList.forEach((f) => {
      map[f.name] = f.price;
    });
    return map;
  }, [featureList]);

  const [extras, setExtras] = useState({});
  useEffect(() => {
    setExtras((prev) => {
      const next = {};
      featureList.forEach((f) => {
        next[f.name] = prev[f.name] ?? false;
      });
      return next;
    });
  }, [featureList]);

  const toggleExtra = (name) => setExtras((x) => ({ ...x, [name]: !x[name] }));

  const selectedAddons = () =>
    Object.entries(extras)
      .filter(([, v]) => v)
      .map(([name]) => ({ name, qty: 1 }));

  const quoteParams = () => ({
    vehicle_id: vehicleId,
    pickup_date: pickupDate,
    pickup_time: pickupTime || "10:00",
    dropoff_date: dropoffDate,
    dropoff_time: dropoffTime || "10:00",
    addons: selectedAddons(),
    needs_driver: needsDriver,
  });

  // Rates are returned even when the vehicle is taken, so the price is always shown.
  const requestQuote = async () => {
    const { data, status } = await axios.get(route("client.bookings.quote"), {
      params: quoteParams(),
      validateStatus: (code) => code === 200 || code === 422,
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

  const getQuote = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please select pick-up and drop-off dates.", "Missing dates", "info");
      return;
    }
    try {
      await requestQuote();
      setShowQuoteModal(true);
    } catch (e) {
      showCenter("Could not fetch a quote. Please check your dates.", "Oops", "error");
    }
  };

  const continueToCheckout = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please fill pick-up and drop-off first.", "Missing info", "info");
      return;
    }

    try {
      const result = await requestQuote();
      if (!result.available) {
        showCenter(result.message || "Vehicle is not available for the selected dates.", "Unavailable", "error");
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
      showCenter("Something went wrong. Please try again.", "Oops", "error");
    }
  };

  /* ===================== DOWNLOAD QUOTATION AS-IS ===================== */
  const quoteRef = useRef(null);

  const downloadQuote = async () => {
    if (!quoteRef.current) return;

    // Render the exact content to a canvas (crisp + white background)
    const canvas = await html2canvas(quoteRef.current, {
      scale: 3,              // sharper text
      useCORS: true,
      backgroundColor: "#ffffff",
      letterRendering: true,
    });
    const imgData = canvas.toDataURL("image/png");

    // Build an A4 PDF with clean margins
    const pdf = new jsPDF("p", "mm", "a4");    // 210 x 297 mm
    const pageW = pdf.internal.pageSize.getWidth();   // 210
    const pageH = pdf.internal.pageSize.getHeight();  // 297
    const margin = 12;                                  // mm (left/right/top/bottom)
    const contentW = pageW - margin * 2;

    // Scale image to fit width within margins
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Add first page
    let heightLeft = imgH;
    let y = margin;

    pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
    heightLeft -= (pageH - margin * 2);

    // Additional pages (crop by shifting image upward but keeping same margins)
    while (heightLeft > 0) {
      pdf.addPage();
      const offset = margin - (imgH - heightLeft);
      pdf.addImage(imgData, "PNG", margin, offset, imgW, imgH);
      heightLeft -= (pageH - margin * 2);
    }

    const fileName = `quotation_${(vehicle?.manufacturer || "vehicle")
      .toString()
      .replace(/\s+/g, "-")
      .toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

    pdf.save(fileName);
  };

  /* =================================================================== */

  return (
    <div className="px-5 xl:px-0">
      <QuoteModal open={showQuoteModal} onClose={() => setShowQuoteModal(false)}>
        {/* Everything inside this wrapper is exported to PDF */}
        <div ref={quoteRef}>
          <div className="flex flex-row justify-between items-center">
            <div className="figtree text-[16px] font-[600]">
              <h1>Service Provider name: {provider?.name}</h1>
              <h1>Service Provider Address: {provider?.address}</h1>
              <h1>Service Provider Contact Number: {provider?.phone}</h1>
              <h1>Service Provider Email: {provider?.email}</h1>
            </div>

            <div className="text-center poppins text-[25px] font-[700] uppercase">
              <h1>
                Company <br /> <span className="text-[#0955AC]">Logo</span>
              </h1>
            </div>
          </div>

          <div className="figtree flex flex-row justify-end text-[35px] font-[700] text-[#0955AC]">
            <h1>Quotation</h1>
          </div>

          <div className="flex flex-row justify-between items-end">
            <div className="text-[16px] font-[600]">
              <h1 className="text-[#0955AC]">Bill To</h1>
              <h1>Client Name: {authUser?.name}</h1>
              <h1>Client Address: {authUser?.address}</h1>
              <h1>Client Contact Number: {authUser?.phone}</h1>
            </div>

            <div className="text-right text-[16px] font-[600]">
              <h1>
                <span className="text-[#0955AC]">Quotation No:</span> #123456
              </h1>
              <h1>
                <span className="text-[#0955AC]">Quotation Date:</span>{" "}
                {new Date().toLocaleDateString()}
              </h1>
              <h1>
                <span className="text-[#0955AC]">Due Date:</span> —
              </h1>
            </div>
          </div>

          <div className="w-full h-[36px] bg-[#0955AC] mt-10 flex flex-row justify-center items-center text-[#FFFFFF] px-10 text-[14px] font-[700]">
            <h1 className="w-[200px]">Description</h1>
            <h1 className="w-[140px]">QTY.</h1>
            <h1 className="w-[140px]">UNIT price</h1>
            <h1 className="w-[140px] text-end">Sub Total</h1>
          </div>

          <div className="w-full h-[36px] flex flex-row justify-center items-center px-10 text-[14px] font-[600] mt-5">
            <h1 className="w-[200px]">
              {vehicle?.manufacturer} {vehicle?.model}
            </h1>
            <h1 className="w-[140px]">
              {quote?.rental_days || "-"} {quote?.rental_days === 1 ? "Day" : "Days"}
            </h1>
            <h1 className="w-[140px]">
              {quote ? Number(quote.price_per_day).toFixed(2) : "-"}
            </h1>
            <h1 className="w-[140px] text-end">
              {quote ? (quote.price_per_day * quote.rental_days).toFixed(2) : "-"}
            </h1>
          </div>

          {(quote?.addons_lines || []).map((line, idx) => (
            <div
              key={idx}
              className="w-full h-[36px] flex flex-row justifycenter items-center px-10 text-[14px] font-[600]"
            >
              <h1 className="w-[200px]">{line.name}</h1>
              <h1 className="w-[140px]">{line.qty}</h1>
              <h1 className="w-[140px]">{Number(line.price).toFixed(2)}</h1>
              <h1 className="w-[140px] text-end">
                {Number(line.line_total).toFixed(2)}
              </h1>
            </div>
          ))}

          <div className="w-full h-[1.5px] bg-[#0955AC] my-5" />

          <div className="w-full h-[36px] flex flex-row justify-end items-center px-10 text-[14px] font-[600]">
            <h1 className="w-[140px]">Subtotal</h1>
            <h1 className="w-[140px] text-end">
              {quote ? Number(quote.subtotal).toFixed(2) : "-"}
            </h1>
          </div>

          <div className="w-full h-[36px] flex flex-row justify-end items-center px-10 text-[14px] font-[600]">
            <h1 className="w-[140px]">Sales Tax (5%)</h1>
            <h1 className="w-[140px] text-end">—</h1>
          </div>

          <div className="flex justify-end items-center">
            <div className="flex flex-row items-center border-t-[1px] border-b-[1px] w-[340px] px-10 h-[39px] bg-[#E8EBEF] border-[#0955AC] text-[14px] font-[700] text-[#0955AC]">
              <h1 className="w-[140px]">Total ({vehicle?.currency || "LKR"})</h1>
              <h1 className="w-[140px] text-end">
                {quote ? Number(quote.total).toFixed(2) : "-"}
              </h1>
            </div>
          </div>

          <div className="flex justify-end items-center">
            <div className="flex flex-row items-center w-[340px] px-10 h-[36px] text-[14px] font-[600]">
              <h1 className="w-[140px]">Refundable deposit</h1>
              <h1 className="w-[140px] text-end">{quote ? Number(quote.deposit_amount).toFixed(2) : "-"}</h1>
            </div>
          </div>
          <div className="flex justify-end items-center">
            <div className="flex flex-row items-center w-[340px] px-10 h-[36px] text-[14px] font-[600]">
              <h1 className="w-[140px]">Advance payment</h1>
              <h1 className="w-[140px] text-end">{quote ? Number(quote.advance_amount).toFixed(2) : "-"}</h1>
            </div>
          </div>

          <h1 className="text-[14px] font-[700] text-[#0955AC]">Terms and Conditions</h1>
          <h1 className="text-[14px] font-[500]">Payment is due in 14 days</h1>
        </div>

        {/* Download button (not included in the PDF capture) */}
        <div className="flex justify-center items-center mt-4">
          <div
            className="w-auto min-w-[231px] h-auto px-6 py-3 bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[600] text-[12px] poppins flex justify-center items-center cursor-pointer hover:bg-[#074489] transition-colors"
            onClick={downloadQuote}
          >
            Download quotation
          </div>
        </div>
      </QuoteModal>

      {/* ==== Sidebar card (unchanged) ==== */}
      <div className="poppins w-full xl:w-[440px] h-auto bg-[#F4F3F3] rounded-[19px] flex flex-col gap-10 py-10 xl:px-20 px-6 sm:px-10">
        <div className="flex justify-end">
          <LocaleSelector />
        </div>
        <div className="text-[25px] font-[700] -mt-6">
          <h1>
            {formatPrice(vehicle?.rental_price_per_day ?? 620, vehicle?.currency || "LKR")}{" "}
            <span className="text-[10px] text-[#00000080]">/day</span>
          </h1>
          <h1 className="text-[10px] font-[600] text-[#00000080] py-4">
            Total before taxes
          </h1>
          <div className=" w-auto md:w-[346px] h-[1px] bg-[#0000001F]" />
        </div>

        <form className="text-[13px] text-[#0B1739] space-y-1" onSubmit={(e) => e.preventDefault()}>
          <div>
            <div>
              <label htmlFor="pickupLocation" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">
                Pick-up Location
              </label>
              <input
                type="text"
                id="pickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Hudson Rd, Colombo 03"
                className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
              <div>
                <label htmlFor="pickupDate" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Pick-up Date</label>
                <input
                  type="date"
                  id="pickupDate"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  placeholder="2025-07-23"
                  className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
                />
              </div>
              <div className="relative">
                <label htmlFor="pickupTime" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Pick-up Time</label>
                <input
                  type="time"
                  id="pickupTime"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="00:00"
                  className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <div>
              <label htmlFor="dropoffLocation" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Drop-off Location</label>
              <input
                type="text"
                id="dropoffLocation"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Hudson Rd, Colombo 03"
                className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
              <div>
                <label htmlFor="dropoffDate" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Drop-off Date</label>
                <input
                  type="date"
                  id="dropoffDate"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  placeholder="2025-07-30"
                  className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
                />
              </div>
              <div className="relative">
                <label htmlFor="dropoffTime" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Drop-off Time</label>
                <input
                  type="time"
                  id="dropoffTime"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  placeholder="00:00"
                  className="w-full h-[46px] rounded-[10px] border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#9AA5BA] focus:border-[#0955AC] focus:outline-none focus:ring-2 focus:ring-[#0955AC]/20 transition"
                />
              </div>
            </div>
          </div>
        </form>

        {pickupLocation.trim() && (
          <div className="mb-6">
            <VehicleLocationMap
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              className="h-[220px]"
            />
          </div>
        )}

        <div className="w-full rounded-2xl border border-[#E3EAF5] bg-white p-6 shadow-sm text-[13px] text-[#0B1739] flex flex-col gap-5">
          <h1 className="text-base font-semibold text-[#0B1739]">Pricing Breakdown</h1>
          {availability && availability.available === false && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
              Not available for these dates. Rates are shown for reference only.
            </div>
          )}
          {quote && (
            <div className="rounded-xl border border-[#E3EAF5] divide-y divide-[#E3EAF5] text-[13px]">
              {[
                [`Rental (${quote.rental_days} ${quote.rental_days === 1 ? "day" : "days"} × ${Number(quote.price_per_day).toFixed(2)})`, Number(quote.price_per_day) * Number(quote.rental_days)],
                ...(Number(quote.addons_total) > 0 ? [["Extras", Number(quote.addons_total)]] : []),
                ...(Number(quote.driver_fee_total) > 0 ? [["Driver fee", Number(quote.driver_fee_total)]] : []),
                ["Subtotal", Number(quote.subtotal)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2.5">
                  <span className="text-[#5B6887]">{label}</span>
                  <span className="font-medium">{value.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 bg-[#F7FAFF]">
                <span className="text-[#5B6887]">Refundable deposit</span>
                <span className="font-medium">{Number(quote.deposit_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-[#F7FAFF]">
                <span className="text-[#5B6887]">Advance payment</span>
                <span className="font-medium">{Number(quote.advance_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-[#EEF5FF]">
                <span className="font-semibold text-[#0955AC]">Total ({quote.currency || vehicle?.currency || "LKR"})</span>
                <span className="font-semibold text-[#0955AC]">{Number(quote.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Driver</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: false, label: "Self-Drive" },
              { value: true, label: "With Driver" },
            ].map((opt) => (
              <button
                type="button"
                key={String(opt.value)}
                onClick={() => setNeedsDriver(opt.value)}
                className={`rounded-xl border px-4 py-3 text-[13px] font-semibold transition-colors ${
                  needsDriver === opt.value
                    ? "bg-[#0955AC] border-[#0955AC] text-white"
                    : "border-[#D6DEEB] bg-white text-[#5B6887] hover:border-[#0955AC]/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {needsDriver && (
            <p className="rounded-xl border border-[#0955AC]/20 bg-[#EEF5FF] px-3 py-2.5 text-[12px] font-medium text-[#0955AC]">
              A driver adds {(DRIVER_FEE_RATE * 100).toFixed(0)}% of the daily rate for chauffeur service.
            </p>
          )}

          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#5B6887]">Add Extras</h2>

          <div className="flex flex-col divide-y divide-[#E3EAF5] rounded-xl border border-[#E3EAF5] overflow-hidden">
            {Object.keys(extras).length === 0 && (
              <div className="px-4 py-4 text-[#5B6887]">No extras available.</div>
            )}
            {Object.keys(extras).map((name, i) => (
              <div key={name} className="flex flex-row items-center justify-between w-full px-4 py-3 hover:bg-[#F7FAFF]">
                <div className="flex flex-row justify-center items-center gap-4">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#0955AC]"
                    checked={!!extras[name]}
                    onChange={() => toggleExtra(name)}
                  />
                  <span className="font-medium">{name}</span>
                </div>
                <span className="font-semibold text-[#0955AC]">{priceByName[name] !== undefined ? priceByName[name].toFixed(2) : "—"}</span>
              </div>
            ))}
          </div>

          
          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-3">
            <div
              className="w-full sm:w-auto xl:w-[261px] h-auto xl:h-auto px-4 py-2.5 bg-[#E8EBEF] border-[1.5px] border-[#0955AC] rounded-[5px] mt-6 sm:mt-10 flex items-center justify-center text-[12px] font-[700] text-[#0955AC] cursor-pointer hover:bg-[#0955AC] hover:text-white transition-colors"
              onClick={getQuote}
            >
              GET A QUOTE
            </div>

            <div
              className="w-full sm:w-auto xl:w-[261px] h-auto xl:h-auto bg-[#0955AC] px-4 py-2.5 rounded-[5px] mt-0 sm:mt-10 flex items-center justify-center text-[12px] font-[700] text-[#FFFFFF] text-center cursor-pointer hover:bg-[#074489] transition-colors"
              onClick={continueToCheckout}
            >
              CONTINUE TO CHECKOUT
            </div>
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
