import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";
import {
    launchPayHereOnsiteCheckout,
    launchPayHereRedirectCheckout,
    preloadPayHereOnsiteSdk,
} from "./payhereCheckout";

const PROGRESS_STEPS = [
    {
        id: 1,
        title: "Sender details",
        description: "Pickup information",
    },
    {
        id: 2,
        title: "Recipient details",
        description: "Delivery information",
    },
    {
        id: 3,
        title: "Shipment preferences",
        description: "Service options",
    },
    {
        id: 4,
        title: "Package details",
        description: "Courier selections",
    },
];

const POLICY_ADJUSTMENT_LABELS = {
    remote_area_surcharge: "Remote area surcharge",
    overweight_surcharge: "Overweight surcharge",
    oversize_surcharge: "Oversize surcharge",
    holiday_surcharge: "Holiday surcharge",
    peak_hour_surcharge: "Peak-hour surcharge",
    cod_fee: "COD fee",
    minimum_shipment_guardrail: "Minimum shipment guardrail",
    speed_eta_tier_multiplier: "Speed/ETA tier multiplier",
    international_dimensions_engine: "International dimensions engine",
    quote_runtime_discount_applied: "Quote runtime discount applied",
    quote_runtime_discount_ceiling_guardrail: "Quote runtime discount ceiling guardrail",
    quote_runtime_floor_price_guardrail: "Quote runtime floor-price guardrail",
};

const formatPolicyAdjustmentLabel = (key) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
        return "Policy adjustment";
    }

    return POLICY_ADJUSTMENT_LABELS[normalizedKey]
        || normalizedKey.replaceAll("_", " ");
};

const GOVERNANCE_POLICY_KEYS = [
    "quote_runtime_discount_applied",
    "quote_runtime_discount_ceiling_guardrail",
    "quote_runtime_floor_price_guardrail",
];

