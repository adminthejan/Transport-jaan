import React, { useState, useRef, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import Header from '../../home/client/ClientHeader';
import Footer from '../../layouts/Footer';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function WarehouseBookingPage({ warehouse = {}, warehouseDetails = {}, warehouseImages = [] }) {
  const [countryCode, setCountryCode] = useState("lk");
  
  // Refs for scrolling to error fields
  const companyNameRef = useRef(null);
  const contactPersonRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const storageTypeRef = useRef(null);
  const requiredSpaceRef = useRef(null);
  const storageDurationRef = useRef(null);
  const moveInDateRef = useRef(null);
  const moveInTimeRef = useRef(null);
  const moveOutDateRef = useRef(null);
  const goodsDescriptionRef = useRef(null);
  const termsRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    warehouse_id: warehouse.id || '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    storage_type: 'general',
    required_space: '',
    storage_duration: '',
    move_in_date: '',
    move_in_time: '',
    move_out_date: '',
    move_out_time: '',
    goods_description: '',
    special_handling: '',
    access_frequency: 'weekly',
    climate_controlled: false,
    insurance_required: true,
    special_requirements: '',
    terms_accepted: false,
  });

  // Validation errors state
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Get today's date in YYYY-MM-DD format for date validation
  const today = new Date().toISOString().split('T')[0];

  /**
   * Handles the submission of the booking form and navigation to checkout
   * 
   * This function:
   * 1. Validates the form data
   * 2. If valid, saves data to sessionStorage
   * 3. Shows success notification
   * 4. Navigates to the checkout page
   * 5. If invalid, shows error notification and scrolls to first error
   */
  const handleWarehouseCheckout = () => {
    setSubmitted(true);
    if (validateForm()) {
      // Save form data to session storage before navigating
      sessionStorage.setItem('warehouseBookingData', JSON.stringify(formData));
      
      // Show success message before navigating
      toast.success('Booking information saved successfully!');
      
      // Navigate to checkout page
      router.visit("/warehouse-bookings/checkout", {
        method: "get",
        preserveScroll: true,
        onSuccess: () => {
          console.log('Navigation to checkout successful');
        },
        onError: (errors) => {
          console.error('Navigation error:', errors);
          toast.error('Error navigating to checkout. Please try again.');
        }
      });
    } else {
      // Form validation failed
      toast.error('Please fix the errors before proceeding');
      scrollToFirstError();
    }
  };

  const handleWarehouseList = () => {
    router.visit("/warehouse-bookings/", {
      method: "get",
      preserveScroll: true,
    });
  };

  /**
   * Handles input changes in the form fields
   * 
   * This function:
   * 1. Updates the form data state with new values
   * 2. Clears errors for the field being edited
   * 3. Performs real-time validation for specific fields (dates, etc.)
   * 4. Handles special logic for company information fields
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
    
    // Clear the specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Special handling for date fields
    if (name === 'move_in_date' && value < today) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Move-in date cannot be in the past'
      }));
    }
    
    // If move_out_date is updated, check against move_in_date
    if (name === 'move_out_date' && value && formData.move_in_date && value < formData.move_in_date) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Move-out date must be after move-in date'
      }));
    }
    
    // If company information fields are cleared, remove validation errors
    if (['company_name', 'contact_person', 'email', 'phone'].includes(name) && !value) {
      // Remove errors for all company fields if they're all empty
      if (!formData.company_name && !formData.contact_person && 
          !formData.email && !formData.phone && name !== 'email' && name !== 'phone') {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.company_name;
          delete newErrors.contact_person;
          delete newErrors.email;
          delete newErrors.phone;
          return newErrors;
        });
      }
    }
  };

  /**
   * Validates the booking form data
   * 
   * This function validates all required fields and ensures:
   * - Required fields are filled
   * - Date/time validations (no past dates/times)
   * - Move-out date is after move-in date
   * - Logical relationships between fields are maintained
   * - Company information is optional but validated if provided
   * 
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Required fields validation
    if (!formData.required_space) {
      newErrors.required_space = 'Required space is required';
      isValid = false;
    } else if (isNaN(formData.required_space) || parseFloat(formData.required_space) <= 0) {
      newErrors.required_space = 'Required space must be a positive number';
      isValid = false;
    }

    if (!formData.storage_duration) {
      newErrors.storage_duration = 'Storage duration is required';
      isValid = false;
    }

    // Date and time validations
    if (!formData.move_in_date) {
      newErrors.move_in_date = 'Move-in date is required';
      isValid = false;
    } else if (formData.move_in_date < today) {
      newErrors.move_in_date = 'Move-in date cannot be in the past';
      isValid = false;
    }

    if (!formData.move_in_time) {
      newErrors.move_in_time = 'Move-in time is required';
      isValid = false;
    } else {
      // Check if move-in date is today, then validate time is not in the past
      if (formData.move_in_date === today) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${hours}:${minutes}`; // Current time in HH:MM format
        
        if (formData.move_in_time < currentTime) {
          newErrors.move_in_time = 'Move-in time cannot be in the past for today\'s date';
          isValid = false;
        }
      }
    }

    // Move-out date validations
    if (formData.move_out_date) {
      if (formData.move_out_date < formData.move_in_date) {
        newErrors.move_out_date = 'Move-out date must be after move-in date';
        isValid = false;
      }
      
      // If move-out date is provided, move-out time should also be provided
      if (!formData.move_out_time) {
        newErrors.move_out_time = 'Please provide move-out time';
        isValid = false;
      } else if (formData.move_out_date === formData.move_in_date && formData.move_out_time <= formData.move_in_time) {
        // If move-out is on the same day as move-in, ensure move-out time is after move-in time
        newErrors.move_out_time = 'Move-out time must be after move-in time for same-day booking';
        isValid = false;
      }
    }

    // If move-out time is provided, move-out date should also be provided
    if (formData.move_out_time && !formData.move_out_date) {
      newErrors.move_out_date = 'Please provide move-out date when specifying move-out time';
      isValid = false;
    }

    if (!formData.goods_description) {
      newErrors.goods_description = 'Goods description is required';
      isValid = false;
    } else if (formData.goods_description.trim().length < 10) {
      newErrors.goods_description = 'Please provide a more detailed description (at least 10 characters)';
      isValid = false;
    } else if (formData.goods_description.trim().length > 500) {
      newErrors.goods_description = 'Description is too long (maximum 500 characters)';
      isValid = false;
    }

    if (!formData.terms_accepted) {
      newErrors.terms_accepted = 'You must accept the terms and conditions';
      isValid = false;
    }

    // Company Information is optional, but if any field is provided, validate it
    if (formData.company_name || formData.contact_person || formData.email || formData.phone) {
      // Email validation if provided
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
        isValid = false;
      }
      
      // Phone validation if provided
      if (formData.phone && !/^\d{8,15}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
        newErrors.phone = 'Phone number must be between 8-15 digits';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Scrolls to the first field with an error and focuses it
   * 
   * This function improves user experience by automatically scrolling
   * to the first error field when validation fails, making it clear to
   * the user what needs to be fixed.
   */
  const scrollToFirstError = () => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      
      const refMap = {
        company_name: companyNameRef,
        contact_person: contactPersonRef,
        email: emailRef,
        phone: phoneRef,
        storage_type: storageTypeRef,
        required_space: requiredSpaceRef,
        storage_duration: storageDurationRef,
        move_in_date: moveInDateRef,
        move_in_time: moveInTimeRef,
        move_out_date: moveOutDateRef,
        goods_description: goodsDescriptionRef,
        terms_accepted: termsRef
      };
      
      const ref = refMap[firstErrorField];
      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (ref.current) {
            ref.current.focus();
          }
        }, 500);
      }
    }
  };

  // Load saved form data from session storage if available
  useEffect(() => {
    const savedData = sessionStorage.getItem('warehouseBookingData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(prev => ({
          ...prev,
          ...parsedData,
          warehouse_id: warehouse.id || parsedData.warehouse_id || ''
        }));
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, [warehouse.id]);

  /**
   * Handles the final submission of the booking form to the server
   * 
   * This function:
   * 1. Validates the form data
   * 2. If valid, shows loading indicator and submits data to the server
   * 3. Handles server response (success or error)
   * 4. Provides comprehensive error handling for different scenarios
   * 5. If invalid, shows error notification and scrolls to first error
   * 
   * @param {Event} e - The form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    if (validateForm()) {
      try {
        // Save form data to session storage
        sessionStorage.setItem('warehouseBookingData', JSON.stringify(formData));
        
        // Show loading state
        toast.info('Processing your booking...', { autoClose: false, toastId: 'booking-process' });
        
        const response = await axios.post('/warehouse-bookings/book', formData, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        // Dismiss the loading toast
        toast.dismiss('booking-process');

        if (response.data.success) {
          toast.success('Warehouse booking completed successfully!');
          // Use router.visit instead of window.location for smoother navigation
          router.visit(response.data.redirect || '/warehouse-bookings/bookings/list');
        } else {
          toast.error(response.data.message || 'Booking failed. Please try again.');
        }
      } catch (error) {
        // Dismiss the loading toast
        toast.dismiss('booking-process');
        
        if (error.response?.data?.errors) {
          // Handle validation errors from the server
          const serverErrors = error.response.data.errors;
          setErrors(prev => ({ ...prev, ...serverErrors }));
          toast.error('Please fix the errors in the form');
          scrollToFirstError();
        } else if (error.response?.data?.message) {
          // Show specific error message from server
          toast.error(error.response.data.message);
        } else if (error.response) {
          // Server responded with an error status code
          toast.error(`Server error: ${error.response.status}. Please try again later.`);
          console.error('Server error:', error.response);
        } else if (error.request) {
          // Request was made but no response was received (network error)
          toast.error('Network error. Please check your connection and try again.');
          console.error('Network error - no response received:', error.request);
        } else {
          // Something else happened in setting up the request
          toast.error('An unexpected error occurred. Please try again.');
          console.error('Request setup error:', error.message);
        }
      }
    } else {
      toast.error('Please fix the errors before submitting');
      scrollToFirstError();
    }
  };

  return (
    <div>
      <Header />
      {/* Toast container for notifications */}
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
            <div className="md:flex flex-col hidden justify-center items-center gap-3">
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
            >
              <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                Checkout
              </h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div
              className="md:flex flex-col justify-center hidden items-center cursor-pointer"
            >
              <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">
                Booking Confirmation
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              className="border-l-[0.2px] rounded-[10px] xl:w-[874px] xl:h-auto bg-[#FFFFFF] px-10 py-10"
              style={{
                boxShadow: "4px 4px 4px #0000001A",
                borderLeftWidth: "0.2px",
                borderTopWidth: "0.2px",
              }}
            >
              <h1 className="text-[20px] font-[700]">
                Company Information <span className="text-[12px] font-[400] text-gray-500">(Optional)</span>
              </h1>

              <div className="flex flex-col justify-center gap-5">
                <div className="flex flex-col lg:flex-row justify-between mt-3">
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Company Name:
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.company_name && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        ref={companyNameRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="Enter your company name"
                      />
                    </div>
                    {errors.company_name && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.company_name}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Contact Person:
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.contact_person && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="text"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        ref={contactPersonRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="Enter contact person name"
                      />
                    </div>
                    {errors.contact_person && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row justify-between">
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Email Address:
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.email && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        ref={emailRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="Enter your email address"
                      />
                    </div>
                    {errors.email && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Phone Number:
                    </label>
                    <div className="flex flex-row gap-3">
                      <div className="w-[69px] h-[49px] border-[1px] border-[#0000004D] rounded-[5px] flex items-center justify-center">
                        <PhoneInput
                          country={countryCode}
                          value={""}
                          onChange={(value, data) =>
                            setCountryCode(
                              data.countryCode || "us"
                            )
                          }
                          inputStyle={{
                            display: "none",
                          }}
                          buttonStyle={{
                            border: "none",
                            borderRadius: "5px",
                            width: "100%",
                            height: "47px",
                          }}
                          containerStyle={{
                            width: "100%",
                            height: "100%",
                          }}
                          dropdownStyle={{
                            zIndex: 1000,
                          }}
                          disableCountryCode={false}
                          disableDropdown={false}
                          countryCodeEditable={true}
                          enableSearch={true}
                        />
                      </div>
                      <div className={`md:w-[293px] w-auto h-[49px] border-[1px] ${errors.phone && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          ref={phoneRef}
                          className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                    {errors.phone && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="border-l-[0.2px] rounded-[10px] lg:w-[874px] h-auto bg-[#FFFFFF] px-10 py-10 mt-10"
              style={{
                borderLeftWidth: "0.2px",
                borderTopWidth: "0.2px",
                boxShadow: "4px 4px 4px #0000001A",
              }}
            >
              <h1 className="text-[20px] font-[700]">
                Storage Requirements
              </h1>
              <div className="flex flex-col justify-center gap-5 mt-3">
                <div className="flex flex-col lg:flex-row justify-between">
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Storage Type:
                    </label>
                    <div className={`md:w-[240px] w-auto h-[49px] border-[1px] ${errors.storage_type && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <select
                        name="storage_type"
                        value={formData.storage_type}
                        onChange={handleInputChange}
                        ref={storageTypeRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#808080]"
                        required
                      >
                        <option value="general">General Storage</option>
                        <option value="cold">Cold Storage</option>
                        <option value="hazardous">Hazardous Materials</option>
                        <option value="electronics">Electronics</option>
                        <option value="food">Food & Beverages</option>
                        <option value="pharmaceutical">Pharmaceutical</option>
                      </select>
                    </div>
                    {errors.storage_type && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.storage_type}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Required Space (sq ft):
                    </label>
                    <div className={`md:w-[240px] w-auto h-[49px] border-[1px] ${errors.required_space && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="number"
                        name="required_space"
                        value={formData.required_space}
                        onChange={handleInputChange}
                        ref={requiredSpaceRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="1000"
                        required
                      />
                    </div>
                    {errors.required_space && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.required_space}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Storage Duration:
                    </label>
                    <div className={`md:w-[240px] w-auto h-[49px] border-[1px] ${errors.storage_duration && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <select
                        name="storage_duration"
                        value={formData.storage_duration}
                        onChange={handleInputChange}
                        ref={storageDurationRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent text-[12px] font-[500] text-[#808080]"
                        required
                      >
                        <option value="">Select Duration</option>
                        <option value="1-week">1 Week</option>
                        <option value="2-weeks">2 Weeks</option>
                        <option value="1-month">1 Month</option>
                        <option value="3-months">3 Months</option>
                        <option value="6-months">6 Months</option>
                        <option value="12-months">12 Months</option>
                        <option value="long-term">Long Term (2+ years)</option>
                      </select>
                    </div>
                    {errors.storage_duration && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.storage_duration}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="border-l-[0.2px] rounded-[10px] lg:w-[874px] h-auto bg-[#FFFFFF] px-10 py-10 mt-10"
              style={{
                borderLeftWidth: "0.2px",
                borderTopWidth: "0.2px",
                boxShadow: "4px 4px 4px #0000001A",
              }}
            >
              <h1 className="text-[20px] font-[700]">
                Schedule Information
              </h1>
              <div className="flex flex-col justify-center gap-5 mt-3">
                <div className="flex flex-col lg:flex-row justify-between">
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Move-in Date:
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_in_date && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="date"
                        name="move_in_date"
                        value={formData.move_in_date}
                        onChange={handleInputChange}
                        ref={moveInDateRef}
                        min={today}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        required
                      />
                    </div>
                    {errors.move_in_date && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.move_in_date}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Move-in Time:
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_in_time && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="time"
                        name="move_in_time"
                        value={formData.move_in_time}
                        onChange={handleInputChange}
                        ref={moveInTimeRef}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        required
                      />
                    </div>
                    {errors.move_in_time && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.move_in_time}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row justify-between">
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Move-out Date (Optional):
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_out_date && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="date"
                        name="move_out_date"
                        value={formData.move_out_date}
                        onChange={handleInputChange}
                        ref={moveOutDateRef}
                        min={formData.move_in_date || today}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      />
                    </div>
                    {errors.move_out_date && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.move_out_date}</p>
                    )}
                  </div>
                  <div className="">
                    <label className="text-[10px]/[24px] font-[600]">
                      Move-out Time (Optional):
                    </label>
                    <div className={`md:w-[374px] w-auto h-[49px] border-[1px] ${errors.move_out_time && submitted ? 'border-red-500' : 'border-[#0000004D]'} rounded-[5px]`}>
                      <input
                        type="time"
                        name="move_out_time"
                        value={formData.move_out_time}
                        onChange={handleInputChange}
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 focus:border-transparent border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      />
                    </div>
                    {errors.move_out_time && submitted && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.move_out_time}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="border-l-[0.2px] rounded-[10px] lg:w-[874px] h-auto bg-[#FFFFFF] px-10 py-10 mt-10"
              style={{
                borderLeftWidth: "0.2px",
                borderTopWidth: "0.2px",
                boxShadow: "4px 4px 4px #0000001A",
              }}
            >
              <h1 className="text-[20px] font-[700]">
                Goods Information
              </h1>
              <div className="">
                <label className="text-[10px]/[24px] font-[600]">
                  Goods Description:
                </label>
                <div className={`w-full ${errors.goods_description && submitted ? 'border-red-500' : 'border-[#0000004D]'} border-[1px] rounded-[5px]`}>
                  <textarea
                    name="goods_description"
                    value={formData.goods_description}
                    onChange={handleInputChange}
                    ref={goodsDescriptionRef}
                    className="w-full h-[87px] rounded-[5px] p-2 focus:outline-none focus:ring-0 placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080] focus:border-transparent border-transparent"
                    placeholder="Describe the items you plan to store..."
                    required
                  />
                </div>
                {errors.goods_description && submitted && (
                  <p className="text-red-500 text-[10px] mt-1">{errors.goods_description}</p>
                )}
              </div>
            </div>

            <div
              className="border-l-[0.2px] rounded-[10px] lg:w-[874px] h-auto bg-[#FFFFFF] px-10 py-10 mt-10"
              style={{
                borderLeftWidth: "0.2px",
                borderTopWidth: "0.2px",
                boxShadow: "4px 4px 4px #0000001A",
              }}
            >
              <h1 className="text-[20px] font-[700]">
                Additional Information
              </h1>
              <div className="">
                <label className="text-[10px]/[24px] font-[600]">
                  Special Requirements (Optional):
                </label>
                <textarea
                  name="special_requirements"
                  value={formData.special_requirements}
                  onChange={handleInputChange}
                  className="w-full h-[87px] border-[1px] border-[#0000004D] rounded-[5px] p-2 focus:outline-none focus:ring-0 placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080] focus:border-transparent"
                  placeholder="Temperature requirements, loading dock access, forklift services, etc."
                />
              </div>
            </div>

            <div className="border-l-[0.2px] rounded-[10px] lg:w-[874px] bg-[#F4F3F3] px-5 py-4 mt-10" style={{ borderLeftWidth: "0.2px", borderTopWidth: "0.2px", boxShadow: "4px 4px 4px #0000001A" }}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={handleInputChange}
                  ref={termsRef}
                  className={`mt-1 h-5 w-5 rounded border-gray-300 ${errors.terms_accepted && submitted ? 'ring-2 ring-red-500' : ''}`}
                />
                <div className="text-[11px]">
                  <p>I agree to the <span className="text-blue-600">Terms and Conditions</span> and <span className="text-blue-600">Privacy Policy</span>.</p>
                  <p>I confirm that the information provided is accurate and I am authorized to make this booking.</p>
                  {errors.terms_accepted && submitted && (
                    <p className="text-red-500 text-[10px] mt-1">{errors.terms_accepted}</p>
                  )}
                </div>
              </div>
            </div>

            <div
              onClick={handleWarehouseCheckout}
              className="rounded-[5px] flex justify-center items-center text-[#FFFFFF] font-[700] text-[12px] lg:w-[874px] h-[50px] bg-[#0955AC] px-5 py-5 cursor-pointer hover:bg-[#074a8f] transition-colors mt-10"
            >
              Next
            </div>
          </form>
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
              {warehouseImages && warehouseImages.length > 0 ? (
                <img src={`/storage/${warehouseImages[0]}`} className="w-[120px] h-[80px] object-cover rounded" alt="Warehouse" />
              ) : (
                <div className="w-[120px] h-[80px] bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-xs">No Image</span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <h1 className="figtree text-[20px] font-[700]">
                  {warehouse.name || 'Premium Warehouse Storage'}
                </h1>
                <div className="poppins flex flex-row gap-5 text-[9px] text-[#000000B2] font-[500]">
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <div className="size-[17px] bg-blue-500 rounded-full"></div>
                    <h1>{warehouseDetails.area || '5000'} sq ft</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <div className="size-[17px] bg-green-500 rounded-full"></div>
                    <h1>{warehouse.type || 'General'}</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <div className="size-[17px] bg-purple-500 rounded-full"></div>
                    <h1>24/7 Access</h1>
                  </div>
                  <div className="flex flex-col gap-2 justify-center items-center">
                    <div className="size-[17px] bg-orange-500 rounded-full"></div>
                    <h1>Climate Ctrl</h1>
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
                      Location: {warehouseDetails.address || warehouse.address || 'Premium Location'}
                    </h1>
                    <h1>Move-in Date: {formData.move_in_date || 'To be selected'}</h1>
                    <h1>Move-in Time: {formData.move_in_time || 'To be selected'}</h1>
                  </div>
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">
                      Storage: {formData.storage_type || 'General Storage'}
                    </h1>
                    <h1>Duration: {formData.storage_duration || 'To be selected'}</h1>
                    <h1>Space Required: {formData.required_space || 'To be specified'} sq ft</h1>
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
            <h1 className="font-[600] text-[20px]">
              Storage Details
            </h1>

            <div className="md:px-10 py-5">
              <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-10 px-10">
                <h1 className="font-[600] mb-5 text-[#000000D9]">
                  Storage Requirements
                </h1>
                <div className="w-full h-[1px] bg-[#CDD0D4]" />
                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">
                      Storage Type
                    </h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>{formData.storage_type || 'General Storage'}</h1>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between w-full px-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">
                      Required Space
                    </h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>{formData.required_space || '0'} sq ft</h1>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">
                      Duration
                    </h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>{formData.storage_duration || 'Not selected'}</h1>
                    </div>
                  </div>
                </div>
                <div className="w-full h-[1px] bg-[#CDD0D4]" />

                <h1 className="font-[600] mt-5 text-[#000000D9]">
                  Additional Services
                </h1>

                {/* checkbox section */}
                <div className="flex flex-col justify-center text-[12px] font-[500] mt-5">
                  <div className="flex flex-col md:flex-row justify-between w-full px-5">
                    <div className="flex flex-row md:justify-center items-center gap-4">
                      <h1>Climate Control</h1>
                    </div>
                    <h1>{formData.climate_controlled ? 'Included' : 'Not selected'}</h1>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-[#CDD0D4] mt-5" />

                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">
                      Insurance
                    </h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061] mt-3">
                      <h1>{formData.insurance_required ? 'Required' : 'Not required'}</h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}