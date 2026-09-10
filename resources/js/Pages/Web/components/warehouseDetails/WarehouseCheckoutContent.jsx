import React, { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Storage & Fulfillment is an optional add-on service (pick, pack, and ship
// handling on the client's behalf) priced as a share of the base monthly rate.
// Vendors can set their own rate per listing; falls back to the platform default.
const DEFAULT_FULFILLMENT_SERVICE_RATE = 0.15;
const fulfillmentRateFor = (warehouse) =>
    warehouse?.fulfillment_fee_rate ? Number(warehouse.fulfillment_fee_rate) / 100 : DEFAULT_FULFILLMENT_SERVICE_RATE;

const WarehouseCheckoutContent = () => {
    const [countryCode, setCountryCode] = useState("lk");
    const [bookingData, setBookingData] = useState(null);
    const [warehouseInfo, setWarehouseInfo] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Debug flag - set to true when debugging pricing calculations
    const DEBUG_PRICING = true;
    const [pricingDetails, setPricingDetails] = useState({
        monthly_rate: 0,
        security_deposit: 0,
        setup_fee: 0,
        tax_rate: 0,
        total_amount: 0,
        tax_amount: 0,
        final_amount: 0
    });
    
    // Availability tracking state
    const [availabilityInfo, setAvailabilityInfo] = useState({
        totalSpace: 0,
        availableSpace: 0,
        bookedSpace: 0,
        timeframe: null
    });
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState(null);
    const [formData, setFormData] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        phone: ''
    });
    const [userData, setUserData] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [userDataError, setUserDataError] = useState(null);
    const [isEditingUserData, setIsEditingUserData] = useState(false);

    // Fetch current user data
    const fetchUserData = async () => {
        setIsLoadingUser(true);
        setUserDataError(null);
        
        try {
            // Try primary endpoint first
            let response;
            try {
                response = await axios.get('/api/user/profile', {
                    timeout: 10000
                });
            } catch (primaryError) {
                console.log('Primary profile endpoint failed, trying alternative...');
                // Try alternative endpoint if primary fails
                response = await axios.get('/profile', {
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            if (response.data && (response.data.user || response.data.props?.auth?.user)) {
                const user = response.data.user || response.data.props?.auth?.user || response.data;
                console.log('User data loaded:', user);
                setUserData(user);
                
                // Pre-populate form with user data if form fields are empty
                setFormData(prev => ({
                    company_name: prev.company_name || user.company_name || '',
                    contact_person: prev.contact_person || user.name || '',
                    email: prev.email || user.email || '',
                    phone: prev.phone || user.phone || ''
                }));
            } else {
                console.warn('No user data found in response:', response.data);
                setUserDataError('No user data available');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                url: error.config?.url
            });
            setUserDataError(`Unable to load user profile: ${error.message}`);
            
            // If it's a 401/403 error, user might not be logged in
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.warn('User appears to not be authenticated');
                setUserDataError('Please log in to continue');
            }
        } finally {
            setIsLoadingUser(false);
        }
    };
    
    // Load saved booking data from session storage when component mounts
    useEffect(() => {
        const savedData = sessionStorage.getItem('warehouseBookingData');
        
        // Debug: Log current page props to see what's available
        console.log('Page props available:', window.page?.props);
        console.log('Auth data from page props:', window.page?.props?.auth);
        
        // Check if user data is available in page props first
        const pageUser = window.page?.props?.auth?.user;
        if (pageUser) {
            console.log('Found user data in page props:', pageUser);
            setUserData(pageUser);
            setFormData(prev => ({
                company_name: prev.company_name || pageUser.company_name || '',
                contact_person: prev.contact_person || pageUser.name || '',
                email: prev.email || pageUser.email || '',
                phone: prev.phone || pageUser.phone || ''
            }));
            setIsLoadingUser(false);
        } else {
            // Fetch user data from API if not in page props
            fetchUserData();
        }
        
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setBookingData(parsedData);
                
                // Populate form fields with saved data if available (this will override user data)
                if (parsedData.company_name || parsedData.contact_person || parsedData.email || parsedData.phone) {
                    setFormData({
                        company_name: parsedData.company_name || '',
                        contact_person: parsedData.contact_person || '',
                        email: parsedData.email || '',
                        phone: parsedData.phone || ''
                    });
                }
                
                // If warehouse_id is available, fetch warehouse details
                if (parsedData.warehouse_id) {
                    fetchWarehouseDetails(parsedData.warehouse_id);
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
    
    // Recalculate pricing when booking data or warehouse info changes
    useEffect(() => {
        if (warehouseInfo && bookingData) {
            calculatePricing(warehouseInfo);
        }
    }, [warehouseInfo, bookingData, availabilityInfo.availableSpace, availabilityInfo.totalSpace]);
    
    // Fetch availability when move-in date, move-out date, or storage duration changes
    useEffect(() => {
        if (bookingData?.warehouse_id && bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration)) {
            fetchAvailability(
                bookingData.warehouse_id, 
                bookingData.move_in_date, 
                bookingData.storage_duration,
                bookingData.move_out_date
            );
        } else {
            // Reset to total space when no date selection
            setAvailabilityInfo({
                totalSpace: warehouseInfo?.total_area || 0,
                availableSpace: warehouseInfo?.total_area || 0,
                bookedSpace: 0,
                timeframe: null
            });
        }
    }, [bookingData?.warehouse_id, bookingData?.move_in_date, bookingData?.move_out_date, bookingData?.storage_duration, warehouseInfo?.total_area]);
    
    // Auto-adjust required space when availability changes
    useEffect(() => {
        const hasDateSelection = Boolean(bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration));
        if (!hasDateSelection) return;

        const maxSpace = Math.max(availabilityInfo.availableSpace || 0, 0);
        const currentSpace = Number(bookingData?.required_space || 0);

        // Auto-fill if no space specified
        if (!bookingData?.required_space && maxSpace > 0) {
            setBookingData(prev => ({
                ...(prev || {}),
                required_space: maxSpace
            }));
        }
        // Auto-adjust if exceeds available space
        else if (currentSpace > maxSpace && maxSpace > 0) {
            setBookingData(prev => ({
                ...(prev || {}),
                required_space: maxSpace
            }));
        }
        // Clear if no space available
        else if (maxSpace === 0 && currentSpace > 0) {
            setBookingData(prev => ({
                ...(prev || {}),
                required_space: ''
            }));
        }
    }, [bookingData?.move_in_date, bookingData?.move_out_date, bookingData?.storage_duration, availabilityInfo.availableSpace]);
    
    /**
     * Fetches warehouse details from the server based on warehouse ID
     * 
     * This function:
     * 1. Makes an API request to get warehouse details
     * 2. Updates the warehouseInfo state with the response
     * 3. Handles errors gracefully without disrupting the UI
     * 
     * @param {number|string} warehouseId - The ID of the warehouse to fetch
     */
    const fetchWarehouseDetails = async (warehouseId) => {
        setIsSubmitting(true);
        try {
            // Try to fetch warehouse details
            const response = await axios.get(`/api/warehouse-units/${warehouseId}`, {
                timeout: 10000 // 10 second timeout
            });

            const payload = response.data?.data ?? response.data ?? null;

            if (payload) {
                setWarehouseInfo(payload);
                // Calculate pricing based on warehouse data and booking duration
                calculatePricing(payload);
            }
        } catch (error) {
            console.error('Error fetching warehouse details:', error);
            // Don't show error to user as this is background data fetching
            // Just log it and continue with what data we have
            if (error.response) {
                // Server responded with an error status (4xx, 5xx)
                console.error('Server error:', error.response.data);
            } else if (error.request) {
                // Request made but no response received (network issues)
                console.error('Network error - no response received');
            } else {
                // Error in setting up the request
                console.error('Request setup error:', error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    /**
     * Calculates pricing details based on warehouse unit pricing and booking duration
     * 
     * @param {object} warehouse - The warehouse unit data
     * @param {object} currentBookingData - Optional booking data for real-time calculations
     */
    const calculatePricing = (warehouse, currentBookingData = null) => {
        const bookingDataToUse = currentBookingData || bookingData;

        if (DEBUG_PRICING) {
            console.log('calculatePricing called with:', {
                warehouseLoaded: Boolean(warehouse),
                bookingData: bookingDataToUse,
                availabilityInfo,
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
            const fallbackSpace = Number(
                availabilityInfo?.availableSpace ??
                availabilityInfo?.totalSpace ??
                warehouse.total_area ??
                0
            );
            const requiredSpace = Number.isFinite(rawRequiredSpace) && rawRequiredSpace > 0
                ? rawRequiredSpace
                : Math.max(fallbackSpace, 0);

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
     * 
     * @param {string} durationStr - Duration string like "1 Month", "6 Months"
     * @returns {number} Number of months
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
     * Fetches warehouse availability for selected dates
     */
    const fetchAvailability = async (warehouseId, moveInDate, storageDuration, moveOutDate = null) => {
        if (!warehouseId || !moveInDate || (!storageDuration && !moveOutDate)) {
            setAvailabilityInfo({
                totalSpace: warehouseInfo?.total_area || 0,
                availableSpace: warehouseInfo?.total_area || 0,
                bookedSpace: 0,
                timeframe: null
            });
            setAvailabilityError(null);
            setAvailabilityLoading(false);
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError(null);

        try {
            const params = new URLSearchParams({
                start_date: moveInDate
            });
            
            if (moveOutDate) {
                params.append('end_date', moveOutDate);
            } else if (storageDuration) {
                const durationMonths = parseDuration(storageDuration);
                params.append('duration_months', String(durationMonths || 1));
            }
            
            const response = await axios.get(`/api/warehouse-units/${warehouseId}/availability?${params.toString()}`, {
                timeout: 10000
            });

            if (response.data && response.data.success) {
                const data = response.data;
                const totalSpace = Number(data.total_space ?? warehouseInfo?.total_area ?? 0);
                const availableSpace = Number(data.available_space ?? totalSpace);
                const bookedSpace = Number(data.booked_space ?? 0);

                setAvailabilityInfo({
                    totalSpace,
                    availableSpace,
                    bookedSpace,
                    timeframe: data.timeframe ?? null
                });
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Failed to fetch warehouse availability', error);
            setAvailabilityError('Unable to load availability right now.');
            setAvailabilityInfo({
                totalSpace: warehouseInfo?.total_area || 0,
                availableSpace: warehouseInfo?.total_area || 0,
                bookedSpace: 0,
                timeframe: null
            });
        } finally {
            setAvailabilityLoading(false);
        }
    };
    
    /**
     * Get maximum available space based on current selection
     */
    const getMaxAvailableSpace = () => {
        const hasDateSelection = Boolean(bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration));
        const baseSpace = hasDateSelection ? availabilityInfo.availableSpace : availabilityInfo.totalSpace;
        return Math.max(Number(baseSpace) || 0, 0);
    };
    
    /**
     * Format square footage for display
     */
    const formatSqFt = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '0';
        }
        return numeric.toLocaleString();
    };
    
    /**
     * Formats currency for display
     * 
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        if (typeof amount !== 'number') return 'LKR 0.00';
        return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    /**
     * Reset form data to user's profile data
     */
    const resetToUserData = () => {
        if (userData) {
            setFormData({
                company_name: userData.company_name || '',
                contact_person: userData.name || '',
                email: userData.email || '',
                phone: userData.phone || ''
            });
            setIsEditingUserData(false);
            
            // Clear any existing errors
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.company_name;
                delete newErrors.contact_person;
                delete newErrors.email;
                delete newErrors.phone;
                return newErrors;
            });
        }
    };
    
    /**
     * Check if form data differs from user data
     */
    const hasFormChanges = () => {
        if (!userData) return false;
        
        return (
            formData.company_name !== (userData.company_name || '') ||
            formData.contact_person !== (userData.name || '') ||
            formData.email !== (userData.email || '') ||
            formData.phone !== (userData.phone || '')
        );
    };
    
    /**
     * Handles input changes in the checkout form
     * 
     * This function:
     * 1. Updates the form data state with new values
     * 2. Clears errors for the field being edited
     * 3. Sets editing flag if user changes data
     * 
     * @param {Event} e - The input change event
     */
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
        
        // Set editing flag if user is changing data
        if (!isEditingUserData && userData) {
            setIsEditingUserData(true);
        }
        
        // Clear errors when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[name];
                return newErrors;
            });
        }
    };
    
    /**
     * Validates the checkout form
     * 
     * Currently validates:
     * - Contact person (required)
     * - Email (required and valid format)
     * - Phone (required)
     * - Required space (required)
     * - Storage duration (required)
     * - Move-in date (required and not in the past)
     * - Move-in time (required and not in the past for current date)
     * 
     * @returns {boolean} True if form is valid, false otherwise
     */
    const validateCheckoutForm = () => {
        const newErrors = {};
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        const currentTime = today.toTimeString().slice(0, 5);
        
        // Validate contact person
        if (!formData.contact_person?.trim()) {
            newErrors.contact_person = 'Required';
        }
        
        // Validate email
        if (!formData.email?.trim()) {
            newErrors.email = 'Required';
        } else {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                newErrors.email = 'Invalid email';
            }
        }
        
        // Validate phone
        if (!formData.phone?.trim()) {
            newErrors.phone = 'Required';
        }
        
        // Validate required space
        if (!bookingData?.required_space || bookingData.required_space <= 0) {
            newErrors.required_space = 'Required';
        } else {
            const numericRequired = Number(bookingData.required_space);
            const maxSpace = getMaxAvailableSpace();
            const hasDateSelection = Boolean(bookingData?.move_in_date && bookingData?.storage_duration);
            
            if (hasDateSelection && maxSpace === 0) {
                newErrors.required_space = 'No space available for selected dates';
            } else if (hasDateSelection && maxSpace > 0 && numericRequired > maxSpace) {
                newErrors.required_space = `Cannot exceed ${formatSqFt(maxSpace)} sq ft for selected dates`;
            }
        }
        
        // Validate storage duration
        if (!bookingData?.storage_duration) {
            newErrors.storage_duration = 'Required';
        }
        
        // Validate move-in date
        if (!bookingData?.move_in_date) {
            newErrors.move_in_date = 'Required';
        } else {
            // Check if move-in date is in the past
            if (bookingData.move_in_date < currentDate) {
                newErrors.move_in_date = 'Cannot select past date';
            }
        }
        
        // Validate move-out date
        if (!bookingData?.move_out_date) {
            newErrors.move_out_date = 'Required';
        } else {
            // Check if move-out date is before move-in date
            if (bookingData.move_in_date && bookingData.move_out_date <= bookingData.move_in_date) {
                newErrors.move_out_date = 'Must be after move-in date';
            }
        }

        // Validate warehouse type
        if (!bookingData?.storage_type) {
            newErrors.storage_type = 'Required';
        }

        // Validate cargo details
        if (!bookingData?.goods_type) {
            newErrors.goods_type = 'Required';
        }
        if (!bookingData?.goods_description?.trim()) {
            newErrors.goods_description = 'Required';
        }
        if (!String(bookingData?.quantity ?? '').trim()) {
            newErrors.quantity = 'Required';
        }
        if (bookingData?.estimated_weight === undefined || bookingData?.estimated_weight === null || bookingData?.estimated_weight === '') {
            newErrors.estimated_weight = 'Required';
        }

        // Pickup/delivery address is only required when delivery/pickup was requested
        if (bookingData?.delivery_pickup_required && !bookingData?.delivery_pickup_address?.trim()) {
            newErrors.delivery_pickup_address = 'Required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    /**
     * Handles navigation to the payment page
     * 
     * This function:
     * 1. Validates the checkout form
     * 2. If valid, updates the session storage with latest form data
     * 3. Navigates to the payment page
     * 4. If invalid, shows error notification
     */
    const handlePaymentBooking = () => {
        if (validateCheckoutForm()) {
            // Update session storage with latest form data
            const updatedBookingData = {
                ...bookingData,
                ...formData
            };
            
            sessionStorage.setItem('warehouseBookingData', JSON.stringify(updatedBookingData));
            
            router.visit("/warehouse-bookings/payments", {
                method: "get",
                preserveScroll: true,
            });
        }
        // Errors will be displayed under each field, no need for toast message
    };

    const handleConfirmBooking = () => {
        toast.info('Complete the payment step to confirm your booking.');
    };

    const handleWarehouseList = () => {
        router.visit("/warehouse-bookings/", {
            method: "get",
            preserveScroll: true,
        });
    };

    return (
        <div>
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
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
                            className="flex flex-col justify-center items-center gap-3 cursor-pointer"
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
                            className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer"
                            onClick={handlePaymentBooking}
                        >
                            <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
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
                        <div className="flex justify-between items-center mb-5">
                            <h1 className="text-[20px] font-[700]">
                                Customer Information
                            </h1>
                            
                            {userData && (
                                <div className="flex items-center gap-3">
                                    {hasFormChanges() && (
                                        <button
                                            onClick={resetToUserData}
                                            className="text-[10px] font-[600] text-[#0955AC] hover:underline transition-all"
                                        >
                                            Reset to Profile Data
                                        </button>
                                    )}
                                    
                                    <div className="text-[10px] text-gray-500">
                                        {isLoadingUser ? (
                                            <span>Loading profile...</span>
                                        ) : userDataError ? (
                                            <span className="text-red-500">Profile unavailable</span>
                                        ) : (
                                            <span>
                                                Using {hasFormChanges() ? 'modified' : 'profile'} data
                                                {isEditingUserData && <span className="text-orange-500 ml-1">(Modified)</span>}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid lg:grid-cols-2 gap-5 py-5 poppins">
                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Company Name (Optional) :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.company_name ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleInputChange}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                        placeholder="Your Company Ltd."
                                    />
                                </div>
                                {errors.company_name && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.company_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Contact Person <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.contact_person ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleInputChange}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                        placeholder="John Doe"
                                    />
                                </div>
                                {errors.contact_person && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.contact_person}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Email <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.email ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                        placeholder="john@company.com"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Phone Number <span className="text-red-500">*</span> :
                                </label>
                                <div className="md:w-[374px] w-auto h-[49px]">
                                    <PhoneInput
                                        country={countryCode}
                                        value={formData.phone}
                                        onChange={(phone) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                phone: phone
                                            }));
                                            
                                            // Set editing flag if user is changing data
                                            if (!isEditingUserData && userData) {
                                                setIsEditingUserData(true);
                                            }
                                            
                                            // Clear phone error when user changes value
                                            if (errors.phone) {
                                                setErrors(prev => {
                                                    const newErrors = {...prev};
                                                    delete newErrors.phone;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        containerStyle={{
                                            width: "100%",
                                            height: "49px",
                                        }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "49px",
                                            borderRadius: "5px",
                                            border: errors.phone ? "1px solid #ef4444" : "1px solid #0000004D",
                                            fontSize: "12px",
                                            fontWeight: "500",
                                        }}
                                        buttonStyle={{
                                            borderRadius: "5px 0 0 5px",
                                            border: "1px solid #0000004D",
                                            borderRight: "none",
                                        }}
                                        placeholder="Enter phone number"
                                    />
                                    {errors.phone && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>
                                    )}
                                </div>
                            </div>
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
                        <h1 className="text-[20px] font-[700] mb-5">
                            Schedule Information
                        </h1>

                        <div className="grid lg:grid-cols-2 gap-5 poppins">
                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Move-in Date <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_in_date ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={bookingData?.move_in_date ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const updatedBookingData = {
                                                ...(bookingData || {}),
                                                move_in_date: value
                                            };
                                            setBookingData(updatedBookingData);
                                            
                                            // Trigger availability check if both date and duration are set
                                            if (value && updatedBookingData.storage_duration && updatedBookingData.warehouse_id) {
                                                fetchAvailability(updatedBookingData.warehouse_id, value, updatedBookingData.storage_duration);
                                            }
                                            
                                            // Clear error when user selects
                                            if (errors.move_in_date) {
                                                setErrors(prev => {
                                                    const newErrors = {...prev};
                                                    delete newErrors.move_in_date;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] "
                                    />
                                </div>
                                {errors.move_in_date && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.move_in_date}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Move-out Date <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_out_date ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        type="date"
                                        min={bookingData?.move_in_date || new Date().toISOString().split('T')[0]}
                                        value={bookingData?.move_out_date ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const updatedBookingData = {
                                                ...(bookingData || {}),
                                                move_out_date: value
                                            };
                                            setBookingData(updatedBookingData);
                                            
                                            // Trigger availability check if both dates are set
                                            if (value && updatedBookingData.move_in_date && updatedBookingData.warehouse_id) {
                                                fetchAvailability(
                                                    updatedBookingData.warehouse_id, 
                                                    updatedBookingData.move_in_date, 
                                                    updatedBookingData.storage_duration,
                                                    value
                                                );
                                            }
                                            
                                            // Trigger pricing calculation
                                            if (warehouseInfo) {
                                                calculatePricing(warehouseInfo, updatedBookingData);
                                            }
                                            
                                            // Clear error when user selects
                                            if (errors.move_out_date) {
                                                setErrors(prev => {
                                                    const newErrors = {...prev};
                                                    delete newErrors.move_out_date;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500]"
                                    />
                                </div>
                                {errors.move_out_date && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.move_out_date}</p>
                                )}
                            </div>
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
                        <h1 className="text-[20px] font-[700] mb-5">
                            Storage Requirements
                        </h1>

                        <div className="grid lg:grid-cols-2 gap-5 poppins">
                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Warehouse Type <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.storage_type ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <select
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#000000CC]"
                                        value={bookingData?.storage_type ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), storage_type: value }));
                                            if (errors.storage_type) {
                                                setErrors((prev) => { const n = { ...prev }; delete n.storage_type; return n; });
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select warehouse type</option>
                                        <option value="general_warehouse">General Warehouse</option>
                                        <option value="bonded_warehouse">Bonded Warehouse</option>
                                        <option value="cold_storage">Cold Storage</option>
                                    </select>
                                </div>
                                {errors.storage_type && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.storage_type}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Storage Unit <span className="text-red-500">*</span> :
                                </label>
                                <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                                    <select
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#000000CC]"
                                        value={bookingData?.storage_unit ?? 'sqft'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), storage_unit: value }));
                                        }}
                                    >
                                        <option value="sqft">Sq Ft</option>
                                        <option value="sqm">m² (Square Metres)</option>
                                        <option value="cbm">CBM (Cubic Metres)</option>
                                        <option value="pallets">Pallets</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Required Space (sq ft) <span className="text-red-500">*</span> :
                                    {bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration) ? (
                                        availabilityLoading ? (
                                            <span className="text-[#0955AC] ml-2 text-[9px]">Checking availability...</span>
                                        ) : availabilityError ? (
                                            <span className="text-red-500 ml-2 text-[9px]">Availability unavailable</span>
                                        ) : (
                                            <span className="text-[#0955AC] ml-2 text-[9px]">
                                                Available: {formatSqFt(availabilityInfo.availableSpace)} sq ft
                                                {availabilityInfo.bookedSpace > 0 ? ` (${formatSqFt(availabilityInfo.bookedSpace)} booked)` : ''}
                                            </span>
                                        )
                                    ) : (
                                        warehouseInfo?.total_area && (
                                            <span className="text-[#0955AC] ml-2 text-[9px]">
                                                Total: {formatSqFt(warehouseInfo.total_area)} sq ft
                                            </span>
                                        )
                                    )}
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.required_space ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        type="number"
                                        min={0}
                                        max={getMaxAvailableSpace() || undefined}
                                        value={bookingData?.required_space ?? ''}
                                        placeholder={(() => {
                                            const hasDateSelection = Boolean(bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration));
                                            const maxSpace = getMaxAvailableSpace();
                                            
                                            if (hasDateSelection) {
                                                return maxSpace > 0 
                                                    ? `Enter up to ${formatSqFt(maxSpace)} sq ft`
                                                    : 'No space available for selected dates';
                                            }
                                            
                                            return warehouseInfo?.total_area 
                                                ? `Enter up to ${formatSqFt(warehouseInfo.total_area)} sq ft`
                                                : 'Enter required space';
                                        })()} 
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const numericValue = value === '' ? '' : Number(value);
                                            const maxSpace = getMaxAvailableSpace();
                                            
                                            // Validate against availability limits
                                            if (numericValue && maxSpace > 0 && numericValue > maxSpace) {
                                                return; // Don't allow exceeding available space
                                            }
                                            
                                            const updatedBookingData = {
                                                ...(bookingData || {}),
                                                required_space: numericValue
                                            };
                                            setBookingData(updatedBookingData);
                                            
                                            // Trigger real-time calculation
                                            if (warehouseInfo) {
                                                if (DEBUG_PRICING) console.log('Triggering calculation for required_space:', updatedBookingData.required_space);
                                                calculatePricing(warehouseInfo, updatedBookingData);
                                            }
                                            
                                            // Clear error when user starts typing
                                            if (errors.required_space) {
                                                setErrors(prev => {
                                                    const newErrors = {...prev};
                                                    delete newErrors.required_space;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                    />
                                </div>
                                {/* Availability info */}
                                {bookingData?.move_in_date && (bookingData?.move_out_date || bookingData?.storage_duration) && !availabilityLoading && !availabilityError && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Available for selected dates: {formatSqFt(availabilityInfo.availableSpace)} sq ft
                                    </p>
                                )}
                                {!bookingData?.move_in_date && warehouseInfo?.total_area && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Total warehouse space: {formatSqFt(warehouseInfo.total_area)} sq ft
                                    </p>
                                )}
                                {availabilityError && (
                                    <p className="text-[10px] text-red-500 mt-1">{availabilityError}</p>
                                )}
                                {errors.required_space && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.required_space}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Storage Duration <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.storage_duration ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <select
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#000000CC]"
                                        value={bookingData?.storage_duration ?? '1 Month'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const updatedBookingData = {
                                                ...(bookingData || {}),
                                                storage_duration: value
                                            };
                                            setBookingData(updatedBookingData);
                                            
                                            // Trigger availability check if both date and duration are set
                                            if (value && updatedBookingData.move_in_date && updatedBookingData.warehouse_id) {
                                                fetchAvailability(updatedBookingData.warehouse_id, updatedBookingData.move_in_date, value);
                                            }
                                            
                                            // Trigger real-time calculation (always trigger if warehouseInfo exists)
                                            if (warehouseInfo) {
                                                if (DEBUG_PRICING) console.log('Triggering calculation for storage_duration:', value);
                                                calculatePricing(warehouseInfo, updatedBookingData);
                                            }
                                            
                                            // Clear error when user selects
                                            if (errors.storage_duration) {
                                                setErrors(prev => {
                                                    const newErrors = {...prev};
                                                    delete newErrors.storage_duration;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                    >
                                        <option value="1 Month">1 Month</option>
                                        <option value="3 Months">3 Months</option>
                                        <option value="6 Months">6 Months</option>
                                        <option value="12 Months">12 Months</option>
                                    </select>
                                </div>
                                {errors.storage_duration && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.storage_duration}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Access Frequency :
                                </label>
                                <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                                    <select
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#000000CC]"
                                        value={bookingData?.access_frequency ?? 'weekly'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const updatedData = {
                                                ...(bookingData || {}),
                                                access_frequency: value
                                            };
                                            setBookingData(updatedData);
                                            
                                            // Trigger real-time calculation
                                            if (warehouseInfo) {
                                                if (DEBUG_PRICING) console.log('Triggering calculation for access_frequency:', value);
                                                calculatePricing(warehouseInfo, updatedData);
                                            }
                                        }}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>

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
                        <h1 className="text-[20px] font-[700] mb-5">
                            Cargo Details
                        </h1>

                        <div className="grid lg:grid-cols-2 gap-5 poppins">
                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Cargo / Goods Type <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.goods_type ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <select
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#000000CC]"
                                        value={bookingData?.goods_type ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), goods_type: value }));
                                            if (errors.goods_type) {
                                                setErrors((prev) => { const n = { ...prev }; delete n.goods_type; return n; });
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select cargo type</option>
                                        <option value="General Goods">General Goods</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Furniture">Furniture</option>
                                        <option value="Textiles / Garments">Textiles / Garments</option>
                                        <option value="Food & Beverage">Food & Beverage</option>
                                        <option value="Pharmaceuticals">Pharmaceuticals</option>
                                        <option value="Machinery / Equipment">Machinery / Equipment</option>
                                        <option value="Construction Materials">Construction Materials</option>
                                        <option value="Hazardous Materials">Hazardous Materials</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                {errors.goods_type && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.goods_type}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Quantity <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.quantity ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        type="text"
                                        value={bookingData?.quantity ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), quantity: value }));
                                            if (errors.quantity) {
                                                setErrors((prev) => { const n = { ...prev }; delete n.quantity; return n; });
                                            }
                                        }}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                        placeholder="e.g., 250 boxes, 40 pallets"
                                    />
                                </div>
                                {errors.quantity && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.quantity}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600]">
                                    Estimated Weight (kg) <span className="text-red-500">*</span> :
                                </label>
                                <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.estimated_weight ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <input
                                        type="number"
                                        min={0}
                                        value={bookingData?.estimated_weight ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), estimated_weight: value }));
                                            if (errors.estimated_weight) {
                                                setErrors((prev) => { const n = { ...prev }; delete n.estimated_weight; return n; });
                                            }
                                        }}
                                        className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                        placeholder="Enter estimated weight"
                                    />
                                </div>
                                {errors.estimated_weight && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.estimated_weight}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px]/[24px] font-[600] block mb-1">
                                    Special Handling Required :
                                </label>
                                <div className="flex gap-2">
                                    {[["Yes", true], ["No", false]].map(([label, val]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => setBookingData((prev) => ({ ...(prev || {}), special_handling_required: val }))}
                                            className={`h-[40px] px-6 rounded-[5px] text-[12px] font-[600] border-[1px] transition-colors ${
                                                (bookingData?.special_handling_required ?? false) === val
                                                    ? 'bg-[#0955AC] text-white border-[#0955AC]'
                                                    : 'bg-white text-[#000000CC] border-[#0000004D]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {bookingData?.special_handling_required && (
                                <div className="lg:col-span-2">
                                    <label className="text-[10px]/[24px] font-[600]">
                                        Special Handling Details :
                                    </label>
                                    <div className="w-full h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                                        <input
                                            type="text"
                                            value={bookingData?.special_requirements ?? ''}
                                            onChange={(e) => setBookingData((prev) => ({ ...(prev || {}), special_requirements: e.target.value }))}
                                            className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                            placeholder="e.g., fragile, requires forklift, hazardous handling"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px]/[24px] font-[600] block mb-1">
                                    Temperature-Controlled Storage :
                                </label>
                                <div className="flex gap-2">
                                    {[["Yes", true], ["No", false]].map(([label, val]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                const current = new Set(bookingData?.amenities || []);
                                                if (val) current.add('temperature_controlled');
                                                else current.delete('temperature_controlled');
                                                setBookingData((prev) => ({ ...(prev || {}), amenities: Array.from(current) }));
                                            }}
                                            className={`h-[40px] px-6 rounded-[5px] text-[12px] font-[600] border-[1px] transition-colors ${
                                                (bookingData?.amenities || []).includes('temperature_controlled') === val
                                                    ? 'bg-[#0955AC] text-white border-[#0955AC]'
                                                    : 'bg-white text-[#000000CC] border-[#0000004D]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <label className="text-[10px]/[24px] font-[600]">
                                    Cargo Description <span className="text-red-500">*</span> :
                                </label>
                                <div className={`w-full min-h-[98px] border-[1px] ${errors.goods_description ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                    <textarea
                                        className="w-full h-full px-3 py-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080] resize-none"
                                        placeholder="Describe the items you plan to store..."
                                        rows="4"
                                        value={bookingData?.goods_description ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({
                                                ...(prev || {}),
                                                goods_description: value
                                            }));
                                            if (errors.goods_description) {
                                                setErrors((prev) => { const n = { ...prev }; delete n.goods_description; return n; });
                                            }
                                        }}
                                    />
                                </div>
                                {errors.goods_description && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors.goods_description}</p>
                                )}
                            </div>
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
                        <h1 className="text-[20px] font-[700] mb-2">
                            Services Required
                        </h1>
                        <p className="text-[10px] text-gray-500 mb-5">Storage is always included. Pick any additional services you need.</p>

                        <div className="grid sm:grid-cols-2 gap-3 poppins">
                            {[
                                { id: 'loading_unloading', label: 'Loading / Unloading' },
                                { id: 'receiving', label: 'Receiving' },
                                { id: 'packing_repacking', label: 'Packing / Repacking' },
                                { id: 'inventory_management', label: 'Inventory Management' },
                                { id: 'delivery_distribution', label: 'Delivery / Distribution' },
                            ].map((service) => {
                                const checked = (bookingData?.amenities || []).includes(service.id);
                                return (
                                    <label
                                        key={service.id}
                                        className={`flex items-center gap-2.5 px-4 h-[49px] rounded-[5px] border-[1px] cursor-pointer transition-colors ${
                                            checked ? 'border-[#0955AC] bg-[#0955AC0D]' : 'border-[#0000004D]'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                                const current = new Set(bookingData?.amenities || []);
                                                if (checked) current.delete(service.id);
                                                else current.add(service.id);
                                                setBookingData((prev) => ({ ...(prev || {}), amenities: Array.from(current) }));
                                            }}
                                            className="w-4 h-4 accent-[#0955AC]"
                                        />
                                        <span className="text-[12px] font-[500] text-[#000000CC]">{service.label}</span>
                                    </label>
                                );
                            })}
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
                        <h1 className="text-[20px] font-[700] mb-5">
                            Delivery & Confirmation
                        </h1>

                        <div className="grid lg:grid-cols-2 gap-5 poppins">
                            <div>
                                <label className="text-[10px]/[24px] font-[600] block mb-1">
                                    Delivery / Pickup Required :
                                </label>
                                <div className="flex gap-2">
                                    {[["Yes", true], ["No", false]].map(([label, val]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                setBookingData((prev) => ({ ...(prev || {}), delivery_pickup_required: val }));
                                                if (errors.delivery_pickup_address) {
                                                    setErrors((prev) => { const n = { ...prev }; delete n.delivery_pickup_address; return n; });
                                                }
                                            }}
                                            className={`h-[40px] px-6 rounded-[5px] text-[12px] font-[600] border-[1px] transition-colors ${
                                                (bookingData?.delivery_pickup_required ?? false) === val
                                                    ? 'bg-[#0955AC] text-white border-[#0955AC]'
                                                    : 'bg-white text-[#000000CC] border-[#0000004D]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {bookingData?.delivery_pickup_required && (
                                <div>
                                    <label className="text-[10px]/[24px] font-[600]">
                                        Pickup / Delivery Address <span className="text-red-500">*</span> :
                                    </label>
                                    <div className={`w-full h-[49px] border-[1px] ${errors.delivery_pickup_address ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                                        <input
                                            type="text"
                                            value={bookingData?.delivery_pickup_address ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setBookingData((prev) => ({ ...(prev || {}), delivery_pickup_address: value }));
                                                if (errors.delivery_pickup_address) {
                                                    setErrors((prev) => { const n = { ...prev }; delete n.delivery_pickup_address; return n; });
                                                }
                                            }}
                                            className="w-full h-full px-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                                            placeholder="Enter pickup/delivery address"
                                        />
                                    </div>
                                    {errors.delivery_pickup_address && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors.delivery_pickup_address}</p>
                                    )}
                                </div>
                            )}

                            <div className="lg:col-span-2">
                                <label className="text-[10px]/[24px] font-[600]">
                                    Special Instructions (Optional) :
                                </label>
                                <div className="w-full min-h-[98px] border-[1px] border-[#0000004D] rounded-[5px]">
                                    <textarea
                                        className="w-full h-full px-3 py-3 rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080] resize-none"
                                        placeholder="Any other instructions for our team..."
                                        rows="3"
                                        value={bookingData?.special_instructions ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setBookingData((prev) => ({ ...(prev || {}), special_instructions: value }));
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div
                            onClick={() => window.history.back()}
                            className="rounded-[5px] flex justify-center items-center text-[#0955AC] font-[700] text-[12px] lg:w-[874px] h-[50px] border-[2px] border-[#0955AC] px-5 cursor-pointer transition-colors"
                        >
                            Back
                        </div>

                        <div
                            onClick={handlePaymentBooking}
                            className="rounded-[5px] flex mt-5 justify-center items-center text-[#FFFFFF] font-[700] text-[12px] lg:w-[874px] h-[50px] bg-[#0955AC] px-5 cursor-pointer hover:bg-[#074a8f] transition-colors"
                        >
                            CONTINUE TO PAYMENT
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
                                    {warehouseInfo?.name}
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
                        className="poppins md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px]"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
                        }}
                    >
                        <h1 className="font-[600] text-[20px] pb-5">
                            Storage Summary
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
                                        Prices shown are estimates based on your requirements. Final pricing will be confirmed during checkout process.
                                    </p>
                                </div>
                            </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehouseCheckoutContent;