import React, { useState } from 'react';
import { Inertia } from '@inertiajs/inertia';

// Courier Service – Add Unit (Vehicle) form

const initialState = {
  vehicleType: '',
  brand: '',
  model: '',
  registrationNumber: '',
  baseLocation: '',
  serviceAreas: '',
  capacityKg: '',
  volumeCbm: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  fuelType: '',
  transmissionType: '',
  images: [],
  insuranceProvider: '',
  insuranceDocs: [],
  pricePerKm: '',
  baseFee: '',
  handlingSurcharge: '',
  refrigerated: false,
  tailLift: false,
  gps: false,
  fragileSupport: false,
  status: 'Available',
  unitsCount: 1,
  description: '',
};

const vehicleTypeOptions = ['bike', 'van', 'lorry', 'pickup', 'three-wheeler', 'other'];
const fuelTypeOptions = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG', 'Other'];
const transmissionOptions = ['Manual', 'Automatic', 'Semi-Automatic', 'CVT', 'Other'];
const statusOptions = ['Available', 'In Service', 'Maintenance'];

const AddUnit = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm((prev) => ({ ...prev, [name]: files }));
    } else if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'images' || key === 'insuranceDocs') {
          if (value && value.length) {
            for (let i = 0; i < value.length; i++) data.append(`${key}[]`, value[i]);
          }
        } else {
          data.append(key, value);
        }
      });
      Inertia.post('/courierService/units/store', data, {
        forceFormData: true,
        onError: (err) => { setErrors(err); setIsSubmitting(false); },
        onSuccess: () => { window.location.href = '/courierService/units'; },
        onFinish: () => setIsSubmitting(false),
        preserveState: true,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 poppins">
      <div>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8 font-[400]">
          {/* Basic Information */}
          <section className="bg-[#FFFFFF] p-6 rounded-lg">
            <h2 className="text-[18px] font-[600] text-gray-800 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="vehicleType" className="block text-[14px] font-medium text-gray-700">Vehicle Type</label>
                <select id="vehicleType" name="vehicleType" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" value={form.vehicleType} onChange={handleChange}>
                  <option value="">Select type</option>
                  {vehicleTypeOptions.map((t) => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
                </select>
                {errors.vehicleType && (<div className="text-red-500 text-xs mt-1">{errors.vehicleType}</div>)}
              </div>
              <div className="space-y-2">
                <label htmlFor="brand" className="block text-[14px] font-medium text-gray-700">Brand</label>
                <input id="brand" name="brand" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.brand} onChange={handleChange} placeholder="e.g., Toyota" />
              </div>
              <div className="space-y-2">
                <label htmlFor="model" className="block text-[14px] font-medium text-gray-700">Model</label>
                <input id="model" name="model" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.model} onChange={handleChange} placeholder="e.g., HiAce" />
              </div>
              <div className="space-y-2">
                <label htmlFor="registrationNumber" className="block text-[14px] font-medium text-gray-700">Registration Number</label>
                <input id="registrationNumber" name="registrationNumber" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.registrationNumber} onChange={handleChange} placeholder="e.g., WP-ABC-1234" />
              </div>
              <div className="space-y-2">
                <label htmlFor="baseLocation" className="block text-[14px] font-medium text-gray-700">Base Location</label>
                <input id="baseLocation" name="baseLocation" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.baseLocation} onChange={handleChange} placeholder="e.g., Colombo" />
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <label htmlFor="serviceAreas" className="block text-[14px] font-medium text-gray-700">Service Areas</label>
                <input id="serviceAreas" name="serviceAreas" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.serviceAreas} onChange={handleChange} placeholder="Comma-separated areas (e.g., Colombo, Gampaha, Kandy)" />
              </div>
            </div>
          </section>

          {/* Load & Vehicle Specs */}
          <section className="bg-[#FFFFFF] p-6 rounded-lg">
            <h2 className="text-[18px] font-[600] text-gray-800 mb-6">Load & Vehicle Specs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="capacityKg" className="block text-[14px] font-medium text-gray-700">Payload Capacity (kg)</label>
                <input id="capacityKg" type="number" name="capacityKg" min="0" step="0.1" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.capacityKg} onChange={handleChange} placeholder="e.g., 1200" />
              </div>
              <div className="space-y-2">
                <label htmlFor="volumeCbm" className="block text-[14px] font-medium text-gray-700">Cargo Volume (m³)</label>
                <input id="volumeCbm" type="number" name="volumeCbm" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.volumeCbm} onChange={handleChange} placeholder="e.g., 8.5" />
              </div>
              <div className="space-y-2">
                <label className="block text-[14px] font-medium text-gray-700">Max Dimensions (cm)</label>
                <div className="grid grid-cols-3 gap-3">
                  <input id="lengthCm" name="lengthCm" type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" placeholder="L" value={form.lengthCm} onChange={handleChange} />
                  <input id="widthCm" name="widthCm" type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" placeholder="W" value={form.widthCm} onChange={handleChange} />
                  <input id="heightCm" name="heightCm" type="number" min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" placeholder="H" value={form.heightCm} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="fuelType" className="block text-[14px] font-medium text-gray-700">Fuel Type</label>
                <select id="fuelType" name="fuelType" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" value={form.fuelType} onChange={handleChange}>
                  <option value="">Select fuel type</option>
                  {fuelTypeOptions.map((f) => (<option key={f} value={f}>{f}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="transmissionType" className="block text-[14px] font-medium text-gray-700">Transmission</label>
                <select id="transmissionType" name="transmissionType" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" value={form.transmissionType} onChange={handleChange}>
                  <option value="">Select transmission</option>
                  {transmissionOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="block text-[14px] font-medium text-gray-700">Status</label>
                <select id="status" name="status" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" value={form.status} onChange={handleChange}>
                  {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="unitsCount" className="block text-[14px] font-medium text-gray-700">Units Available</label>
                <input id="unitsCount" type="number" name="unitsCount" min="1" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.unitsCount} onChange={handleChange} placeholder="e.g., 3" />
              </div>
            </div>
          </section>

          {/* Media & Docs */}
          <section className="bg-[#FFFFFF] p-6 rounded-lg">
            <h2 className="text-[18px] font-[600] text-gray-800 mb-6">Images & Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[14px] font-medium text-gray-700">Vehicle Images</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors duration-150">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload images</span>
                        <input id="images" name="images" type="file" multiple accept="image/*" onChange={handleChange} className="sr-only" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="insuranceProvider" className="block text-[14px] font-medium text-gray-700">Insurance Provider</label>
                <input id="insuranceProvider" name="insuranceProvider" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.insuranceProvider} onChange={handleChange} placeholder="Enter insurance provider name" />
                <div className="mt-3">
                  <label className="block text-[14px] font-medium text-gray-700">Insurance Documents</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors duration-150">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="insuranceDocs" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload documents</span>
                          <input id="insuranceDocs" name="insuranceDocs" type="file" multiple onChange={handleChange} className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, DOC up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing & Features */}
          <section className="bg-[#FFFFFF] p-6 rounded-lg">
            <h2 className="text-[18px] font-[600] text-gray-800 mb-6">Pricing & Features</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="pricePerKm" className="block text-[14px] font-medium text-gray-700">Price per km ($)</label>
                  <input id="pricePerKm" type="number" name="pricePerKm" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.pricePerKm} onChange={handleChange} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="baseFee" className="block text-[14px] font-medium text-gray-700">Base Fee ($)</label>
                  <input id="baseFee" type="number" name="baseFee" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.baseFee} onChange={handleChange} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="handlingSurcharge" className="block text-[14px] font-medium text-gray-700">Handling Surcharge ($)</label>
                  <input id="handlingSurcharge" type="number" name="handlingSurcharge" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.handlingSurcharge} onChange={handleChange} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-[14px] font-medium text-gray-700">Features</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                    <input type="checkbox" name="refrigerated" checked={form.refrigerated} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Refrigerated</span>
                  </label>
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                    <input type="checkbox" name="tailLift" checked={form.tailLift} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Tail Lift</span>
                  </label>
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                    <input type="checkbox" name="gps" checked={form.gps} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">GPS Tracking</span>
                  </label>
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150">
                    <input type="checkbox" name="fragileSupport" checked={form.fragileSupport} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Fragile Handling</span>
                  </label>
                </div>
                <textarea name="description" rows="4" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Notes / special instructions" value={form.description} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button type="button" className="px-6 py-2.5 border border-gray-300 text-gray-700 font-[700] figtree rounded-lg focus:outline-none focus:ring-0 transition-colors duration-150" onClick={() => window.location.href = "/courierService/units"}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={`inline-flex items-center px-6 py-2.5 border border-transparent font-[700] figtree rounded-lg text-[#FFFFFF] bg-[#0955AC] focus:outline-none focus:ring-0 transition-colors duration-150 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Save Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUnit;