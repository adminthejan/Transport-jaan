// resources/js/Pages/Web/components/vendors/warehouse/UnitContent.jsx
import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { API_BASE_URL } from "../../../../../../config/api";


// Assets
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import UserDropdown from "../../UserDropdown.jsx";
import NotificationDropdown from "../NotificationDropdown";

const initialInlineUnitForm = {
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    total_area: "",
    capacity: "",
    type: "",
    pricing_model: "",
    price: "",
    monthly_rate: "",
    security_deposit: "",
    setup_fee: "",
    tax_rate: "",
    terms_conditions: "",
    amenities: [],
    is_active: true,
};

const warehouseTypeOptions = [
    { value: "general_warehouse", label: "General Warehouse" },
    { value: "bonded_warehouse", label: "Bonded Warehouse" },
    { value: "cold_storage", label: "Cold Storage" },
    { value: "distribution_center", label: "Distribution Center" },
    { value: "fulfillment_center", label: "Fulfillment Center" },
    { value: "smart_warehouse", label: "Smart Warehouse" },
];

const pricingModelOptions = [
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
];

const amenityCatalogue = [
    "Loading Dock",
    "Forklift Access",
    "Temperature Control",
    "Humidity Control",
    "Security System",
    "CCTV",
    "24/7 Access",
    "Fire Safety",
    "Climate Control",
    "Refrigeration",
    "Power Backup",
    "Internet Access",
    "Office Space",
];

