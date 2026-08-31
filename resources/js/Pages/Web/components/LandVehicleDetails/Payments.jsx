import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { Wallet as WalletIcon, AlertTriangle } from "lucide-react";
import car from "../../assets/vehicleCheckout/car.svg";
import icon1 from "../../assets/vehicleCheckout/icon1.svg";
import icon2 from "../../assets/vehicleCheckout/icon2.svg";
import icon3 from "../../assets/vehicleCheckout/icon3.svg";
import icon4 from "../../assets/vehicleCheckout/icon4.svg";

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const money = (v) => n(v).toFixed(2);

// ---- pretty date/time helpers (Asia/Colombo to match backend) ----
const TZ = "Asia/Colombo";
const ord = (d) => {
  const s = ["th", "st", "nd", "rd"];
  const v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: TZ }).format(d);
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: TZ }).format(d));
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TZ }).format(d);
  return `${month} ${ord(day)}, ${year}`;
};
const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  })
    .format(d)
    .replace(":", " : ");
};

const Payments = () => {
  const { props } = usePage();

  // ✅ local booking state so totals can change after toggles
  const [booking, setBooking] = useState(props?.booking || {});
  const vehicle = booking?.vehicle || {};
  const schedule = booking?.schedule || {};

  // Wallet balance (for the "Pay with Wallet" option)
  const wallet = props?.wallet || { balance: 0, currency: "LKR" };
  const walletBalance = Number(wallet.balance ?? 0);

  const total = n(booking.total_amount);
  const advance = n(booking.advance_amount);

  const [selectedPayment, setSelectedPayment] = useState("Credit Card");
  const [paymentOption, setPaymentOption] = useState("full");
  const [slipNumber, setSlipNumber] = useState("");
  const [slipPdf, setSlipPdf] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState({ slipNumber: "", slipPdf: "" });
  const [walletError, setWalletError] = useState("");
  const slipNumberRegex = /^(\d+|[a-zA-Z]+\d+|[a-zA-Z]+-\d+)$/;

  // NEW: in-window popup instead of alert for T&C message
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  // Clear bank-slip fields when user selects a non-bank payment method
  useEffect(() => {
    if (selectedPayment !== "Bank Transfer") {
      setSlipNumber("");
      setSlipPdf(null);
      setError((prev) => ({ ...prev, slipNumber: "", slipPdf: "" }));
    }
  }, [selectedPayment]);

  const handleConfirmBooking = () => {
    if (!booking?.id) {
      alert("Missing booking. Please go back.");
      return;
    }

    // Wallet balance pre-check (server re-validates with a row lock regardless)
    if (selectedPayment === "Wallet") {
      const payNowAmount = paymentOption === "full" ? total : Math.min(advance, total);
      if (walletBalance < payNowAmount) {
        setWalletError("Insufficient wallet balance for this payment.");
        return;
      }
    }
    setWalletError("");

    // Only require slip number & PDF when user chooses Bank Transfer
    if (selectedPayment === "Bank Transfer") {
      if (!slipNumber || !slipNumberRegex.test(slipNumber)) {
        setError((prev) => ({
          ...prev,
          slipNumber: "Please enter a valid slip number",
        }));
        return;
      } else {
        setError((prev) => ({ ...prev, slipNumber: "" }));
      }

      if (!slipPdf) {
        setError((prev) => ({
          ...prev,
          slipPdf: "Please upload the bank slip PDF",
        }));
        return;
      } else {
        setError((prev) => ({ ...prev, slipPdf: "" }));
      }
    } else {
      // clear any stale slip errors when not using bank transfer
      setError((prev) => ({ ...prev, slipNumber: "", slipPdf: "" }));
    }

    if (!agreed) {
      // ⬇ show custom modal, no browser alert
      setShowTermsPopup(true);
      return;
    }
    const formData = new FormData();
    formData.append("payment_method", selectedPayment);
    formData.append("payment_option", paymentOption);
    if (selectedPayment === "Bank Transfer") {
      if (slipNumber) formData.append("slip_number", slipNumber);
      if (slipPdf) formData.append("slip_pdf", slipPdf);
    }
    router.post(route("client.bookings.confirm", booking.id), formData, {
      forceFormData: true,
      preserveScroll: true,
      onError: (errs) => {
        if (errs?.wallet) setWalletError(errs.wallet);
      },
    });
  };

  const handleBackBooking = () => {
    router.visit(route("client.bookings.checkout"), {
      method: "get",
      preserveScroll: true,
      data: { vehicle_id: booking?.vehicle_id },
    });
  };

  const handlePaymentBooking = () => {
    router.visit(route("client.bookings.payments", booking?.id), {
      method: "get",
      preserveScroll: true,
    });
  };

  const handleVehicleList = () => {
    router.visit("/vehicleList", { method: "get", preserveScroll: true });
  };

  // amounts based on chosen option
  const payNow = paymentOption === "full" ? total : Math.min(advance, total);
  const remaining = Math.max(total - payNow, 0);

  // small helpers for UI
  const C = booking?.currency || "$";
  const dayTotal = n(booking?.price_per_day) * n(booking?.rental_days || 1);

  /* ===================== RIGHT COLUMN: extras + live totals ===================== */

  // 1) Load full extras catalog for this vehicle
  const [catalog, setCatalog] = useState([]);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!vehicle?.id) return;
    // GET /vehicles/{vehicle}/extras -> from your controller::extras()
    axios
      .get(route("client.vehicles.extras", vehicle.id))
      .then(({ data }) => {
        const list = Array.isArray(data?.extras) ? data.extras : [];
        setCatalog(
          list
            .map((e) => ({
              name: e?.name ?? e?.additional_feature_name ?? "",
              price: Number(e?.price ?? e?.additional_feature_price ?? 0),
            }))
            .filter((x) => x.name)
        );
      })
      .catch(() => setCatalog([]));
  }, [vehicle?.id]);

  // 2) Which extras are currently selected (from DB booking->addons)
  const addons = Array.isArray(booking?.addons) ? booking.addons : [];
  const selectedNames = useMemo(
    () =>
      new Set(
        addons
          .map((a) => (a?.name || "").toLowerCase())
          .filter(Boolean)
      ),
    [addons]
  );
  const isSelected = (name) => selectedNames.has(String(name).toLowerCase());

  // 3) Toggle -> PATCH /bookings/{id}/addons (updates totals server-side; returns fresh booking)
  const toggleAddon = async (name) => {
    if (!booking?.id) return;
    const lname = String(name).toLowerCase();
    const next = new Set(selectedNames);
    next.has(lname) ? next.delete(lname) : next.add(lname);

    const payload = Array.from(next).map((nm) => ({ name: nm, qty: 1 }));

    try {
      setToggling(true);
      const { data } = await axios.patch(route("client.bookings.updateAddons", booking.id), {
        addons: payload,
      });
      if (data?.booking) setBooking(data.booking); // refresh everything on the card
    } finally {
      setToggling(false);
    }
  };

  /* ============================================================================ */

  return (
    <div>
      <div className="flex flex-col xl:flex-row justify-center items-center xl:items-start px-10 py-10 gap-10">
        {/* ================= LEFT SIDE (UNCHANGED LAYOUT) ================= */}
        <div className="flex flex-col gap-10">
          {/* progress header */}
          <div className="flex flex-row items-start justify-center pb-10">
            <div className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer" onClick={handleVehicleList}>
              <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Select Car</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer" onClick={handleBackBooking}>
              <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Booking Info</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div className="flex flex-col justify-center items-center gap-3 cursor-pointer" onClick={handlePaymentBooking}>
              <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Payments</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div className="md:flex flex-col justify-center hidden items-center cursor-pointer" onClick={handleConfirmBooking}>
              <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Booking Confirmation</h1>
            </div>
          </div>

          {/* Payment Methods */}
          <div
            className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-auto bg-[#FFFFFF] px-10 py-10"
            style={{ borderLeftWidth: "0.2px", borderTopWidth: "0.2px", boxShadow: "4px 4px 4px #0000001A" }}
          >
            <h1 className="text-[20px] font-[700]">Payment Methods</h1>

            <div className="flex flex-row flex-wrap items-center gap-10 text-[10px] font-[600] text-[#00000080] py-2">
              {["Credit Card", "PayPal", "Bank Transfer", "Wallet"].map((m) => (
                <label key={m} className="flex flex-row justify-center items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m}
                    checked={selectedPayment === m}
                    onChange={() => {
                      setSelectedPayment(m);
                      setWalletError("");
                    }}
                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:outline-none focus:ring-transparent transition-colors cursor-pointer"
                  />
                  <span className="peer-checked:text-[#000000] text-[#00000080] text-[16px] font-[600] flex items-center gap-1.5">
                    {m === "Wallet" && <WalletIcon size={14} className="text-[#0955AC]" />}
                    {m}
                  </span>
                </label>
              ))}
            </div>

            {selectedPayment === "Wallet" && (
              <div className="mt-4 rounded-[10px] bg-[#F1F5F9] px-5 py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-[600] text-[#00000099]">Wallet Balance</span>
                  <span className="text-[16px] font-[700] text-[#0955AC]">
                    {wallet.currency} {walletBalance.toFixed(2)}
                  </span>
                </div>
                {walletError && (
                  <div className="flex items-center gap-2 text-red-600 text-[12px] font-[600]">
                    <AlertTriangle size={14} />
                    <span>{walletError}</span>
                    <a
                      href={route("client.wallet.dashboard")}
                      className="ml-1 underline text-[#0955AC]"
                    >
                      Top up now
                    </a>
                  </div>
                )}
              </div>
            )}

            {selectedPayment === "Bank Transfer" && (
              <div className="mt-4 grid lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Slip Number :</label>
                  <div
                    className={`md:w-[374px] w-auto h-[49px] border-[1px] rounded-[5px] ${error.slipNumber ? "border-red-500" : "border-[#0000004D]"
                      }`}
                  >
                    <input
                      value={slipNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSlipNumber(value);

                        // Real-time validation
                        if (!slipNumberRegex.test(value)) {
                          setError((prev) => ({
                            ...prev,
                            slipNumber: "Invalid slip number format",
                          }));
                        } else {
                          setError((prev) => ({ ...prev, slipNumber: "" }));
                        }
                      }}
                      className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Enter slip number"
                    />
                  </div>
                  {error.slipNumber && (
                    <p className="text-red-500 text-[10px]">{error.slipNumber}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px]/[24px] font-[600]">Upload Bank Slip (PDF) :</label>
                  <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px] flex items-center px-3">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                          const maxSize = 5 * 1024 * 1024; // 5 MB in bytes

                          if (!allowedTypes.includes(file.type)) {
                            setError((prev) => ({ ...prev, slipPdf: 'Invalid file type. Only PDF, JPG, JPEG, PNG allowed.' }));
                            setSlipPdf(null);
                            return;
                          }

                          if (file.size > maxSize) {
                            setError((prev) => ({ ...prev, slipPdf: 'File size exceeds 5 MB.' }));
                            setSlipPdf(null);
                            return;
                          }

                          // Valid file
                          setSlipPdf(file);
                          setError((prev) => ({ ...prev, slipPdf: '' }));
                        } else {
                          setSlipPdf(null);
                          setError((prev) => ({ ...prev, slipPdf: '' }));
                        }
                      }}
                      className="w-full text-[12px] file:mr-3 file:rounded file:border-0 file:px-3 file:py-2 file:bg-[#F3F4F6] file:text-[12px] file:cursor-pointer"
                    />
                  </div>

                  {error.slipPdf && <p className="text-red-500 text-[10px]">{error.slipPdf}</p>}

                  <p className="text-[10px] text-[#00000080] mt-1">Only PDF, JPG, JPEG, PNG files are allowed. Max size 5MB.</p>
                </div>

              </div>
            )}
          </div>

          {/* Payment option & computed amounts */}
          <div
            className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-[316px] bg-[#FFFFFF] px-10 py-10"
            style={{ borderLeftWidth: "0.2px", borderTopWidth: "0.2px", boxShadow: "4px 4px 4px #0000001A" }}
          >
            <h1 className="text-[20px] font-[700]">Select Payment Option</h1>

            <div className="flex flex-col gap-5 py-10">
              <div className="flex flex-row items-start gap-4">
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === "full"}
                  onChange={() => setPaymentOption("full")}
                  className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:ring-transparent focus:outline-none transition-colors mt-[1.5px] cursor-pointer"
                />
                <div className="poppins text-[12px] flex flex-col justify-center items-start">
                  <h1 className="font-[600]">Pay full amount now</h1>
                  <h1 className="font-[500]">You will complete the entire payment before tour begins.</h1>
                </div>
              </div>
              <div className="flex flex-row items-start gap-4">
                <input
                  type="radio"
                  name="paymentOption"
                  checked={paymentOption === "advance"}
                  onChange={() => setPaymentOption("advance")}
                  className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:ring-transparent focus:outline-none transition-colors mt-[1.5px] cursor-pointer"
                />
                <div className="poppins text-[12px] flex flex-col justify-center items-start">
                  <h1 className="font-[600]">Pay advance now. Pay the balance after the tour.</h1>
                </div>
              </div>

              <div className="w-full md:h-[74px] bg-[#E2F6DC] rounded-[7px] text-[12px] px-5 py-5">
                <div className="flex flex-col md:flex-row md:gap-5">
                  <h1 className="font-[500] text-[#000000B2] w-[150px]">Advance to pay now:</h1>
                  <h1 className="font-[600]">
                    {C}
                    {money(payNow)}
                  </h1>
                </div>
                <div className="flex flex-col md:flex-row md:gap-5">
                  <h1 className="font-[500] text-[#000000B2] w-[150px]">Remaining Balance:</h1>
                  <h1 className="font-[600]">
                    {C}
                    {money(remaining)} (due date —)
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Terms + actions */}
          <div
            className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-[72px] bg-[#D8E4F2] px-5 py-5"
            style={{ borderLeftWidth: "0.2px", borderTopWidth: "0.2px", boxShadow: "4px 4px 4px #0000001A" }}
          >
            <div className="flex flex-row gap-5 text-[10px] font-[400]">
              <input
                className="size-[20px] border-[0.5px] border-[#0955AC] bg-[#FFFFFF] rounded-[4px] cursor-pointer focus:ring-transparent"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <div>
                <h1>
                  I agree to the <span className="text-[#0955AC]">Term and Condition</span> and{" "}
                  <span className="text-[#0955AC]">Privacy Policy.</span>
                </h1>
                <h1>I confirm that am at least. 21 vears old and hold a valid driver's license</h1>
              </div>
            </div>
          </div>

          <div>
            <div
              onClick={handleBackBooking}
              className="rounded-[5px] flex justify-center items-center text-[#0955AC] font-[700] text-[12px] lg:w-[874px] h-[50px] border-[2px] border-[#0955AC] px-5 cursor-pointer transition-colors"
            >
              Back
            </div>

            <div
              onClick={handleConfirmBooking}
              className="rounded-[5px] flex mt-5 justify-center items-center text-[#FFFFFF] font-[700] text-[12px] lg:w-[874px] h-[50px] bg-[#0955AC] px-5 cursor-pointer hover:bg-[#074a8f] transition-colors"
            >
              CONFIRM BOOKING
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (UPDATED) ================= */}
        <div className="flex flex-col gap-10">
          {/* Vehicle + schedule + editable extras */}
          <div className="md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-5" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
            <div className="flex flex-col md:flex-row gap-3 items-center border-b-[1px] pb-5 border-[#00000026]">
              <img src={car} alt="" />
              <div className="flex flex-col gap-3">
                <h1 className="figtree text-[20px] font-[700] ">
                  {vehicle?.manufacturer || ""} {vehicle?.model || ""}{" "}
                  {vehicle?.manufacture_year ? `(${vehicle.manufacture_year})` : ""}
                </h1>
                <div className="poppins flex flex-row gap-5 text-[9px] text-[#000000B2] font-[500]">
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <img src={icon1} className="size-[17px]" alt="" />
                    <h1>{vehicle?.mileage_km ?? "—"}</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <img src={icon2} className="size-[17px]" alt="" />
                    <h1>{vehicle?.landSpec?.transmission_type ?? vehicle?.transmission_type ?? "—"}</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <img src={icon3} className="size-[17px]" alt="" />
                    <h1>{vehicle?.passenger_capacity ? `${vehicle.passenger_capacity} Person` : "—"}</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <img src={icon4} className="size-[17px]" alt="" />
                    <h1>{vehicle?.landSpec?.fuel_type ?? vehicle?.fuel_type ?? "—"}</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Pick & drop */}
            <div className="py-10 px-20">
              <div className="flex flex-row gap-5 justify-center items-start">
                <div className="flex flex-col items-center mt-2">
                  <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                  <div className="h-[77px] w-[1.5px] bg-[#0955AC]"></div>
                  <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                </div>
                <div className="figtree flex flex-col gap-10 text-[14px] font-[500] text-[#00000080]">
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Pick up: {schedule?.pickup_location || "—"}</h1>
                    <h1>Pick-up Date : {fmtDate(schedule?.pickup_at)}</h1>
                    <h1>Pick-up Time : {fmtTime(schedule?.pickup_at)}</h1>
                  </div>
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Drop off: {schedule?.dropoff_location || "—"}</h1>
                    <h1>Drop-off Date : {fmtDate(schedule?.dropoff_at)}</h1>
                    <h1>Drop-off Time : {fmtTime(schedule?.dropoff_at)}</h1>
                  </div>
                </div>
              </div>

              {/* Selected Extras (editable; mirrors your checkout UX) */}
              <div className="mt-6">
                <h2 className="text-[14px] font-[700] text-[#0955AC]">
                  Selected Extras {toggling ? "(updating…)" : ""}
                </h2>
                <div className="mt-2 space-y-2">
                  {catalog.length === 0 && <div className="text-[12px] text-[#00000080]">No extras available.</div>}
                  {catalog.map((ex) => (
                    <label key={ex.name} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="size-[15px] border-[1px] border-[#0955AC] rounded-[2.8px]"
                          checked={isSelected(ex.name)}
                          onChange={() => toggleAddon(ex.name)}
                          disabled={toggling}
                        />
                        <span>• {ex.name}</span>
                      </span>
                      <span className="text-[#00000080]">
                        {C}
                        {money(ex.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details (driven by LIVE booking) */}
          <div className="poppins md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-10 py-10" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
            <h1 className="font-[600] text-[20px]">Payment Details</h1>

            <div className="md:px-10 py-5">
              <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-10 px-10">
                <h1 className="font-[600] mb-5 text-[#000000D9]">Pricing Breakdown</h1>
                <div className="w-full h-[1px] bg-[#CDD0D4]" />

                {/* Rental line */}
                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">Rental Price</h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>
                        {C}
                        {money(booking?.price_per_day)}/day
                      </h1>
                      <h1 className="text-[#0955AC]">(x{booking?.rental_days || 1} days)</h1>
                    </div>
                  </div>
                  <div className="text-[#000000CC]">
                    {C}
                    {money(dayTotal)}
                  </div>
                </div>

                {/* Addons total line */}
                <div className="flex flex-col md:flex-row justify-between w-full px-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">Addons</h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>Selected extras</h1>
                    </div>
                  </div>
                  <div className="text-[#000000CC]">
                    +{C}
                    {money(booking?.addons_total)}
                  </div>
                </div>

                {/* Itemized Extras */}
                {addons.length > 0 && (
                  <>
                    <h1 className="font-[600] mt-5 text-[#000000D9]">Add Extras</h1>
                    <div className="flex flex-col justify-center text-[12px] font-[500] mt-5">
                      {addons.map((a, i) => (
                        <div key={i} className="flex flex-col md:flex-row justify-between w-full px-5 py-1">
                          <div className="flex flex-row md:justify-center items-center gap-4">
                            <h1>
                              {a.name}
                              {n(a.qty) > 1 ? ` × ${a.qty}` : ""}
                            </h1>
                          </div>
                          <h1>
                            {C}
                            {money(a.line_total)}
                          </h1>
                        </div>
                      ))}
                    </div>

                    <div className="w-full h-[1px] bg-[#CDD0D4] mt-5" />
                  </>
                )}

                {/* Deposit (negative) */}
                {n(booking?.deposit_amount) > 0 && (
                  <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                    <div>
                      <h1 className="text-[#000000CC]">Refundable deposit</h1>
                      <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                        <h1>Refunded after return</h1>
                      </div>
                    </div>
                    <div className="text-[#000000CC]">
                      -{C}
                      {money(booking?.deposit_amount)}
                    </div>
                  </div>
                )}

                <div className="w-full h-[1px] bg-[#CDD0D4]" />

                {/* Advance (shows what user pays now depending on radio) */}
                {n(advance) > 0 && (
                  <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                    <div>
                      <h1 className="text-[#000000CC]">Advance Payment</h1>
                      <div className="flex flex-col md:flex-row gap-3 text-[#00000061] mt-3">
                        <h1>First payment</h1>
                        <h1 className="text-[#0955AC]">(option based)</h1>
                      </div>
                    </div>
                    <div className="text-[#000000CC] text-[12px] font-[500]">
                      {C}
                      {money(paymentOption === "full" ? total : Math.min(advance, total))}
                    </div>
                  </div>
                )}

                {/* Grand total */}
                <div className="flex flex-col md:flex-row justify-between w-full px-5 pb-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">Total Price Due</h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061] mt-3">
                      <h1>After deposit & addons</h1>
                    </div>
                  </div>
                  <div className="text-[#000000CC] text-[16px] font-[700]">
                    {C}
                    {money(total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Payment Details */}
        </div>
      </div>

      {/* ========= In-window popup for T&C agreement ========= */}
      {showTermsPopup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div
            role="dialog"
            aria-modal="true"
            className="w-[90%] max-w-md rounded-[10px] bg-white shadow-2xl"
          >
            <div className="px-6 py-5">
              <h3 className="text-[16px] font-[700] text-[#111827] mb-2">
                Action required
              </h3>
              <p className="text-[14px] text-[#374151]">
                Please agree to the <span className="text-[#0955AC] font-semibold">Terms &amp; Conditions</span> and{" "}
                <span className="text-[#0955AC] font-semibold">Privacy Policy</span> before confirming your booking.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-5">
              <button
                onClick={() => setShowTermsPopup(false)}
                className="inline-flex items-center justify-center h-[40px] px-5 rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[700] hover:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========= /popup ========= */}
    </div>
  );
};

export default Payments;
