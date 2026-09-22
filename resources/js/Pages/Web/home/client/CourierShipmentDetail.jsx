import React from 'react';
import { usePage, router } from '@inertiajs/react';
import {
    launchPayHereOnsiteCheckout,
    launchPayHereRedirectCheckout,
    preloadPayHereOnsiteSdk,
} from '../../courier/payhereCheckout';
import {
    Package,
    MapPin,
    Calendar,
    User,
    Mail,
    Phone,
    Building,
    FileText,
    Truck,
    Weight,
    CreditCard,
    ShieldCheck,
    Clock,
    ChevronLeft,
    Download,
    CheckCircle,
    AlertCircle,
    Navigation,
} from 'lucide-react';
import Header from "./ClientHeader";

const statusMap = {
    pending: {
        label: "Pending",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
    },
    confirmed: {
        label: "Confirmed",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
    },
    in_transit: {
        label: "In Transit",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Truck,
    },
    delivered: {
        label: "Delivered",
        color: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle,
    },
    cancelled: {
        label: "Cancelled",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertCircle,
    },
};

const toTitleLabel = (value, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    return String(value)
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
};

const formatAmountWithCurrency = (amount, currencyCode = 'USD') => {
    const numericAmount = Number(amount);
    const currency = String(currencyCode || 'USD').toUpperCase();

    if (!Number.isFinite(numericAmount)) {
        return `0.00 ${currency}`;
    }

    try {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(numericAmount);
    } catch (error) {
        return `${numericAmount.toFixed(2)} ${currency}`;
    }
};