const InlineAddUnit = ({ onCancel, onCreated }) => {
    const [form, setForm] = useState(initialInlineUnitForm);
    const [errors, setErrors] = useState({});
    const [images, setImages] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [termsPdf, setTermsPdf] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amenityInput, setAmenityInput] = useState("");
    const [amenityOptions, setAmenityOptions] = useState(amenityCatalogue);

    useEffect(() => {
        return () => {
            images.forEach(image => image.preview && URL.revokeObjectURL(image.preview));
        };
    }, [images]);

    const pricingSummary = useMemo(() => {
        const monthlyRate = parseFloat(form.monthly_rate) || 0;
        const deposit = parseFloat(form.security_deposit) || 0;
        const setup = parseFloat(form.setup_fee) || 0;
        const taxRate = parseFloat(form.tax_rate) || 0;
        const subtotal = monthlyRate + deposit + setup;
        const taxAmount = (subtotal * taxRate) / 100;
        const finalAmount = subtotal + taxAmount;
        return {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2),
        };
    }, [form.monthly_rate, form.security_deposit, form.setup_fee, form.tax_rate]);

    const clearFieldError = (field) => {
        if (!errors[field]) return;
        setErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        clearFieldError(name);
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleActive = () => {
        setForm(prev => ({ ...prev, is_active: !prev.is_active }));
    };

    const handleAmenityToggle = (amenity) => {
        setForm(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(item => item !== amenity)
                : [...prev.amenities, amenity],
        }));
    };

    const handleAmenityAdd = () => {
        const nextAmenity = amenityInput.trim();
        if (!nextAmenity) return;
        if (!amenityOptions.includes(nextAmenity)) {
            setAmenityOptions(prev => [...prev, nextAmenity]);
        }
        setForm(prev => ({ ...prev, amenities: [...prev.amenities, nextAmenity] }));
        setAmenityInput("");
    };

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const mapped = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setImages(prev => [...prev, ...mapped].slice(0, 20));
        clearFieldError("images");
    };

    const removeImage = (index) => {
        setImages(prev => {
            const next = [...prev];
            const [removed] = next.splice(index, 1);
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return next;
        });
    };

    const handleDocumentUpload = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        setDocuments(prev => [...prev, ...files].slice(0, 20));
    };

    const removeDocument = (index) => {
        setDocuments(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
    };

    const handleTermsPdf = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        clearFieldError("terms_conditions");
        setTermsPdf(file);
    };

    const validateForm = () => {
        const nextErrors = {};
        if (!form.name.trim()) nextErrors.name = "Warehouse name is required.";
        if (!form.address.trim()) nextErrors.address = "Address is required.";
        if (!form.type) nextErrors.type = "Warehouse type is required.";
        if (!form.pricing_model) nextErrors.pricing_model = "Pricing model is required.";
        if (!form.monthly_rate) nextErrors.monthly_rate = "Monthly rate is required.";
        if (!form.capacity) nextErrors.capacity = "Capacity is required.";
        if (!form.total_area) nextErrors.total_area = "Total area is required.";
        if (!form.terms_conditions.trim() && !termsPdf) {
            nextErrors.terms_conditions = "Provide inline terms or upload a PDF.";
        }
        if (images.length === 0) nextErrors.images = "At least one image is required.";
        return nextErrors;
    };

    const resetForm = () => {
        images.forEach(image => image.preview && URL.revokeObjectURL(image.preview));
        setForm(initialInlineUnitForm);
        setImages([]);
        setDocuments([]);
        setTermsPdf(null);
        setAmenityInput("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
        }

        const payload = new FormData();
        payload.append("name", form.name);
        payload.append("description", form.description || "");
        payload.append("address", form.address);
        payload.append("latitude", form.latitude || "");
        payload.append("longitude", form.longitude || "");
        payload.append("total_area", form.total_area || "");
        payload.append("capacity", form.capacity || "");
        payload.append("type", form.type);
        payload.append("pricing_model", form.pricing_model);
        payload.append("base_price", form.price || "");
        payload.append("price", form.price || "");
        payload.append("monthly_rate", form.monthly_rate || "");
        payload.append("security_deposit", form.security_deposit || "");
        payload.append("setup_fee", form.setup_fee || "");
        payload.append("tax_rate", form.tax_rate || "");
        payload.append("total_amount", pricingSummary.subtotal);
        payload.append("tax_amount", pricingSummary.taxAmount);
        payload.append("final_amount", pricingSummary.finalAmount);
        payload.append("terms_conditions", form.terms_conditions || "");
        payload.append("is_active", form.is_active ? "1" : "0");
        payload.append("amenities", JSON.stringify(form.amenities));
        images.forEach(item => payload.append("images[]", item.file));
        documents.forEach(file => payload.append("documents[]", file));
        if (termsPdf) payload.append("terms_pdf", termsPdf);

        setIsSubmitting(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
            const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/units`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": csrfToken,
                },
                body: payload,
                credentials: "same-origin",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 422 && data?.errors) {
                    const mappedErrors = Object.fromEntries(
                        Object.entries(data.errors).map(([key, value]) => [
                            key === "base_price" ? "price" : key,
                            Array.isArray(value) ? value[0] : value,
                        ])
                    );
                    setErrors(mappedErrors);
                    const firstError = Object.values(mappedErrors)[0];
                    if (firstError) {
                        alert(String(firstError));
                    }
                } else {
                    alert(data?.message || "Failed to create warehouse unit.");
                }
                return;
            }

            resetForm();
            if (onCreated) onCreated();
        } catch (err) {
            console.error("Failed to submit warehouse unit", err);
            alert("Unexpected error while saving the warehouse unit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Add Warehouse Unit</h2>
                    <p className="text-gray-600">Provide detailed information about your warehouse to publish it.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Back to List
                    </button>
                    <button
                        type="submit"
                        form="inline-add-unit-form"
                        className="px-5 py-2.5 rounded-lg bg-[#0955AC] text-white font-semibold hover:bg-[#074a94] disabled:opacity-60"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Save Unit"}
                    </button>
                </div>
            </div>

            <form id="inline-add-unit-form" onSubmit={handleSubmit} className="mt-8 space-y-10">
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Warehouse Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.name ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                placeholder="e.g. Downtown Cold Storage"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Warehouse Type *</label>
                            <select
                                name="type"
                                value={form.type}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.type ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                            >
                                <option value="">Select type</option>
                                {warehouseTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                placeholder="Describe the key features of this warehouse"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Address *</label>
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.address ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                placeholder="Street, city, state"
                            />
                            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Latitude</label>
                            <input
                                type="text"
                                name="latitude"
                                value={form.latitude}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                placeholder="e.g. 6.9271"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Longitude</label>
                            <input
                                type="text"
                                name="longitude"
                                value={form.longitude}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                placeholder="e.g. 79.8612"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Capacity & Pricing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Total Area (sqft) *</label>
                            <input
                                type="number"
                                name="total_area"
                                value={form.total_area}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.total_area ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                min="0"
                                step="0.01"
                            />
                            {errors.total_area && <p className="mt-1 text-sm text-red-600">{errors.total_area}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Capacity *</label>
                            <input
                                type="number"
                                name="capacity"
                                value={form.capacity}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.capacity ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                min="0"
                                step="1"
                            />
                            {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Pricing Model *</label>
                            <select
                                name="pricing_model"
                                value={form.pricing_model}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.pricing_model ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                            >
                                <option value="">Select model</option>
                                {pricingModelOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {errors.pricing_model && <p className="mt-1 text-sm text-red-600">{errors.pricing_model}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Base Price ({form.pricing_model || "model"})</label>
                            <input
                                type="number"
                                name="price"
                                value={form.price}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Monthly Rate *</label>
                            <input
                                type="number"
                                name="monthly_rate"
                                value={form.monthly_rate}
                                onChange={handleInputChange}
                                className={`mt-1 w-full rounded-lg border ${errors.monthly_rate ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                min="0"
                                step="0.01"
                            />
                            {errors.monthly_rate && <p className="mt-1 text-sm text-red-600">{errors.monthly_rate}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Security Deposit</label>
                            <input
                                type="number"
                                name="security_deposit"
                                value={form.security_deposit}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Setup Fee</label>
                            <input
                                type="number"
                                name="setup_fee"
                                value={form.setup_fee}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Tax Rate (%)</label>
                            <input
                                type="number"
                                name="tax_rate"
                                value={form.tax_rate}
                                onChange={handleInputChange}
                                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                        <p className="flex justify-between"><span>Subtotal</span><span>{pricingSummary.subtotal}</span></p>
                        <p className="flex justify-between"><span>Estimated Tax</span><span>{pricingSummary.taxAmount}</span></p>
                        <p className="flex justify-between font-semibold text-gray-900"><span>Projected Total</span><span>{pricingSummary.finalAmount}</span></p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                        {amenityOptions.map(option => {
                            const active = form.amenities.includes(option);
                            return (
                                <button
                                    type="button"
                                    key={option}
                                    onClick={() => handleAmenityToggle(option)}
                                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${active ? "bg-[#0955AC] text-white border-[#0955AC]" : "bg-white text-gray-700 border-gray-200 hover:border-[#0955AC]"}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <input
                            type="text"
                            value={amenityInput}
                            onChange={(event) => setAmenityInput(event.target.value)}
                            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]"
                            placeholder="Add custom amenity"
                        />
                        <button
                            type="button"
                            onClick={handleAmenityAdd}
                            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800"
                        >
                            Add Amenity
                        </button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Media & Documents</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Warehouse Images *</label>
                            <label className={`mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed ${errors.images ? "border-red-500" : "border-gray-300"} px-6 py-8 text-center cursor-pointer hover:border-[#0955AC]`}>
                                <span className="font-semibold text-gray-900">Upload Images</span>
                                <span className="text-sm text-gray-500">PNG, JPG, GIF up to 50MB each</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                            </label>
                            {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
                            {images.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {images.map((item, index) => (
                                        <div key={item.preview} className="relative h-32 w-full overflow-hidden rounded-xl">
                                            <img src={item.preview} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 bg-white/80 rounded-full px-2 py-1 text-xs font-semibold text-red-600"
                                                onClick={() => removeImage(index)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Supporting Documents</label>
                            <label className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 px-6 py-8 text-center cursor-pointer hover:border-[#0955AC]">
                                <span className="font-semibold text-gray-900">Upload Documents</span>
                                <span className="text-sm text-gray-500">PDF, DOC up to 50MB each</span>
                                <input type="file" accept=".pdf,.doc,.docx,.txt" multiple className="hidden" onChange={handleDocumentUpload} />
                            </label>
                            {documents.length > 0 && (
                                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                                    {documents.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2">
                                            <span className="truncate pr-4">{file.name}</span>
                                            <button type="button" className="text-red-600 font-semibold" onClick={() => removeDocument(index)}>
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Terms & Activation</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Terms & Conditions *</label>
                            <textarea
                                name="terms_conditions"
                                value={form.terms_conditions}
                                onChange={handleInputChange}
                                rows={6}
                                className={`mt-1 w-full rounded-lg border ${errors.terms_conditions ? "border-red-500" : "border-gray-200"} px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0955AC]`}
                                placeholder="Include cancellation, liability, or service level details"
                            />
                            {errors.terms_conditions && <p className="mt-1 text-sm text-red-600">{errors.terms_conditions}</p>}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Upload Terms PDF (optional)</label>
                                <label className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 px-6 py-6 text-center cursor-pointer hover:border-[#0955AC]">
                                    <span className="font-semibold text-gray-900">Attach PDF</span>
                                    <input type="file" accept="application/pdf" className="hidden" onChange={handleTermsPdf} />
                                </label>
                                {termsPdf && <p className="mt-2 text-sm text-gray-700">{termsPdf.name}</p>}
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                                <div>
                                    <p className="font-semibold text-gray-900">Active Listing</p>
                                    <p className="text-sm text-gray-600">Toggle to publish or pause this unit</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleActive}
                                    className={`relative w-14 h-8 rounded-full transition ${form.is_active ? "bg-green-500" : "bg-gray-300"}`}
                                >
                                    <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition ${form.is_active ? "translate-x-6" : "translate-x-0"}`}></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2.5 rounded-lg bg-[#0955AC] text-white font-semibold hover:bg-[#074a94] disabled:opacity-60"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Saving..." : "Save Warehouse"}
                    </button>
                </div>
            </form>
        </div>
    );
};

const UnitContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    // Data & Loading
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUnits, setTotalUnits] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // UI States
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [unitToToggle, setUnitToToggle] = useState(null);
    const [isToggling, setIsToggling] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Notifications
    const [warehouseNotifications, setWarehouseNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    const perPageOptions = [5, 10, 20, 50];

    // Fetch Units
    const fetchUnits = async (page = 1, perPage = 10, search = "", type = "", status = "") => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
            });
            if (search) params.append("search", search);
            if (type) params.append("type_filter", type);
            if (status) params.append("status_filter", status);

            const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/units?${params}`, {
                method: "GET",
                headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
                credentials: "same-origin",
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            setUnits(data.data || []);
            setCurrentPage(data.current_page || 1);
            setTotalPages(data.last_page || 1);
            setTotalUnits(data.total || 0);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load warehouse units. Please try again.");
            setUnits([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial & Pagination Fetch
    useEffect(() => {
        fetchUnits(currentPage, itemsPerPage, searchTerm, typeFilter, statusFilter);
    }, [currentPage, itemsPerPage]);

    // Debounced Search & Filters
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchUnits(1, itemsPerPage, searchTerm, typeFilter, statusFilter);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, typeFilter, statusFilter]);

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!auth?.user) return;

            try {
                const response = await fetch(`${API_BASE_URL}vendors/warehouse/notifications/data`);
                if (response.ok) {
                    const data = await response.json();
                    setWarehouseNotifications(data.notifications || []);
                    setNotificationUnreadCount(data.unread_count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        if (auth?.user) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [auth?.user]);

    // Pagination Helpers
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
        return pages;
    };

    // Actions
    const handleAddUnitClick = () => setShowAddUnit(true);
    const handleViewWarehouse = (unit) => router.visit(`/vendors/warehouse/unitDetails/${unit.id}`);
    const handleEditWarehouse = (unit) => router.visit(`/vendors/warehouse/editUnit/${unit.id}`);

    const handleToggleStatus = (unit) => {
        setUnitToToggle(unit);
        setShowConfirmModal(true);
    };

    const confirmToggleStatus = async () => {
        if (!unitToToggle) return;
        setIsToggling(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            const res = await fetch(`${API_BASE_URL}vendors/warehouse/api/units/${unitToToggle.id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken || "",
                },
                body: JSON.stringify({ is_active: !unitToToggle.is_active }),
            });

            if (!res.ok) throw new Error("Failed to update");

            const result = await res.json();
            setUnits(prev => prev.map(u => u.id === unitToToggle.id ? { ...u, ...result.unit } : u));
            setShowConfirmModal(false);
            setUnitToToggle(null);
        } catch (err) {
            alert("Failed to update status");
        } finally {
            setIsToggling(false);
        }
    };

    const handleDeleteWarehouse = (unit) => {
        setUnitToDelete(unit);
        setShowDeleteModal(true);
    };

    const confirmDeleteWarehouse = async () => {
        if (!unitToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_BASE_URL}vendors/warehouse/api/units/${unitToDelete.id}`, {
                method: "DELETE",
                headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "" },
            });
            if (!res.ok) throw new Error("Delete failed");
            setUnits(prev => prev.filter(u => u.id !== unitToDelete.id));
            setTotalUnits(prev => prev - 1);
            setShowDeleteModal(false);
            setUnitToDelete(null);
        } catch (err) {
            alert("Failed to delete unit");
        } finally {
            setIsDeleting(false);
        }
    };

    const statusColor = (status) => {
        const map = {
            Available: "text-green-600",
            Occupied: "text-amber-600",
            "Pending Approval": "text-yellow-600",
            Rejected: "text-red-600",
            Inactive: "text-gray-500",
        };
        return map[status] || "text-gray-500";
    };

    const getFirstImageUrl = (unit) => {
        const sources = [
            unit?.thumbnail_url,
            unit?.image,
            unit?.images?.[0]?.url || unit?.images?.[0],
            unit?.image_urls?.[0],
            unit?.gallery?.[0]?.url,
        ];
        return sources.find(Boolean) || null;
    };

    return (
        <div className="w-full h-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 lg:pl-5">
            {/* Header section */}
            <div className="flex md:flex-row flex-col gap-5 justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left md:mt-0">
                        Warehouse Units
                    </h1>
                </div>
                {/* <div className="hidden lg:flex items-center gap-3">
                    <NotificationDropdown
                        notifications={warehouseNotifications}
                        unreadCount={notificationUnreadCount}
                    />
                    <UserDropdown />
                </div> */}
            </div>
            {/* end of header section */}

            {/* Search, Filter section - Only show when not in Add Unit mode */}
            {!showAddUnit && (
                <div className="flex flex-col gap-5 py-10">
                    {/* Search Bar */}
                    <div className="w-full h-[40px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center py-2 px-4">
                        <img src={miniSearchIcon} alt="Search" className="w-4 h-4" />
                        <input
                            type="text"
                            className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-sm ml-2"
                            placeholder="Search warehouse name, address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filters and Button */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 sm:flex-none sm:w-[180px]">
                                <select
                                    className="w-full h-[40px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#7B7B7ACC] pl-10 pr-10 outline-none border-none appearance-none cursor-pointer transition-colors focus:ring-0 focus:outline-none"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="Cold Storage">Cold Storage</option>
                                    <option value="Dry Storage">Dry Storage</option>
                                    <option value="Climate Controlled">Climate Controlled</option>
                                    <option value="General Storage">General Storage</option>
                                </select>
                                <img src={filterIcon} className="absolute left-3 top-1/2 -translate-y-1/2 size-[14px] pointer-events-none" alt="Filter" />
                            </div>
                            <div className="relative flex-1 sm:flex-none sm:w-[180px]">
                                <select
                                    className="w-full h-[40px] bg-[#F3F3F3] rounded-[6px] text-[14px] font-[500] text-[#7B7B7ACC] pl-10 pr-10 outline-none border-none appearance-none cursor-pointer transition-colors focus:ring-0 focus:outline-none"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="Available">Available</option>
                                    <option value="Occupied">Occupied</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                                <img src={filterIcon} className="absolute left-3 top-1/2 -translate-y-1/2 size-[14px] pointer-events-none" alt="Filter" />
                            </div>
                        </div>
                        <button
                            className="w-full sm:w-[140px] h-[40px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] hover:bg-[#074a94] transition-colors"
                            onClick={handleAddUnitClick}
                        >
                            Add Warehouse
                        </button>
                    </div>
                </div>
            )}

            {/* Add Unit or List */}
            {showAddUnit ? (
                <InlineAddUnit
                    onCancel={() => setShowAddUnit(false)}
                    onCreated={() => {
                        setShowAddUnit(false);
                        fetchUnits(1, itemsPerPage, searchTerm, typeFilter, statusFilter);
                    }}
                />
            ) : (
                <>
                    {/* States */}
                    {loading && (
                        <div className="text-center py-20">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#0955AC]"></div>
                            <p className="mt-4 text-gray-600">Loading...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="text-center py-20">
                            <p className="text-red-600 font-semibold mb-4">{error}</p>
                            <button onClick={() => fetchUnits()} className="px-6 py-3 bg-[#0955AC] text-white rounded-lg">
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && units.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-xl">
                            <p className="text-2xl font-bold text-gray-700 mb-3">No units found</p>
                            <button onClick={handleAddUnitClick} className="px-6 py-3 bg-[#0955AC] text-white rounded-lg">
                                Add Your First Warehouse
                            </button>
                        </div>
                    )}

                    {/* Cards */}
                    {!loading && !error && units.length > 0 && (
                        <div className="space-y-8">
                            {units.map((unit) => {
                                const imageUrl = getFirstImageUrl(unit);
                                return (
                                    <div
                                        key={unit.id}
                                        className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col lg:flex-row"
                                    >
                                        {/* Image */}
                                        <div className="w-full lg:w-72 h-56 sm:h-64 lg:h-auto lg:self-stretch bg-[#F3F3F3] flex-shrink-0">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={unit.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-lg sm:text-xl font-medium">
                                                    No Image
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-between min-w-0">
                                            <div>
                                                <h3 className="bebas-neue text-2xl sm:text-3xl lg:text-4xl font-normal leading-tight">
                                                    {unit.name}{" "}
                                                    <span className="text-[#0955AC]">[{unit.type}]</span>
                                                </h3>

                                                <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                                                    <span className={statusColor(unit.availability_status)}>
                                                        {unit.availability_status}
                                                    </span>
                                                    <span>Pricing: {unit.pricing_model?.replace(/_/g, " ") || "N/A"}</span>
                                                    <span>Area: {unit.total_area || "N/A"} sqft</span>
                                                    <span>Capacity: {unit.capacity || "N/A"}</span>
                                                </div>

                                                <p className="mt-2 sm:mt-3 text-gray-600 text-sm">{unit.address}</p>
                                                {unit.description && (
                                                    <p className="mt-2 sm:mt-3 text-gray-600 text-xs sm:text-sm line-clamp-2">{unit.description}</p>
                                                )}

                                                <div className="mt-5 flex flex-wrap gap-2">
                                                    {unit.approval_status && unit.approval_status !== "approved" && (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${unit.approval_status === "pending" ? "bg-yellow-500" : "bg-red-600"}`}>
                                                            {unit.approval_status === "pending" ? "Pending" : "Rejected"}
                                                        </span>
                                                    )}
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${unit.is_active ? "bg-green-600" : "bg-gray-500"}`}>
                                                        {unit.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                    {unit.approval_status === "approved" && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">Approved</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 sm:mt-8 flex lg:hidden flex-col sm:flex-row gap-2 sm:gap-3">
                                                <button
                                                    onClick={() => handleViewWarehouse(unit)}
                                                    className="flex-1 h-10 sm:h-12 bg-[#0955AC] text-white text-sm sm:text-base font-bold rounded-lg hover:bg-[#074a94] transition flex items-center justify-center gap-2"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => handleEditWarehouse(unit)}
                                                    className="h-10 sm:h-12 px-4 sm:px-6 bg-orange-500 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-orange-600"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteWarehouse(unit)}
                                                    className="h-10 sm:h-12 px-4 sm:px-6 bg-red-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(unit)}
                                                    className={`h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-bold rounded-lg text-white ${unit.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                                                >
                                                    {unit.is_active ? "Deactivate" : "Activate"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Icons (Hidden on mobile, shown on desktop) */}
                                        <div className="hidden lg:flex bg-[#D8E4F2] p-6 lg:p-8 lg:w-48 lg:flex-col justify-center items-center gap-4">
                                            <button onClick={() => handleViewWarehouse(unit)} className="w-28 h-10 bg-white border-2 border-[#0955AC] rounded-xl hover:bg-blue-50 transition flex items-center justify-center text-sm font-semibold text-[#0955AC]" title="View">
                                                View
                                            </button>
                                            <button onClick={() => handleEditWarehouse(unit)} className="w-28 h-10 bg-white border-2 border-orange-500 rounded-xl hover:bg-orange-50 transition flex items-center justify-center text-sm font-semibold text-orange-500" title="Edit">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDeleteWarehouse(unit)} className="w-28 h-10 bg-white border-2 border-red-600 rounded-xl hover:bg-red-50 transition flex items-center justify-center text-sm font-semibold text-red-600" title="Delete">
                                                Delete
                                            </button>
                                            <button onClick={() => handleToggleStatus(unit)} className={`w-28 h-10 bg-white border-2 rounded-xl transition flex items-center justify-center text-sm font-semibold ${unit.is_active ? "border-red-600 text-red-600 hover:bg-red-50" : "border-green-600 text-green-600 hover:bg-green-50"}`} title={unit.is_active ? "Deactivate" : "Activate"}>
                                                {unit.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 mt-8 sm:mt-12">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-700 text-sm sm:text-base">Per page</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="px-3 sm:px-4 py-2 bg-white border rounded-lg text-sm sm:text-base"
                                >
                                    {perPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-9 px-2 sm:size-10 rounded-lg bg-white border disabled:opacity-50 hover:bg-gray-50 text-xs sm:text-base">Prev</button>
                                {getPageNumbers().map((n, i) => (
                                    n === "..." ? <span key={i} className="px-1">...</span> :
                                        <button key={n} onClick={() => goToPage(n)} className={`size-9 sm:size-10 rounded-lg font-semibold text-sm sm:text-base ${currentPage === n ? "bg-[#0955AC] text-white" : "bg-white border hover:bg-gray-50"}`}>
                                            {n}
                                        </button>
                                ))}
                                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-9 px-2 sm:size-10 rounded-lg bg-white border disabled:opacity-50 hover:bg-gray-50 text-xs sm:text-base">Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modals - unchanged */}
            {showConfirmModal && unitToToggle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Status Change</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to <strong>{unitToToggle.is_active ? "deactivate" : "activate"}</strong> "<strong>{unitToToggle.name}</strong>"?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowConfirmModal(false)} disabled={isToggling} className="px-5 py-2 border rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={confirmToggleStatus} disabled={isToggling} className={`px-5 py-2 text-white rounded-lg ${unitToToggle.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                                {isToggling ? "Updating..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && unitToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Delete Warehouse Unit</h3>
                        <p className="text-gray-600 mb-6">
                            Permanently delete "<strong>{unitToDelete.name}</strong>"? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-5 py-2 border rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={confirmDeleteWarehouse} disabled={isDeleting} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnitContent;