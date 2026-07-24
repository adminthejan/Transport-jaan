import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Calendar, MapPin, Clock, Phone, CreditCard, Shield, Star, Users, Fuel, Settings, CheckCircle } from 'lucide-react';
import Header from '../../home/client/ClientHeader';
import Footer from '../../layouts/Footer';
import axios from 'axios';
import { redirect } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function BookingPage({ vehicle = {}, landVehicleDetails = {}, vehicleImages = [] }) {
  // Insurance and payment state
  const [selectedInsurance, setSelectedInsurance] = useState('basic');
  const [selectedPayment, setSelectedPayment] = useState('card');

  // Driver option state
  const [driverChoice, setDriverChoice] = useState('with');

  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: vehicle.id || '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    driver_option: 'with',
    driver_license_number: '',
    age_range: '21-25',
    pickup_date: '',
    pickup_time: '',
    dropoff_date: '',
    dropoff_time: '',
    pickup_location: landVehicleDetails.pickup_location || '',
    dropoff_location: 'Same as pickup',
    insurance_type: 'basic',
    payment_method: 'card',
    special_requests: '',
    hear_about_us: 'Google Search',
    terms_accepted: false,
    status: 'pending',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/vehicle-bookings/book', formData);

            if (response.data.success) {
                alert('Booking is completed');
                window.location.href = '/vehicle-bookings/bookings/land';
                // return redirect('/vehicle-bookings/bookings/land');
            } else {
                alert('Booking failed');
            }

        } catch (error) {
            if (error.response?.data?.errors) {
                // Handle validation errors (optional)
                console.error('Validation errors:', error.response.data.errors);
                alert('Please fix the validation errors.');
            } else {
                alert('Failed to submit booking.');
            }
        }
    };



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />



      <main className="flex-1 max-w-7xl mx-auto px-4 py-8">

        {/* <a href="/vehicle-bookings/" className="mb-6">
            <button>
                <div className="flex items-center justify-between mb-6 text-gray-800 font-semibold text-lg">
                    <h2> ⬅️ Back</h2>
                </div>
            </button>
        </a> */}

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
            <Link href="/vehicle-bookings/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition duration-300">
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Bookings</span>
            </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Complete Your Booking</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Secure your perfect vehicle in just a few steps. All bookings include 24/7 support and comprehensive insurance options.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Vehicle Details - Enhanced */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="relative">
                  {/* <img
                    src={vehicleImages[0]?.image_path || "#"}
                    alt={`${vehicle.brand?.name || ''} ${vehicle.model}`}
                    className="w-full h-64 object-cover"
                  /> */}
                  {vehicleImages.length > 0 && (
                    <img
                        src={vehicleImages[0].image}
                        alt={`${vehicle.brand?.name || ''} ${vehicle.model}`}
                        className="w-full h-64 object-cover"
                    />
                )}


                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Available
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {vehicle.category === 'premium' ? 'Premium Choice' : 'Standard'}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {vehicle.brand?.name} {vehicle.model} {vehicle.manufracture_year}
                    </h2>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{vehicle.passenger_capacity || 'N/A'} Seats</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Fuel className="w-4 h-4" />
                      <span>{landVehicleDetails.fuel_type || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Settings className="w-4 h-4" />
                      <span>{landVehicleDetails.transmission_type || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span>{vehicle.insuarance_provider_name ? 'Insured' : 'Not Insured'}</span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                    {vehicle.description || 'Well-maintained vehicle with excellent condition. Perfect for both city driving and long-distance travel.'}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Vehicle Number</span>
                      <span className="font-bold text-gray-900">{vehicle.vehicle_no}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Color</span>
                      <span className="font-bold text-gray-900">{vehicle.color}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Mileage</span>
                      <span className="font-bold text-gray-900">{vehicle.currect_milage} km</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {landVehicleDetails.body_type && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                        {landVehicleDetails.body_type}
                      </span>
                    )}
                    {vehicle.condition === 'excellent' && (
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">Excellent Condition</span>
                    )}
                    {landVehicleDetails.transmission_type === 'automatic' && (
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs">Automatic</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Form - Enhanced with Multiple Columns */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Booking Details
                </h3>

                <div className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Personal Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Doe"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="john.doe@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="+94 77 123 4567"
                          required
                        />
                      </div>

                      <div className="space-y-6">
                        {/* Driver Option */}
                        <div>
                          <p className="block text-sm font-medium text-gray-700 mb-2">Select Driver Option</p>
                          <label className="mr-4">
                            <input
                              className="mr-2"
                              type="radio"
                              name="driver_option"
                              value="with"
                              checked={formData.driver_option === 'with'}
                              onChange={handleInputChange}
                            />
                            With Driver
                          </label>
                          <label>
                            <input
                              className="mr-2"
                              type="radio"
                              name="driver_option"
                              value="without"
                              checked={formData.driver_option === 'without'}
                              onChange={handleInputChange}
                            />
                            Without Driver
                          </label>
                        </div>

                        {/* Driver License Field – only if "Without Driver" is selected */}
                        {formData.driver_option === 'without' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Driver License Number *
                            </label>
                            <input
                              type="text"
                              name="driver_license_number"
                              value={formData.driver_license_number}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="DL123456789"
                              required
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                        <select
                          name="age_range"
                          value={formData.age_range}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="21-25">21-25</option>
                          <option value="26-35">26-35</option>
                          <option value="36-45">36-45</option>
                          <option value="46-55">46-55</option>
                          <option value="55+">55+</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Rental Details */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      Rental Details
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Date *</label>
                        <input
                          type="date"
                          name="pickup_date"
                          value={formData.pickup_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time *</label>
                        <input
                          type="time"
                          name="pickup_time"
                          value={formData.pickup_time}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Drop-off Date *</label>
                        <input
                          type="date"
                          name="dropoff_date"
                          value={formData.dropoff_date}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Drop-off Time *</label>
                        <input
                          type="time"
                          name="dropoff_time"
                          value={formData.dropoff_time}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location *</label>
                        <select
                          name="pickup_location"
                          value={formData.pickup_location}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select location</option>
                          <option value="Colombo - Main Office">Colombo - Main Office</option>
                          <option value="Colombo - Airport">Colombo - Airport</option>
                          <option value="Kandy - City Center">Kandy - City Center</option>
                          <option value="Galle - Fort Area">Galle - Fort Area</option>
                          <option value="Negombo - Beach Road">Negombo - Beach Road</option>
                          {landVehicleDetails.pickup_location && (
                            <option value={landVehicleDetails.pickup_location}>
                              {landVehicleDetails.pickup_location}
                            </option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Drop-off Location *</label>
                        <select
                          name="dropoff_location"
                          value={formData.dropoff_location}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="Same as pickup">Same as pickup</option>
                          <option value="Colombo - Main Office">Colombo - Main Office</option>
                          <option value="Colombo - Airport">Colombo - Airport</option>
                          <option value="Kandy - City Center">Kandy - City Center</option>
                          <option value="Galle - Fort Area">Galle - Fort Area</option>
                          <option value="Negombo - Beach Road">Negombo - Beach Road</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Insurance Options */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      Insurance Coverage
                    </h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          formData.insurance_type === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedInsurance('basic');
                          setFormData(prev => ({ ...prev, insurance_type: 'basic' }));
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-gray-900">Basic</h5>
                          <span className="text-sm font-medium text-green-600">Free</span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Third-party liability</li>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Basic theft protection</li>
                        </ul>
                      </div>
                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          formData.insurance_type === 'premium' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedInsurance('premium');
                          setFormData(prev => ({ ...prev, insurance_type: 'premium' }));
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-gray-900">Premium</h5>
                          <span className="text-sm font-medium text-green-600">Rs:400/day</span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Full coverage</li>
                          <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Zero deductible</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      Payment Method
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          formData.payment_method === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPayment('card');
                          setFormData(prev => ({ ...prev, payment_method: 'card' }));
                        }}
                      >
                        <h5 className="font-semibold text-gray-900 mb-2">Credit/Debit Card</h5>
                        <p className="text-sm text-gray-600">Pay securely with your card</p>
                      </div>
                      <div
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          formData.payment_method === 'paypal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPayment('paypal');
                          setFormData(prev => ({ ...prev, payment_method: 'paypal' }));
                        }}
                      >
                        <h5 className="font-semibold text-gray-900 mb-2">PayPal</h5>
                        <p className="text-sm text-gray-600">Quick payment with PayPal</p>
                      </div>
                    </div>

                    {formData.payment_method === 'card' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Additional Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
                        <textarea
                          rows="3"
                          name="special_requests"
                          value={formData.special_requests}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Child seats, GPS, additional driver, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about us?</label>
                        <select
                          name="hear_about_us"
                          value={formData.hear_about_us}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="Google Search">Google Search</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Friend/Family">Friend/Family</option>
                          <option value="Advertisement">Advertisement</option>
                          <option value="Travel Agency">Travel Agency</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="terms_accepted"
                        checked={formData.terms_accepted}
                        onChange={handleInputChange}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                        required
                      />
                      <div className="text-sm text-gray-700">
                        <p className="mb-2">I agree to the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</p>
                        <p>I confirm that I am at least 21 years old and hold a valid driver's license.</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
                    >
                      Complete Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Trust Indicators */}
        <div className="mt-12 grid md:grid-cols-4 gap-6 text-center">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Secure Booking</h4>
            <p className="text-sm text-gray-600">SSL encrypted payments</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">24/7 Support</h4>
            <p className="text-sm text-gray-600">Round-the-clock assistance</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Best Price</h4>
            <p className="text-sm text-gray-600">Guaranteed lowest rates</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Star className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Top Rated</h4>
            <p className="text-sm text-gray-600">4.8/5 customer rating</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
