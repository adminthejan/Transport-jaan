import React, { useEffect, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { CheckCircle, Clock, AlertCircle, CreditCard } from "lucide-react";
import {
  launchPayHereOnsiteCheckout,
  launchPayHereRedirectCheckout,
  preloadPayHereOnsiteSdk,
} from "../../../../utils/payhereCheckout";

const TERMINAL_STATUSES = new Set(["paid"]);

const STATUS_PRESENTATION = {
  pending: { tone: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock, title: "Waiting for Payment" },
  paid: { tone: "border-green-200 bg-green-50 text-green-700", icon: CheckCircle, title: "Payment Successful" },
  failed: { tone: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle, title: "Payment Failed" },
  cancelled: { tone: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle, title: "Payment Cancelled" },
  expired: { tone: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle, title: "Payment Expired" },
};

const TYPE_LABEL = {
  land: "Vehicle Rental",
  air: "Air Vehicle Rental",
  sea: "Sea Vehicle Rental",
};

const money = (v) => {
  const x = Number(v);
  return (Number.isFinite(x) ? x : 0).toFixed(2);
};

const PaymentCheckout = () => {
  const { props } = usePage();
  const { booking, payment, checkout, pollingUrl, retryUrl, summaryUrl, paymentsUrl, vehicleType } = props;

  const [live, setLive] = useState(payment);
  const [bookingStatus, setBookingStatus] = useState(booking?.status);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    setLive(payment);
  }, [payment]);

  useEffect(() => {
    if (checkout?.isReady) {
      preloadPayHereOnsiteSdk().catch(() => {});
    }
  }, [checkout?.isReady]);

  useEffect(() => {
    if (!live || TERMINAL_STATUSES.has(live.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(pollingUrl, { headers: { Accept: "application/json" } });
        const data = await res.json();
        if (data?.payment) setLive(data.payment);
        if (data?.bookingStatus) setBookingStatus(data.bookingStatus);
      } catch (_e) {
        // ignore transient poll failures
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [live?.status, pollingUrl]);

  useEffect(() => {
    if (live?.status === "paid" && summaryUrl) {
      const t = setTimeout(() => router.visit(summaryUrl), 1200);
      return () => clearTimeout(t);
    }
  }, [live?.status, summaryUrl]);

  const presentation = STATUS_PRESENTATION[live?.status] || STATUS_PRESENTATION.pending;
  const StatusIcon = presentation.icon;
  const canPay = Boolean(checkout?.isReady) && live?.status === "pending";
  const canRetry = ["failed", "cancelled", "expired"].includes(live?.status);

  const vehicle = booking?.vehicle || {};
  const schedule = booking?.schedule || {};

  const handlePay = async () => {
    setLaunchError("");
    setIsLaunching(true);
    try {
      await launchPayHereOnsiteCheckout(checkout, {
        onCompleted: () => setIsLaunching(false),
        onDismissed: () => setIsLaunching(false),
        onError: () => setIsLaunching(false),
      });
    } catch (_e) {
      try {
        launchPayHereRedirectCheckout(checkout);
      } catch (err) {
        setLaunchError(err?.message || "Could not start PayHere checkout.");
        setIsLaunching(false);
      }
    }
  };

  const handleRetry = () => {
    router.post(retryUrl, {}, { preserveScroll: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="mx-auto w-full max-w-2xl px-4 md:px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <CreditCard className="w-10 h-10 text-[#0955AC] mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">
            {TYPE_LABEL[vehicleType] || "Vehicle Rental"} Payment
          </h1>
          <p className="text-[#64748B] mt-2">
            {vehicle?.manufacturer || ""} {vehicle?.model || ""}
          </p>
          {schedule?.pickup_location && (
            <p className="text-[#94A3B8] text-[13px] mt-1">
              Pick up: {schedule.pickup_location}
              {schedule?.dropoff_location ? ` · Drop off: ${schedule.dropoff_location}` : ""}
            </p>
          )}
          <p className="text-[#0F172A] font-[700] mt-4 text-[20px]">
            {booking?.currency || "LKR"} {money(live?.amount)}
          </p>
        </div>

        <div className={`rounded-2xl border p-6 flex items-center gap-3 mb-6 ${presentation.tone}`}>
          <StatusIcon className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-[700]">{presentation.title}</p>
            {["failed", "cancelled", "expired"].includes(live?.status) && live?.failureReason && (
              <p className="text-[13px] mt-1">{live.failureReason}</p>
            )}
            {live?.status === "paid" && bookingStatus === "confirmed" && (
              <p className="text-[13px] mt-1">Your booking is confirmed. Redirecting to the summary…</p>
            )}
          </div>
        </div>

        {!checkout?.isReady && live?.status === "pending" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-700 text-[14px] mb-6">
            {checkout?.reason || "PayHere is not configured yet."}
          </div>
        )}

        {canPay && (
          <button
            onClick={handlePay}
            disabled={isLaunching}
            className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] rounded-[12px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <CreditCard className="w-[18px] h-[18px]" />
            {isLaunching ? "Opening PayHere..." : "Pay with PayHere"}
          </button>
        )}

        {canRetry && (
          <button
            onClick={handleRetry}
            className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] rounded-[12px] flex items-center justify-center gap-2 transition-colors"
          >
            Retry Payment
          </button>
        )}

        {launchError && <p className="text-red-600 text-[13px] mt-3 text-center">{launchError}</p>}

        <div className="text-center mt-8 flex items-center justify-center gap-6">
          <Link href={paymentsUrl} className="text-[#0955AC] font-[600] text-[14px] hover:underline">
            Back to Payment Options
          </Link>
          {live?.status === "paid" && (
            <Link href={summaryUrl} className="text-[#0955AC] font-[600] text-[14px] hover:underline">
              View Summary
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaymentCheckout;