const Summary = ({
    inline = false,
    pagePropsOverride = null,
    formStateOverride = null,
    showEditLinks = null,
    showHero = null,
}) => {
    const { props: inertiaProps } = usePage();
    const resolvedProps = pagePropsOverride || inertiaProps;
    const {
        formData,
        pricingPreview = null,
        errors = {},
    } = resolvedProps;
    const resolvedFlowRoutes = resolvedProps.flowRoutes && typeof resolvedProps.flowRoutes === "object"
        ? resolvedProps.flowRoutes
        : {};
    const createHref = resolvedFlowRoutes.create || "/couriers/create";
    const detailsHref = resolvedFlowRoutes.details || "/couriers/details";
    const storeRoute = resolvedFlowRoutes.store || "/couriers";
    const allowEditLinks = showEditLinks ?? !inline;
    const showHeroSection = showHero ?? !inline;
    const hasErrors = Object.keys(errors).length > 0;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [activeCheckoutSession, setActiveCheckoutSession] = useState(null);

    const initialData = useMemo(() => {
        if (formStateOverride) {
            return JSON.parse(JSON.stringify(formStateOverride));
        }

        return formData ? JSON.parse(JSON.stringify(formData)) : null;
    }, [formData, formStateOverride]);
    const [formState, setFormState] = useState(initialData);

    useEffect(() => {
        setFormState(initialData);
    }, [initialData]);

    useEffect(() => {
        setActiveCheckoutSession(null);
    }, [initialData]);

    const scrollToTop = useCallback(() => {
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "auto" });
        }
    }, []);

    const [displayCurrency, setDisplayCurrency] = useState(() => initialData?.reviewContext?.displayCurrency || "LKR");

    useEffect(() => {
        if (initialData) {
            setDisplayCurrency(initialData.reviewContext?.displayCurrency || "LKR");
        }
    }, [initialData]);

    useEffect(() => {
        if (!Boolean(formState?.shipment?.requiresCardPayment || formState?.shipment?.paymentOptions?.card)) {
            return;
        }

        preloadPayHereOnsiteSdk().catch(() => {});
    }, [formState?.shipment?.paymentOptions?.card, formState?.shipment?.requiresCardPayment]);

    if (!formState) {
        if (inline) {
            return (
                <div className="rounded-2xl border border-[#E3EAF5] bg-white p-6 text-center shadow-sm">
                    <h2 className="text-base font-semibold text-[#0B1739]">No summary available</h2>
                    <p className="mt-2 text-xs text-[#5B6887]">
                        Start by creating a courier request and selecting your services.
                    </p>
                    {allowEditLinks && (
                        <Link
                            href={createHref}
                            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a4b93]"
                        >
                            Go to courier form
                        </Link>
                    )}
                </div>
            );
        }

        return (
            <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]">
                <Head title="Courier Summary" />
                <Header />
                <main className="flex flex-1 items-center justify-center px-4">
                    <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-lg">
                        <h1 className="text-xl font-semibold mb-3">No summary available</h1>
                        <p className="text-sm text-[#5B6887]">
                            Start by creating a courier request and selecting your services.
                        </p>
                        <Link
                            href={createHref}
                            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4b93]"
                        >
                            Go to courier form
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const senderAddress = formState.sender?.address ?? {};
    const recipientAddress = formState.recipient?.address ?? {};
    const selectedQuotes = formState.reviewContext?.selectedQuotes || [];
    const totalPriceUSD = formState.reviewContext?.totalPriceUSD || 0;
    const USD_TO_LKR_RATE = 325;

    const currencyFormatter = useMemo(() => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: displayCurrency,
                minimumFractionDigits: 2,
            });
        } catch (error) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 2,
            });
        }
    }, [displayCurrency]);

    const lkrFormatter = useMemo(() => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
        });
    }, []);

    const formatCurrency = (value = 0) => {
        const numericValue = Number(value) || 0;
        const convertedValue = displayCurrency === "LKR" ? numericValue * USD_TO_LKR_RATE : numericValue;
        return currencyFormatter.format(convertedValue);
    };

    const formatDeclaredValue = (value = 0) => {
        const numericValue = Number(value) || 0;
        return lkrFormatter.format(numericValue);
    };

    const selectedQuotesMap = useMemo(() => {
        return selectedQuotes.reduce((acc, quote) => {
            acc[quote.packageIndex] = quote;
            return acc;
        }, {});
    }, [selectedQuotes]);

    const formatAddress = (address) => {
        if (!address) {
            return "—";
        }

        const streetParts = [address.line1, address.line2].filter(Boolean).join(", ");
        const localityParts = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
        const countryPart = address.country;

        return [streetParts, localityParts, countryPart].filter(Boolean).join(" • ");
    };

    const insuranceLabel = formState.shipment?.insurance ? "Yes" : "No";
    const codEnabled = Boolean(formState.shipment?.codEnabled);
    const codAmount = formState.shipment?.codAmount !== undefined && formState.shipment?.codAmount !== null && formState.shipment?.codAmount !== ""
        ? Number(formState.shipment.codAmount)
        : null;
    const codPaymentMethodLabel = formState.shipment?.codPaymentMethod
        ? String(formState.shipment.codPaymentMethod).replaceAll("_", " ")
        : "—";
    const totalEstimateDisplay = formatCurrency(totalPriceUSD);
    const governanceAdjustments = useMemo(() => {
        if (!Array.isArray(pricingPreview?.policyAdjustments)) {
            return [];
        }

        return pricingPreview.policyAdjustments.filter((item) => {
            const key = String(item?.key || "");
            return GOVERNANCE_POLICY_KEYS.includes(key);
        });
    }, [pricingPreview]);
    const governanceNetImpact = governanceAdjustments.reduce(
        (carry, item) => carry + Number(item?.amount || 0),
        0,
    );
    const pricingPreviewFinalTotal = Number(pricingPreview?.totalEstimatedUsd || 0);
    const pricingPreviewBeforeGovernance = pricingPreviewFinalTotal - governanceNetImpact;
    const pricingPreviewCodDetails = pricingPreview?.codDetails || null;
    const pricingPreviewCodFeeBase = pricingPreviewCodDetails?.feeBaseAmount !== null
        && pricingPreviewCodDetails?.feeBaseAmount !== undefined
        ? Number(pricingPreviewCodDetails.feeBaseAmount)
        : null;
    const pricingPreviewCodFeeBaseSource = pricingPreviewCodDetails?.feeBaseSource === 'requested_cod_amount'
        ? 'Requested COD amount'
        : pricingPreviewCodDetails?.feeBaseSource === 'declared_value'
            ? 'Declared value'
            : null;

    const resolveShipmentServiceLevel = (payload) => {
        const candidates = [];
        (payload?.reviewContext?.selectedQuotes || []).forEach((quote) => {
            candidates.push(quote?.serviceLevel);
            candidates.push(quote?.serviceLabel);
        });
        (payload?.packages || []).forEach((pkg) => {
            candidates.push(pkg?.serviceLevel);
        });
        candidates.push(payload?.shipment?.serviceLevel);

        for (const candidate of candidates) {
            if (typeof candidate === "string" && candidate.trim() !== "") {
                return candidate.trim();
            }
        }

        return "standard";
    };

    const resolveShipmentCurrency = (payload) => {
        const candidate = payload?.shipment?.currency
            || payload?.reviewContext?.displayCurrency
            || displayCurrency
            || "LKR";
        return String(candidate || "LKR").toUpperCase();
    };

    const getCsrfToken = () => {
        if (typeof document === "undefined") {
            return "";
        }

        return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    };

    const launchPayHereCheckout = async (checkout, callbacks = {}) => {
        if (!checkout?.checkoutUrl || !checkout?.fields) {
            throw new Error("Checkout session is unavailable.");
        }

        try {
            await launchPayHereOnsiteCheckout(checkout, callbacks);
        } catch (error) {
            console.warn("[CourierSummary] Onsite checkout unavailable. Falling back to redirect checkout.", error);
            launchPayHereRedirectCheckout(checkout);
        }
    };

    const handleConfirm = async () => {
        if (!formState || isSubmitting) {
            console.debug('[CourierSummary] handleConfirm blocked — formState:', !!formState, '| isSubmitting:', isSubmitting);
            return;
        }

        setSubmitError("");
        const payload = JSON.parse(JSON.stringify(formState));
        payload.shipment = payload.shipment || {};
        payload.reviewContext = payload.reviewContext || {};
        payload.shipment.currency = resolveShipmentCurrency(payload);
        payload.shipment.serviceLevel = resolveShipmentServiceLevel(payload);
        payload.shipment.codEnabled = Boolean(payload.shipment.codEnabled);
        if (!payload.shipment.codEnabled) {
            payload.shipment.codAmount = null;
            payload.shipment.codPaymentMethod = null;
        }
        payload.reviewContext.displayCurrency = payload.reviewContext.displayCurrency || payload.shipment.currency;
        const requiresCardPayment = Boolean(
            payload.shipment?.requiresCardPayment
            || payload.shipment?.paymentOptions?.card
        );

        console.group('[CourierSummary] handleConfirm — Confirm & Submit clicked');
        console.log('► storeRoute:', storeRoute);
        console.log('► inline:', inline);
        console.log('► preserveState:', !inline);
        console.log('► requiresCardPayment:', payload.shipment?.requiresCardPayment);
        console.log('► paymentOptions (expanded):', JSON.stringify(payload.shipment?.paymentOptions));
        console.log('► shipment (full):', JSON.stringify(payload.shipment));
        console.log('► payload (full):', JSON.parse(JSON.stringify(payload)));
        console.groupEnd();

        if (requiresCardPayment) {
            setIsSubmitting(true);

            try {
                let checkoutSession = activeCheckoutSession;

                if (!checkoutSession?.checkout?.isReady) {
                    const response = await fetch(storeRoute, {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRF-TOKEN": getCsrfToken(),
                        },
                        body: JSON.stringify(payload),
                    });

                    if (response.status === 422) {
                        const validationPayload = await response.json();
                        const firstError = Object.values(validationPayload?.errors || {})
                            .flat()
                            .find((message) => typeof message === "string");

                        setSubmitError(firstError || "Unable to proceed to checkout. Please review your booking details.");
                        scrollToTop();
                        return;
                    }

                    if (!response.ok) {
                        throw new Error("Unable to initialize checkout right now.");
                    }

                    const result = await response.json();
                    if (!result?.checkout?.isReady) {
                        setSubmitError(result?.checkout?.reason || "Checkout is not ready. Please try again.");
                        scrollToTop();
                        return;
                    }

                    checkoutSession = result;
                    setActiveCheckoutSession(result);
                }

                if (!checkoutSession?.checkout?.isReady) {
                    setSubmitError("Checkout is not ready. Please try again.");
                    scrollToTop();
                    return;
                }

                await launchPayHereCheckout(checkoutSession.checkout, {
                    onCompleted: () => {
                        const nextUrl = checkoutSession?.fallbackCheckoutUrl || checkoutSession?.shipment?.detailUrl;
                        if (nextUrl) {
                            router.visit(nextUrl, {
                                method: "get",
                                preserveScroll: true,
                            });
                        }
                    },
                    onDismissed: () => {
                        setSubmitError("Checkout was closed before completion. Your shipment is saved, and you can resume payment anytime.");
                        scrollToTop();
                    },
                    onError: () => {
                        setSubmitError("PayHere reported an issue while starting onsite checkout.");
                        scrollToTop();
                    },
                });
                return;
            } catch (error) {
                console.error("[CourierSummary] Checkout initialization failed", error);
                setSubmitError("Unable to initialize PayHere checkout right now. Please try again.");
                scrollToTop();
                return;
            } finally {
                setIsSubmitting(false);
            }
        }

        router.post(storeRoute, payload, {
            preserveScroll: false,
            preserveState: !inline,
            onStart: () => {
                console.log('[CourierSummary] onStart — POST to', storeRoute, '| current URL:', window.location.href);
                setIsSubmitting(true);
            },
            onSuccess: (page) => {
                console.log('[CourierSummary] onSuccess — redirected to:', window.location.href, '| page component:', page?.component);
                scrollToTop();
            },
            onError: (errors) => {
                console.warn('[CourierSummary] onError — validation/server errors:', JSON.stringify(errors, null, 2), '| current URL:', window.location.href);
                scrollToTop();
            },
            onFinish: () => {
                console.log('[CourierSummary] onFinish — done. URL:', window.location.href);
                setIsSubmitting(false);
            },
        });
    };

    const mainClassName = inline ? "" : "container mx-auto px-4 -mt-16 mb-16 flex-1";
    const cardClassName = inline
        ? "rounded-2xl border border-[#E3EAF5] bg-white px-6 py-8 shadow-sm poppins"
        : "bg-white shadow-xl rounded-2xl px-6 md:px-10 py-10 poppins";

    return (
        <div className={inline ? "text-[#0B1739]" : "min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]"}>
            {!inline && <Head title="Courier Summary" />}
            {!inline && <Header />}

            {!inline && showHeroSection && (
                <section className="bg-[#0B1739] text-white">
                    <div className="container mx-auto px-4 py-12">
                        <p className="uppercase tracking-wide text-xs text-[#6FB3FF]">Courier Service</p>
                        <h1 className="text-3xl md:text-4xl font-semibold mt-3">Review your shipment</h1>
                        <p className="mt-4 max-w-2xl text-sm md:text-base text-white/80">
                            Confirm sender and recipient information, shipment preferences, and selected courier services before final submission.
                        </p>
                        {allowEditLinks && (
                            <div className="mt-6">
                                <Link
                                    href={detailsHref}
                                    className="inline-flex items-center gap-2 text-xs md:text-sm text-white/70 underline-offset-4 hover:text-white hover:underline transition"
                                >
                                    ← Edit shipment details
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <main className={mainClassName}>
                <div className={cardClassName}>
                    {hasErrors && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <p className="font-semibold">We couldn't submit the courier request.</p>
                            <p className="mt-1">Please review the details and update any missing or invalid information.</p>
                            <div className="mt-3 space-y-1">
                                {Object.values(errors)
                                    .slice(0, 4)
                                    .map((message, index) => (
                                        <p key={`error-${index}`} className="flex items-start gap-2 text-xs text-red-600">
                                            <span className="mt-[2px]">•</span>
                                            <span>{message}</span>
                                        </p>
                                    ))}
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <p className="font-semibold">Unable to start payment checkout.</p>
                            <p className="mt-1">{submitError}</p>
                        </div>
                    )}

                    <div className="mb-10">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#0B1739]">Shipment progress</h2>
                                <p className="mt-2 text-sm text-[#5B6887]">
                                    All steps are complete. Review the details below before you finalize the request.
                                </p>
                            </div>
                            {allowEditLinks && (
                                <Link
                                    href={detailsHref}
                                    className="inline-flex items-center gap-2 rounded-lg border border-[#0955AC] px-4 py-2 text-sm font-semibold text-[#0955AC] transition hover:bg-[#0955AC] hover:text-white"
                                >
                                    ← Modify details
                                </Link>
                            )}
                        </div>

                        <div className="mt-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-4">
                                {PROGRESS_STEPS.map((step, index) => (
                                    <React.Fragment key={step.id}>
                                        <div className="flex flex-1 items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0955AC] text-white shadow">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6887]">
                                                    Step {step.id}
                                                </p>
                                                <h3 className="text-sm font-semibold text-[#0B1739]">{step.title}</h3>
                                                <p className="text-xs text-[#6B7893]">{step.description}</p>
                                            </div>
                                        </div>
                                        {index < PROGRESS_STEPS.length - 1 && (
                                            <div className="hidden flex-1 md:block">
                                                <div className="h-1 w-full rounded bg-[#0955AC]/30" />
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>

                    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-6">
                            <h3 className="text-lg font-semibold text-[#0B1739]">Sender details</h3>
                            <div className="mt-4 space-y-2 text-sm text-[#5B6887]">
                                <p><span className="font-medium text-[#0B1739]">Name:</span> {formState.sender?.name || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Email:</span> {formState.sender?.email || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Phone:</span> {formState.sender?.phone || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Company:</span> {formState.sender?.company || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Address:</span> {formatAddress(senderAddress)}</p>
                                {senderAddress.instructions && (
                                    <p><span className="font-medium text-[#0B1739]">Instructions:</span> {senderAddress.instructions}</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-6">
                            <h3 className="text-lg font-semibold text-[#0B1739]">Recipient details</h3>
                            <div className="mt-4 space-y-2 text-sm text-[#5B6887]">
                                <p><span className="font-medium text-[#0B1739]">Name:</span> {formState.recipient?.name || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Email:</span> {formState.recipient?.email || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Phone:</span> {formState.recipient?.phone || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Company:</span> {formState.recipient?.company || "—"}</p>
                                <p><span className="font-medium text-[#0B1739]">Address:</span> {formatAddress(recipientAddress)}</p>
                                {recipientAddress.instructions && (
                                    <p><span className="font-medium text-[#0B1739]">Instructions:</span> {recipientAddress.instructions}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {pricingPreview && (
                        <section className="mt-8 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-6">
                            <h3 className="text-lg font-semibold text-[#1E3A8A]">Pricing enforcement preview</h3>
                            <p className="mt-2 text-sm text-[#1E40AF]">
                                This is the estimated pricing rule match that will be used at final submission.
                            </p>
                            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#1E3A8A] md:grid-cols-2">
                                <p><span className="font-semibold">Mode:</span> {pricingPreview.mode === "lane_matrix" ? "Lane Matrix" : "Selected Quotes"}</p>
                                <p><span className="font-semibold">Category:</span> {pricingPreview.assignment?.category || "—"}</p>
                                <p><span className="font-semibold">Assignment:</span> {pricingPreview.assignment?.status || "—"}</p>
                                <p><span className="font-semibold">Distance:</span> {pricingPreview.distanceKm !== null && pricingPreview.distanceKm !== undefined && pricingPreview.distanceKm !== "" ? `${pricingPreview.distanceKm} km` : "—"}</p>
                                <p><span className="font-semibold">Estimated USD:</span> {Number(pricingPreview.totalEstimatedUsd || 0).toFixed(2)}</p>
                                {pricingPreview.assignment?.vendorUserId && (
                                    <p><span className="font-semibold">Assigned Vendor ID:</span> {pricingPreview.assignment.vendorUserId}</p>
                                )}
                            </div>
                            {pricingPreviewCodDetails && (
                                <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-white p-4 text-sm text-[#1E3A8A]">
                                    <p className="font-semibold">COD Pricing Base</p>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                        <p><span className="font-semibold">COD Enabled:</span> {pricingPreviewCodDetails.codEnabled ? 'Yes' : 'No'}</p>
                                        <p><span className="font-semibold">Fee Base Source:</span> {pricingPreviewCodFeeBaseSource || '—'}</p>
                                        <p><span className="font-semibold">Fee Base Amount:</span> {pricingPreviewCodFeeBase !== null && Number.isFinite(pricingPreviewCodFeeBase) ? pricingPreviewCodFeeBase.toFixed(2) : '—'} USD</p>
                                        <p><span className="font-semibold">Requested COD Amount:</span> {pricingPreviewCodDetails.requestedCodAmount !== null && pricingPreviewCodDetails.requestedCodAmount !== undefined ? Number(pricingPreviewCodDetails.requestedCodAmount).toFixed(2) : '—'} USD</p>
                                    </div>
                                </div>
                            )}
                            {pricingPreview.reason && (
                                <p className="mt-3 text-sm text-[#1E40AF]"><span className="font-semibold">Reason:</span> {pricingPreview.reason}</p>
                            )}
                            {pricingPreview.speedEtaTier && (
                                <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-white p-4 text-sm text-[#1E3A8A]">
                                    <p className="font-semibold">Speed/ETA Tier Projection</p>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                        <p><span className="font-semibold">Tier:</span> {pricingPreview.speedEtaTier.etaLabel || pricingPreview.speedEtaTier.tierLabel || pricingPreview.speedEtaTier.tierKey || "—"}</p>
                                        <p><span className="font-semibold">ETA Range:</span> {Number(pricingPreview.speedEtaTier.etaMinDays || 0)} - {pricingPreview.speedEtaTier.etaMaxDays === null || pricingPreview.speedEtaTier.etaMaxDays === undefined ? "*" : Number(pricingPreview.speedEtaTier.etaMaxDays)} days</p>
                                        <p><span className="font-semibold">Projected Delivery Window:</span> {pricingPreview.speedEtaTier.etaStartDate || "—"} {pricingPreview.speedEtaTier.etaEndDate ? `to ${pricingPreview.speedEtaTier.etaEndDate}` : ""}</p>
                                        <p><span className="font-semibold">Tier Multiplier:</span> x{Number(pricingPreview.speedEtaTier.priceMultiplier || 1).toFixed(2)} {pricingPreview.speedEtaTier.enforceTierPricingMultiplier ? "(enforced)" : "(display only)"}</p>
                                    </div>
                                </div>
                            )}
                            {pricingPreview.internationalDimensions && (
                                <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-white p-4 text-sm text-[#1E3A8A]">
                                    <p className="font-semibold">International Dimensions Projection</p>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                        <p><span className="font-semibold">Unit Type:</span> {pricingPreview.internationalDimensions.unitType || "—"}</p>
                                        <p><span className="font-semibold">Route Class:</span> {pricingPreview.internationalDimensions.routeClass || "—"}</p>
                                        <p><span className="font-semibold">Handling Class:</span> {pricingPreview.internationalDimensions.handlingClass || "—"}</p>
                                        <p><span className="font-semibold">W2W Mode:</span> {pricingPreview.internationalDimensions.w2wMode || "—"}</p>
                                        <p><span className="font-semibold">Unit Count:</span> {pricingPreview.internationalDimensions.unitCount || "—"}</p>
                                        <p><span className="font-semibold">Combined Multiplier:</span> x{Number(pricingPreview.internationalDimensions.totalMultiplier || 1).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}
                            {Array.isArray(pricingPreview.policyAdjustments) && pricingPreview.policyAdjustments.length > 0 && (
                                <div className="mt-3 rounded-lg border border-[#BFDBFE] bg-white p-4 text-sm text-[#1E3A8A]">
                                    <p className="font-semibold">Applied Policy Adjustments</p>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                        {pricingPreview.policyAdjustments.map((item, idx) => (
                                            <p key={`pricing-adjustment-${idx}`}>
                                                {formatPolicyAdjustmentLabel(item?.key)}: {Number(item?.amount || 0) >= 0 ? "+" : "-"}{Math.abs(Number(item?.amount || 0)).toFixed(2)}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {governanceAdjustments.length > 0 && (
                                <div className="mt-3 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-4 text-sm text-[#78350F]">
                                    <p className="font-semibold">Governance Impact</p>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-3">
                                        <p><span className="font-semibold">Before Governance:</span> {pricingPreviewBeforeGovernance.toFixed(2)} USD</p>
                                        <p><span className="font-semibold">Governance Delta:</span> {governanceNetImpact >= 0 ? "+" : "-"}{Math.abs(governanceNetImpact).toFixed(2)} USD</p>
                                        <p><span className="font-semibold">Final After Governance:</span> {pricingPreviewFinalTotal.toFixed(2)} USD</p>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                        {governanceAdjustments.map((item, idx) => (
                                            <p key={`governance-adjustment-${idx}`}>
                                                {formatPolicyAdjustmentLabel(item?.key)}: {Number(item?.amount || 0) >= 0 ? "+" : "-"}{Math.abs(Number(item?.amount || 0)).toFixed(2)}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pricingPreview.matchedRule && (
                                <div className="mt-4 rounded-lg border border-[#BFDBFE] bg-white p-4 text-sm text-[#1E3A8A]">
                                    <p><span className="font-semibold">Lane:</span> {pricingPreview.matchedRule.originZone} → {pricingPreview.matchedRule.destinationZone}</p>
                                    <p className="mt-1"><span className="font-semibold">Service:</span> {pricingPreview.matchedRule.serviceLevelKey || "any"}</p>
                                    <p className="mt-1"><span className="font-semibold">Distance Band:</span> {Number(pricingPreview.matchedRule.distanceFromKm || 0).toFixed(1)} - {pricingPreview.matchedRule.distanceToKm === null || pricingPreview.matchedRule.distanceToKm === undefined ? "*" : Number(pricingPreview.matchedRule.distanceToKm).toFixed(1)} km</p>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="mt-8 rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-6">
                        <h3 className="text-lg font-semibold text-[#0B1739]">Shipment preferences</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-[#5B6887]">
                            <p><span className="font-medium text-[#0B1739]">Pickup date:</span> {formState.shipment?.pickupDate || "—"}</p>
                            <p><span className="font-medium text-[#0B1739]">Pickup window:</span> {formState.shipment?.pickupWindowStart && formState.shipment?.pickupWindowEnd ? `${formState.shipment.pickupWindowStart} - ${formState.shipment.pickupWindowEnd}` : "—"}</p>
                            <p><span className="font-medium text-[#0B1739]">Insurance required:</span> {insuranceLabel}</p>
                            <p><span className="font-medium text-[#0B1739]">Declared value:</span> {formState.shipment?.estimatedValue ? formatDeclaredValue(Number(formState.shipment.estimatedValue)) : "—"}</p>
                            <p><span className="font-medium text-[#0B1739]">Cash on delivery:</span> {codEnabled ? "Enabled" : "Disabled"}</p>
                            <p><span className="font-medium text-[#0B1739]">COD amount:</span> {codEnabled && codAmount !== null ? formatDeclaredValue(codAmount) : "—"}</p>
                            <p><span className="font-medium text-[#0B1739]">COD payment method:</span> {codEnabled ? codPaymentMethodLabel : "—"}</p>
                        </div>
                    </section>

                    <section className="mt-8 rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <h3 className="text-lg font-semibold text-[#0B1739]">Package details</h3>
                            {selectedQuotes.length > 0 && (
                                <div className="rounded-full bg-[#0955AC]/10 px-4 py-1 text-sm font-medium text-[#0955AC]">
                                    Estimated total: {totalEstimateDisplay}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-5">
                            {(formState.packages || []).map((pkg, index) => {
                                const selection = selectedQuotesMap[index];
                                const volumetricInfo = selection?.billableWeight && selection.billableWeight !== selection.weight
                                    ? `${selection.billableWeight.toFixed(2)} kg billable`
                                    : null;

                                return (
                                    <div key={`summary-package-${index}`} className="rounded-2xl border border-[#E3EAF5] bg-white p-5 shadow-sm">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm uppercase tracking-wide text-[#5B6887]">Package {index + 1}</p>
                                                <h4 className="text-lg font-semibold text-[#0B1739]">{pkg.label || `Package ${index + 1}`}</h4>
                                            </div>
                                            {selection && (
                                                <span className="inline-flex items-center rounded-full bg-[#0955AC]/10 px-3 py-1 text-xs font-semibold text-[#0955AC]">
                                                    {selection.providerName} · {selection.serviceLabel}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#5B6887] md:grid-cols-2">
                                            <p><span className="font-medium text-[#0B1739]">Quantity:</span> {pkg.quantity || "—"}</p>
                                            <p><span className="font-medium text-[#0B1739]">Weight:</span> {pkg.weightKg ? `${pkg.weightKg} kg` : "—"}</p>
                                            <p>
                                                <span className="font-medium text-[#0B1739]">Dimensions:</span> {pkg.lengthCm && pkg.widthCm && pkg.heightCm
                                                    ? `${pkg.lengthCm} × ${pkg.widthCm} × ${pkg.heightCm} cm`
                                                    : "—"}
                                            </p>
                                            <p><span className="font-medium text-[#0B1739]">Declared value:</span> {pkg.declaredValue ? formatDeclaredValue(Number(pkg.declaredValue)) : "—"}</p>
                                            <p><span className="font-medium text-[#0B1739]">Type:</span> {pkg.packageType || "—"}</p>
                                            {volumetricInfo && (
                                                <p><span className="font-medium text-[#0B1739]">Billable weight:</span> {volumetricInfo}</p>
                                            )}
                                        </div>

                                        {pkg.description && (
                                            <div className="mt-4 rounded-lg bg-[#F9FBFF] p-4 text-sm text-[#5B6887]">
                                                <p className="font-medium text-[#0B1739]">Description</p>
                                                <p className="mt-2 leading-relaxed">{pkg.description}</p>
                                            </div>
                                        )}

                                        {selection ? (
                                            <div className="mt-4 rounded-lg bg-[#0955AC]/5 p-4 text-sm text-[#0B1739]">
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="font-semibold text-[#0B1739]">Selected courier service</p>
                                                        <p className="text-xs text-[#5B6887]">{selection.description || selection.eta}</p>
                                                    </div>
                                                    <div className="text-right text-base font-semibold text-[#0955AC]">
                                                        {formatCurrency(selection.priceUSD)}
                                                        <p className="text-xs font-normal text-[#5B6887]">{selection.eta}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-lg border border-dashed border-[#E3EAF5] p-4 text-sm text-[#5B6887]">
                                                No courier service selected yet for this package.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <p className="mt-10 text-center text-xs text-[#5B6887]">
                        Once you confirm the shipment, our team will finalize the booking with the selected courier partners and share the pickup confirmation.
                    </p>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className={`w-full max-w-sm rounded-lg bg-[#0955AC] px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#0a4b93]'
                                }`}
                        >
                            {isSubmitting
                                ? (Boolean(formState?.shipment?.requiresCardPayment || formState?.shipment?.paymentOptions?.card)
                                    ? 'Preparing checkout...'
                                    : 'Submitting courier request...')
                                : (Boolean(formState?.shipment?.requiresCardPayment || formState?.shipment?.paymentOptions?.card)
                                    ? 'Proceed to Checkout'
                                    : 'Confirm & Submit')}
                        </button>
                        <p className="text-xs text-[#5B6887]">
                            Need changes? Use the Modify details link above to adjust the form before submitting.
                        </p>
                    </div>
                </div>
            </main>

            {!inline && <Footer />}
        </div>
    );
};

export default Summary;

