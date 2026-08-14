import React, { useEffect, useMemo, useState, useRef } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import clock from "../../assets/landVehicleDetails/clock.svg";
import QuoteModal from "./QuoteModal";
import useScrollLock from "./useScrollLock";
import VehicleLocationMap from "../LandVehicleDetails/VehicleLocationMap";
import axios from "axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import LocaleSelector from "../ticketBooking/LocaleSelector";
import { LocaleProvider, useLocale } from "../../context/LocaleContext";

const PlaneSearchInner = ({ vehicleId: vehicleIdProp, vehicle: vehicleProp }) => {
  const { formatPrice } = useLocale();
  const { props } = usePage();
  const vehicle = vehicleProp || props.vehicle || null;
  const vehicleId = vehicleIdProp || vehicle?.id;
  const provider = vehicle?.provider || null;
  const authUser = props?.authUser;

  // Authenticated client (if any)
  const client = props?.auth?.user || props?.user || null;

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quote, setQuote] = useState(null);
  useScrollLock(showQuoteModal);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("0:00");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("0:00");
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

      if (pLoc && !pickupLocation) setPickupLocation(pLoc);
      if (dLoc && !dropoffLocation) setDropoffLocation(dLoc);
      if (pDate && !pickupDate) setPickupDate(pDate);
      if (dDate && !dropoffDate) setDropoffDate(dDate);
      if (pTime && (pickupTime === "0:00" || !pickupTime)) setPickupTime(pTime);
      if (dTime && (dropoffTime === "0:00" || !dropoffTime)) setDropoffTime(dTime);
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

  // Validate that pickup date is not after dropoff date
  useEffect(() => {
    if (pickupDate && dropoffDate) {
      try {
        const p = new Date(pickupDate);
        const d = new Date(dropoffDate);
        if (p > d) {
          setDateError("Pick-up date cannot be after drop-off date.");
        } else {
          setDateError("");
        }
      } catch (e) {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [pickupDate, dropoffDate]);

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
  const roundedRentalDays = useMemo(() => {
    const raw = quote?.rental_days;
    if (raw === undefined || raw === null) return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return null;
    return Math.round(n);
  }, [quote?.rental_days]);

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

  const getQuote = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please select pick-up and drop-off dates.", "Missing dates", "info");
      return;
    }
    if (dateError) {
      showCenter(dateError, "Invalid dates", "error");
      return;
    }
    try {
      const { data } = await axios.get(route("client.airBookings.quote"), {
        params: {
          vehicle_id: vehicleId,
          pickup_date: pickupDate,
          pickup_time: pickupTime || "10:00",
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime || "10:00",
          addons: selectedAddons(),
          needs_driver: needsDriver,
        },
      });
      setQuote(data);
      setShowQuoteModal(true);
    } catch (e) {
      showCenter(
        e?.response?.data?.message || "Could not fetch a quote. Please check your dates.",
        "Oops",
        "error"
      );
    }
  };

  // pre-check availability; show SweetAlert if unavailable
  const continueToCheckout = async () => {
    if (!vehicleId || !pickupDate || !dropoffDate) {
      showCenter("Please fill pick-up and drop-off first.", "Missing info", "info");
      return;
    }

    if (dateError) {
      showCenter(dateError, "Invalid dates", "error");
      return;
    }

    try {
      // Check availability using the quote endpoint
      await axios.get(route("client.airBookings.quote"), {
        params: {
          vehicle_id: vehicleId,
          pickup_date: pickupDate,
          pickup_time: pickupTime || "10:00",
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime || "10:00",
          addons: selectedAddons(),
          needs_driver: needsDriver,
        },
      });

      router.visit(route("client.airBookings.checkout"), {
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
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        "Vehicle is not available for the selected dates.";
      if (status === 422) {
        showCenter(msg, "Unavailable", "error");
      } else {
        showCenter("Something went wrong. Please try again.", "Oops", "error");
      }
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
              <h1>{vehicle?.provider?.name || vehicle?.provider?.company_name || 'Service Provider name'}</h1>
              <h1>{vehicle?.provider?.address || vehicle?.provider?.city || ''}</h1>
              <h1>{vehicle?.provider?.phone || vehicle?.provider?.phone_number || ''}</h1>
              <h1>{vehicle?.provider?.email || ''}</h1>
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
              <h1>{client?.name || client?.first_name || 'Client Name'}</h1>
              <h1>{client?.address || client?.city || ''}</h1>
              <h1>{client?.phone || client?.phone_number || ''}</h1>
            </div>

            <div className="text-right text-[16px] font-[600]">
              <h1>
                <span className="text-[#0955AC]">Quotation No:</span>{' '}
                {quote?.quotation_no || `Q-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Date.now() / 1000)}`}
              </h1>
              <h1>
                <span className="text-[#0955AC]">Quotation Date:</span>{' '}
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
              {roundedRentalDays == null ? "-" : `${roundedRentalDays} ${roundedRentalDays === 1 ? "Day" : "Days"}`}
            </h1>
            <h1 className="w-[140px]">
              {quote ? Number(quote.price_per_day).toFixed(2) : "-"}
            </h1>
            <h1 className="w-[140px] text-end">
              {quote ? (quote.price_per_day *   quote.rental_days).toFixed(2) : "-"}
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
              <h1 className="w-[140px]">Total (USD)</h1>
              <h1 className="w-[140px] text-end">
                {quote ? Number(quote.total).toFixed(2) : "-"}
              </h1>
            </div>
          </div>

          <h1 className="text-[14px] font-[700] text-[#0955AC]">Terms and Conditions</h1>
          <h1 className="text-[14px] font-[500]">Payment is due in 14 days</h1>
        </div>

        {/* Download button (not included in the PDF capture) */}
        <div className="flex justify-center items-center">
          <div
            className="w-[231px] h-[41px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[600] text-[12px] poppins flex justify-center items-center cursor-pointer"
            onClick={downloadQuote}
          >
            Download quotation
          </div>
        </div>
      </QuoteModal>

      {/* ==== Sidebar card (unchanged) ==== */}
      <div className="poppins w-auto h-auto xl:w-[440px] xl:h-auto bg-[#F4F3F3] rounded-[19px] flex flex-col gap-10 py-10 xl:px-20 px-10">
        <div className="flex justify-end">
          <LocaleSelector />
        </div>
        <div className="text-[25px] font-[700] -mt-6">
          <h1>
            {formatPrice(vehicle?.rental_price_per_day ?? 620, "USD")}{" "}
            <span className="text-[10px] text-[#00000080]">/day</span>
          </h1>
          <h1 className="text-[10px] font-[600] text-[#00000080] py-4">
            Total before taxes
          </h1>
          <div className=" w-auto md:w-[346px] h-[1px] bg-[#0000001F]" />
        </div>

        <form className="text-[10px] text-[black] font-[800]" onSubmit={(e) => e.preventDefault()}>
          <div>
            <div>
              <label htmlFor="pickupLocation" className="block mb-3 text-black-600 font-semibold text-sm  ">
                Pick-up Location
              </label>
              <input
                type="text"
                id="pickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Hudson Rd, Colombo 03"
                className="appearance-none w-[333px] h-[35px] border-[1px] border-[#00000042] bg-[#F4F3F3] rounded-[5px] mb-3 py-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
              />
            </div>

            <div className="flex flex-row gap-5">
              <div>
                <label htmlFor="pickupDate" className="block mb-3 text-black text-sm font-semibold">Pick-up Date</label>
                <input
                  type="date"
                  id="pickupDate"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  placeholder="2025-07-23"
                  className="w-full border-[1px] h-[35px]  border-[#00000042] bg-[#F4F3F3] rounded-[5px] mb-3 py-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
                />
              </div>
              <div className="relative">
                <label htmlFor="pickupTime" className="block mb-3 text-black text-sm font-semibold">Pick-up Time</label>
                <input
                  type="time"
                  id="pickupTime"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="00:00"
                  className="w-[135px] h-[35px] relative border-[1px] border-[#00000042] bg-transparent rounded-[5px] mb-3 py-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
                />
              </div>
            </div>
          </div>

          <div>
            <div>
              <label htmlFor="dropoffLocation" className="block mb-3 text-black text-sm font-semibold">Drop-off Location</label>
              <input
                type="text"
                id="dropoffLocation"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Hudson Rd, Colombo 03"
                className="w-[333px] h-[35px] border-[1px] border-[#00000042] bg-[#F4F3F3] rounded-[5px] mb-3 py-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
              />
            </div>

            <div className="flex flex-row gap-5">
              <div>
                <label htmlFor="dropoffDate" className="block mb-3 text-black text-sm font-semibold">Drop-off Date</label>
                <input
                  type="date"
                  id="dropoffDate"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  placeholder="2025-07-30"
                  className="border-[1px] border-[#00000042] bg-[#F4F3F3] rounded-[5px] mb-3 py-3  w-full leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
                />
              </div>
              <div className="relative">
                <label htmlFor="dropoffTime" className="block mb-3 text-black text-sm font-semibold">Drop-off Time</label>
                <input
                  type="time"
                  id="dropoffTime"
                  value={dropoffTime}
                  onChange={(e) => setDropoffTime(e.target.value)}
                  placeholder="00:00"
                  className="w-full border-[1px] border-[#00000042] bg-[#F4F3F3] rounded-[5px] mb-3 py-3 leading-tight focus:outline-none focus:shadow-outline placeholder:text-[gray placeholder:text-[12px] placeholder:font-[600]"
                />
              </div>
            </div>
          </div>
          {dateError && (
            <div className="text-[12px] text-red-600 mb-3">{dateError}</div>
          )}
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

        <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-10 px-10">
          <h1 className="font-[600] mb-5 text-[#000000D9]">Pricing Breakdown</h1>
          <div className="w-full h-[1px] bg-[#CDD0D4]" />

          <h1 className="font-[600] mt-5 text-[#000000D9]">Driver</h1>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { value: false, label: "Self-Drive" },
              { value: true, label: "With Driver" },
            ].map((opt) => (
              <button
                type="button"
                key={String(opt.value)}
                onClick={() => setNeedsDriver(opt.value)}
                className={`rounded-[5px] border-[1.5px] px-4 py-2.5 text-[12px] font-[700] transition-colors ${
                  needsDriver === opt.value
                    ? "bg-[#0955AC] border-[#0955AC] text-white"
                    : "border-[#0000001F] text-[#00000099] hover:border-[#0955AC]/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {needsDriver && (
            <p className="mt-3 text-[12px] font-[700] text-[#0955AC] bg-[#0955AC1A] border border-[#0955AC]/30 rounded-[6px] px-3 py-2">
              A pilot/driver adds {(DRIVER_FEE_RATE * 100).toFixed(0)}% of the daily rate for chauffeur service.
            </p>
          )}

          <h1 className="font-[600] mt-5 text-[#000000D9]">Add Extras</h1>

          <div className="flex flex-col justify-center text-[12px] font-[500] mt-5">
            {Object.keys(extras).length === 0 && (
              <div className="px-5 py-5 text-[#00000080]">No extras available.</div>
            )}
            {Object.keys(extras).map((name, i) => (
              <div key={name} className={`flex flex-row justify-between w-full px-5 ${i % 2 ? "" : "py-5"}`}>
                <div className="flex flex-row justify-center items-center gap-4">
                  <input
                    type="checkbox"
                    className=" size-[15px] border-[1px] border-[#0955AC] rounded-[2.8px]"
                    checked={!!extras[name]}
                    onChange={() => toggleExtra(name)}
                  />
                  <h1>{name}</h1>
                </div>
                <h1>{priceByName[name] !== undefined ? priceByName[name].toFixed(2) : "—"}</h1>
              </div>
            ))}
          </div>

          <div className="w-full h-[1px] bg-[#CDD0D4] mt-5" />

          <div className="flex justify-center items-center">
            <div
              className=" w-auto xl:w-[261px] xl:h-[29px] px-4 py-2 bg-[#E8EBEF] border-[1.5px] border-[#0955AC] rounded-[5px] mt-10 flex items-center justify-center text-[12px] font-[700] text-[#0955AC] cursor-pointer"
              onClick={getQuote}
            >
              GET A QUOTE
            </div>
          </div>

          <div className="flex justify-center items-center">
            <div
              className="w-auto xl:w-[261px] xl:h-[29px] bg-[#0955AC] px-4 py-2 rounded-[5px] mt-5 flex items-center justify-center text-[12px] font-[700] text-[#FFFFFF] text-center cursor-pointer"
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

const PlaneSearch = (props) => (
  <LocaleProvider>
    <PlaneSearchInner {...props} />
  </LocaleProvider>
);

export default PlaneSearch;
