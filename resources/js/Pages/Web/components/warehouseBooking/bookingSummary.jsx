import React, { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Header from "../../home/client/ClientHeader";
import Footer from "../../layouts/Footer";

const INITIAL_PRICING_STATE = {
    monthly_rate: 0,
    security_deposit: 0,
    setup_fee: 0,
    tax_rate: 0,
    add_ons_cost: 0,
    monthly_total: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    final_amount: 0,
    duration: 1,
    duration_months: 1,
    space_utilization: 0,
    required_space: 0
};

const BookingSummary = ({ booking }) => {
    const [bookingData, setBookingData] = useState(null);
    const [warehouseData, setWarehouseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pricingDetails, setPricingDetails] = useState(INITIAL_PRICING_STATE);
    const slipRef = useRef(null);
    
    useEffect(() => {
        const fetchBookingDetails = async () => {
            try {
                setLoading(true);
                
                // If we have booking data from props (from backend), use that
                if (booking) {
                    setBookingData(booking);
                    
                    // Fetch warehouse details if warehouse_unit_id is available
                    if (booking.warehouse_unit_id) {
                        try {
                            const warehouseResponse = await fetch(`/api/warehouse-units/${booking.warehouse_unit_id}`);
                            if (warehouseResponse.ok) {
                                const warehouseResult = await warehouseResponse.json();
                                setWarehouseData(warehouseResult.data || warehouseResult);
                            }
                        } catch (warehouseError) {
                            console.error('Error fetching warehouse details:', warehouseError);
                        }
                    }
                    
                    // Clear sessionStorage after getting data from backend
                    sessionStorage.removeItem('warehouseBookingData');
                    setLoading(false);
                    return;
                }
                
                // Otherwise try to get it from sessionStorage
                const savedData = sessionStorage.getItem('warehouseBookingData');
                if (savedData) {
                    try {
                        const parsedData = JSON.parse(savedData);
                        setBookingData(parsedData);
                        
                        // Clear sessionStorage after successful booking
                        sessionStorage.removeItem('warehouseBookingData');
                        setLoading(false);
                    } catch (error) {
                        console.error('Error parsing saved booking data:', error);
                        setError('Error loading booking information');
                        toast.error('Error loading booking information');
                        setLoading(false);
                    }
                } else {
                    // No saved data, redirect back to booking page
                    toast.error('No booking information found. Please start the booking process again.');
                    setTimeout(() => {
                        router.visit('/warehouse-bookings/', {
                            method: 'get'
                        });
                    }, 2000);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error in fetchBookingDetails:', error);
                setError('Failed to load booking details');
                setLoading(false);
            }
        };
        
        fetchBookingDetails();
    }, [booking]);

    const parseDuration = (duration) => {
        if (duration === null || duration === undefined || duration === '') {
            return 1;
        }

        if (typeof duration === 'number' && Number.isFinite(duration)) {
            return Math.max(1, Math.floor(duration));
        }

        const value = String(duration).trim();
        if (!value) return 1;

        if (!Number.isNaN(Number(value))) {
            return Math.max(1, parseInt(value, 10));
        }

        const match = value.match(/(\d+)/);
        return match ? Math.max(1, parseInt(match[1], 10)) : 1;
    };

    const calculatePricing = (warehouse = null, bookingContext = null) => {
        const currentBooking = bookingContext || bookingData;
        const currentWarehouse = warehouse || warehouseData;

        if (!currentBooking && !currentWarehouse) {
            setPricingDetails(INITIAL_PRICING_STATE);
            return;
        }

        try {
            const durationMonths = parseDuration(
                currentBooking?.storage_duration ??
                currentBooking?.duration_months ??
                currentWarehouse?.default_duration ??
                1
            );

            const rawRequiredSpace = Number(currentBooking?.required_space);
            const fallbackSpace = Number(
                currentBooking?.available_space ??
                currentWarehouse?.available_space ??
                currentWarehouse?.total_area ??
                0
            );
            const requiredSpace = Number.isFinite(rawRequiredSpace) && rawRequiredSpace > 0
                ? rawRequiredSpace
                : Math.max(fallbackSpace, 0);

            const baseMonthlyRate = parseFloat(
                currentBooking?.monthly_rate ??
                currentWarehouse?.monthly_rate ??
                currentWarehouse?.price ??
                currentWarehouse?.base_price ??
                0
            ) || 0;

            const securityDeposit = parseFloat(
                currentBooking?.security_deposit ??
                currentWarehouse?.security_deposit ??
                (baseMonthlyRate * 0.5) ??
                0
            ) || 0;

            const setupFee = parseFloat(
                currentBooking?.setup_fee ??
                currentWarehouse?.setup_fee ??
                (baseMonthlyRate * 0.2) ??
                0
            ) || 0;

            const resolveTaxRate = (rate) => {
                if (rate === null || rate === undefined) {
                    return 0.08;
                }
                const normalized = typeof rate === 'string' ? rate.replace(/[^0-9.]/g, '') : rate;
                const numeric = Number(normalized);
                if (!Number.isFinite(numeric)) {
                    return 0;
                }
                return numeric > 1 ? numeric / 100 : numeric;
            };

            const taxRate = resolveTaxRate(
                currentBooking?.tax_rate ??
                currentWarehouse?.tax_rate
            );

            const totalArea = parseFloat(
                currentWarehouse?.total_area ??
                currentBooking?.total_area ??
                (requiredSpace || 1)
            ) || 1;

            const addOnsCost = Number(currentBooking?.add_ons_cost) || 0;

            const spaceUtilization = Math.min(requiredSpace / totalArea, 1);
            const monthlyRate = baseMonthlyRate * spaceUtilization;
            const monthlyTotal = monthlyRate + addOnsCost;
            const subtotal = monthlyTotal * durationMonths;
            const taxAmount = subtotal * taxRate;
            const totalBeforeFees = subtotal + taxAmount;
            const finalAmount = totalBeforeFees + securityDeposit + setupFee;

            setPricingDetails({
                monthly_rate: monthlyRate,
                security_deposit: securityDeposit,
                setup_fee: setupFee,
                tax_rate: taxRate,
                add_ons_cost: addOnsCost,
                monthly_total: monthlyTotal,
                subtotal,
                tax_amount: taxAmount,
                total_amount: totalBeforeFees,
                final_amount: finalAmount,
                duration: durationMonths,
                duration_months: durationMonths,
                space_utilization: spaceUtilization,
                required_space: requiredSpace
            });
        } catch (pricingError) {
            console.error('Error calculating pricing summary:', pricingError);
            setPricingDetails(INITIAL_PRICING_STATE);
        }
    };

    useEffect(() => {
        if (!bookingData && !warehouseData) {
            setPricingDetails(INITIAL_PRICING_STATE);
            return;
        }

        calculatePricing(warehouseData, bookingData);
    }, [bookingData, warehouseData]);

    const monthlyDue = pricingDetails.monthly_total || (pricingDetails.monthly_rate + pricingDetails.add_ons_cost);
    const initialPaymentDue = (monthlyDue || 0) + (pricingDetails.security_deposit || 0) + (pricingDetails.setup_fee || 0);
    const bookingReference = getBookingReference();
    const moveInDateValue = getMoveInDate();
    const moveOutDateValue = getMoveOutDate();
    const formattedMoveInDate = moveInDateValue ? formatDate(moveInDateValue) : 'Not specified';
    const formattedMoveOutDate = moveOutDateValue ? formatDate(moveOutDateValue) : 'Not specified';
    const issuedOnDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const storageDurationLabel = bookingData?.storage_duration || `${pricingDetails.duration || bookingData?.duration_months || 1} Month${(pricingDetails.duration || bookingData?.duration_months || 1) > 1 ? 's' : ''}`;

    const handleDownloadSlip = async () => {
        if (!slipRef.current) {
            return;
        }

        try {
            const canvas = await html2canvas(slipRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imageData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imageData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imageData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }
            const reference = getBookingReference();
            const filename = reference ? `warehouse-booking-${reference}.pdf` : 'warehouse-booking-confirmation.pdf';
            pdf.save(filename);
        } catch (downloadError) {
            console.error('Error generating booking confirmation slip:', downloadError);
            toast.error('Unable to download the booking slip right now. Please try again.');
        }
    };

    const handleBackToHome = () => {
        router.visit("/warehouseList", {
            method: "get",
            preserveScroll: true,
        });
    };

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getPaymentMethodLabel(method) {
        switch (method) {
            case 'Credit Card':
                return 'Credit Card';
            case 'PayPal':
                return 'PayPal';
            case 'Bank Transfer':
                return 'Bank Transfer';
            default:
                return method;
        }
    }

    function getPaymentOptionLabel(option) {
        return option === 'full' ? 'Full Payment' : 'Deposit + Monthly Payments';
    }

    function formatCurrency(amount) {
        if (typeof amount !== 'number') return 'LKR 0.00';
        return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatSqFt(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '0';
        }
        return numeric.toLocaleString();
    }

    function getBookingReference() {
        return bookingData?.booking_reference ||
            (booking?.id ? `WH-${String(booking.id).padStart(6, '0')}` :
                `WH-${Math.floor(100000 + Math.random() * 900000)}`);
    }

    function getMoveInDate() {
        return bookingData?.start_date || bookingData?.move_in_date || null;
    }

    function getMoveOutDate() {
        return bookingData?.end_date || bookingData?.move_out_date || null;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <div className="animate-pulse text-xl text-gray-500">Loading booking information...</div>
            </div>
        );
    }
    
    if (error || !bookingData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <div className="text-xl text-red-500">{error || 'No booking information available'}</div>
            </div>
        );
    }

    return (
        <div>
            {bookingData && (
                <div
                    ref={slipRef}
                    aria-hidden="true"
                    className="bg-gradient-to-b from-[#F8FAFF] to-white rounded-3xl border border-[#D6E0FF] shadow-2xl text-[#182539]"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '-9999px',
                        width: '794px',
                        padding: '36px',
                        fontFamily: "'Figtree', 'Segoe UI', sans-serif",
                        lineHeight: 1.6
                    }}
                >
                    <div className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#1C51B9] to-[#2563EB] text-white px-10 py-8 mb-8 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                                <div className="text-[32px] font-extrabold tracking-[0.12em] uppercase">LEO Transport</div>
                                <p className="text-sm tracking-[0.3em] uppercase opacity-80">Warehouse Booking Confirmation</p>
                            </div>
                            <div className="text-right text-sm leading-6 opacity-90">
                                <p className="font-semibold text-white">LEO Transport (Pvt) Ltd</p>
                                <p>Head Office, Colombo 05</p>
                                <p>support@leotransport.com</p>
                                <p>+94 11 987 6543</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10 text-sm">
                        <div className="bg-white/80 backdrop-blur rounded-2xl border border-[#E3E8FF] p-6 shadow-sm">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E3A8A] mb-3">Booking Overview</h3>
                            <div className="space-y-2 text-[#1F2A44]">
                                <p><span className="font-medium">Booking Reference:</span> {bookingReference}</p>
                                <p><span className="font-medium">Issued On:</span> {issuedOnDate}</p>
                                <p><span className="font-medium">Payment Status:</span> {bookingData.payment_status || 'Pending'}</p>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur rounded-2xl border border-[#E3E8FF] p-6 shadow-sm text-right">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E3A8A] mb-3">Schedule</h3>
                            <div className="space-y-2 text-[#1F2A44]">
                                <p><span className="font-medium">Move-in:</span> {formattedMoveInDate}</p>
                                <p><span className="font-medium">Move-out:</span> {moveOutDateValue ? formattedMoveOutDate : '—'}</p>
                                <p><span className="font-medium">Duration:</span> {storageDurationLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1E3A8A] mb-4">Client Details</h2>
                        <div className="grid grid-cols-2 gap-6 bg-white rounded-2xl border border-[#E3E8FF] p-6 shadow-sm text-sm">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Contact Person</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.contact_person || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Company</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.company_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Email</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Phone</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Payment Method</p>
                                <p className="text-base font-medium text-[#1F2A44]">{getPaymentMethodLabel(bookingData.payment_method || 'Credit Card')}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Payment Option</p>
                                <p className="text-base font-medium text-[#1F2A44]">{getPaymentOptionLabel(bookingData.payment_option || 'full')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1E3A8A] mb-4">Warehouse Details</h2>
                        <div className="grid grid-cols-2 gap-6 bg-white rounded-2xl border border-[#E3E8FF] p-6 shadow-sm text-sm">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Warehouse</p>
                                <p className="text-base font-medium text-[#1F2A44]">{warehouseData?.name || bookingData.warehouse_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Required Space</p>
                                <p className="text-base font-medium text-[#1F2A44]">{formatSqFt(pricingDetails.required_space || bookingData.required_space || 0)} sq ft</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Address</p>
                                <p className="text-base font-medium text-[#1F2A44]">{warehouseData?.address || bookingData.location || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Storage Type</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.storage_type || 'General Storage'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-[#6473A6]">Access Hours</p>
                                <p className="text-base font-medium text-[#1F2A44]">{bookingData.access_hours || '24/7'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1E3A8A] mb-4">Pricing Summary</h2>
                        <div className="rounded-2xl overflow-hidden border border-[#1C51B9] shadow-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
                                    <tr className="text-left">
                                        <th className="py-3 px-6 font-semibold">Description</th>
                                        <th className="py-3 px-6 font-semibold text-right">Amount (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white text-[#1F2A44]">
                                    <tr className="border-b border-[#E3E8FF]">
                                        <td className="py-3 px-6">Monthly Storage Rate × {pricingDetails.duration || 1}</td>
                                        <td className="py-3 px-6 text-right">{formatCurrency(pricingDetails.subtotal)}</td>
                                    </tr>
                                    {pricingDetails.add_ons_cost > 0 && (
                                        <tr className="border-b border-[#E3E8FF]">
                                            <td className="py-3 px-6">Add-ons & Services</td>
                                            <td className="py-3 px-6 text-right">{formatCurrency(pricingDetails.add_ons_cost * (pricingDetails.duration || 1))}</td>
                                        </tr>
                                    )}
                                    {pricingDetails.tax_amount > 0 && (
                                        <tr className="border-b border-[#E3E8FF]">
                                            <td className="py-3 px-6">Tax ({((pricingDetails.tax_rate || 0) * 100).toFixed(1)}%)</td>
                                            <td className="py-3 px-6 text-right">{formatCurrency(pricingDetails.tax_amount)}</td>
                                        </tr>
                                    )}
                                    {pricingDetails.security_deposit > 0 && (
                                        <tr className="border-b border-[#E3E8FF]">
                                            <td className="py-3 px-6">Security Deposit (Refundable)</td>
                                            <td className="py-3 px-6 text-right">{formatCurrency(pricingDetails.security_deposit)}</td>
                                        </tr>
                                    )}
                                    {pricingDetails.setup_fee > 0 && (
                                        <tr className="border-b border-[#E3E8FF]">
                                            <td className="py-3 px-6">Setup & Processing Fee</td>
                                            <td className="py-3 px-6 text-right">{formatCurrency(pricingDetails.setup_fee)}</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#EFF4FF]">
                                        <td className="py-3 px-6 font-semibold text-[#1E3A8A]">Total Contract Value</td>
                                        <td className="py-3 px-6 font-semibold text-right text-[#1E3A8A]">{formatCurrency(pricingDetails.final_amount)}</td>
                                    </tr>
                                    <tr className="bg-[#E3ECFF]">
                                        <td className="py-3 px-6 text-sm font-semibold text-[#1E3A8A]">Initial Payment Due</td>
                                        <td className="py-3 px-6 text-sm font-semibold text-right text-[#1E3A8A]">{formatCurrency(initialPaymentDue)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
                            <div className="bg-white rounded-2xl border border-[#E3E8FF] p-6 shadow-sm">
                                <h3 className="text-xs uppercase tracking-[0.2em] text-[#1E3A8A] mb-3">Monthly Charges</h3>
                                <div className="space-y-2 text-[#1F2A44]">
                                    <div className="flex justify-between">
                                        <span>Base Monthly Rate</span>
                                        <span className="font-medium">{formatCurrency(pricingDetails.monthly_rate)}</span>
                                    </div>
                                    {pricingDetails.add_ons_cost > 0 && (
                                        <div className="flex justify-between">
                                            <span>Add-ons</span>
                                            <span className="font-medium">+{formatCurrency(pricingDetails.add_ons_cost)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-[#E3E8FF] pt-2 flex justify-between font-semibold">
                                        <span>Monthly Due</span>
                                        <span>{formatCurrency(monthlyDue || 0)}</span>
                                    </div>
                                    <p className="text-xs text-[#6473A6]">Charged each month for {pricingDetails.duration || 1} month{(pricingDetails.duration || 1) > 1 ? 's' : ''}.</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#E3E8FF] p-6 shadow-sm">
                                <h3 className="text-xs uppercase tracking-[0.2em] text-[#1E3A8A] mb-3">One-time Fees</h3>
                                <div className="space-y-2 text-[#1F2A44]">
                                    {pricingDetails.security_deposit > 0 ? (
                                        <div className="flex justify-between">
                                            <span>Security Deposit</span>
                                            <span className="font-medium">{formatCurrency(pricingDetails.security_deposit)}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#6473A6]">No security deposit required.</p>
                                    )}
                                    {pricingDetails.setup_fee > 0 && (
                                        <div className="flex justify-between">
                                            <span>Setup Fee</span>
                                            <span className="font-medium">{formatCurrency(pricingDetails.setup_fee)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-[#E3E8FF] pt-2 flex justify-between font-semibold">
                                        <span>One-time Total</span>
                                        <span>{formatCurrency((pricingDetails.security_deposit || 0) + (pricingDetails.setup_fee || 0))}</span>
                                    </div>
                                    <p className="text-xs text-[#6473A6]">Collected alongside the first month’s payment.</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#E3E8FF] p-6 shadow-sm">
                                <h3 className="text-xs uppercase tracking-[0.2em] text-[#1E3A8A] mb-3">Contract Totals</h3>
                                <div className="space-y-2 text-[#1F2A44]">
                                    <div className="flex justify-between">
                                        <span>Duration Subtotal</span>
                                        <span className="font-medium">{formatCurrency(pricingDetails.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax ({((pricingDetails.tax_rate || 0) * 100).toFixed(2)}%)</span>
                                        <span className="font-medium">{formatCurrency(pricingDetails.tax_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Initial Payment Due</span>
                                        <span className="font-medium">{formatCurrency(initialPaymentDue)}</span>
                                    </div>
                                    <div className="border-t border-[#E3E8FF] pt-2 flex justify-between font-semibold text-[#1E3A8A]">
                                        <span>Total Contract Value</span>
                                        <span>{formatCurrency(pricingDetails.final_amount)}</span>
                                    </div>
                                    <p className="text-xs text-[#6473A6]">Tax is calculated on the full contract duration before one-time fees.</p>
                                </div>
                            </div>
                        </div>
                        {pricingDetails.required_space > 0 && warehouseData?.total_area && (
                            <div className="mt-6 bg-white border border-[#E3E8FF] rounded-2xl p-5 shadow-sm text-sm text-[#1F2A44]">
                                <h3 className="text-xs uppercase tracking-[0.2em] text-[#1E3A8A] mb-2">Space Utilization</h3>
                                <p>
                                    Using {(pricingDetails.space_utilization * 100).toFixed(1)}% of total warehouse capacity
                                    ({formatSqFt(pricingDetails.required_space)} sq ft of {formatSqFt(warehouseData.total_area)} sq ft).
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1E3A8A] text-white rounded-2xl px-8 py-6 shadow-lg">
                        <p className="text-sm font-medium">Thank you for choosing LEO Transport.</p>
                        <p className="text-xs opacity-80 mt-2">Our operations team will contact you within 24 hours to coordinate move-in logistics.</p>
                        <p className="text-xs opacity-80 mt-2">Need assistance? Reach us at support@leotransport.com or +94 11 987 6543.</p>
                    </div>
                </div>
            )}
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            <Header />

            <main className="py-10 px-4 md:px-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col gap-10">
                        {/* Progress Steps */}
                        <div className="flex flex-row items-start justify-center pb-10">
                            <div
                                className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer"
                                onClick={handleBackToHome}
                            >
                                <div
                                    className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                    style={{
                                        boxShadow: "0 0 10px 8px #1565c088",
                                    }}
                                />
                                <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                    Select Warehouse
                                </h1>
                            </div>
                            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                            <div
                                className="md:flex flex-col hidden justify-center items-center gap-3"
                            >
                                <div
                                    className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                    style={{
                                        boxShadow: "0 0 10px 8px #1565c088",
                                    }}
                                />
                                <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                    Booking Info
                                </h1>
                            </div>
                            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                            <div
                                className="md:flex flex-col hidden justify-center items-center gap-3"
                            >
                                <div
                                    className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                    style={{
                                        boxShadow: "0 0 10px 8px #1565c088",
                                    }}
                                />
                                <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                    Payments
                                </h1>
                            </div>
                            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                            <div className="flex flex-col justify-center items-center gap-3">
                                <div
                                    className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                    style={{
                                        boxShadow: "0 0 10px 8px #1565c088",
                                    }}
                                />
                                <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                    Booking Confirmation
                                </h1>
                            </div>
                        </div>

                        {/* Confirmation Message */}
                        <div
                            className="figtree h-auto bg-[#E2F6DC] rounded-[10px] px-10 py-10 w-full"
                            style={{
                                boxShadow: "4px 4px 4px #0000001A",
                            }}
                        >
                            <div className="flex md:flex-row flex-col justify-center gap-5 md:items-center">
                                <div className="size-[70px] border-[1.5px] border-[#13790A] rounded-[5px] flex justify-center items-center p-5">
                                    <svg className="w-[40px] h-[35px] text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-[20px]/[24px] font-[700] text-[#13790A]">
                                        YOUR BOOKING IS CONFIRMED!
                                    </h1>
                                    <h1 className="text-[14px]/[24px] font-[500] text-[#000000B2]">
                                        We've sent a confirmation email to your registered email address.
                                    </h1>
                                    <h1 className="text-[14px]/[24px] font-[500] text-[#000000B2]">
                                        Booking Reference: {getBookingReference()}
                                    </h1>
                                    {bookingData?.status && (
                                        <h1 className="text-[14px]/[24px] font-[500] text-[#000000B2]">
                                            Status: <span className="capitalize">{bookingData.status}</span>
                                        </h1>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Left Column - Warehouse Info */}
                            <div className="lg:col-span-2 space-y-6">
                                <div
                                    className="border-l-[0.2px] rounded-[10px] bg-[#FFFFFF] px-8 py-8"
                                    style={{
                                        borderLeftWidth: "0.2px",
                                        borderTopWidth: "0.2px",
                                        boxShadow: "4px 4px 4px #0000001A",
                                    }}
                                >
                                    <h1 className="text-[24px] font-[700] mb-6">
                                        Warehouse Details
                                    </h1>

                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                            <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <h2 className="text-[20px] font-[700]">
                                                    {warehouseData?.name || bookingData.warehouse_name || "Central Storage Facility - Bay A"}
                                                </h2>
                                                <p className="text-[14px] text-gray-600">
                                                    {warehouseData?.address || bookingData.location || "123 Warehouse Road, Industrial Zone, Colombo"}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px] text-gray-700">
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    <span>{formatSqFt(bookingData.required_space || 5000)} sq ft</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    <span>Secure</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                    <span>Climate Control</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>24/7 Access</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 border-t border-gray-200 pt-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex flex-col items-center">
                                                <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                                                <div className="h-[77px] w-[1.5px] bg-[#0955AC]"></div>
                                                <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                                            </div>
                                            <div className="flex flex-col gap-8 text-[14px]">
                                                <div>
                                                    <h3 className="text-[16px] font-[700] text-[#000000]">
                                                        Move-in: {warehouseData?.name || bookingData.warehouse_name || "Central Storage Facility"}
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        Move-in Date: {getMoveInDate() ? formatDate(getMoveInDate()) : "Not specified"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h3 className="text-[16px] font-[700] text-[#000000]">
                                                        Storage Details
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        Duration: {bookingData.duration_months ? `${bookingData.duration_months} month${bookingData.duration_months > 1 ? 's' : ''}` : (bookingData.storage_duration || "Not specified")}
                                                    </p>
                                                    <p className="text-gray-600">Storage Type: {bookingData.storage_type || "General Storage"}</p>
                                                    <p className="text-gray-600">Required Space: {formatSqFt(bookingData.required_space || 1000)} sq ft</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div
                                    className="border-l-[0.2px] rounded-[10px] bg-[#FFFFFF] px-8 py-8"
                                    style={{
                                        borderLeftWidth: "0.2px",
                                        borderTopWidth: "0.2px",
                                        boxShadow: "4px 4px 4px #0000001A",
                                    }}
                                >
                                    <h1 className="text-[24px] font-[700] mb-6">
                                        Personal Information
                                    </h1>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Contact Person</h3>
                                            <p className="text-[16px]">{bookingData.contact_person || "N/A"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Email Address</h3>
                                            <p className="text-[16px]">{bookingData.email || "N/A"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Phone Number</h3>
                                            <p className="text-[16px]">{bookingData.phone || "N/A"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Company Address</h3>
                                            <p className="text-[16px]">{bookingData.company_address || "N/A"}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Schedule Information */}
                                    <div className="mt-6 border-t border-gray-200 pt-6">
                                        <h2 className="text-[18px] font-[600] mb-4">Schedule Information</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-[14px] font-semibold text-gray-700">Move-in Date</h3>
                                                <p className="text-[16px]">
                                                    {getMoveInDate() ? formatDate(getMoveInDate()) : "Not specified"}
                                                </p>
                                            </div>
                                            {getMoveOutDate() && (
                                                <div>
                                                    <h3 className="text-[14px] font-semibold text-gray-700">Move-out Date</h3>
                                                    <p className="text-[16px]">
                                                        {formatDate(getMoveOutDate())}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-[14px] font-semibold text-gray-700">Access Hours</h3>
                                                <p className="text-[16px]">{bookingData.access_hours || "24/7"}</p>
                                            </div>
                                            {bookingData.special_instructions && (
                                                <div>
                                                    <h3 className="text-[14px] font-semibold text-gray-700">Special Instructions</h3>
                                                    <p className="text-[16px]">{bookingData.special_instructions}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {bookingData.company_name && (
                                        <div className="mt-6 border-t border-gray-200 pt-6">
                                            <h2 className="text-[18px] font-[600] mb-4">Company Information</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h3 className="text-[14px] font-semibold text-gray-700">Company Name</h3>
                                                    <p className="text-[16px]">{bookingData.company_name}</p>
                                                </div>
                                                <div>
                                                    <h3 className="text-[14px] font-semibold text-gray-700">Goods Description</h3>
                                                    <p className="text-[16px]">{bookingData.goods_description || "General storage items"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Information */}
                                <div
                                    className="border-l-[0.2px] rounded-[10px] bg-[#FFFFFF] px-8 py-8"
                                    style={{
                                        borderLeftWidth: "0.2px",
                                        borderTopWidth: "0.2px",
                                        boxShadow: "4px 4px 4px #0000001A",
                                    }}
                                >
                                    <h1 className="text-[24px] font-[700] mb-6">
                                        Payment Information
                                    </h1>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Payment Method</h3>
                                            <p className="text-[16px]">{getPaymentMethodLabel(bookingData.payment_method || "Credit Card")}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Payment Status</h3>
                                            <p className="text-[16px] capitalize">{bookingData.payment_status || "Pending"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-semibold text-gray-700">Total Amount</h3>
                                            <p className="text-[16px] font-semibold">{formatCurrency(pricingDetails.final_amount || bookingData?.final_amount || bookingData?.total_amount || 0)}</p>
                                        </div>
                                        {bookingData.transaction_reference && (
                                            <div>
                                                <h3 className="text-[14px] font-semibold text-gray-700">Transaction Reference</h3>
                                                <p className="text-[16px]">{bookingData.transaction_reference}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Price Summary */}
                            <div className="lg:col-span-1">
                                <div
                                    className="poppins h-auto bg-[#F4F3F3] rounded-[10px] px-8 py-8 sticky top-8"
                                    style={{
                                        boxShadow: "4px 4px 4px #0000001A",
                                    }}
                                >
                                    <h1 className="font-[600] text-[20px] mb-6">
                                        Payment Details
                                    </h1>

                                    <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-6 px-6">
                                        <h1 className="font-[600] mb-4 text-[#000000D9]">Pricing Breakdown</h1>
                                        <div className="w-full h-[1px] bg-[#CDD0D4]" />

                                        <div className="flex flex-col md:flex-row justify-between w-full px-4 py-4 font-[500]">
                                            <div>
                                                <h1 className="text-[#000000CC]">Monthly Storage Rate</h1>
                                                <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                                                    <h1>{formatCurrency(pricingDetails.monthly_rate)}/month</h1>
                                                    <h1 className="text-[#0955AC]">
                                                        ({pricingDetails.duration || 1} month{(pricingDetails.duration || 1) > 1 ? 's' : ''})
                                                    </h1>
                                                </div>
                                            </div>
                                            <div className="text-[#000000CC]">{formatCurrency(pricingDetails.subtotal)}</div>
                                        </div>

                                        {pricingDetails.security_deposit > 0 && (
                                            <div className="flex flex-col md:flex-row justify-between w-full px-4 font-[500]">
                                                <div>
                                                    <h1 className="text-[#000000CC]">Security Deposit</h1>
                                                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                                                        <h1>Refundable deposit</h1>
                                                        <h1 className="text-[#0955AC]">(One-time)</h1>
                                                    </div>
                                                </div>
                                                <div className="text-[#000000CC]">{formatCurrency(pricingDetails.security_deposit)}</div>
                                            </div>
                                        )}

                                        {pricingDetails.setup_fee > 0 && (
                                            <div className="flex flex-col md:flex-row justify-between w-full px-4 py-4 font-[500]">
                                                <div>
                                                    <h1 className="text-[#000000CC]">Setup Fee</h1>
                                                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                                                        <h1>Initial setup and processing</h1>
                                                        <h1 className="text-[#0955AC]">(One-time)</h1>
                                                    </div>
                                                </div>
                                                <div className="text-[#000000CC]">{formatCurrency(pricingDetails.setup_fee)}</div>
                                            </div>
                                        )}

                                        {pricingDetails.add_ons_cost > 0 && (
                                            <div className="flex flex-col md:flex-row justify-between w-full px-4 py-4 font-[500]">
                                                <div>
                                                    <h1 className="text-[#000000CC]">Add-ons</h1>
                                                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                                                        <h1>Additional services</h1>
                                                        <h1 className="text-[#0955AC]">(Monthly)</h1>
                                                    </div>
                                                </div>
                                                <div className="text-[#000000CC]">+{formatCurrency(pricingDetails.add_ons_cost * pricingDetails.duration)}</div>
                                            </div>
                                        )}

                                        {pricingDetails.tax_amount > 0 && (
                                            <div className="flex flex-col md:flex-row justify-between w-full px-4 py-4 font-[500]">
                                                <div>
                                                    <h1 className="text-[#000000CC]">Tax</h1>
                                                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                                                        <h1>VAT and other taxes</h1>
                                                        <h1 className="text-[#0955AC]">({((pricingDetails.tax_rate || 0) * 100).toFixed(1)}%)</h1>
                                                    </div>
                                                </div>
                                                <div className="text-[#000000CC]">{formatCurrency(pricingDetails.tax_amount)}</div>
                                            </div>
                                        )}

                                        <div className="w-full h-[1px] bg-[#CDD0D4] my-4" />

                                        {pricingDetails.required_space > 0 && warehouseData?.total_area && (
                                            <div className="bg-blue-50 p-3 rounded mb-4">
                                                <h2 className="text-[11px] font-[600] text-blue-800 mb-1">Space Utilization</h2>
                                                <p className="text-[10px] text-blue-600">
                                                    {`Using ${(pricingDetails.space_utilization * 100).toFixed(1)}% of total capacity (${formatSqFt(pricingDetails.required_space)} / ${formatSqFt(warehouseData.total_area)} sq ft)`}
                                                </p>
                                            </div>
                                        )}

                                        <h1 className="font-[600] text-[#000000D9]">Payment Summary</h1>

                                        <div className="bg-gray-50 p-4 rounded my-4">
                                            <h2 className="text-[11px] font-[600] text-gray-800 mb-3">Monthly Charges</h2>
                                            <div className="space-y-2 text-[10px]">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Base Monthly Rate</span>
                                                    <span className="font-[500]">{formatCurrency(pricingDetails.monthly_rate)}</span>
                                                </div>
                                                {pricingDetails.add_ons_cost > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Add-ons</span>
                                                        <span className="font-[500]">+{formatCurrency(pricingDetails.add_ons_cost)}</span>
                                                    </div>
                                                )}
                                                <div className="border-t pt-2 flex justify-between font-[600]">
                                                    <span>Monthly Subtotal</span>
                                                    <span>{formatCurrency(monthlyDue || 0)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-yellow-50 p-4 rounded mb-4">
                                            <h2 className="text-[11px] font-[600] text-yellow-800 mb-3">One-time Charges</h2>
                                            <div className="space-y-2 text-[10px]">
                                                {pricingDetails.security_deposit > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-yellow-700">Security Deposit (Refundable)</span>
                                                        <span className="font-[500]">{formatCurrency(pricingDetails.security_deposit)}</span>
                                                    </div>
                                                )}
                                                {pricingDetails.setup_fee > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-yellow-700">Setup & Processing Fee</span>
                                                        <span className="font-[500]">{formatCurrency(pricingDetails.setup_fee)}</span>
                                                    </div>
                                                )}
                                                <div className="border-t pt-2 flex justify-between font-[600]">
                                                    <span>One-time Total</span>
                                                    <span>{formatCurrency((pricingDetails.security_deposit || 0) + (pricingDetails.setup_fee || 0))}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row justify-between w-full px-4 pb-4 font-[500]">
                                            <div>
                                                <h1 className="text-[#000000CC]">Initial Payment Due</h1>
                                                <div className="flex flex-col md:flex-row gap-3 text-[#00000061] mt-3">
                                                    <h1>First month + one-time fees</h1>
                                                </div>
                                            </div>
                                            <div className="text-[#000000CC] text-[12px] font-[600]">
                                                {formatCurrency(initialPaymentDue)}
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-4 rounded mb-4">
                                            <h2 className="text-[11px] font-[600] text-green-800 mb-3">Contract Summary ({pricingDetails.duration || 1} Month{(pricingDetails.duration || 1) > 1 ? 's' : ''})</h2>
                                            <div className="space-y-2 text-[10px]">
                                                <div className="flex justify-between">
                                                    <span className="text-green-700">Total Monthly Charges</span>
                                                    <span className="font-[500]">{formatCurrency(pricingDetails.subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-700">Tax ({((pricingDetails.tax_rate || 0) * 100).toFixed(1)}%)</span>
                                                    <span className="font-[500]">{formatCurrency(pricingDetails.tax_amount)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-700">One-time Fees</span>
                                                    <span className="font-[500]">{formatCurrency((pricingDetails.security_deposit || 0) + (pricingDetails.setup_fee || 0))}</span>
                                                </div>
                                                <div className="border-t-2 border-green-300 pt-2 flex justify-between font-[700] text-[12px]">
                                                    <span>Total Contract Value</span>
                                                    <span className="text-green-800">{formatCurrency(pricingDetails.final_amount)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative flex flex-col md:flex-row items-start justify-start px-4">
                                            <span className="absolute top-[5px] left-[20px] w-[2px] h-[2px] bg-[#0955AC] rounded-full" />
                                            <p className="text-[8.5px] text-[#00000061] ml-4">
                                                Pricing reflects your booking selections. Final charges may adjust if booking details change.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <h3 className="text-[14px] font-semibold">Your booking is confirmed!</h3>
                                            </div>
                                            <p className="text-sm text-gray-600">A confirmation email has been sent to your email address with all booking details.</p>
                                        </div>

                                        <button
                                            onClick={handleDownloadSlip}
                                            className="w-full mb-3 border border-[#0955AC] text-[#0955AC] font-semibold py-3 px-4 rounded-md transition-colors hover:bg-[#0955AC] hover:text-white"
                                        >
                                            Download Confirmation Slip (PDF)
                                        </button>

                                        <button
                                            onClick={handleBackToHome}
                                            className="w-full bg-[#0955AC] hover:bg-[#074a8f] text-white font-bold py-3 px-4 rounded-md transition-colors"
                                        >
                                            Back to Warehouse Listings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BookingSummary;