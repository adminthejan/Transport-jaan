import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";
import {
    launchPayHereOnsiteCheckout,
    launchPayHereRedirectCheckout,
    preloadPayHereOnsiteSdk,
} from "./payhereCheckout";

const TERMINAL_STATUSES = new Set(["paid", "failed", "cancelled", "expired"]);
const RETRYABLE_STATUSES = new Set(["failed", "cancelled", "expired"]);

const titleizeStatus = (status) => {
    return String(status || "pending")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateTime = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-LK", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const buildLivePaymentState = (payment) => ({
    status: String(payment?.status || "pending").toLowerCase(),
    amount: Number(payment?.amount || 0),
    currency: String(payment?.currency || "LKR").toUpperCase(),
    orderId: String(payment?.orderId || ""),
    gatewayStatus: String(payment?.gatewayStatus || ""),
    gatewayPaymentId: String(payment?.gatewayPaymentId || ""),
    txReference: String(payment?.txReference || ""),
    failureReason: String(payment?.failureReason || ""),
    paidAt: payment?.paidAt || null,
    failedAt: payment?.failedAt || null,
    lastNotifiedAt: payment?.lastNotifiedAt || null,
});

const PaymentCheckout = ({
    shipment,
    payment,
    checkout,
    pollingUrl,
    retryUrl,
    returnToCreateUrl,
    shipmentDetailUrl,
    dashboardUrl,
}) => {
    const { props } = usePage();
    const flash = props?.flash || {};

    const [livePayment, setLivePayment] = useState(() => buildLivePaymentState(payment));
    const [checkError, setCheckError] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState(null);

    useEffect(() => {
        setLivePayment(buildLivePaymentState(payment));
    }, [payment]);

    useEffect(() => {
        if (!Boolean(checkout?.isReady)) {
            return;
        }

        preloadPayHereOnsiteSdk().catch(() => {});
    }, [checkout?.isReady]);

    const liveStatus = livePayment.status;
    const isTerminal = TERMINAL_STATUSES.has(liveStatus);
    const canRetry = RETRYABLE_STATUSES.has(liveStatus) && Boolean(retryUrl) && !isRetrying;
    const canProceed = Boolean(checkout?.isReady) && liveStatus === "pending";

    const flashBanners = useMemo(() => {
        const banners = [];

        if (flash.success) {
            banners.push({ tone: "success", message: String(flash.success) });
        }
        if (flash.warning) {
            banners.push({ tone: "warning", message: String(flash.warning) });
        }
        if (flash.error) {
            banners.push({ tone: "error", message: String(flash.error) });
        }

        return banners;
    }, [flash.error, flash.success, flash.warning]);

    const statusPresentation = useMemo(() => {
        if (liveStatus === "paid") {
            return {
                tone: "border-green-200 bg-green-50 text-green-700",
                title: "Payment Completed",
                description: "Your card payment is confirmed. Shipment processing will continue.",
            };
        }

        if (["failed", "cancelled", "expired"].includes(liveStatus)) {
            return {
                tone: "border-red-200 bg-red-50 text-red-700",
                title: "Payment Attempt Failed",
                description: "The shipment already exists. Use retry to start a new payment attempt safely.",
            };
        }

        return {
            tone: "border-amber-200 bg-amber-50 text-amber-700",
            title: "Payment Pending",
            description: "Complete checkout in PayHere, then refresh status to confirm the result.",
        };
    }, [liveStatus]);

    const checkStatus = useCallback(async (silent = false) => {
        if (!pollingUrl || isChecking) {
            return;
        }

        if (!silent) {
            setCheckError("");
        }
        setIsChecking(true);

        try {
            const response = await fetch(pollingUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                credentials: "same-origin",
            });

            if (!response.ok) {
                throw new Error("Status check failed.");
            }

            const data = await response.json();
            setLivePayment((previous) => ({
                ...previous,
                status: String(data.paymentStatus || previous.status || "pending").toLowerCase(),
                orderId: String(data.orderId || previous.orderId || ""),
                gatewayStatus: String(data.gatewayStatus || previous.gatewayStatus || ""),
                gatewayPaymentId: String(data.gatewayPaymentId || previous.gatewayPaymentId || ""),
                txReference: String(data.txReference || previous.txReference || ""),
                failureReason: String(data.failureReason || ""),
                amount: data.amount !== null && data.amount !== undefined
                    ? Number(data.amount)
                    : previous.amount,
                currency: String(data.currency || previous.currency || "LKR").toUpperCase(),
                paidAt: data.paidAt || null,
                failedAt: data.failedAt || null,
                lastNotifiedAt: data.lastNotifiedAt || null,
            }));
            setLastCheckedAt(new Date().toISOString());
        } catch (error) {
            if (!silent) {
                setCheckError("Unable to refresh payment status right now. Please try again.");
            }
        } finally {
            setIsChecking(false);
        }
    }, [isChecking, pollingUrl]);

    useEffect(() => {
        if (!pollingUrl || isTerminal) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            checkStatus(true);
        }, 8000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [checkStatus, isTerminal, pollingUrl]);

    const retryPayment = () => {
        if (!canRetry) {
            return;
        }

        setCheckError("");
        setIsRetrying(true);

        router.post(retryUrl, {}, {
            preserveScroll: true,
            onError: () => {
                setCheckError("Unable to start a retry attempt right now. Please try again.");
            },
            onFinish: () => {
                setIsRetrying(false);
            },
        });
    };

    const proceedToCheckout = useCallback(async () => {
        if (!canProceed || isLaunchingCheckout) {
            return;
        }

        setCheckError("");
        setIsLaunchingCheckout(true);

        try {
            await launchPayHereOnsiteCheckout(checkout, {
                onCompleted: () => {
                    checkStatus(true);
                },
                onDismissed: () => {
                    setCheckError("Checkout was closed before completion. You can continue from this page.");
                },
                onError: () => {
                    setCheckError("PayHere reported an issue while starting onsite checkout.");
                },
            });
        } catch (error) {
            console.warn("[CourierPaymentCheckout] Onsite checkout unavailable. Falling back to redirect checkout.", error);
            try {
                launchPayHereRedirectCheckout(checkout);
            } catch (fallbackError) {
                setCheckError("Unable to start checkout right now. Please try again.");
            }
        } finally {
            setIsLaunchingCheckout(false);
        }
    }, [canProceed, checkStatus, checkout, isLaunchingCheckout]);

    const bannerToneClass = {
        success: "border-green-200 bg-green-50 text-green-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        error: "border-red-200 bg-red-50 text-red-700",
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]">
            <Head title="Courier Card Payment" />
            <Header />

            <main className="container mx-auto flex-1 px-4 py-10">
                <div className="mx-auto max-w-3xl rounded-2xl border border-[#E3EAF5] bg-white p-6 shadow-sm md:p-8">
                    {flashBanners.length > 0 && (
                        <div className="space-y-3">
                            {flashBanners.map((banner, index) => (
                                <div
                                    key={`flash-${index}`}
                                    className={`rounded-xl border px-4 py-3 text-sm ${bannerToneClass[banner.tone]}`}
                                >
                                    {banner.message}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0955AC]">Courier Payment</p>
                        <h1 className="text-2xl font-semibold">Complete Your Card Payment</h1>
                        <p className="text-sm text-[#5B6887]">
                            Shipment reference <span className="font-semibold">{shipment?.reference}</span> has been created. Continue with PayHere to complete payment.
                        </p>
                    </div>

                    <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${statusPresentation.tone}`}>
                        <p className="font-semibold">{statusPresentation.title}</p>
                        <p className="mt-1">{statusPresentation.description}</p>
                        <p className="mt-2">
                            <span className="font-semibold">Payment status:</span> {titleizeStatus(liveStatus)}
                        </p>
                        {livePayment.failureReason && (
                            <p className="mt-1">
                                <span className="font-semibold">Reason:</span> {livePayment.failureReason}
                            </p>
                        )}
                        {lastCheckedAt && (
                            <p className="mt-1 text-xs opacity-80">
                                Last checked: {formatDateTime(lastCheckedAt)}
                            </p>
                        )}
                    </div>

                    <div className="mt-6 grid gap-4 rounded-xl border border-[#E3EAF5] bg-[#F8FAFD] p-4 text-sm md:grid-cols-2">
                        <p>
                            <span className="font-semibold">Amount:</span> {Number(livePayment.amount || 0).toFixed(2)} {livePayment.currency || "LKR"}
                        </p>
                        <p>
                            <span className="font-semibold">Order ID:</span> {livePayment.orderId || "-"}
                        </p>
                        <p>
                            <span className="font-semibold">Provider:</span> {payment?.provider || "PayHere"}
                        </p>
                        <p>
                            <span className="font-semibold">Method:</span> {payment?.method || "card"}
                        </p>
                        <p>
                            <span className="font-semibold">Gateway status:</span> {livePayment.gatewayStatus || "-"}
                        </p>
                        <p>
                            <span className="font-semibold">Gateway payment ID:</span> {livePayment.gatewayPaymentId || "-"}
                        </p>
                        <p>
                            <span className="font-semibold">Gateway reference:</span> {livePayment.txReference || "-"}
                        </p>
                        <p>
                            <span className="font-semibold">Last gateway callback:</span> {formatDateTime(livePayment.lastNotifiedAt)}
                        </p>
                    </div>

                    {!checkout?.isReady && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {checkout?.reason || "Payment checkout is not ready. Please contact support."}
                        </div>
                    )}

                    {liveStatus === "paid" && (
                        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            <p className="font-semibold">Payment complete</p>
                            <p className="mt-1">Your shipment is already created and payment is confirmed.</p>
                            <p className="mt-1">Paid at: {formatDateTime(livePayment.paidAt)}</p>
                        </div>
                    )}

                    {RETRYABLE_STATUSES.has(liveStatus) && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <p className="font-semibold">Payment did not complete</p>
                            <p className="mt-1">
                                Retry will create a new payment attempt for this same shipment reference. No duplicate shipment will be created.
                            </p>
                            <p className="mt-1">Failure recorded at: {formatDateTime(livePayment.failedAt)}</p>
                        </div>
                    )}

                    {canProceed && (
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={proceedToCheckout}
                                disabled={isLaunchingCheckout}
                                className="inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4b93] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLaunchingCheckout ? "Opening checkout..." : "Proceed to PayHere"}
                            </button>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => checkStatus(false)}
                            disabled={isChecking}
                            className="inline-flex items-center justify-center rounded-lg border border-[#0955AC] px-4 py-2 text-sm font-semibold text-[#0955AC] transition hover:bg-[#EAF2FD] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isChecking ? "Checking..." : "Refresh payment status"}
                        </button>

                        {RETRYABLE_STATUSES.has(liveStatus) && retryUrl && (
                            <button
                                type="button"
                                onClick={retryPayment}
                                disabled={!canRetry}
                                className="inline-flex items-center justify-center rounded-lg border border-[#D9A404] px-4 py-2 text-sm font-semibold text-[#946200] transition hover:bg-[#FFF6D5]"
                            >
                                {isRetrying ? "Starting retry..." : "Retry payment"}
                            </button>
                        )}

                        {shipmentDetailUrl && (
                            <Link
                                href={shipmentDetailUrl}
                                className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#F1F5F9]"
                            >
                                View shipment details
                            </Link>
                        )}

                        <Link
                            href={dashboardUrl || "/courierBookingDashboard"}
                            className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#F1F5F9]"
                        >
                            Go to courier dashboard
                        </Link>

                        <Link
                            href={returnToCreateUrl || "/couriers/create"}
                            className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-semibold text-[#334155] transition hover:bg-[#F1F5F9]"
                        >
                            Back to courier form
                        </Link>
                    </div>

                    {checkError && <p className="mt-3 text-sm text-red-600">{checkError}</p>}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PaymentCheckout;
