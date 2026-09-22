import React, { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import axios from "axios";
import { Warehouse, CheckCircle, Clock, AlertCircle, CreditCard, RefreshCcw } from "lucide-react";
import ClientHeader from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import {
    launchPayHereOnsiteCheckout,
    launchPayHereRedirectCheckout,
    preloadPayHereOnsiteSdk,
} from "../../../../utils/payhereCheckout";

// Warehouse bookings use payment_status values pending|paid|failed|refunded
// (see App\Models\Warehouse\WarehouseBooking), unlike WalletTransaction's
// pending|completed|failed — the presentation map below matches that.
const TERMINAL_STATUSES = new Set(["paid", "failed"]);

const STATUS_PRESENTATION = {
    pending: { tone: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock, title: "Waiting for Payment" },
    paid: { tone: "border-green-200 bg-green-50 text-green-700", icon: CheckCircle, title: "Payment Successful" },
    failed: { tone: "border-red-200 bg-red-50 text-red-700", icon: AlertCircle, title: "Payment Failed" },
    refunded: { tone: "border-slate-200 bg-slate-50 text-slate-700", icon: AlertCircle, title: "Payment Refunded" },
};

const WarehousePaymentCheckout = ({ booking, checkout, pollingUrl, retryUrl, bookingListUrl }) => {
    const [live, setLive] = useState(booking);
    const [isLaunching, setIsLaunching] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [launchError, setLaunchError] = useState("");

    useEffect(() => {
        setLive(booking);
    }, [booking]);

    useEffect(() => {
        if (checkout?.isReady) {
            preloadPayHereOnsiteSdk().catch(() => {});
        }
    }, [checkout?.isReady]);

    useEffect(() => {
        if (TERMINAL_STATUSES.has(live.status)) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(pollingUrl, { headers: { Accept: "application/json" } });
                const data = await res.json();
                if (data?.booking) setLive(data.booking);
            } catch (_e) {
                // ignore transient poll failures
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [live.status, pollingUrl]);

    const presentation = STATUS_PRESENTATION[live.status] || STATUS_PRESENTATION.pending;
    const StatusIcon = presentation.icon;
    const canProceed = Boolean(checkout?.isReady) && live.status === "pending";
    const canRetry = live.status === "failed";

    const handlePay = async () => {
        setLaunchError("");
        setIsLaunching(true);
        try {
            await launchPayHereOnsiteCheckout(checkout, {
                onCompleted: () => {
                    setIsLaunching(false);
                },
                onDismissed: () => {
                    setIsLaunching(false);
                },
                onError: () => {
                    setIsLaunching(false);
                },
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

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            const { data } = await axios.post(retryUrl, {}, { headers: { Accept: "application/json" } });
            if (data?.redirect) {
                window.location.href = data.redirect;
                return;
            }
        } catch (_e) {
            // fall through — keep the user on this page
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <div>
            <ClientHeader />
            <section className="mx-auto w-full max-w-2xl px-4 md:px-6 py-12 md:py-16">
                <div className="text-center mb-10">
                    <Warehouse className="w-10 h-10 text-[#0955AC] mx-auto mb-3" />
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A]">Warehouse Booking Payment</h1>
                    <p className="text-[#64748B] mt-2">
                        {live.warehouseName || "Warehouse Storage"} &middot; Ref: {live.bookingReference}
                    </p>
                    {(live.startDate || live.endDate) && (
                        <p className="text-[#64748B] text-[13px] mt-1">
                            {live.startDate || "—"} to {live.endDate || "—"}
                        </p>
                    )}
                    <p className="text-[#0F172A] font-[700] text-xl mt-3">
                        LKR {Number(live.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className={`rounded-2xl border p-6 flex items-center gap-3 mb-6 ${presentation.tone}`}>
                    <StatusIcon className="w-6 h-6 shrink-0" />
                    <div>
                        <p className="font-[700]">{presentation.title}</p>
                        {live.status === "failed" && live.failureReason && (
                            <p className="text-[13px] mt-1">{live.failureReason}</p>
                        )}
                    </div>
                </div>

                {!checkout?.isReady && live.status === "pending" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-700 text-[14px] mb-6">
                        {checkout?.reason || "PayHere is not configured yet."}
                    </div>
                )}

                {canProceed && (
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
                        disabled={isRetrying}
                        className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] rounded-[12px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                        <RefreshCcw className="w-[18px] h-[18px]" />
                        {isRetrying ? "Retrying..." : "Retry Payment"}
                    </button>
                )}

                {launchError && (
                    <p className="text-red-600 text-[13px] mt-3 text-center">{launchError}</p>
                )}

                <div className="text-center mt-8">
                    <Link href={bookingListUrl} className="text-[#0955AC] font-[600] text-[14px] hover:underline">
                        Back to My Bookings
                    </Link>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default WarehousePaymentCheckout;
