import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// Storage & Fulfillment is an optional add-on service (pick, pack, and ship
// handling on the client's behalf) priced as a share of the base monthly rate.
// Vendors can set their own rate per listing; falls back to the platform default.
const DEFAULT_FULFILLMENT_SERVICE_RATE = 0.15;
const fulfillmentRateFor = (warehouse) =>
    warehouse?.fulfillment_fee_rate ? Number(warehouse.fulfillment_fee_rate) / 100 : DEFAULT_FULFILLMENT_SERVICE_RATE;

const WarehousePayments = () => {
    const [selectedPayment, setSelectedPayment] = useState("Credit Card");
    const [slipNumber, setSlipNumber] = useState("");
    const [slipPdf, setSlipPdf] = useState(null);
    const [bookingData, setBookingData] = useState(null);
    const [warehouseInfo, setWarehouseInfo] = useState(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [paymentOption, setPaymentOption] = useState("full"); // full or deposit
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Debug flag - set to true when debugging pricing calculations
    const DEBUG_PRICING = true;
    const [pricingDetails, setPricingDetails] = useState({
        monthly_rate: 0,
        security_deposit: 0,
        setup_fee: 0,
        tax_rate: 0,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        final_amount: 0,
        add_ons_cost: 0,
        monthly_total: 0,
        duration: 1,
        duration_months: 1,
        space_utilization: 0,
        required_space: 0
    });
    
    // Load saved booking data from session storage when component mounts
    useEffect(() => {
        const savedData = sessionStorage.getItem('warehouseBookingData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setBookingData(parsedData);
                
                // If warehouse_id is available, fetch warehouse details
                if (parsedData.warehouse_id) {
                    fetchWarehouseDetails(parsedData.warehouse_id, parsedData);
                }
            } catch (error) {
                console.error('Error parsing saved booking data:', error);
                toast.error('Error loading saved booking information');
            }
        } else {
            // No saved data, redirect back to booking page
            toast.error('No booking information found. Please start the booking process again.');
            setTimeout(() => {
                router.visit('/warehouse-bookings/', {
                    method: 'get'
                });
            }, 2000);
        }
    }, []);
    
    // Recalculate pricing when warehouse info or booking data changes
    useEffect(() => {
        if (warehouseInfo && bookingData) {
            calculatePricing(warehouseInfo, bookingData);
        }
    }, [warehouseInfo, bookingData]);
    
    /**
     * Fetches warehouse details from the server based on warehouse ID
     */
    const fetchWarehouseDetails = async (warehouseId, bookingContext = null) => {
        setIsSubmitting(true);
        try {
            const response = await axios.get(`/api/warehouse-units/${warehouseId}`, {
                timeout: 10000 // 10 second timeout
            });

            const payload = response.data?.data ?? response.data ?? null;

            if (payload) {
                setWarehouseInfo(payload);
                // Calculate pricing based on warehouse data and booking duration
                calculatePricing(payload, bookingContext);
            } else {
                toast.error('Unable to load warehouse details. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching warehouse details:', error);
            if (error.response) {
                console.error('Server error:', error.response.data);
            } else if (error.request) {
                console.error('Network error - no response received');
            } else {
                console.error('Request setup error:', error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    /**
     * Calculates pricing details based on warehouse unit pricing and booking duration
     */
    const calculatePricing = (warehouse, currentBookingData = null) => {
        const bookingDataToUse = currentBookingData || bookingData;

        if (DEBUG_PRICING) {
            console.log('calculatePricing called with:', {
                warehouseLoaded: Boolean(warehouse),
                bookingData: bookingDataToUse
            });
        }

        if (!warehouse || !bookingDataToUse) {
            if (DEBUG_PRICING) console.log('Clearing pricing details - missing warehouse or booking data');
            setPricingDetails({
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
            });
            return;
        }

        try {
            const durationMonths = parseDuration(bookingDataToUse.storage_duration);

            const rawRequiredSpace = Number(bookingDataToUse.required_space);
            const requiredSpace = Number.isFinite(rawRequiredSpace) && rawRequiredSpace > 0
                ? rawRequiredSpace
                : Number(warehouse.total_area || 0);

            const baseMonthlyRate = parseFloat(warehouse.monthly_rate || warehouse.price || warehouse.base_price || 0) || 0;
            const securityDeposit = parseFloat(warehouse.security_deposit || baseMonthlyRate * 0.5 || 0) || 0;
            const setupFee = parseFloat(warehouse.setup_fee || baseMonthlyRate * 0.2 || 0) || 0;
            // Tax is set per-vendor on their listing; no platform-wide default is
            // assumed if a vendor hasn't set one.
            const taxRate = Number(warehouse.tax_rate) || 0;
            const totalArea = parseFloat(warehouse.total_area || 1) || 1;

            const spaceUtilization = Math.min(requiredSpace / totalArea, 1);
            const monthlyRate = baseMonthlyRate * spaceUtilization;
            const addOnsCost = (warehouse?.offers_fulfillment && bookingDataToUse?.fulfillment_service)
                ? baseMonthlyRate * fulfillmentRateFor(warehouse)
                : 0;
            const monthlyTotal = monthlyRate + addOnsCost;
            const subtotal = monthlyTotal * durationMonths;
            const taxAmount = subtotal * taxRate;
            const totalBeforeFees = subtotal + taxAmount;
            const finalAmount = totalBeforeFees + securityDeposit + setupFee;

            const calculatedPricing = {
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
            };

            if (DEBUG_PRICING) console.log('Calculated pricing:', calculatedPricing);

            setPricingDetails(calculatedPricing);
        } catch (error) {
            console.error('Error calculating pricing:', error);
            setPricingDetails({
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
            });
        }
    };
    
    /**
     * Parses duration string to get number of months
     */
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
    
    /**
     * Formats currency for display
     */
    const formatCurrency = (amount) => {
        if (typeof amount !== 'number') return 'LKR 0.00';
        return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleConfirmBooking = async () => {
        if (isSubmitting) {
            return;
        }

        const newErrors = {};

        if (!termsAccepted) {
            newErrors.terms = 'You must accept the terms and conditions';
        }

        if (selectedPayment === "Bank Transfer") {
            if (!slipNumber.trim()) {
                newErrors.slipNumber = 'Reference number is required for bank transfers';
            }

            if (!slipPdf) {
                newErrors.slipPdf = 'Payment receipt is required for bank transfers';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fix the errors before proceeding');
            return;
        }

        if (!bookingData) {
            toast.error('No booking information found');
            return;
        }

        const paymentData = {
            payment_method: selectedPayment,
            payment_option: paymentOption,
            reference_number: slipNumber?.trim() || null,
            payment_receipt: slipPdf ? 'uploaded' : null,
        };

        const updatedBookingData = {
            ...bookingData,
            payment: paymentData
        };
        sessionStorage.setItem('warehouseBookingData', JSON.stringify(updatedBookingData));

        const normalizedPaymentMethod = paymentData.payment_method
            .toLowerCase()
            .replace(/\s+/g, '_');

        const rawSpecialRequirements = updatedBookingData.special_requirements ?? updatedBookingData.specialRequirements ?? null;
        const normalizedSpecialRequirements = Array.isArray(rawSpecialRequirements)
            ? rawSpecialRequirements.join(', ')
            : typeof rawSpecialRequirements === 'object' && rawSpecialRequirements !== null
                ? JSON.stringify(rawSpecialRequirements)
                : rawSpecialRequirements;

        const amenityList = Array.isArray(updatedBookingData.amenities)
            ? updatedBookingData.amenities
            : typeof updatedBookingData.amenities === 'string'
                ? updatedBookingData.amenities.split(',').map((item) => item.trim()).filter(Boolean)
                : [];

        const warehouseId = updatedBookingData.warehouse_id
            || updatedBookingData.warehouseId
            || updatedBookingData.warehouse?.id
            || updatedBookingData.id
            || null;

        if (!warehouseId) {
            toast.error('Missing warehouse reference. Please restart the booking process.');
            return;
        }

        const durationMonths = updatedBookingData.duration_months
            || updatedBookingData.durationMonths
            || parseDuration(updatedBookingData.storage_duration)
            || pricingDetails.duration
            || 1;

        const monthlyRate = Number(
            pricingDetails.monthly_rate
            ?? updatedBookingData.monthly_rate
            ?? updatedBookingData.monthlyRate
            ?? updatedBookingData?.pricing?.monthly_rate
            ?? 0
        );

        const addOnsCost = Number(
            pricingDetails.add_ons_cost
            ?? updatedBookingData.add_ons_cost
            ?? updatedBookingData?.pricing?.add_ons_cost
            ?? 0
        );

        const securityDeposit = Number(
            pricingDetails.security_deposit
            ?? updatedBookingData.security_deposit
            ?? updatedBookingData.securityDeposit
            ?? updatedBookingData?.pricing?.security_deposit
            ?? 0
        );

        const setupFee = Number(
            pricingDetails.setup_fee
            ?? updatedBookingData.setup_fee
            ?? updatedBookingData.setupFee
            ?? updatedBookingData?.pricing?.setup_fee
            ?? 0
        );

        const subtotal = Number(
            pricingDetails.subtotal
            ?? updatedBookingData.subtotal
            ?? updatedBookingData?.pricing?.subtotal
            ?? (monthlyRate + addOnsCost) * durationMonths
        );

        const taxAmount = Number(
            pricingDetails.tax_amount
            ?? updatedBookingData.tax_amount
            ?? updatedBookingData.taxAmount
            ?? updatedBookingData?.pricing?.tax_amount
            ?? 0
        );

        const totalAmount = Number(
            pricingDetails.total_amount
            ?? updatedBookingData.total_amount
            ?? updatedBookingData.totalAmount
            ?? subtotal + taxAmount
        );

        const finalAmount = Number(
            pricingDetails.final_amount
            ?? updatedBookingData.final_amount
            ?? updatedBookingData.finalAmount
            ?? updatedBookingData?.pricing?.final_amount
            ?? totalAmount + securityDeposit + setupFee
        );

        const formattedData = {
            warehouse_id: warehouseId,
            company_name: updatedBookingData.company_name || updatedBookingData.companyName || '',
            contact_person: updatedBookingData.contact_person
                || updatedBookingData.contactPerson
                || `${updatedBookingData.firstName || ''} ${updatedBookingData.lastName || ''}`.trim(),
            email: updatedBookingData.email || updatedBookingData.contactEmail || '',
            phone: updatedBookingData.phone || updatedBookingData.contactPhone || updatedBookingData.phoneNumber || '',
            company_address: updatedBookingData.company_address || updatedBookingData.companyAddress || '',
            storage_type: updatedBookingData.storage_type || updatedBookingData.storageType || 'General Storage',
            fulfillment_service: Boolean(updatedBookingData.fulfillment_service || updatedBookingData.fulfillmentService),
            required_space: Number(updatedBookingData.required_space || updatedBookingData.requiredSpace || updatedBookingData.spaceNeeded || 0),
            goods_type: updatedBookingData.goods_type || updatedBookingData.goodsType || 'General',
            goods_description: updatedBookingData.goods_description || updatedBookingData.goodsDescription || 'General goods',
            estimated_weight: updatedBookingData.estimated_weight || updatedBookingData.estimatedWeight || null,
            special_requirements: normalizedSpecialRequirements || null,
            amenities: amenityList,
            start_date: updatedBookingData.start_date || updatedBookingData.startDate || updatedBookingData.move_in_date || updatedBookingData.moveInDate,
            end_date: updatedBookingData.end_date || updatedBookingData.endDate || updatedBookingData.move_out_date || null,
            duration_months: durationMonths,
            access_hours: updatedBookingData.access_hours || updatedBookingData.accessHours || updatedBookingData.access_frequency || '24/7',
            special_instructions: updatedBookingData.special_instructions || updatedBookingData.specialInstructions || null,
            monthly_rate: monthlyRate,
            security_deposit: securityDeposit,
            setup_fee: setupFee,
            add_ons_cost: addOnsCost,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            final_amount: finalAmount,
            terms_accepted: termsAccepted,
            insurance_required: updatedBookingData.insurance_required || updatedBookingData.insuranceRequired || false,
            notes: updatedBookingData.notes || null,
            payment_method: normalizedPaymentMethod,
            payment_option: paymentData.payment_option,
            payment_reference: paymentData.reference_number,
        };

        toast.info('Processing your booking...');
        setIsSubmitting(true);

        try {
            const response = await axios.post('/warehouse-bookings/book', formattedData);
            const data = response.data;

            if (!data?.success) {
                throw new Error(data?.message || 'Failed to create booking.');
            }

            toast.success('Booking created successfully!');
            sessionStorage.removeItem('warehouseBookingData');
            setErrors({});

            const redirectUrl = data.redirect || (data.booking_id ? `/warehouse-bookings/summary/${data.booking_id}` : '/warehouse-bookings/summary');

            setTimeout(() => {
                router.visit(redirectUrl, {
                    method: 'get',
                    preserveScroll: true,
                });
            }, 1200);
        } catch (error) {
            console.error('Error saving booking:', error);

            if (error.response?.status === 422) {
                const validationErrors = error.response.data?.errors || {};
                setErrors(validationErrors);
                const firstError = Object.values(validationErrors)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : firstError || 'Validation error.');
            } else if (error.response?.status === 401) {
                const message = error.response.data?.message || 'Please log in to make a booking.';
                toast.error(message);
                const redirect = error.response.data?.redirect;
                if (redirect) {
                    setTimeout(() => {
                        router.visit(redirect, { method: 'get' });
                    }, 1200);
                }
            } else {
                toast.error(error.response?.data?.message || error.message || 'An error occurred while processing your booking');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackBooking = () => {
        router.visit("/warehouse-bookings/checkout", {
            method: "get",
            preserveScroll: true,
        });
    };

    const handlePaymentBooking = () => {
        router.visit("/warehouse-bookings/payments", {
            method: "get",
            preserveScroll: true,
        });
    };

    const handleWarehouseList = () => {
        router.visit("/warehouse-bookings/", {
            method: "get",
            preserveScroll: true,
        });
    };

    return (
        <div>
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            <div className="flex flex-col xl:flex-row justify-center items-center xl:items-start px-10 py-10 gap-10">
                <div className="flex flex-col gap-10">
                    <div className="flex flex-row items-start justify-center pb-10">
                        <div
                            className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer"
                            onClick={handleWarehouseList}
                        >
                            <div
                                className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                style={{
                                    boxShadow: "0 0 10px 8px #1565c088", // blur
                                }}
                            />
                            <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                Select Warehouse
                            </h1>
                        </div>
                        <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                        <div
                            className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer"
                            onClick={handleBackBooking}
                        >
                            <div
                                className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                style={{
                                    boxShadow: "0 0 10px 8px #1565c088", // blur
                                }}
                            />
                            <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                Booking Info
                            </h1>
                        </div>
                        <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                        <div
                            className="flex flex-col justify-center items-center gap-3 cursor-pointer"
                            onClick={handlePaymentBooking}
                        >
                            <div
                                className="w-[18px] h-[18px] rounded-full bg-[#1565c0]"
                                style={{
                                    boxShadow: "0 0 10px 8px #1565c088", // blur
                                }}
                            />
                            <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                Payments
                            </h1>
                        </div>
                        <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
                        <div
                            className="md:flex flex-col justify-center hidden items-center cursor-pointer"
                            onClick={handleConfirmBooking}
                        >
                            <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
                            <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                                Booking Confirmation
                            </h1>
                        </div>
                    </div>

                    <div
                        className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-auto bg-[#FFFFFF] px-10 py-10"
                        style={{
                            borderLeftWidth: "0.2px",
                            borderTopWidth: "0.2px",
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <h1 className="text-[20px] font-[700]">
                            Payment Methods
                        </h1>

                        {/* method selector */}
                        <div className="flex flex-row flex-wrap items-center gap-10 text-[10px] font-[600] text-[#00000080] py-2">
                            <label className="flex flex-row justify-center items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="Credit Card"
                                    checked={selectedPayment === "Credit Card"}
                                    onChange={() =>
                                        setSelectedPayment("Credit Card")
                                    }
                                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:ring-transparent  focus:outline-none transition-colors cursor-pointer"
                                />
                                <span className="peer-checked:text-[#000000] text-[#00000080] text-[16px] font-[600]">
                                    Credit Card
                                </span>
                            </label>

                            <label className="flex flex-row justify-center items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="PayPal"
                                    checked={selectedPayment === "PayPal"}
                                    onChange={() =>
                                        setSelectedPayment("PayPal")
                                    }
                                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:outline-none focus:ring-transparent  transition-colors cursor-pointer"
                                />
                                <span className="peer-checked:text-[#000000] text-[#00000080] text-[16px] font-[600]">
                                    PayPal
                                </span>
                            </label>

                            <label className="flex flex-row justify-center items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="Bank Transfer"
                                    checked={
                                        selectedPayment === "Bank Transfer"
                                    }
                                    onChange={() =>
                                        setSelectedPayment("Bank Transfer")
                                    }
                                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:outline-none focus:ring-transparent transition-colors cursor-pointer"
                                />
                                <span className="peer-checked:text-[#000000] text-[#00000080] text-[16px] font-[600]">
                                    Bank Transfer
                                </span>
                            </label>
                        </div>

                        {/* only show when Bank Transfer is selected */}
                        {selectedPayment === "Bank Transfer" && (
                            <div className="mt-4 grid lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px]/[24px] font-[600]">
                                        Reference Number :
                                    </label>
                                    <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                                        <input
                                            value={slipNumber}
                                            onChange={(e) =>
                                                setSlipNumber(e.target.value)
                                            }
                                            className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                            placeholder="Enter reference number"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px]/[24px] font-[600]">
                                        Upload Payment Receipt (PDF) :
                                    </label>
                                    <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px] flex items-center px-3">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) =>
                                                setSlipPdf(
                                                    e.target.files?.[0] ?? null
                                                )
                                            }
                                            className="w-full text-[12px] file:mr-3 file:rounded file:border-0 file:px-3 file:py-2 file:bg-[#F3F4F6] file:text-[12px] file:cursor-pointer"
                                        />
                                    </div>
                                    {/* optional: small hint */}
                                    <p className="text-[10px] text-[#00000080] mt-1">
                                        Only PDF files are allowed.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-[316px] bg-[#FFFFFF] px-10 py-10"
                        style={{
                            borderLeftWidth: "0.2px",
                            borderTopWidth: "0.2px",
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <h1 className="text-[20px] font-[700]">
                            Select Payment Option
                        </h1>

                        <div className="flex flex-col gap-5 py-10">
                            <div className="flex flex-row items-start gap-4">
                                <input
                                    type="radio"
                                    name="paymentOption"
                                    value="full"
                                    checked={paymentOption === "full"}
                                    onChange={() => setPaymentOption("full")}
                                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:ring-transparent focus:outline-none transition-colors mt-[1.5px] cursor-pointer"
                                />
                                <div className="poppins text-[12px] flex flex-col justify-center items-start">
                                    <h1 className="font-[600]">
                                        Pay full amount now
                                    </h1>
                                    <h1 className="font-[500]">
                                        Complete the entire payment before storage begins.
                                    </h1>
                                </div>
                            </div>
                            <div className="flex flex-row items-start gap-4">
                                <input
                                    type="radio"
                                    name="paymentOption"
                                    value="deposit"
                                    checked={paymentOption === "deposit"}
                                    onChange={() => setPaymentOption("deposit")}
                                    className="peer appearance-none w-[14px] h-[14px] rounded-full border border-[#0955AC] bg-[#0955AC] focus:ring-transparent focus:outline-none transition-colors mt-[1.5px] cursor-pointer"
                                />
                                <div className="poppins text-[12px] flex flex-col justify-center items-start">
                                    <h1 className="font-[600]">
                                        Pay deposit now, remaining monthly
                                    </h1>
                                    <h1 className="font-[500]">
                                        Pay initial deposit and setup fee now, then monthly payments.
                                    </h1>
                                </div>
                            </div>

                            <div className="w-full md:h-[74px] bg-[#E2F6DC] rounded-[7px] text-[12px] px-5 py-5">
                                <div className="flex flex-col md:flex-row md:gap-5">
                                    <h1 className="font-[500] text-[#000000B2] w-[180px]">
                                        Initial payment:
                                    </h1>
                                    <h1 className="font-[600]">
                                        {formatCurrency(pricingDetails.monthly_rate + pricingDetails.security_deposit + pricingDetails.setup_fee)} (Setup + First Month)
                                    </h1>
                                </div>
                                <div className="flex flex-col md:flex-row md:gap-5">
                                    <h1 className="font-[500] text-[#000000B2] w-[180px]">
                                        Monthly payments:
                                    </h1>
                                    <h1 className="font-[600]">
                                        {formatCurrency(pricingDetails.monthly_total || pricingDetails.monthly_rate)} (due monthly)
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </div>

                        <div
                        className="border-l-[0.2px] rounded-[10px] lg:w-[874px] lg:h-[72px] bg-[#D8E4F2] px-5 py-5"
                        style={{
                            borderLeftWidth: "0.2px",
                            borderTopWidth: "0.2px",
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <div className="flex flex-row gap-5 text-[10px] font-[400]">
                            <input
                                className="size-[20px] border-[0.5px] border-[#0955AC] bg-[#FFFFFF] rounded-[4px] cursor-pointer focus:ring-transparent"
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <div>
                                <h1 className="">
                                    I agree to the{" "}
                                    <span className="text-[#0955AC]">
                                        Terms and Conditions
                                    </span>{" "}
                                    and{" "}
                                    <span className="text-[#0955AC]">
                                        Privacy Policy.
                                    </span>
                                </h1>
                                <h1>
                                    I confirm that I am authorized to make this payment and that all information is accurate.
                                </h1>
                                {errors.terms && (
                                    <div className="text-red-500 text-xs mt-1">
                                        {errors.terms}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>                    <div>
                        <div
                            onClick={handleBackBooking}
                            className="rounded-[5px] flex justify-center items-center text-[#0955AC] font-[700] text-[12px] lg:w-[874px] h-[50px] border-[2px] border-[#0955AC] px-5 cursor-pointer transition-colors"
                        >
                            {" "}
                            Back{" "}
                        </div>

                        <div
                            onClick={isSubmitting ? undefined : handleConfirmBooking}
                            aria-disabled={isSubmitting}
                            className={`rounded-[5px] flex mt-5 justify-center items-center text-[#FFFFFF] font-[700] text-[12px] lg:w-[874px] h-[50px] bg-[#0955AC] px-5 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-[#074a8f]'}`}
                        >
                            {isSubmitting ? 'PROCESSING...' : 'CONFIRM BOOKING'}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-10">
                    {/* right side mini card 1 */}
                    <div
                        className="md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-5"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        {/* upper section */}
                        <div className="flex flex-col md:flex-row gap-3 items-center border-b-[1px] pb-5 border-[#00000026]">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h1 className="figtree text-[20px] font-[700] ">
                                    {warehouseInfo?.name || 'Central Storage Facility - Bay A'}
                                </h1>
                                <div className="poppins flex flex-row gap-5 text-[9px] text-[#000000B2] font-[500]">
                                    <div className="flex flex-col gap-2 justify-center items-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <h1>{warehouseInfo?.total_area ? `${warehouseInfo.total_area.toLocaleString()} sq ft` : '5,000 sq ft'}</h1>
                                    </div>
                                    <div className="flex flex-col gap-2 justify-center items-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <h1>Secure</h1>
                                    </div>
                                    <div className="flex flex-col gap-2 justify-center items-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <h1>
                                            {warehouseInfo?.amenities?.includes('climate_control') || bookingData?.climate_controlled 
                                                ? 'Climate Control' 
                                                : 'Standard Storage'}
                                        </h1>
                                    </div>
                                    <div className="flex flex-col gap-2 justify-center items-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h1>
                                            {warehouseInfo?.amenities?.includes('24_7_access') || bookingData?.access_frequency === 'daily' 
                                                ? '24/7 Access' 
                                                : 'Business Hours'}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* end */}
                        {/* bottom section */}
                        <div className="py-10 px-20">
                            <div className="flex flex-row gap-5 justify-center items-start">
                                <div className="flex flex-col items-center mt-2">
                                    <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                                    <div className="h-[77px] w-[1.5px] bg-[#0955AC]"></div>
                                    <div className="size-[17px] bg-[#0955AC] rounded-full"></div>
                                </div>
                                <div className="figtree flex flex-col gap-10 text-[14px] font-[500] text-[#00000080]">
                                    <div>
                                        <h1 className="text-[16px] font-[700] text-[#000000]">
                                            Location: {warehouseInfo?.address || 'Premium Location'}
                                        </h1>
                                        <h1>Move-in Date: {bookingData?.move_in_date || 'June 23rd, 2025'}</h1>
                                        {/* <h1>Move-in Time: {bookingData?.move_in_time || '10:00 AM'}</h1> */}
                                    </div>
                                    <div>
                                        <h1 className="text-[16px] font-[700] text-[#000000]">
                                            Storage Duration: {bookingData?.storage_duration || '6 Months'}
                                        </h1>
                                        <h1>Storage Type: {bookingData?.storage_type || 'General Storage'}</h1>
                                        <h1>Required Space: {bookingData?.required_space || '1,000'} sq ft</h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* end */}
                    </div>
                    {/* right side mini card 2 */}
                    <div
                        className="poppins md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-10 py-10"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <h1 className="font-[600] text-[20px] pb-5">
                            Payment Summary
                        </h1>

                        <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-10 px-10">
                            {/* Storage Details Header */}
                            <h1 className="font-[600] mb-3 text-[#000000D9]">Storage Details</h1>
                            <div className="bg-blue-50 p-3 rounded mb-5">
                                <div className="grid grid-cols-2 gap-4 text-[10px]">
                                    <div>
                                        <p className="font-[600] text-blue-800">Required Space</p>
                                        <p className="text-blue-600">{bookingData?.required_space?.toLocaleString() || '1,000'} sq ft</p>
                                    </div>
                                    <div>
                                        <p className="font-[600] text-blue-800">Storage Type</p>
                                        <p className="text-blue-600">{bookingData?.storage_type || 'General Storage'}</p>
                                    </div>
                                    <div>
                                        <p className="font-[600] text-blue-800">Duration</p>
                                        <p className="text-blue-600">{bookingData?.storage_duration || '1 Month'}</p>
                                    </div>
                                    <div>
                                        <p className="font-[600] text-blue-800">Access Frequency</p>
                                        <p className="text-blue-600">{bookingData?.access_frequency === 'daily' ? '24/7 Access' : (bookingData?.access_frequency || 'Weekly')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-5">
                                <h1 className="font-[600] text-[#000000D9]">Pricing Breakdown</h1>
                            </div>
                            <div className="w-full h-[1px] bg-[#CDD0D4]" />
                            
                            {/* Monthly Rate */}
                            <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                                <div>
                                    <h1 className="text-[#000000CC]">Monthly Rate</h1>
                                    <div className="flex flex-row gap-3 text-[#00000061]">
                                        <h1>{formatCurrency(pricingDetails.monthly_rate)}/month</h1>
                                        <h1 className="text-[#0955AC]">
                                            ({pricingDetails.duration || 1} month{(pricingDetails.duration || 1) > 1 ? 's' : ''})
                                        </h1>
                                    </div>
                                </div>
                                <div className="text-[#000000CC]">{formatCurrency(pricingDetails.subtotal)}</div>
                            </div>

                            {/* Security Deposit */}
                            {pricingDetails.security_deposit > 0 && (
                                <div className="flex flex-col md:flex-row justify-between w-full px-5 font-[500]">
                                    <div>
                                        <h1 className="text-[#000000CC]">Security Deposit</h1>
                                        <div className="flex flex-row gap-3 text-[#00000061]">
                                            <h1>Refundable deposit</h1>
                                            <h1 className="text-[#0955AC]">(One-time)</h1>
                                        </div>
                                    </div>
                                    <div className="text-[#000000CC]">{formatCurrency(pricingDetails.security_deposit)}</div>
                                </div>
                            )}

                            {/* Setup Fee */}
                            {pricingDetails.setup_fee > 0 && (
                                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                                    <div>
                                        <h1 className="text-[#000000CC]">Setup Fee</h1>
                                        <div className="flex flex-row gap-3 text-[#00000061]">
                                            <h1>Initial setup and processing</h1>
                                            <h1 className="text-[#0955AC]">(One-time)</h1>
                                        </div>
                                    </div>
                                    <div className="text-[#000000CC]">{formatCurrency(pricingDetails.setup_fee)}</div>
                                </div>
                            )}

                            {/* Add-ons */}
                            {pricingDetails.add_ons_cost > 0 && (
                                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                                    <div>
                                        <h1 className="text-[#000000CC]">Climate Control</h1>
                                        <div className="flex flex-row gap-3 text-[#00000061]">
                                            <h1>Additional service</h1>
                                            <h1 className="text-[#0955AC]">(Monthly)</h1>
                                        </div>
                                    </div>
                                    <div className="text-[#000000CC]">+{formatCurrency(pricingDetails.add_ons_cost * pricingDetails.duration)}</div>
                                </div>
                            )}

                            {/* Tax */}
                            {pricingDetails.tax_amount > 0 && (
                                <div className="flex flex-col md:flex-row justify-between w-full px-5 font-[500]">
                                    <div>
                                        <h1 className="text-[#000000CC]">Tax</h1>
                                        <div className="flex flex-row gap-3 text-[#00000061]">
                                            <h1>VAT and other taxes</h1>
                                            <h1 className="text-[#0955AC]">({((pricingDetails.tax_rate || 0) * 100).toFixed(1)}%)</h1>
                                        </div>
                                    </div>
                                    <div className="text-[#000000CC]">{formatCurrency(pricingDetails.tax_amount)}</div>
                                </div>
                            )}

                            <div className="w-full h-[1px] bg-[#CDD0D4] my-5" />

                            {/* Space Utilization Info */}
                            {bookingData?.required_space && warehouseInfo?.total_area && 
                             bookingData.required_space < warehouseInfo.total_area && (
                                <div className="bg-blue-50 p-3 rounded mb-5">
                                    <h2 className="text-[11px] font-[600] text-blue-800 mb-1">Space Utilization</h2>
                                    <p className="text-[10px] text-blue-600">
                                        You're using {((bookingData.required_space / warehouseInfo.total_area) * 100).toFixed(1)}% of the total warehouse space 
                                        ({bookingData.required_space.toLocaleString()} / {warehouseInfo.total_area.toLocaleString()} sq ft)
                                    </p>
                                </div>
                            )}

                            <div className="w-full h-[1px] bg-[#CDD0D4]" />

                            <h1 className="font-[600] mt-5 text-[#000000D9]">Payment Summary</h1>

                            {/* Monthly Breakdown */}
                            <div className="bg-gray-50 p-4 rounded mb-4">
                                <h2 className="text-[11px] font-[600] text-gray-800 mb-3">Monthly Charges</h2>
                                <div className="space-y-2 text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Base Monthly Rate ({bookingData?.required_space?.toLocaleString() || '1,000'} sq ft)</span>
                                        <span className="font-[500]">{formatCurrency(pricingDetails.monthly_rate)}</span>
                                    </div>
                                    {pricingDetails.add_ons_cost > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Climate Control Add-on</span>
                                            <span className="font-[500]">+{formatCurrency(pricingDetails.add_ons_cost)}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 flex justify-between font-[600]">
                                        <span>Monthly Subtotal</span>
                                        <span>{formatCurrency(pricingDetails.monthly_total || (pricingDetails.monthly_rate + (pricingDetails.add_ons_cost || 0)))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* One-time Fees */}
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

                            {/* Contract Summary */}
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

                            {/* Initial Payment Summary */}
                            <div className="bg-blue-50 p-4 rounded mb-4">
                                <h2 className="text-[11px] font-[600] text-blue-800 mb-3">Initial Payment Required</h2>
                                <div className="space-y-2 text-[10px]">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">
                                            {paymentOption === 'full' ? 'Full Amount Payment' : 'Setup + First Month Payment'}
                                        </span>
                                        <span className="font-[500]">
                                            {paymentOption === 'full' 
                                                ? formatCurrency(pricingDetails.final_amount)
                                                : formatCurrency(pricingDetails.monthly_rate + pricingDetails.security_deposit + pricingDetails.setup_fee)
                                            }
                                        </span>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-blue-600 text-[9px]">
                                            {paymentOption === 'full' 
                                                ? 'Complete payment for entire contract duration' 
                                                : 'Remaining monthly payments will be charged automatically'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quote Validity */}
                            {pricingDetails.final_amount > 0 && (
                                <div className="bg-green-50 p-3 rounded mb-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-[11px] font-[600] text-green-800">Quote Valid Until</h2>
                                            <p className="text-[10px] text-green-600">
                                                {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long', 
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-[11px] font-[600] text-green-800">Space Available</h2>
                                            <p className="text-[10px] text-green-600">
                                                {warehouseInfo?.is_available ? 'Yes' : 'Limited'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="relative flex flex-col md:flex-row items-start justify-start px-5">
                                <span className="absolute top-[5px] left-[20px] w-[2px] h-[2px] bg-[#0955AC] rounded-full" />
                                <p className="text-[8.5px] text-[#00000061] ml-4">
                                    Prices shown are final and confirmed. Payment processing will begin immediately after confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehousePayments;