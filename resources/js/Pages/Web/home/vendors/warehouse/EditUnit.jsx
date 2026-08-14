import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Inertia } from '@inertiajs/inertia';
import { usePage } from '@inertiajs/react';
import VendorShellLayout from '../../../../../Components/vendors/VendorShellLayout';
import { API_BASE_URL } from '../../../../../config/api';

// Header icons
import search from '../../../assets/vendors/dashboard/searchIcon.svg';
import settings from '../../../assets/vendors/dashboard/settings.svg';
import bell from '../../../assets/vendors/dashboard/bell.svg';
import proPic from '../../../assets/vendors/dashboard/proPic.svg';
import backArrow from '../../../assets/vendors/units/backArrow.svg';

const warehouseTypes = [
  { value: 'general_warehouse', label: 'General Warehouse' },
  { value: 'bonded_warehouse', label: 'Bonded Warehouse' },
  { value: 'cold_storage', label: 'Cold Storage' },
  { value: 'distribution_center', label: 'Distribution Center' },
  { value: 'fulfillment_center', label: 'Fulfillment Center' },
  { value: 'smart_warehouse', label: 'Smart Warehouse' },
];

// What a client can book on top of storage. "Fulfillment" here is the single
// source of truth for whether this listing offers the fulfillment add-on —
// the backend derives offers_fulfillment from this list.
const warehouseServices = [
  { value: 'storage', label: 'Storage' },
  { value: 'fulfillment', label: 'Fulfillment' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'value_added_services', label: 'Value Added Services' },
  { value: 'customs_services', label: 'Customs Services' },
  { value: 'transportation', label: 'Transportation' },
];

const pricingModels = [
  'per_sqft_monthly', 'per_sqft_daily', 'per_pallet_monthly',
  'per_pallet_daily', 'flat_rate_monthly', 'flat_rate_daily',
  'monthly', 'daily', 'hourly' // Legacy values for backwards compatibility
];

const defaultAmenities = [
  'Loading Dock', 'Forklift Access', 'Temperature Control', 'Humidity Control',
  'Security System', 'CCTV', '24/7 Access', 'Fire Safety', 'Climate Control',
  'Refrigeration', 'Power Backup', 'Internet Access', 'Office Space'
];

const EditUnit = () => {
  const { unitId } = usePage().props;
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    total_area: '',
    capacity: '',
    type: '',
    pricing_model: '',
    price: '',

    // Detailed Pricing
    monthly_rate: '',
    security_deposit: '',
    setup_fee: '',
    tax_rate: '',
    services: [],
    fulfillment_fee_rate: '',
    total_amount: '',
    tax_amount: '',
    final_amount: '',

    amenities: [],
    terms_conditions: '',
    is_active: true,
  });

  const [originalData, setOriginalData] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorItems, setErrorItems] = useState([]);
  const [changedFields, setChangedFields] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [amenityOptions, setAmenityOptions] = useState(defaultAmenities);

  // Existing files
  const [existingImages, setExistingImages] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [existingTermsPdf, setExistingTermsPdf] = useState(null);

  // Store original file paths for removal (separate from display URLs)
  const [originalImagePaths, setOriginalImagePaths] = useState([]);
  const [originalDocumentPaths, setOriginalDocumentPaths] = useState([]);
  const [originalTermsPdfPath, setOriginalTermsPdfPath] = useState(null);

  // New files
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [newDocumentFiles, setNewDocumentFiles] = useState([]);
  const [newTermsPdfFile, setNewTermsPdfFile] = useState(null);
  const [newTermsPdfUrl, setNewTermsPdfUrl] = useState('');

  // Files to remove
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [documentsToRemove, setDocumentsToRemove] = useState([]);
  const [removeTermsPdf, setRemoveTermsPdf] = useState(false);

  // Google Maps
  const mapScriptLoadedRef = useRef(false);
  const autoInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const googleApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  // Load warehouse data
  useEffect(() => {
    const fetchWarehouseData = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorItems([]);

        console.log('Fetching warehouse data for unit ID:', unitId);

        // Debug request first
        try {
          const debugResponse = await fetch(`${API_BASE_URL}vendors/warehouse/api/debug/${unitId}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
          });

          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('Debug info:', debugData);
          }
        } catch (debugError) {
          console.warn('Debug request failed:', debugError);
        }

        const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/units/${unitId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'same-origin',
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response body:', errorText);

          if (response.status === 404) {
            throw new Error('Warehouse unit not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to edit this warehouse unit');
          } else if (response.status === 500) {
            throw new Error('Server error occurred while fetching warehouse data');
          } else {
            throw new Error(`Failed to fetch warehouse data (Status: ${response.status}): ${errorText}`);
          }
        }

        const data = await response.json();
        console.log('Received warehouse data:', data);

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format received from server');
        }

        setOriginalData(data);

        // Safely extract values with proper fallbacks
        const safeNumber = (val) => val !== null && val !== undefined && val !== '' ? String(val) : '';
        const safeString = (val) => val !== null && val !== undefined ? String(val) : '';

        setForm({
          name: safeString(data.name),
          description: safeString(data.description),
          address: safeString(data.address),
          latitude: safeNumber(data.latitude),
          longitude: safeNumber(data.longitude),
          total_area: safeNumber(data.total_area),
          capacity: safeNumber(data.capacity),
          type: safeString(data.type),
          pricing_model: safeString(data.pricing_model),
          price: safeNumber(data.price || data.base_price),

          // Detailed Pricing
          monthly_rate: safeNumber(data.monthly_rate),
          security_deposit: safeNumber(data.security_deposit),
          setup_fee: safeNumber(data.setup_fee),
          tax_rate: safeNumber(data.tax_rate),
          services: Array.isArray(data.services) ? data.services : [],
          fulfillment_fee_rate: safeNumber(data.fulfillment_fee_rate),
          total_amount: safeNumber(data.total_amount),
          tax_amount: safeNumber(data.tax_amount),
          final_amount: safeNumber(data.final_amount),

          amenities: Array.isArray(data.amenities) ? data.amenities : [],
          terms_conditions: safeString(data.terms_conditions),
          is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
        });

        // Set existing files - images and documents come as URLs
        const imagesArray = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
        const documentsArray = Array.isArray(data.documents) ? data.documents.filter(Boolean) : [];

        console.log('Setting existing images:', imagesArray);
        console.log('Setting existing documents:', documentsArray);
        console.log('Setting existing terms PDF:', data.terms_pdf_path);

        setExistingImages(imagesArray);
        setExistingDocuments(documentsArray);
        setExistingTermsPdf(data.terms_pdf_path || null);

        // Store original file paths for removal (extract from URLs)
        const imagePaths = imagesArray.map(url => {
          if (typeof url === 'string') {
            // Extract path from URL like /storage/warehouse/images/filename.jpg
            if (url.startsWith('/storage/')) {
              return url.replace('/storage/', '');
            } else if (url.includes('/storage/')) {
              // Handle full URLs like http://domain.com/storage/path
              const parts = url.split('/storage/');
              return parts.length > 1 ? parts[1] : url;
            }
            return url;
          }
          return url;
        });

        const documentPaths = documentsArray.map(url => {
          if (typeof url === 'string') {
            if (url.startsWith('/storage/')) {
              return url.replace('/storage/', '');
            } else if (url.includes('/storage/')) {
              const parts = url.split('/storage/');
              return parts.length > 1 ? parts[1] : url;
            }
            return url;
          }
          return url;
        });

        const termsPdfPath = data.terms_pdf_path && typeof data.terms_pdf_path === 'string'
          ? (data.terms_pdf_path.startsWith('/storage/')
            ? data.terms_pdf_path.replace('/storage/', '')
            : (data.terms_pdf_path.includes('/storage/')
              ? data.terms_pdf_path.split('/storage/')[1]
              : data.terms_pdf_path))
          : data.terms_pdf_path;

        console.log('Setting original image paths:', imagePaths);
        console.log('Setting original document paths:', documentPaths);
        console.log('Setting original terms PDF path:', termsPdfPath);

        setOriginalImagePaths(imagePaths);
        setOriginalDocumentPaths(documentPaths);
        setOriginalTermsPdfPath(termsPdfPath);

        // Add custom amenities to options
        if (Array.isArray(data.amenities)) {
          const customAmenities = data.amenities.filter(amenity => !defaultAmenities.includes(amenity));
          if (customAmenities.length > 0) {
            setAmenityOptions(prev => [...prev, ...customAmenities]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching warehouse data:', error);
        setError(error);
        setErrorItems([error.message || 'Failed to load warehouse data. Please try again.']);
        setShowErrorModal(true);
        setLoading(false);
      }
    };

    if (unitId) {
      fetchWarehouseData();
    } else {
      setErrorItems(['Invalid warehouse unit ID']);
      setShowErrorModal(true);
      setLoading(false);
    }
  }, [unitId]);

  // Detect changes
  useEffect(() => {
    if (!originalData) return;

    const changes = [];

    if (form.name !== originalData.name) changes.push('Name');
    if (form.address !== originalData.address) changes.push('Address');
    if (String(form.latitude) !== String(originalData.latitude || '')) changes.push('Latitude');
    if (String(form.longitude) !== String(originalData.longitude || '')) changes.push('Longitude');
    if (String(form.total_area) !== String(originalData.total_area || '')) changes.push('Total Area');
    if (String(form.capacity) !== String(originalData.capacity || '')) changes.push('Capacity');
    if (form.type !== originalData.type) changes.push('Type');
    if (form.pricing_model !== originalData.pricing_model) changes.push('Pricing Model');
    if (String(form.price) !== String(originalData.price || '')) changes.push('Price');

    // Detailed pricing changes
    if (String(form.monthly_rate) !== String(originalData.monthly_rate || '')) changes.push('Monthly Rate');
    if (String(form.security_deposit) !== String(originalData.security_deposit || '')) changes.push('Security Deposit');
    if (String(form.setup_fee) !== String(originalData.setup_fee || '')) changes.push('Setup Fee');
    if (String(form.tax_rate) !== String(originalData.tax_rate || '')) changes.push('Tax Rate');
    if (JSON.stringify([...(form.services || [])].sort()) !== JSON.stringify([...(originalData.services || [])].sort())) changes.push('Services');
    if (String(form.fulfillment_fee_rate) !== String(originalData.fulfillment_fee_rate || '')) changes.push('Fulfillment Fee Rate');
    if (String(form.final_amount) !== String(originalData.final_amount || '')) changes.push('Final Amount');

    if (form.terms_conditions !== (originalData.terms_conditions || '')) changes.push('Terms & Conditions');
    if (form.is_active !== originalData.is_active) changes.push('Active Status');

    // Check amenities changes
    const originalAmenities = originalData.amenities || [];
    const currentAmenities = form.amenities || [];
    if (JSON.stringify(originalAmenities.sort()) !== JSON.stringify(currentAmenities.sort())) {
      changes.push('Amenities');
    }

    // Check file changes
    if (newImageFiles.length > 0) changes.push('New Images');
    if (imagesToRemove.length > 0) changes.push('Removed Images');
    if (newDocumentFiles.length > 0) changes.push('New Documents');
    if (documentsToRemove.length > 0) changes.push('Removed Documents');
    if (newTermsPdfFile) changes.push('New Terms PDF');
    if (removeTermsPdf) changes.push('Removed Terms PDF');

    setChangedFields(changes);
  }, [form, originalData, newImageFiles, imagesToRemove, newDocumentFiles, documentsToRemove, newTermsPdfFile, removeTermsPdf]);

  // Calculate pricing totals automatically
  const calculatePricingTotals = () => {
    const monthlyRate = parseFloat(form.monthly_rate) || 0;
    const securityDeposit = parseFloat(form.security_deposit) || 0;
    const setupFee = parseFloat(form.setup_fee) || 0;
    const taxRate = parseFloat(form.tax_rate) || 0;

    const subtotal = monthlyRate + securityDeposit + setupFee;
    const taxAmount = (subtotal * taxRate) / 100;
    const finalAmount = subtotal + taxAmount;

    setForm(prevForm => ({
      ...prevForm,
      total_amount: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      final_amount: finalAmount.toFixed(2)
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (type === 'file') {
      if (name === 'images') {
        const list = Array.from(files || []);

        // Validate file count
        const totalImages = existingImages.length - imagesToRemove.length + newImageFiles.length + list.length;
        if (totalImages > 20) {
          setErrors(prev => ({ ...prev, images: 'You can upload a maximum of 20 images.' }));
          return;
        }

        // Validate file sizes
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        const invalidFiles = list.filter(file => file.size > maxSize);
        if (invalidFiles.length > 0) {
          setErrors(prev => ({ ...prev, images: `Some images are too large. Maximum size is 10MB per image.` }));
          return;
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        const invalidTypes = list.filter(file => !allowedTypes.includes(file.type));
        if (invalidTypes.length > 0) {
          setErrors(prev => ({ ...prev, images: 'Only JPEG, PNG, GIF, WebP, and SVG images are allowed.' }));
          return;
        }

        const nextFiles = [...newImageFiles, ...list];
        setNewImageFiles(nextFiles);
        const newUrls = list.map((f) => URL.createObjectURL(f));
        setNewImagePreviews((prev) => [...prev, ...newUrls]);

      } else if (name === 'documents') {
        const list = Array.from(files || []);

        // Validate file count
        const totalDocs = existingDocuments.length - documentsToRemove.length + newDocumentFiles.length + list.length;
        if (totalDocs > 20) {
          setErrors(prev => ({ ...prev, documents: 'You can upload a maximum of 20 documents.' }));
          return;
        }

        // Validate file sizes
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        const invalidFiles = list.filter(file => file.size > maxSize);
        if (invalidFiles.length > 0) {
          setErrors(prev => ({ ...prev, documents: `Some documents are too large. Maximum size is 10MB per document.` }));
          return;
        }

        // Validate file types
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const invalidTypes = list.filter(file => !allowedTypes.includes(file.type));
        if (invalidTypes.length > 0) {
          setErrors(prev => ({ ...prev, documents: 'Only PDF, DOC, DOCX, and TXT files are allowed.' }));
          return;
        }

        const nextFiles = [...newDocumentFiles, ...list];
        setNewDocumentFiles(nextFiles);

      } else if (name === 'terms_pdf') {
        const file = files && files[0] ? files[0] : null;

        if (file) {
          // Validate file size
          const maxSize = 10 * 1024 * 1024; // 10MB in bytes
          if (file.size > maxSize) {
            setErrors(prev => ({ ...prev, terms_pdf: 'Terms PDF file is too large. Maximum size is 10MB.' }));
            return;
          }

          // Validate file type
          if (file.type !== 'application/pdf') {
            setErrors(prev => ({ ...prev, terms_pdf: 'Only PDF files are allowed for terms and conditions.' }));
            return;
          }
        }

        setNewTermsPdfFile(file);
        if (file) setNewTermsPdfUrl(URL.createObjectURL(file));
        if (file) setRemoveTermsPdf(false); // If uploading new, don't remove existing
      }
    } else if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenityChange = (amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleServiceChange = (service) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const addAmenity = () => {
    const trimmed = amenityInput.trim();
    if (!trimmed) return;
    if (!amenityOptions.includes(trimmed)) setAmenityOptions((prev) => [...prev, trimmed]);
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(trimmed) ? prev.amenities : [...prev.amenities, trimmed]
    }));
    setAmenityInput('');
  };

  const removeNewImageAt = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      const arr = [...prev];
      const [url] = arr.splice(index, 1);
      if (url) URL.revokeObjectURL(url);
      return arr;
    });
  };

  const removeExistingImage = (imageUrl) => {
    // Find the corresponding original path
    const index = existingImages.indexOf(imageUrl);
    if (index !== -1 && originalImagePaths[index]) {
      setImagesToRemove(prev => [...prev, originalImagePaths[index]]);
    }
  };

  const restoreExistingImage = (imageUrl) => {
    // Find the corresponding original path
    const index = existingImages.indexOf(imageUrl);
    if (index !== -1 && originalImagePaths[index]) {
      setImagesToRemove(prev => prev.filter(img => img !== originalImagePaths[index]));
    }
  };

  const removeExistingDocument = (docUrl) => {
    // Find the corresponding original path
    const index = existingDocuments.indexOf(docUrl);
    if (index !== -1 && originalDocumentPaths[index]) {
      setDocumentsToRemove(prev => [...prev, originalDocumentPaths[index]]);
    }
  };

  const restoreExistingDocument = (docUrl) => {
    // Find the corresponding original path
    const index = existingDocuments.indexOf(docUrl);
    if (index !== -1 && originalDocumentPaths[index]) {
      setDocumentsToRemove(prev => prev.filter(doc => doc !== originalDocumentPaths[index]));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!form.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (!form.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!form.type) {
      newErrors.type = 'Warehouse type is required';
    }

    if (!form.pricing_model) {
      newErrors.pricing_model = 'Pricing model is required';
    }

    // Optional but recommended validations
    if (form.total_area && (isNaN(form.total_area) || parseFloat(form.total_area) <= 0)) {
      newErrors.total_area = 'Total area must be a positive number';
    }

    if (form.capacity && (isNaN(form.capacity) || parseFloat(form.capacity) <= 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }

    if (form.price && (isNaN(form.price) || parseFloat(form.price) < 0)) {
      newErrors.price = 'Price must be a positive number';
    }

    // Detailed pricing validation
    if (!form.monthly_rate || isNaN(form.monthly_rate) || parseFloat(form.monthly_rate) <= 0) {
      newErrors.monthly_rate = 'Monthly rate is required and must be a positive number';
    }

    if (form.security_deposit && (isNaN(form.security_deposit) || parseFloat(form.security_deposit) < 0)) {
      newErrors.security_deposit = 'Security deposit must be a positive number';
    }

    if (form.setup_fee && (isNaN(form.setup_fee) || parseFloat(form.setup_fee) < 0)) {
      newErrors.setup_fee = 'Setup fee must be a positive number';
    }

    if (form.tax_rate && (isNaN(form.tax_rate) || parseFloat(form.tax_rate) < 0 || parseFloat(form.tax_rate) > 100)) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100 percent';
    }

    if (form.fulfillment_fee_rate && (isNaN(form.fulfillment_fee_rate) || parseFloat(form.fulfillment_fee_rate) < 0 || parseFloat(form.fulfillment_fee_rate) > 100)) {
      newErrors.fulfillment_fee_rate = 'Fulfillment fee must be between 0 and 100 percent';
    }

    if (form.latitude && (isNaN(form.latitude) || parseFloat(form.latitude) < -90 || parseFloat(form.latitude) > 90)) {
      newErrors.latitude = 'Latitude must be between -90 and 90';
    }

    if (form.longitude && (isNaN(form.longitude) || parseFloat(form.longitude) < -180 || parseFloat(form.longitude) > 180)) {
      newErrors.longitude = 'Longitude must be between -180 and 180';
    }

    // Terms & Conditions validation
    const hasInlineTerms = form.terms_conditions.trim();
    const hasExistingPdf = existingTermsPdf && !removeTermsPdf;
    const hasNewPdf = newTermsPdfFile;

    if (!hasInlineTerms && !hasExistingPdf && !hasNewPdf) {
      newErrors.terms_conditions = 'Terms & Conditions are required - please provide either inline terms or upload a PDF';
    }

    // Images validation - require at least one image after all operations
    const remainingImages = existingImages.length - imagesToRemove.length + newImageFiles.length;
    if (remainingImages === 0) {
      newErrors.images = 'At least one warehouse image is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if there are any changes
    if (changedFields.length === 0) {
      setErrorItems(['No changes detected. Please make some changes before saving.']);
      setShowErrorModal(true);
      return;
    }

    // Validate form
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const errorList = Object.values(validationErrors);
      setErrorItems(errorList);
      setShowErrorModal(true);
      return;
    }

    // Clear any previous errors
    setErrors({});
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);

    try {
      const data = new FormData();

      // Add method override for Laravel to handle PUT request properly
      data.append('_method', 'PUT');

      // Basic form data
      data.append('name', form.name);
      data.append('description', form.description || '');
      data.append('address', form.address);
      data.append('latitude', form.latitude || '');
      data.append('longitude', form.longitude || '');
      data.append('total_area', form.total_area || '');
      data.append('capacity', form.capacity || '');
      data.append('type', form.type);
      data.append('pricing_model', form.pricing_model);
      data.append('price', form.price || '');

      // Detailed pricing fields
      data.append('monthly_rate', form.monthly_rate || '');
      data.append('security_deposit', form.security_deposit || '');
      data.append('setup_fee', form.setup_fee || '');
      data.append('tax_rate', form.tax_rate || '');
      data.append('services', JSON.stringify(form.services || []));
      data.append('fulfillment_fee_rate', form.fulfillment_fee_rate || '');
      data.append('total_amount', form.total_amount || '');
      data.append('tax_amount', form.tax_amount || '');
      data.append('final_amount', form.final_amount || '');

      data.append('terms_conditions', form.terms_conditions || '');
      data.append('is_active', form.is_active ? '1' : '0');
      data.append('amenities', JSON.stringify(form.amenities || []));

      // File operations
      newImageFiles.forEach((f) => data.append('images[]', f));
      newDocumentFiles.forEach((f) => data.append('documents[]', f));
      if (newTermsPdfFile) data.append('terms_pdf', newTermsPdfFile);

      // Files to remove - use the stored original paths
      if (imagesToRemove.length > 0) {
        imagesToRemove.forEach(filePath => data.append('remove_images[]', filePath));
      }
      if (documentsToRemove.length > 0) {
        documentsToRemove.forEach(filePath => data.append('remove_documents[]', filePath));
      }
      if (removeTermsPdf) {
        data.append('remove_terms_pdf', '1');
      }

      // Get CSRF token from meta tag
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

      const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/units/${unitId}`, {
        method: 'POST',
        headers: {
          ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
        body: data,
        credentials: 'same-origin',
      });

      // Handle different response scenarios
      if (!response.ok) {
        if (response.status === 422) {
          // Validation errors
          try {
            const errorData = await response.json();
            const validationErrors = errorData.errors || {};
            setErrors(validationErrors);

            // Flatten validation errors for display
            const errorList = Object.values(validationErrors).flat().map((msg) => String(msg));
            setErrorItems(errorList.length > 0 ? errorList : ['Validation failed']);
            setShowErrorModal(true);
            return;
          } catch (parseError) {
            setErrorItems(['Invalid response format. Please try again.']);
            setShowErrorModal(true);
            return;
          }
        } else if (response.status === 419) {
          // CSRF token mismatch
          setErrorItems(['CSRF token mismatch. Please refresh the page and try again.']);
          setShowErrorModal(true);
          return;
        } else if (response.status === 413) {
          // Payload too large
          setErrorItems(['The uploaded files are too large. Please reduce file sizes and try again.']);
          setShowErrorModal(true);
          return;
        } else if (response.status === 404) {
          // Not found
          setErrorItems(['Warehouse unit not found. It may have been deleted.']);
          setShowErrorModal(true);
          return;
        } else if (response.status === 403) {
          // Forbidden
          setErrorItems(['You do not have permission to edit this warehouse unit.']);
          setShowErrorModal(true);
          return;
        } else {
          // Other errors
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`);
          } catch (parseError) {
            throw new Error(`Server error: ${response.status}. Please try again.`);
          }
        }
      }

      // Parse successful response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Error parsing success response:', parseError);
        // Even if we can't parse the response, the update was successful
        responseData = { success: true, message: 'Warehouse unit updated successfully.' };
      }

      // Success
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error updating warehouse:', error);
      setErrorItems([error?.message || 'Something went wrong. Please try again.']);
      setShowErrorModal(true);
    }
  };

  // Google Maps script loader and autocomplete
  useEffect(() => {
    if (!googleApiKey || mapScriptLoadedRef.current) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      mapScriptLoadedRef.current = true;
      if (autoInputRef.current && window.google) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(autoInputRef.current, {
          fields: ['formatted_address', 'geometry', 'name']
        });
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (!place || !place.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setForm((prev) => ({
            ...prev,
            address: place.formatted_address || prev.address,
            latitude: lat,
            longitude: lng
          }));
        });
      }
    };
    document.body.appendChild(script);
  }, [googleApiKey]);

  // Run calculation whenever pricing fields change
  useEffect(() => {
    calculatePricingTotals();
  }, [form.monthly_rate, form.security_deposit, form.setup_fee, form.tax_rate]);

  const mapPreviewUrl = useMemo(() => {
    if (!form.latitude || !form.longitude) return '';
    return `https://www.google.com/maps/embed/v1/view?key=${googleApiKey}&center=${form.latitude},${form.longitude}&zoom=15&maptype=roadmap`;
  }, [form.latitude, form.longitude, googleApiKey]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setForm((prev) => ({ ...prev, latitude, longitude }));
    });
  };

  if (loading) {
    return (
      <VendorShellLayout activeService="Warehousing">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading warehouse data...</div>
        </div>
      </VendorShellLayout>
    );
  }

  return (
    <VendorShellLayout activeService="Warehousing">
      <div className="w-full h-auto pr-5 py-10 poppins">

        {/* Breadcrumb navigation */}
        <div className="pt-6">
          <div
            className="flex flex-row gap-5 items-center cursor-pointer"
            onClick={() => (window.location.href = "/vendors/warehouse/units")}
          >
            <img src={backArrow} alt="Back" />
            <h1 className="text-[22px] font-[500] text-[#00000080]">
              Warehouse Units / Edit Unit
            </h1>
          </div>
        </div>

        {/* Changes indicator */}
        {changedFields.length > 0 && (
          <div className="mt-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              <span className="text-amber-800 font-medium">Changes detected:</span>
              <span className="text-amber-700 ml-2">{changedFields.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 mb-6">
          <button
            type="button"
            className="w-[100px] h-[40px] border border-[#7B7B7A] text-[#7B7B7A] font-[600] rounded-[6px] text-[14px] hover:bg-gray-50"
            onClick={() => (window.location.href = '/vendors/warehouse/units')}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="warehouse-form"
            className="w-[120px] h-[40px] bg-[#0955AC] text-[#FFFFFF] font-[600] rounded-[6px] text-[14px] hover:bg-[#0844A0]"
            disabled={changedFields.length === 0}
          >
            Save Changes
          </button>
        </div>

        <div>
          <form id="warehouse-form" onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6 font-[400]">
            {/* Basic Information */}
            <section className="bg-[#FFFFFF] p-8 rounded-[10px] shadow-[4px_4px_4px_#0000001A]">
              <h2 className="text-[20px] font-[700] text-[#000000] mb-8">Warehouse Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-[14px] font-[600] text-[#000000]">Warehouse Name *</label>
                  <input
                    id="name"
                    name="name"
                    className="w-full border border-[#D1D5DB] rounded-[6px] px-4 py-3 focus:ring-2 focus:ring-[#0955AC] focus:border-[#0955AC] text-[14px]"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g., Central Cold Storage A"
                    required
                  />
                  {errors.name && <div className="text-[#DC2626] text-[12px] mt-1">{errors.name}</div>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="type" className="block text-[14px] font-[600] text-[#000000]">Warehouse Type *</label>
                  <select
                    id="type"
                    name="type"
                    className="w-full border border-[#D1D5DB] rounded-[6px] px-4 py-3 focus:ring-2 focus:ring-[#0955AC] focus:border-[#0955AC] bg-white text-[14px]"
                    value={form.type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select warehouse type</option>
                    {warehouseTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {errors.type && <div className="text-[#DC2626] text-[12px] mt-1">{errors.type}</div>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="pricing_model" className="block text-[14px] font-[600] text-[#000000]">Pricing Model *</label>
                  <select
                    id="pricing_model"
                    name="pricing_model"
                    className="w-full border border-[#D1D5DB] rounded-[6px] px-4 py-3 focus:ring-2 focus:ring-[#0955AC] focus:border-[#0955AC] bg-white text-[14px]"
                    value={form.pricing_model}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select pricing model</option>
                    {pricingModels.map((model) => (
                      <option key={model} value={model}>{model.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                  </select>
                  {errors.pricing_model && <div className="text-[#DC2626] text-[12px] mt-1">{errors.pricing_model}</div>}
                </div>

                <div className="space-y-2 col-span-full">
                  <label htmlFor="address" className="block text-[14px] font-[600] text-[#000000]">Full Address *</label>
                  <input
                    ref={autoInputRef}
                    id="address"
                    name="address"
                    className="w-full border border-[#D1D5DB] rounded-[6px] px-4 py-3 focus:ring-2 focus:ring-[#0955AC] focus:border-[#0955AC] text-[14px]"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Search or enter the address"
                    required
                  />
                  {errors.address && <div className="text-[#DC2626] text-[12px] mt-1">{errors.address}</div>}
                  <div className="flex items-center gap-3 mt-2">
                    <button type="button" onClick={useCurrentLocation} className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50">Use current location</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Location & Capacity */}
            <section className="bg-[#FFFFFF] p-6 rounded-lg">
              <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Location & Capacity Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label htmlFor="latitude" className="block text-[14px] font-medium text-gray-700">Latitude</label>
                  <input
                    id="latitude"
                    type="number"
                    name="latitude"
                    step="0.000001"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="e.g., 6.9271"
                  />
                  {errors.latitude && <div className="text-[#DC2626] text-[12px] mt-1">{errors.latitude}</div>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="longitude" className="block text-[14px] font-medium text-gray-700">Longitude</label>
                  <input
                    id="longitude"
                    type="number"
                    name="longitude"
                    step="0.000001"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="e.g., 79.8612"
                  />
                  {errors.longitude && <div className="text-[#DC2626] text-[12px] mt-1">{errors.longitude}</div>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="total_area" className="block text-[14px] font-medium text-gray-700">Total Area (sqft)</label>
                  <input
                    id="total_area"
                    type="number"
                    name="total_area"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.total_area}
                    onChange={handleChange}
                    placeholder="e.g., 2500"
                  />
                  {errors.total_area && <div className="text-[#DC2626] text-[12px] mt-1">{errors.total_area}</div>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="capacity" className="block text-[14px] font-medium text-gray-700">Capacity (units)</label>
                  <input
                    id="capacity"
                    type="number"
                    name="capacity"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 5000"
                  />
                  {errors.capacity && <div className="text-[#DC2626] text-[12px] mt-1">{errors.capacity}</div>}
                </div>
              </div>

              {mapPreviewUrl && (
                <div className="mt-6">
                  <label className="block text-[14px] font-medium text-gray-700 mb-2">Map Preview</label>
                  <div className="aspect-[16/9] w-full border rounded-lg overflow-hidden">
                    <iframe
                      title="map-preview"
                      width="100%"
                      height="100%"
                      src={mapPreviewUrl}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-[14px] font-medium text-gray-700">Basic Price (Legacy)</label>
                  <input
                    id="price"
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g., 15.50"
                  />
                  {errors.price && <div className="text-[#DC2626] text-[12px] mt-1">{errors.price}</div>}
                </div>
                <div className="space-y-2">
                  <label className="block text-[14px] font-medium text-gray-700">Status</label>
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active Warehouse</span>
                  </label>
                </div>
              </div>

              {/* Detailed Pricing Section */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="monthly_rate" className="block text-[14px] font-medium text-gray-700">Monthly Rate ($) *</label>
                    <input
                      id="monthly_rate"
                      type="number"
                      name="monthly_rate"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={form.monthly_rate}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                    {errors.monthly_rate && <div className="text-red-600 text-sm mt-1">{errors.monthly_rate}</div>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="security_deposit" className="block text-[14px] font-medium text-gray-700">Security Deposit ($)</label>
                    <input
                      id="security_deposit"
                      type="number"
                      name="security_deposit"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={form.security_deposit}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                    {errors.security_deposit && <div className="text-red-600 text-sm mt-1">{errors.security_deposit}</div>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="setup_fee" className="block text-[14px] font-medium text-gray-700">Setup Fee ($)</label>
                    <input
                      id="setup_fee"
                      type="number"
                      name="setup_fee"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={form.setup_fee}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                    {errors.setup_fee && <div className="text-red-600 text-sm mt-1">{errors.setup_fee}</div>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tax_rate" className="block text-[14px] font-medium text-gray-700">Tax Rate (%)</label>
                    <input
                      id="tax_rate"
                      type="number"
                      name="tax_rate"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={form.tax_rate}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                    {errors.tax_rate && <div className="text-red-600 text-sm mt-1">{errors.tax_rate}</div>}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-[14px] font-medium text-gray-700">Services offered on this listing</label>
                    <p className="text-[12px] text-gray-500 mb-2">
                      What clients can book on top of storage. Shown to clients as a separate "Services" filter from Warehouse Type.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {warehouseServices.map((service) => (
                        <label key={service.value} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                          <input
                            type="checkbox"
                            checked={form.services.includes(service.value)}
                            onChange={() => handleServiceChange(service.value)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[13px] text-gray-700">{service.label}</span>
                        </label>
                      ))}
                    </div>
                    {form.services.includes('fulfillment') && (
                      <div className="mt-2">
                        <label htmlFor="fulfillment_fee_rate" className="block text-[14px] font-medium text-gray-700">
                          Fulfillment Fee (% of monthly rate)
                        </label>
                        <input
                          id="fulfillment_fee_rate"
                          type="number"
                          name="fulfillment_fee_rate"
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-1"
                          value={form.fulfillment_fee_rate}
                          onChange={handleChange}
                          placeholder="Leave blank to use the platform default (15%)"
                        />
                        {errors.fulfillment_fee_rate && <div className="text-red-600 text-sm mt-1">{errors.fulfillment_fee_rate}</div>}
                      </div>
                    )}
                  </div>

                  {/* Calculated fields - read only with gray background */}
                  <div className="space-y-2">
                    <label htmlFor="total_amount" className="block text-[14px] font-medium text-gray-700">Total Amount (before tax) ($)</label>
                    <input
                      id="total_amount"
                      type="number"
                      name="total_amount"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-100 text-gray-600"
                      value={form.total_amount}
                      readOnly
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tax_amount" className="block text-[14px] font-medium text-gray-700">Tax Amount ($)</label>
                    <input
                      id="tax_amount"
                      type="number"
                      name="tax_amount"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-100 text-gray-600"
                      value={form.tax_amount}
                      readOnly
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="final_amount" className="block text-[14px] font-medium text-gray-700">Final Amount (total incl. tax) ($)</label>
                    <input
                      id="final_amount"
                      type="number"
                      name="final_amount"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-100 text-gray-600 font-semibold"
                      value={form.final_amount}
                      readOnly
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities */}
            <section className="bg-[#FFFFFF] p-6 rounded-lg">
              <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Warehouse Amenities</h2>
              <div className="flex items-center gap-2 mb-4">
                <input
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  placeholder="Add a custom amenity"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button type="button" onClick={addAmenity} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenityOptions.map((amenity) => (
                  <label key={amenity} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(amenity)}
                      onChange={() => handleAmenityChange(amenity)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Terms & Conditions */}
            <section className="bg-[#FFFFFF] p-6 rounded-lg">
              <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Terms & Conditions *</h2>
              <div className="space-y-2">
                <label htmlFor="terms_conditions" className="block text-[14px] font-medium text-gray-700">Inline Terms (optional if PDF provided)</label>
                <textarea
                  id="terms_conditions"
                  name="terms_conditions"
                  rows="6"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.terms_conditions}
                  onChange={handleChange}
                  placeholder="Enter terms and conditions for warehouse rental..."
                />
                {errors.terms_conditions && <div className="text-[#DC2626] text-[12px] mt-1">{errors.terms_conditions}</div>}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Existing Terms PDF */}
                {existingTermsPdf && !removeTermsPdf && (
                  <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-gray-700">Current Terms PDF</label>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Terms & Conditions PDF</span>
                        <div className="flex gap-2">
                          <a href={existingTermsPdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">View</a>
                          <button type="button" onClick={() => setRemoveTermsPdf(true)} className="text-red-600 text-sm hover:underline">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Removed Terms PDF indicator */}
                {removeTermsPdf && (
                  <div className="space-y-2">
                    <label className="block text-[14px] font-medium text-gray-700">Terms PDF</label>
                    <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-700">Terms PDF marked for removal</span>
                        <button type="button" onClick={() => setRemoveTermsPdf(false)} className="text-blue-600 text-sm hover:underline">Restore</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Terms PDF Upload */}
                <div>
                  <label className="block text-[14px] font-medium text-gray-700">Upload New Terms & Conditions (PDF)</label>
                  <input id="terms_pdf" name="terms_pdf" type="file" accept="application/pdf" onChange={handleChange} className="mt-2" />
                  {newTermsPdfFile && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700">Selected: {newTermsPdfFile.name}</p>
                      {newTermsPdfUrl && (
                        <div className="mt-2 border rounded-lg overflow-hidden h-64">
                          <iframe title="terms-preview" src={newTermsPdfUrl} className="w-full h-full" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Images & Documents */}
            <section className="bg-[#FFFFFF] p-6 rounded-lg">
              <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Images & Documents</h2>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-6">
                  <label className="block text-[14px] font-medium text-gray-700 mb-2">Current Images</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {existingImages.map((imageUrl, idx) => {
                      const isRemoved = originalImagePaths[idx] && imagesToRemove.includes(originalImagePaths[idx]);
                      return (
                        <div key={imageUrl} className={`relative group ${isRemoved ? 'opacity-50' : ''}`}>
                          <img src={imageUrl} alt={`existing-${idx}`} className="w-full h-28 object-cover rounded-lg border" />
                          <div className="absolute top-1 right-1 flex gap-1">
                            {isRemoved ? (
                              <button type="button" onClick={() => restoreExistingImage(imageUrl)} className="bg-green-600 text-white text-xs px-2 py-1 rounded opacity-90 hover:opacity-100">Restore</button>
                            ) : (
                              <button type="button" onClick={() => removeExistingImage(imageUrl)} className="bg-red-600 text-white text-xs px-2 py-1 rounded opacity-90 hover:opacity-100">Remove</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Images Upload */}
                <div className="space-y-2">
                  <label className="block text-[14px] font-medium text-gray-700">Add New Warehouse Images</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors duration-150">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload images</span>
                          <input id="images" name="images" type="file" multiple accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml" onChange={handleChange} className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP, SVG up to 10MB each (max 20 images total)</p>
                    </div>
                  </div>
                  {errors.images && <div className="text-[#DC2626] text-[12px] mt-1">{errors.images}</div>}

                  {/* New Image Previews */}
                  {newImagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {newImagePreviews.map((src, idx) => (
                        <div key={src} className="relative group">
                          <img src={src} alt={`new-preview-${idx}`} className="w-full h-28 object-cover rounded-lg border border-green-200" />
                          <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded">New</div>
                          <button type="button" onClick={() => removeNewImageAt(idx)} className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-90 hover:opacity-100">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents Section */}
                <div className="space-y-2">
                  {/* Existing Documents */}
                  {existingDocuments.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-[14px] font-medium text-gray-700 mb-2">Current Documents</label>
                      <div className="space-y-2">
                        {existingDocuments.map((docUrl, idx) => {
                          const isRemoved = originalDocumentPaths[idx] && documentsToRemove.includes(originalDocumentPaths[idx]);
                          return (
                            <div key={docUrl} className={`flex items-center justify-between p-2 border rounded ${isRemoved ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                                </svg>
                                <span className="text-sm text-gray-700">Document {idx + 1}</span>
                              </div>
                              <div className="flex gap-2">
                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">View</a>
                                {isRemoved ? (
                                  <button type="button" onClick={() => restoreExistingDocument(docUrl)} className="text-green-600 text-sm hover:underline">Restore</button>
                                ) : (
                                  <button type="button" onClick={() => removeExistingDocument(docUrl)} className="text-red-600 text-sm hover:underline">Remove</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Documents Upload */}
                  <label className="block text-[14px] font-medium text-gray-700">Add New Legal Documents</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors duration-150">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="documents" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload documents</span>
                          <input id="documents" name="documents" type="file" multiple accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleChange} className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT up to 10MB each (max 20 files total)</p>
                    </div>
                  </div>

                  {/* New Documents List */}
                  {newDocumentFiles.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">New Documents:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {newDocumentFiles.map((f, idx) => (
                          <li key={`${f.name}-${idx}`} className="flex items-center justify-between">
                            <span>{f.name}</span>
                            <span className="text-green-600 text-xs">New</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button type="button" className="px-6 py-2.5 border border-gray-300 text-gray-700 font-[700] figtree rounded-lg focus:outline-none" onClick={() => (window.location.href = '/vendors/warehouse/units')}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={changedFields.length === 0}
                className={`inline-flex items-center px-6 py-2.5 border border-transparent font-[700] figtree rounded-lg text-[#FFFFFF] focus:outline-none ${changedFields.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#0955AC] hover:bg-[#074087]'
                  }`}
              >
                <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-[#FFFFFF70] backdrop-blur-[14px] flex items-center justify-center z-50">
            <div className="figtree text-[#222222] text-[16px] font-[400] bg-white rounded-[20px] p-8 w-[643px] max-w-[90%] shadow-lg flex flex-col items-center relative">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.href = '/vendors/warehouse/units';
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                ✕
              </button>
              <h2 className="text-[28px] font-[600] mt-2">Changes Saved</h2>
              <p className="mt-2 text-[#6B6B6B] text-center">Your warehouse has been updated and submitted for approval.</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = '/vendors/warehouse/units';
                  }}
                  className="figtree w-[160px] h-[44px] bg-[#0955AC] text-[14px] font-[700] text-white rounded-[12px] hover:bg-[#074087] transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => (window.location.href = '/vendors/warehouse/units')}
                  className="figtree w-[180px] h-[44px] border border-[#0955AC] text-[#0955AC] text-[14px] font-[700] rounded-[12px] hover:bg-[#0955AC10] transition-colors"
                >
                  Go to Units
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-[#FFFFFF70] backdrop-blur-[14px] flex items-center justify-center z-50">
            <div className="figtree text-[#222222] text-[16px] font-[400] bg-white rounded-[20px] p-8 w-[643px] max-w-[90%] shadow-lg flex flex-col items-start relative">
              <button
                onClick={() => setShowErrorModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                ✕
              </button>
              <h2 className="text-[28px] font-[600] mt-2">
                {errorItems.some(item => item.includes('required') || item.includes('must be')) ? 'Please Complete Required Fields' : 'Update Failed'}
              </h2>
              <p className="mt-2 text-[#6B6B6B]">
                {errorItems.some(item => item.includes('required') || item.includes('must be')) ? 'Please fill in all required fields:' : 'Please fix the following issues:'}
              </p>
              <ul className="mt-3 list-disc list-inside text-[14px] text-[#B91C1C] space-y-1">
                {errorItems.length ? errorItems.map((msg, i) => (
                  <li key={`${msg}-${i}`}>{msg}</li>
                )) : <li>Unknown error. Try again.</li>}
              </ul>
              <div className="mt-6 self-end">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="figtree w-[160px] h-[44px] bg-[#0955AC] text-[14px] font-[700] text-white rounded-[12px] hover:bg-[#074087] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-[#FFFFFF70] backdrop-blur-[14px] flex items-center justify-center z-50">
            <div className="figtree text-[#222222] text-[16px] font-[400] bg-white rounded-[20px] p-8 w-[643px] max-w-[90%] shadow-lg flex flex-col items-center relative">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                ✕
              </button>
              <h2 className="text-[28px] font-[600] mt-2">Confirm Changes</h2>
              <p className="mt-2 text-[#6B6B6B] text-center">
                Are you sure you want to save these changes? The warehouse will be resubmitted for approval.
              </p>

              {changedFields.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">Changes to be saved:</h3>
                  <ul className="text-sm text-blue-700 list-disc list-inside">
                    {changedFields.map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="figtree w-[120px] h-[44px] border border-[#7B7B7A] text-[#7B7B7A] text-[14px] font-[700] rounded-[12px] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  className="figtree w-[180px] h-[44px] bg-[#0955AC] text-[14px] font-[700] text-white rounded-[12px] hover:bg-[#074087] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </VendorShellLayout>
  );
};

export default EditUnit;