import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { router, usePage, Link } from "@inertiajs/react";
import { route } from "ziggy-js";
import VendorLegalAgreement from "@/Components/legal/VendorLegalAgreement";
import {
  Wallet as WalletIcon,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Lock,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import placeholderImg from "@/assets/placeholder.jpg";

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const money = (v) => n(v).toFixed(2);

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const Payments = () => {
  const { props } = usePage();

  const [booking, setBooking] = useState(props?.booking || {});
  const vehicle = booking?.vehicle || {};
  const schedule = booking?.schedule || {};

  const wallet = props?.wallet || { balance: 0, currency: "LKR" };
  const walletBalance = Number(wallet.balance ?? 0);

  const total = n(booking.total_amount);
  const advance = n(booking.advance_amount);

  const [selectedPayment, setSelectedPayment] = useState("Card");
  const [paymentOption, setPaymentOption] = useState("full");
  const [agreed, setAgreed] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const payNow = paymentOption === "full" ? total : Math.min(advance, total);
  const remaining = Math.max(total - payNow, 0);
  const deposit = n(booking.deposit_amount);
  const dueToday = payNow + deposit;

  const C = booking?.currency || "LKR";
  const dayTotal = n(booking?.price_per_day) * n(booking?.rental_days || 1);

  const handleConfirmBooking = () => {
    if (!booking?.id) {
      alert("Missing booking reference. Please return to checkout.");
      return;
    }

    if (selectedPayment === "Wallet") {
      const payNowAmount = (paymentOption === "full" ? total : Math.min(advance, total)) + n(booking.deposit_amount);
      if (walletBalance < payNowAmount) {
        setWalletError("Insufficient wallet balance for this booking.");
        return;
      }
    }
    setWalletError("");

    if (!agreed) {
      setShowTermsPopup(true);
      return;
    }

    router.post(
      route("client.bookings.confirm", booking.id),
      { payment_method: selectedPayment, payment_option: paymentOption },
      {
        preserveScroll: true,
        onError: (errs) => {
          if (errs?.wallet) setWalletError(errs.wallet);
        },
      }
    );
  };

  const handleBackBooking = () => {
    router.visit(route("client.bookings.checkout"), {
      method: "get",
      preserveScroll: true,
      data: { vehicle_id: booking?.vehicle_id },
    });
  };

  /* Extras & Add-ons */
  const [catalog, setCatalog] = useState([]);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!vehicle?.id) return;
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

  const addons = Array.isArray(booking?.addons) ? booking.addons : [];
  const selectedNames = useMemo(() => new Set(addons.map((a) => a.name)), [addons]);

  const toggleServerAddon = async (name) => {
    if (!booking?.id || toggling) return;
    const willAdd = !selectedNames.has(name);
    const next = willAdd
      ? [...addons.map((a) => ({ name: a.name, qty: a.qty ?? 1 })), { name, qty: 1 }]
      : addons.filter((a) => a.name !== name).map((a) => ({ name: a.name, qty: a.qty ?? 1 }));

    try {
      setToggling(true);
      const { data } = await axios.patch(route("client.bookings.updateAddons", booking.id), {
        addons: next,
      });
      if (data?.booking) setBooking(data.booking);
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  const STEPS = [
    { num: 1, label: "Select Vehicle", done: true, href: "/vehicleList" },
    { num: 2, label: "Renter Info", done: true, onClick: handleBackBooking },
    { num: 3, label: "Payment Method", current: true },
    { num: 4, label: "Confirmation" },
  ];

  const vehicleImg = vehicle?.primary_image_url || vehicle?.primaryImage?.url || placeholderImg;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Terms Popup Modal */}
      {showTermsPopup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Agreement Confirmation</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Please review and agree to the Jaan Transport Rental Terms & Cancellation Policy before finalizing your booking.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTermsPopup(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreed(true);
                  setShowTermsPopup(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                I Agree & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                className={`flex flex-col items-center text-center ${s.onClick ? "cursor-pointer" : ""}`}
                onClick={s.onClick}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    s.done
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : s.current
                      ? "bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-lg shadow-blue-600/30"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : s.num}
                </div>
                <span
                  className={`text-xs font-bold mt-2 ${
                    s.current ? "text-blue-600" : s.done ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 mt-[-20px] transition-colors ${
                    s.done ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main 2-Column Payment Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Payment Configuration */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Payment Method Selector */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Select Payment Method</h3>
              <p className="text-xs text-slate-500 mt-0.5">Choose how you want to settle this rental</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Credit / Debit Card (PayHere) */}
              <label
                className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPayment === "Card"
                    ? "border-blue-600 bg-blue-50/30 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Card"
                  checked={selectedPayment === "Card"}
                  onChange={() => {
                    setSelectedPayment("Card");
                    setWalletError("");
                  }}
                  className="sr-only"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-900 block">Credit / Debit Card</span>
                  <span className="text-[11px] text-slate-500">Visa, Mastercard, AMEX via PayHere</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === "Card" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}
                >
                  {selectedPayment === "Card" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </label>

              {/* Jaan Wallet */}
              {String(booking?.currency || "LKR").toUpperCase() === "LKR" && (
                <label
                  className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPayment === "Wallet"
                      ? "border-blue-600 bg-blue-50/30 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Wallet"
                    checked={selectedPayment === "Wallet"}
                    onChange={() => {
                      setSelectedPayment("Wallet");
                      setWalletError("");
                    }}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <WalletIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-900 block">Jaan Wallet</span>
                    <span className="text-[11px] text-slate-500 font-semibold text-emerald-700">
                      Balance: {wallet.currency} {walletBalance.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === "Wallet" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                    }`}
                  >
                    {selectedPayment === "Wallet" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </label>
              )}
            </div>

            {/* Wallet Balance Warning */}
            {selectedPayment === "Wallet" && walletError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{walletError}</span>
                </div>
                <a
                  href={route("client.wallet.dashboard")}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] hover:bg-rose-700 font-bold"
                >
                  Top Up Wallet
                </a>
              </div>
            )}
          </div>

          {/* Payment Split Options */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Payment Schedule</h3>
              <p className="text-xs text-slate-500 mt-0.5">Choose to pay in full today or secure with an advance</p>
            </div>

            <div className="space-y-3">
              {/* Pay Full */}
              <label
                className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  paymentOption === "full"
                    ? "border-blue-600 bg-blue-50/30"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentOption"
                    checked={paymentOption === "full"}
                    onChange={() => setPaymentOption("full")}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Pay Full Rental Now</span>
                    <span className="text-xs text-slate-500">
                      Zero balance due on pickup day. Fastest key handover experience.
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-slate-900">
                    {C} {money(total + deposit)}
                  </span>
                </div>
              </label>

              {/* Pay Advance */}
              {advance > 0 && advance < total && (
                <label
                  className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    paymentOption === "advance"
                      ? "border-blue-600 bg-blue-50/30"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentOption === "advance"}
                      onChange={() => setPaymentOption("advance")}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Pay Advance to Reserve</span>
                      <span className="text-xs text-slate-500">
                        Pay advance now ({C} {money(advance)}). Remaining {C} {money(remaining)} paid at pickup.
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-blue-600">
                      {C} {money(advance + deposit)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Due today</span>
                  </div>
                </label>
              )}
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs text-slate-600 leading-relaxed font-medium">
                  I have read and agree to the{" "}
                  <span className="text-blue-600 font-bold underline">Standard Rental Agreement</span>, Cancellation Policy, and Driver Requirements.
                </span>
              </label>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBackBooking}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back to Renter Information
            </button>

            <button
              type="button"
              onClick={handleConfirmBooking}
              className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm & Pay {C} {money(dueToday)}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-8">
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)] p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
              Order Breakdown
            </h3>

            {/* Vehicle Card */}
            <div className="flex items-center gap-3.5">
              <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={vehicleImg} alt="Vehicle" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  {vehicle?.manufacturer}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {vehicle?.manufacturer} {vehicle?.model}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {booking.rental_days} {booking.rental_days === 1 ? "day" : "days"} rental
                </p>
              </div>
            </div>

            {/* Schedule details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pick-up</span>
                <p className="font-bold text-slate-800">{schedule?.pickup_location || "Standard Service Hub"}</p>
                <p className="text-slate-500 text-[11px]">{fmtDate(schedule?.pickup_at)} at {fmtTime(schedule?.pickup_at)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Drop-off</span>
                <p className="font-bold text-slate-800">{schedule?.dropoff_location || "Standard Service Hub"}</p>
                <p className="text-slate-500 text-[11px]">{fmtDate(schedule?.dropoff_at)} at {fmtTime(schedule?.dropoff_at)}</p>
              </div>
            </div>

            {/* Live Add-ons list if catalog exists */}
            {catalog.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Trip Extras
                </span>
                <div className="divide-y divide-slate-100 text-xs">
                  {catalog.map((c) => {
                    const active = selectedNames.has(c.name);
                    return (
                      <label key={c.name} className="flex items-center justify-between py-2 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={active}
                            disabled={toggling}
                            onChange={() => toggleServerAddon(c.name)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className="text-slate-700 font-medium">{c.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">
                          +{C} {money(c.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pricing Ledger */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Vehicle Rental ({booking.rental_days} days)</span>
                <span className="font-semibold text-slate-800">{C} {money(dayTotal)}</span>
              </div>

              {booking.needs_driver && Number(booking.driver_fee_per_day) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Chauffeur Service</span>
                  <span className="font-semibold text-slate-800">
                    {C} {money(Number(booking.driver_fee_per_day) * Number(booking.rental_days))}
                  </span>
                </div>
              )}

              {n(booking.addons_total) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Included Extras</span>
                  <span className="font-semibold text-slate-800">{C} {money(booking.addons_total)}</span>
                </div>
              )}

              {deposit > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Refundable Security Deposit</span>
                  <span className="font-semibold">{C} {money(deposit)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm">
                <span className="text-slate-900">Total Booking Value</span>
                <span className="text-base font-black text-slate-900">{C} {money(total + deposit)}</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex justify-between items-baseline font-bold text-xs">
                <span className="text-blue-900">Amount Charged Today</span>
                <span className="text-base font-black text-blue-600">{C} {money(dueToday)}</span>
              </div>

              {paymentOption === "advance" && remaining > 0 && (
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Due upon vehicle delivery</span>
                  <span className="font-bold text-slate-600">{C} {money(remaining)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Verified Payment with Bank-Grade Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