const CourierShipmentDetail = () => {
    const { shipment } = usePage().props;
    const statusInfo = statusMap[shipment.status] || statusMap.pending;
    const StatusIcon = statusInfo.icon;
    const codEnabled = Boolean(shipment.codEnabled);
    const codAmount = shipment.codAmount !== null && shipment.codAmount !== undefined && Number.isFinite(Number(shipment.codAmount))
        ? Number(shipment.codAmount)
        : null;
    const codPaymentMethod = shipment.codPaymentMethod
        ? String(shipment.codPaymentMethod).replaceAll('_', ' ')
        : null;
    const codPolicySnapshot = shipment.codPolicySnapshot || null;
    const paymentStatusRaw = shipment.payment_status || shipment.paymentStatus || null;
    const paymentMethodRaw = shipment.payment_method || shipment.paymentMethod || null;
    const paymentReference = shipment.payment_reference
        || shipment.paymentReference
        || shipment.payment_tx_reference
        || shipment.paymentTxReference
        || shipment.payment_gateway_payment_id
        || shipment.paymentGatewayPaymentId
        || shipment.payment_gateway_order_id
        || shipment.paymentGatewayOrderId
        || null;
    const paymentProvider = shipment.payment_provider || shipment.paymentProvider || null;
    const paymentCheckoutUrl = shipment.payment_checkout_url || shipment.paymentCheckoutUrl || null;
    const requiresCardPayment = Boolean(shipment.requires_card_payment || shipment.requiresCardPayment);
    const vendorApprovalStatus = shipment.vendorApprovalStatus || null;
    const vendorApprovalNotes = shipment.vendorApprovalNotes || null;
    const canTakePayment = requiresCardPayment && paymentStatusRaw !== 'paid' && Boolean(paymentCheckoutUrl);
    const paymentStatusLabel = toTitleLabel(paymentStatusRaw, 'Pending');
    const paymentMethodLabel = toTitleLabel(paymentMethodRaw, 'Not Available');
    const paymentPaidAt = formatDateTime(shipment.payment_paid_at || shipment.paymentPaidAt);
    const paymentInitiatedAt = formatDateTime(shipment.payment_initiated_at || shipment.paymentInitiatedAt);
    const paymentFailedAt = formatDateTime(shipment.payment_failed_at || shipment.paymentFailedAt);
    const [paymentCheckoutSession, setPaymentCheckoutSession] = React.useState(null);
    const [isLaunchingPayment, setIsLaunchingPayment] = React.useState(false);
    const [paymentActionError, setPaymentActionError] = React.useState('');

    const handleDownloadBill = () => {
        window.open(`/couriers/${shipment.id}/bill`, '_blank');
    };

    const handleBack = () => {
        router.visit('/courierBookingDashboard');
    };

    const handleContinuePayment = async () => {
        if (!canTakePayment || !paymentCheckoutUrl || isLaunchingPayment) {
            return;
        }

        setPaymentActionError('');
        setIsLaunchingPayment(true);

        try {
            preloadPayHereOnsiteSdk().catch(() => {});

            let checkoutSession = paymentCheckoutSession;
            if (!checkoutSession?.checkout?.isReady) {
                const response = await fetch(paymentCheckoutUrl, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error('Unable to load checkout session.');
                }

                const result = await response.json();
                if (!result?.checkout?.isReady) {
                    setPaymentActionError(result?.checkout?.reason || 'Checkout is not ready right now. Please try again.');
                    return;
                }

                checkoutSession = result;
                setPaymentCheckoutSession(result);
            }

            await launchPayHereOnsiteCheckout(checkoutSession.checkout, {
                onCompleted: () => {
                    router.reload({
                        only: ['shipment'],
                        preserveScroll: true,
                    });
                },
                onDismissed: () => {
                    setPaymentActionError('Checkout was closed before completion. You can continue payment anytime.');
                },
                onError: () => {
                    setPaymentActionError('PayHere reported an issue while starting onsite checkout.');
                },
            });
        } catch (error) {
            console.warn('[CourierShipmentDetail] Onsite checkout unavailable. Falling back to checkout page.', error);
            try {
                if (paymentCheckoutSession?.checkout?.isReady) {
                    launchPayHereRedirectCheckout(paymentCheckoutSession.checkout);
                    return;
                }

                router.visit(paymentCheckoutUrl, {
                    method: 'get',
                    preserveScroll: true,
                });
            } catch (fallbackError) {
                setPaymentActionError('Unable to start checkout right now. Please try again.');
            }
        } finally {
            setIsLaunchingPayment(false);
        }
    };

    return (
        <div>
            <Header />
            <div className="min-h-screen w-full bg-[#E5E5E5] md:p-20 poppins">
                <div className="mx-auto max-w-[1200px]">
                    {/* Header */}
                    <div className="mb-6 flex flex-col gap-4 md:mb-10">
                        <button
                            onClick={handleBack}
                            className="inline-flex items-center text-[#0955AC] hover:underline text-[14px] w-fit"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Dashboard
                        </button>

                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-2xl font-bold tracking-tight md:text-[35px]">
                                    <span className="text-[#0955AC]">Shipment Details</span>
                                </h1>
                                <p className="text-slate-600 text-[14px]">
                                    Reference: {shipment.code}
                                </p>
                            </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold ${statusInfo.color}`}>
                                        <StatusIcon className="h-5 w-5" />
                                        {statusInfo.label}
                                    </div>
                                    {vendorApprovalStatus === 'rejected' && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold bg-rose-50 text-rose-700 border-rose-200">
                                            <AlertCircle className="h-4 w-4" />
                                            Rejected by Courier Vendor
                                        </div>
                                    )}
                                    {vendorApprovalStatus === 'pending' && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold bg-amber-50 text-amber-700 border-amber-200">
                                            <Clock className="h-4 w-4" />
                                            Awaiting Vendor Review
                                        </div>
                                    )}
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold ${
                                        paymentStatusRaw === 'paid'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : paymentStatusRaw === 'failed' || paymentStatusRaw === 'cancelled'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        <CreditCard className="h-4 w-4" />
                                        Payment: {paymentStatusLabel}
                                    </div>
                                    {canTakePayment && (
                                        <button
                                            type="button"
                                            onClick={handleContinuePayment}
                                            disabled={isLaunchingPayment}
                                            className="inline-flex items-center h-10 px-6 rounded-2xl border border-[#0955AC] text-[#0955AC] text-[14px] font-medium hover:bg-[#EAF2FD] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <CreditCard className="mr-2 h-5 w-5" />
                                            {isLaunchingPayment
                                                ? 'Opening Checkout...'
                                                : (paymentStatusRaw === 'pending' ? 'Continue Payment' : 'Pay Now')}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDownloadBill}
                                        className="inline-flex items-center h-10 px-6 rounded-2xl border border-slate-200 text-[14px] font-medium hover:bg-slate-50"
                                    >
                                        <Download className="mr-2 h-5 w-5" />
                                        Bill
                                    </button>
                                </div>
                                {paymentActionError && (
                                    <p className="text-[12px] font-medium text-rose-600">{paymentActionError}</p>
                                )}
                        </div>
                    </div>

                    {vendorApprovalStatus === 'rejected' && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-rose-800">
                                    The courier vendor rejected this shipment
                                </p>
                                {vendorApprovalNotes && (
                                    <p className="text-[14px] text-rose-700 mt-1">Reason: {vendorApprovalNotes}</p>
                                )}
                                <p className="text-[13px] text-rose-600 mt-1">
                                    Payment is disabled for this shipment. Please contact support or create a new shipment.
                                </p>
                            </div>
                        </div>
                    )}

                    {vendorApprovalStatus === 'pending' && (
                        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
                            <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-amber-800">
                                    Waiting on the courier vendor to review this shipment
                                </p>
                                <p className="text-[13px] text-amber-700 mt-1">
                                    This shipment type needs vendor approval before it can be paid for. You'll be able to pay once it's approved.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Shipment Overview */}
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <h2 className="text-[20px] font-semibold mb-6">Shipment Overview</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[12px] text-slate-500 uppercase tracking-wide">Pickup Date</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <p className="text-[16px] font-medium">{shipment.pickupDate || 'Not scheduled'}</p>
                                        </div>
                                    </div>
                                    {shipment.pickupWindowStart && shipment.pickupWindowEnd && (
                                        <div>
                                            <label className="text-[12px] text-slate-500 uppercase tracking-wide">Pickup Window</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <p className="text-[16px] font-medium">
                                                    {shipment.pickupWindowStart} - {shipment.pickupWindowEnd}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[12px] text-slate-500 uppercase tracking-wide">Total Packages</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Package className="h-4 w-4 text-slate-400" />
                                            <p className="text-[16px] font-medium">{shipment.packages?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sender & Recipient */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sender */}
                                <div className="bg-white rounded-2xl shadow-sm p-8">
                                    <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                                        <Navigation className="h-5 w-5 text-[#0955AC]" />
                                        Sender
                                    </h3>
                                    <div className="space-y-3 text-[14px]">
                                        <div className="flex items-start gap-2">
                                            <User className="h-4 w-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium">{shipment.sender?.name}</p>
                                                {shipment.sender?.company && (
                                                    <p className="text-slate-500">{shipment.sender.company}</p>
                                                )}
                                            </div>
                                        </div>
                                        {shipment.sender?.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                <p className="text-slate-600">{shipment.sender.email}</p>
                                            </div>
                                        )}
                                        {shipment.sender?.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                                <p className="text-slate-600">{shipment.sender.phone}</p>
                                            </div>
                                        )}
                                        {shipment.sender?.address && (
                                            <div className="flex items-start gap-2 pt-2 border-t">
                                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                                <div className="text-slate-600">
                                                    <p>{shipment.sender.address.line1}</p>
                                                    {shipment.sender.address.line2 && <p>{shipment.sender.address.line2}</p>}
                                                    <p>
                                                        {[
                                                            shipment.sender.address.city,
                                                            shipment.sender.address.state,
                                                            shipment.sender.address.postalCode,
                                                        ].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p>{shipment.sender.address.country}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Recipient */}
                                <div className="bg-white rounded-2xl shadow-sm p-8">
                                    <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-[#0955AC]" />
                                        Recipient
                                    </h3>
                                    <div className="space-y-3 text-[14px]">
                                        <div className="flex items-start gap-2">
                                            <User className="h-4 w-4 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium">{shipment.recipient?.name}</p>
                                                {shipment.recipient?.company && (
                                                    <p className="text-slate-500">{shipment.recipient.company}</p>
                                                )}
                                            </div>
                                        </div>
                                        {shipment.recipient?.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                <p className="text-slate-600">{shipment.recipient.email}</p>
                                            </div>
                                        )}
                                        {shipment.recipient?.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                                <p className="text-slate-600">{shipment.recipient.phone}</p>
                                            </div>
                                        )}
                                        {shipment.recipient?.address && (
                                            <div className="flex items-start gap-2 pt-2 border-t">
                                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                                <div className="text-slate-600">
                                                    <p>{shipment.recipient.address.line1}</p>
                                                    {shipment.recipient.address.line2 && <p>{shipment.recipient.address.line2}</p>}
                                                    <p>
                                                        {[
                                                            shipment.recipient.address.city,
                                                            shipment.recipient.address.state,
                                                            shipment.recipient.address.postalCode,
                                                        ].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p>{shipment.recipient.address.country}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Package Details */}
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <h2 className="text-[20px] font-semibold mb-6">Package Details</h2>
                                <div className="space-y-4">
                                    {shipment.packages && shipment.packages.length > 0 ? (
                                        shipment.packages.map((pkg, index) => (
                                            <div key={pkg.id} className="border rounded-xl p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-[16px] font-semibold">
                                                        Package {index + 1}
                                                        {pkg.label && ` - ${pkg.label}`}
                                                    </h3>
                                                    <span className="text-[12px] px-3 py-1 bg-slate-100 rounded-full">
                                                        {pkg.type}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[14px]">
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">Provider</label>
                                                        <p className="font-medium">{pkg.provider}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">Service</label>
                                                        <p className="font-medium">{pkg.service}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">ETA</label>
                                                        <p className="font-medium">{pkg.eta || 'TBD'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">Weight</label>
                                                        <p className="font-medium">{pkg.weight} kg</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">Quantity</label>
                                                        <p className="font-medium">{pkg.quantity}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-slate-500 text-[12px]">Price</label>
                                                        <p className="font-medium">${Number(pkg.price || 0).toFixed(2)}</p>
                                                    </div>
                                                    {(pkg.length && pkg.width && pkg.height) && (
                                                        <div className="col-span-2 md:col-span-3">
                                                            <label className="text-slate-500 text-[12px]">Dimensions (L × W × H)</label>
                                                            <p className="font-medium">
                                                                {pkg.length} × {pkg.width} × {pkg.height} cm
                                                            </p>
                                                        </div>
                                                    )}
                                                    {pkg.description && (
                                                        <div className="col-span-2 md:col-span-3">
                                                            <label className="text-slate-500 text-[12px]">Description</label>
                                                            <p className="text-slate-600">{pkg.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-center py-4">No package information available</p>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Right Column - Tracking & Summary */}
                        <div className="space-y-6">
                            {/* Cost Summary */}
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-[#0955AC]" />
                                    Cost Summary
                                </h3>
                                <div className="space-y-3 text-[14px]">
                                    {shipment.estimatedCost && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Estimated Cost</span>
                                            <span className="font-semibold">
                                                {formatAmountWithCurrency(shipment.estimatedCost, shipment.displayCurrency || shipment.currencyCode || 'USD')}
                                            </span>
                                        </div>
                                    )}
                                    {shipment.actualCost && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Actual Cost</span>
                                            <span className="font-semibold">
                                                {formatAmountWithCurrency(shipment.actualCost, shipment.displayCurrency || shipment.currencyCode || 'USD')}
                                            </span>
                                        </div>
                                    )}
                                    {shipment.insuranceRequired && (
                                        <div className="flex items-center gap-2 pt-3 border-t">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            <span className="text-emerald-600 font-medium">Insurance Included</span>
                                        </div>
                                    )}
                                    {shipment.declaredValue && (
                                        <div className="flex justify-between pt-3 border-t">
                                            <span className="text-slate-600">Declared Value</span>
                                            <span className="font-semibold">
                                                {formatAmountWithCurrency(shipment.declaredValue, shipment.currencyCode || 'LKR')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Cash on Delivery</span>
                                            <span className={`font-semibold ${codEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                {codEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        {codEnabled && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">COD Amount</span>
                                                    <span className="font-semibold">
                                                        {codAmount !== null ? formatAmountWithCurrency(codAmount, shipment.currencyCode || 'LKR') : '—'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">COD Payment Method</span>
                                                    <span className="font-semibold capitalize">{codPaymentMethod || '—'}</span>
                                                </div>
                                                {codPolicySnapshot && (
                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                                                        COD policy snapshot applied at booking time.
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="pt-3 border-t space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Payment Status</span>
                                            <span className="font-semibold text-slate-900">{paymentStatusLabel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Payment Method</span>
                                            <span className="font-semibold text-slate-900">{paymentMethodLabel}</span>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            <span className="text-slate-600">Payment Reference</span>
                                            <span className="font-semibold text-slate-900 text-right break-all">{paymentReference || 'N/A'}</span>
                                        </div>
                                        {paymentProvider && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Payment Provider</span>
                                                <span className="font-semibold text-slate-900">{toTitleLabel(paymentProvider)}</span>
                                            </div>
                                        )}
                                        {paymentInitiatedAt && (
                                            <div className="flex justify-between gap-2">
                                                <span className="text-slate-600">Initiated At</span>
                                                <span className="font-semibold text-slate-900 text-right">{paymentInitiatedAt}</span>
                                            </div>
                                        )}
                                        {paymentPaidAt && (
                                            <div className="flex justify-between gap-2">
                                                <span className="text-slate-600">Paid At</span>
                                                <span className="font-semibold text-slate-900 text-right">{paymentPaidAt}</span>
                                            </div>
                                        )}
                                        {paymentFailedAt && (
                                            <div className="flex justify-between gap-2">
                                                <span className="text-slate-600">Failed At</span>
                                                <span className="font-semibold text-slate-900 text-right">{paymentFailedAt}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tracking Events */}
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-[#0955AC]" />
                                    Tracking History
                                </h3>
                                <div className="space-y-4">
                                    {shipment.trackingEvents && shipment.trackingEvents.length > 0 ? (
                                        shipment.trackingEvents.map((event, index) => (
                                            <div key={event.id} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-0">
                                                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-[#0955AC] border-2 border-white"></div>
                                                <div className="text-[12px] text-slate-500 mb-1">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </div>
                                                <div className="text-[14px] font-medium mb-1">{event.status}</div>
                                                {event.location && (
                                                    <div className="text-[12px] text-slate-600 mb-1">{event.location}</div>
                                                )}
                                                {event.description && (
                                                    <div className="text-[12px] text-slate-500">{event.description}</div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-[14px] text-center py-4">
                                            No tracking events yet
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Shipment Info */}
                            <div className="bg-white rounded-2xl shadow-sm p-8">
                                <h3 className="text-[18px] font-semibold mb-4">Shipment Info</h3>
                                <div className="space-y-3 text-[14px]">
                                    <div>
                                        <label className="text-slate-500 text-[12px]">Created</label>
                                        <p className="font-medium">{new Date(shipment.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-500 text-[12px]">Last Updated</label>
                                        <p className="font-medium">{new Date(shipment.updatedAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-500 text-[12px]">Reference</label>
                                        <p className="font-medium font-mono">{shipment.code}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourierShipmentDetail;
