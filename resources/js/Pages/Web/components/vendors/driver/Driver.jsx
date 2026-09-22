// resources/js/Pages/Web/components/vendors/driver/Driver.jsx
import React, { useEffect, useRef, useState } from "react";
import SideMenu from "../SideMenu.jsx";
import { usePage, Link } from "@inertiajs/react";

import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../assets/vendors/dashboard/logOutLogo.svg"; // ← NEW

import UserDropdown from "../../../components/vendors/UserDropdown.jsx";
import ServiceNavBar from "../../../../../Components/vendors/ServiceNavBar.jsx";
import { Download } from "lucide-react"; // ← NEW

const PAGE_SIZE = 8;

/* ---- UI helpers aligned with AddUnit ---- */
const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const inputClasses = (hasError = false) =>
  `w-full rounded-lg px-4 py-2 transition ${
    hasError
      ? "border border-red-500 focus:ring-red-500 focus:border-red-500"
      : "border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
  }`;
const selectClasses = inputClasses;
/* ---------------------------------------- */

export default function Driver() {
  const { auth } = usePage().props;
  const user = auth?.user;
  const isVerified = user?.status === 'verified' || user?.status === 'Verified';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query] = useState(""); // kept empty (no free-text search)
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({}); // For duplicate warnings
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedRows, setExpandedRows] = useState(() => new Set()); // details toggle
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now()); // For cache busting
  const gotCsrf = useRef(false);
  const checkTimeouts = useRef({}); // For debouncing duplicate checks

  // Renew-license form state
  const [renewingDriverId, setRenewingDriverId] = useState(null);
  const [renewForm, setRenewForm] = useState({ licenseNo: '', licenseExpiry: '', licensePhoto: null });
  const [renewErrors, setRenewErrors] = useState({});
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const formRef = useRef(null);


  // ---------- helpers ----------
  const toAbsoluteUrl = (u) => {
    if (!u) return "";
    if (u.startsWith("blob:")) return u;
    if (/^https?:\/\//i.test(u)) return u;
    const withSlash = u.startsWith("/") ? u : "/" + u;
    return new URL(withSlash, window.location.origin).toString();
  };

  // stream/download controller endpoints with cache-busting
  const driverStream = (id, kind) => `/vendor/drivers/${id}/${kind}/stream?t=${Date.now()}`;     // kind: 'license' | 'nic'
  const driverDownload = (id, kind) => `/vendor/drivers/${id}/${kind}/download`; // direct download
  // --------------------------------

  // Vehicle category to license type mapping
  const licenseTypeMap = {
    Land: ["Light Vehicle", "Heavy Vehicle"],
    Air: ["Private Pilot", "Commercial Pilot", "Airline Transport Pilot", "Helicopter Pilot"],
    Sea: ["Boat Operator", "Ship Captain", "Marine Engineer", "Fishing Vessel Operator"],
  };

  const empty = {
    full_name: "",
    phone: "",
    email: "",
    license_no: "",
    license_expiry: "",
    vehicle_category: "",
    license_type: "",
    vehicle_type: "",
    address: "",
    notes: "",
    license_photo: null,
    nic_photo: null,
    license_photo_url: "",
    nic_photo_url: "",
  };
  const [form, setForm] = useState(empty);

  // ---------- CSRF ----------
  function getCookie(name) {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1];
  }
  function getMetaCsrf() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  }
  async function ensureCsrf() {
    if (gotCsrf.current) return;
    const existing = getMetaCsrf() || getCookie("XSRF-TOKEN");
    if (!existing) {
      try {
        await fetch("/sanctum/csrf-cookie", { method: "GET", credentials: "same-origin" });
      } catch {}
    }
    gotCsrf.current = true;
  }
  function currentToken() {
    return getMetaCsrf() || (getCookie("XSRF-TOKEN") ? decodeURIComponent(getCookie("XSRF-TOKEN")) : null);
  }
  // -----------------------------------

  // ---------- HTTP ----------
  async function http(method, path, body, params = {}) {
    const url = new URL(`/vendor${path}`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    if (method !== "GET") await ensureCsrf();

    const token = currentToken();
    const isFormData = body instanceof FormData;
    if (isFormData && token && !body.has("_token")) body.append("_token", token);

    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(token ? { "X-CSRF-TOKEN": token, "X-XSRF-TOKEN": token } : {}),
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "same-origin",
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    if (!res.ok) {
      let payload = null;
      try { payload = await res.json(); } catch {}
      const message = payload?.message || `HTTP ${res.status}`;
      if (payload?.errors) throw { validation: payload.errors, message };
      throw new Error(message);
    }
    return res.status === 204 ? null : res.json();
  }

  const api = {
    list: (q, status, sort, dir, page, per_page) =>
      http("GET", "/drivers", null, { q, status, sort, dir, page, per_page }),
    create: (payload) => http("POST", "/drivers", toFormData(payload)),
    update: (id, payload) => {
      const fd = toFormData(payload);
      fd.append("_method", "PUT");
      return http("POST", `/drivers/${id}`, fd);
    },
    remove: (id) => http("DELETE", `/drivers/${id}`),
  };

  function toFormData(values) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === "license_photo" || k === "nic_photo") {
        if (v instanceof File) fd.append(k, v);
        return;
      }
      if (k.endsWith("_url")) return;
      fd.append(k, v);
    });
    return fd;
  }
  // -----------------------------------

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const statusParam = statusFilter === "All" ? "" : statusFilter;
      const data = await api.list(query, statusParam, sort.key, sort.dir, page, PAGE_SIZE);
      setRows(data.data);
      setMeta({ current_page: data.current_page, last_page: data.last_page, total: data.total });
    } finally {
      setLoading(false);
    }
  };

      
      
// Export functionality
    const handleExport = () => {
        // Combine all clients from different categories
        const allClients = [
            ...(clientsData?.land || []),
            ...(clientsData?.air || []),
            ...(clientsData?.sea || [])
        ];

        if (allClients.length === 0) {
            alert("No clients to export");
            return;
        }

        const headers = ["Name", "Email", "Phone", "Type", "Total Bookings", "Total Spent", "Join Date"];
        const data = allClients.map(client => [
            client.name || "",
            client.email || "",
            client.phone || "",
            client.type || "Rental",
            client.totalBookings || 0,
            client.totalSpent || "LKR 0",
            client.joinDate || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...data.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `clients-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, statusFilter]);

  // ---- License expiry helpers ----
  const isLicenseExpiringSoon = (expiry) => {
    if (!expiry) return false;
    const exp = new Date(expiry);
    const diff = (exp - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const isLicenseExpired = (expiry) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  // ---- Renew-license submission ----
  const submitRenewLicense = async (driverId, e) => {
    e.preventDefault();
    const errs = {};
    if (!renewForm.licenseNo.trim()) {
      errs.license_no = 'License number is required';
    } else if (!/^[A-Z0-9\-\/\s]{5,20}$/i.test(renewForm.licenseNo)) {
      errs.license_no = 'Must be 5-20 characters: letters, numbers, -, /, spaces';
    }
    if (!renewForm.licenseExpiry) errs.license_expiry = 'Expiry date is required';
    if (!renewForm.licensePhoto) errs.license_photo = 'License photo is required';
    setRenewErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setRenewSubmitting(true);
    try {
      await ensureCsrf();
      const token = currentToken();
      const fd = new FormData();
      fd.append('license_no', renewForm.licenseNo);
      fd.append('license_expiry', renewForm.licenseExpiry);
      fd.append('license_photo', renewForm.licensePhoto);
      if (token) fd.append('_token', token);

      const res = await fetch(`/vendor/drivers/${driverId}/renew-license`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { 'X-CSRF-TOKEN': token, 'X-XSRF-TOKEN': token } : {}),
        },
        credentials: 'same-origin',
        body: fd,
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        if (payload?.errors) setRenewErrors(payload.errors);
        else alert(payload?.message || 'Failed to submit license renewal.');
        return;
      }

      setRenewingDriverId(null);
      setRenewForm({ licenseNo: '', licenseExpiry: '', licensePhoto: null });
      setRenewErrors({});
      await fetchData(meta.current_page);
    } catch (err) {
      alert(err.message || 'Unexpected error.');
    } finally {
      setRenewSubmitting(false);
    }
  };

  // ---------- form ----------
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Name is required";

    // Phone validation
    if (!form.phone.trim()) {
      e.phone = "Phone is required";
    } else {
      const cleanPhone = form.phone.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?\d+$/.test(cleanPhone)) {
        e.phone = "Phone must contain only numbers (+ allowed at start)";
      } else if (cleanPhone.length < 10) {
        e.phone = "Phone number must be at least 10 digits";
      } else if (cleanPhone.length > 15) {
        e.phone = "Phone number must not exceed 15 digits";
      }
    }

    // License number validation
    if (!form.license_no.trim()) {
      e.license_no = "License no. is required";
    } else {
      if (!/^[A-Z0-9\-\/\s]{5,20}$/i.test(form.license_no)) {
        e.license_no = "License number must be 5-20 characters (letters, numbers, -, /, spaces only)";
      }
    }

    if (!form.vehicle_category.trim()) e.vehicle_category = "Vehicle category is required";
    if (!form.license_type.trim()) e.license_type = "License type is required";

    // Vehicle number validation
    // if (!form.vehicle_no.trim()) {
    //   e.vehicle_no = "Vehicle no. is required";
    // } else {
    //   if (!/^[A-Z]{1,3}[\s\-]?[A-Z0-9]{1,4}[\s\-]?[0-9]{1,4}$/i.test(form.vehicle_no)) {
    //     e.vehicle_no = "Invalid vehicle number format. Use: WP ABC-1234 or CAA-1234";
    //   }
    // }

    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";

    const needsLicense = !editing || (editing && form.license_photo instanceof File);
    const needsNIC = !editing || (editing && form.nic_photo instanceof File);

    if (!form.license_photo && !form.license_photo_url && !editing) {
      e.license_photo = "License photo is required";
    } else if (needsLicense && form.license_photo && !form.license_photo.type?.startsWith("image/")) {
      e.license_photo = "License photo must be an image";
    }

    if (!form.nic_photo && !form.nic_photo_url && !editing) {
      e.nic_photo = "NIC photo is required";
    } else if (needsNIC && form.nic_photo && !form.nic_photo.type?.startsWith("image/")) {
      e.nic_photo = "NIC photo must be an image";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm(empty);
    setEditing(null);
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        await api.update(editing, form);
        setImageRefreshKey(Date.now());
      }
      else await api.create(form);
      resetForm();
      await fetchData(meta.current_page);
      window.scrollTo({ top: document.body.scrollHeight / 3, behavior: "smooth" });
    } catch (err) {
      if (err.validation) setErrors(err.validation);
      else alert(err.message || "Failed");
    }
  };

  const onEdit = (r) => {
    setEditing(r.id);
    setForm({
      full_name: r.full_name,
      phone: r.phone,
      email: r.email || "",
      license_no: r.license_no,
      license_expiry: r.license_expiry || "",
      vehicle_category: r.vehicle_category || "",
      license_type: r.license_type || "",
      vehicle_type: r.vehicle_type,
      address: r.address || "",
      notes: r.notes || "",
      license_photo: null,
      nic_photo: null,
      license_photo_url: r.license_photo_url || "",
      nic_photo_url: r.nic_photo_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this driver?")) return;
    await api.remove(id);
    const nextPage = rows.length === 1 && meta.current_page > 1 ? meta.current_page - 1 : meta.current_page;
    await fetchData(nextPage);
  };

  const onSort = (key) => {
    setSort((s) => {
      const dir = s.key === key ? (s.dir === "asc" ? "desc" : "asc") : "asc";
      return { key, dir };
    });
  };

  const Label = ({ children }) => (
    <label className="block text-[14px] font-medium text-gray-700">{children}</label>
  );

  // Debounced duplicate check function
  const checkDuplicate = async (field, value) => {
    if (!value || value.trim().length < 3) {
      setWarnings(prev => ({ ...prev, [field]: '' }));
      return;
    }

    try {
      const exists = rows.some(driver => {
        if (editing && driver.id === editing) return false;
        return driver[field]?.toLowerCase() === value.toLowerCase();
      });

      if (exists) {
        setWarnings(prev => ({
          ...prev,
          [field]: `This ${field.replace('_', ' ')} is already registered with another driver.`
        }));
      } else {
        setWarnings(prev => ({ ...prev, [field]: '' }));
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    }
  };

  // Helper functions for input handling
  const handlePhoneChange = (value) => {
    const sanitized = value.replace(/[^0-9+\s\-\(\)]/g, '');
    setForm({ ...form, phone: sanitized });
    if (errors.phone) setErrors({ ...errors, phone: '' });
    if (checkTimeouts.current.phone) clearTimeout(checkTimeouts.current.phone);
    checkTimeouts.current.phone = setTimeout(() => checkDuplicate('phone', sanitized), 800);
  };

  const handleLicenseChange = (value) => {
    const sanitized = value.replace(/[^A-Za-z0-9\-\/\s]/g, '').toUpperCase();
    setForm({ ...form, license_no: sanitized });
    if (errors.license_no) setErrors({ ...errors, license_no: '' });
    if (checkTimeouts.current.license_no) clearTimeout(checkTimeouts.current.license_no);
    checkTimeouts.current.license_no = setTimeout(() => checkDuplicate('license_no', sanitized), 800);
  };

  // const handleVehicleNoChange = (value) => {
  //   const sanitized = value.replace(/[^A-Za-z0-9\-\s]/g, '').toUpperCase();
  //   setForm({ ...form, vehicle_no: sanitized });
  //   if (errors.vehicle_no) setErrors({ ...errors, vehicle_no: '' });
  //   if (checkTimeouts.current.vehicle_no) clearTimeout(checkTimeouts.current.vehicle_no);
  //   checkTimeouts.current.vehicle_no = setTimeout(() => checkDuplicate('vehicle_no', sanitized), 800);
  // };

  const handleEmailChange = (value) => {
    setForm({ ...form, email: value });
    if (errors.email) setErrors({ ...errors, email: '' });
    if (checkTimeouts.current.email) clearTimeout(checkTimeouts.current.email);
    checkTimeouts.current.email = setTimeout(() => checkDuplicate('email', value), 800);
  };

  const ImageInput = ({ label, field, urlField, requiredText, kind }) => {
    const file = form[field];
    const hasExisting = !!form[urlField] || !!editing;
    const previewSrc = file
      ? URL.createObjectURL(file)
      : editing
      ? `${driverStream(editing, kind)}&refresh=${imageRefreshKey}`
      : (form[urlField] ? toAbsoluteUrl(form[urlField]) : "");

    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setForm((prev) => ({
                ...prev,
                [field]: f,
                [urlField]: f ? "" : prev[urlField],
              }));
            }}
            className={inputClasses(!!errors[field]) + " bg-white"}
          />
          {hasExisting && editing ? (
            <a
              href={driverDownload(editing, kind)}
              download
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              Download
            </a>
          ) : null}
        </div>
        {previewSrc ? (
          <img
            key={`preview-${field}-${imageRefreshKey}`}
            src={previewSrc}
            alt={`${typeof label === "string" ? label : "Image"} preview`}
            className="mt-2 h-16 w-16 object-cover rounded-md border border-gray-200"
          />
        ) : null}
        {errors[field] && (
          <span className="text-red-500 text-xs">{errors[field]}</span>
        )}
      </div>
    );
  };

  const ThumbCell = ({ id, url, kind }) => {
    if (!url) return <span className="text-[#00000066]">-</span>;
    const imgSrc = `${driverStream(id, kind)}&refresh=${imageRefreshKey}`;
    const dlHref = driverDownload(id, kind);
    return (
      <div className="flex items-center gap-2">
        <img
          key={`${id}-${kind}-${imageRefreshKey}`}
          src={imgSrc}
          alt={`${kind} preview`}
          className="h-10 w-10 object-cover rounded border"
        />
        <a
          href={dlHref}
          download
          title="Download"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#0955AC]" aria-hidden="true">
            <path d="M3 14.5A1.5 1.5 0 014.5 13h11a1.5 1.5 0 010 3h-11A1.5 1.5 0 013 14.5z" />
            <path d="M10 2a.75.75 0 01.75.75V11l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06L9.25 11V2.75A.75.75 0 0110 2z" />
          </svg>
          <span className="sr-only">Download</span>
        </a>
      </div>
    );
  };

  const toggleExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SideMenu />
      </div>

            {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <main className="flex-1 w-full flex flex-col min-w-0">
        {/* ServiceNavBar - sticky at top */}
        <div className="sticky top-0 z-30">
          <ServiceNavBar
    activeService="Vehicle Rental"
    isVerified={isVerified}
    settingsRoute={route("settingsPage")}
/>
        </div>

        <div className="flex-1 py-8">
        {/* ==================== HEADER WITH DROPDOWN ==================== */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           {/* Hamburger button for mobile */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-200"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
          <div className="flex flex-row gap-5 justify-between items-center">
            <h1 className="figtree text-[28px] font-[700]">Vehicle Rental Drivers</h1>

            {/* <div className="flex flex-row gap-5 relative items-center">
                    <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div>
                </div> */}
          </div>
        </div>

        {/* ==================== FORM ==================== */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <form
            ref={formRef}
            onSubmit={submit}
            className="bg-white rounded-lg p-5 border border-gray-200"
          >
            {/* Approval Workflow Info */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <svg className="flex-shrink-0 mt-0.5 text-blue-500" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-900 font-semibold text-[14px]">Driver Registration & Approval</p>
                <p className="text-blue-700 text-[13px] mt-1">New drivers are registered in an <strong>inactive</strong> status and require <strong>Super Admin approval</strong> to become active. Once approved, the driver will have full access to the system.</p>
              </div>
            </div>

            <h2 className="text-[18px] font-[400] text-gray-800 mb-4">Driver Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Full Name <Req /></Label>
                <input
                  className={inputClasses(!!errors.full_name)}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="John Doe"
                />
                {errors.full_name && <span className="text-red-500 text-xs">{errors.full_name}</span>}
              </div>

              <div className="space-y-1">
                <Label>Phone <Req /></Label>
                <input
                  type="tel"
                  className={inputClasses(!!errors.phone)}
                  value={form.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+94 77 123 4567"
                  maxLength="20"
                />
                {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
                {!errors.phone && warnings.phone && <span className="text-yellow-600 text-xs">Warning: {warnings.phone}</span>}
                {!errors.phone && !warnings.phone && form.phone && (
                  <span className="text-gray-500 text-xs">Format: +94 77 123 4567 or 0771234567</span>
                )}
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <input
                  type="email"
                  className={inputClasses(!!errors.email)}
                  value={form.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="john@example.com"
                />
                {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
                {!errors.email && warnings.email && <span className="text-yellow-600 text-xs">Warning: {warnings.email}</span>}
              </div>

              <div className="space-y-1">
                <Label>License No. <Req /></Label>
                <input
                  type="text"
                  className={inputClasses(!!errors.license_no)}
                  value={form.license_no}
                  onChange={(e) => handleLicenseChange(e.target.value)}
                  placeholder="B1234567 or DL/2023/12345"
                  maxLength="20"
                />
                {errors.license_no && <span className="text-red-500 text-xs">{errors.license_no}</span>}
                {!errors.license_no && warnings.license_no && <span className="text-yellow-600 text-xs">Warning: {warnings.license_no}</span>}
                {!errors.license_no && !warnings.license_no && form.license_no && (
                  <span className="text-gray-500 text-xs">5-20 characters: letters, numbers, -, /, spaces</span>
                )}
              </div>

              <div className="space-y-1">
                <Label>License Expiry</Label>
                <input
                  type="date"
                  className={inputClasses(false)}
                  value={form.license_expiry}
                  onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Vehicle Category <Req /></Label>
                <select
                  className={selectClasses(!!errors.vehicle_category)}
                  value={form.vehicle_category}
                  onChange={(e) => {
                    const selectedCategory = e.target.value;
                    setForm({ ...form, vehicle_category: selectedCategory, license_type: "", vehicle_type: selectedCategory });
                    if (errors.vehicle_category) setErrors({ ...errors, vehicle_category: '' });
                  }}
                >
                  <option value="">-- Select Vehicle Category --</option>
                  <option value="Land">Land</option>
                  <option value="Air">Air</option>
                  <option value="Sea">Sea</option>
                </select>
                {errors.vehicle_category && <span className="text-red-500 text-xs">{errors.vehicle_category}</span>}
              </div>

              <div className="space-y-1">
                <Label>License Type <Req /></Label>
                <select
                  className={selectClasses(!!errors.license_type || !form.vehicle_category)}
                  value={form.license_type}
                  onChange={(e) => {
                    setForm({ ...form, license_type: e.target.value });
                    if (errors.license_type) setErrors({ ...errors, license_type: '' });
                  }}
                  disabled={!form.vehicle_category}
                >
                  <option value="">-- Select License Type --</option>
                  {form.vehicle_category && licenseTypeMap[form.vehicle_category] && 
                    licenseTypeMap[form.vehicle_category].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))
                  }
                </select>
                {!form.vehicle_category && <span className="text-gray-500 text-xs">First select a vehicle category</span>}
                {errors.license_type && <span className="text-red-500 text-xs">{errors.license_type}</span>}
              </div>

              {/* <div className="space-y-1">
                <Label>Vehicle No. <Req /></Label>
                <input
                  type="text"
                  className={inputClasses(!!errors.vehicle_no)}
                  value={form.vehicle_no}
                  onChange={(e) => handleVehicleNoChange(e.target.value)}
                  placeholder="WP ABC-1234 or CAA-1234"
                  maxLength="20"
                />
                {errors.vehicle_no && <span className="text-red-500 text-xs">{errors.vehicle_no}</span>}
                {!errors.vehicle_no && warnings.vehicle_no && <span className="text-yellow-600 text-xs">Warning: {warnings.vehicle_no}</span>}
                {!errors.vehicle_no && !warnings.vehicle_no && form.vehicle_no && (
                  <span className="text-gray-500 text-xs">Format: Province Code + Letters/Numbers (e.g., WP ABC-1234)</span>
                )}
              </div> */}

              <ImageInput
                label={<><span>Driver License Photo</span> <Req /></>}
                field="license_photo"
                urlField="license_photo_url"
                requiredText
                kind="license"
              />

              <ImageInput
                label={<><span>NIC Photo</span> <Req /></>}
                field="nic_photo"
                urlField="nic_photo_url"
                requiredText
                kind="nic"
              />

              <div className="md:col-span-2 space-y-1">
                <Label>Address</Label>
                <textarea
                  rows={2}
                  className={inputClasses(false)}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>Notes</Label>
                <textarea
                  rows={2}
                  className={inputClasses(false)}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200 mt-5">
              {editing && (
                <button
                  type="button"
                  className="px-5 py-2 border border-gray-300 text-gray-700 font-[700] rounded-lg"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
              <button
                className="inline-flex items-center px-5 py-2 border border-transparent font-[700] rounded-lg text-white bg-[#0955AC] hover:opacity-95"
                type="submit"
              >
                {editing ? "Update Driver" : "Add Driver"}
              </button>
            </div>
          </form>
        </div>

        {/* ==================== LICENSE WARNING BANNERS ==================== */}
        {(() => {
          const expiringSoon = rows.filter(r => !isLicenseExpired(r.license_expiry) && isLicenseExpiringSoon(r.license_expiry));
          const expiredNeedAction = rows.filter(r => isLicenseExpired(r.license_expiry) && r.license_review_status !== 'pending_review');
          const pendingReview = rows.filter(r => r.license_review_status === 'pending_review');
          if (expiringSoon.length === 0 && expiredNeedAction.length === 0 && pendingReview.length === 0) return null;
          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 flex flex-col gap-3">
              {/* Expiring soon warning */}
              {expiringSoon.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
                  <svg className="flex-shrink-0 mt-0.5 text-amber-500" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-amber-800 text-[14px]">⚠ License Expiring Soon</p>
                    <p className="text-amber-700 text-[13px] mt-0.5">The following driver(s) have a license expiring within 7 days. Please upload a renewed license as soon as possible.</p>
                    <ul className="mt-2 space-y-1">
                      {expiringSoon.map(r => (
                        <li key={r.id} className="text-amber-700 text-[12px] flex items-center gap-2">
                          <span className="font-semibold">{r.full_name}</span>
                          <span>— expires {r.license_expiry}</span>
                          <button
                            type="button"
                            className="ml-1 text-[11px] px-2 py-0.5 bg-amber-100 border border-amber-400 rounded text-amber-800 hover:bg-amber-200 font-semibold"
                            onClick={() => { setRenewingDriverId(r.id); setRenewForm({ licenseNo: r.license_no || '', licenseExpiry: '', licensePhoto: null }); setRenewErrors({}); }}
                          >
                            Renew Now
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {/* Expired — action required */}
              {expiredNeedAction.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
                  <svg className="flex-shrink-0 mt-0.5 text-red-500" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-800 text-[14px]">License Expired — Action Required</p>
                    <p className="text-red-700 text-[13px] mt-0.5">The following driver(s) have been deactivated due to an expired license. Submit a renewed license document for admin review to reactivate.</p>
                    <ul className="mt-2 space-y-1">
                      {expiredNeedAction.map(r => (
                        <li key={r.id} className="text-red-700 text-[12px] flex items-center gap-2">
                          <span className="font-semibold">{r.full_name}</span>
                          <span>— expired {r.license_expiry}</span>
                          <button
                            type="button"
                            className="ml-1 text-[11px] px-2 py-0.5 bg-red-100 border border-red-300 rounded text-red-700 hover:bg-red-200 font-semibold"
                            onClick={() => { setRenewingDriverId(r.id); setRenewForm({ licenseNo: r.license_no || '', licenseExpiry: '', licensePhoto: null }); setRenewErrors({}); }}
                          >
                            Renew License
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {/* Pending admin review */}
              {pendingReview.length > 0 && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex items-start gap-3">
                  <svg className="flex-shrink-0 mt-0.5 text-blue-500" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-blue-800 text-[14px]">License Renewal Pending Admin Review</p>
                    <p className="text-blue-700 text-[13px] mt-0.5">The following driver(s) have a license renewal awaiting Super Admin approval.</p>
                    <ul className="mt-1.5 space-y-1">
                      {pendingReview.map(r => (
                        <li key={r.id} className="text-blue-700 text-[12px]">
                          <span className="font-semibold">{r.full_name}</span>
                          {r.pending_license_expiry && <span> — new expiry: {r.pending_license_expiry}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================== TABLE ==================== */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="w-full bg-white rounded-lg border border-gray-200">
            {/* Header with chips */}
            <div className="px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center gap-4">
                <div className="flex text-[#0955AC] text-[14px] font-[700]">
                  <button
                    className={`h-9 px-4 rounded-l-md ${statusFilter === "All" ? "bg-[#D8E4F2]" : "bg-[#F3F3F3]"}`}
                    onClick={() => setStatusFilter("All")}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`h-9 px-4 ${statusFilter === "Active" ? "bg-[#D8E4F2]" : "bg-[#F3F3F3]"}`}
                    onClick={() => setStatusFilter("Active")}
                    type="button"
                  >
                    Active
                  </button>
                  <button
                    className={`h-9 px-4 rounded-r-md ${statusFilter === "Inactive" ? "bg-[#D8E4F2]" : "bg-[#F3F3F3]"}`}
                    onClick={() => setStatusFilter("Inactive")}
                    type="button"
                  >
                    Inactive
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[14px] font-[600] text-[#00000080]">
                  <span>Results</span>
                  <span className="text-[#0955AC]">• {meta.total}</span>
                </div>
                <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-[#3B8F31] text-white rounded-[6px] hover:bg-[#2d6b25] transition text-[14px] sm:text-[16px]"
                        >
                            <Download size={18} />
                            <span>Export</span>
                        </button>
              </div>

              <div className="h-0 md:h-auto" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F3F3F3]">
                  <tr className="text-left figtree">
                    {[
                      ["full_name", "Name"],
                      ["phone", "Phone"],
                      ["vehicle_type", "Type"],
                      ["license_no", "License No."],
                      ["license_expiry", "Expiry"],
                      ["status", "Status"],
                      ["created_at", "Created"],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        className="px-4 sm:px-6 py-3 font-[700] cursor-pointer whitespace-nowrap text-[#000000CC]"
                        onClick={() => onSort(key)}
                      >
                        {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                      </th>
                    ))}
                    <th className="px-4 sm:px-6 py-3 font-[700] text-[#000000CC] whitespace-nowrap">License Img</th>
                    <th className="px-4 sm:px-6 py-3 font-[700] text-[#000000CC] whitespace-nowrap">NIC Img</th>
                    <th className="px-4 sm:px-6 py-3 font-[700] text-[#000000CC] whitespace-nowrap">Details</th>
                    <th className="px-4 sm:px-6 py-3 font-[700] text-[#000000CC]">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={13} className="px-6 py-10 text-center text-gray-500">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={13} className="px-6 py-10 text-center text-gray-500">No drivers found.</td></tr>
                  ) : (
                    rows.map((r) => {
                      const isOpen = expandedRows.has(r.id);
                      return (
                        <React.Fragment key={r.id}>
                          <tr className="border-t border-gray-200">
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap font-medium">{r.full_name}</td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.phone}</td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.vehicle_type}</td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.license_no}</td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              {r.license_expiry ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className={`text-[12px] font-medium ${isLicenseExpired(r.license_expiry) ? 'text-red-600' : isLicenseExpiringSoon(r.license_expiry) ? 'text-amber-600' : ''}`}>
                                    {r.license_expiry}
                                  </span>
                                  {isLicenseExpired(r.license_expiry) && r.license_review_status === 'pending_review' && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Pending Review</span>
                                  )}
                                  {isLicenseExpired(r.license_expiry) && r.license_review_status !== 'pending_review' && (
                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Expired</span>
                                  )}
                                  {!isLicenseExpired(r.license_expiry) && isLicenseExpiringSoon(r.license_expiry) && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Expiring Soon</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md text-xs figtree ${r.status==="Active"?"bg-[#C5E6F9] text-[#0955AC]":"bg-[#FFDBDF] text-[#7B7B7A]"}`}>{r.status}</span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>

                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <ThumbCell id={r.id} url={r.license_photo_url} kind="license" />
                            </td>
                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <ThumbCell id={r.id} url={r.nic_photo_url} kind="nic" />
                            </td>

                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleExpand(r.id)}
                                className="px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold"
                              >
                                {isOpen ? "Hide" : "Details"}
                              </button>
                            </td>

                            <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <button onClick={() => onEdit(r)} className="text-[#0955AC] font-[600] hover:underline">Edit</button>
                                <button onClick={() => onDelete(r.id)} className="text-[#FF0000] font-[600] hover:underline">Delete</button>
                              </div>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="border-t border-gray-100 bg-[#FAFAFA]">
                              <td colSpan={13} className="px-4 sm:px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Driver details */}
                                  {/* <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Email</div>
                                    <div className="text-sm text-gray-900 break-words">{r.email || "—"}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Address</div>
                                    <div className="text-sm text-gray-900 whitespace-pre-line">{r.address || "—"}</div>
                                  </div> */}
                                  {/* <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Notes</div>
                                    <div className="text-sm text-gray-900 whitespace-pre-line">{r.notes || "—"}</div>
                                  </div> */}

                                  {/* License renewal section */}
                                  {/* {(isLicenseExpired(r.license_expiry) || isLicenseExpiringSoon(r.license_expiry)) && (
                                    <div className="md:col-span-3">
                                      {r.license_review_status === 'pending_review' ? (
                                        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                                          <svg className="flex-shrink-0 mt-0.5 text-blue-500" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                          </svg>
                                          <div>
                                            <p className="text-blue-800 font-semibold text-[13px]">License Renewal Submitted — Pending Admin Review</p>
                                            {r.pending_license_no && <p className="text-blue-700 text-[12px] mt-0.5">New license no: <span className="font-semibold">{r.pending_license_no}</span></p>}
                                            {r.pending_license_expiry && <p className="text-blue-700 text-[12px]">New expiry: <span className="font-semibold">{r.pending_license_expiry}</span></p>}
                                            <p className="text-blue-600 text-[12px] mt-1">The driver will be reactivated once the Super Admin approves.</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`border rounded-lg p-3 flex items-center justify-between ${isLicenseExpired(r.license_expiry) ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                                          <div>
                                            <p className={`font-semibold text-[13px] ${isLicenseExpired(r.license_expiry) ? 'text-red-800' : 'text-amber-800'}`}>
                                              {isLicenseExpired(r.license_expiry) ? 'License Expired — Driver Inactive' : 'License Expiring Soon'}
                                            </p>
                                            <p className={`text-[12px] mt-0.5 ${isLicenseExpired(r.license_expiry) ? 'text-red-600' : 'text-amber-700'}`}>
                                              Upload a renewed license document to request reactivation from admin.
                                            </p>
                                            {r.license_review_status === 'rejected' && (
                                              <p className="text-red-600 text-[12px] mt-0.5 font-semibold">Previous submission was rejected. Please submit a new document.</p>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => { setRenewingDriverId(r.id); setRenewForm({ licenseNo: r.license_no || '', licenseExpiry: '', licensePhoto: null }); setRenewErrors({}); }}
                                            className="ml-4 px-4 py-1.5 bg-[#0955AC] text-white text-[13px] rounded font-semibold whitespace-nowrap hover:bg-[#0744a0]"
                                          >
                                            Renew License
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )} */}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <span className="text-sm text-[#00000080]">
                Page {meta.current_page} of {meta.last_page} • {meta.total} result(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="h-9 px-4 bg-[#F3F3F3] rounded-md border border-gray-200 disabled:opacity-40"
                  onClick={() => fetchData(meta.current_page - 1)}
                  disabled={meta.current_page <= 1}
                >
                  Prev
                </button>
                <button
                  className="h-9 px-4 bg-[#F3F3F3] rounded-md border border-gray-200 disabled:opacity-40"
                  onClick={() => fetchData(meta.current_page + 1)}
                  disabled={meta.current_page >= meta.last_page}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* License Renewal Modal */}
      {renewingDriverId !== null && (() => {
        const driver = rows.find(r => r.id === renewingDriverId);
        if (!driver) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-[16px] font-bold text-gray-800">Renew Driver License</h3>
                <button
                  type="button"
                  onClick={() => { setRenewingDriverId(null); setRenewErrors({}); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {/* Driver info */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-[13px] text-gray-600">Submitting renewal for: <span className="font-semibold text-gray-800">{driver.full_name}</span></p>
                {driver.license_no && <p className="text-[12px] text-gray-500 mt-0.5">Current license: {driver.license_no} · Expires {driver.license_expiry}</p>}
                {driver.license_review_status === 'rejected' && (
                  <p className="text-red-600 text-[12px] mt-1 font-semibold">⚠ Previous submission was rejected. Please submit a new document.</p>
                )}
              </div>
              {/* Form */}
              <form onSubmit={(e) => submitRenewLicense(renewingDriverId, e)} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">New License No. <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`w-full rounded-lg border px-3 py-2 text-[13px] bg-white ${renewErrors.license_no ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-300'} focus:outline-none focus:ring-2`}
                    value={renewForm.licenseNo}
                    onChange={(e) => setRenewForm(f => ({ ...f, licenseNo: e.target.value.toUpperCase() }))}
                    placeholder="B1234567"
                    maxLength="20"
                  />
                  {renewErrors.license_no && <p className="text-red-500 text-[11px] mt-1">{renewErrors.license_no}</p>}
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">New Expiry Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className={`w-full rounded-lg border px-3 py-2 text-[13px] bg-white ${renewErrors.license_expiry ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-300'} focus:outline-none focus:ring-2`}
                    value={renewForm.licenseExpiry}
                    onChange={(e) => setRenewForm(f => ({ ...f, licenseExpiry: e.target.value }))}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  />
                  {renewErrors.license_expiry && <p className="text-red-500 text-[11px] mt-1">{renewErrors.license_expiry}</p>}
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">New License Photo <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    className={`w-full text-[13px] rounded-lg border px-3 py-1.5 bg-white ${renewErrors.license_photo ? 'border-red-400' : 'border-gray-300'} file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[12px] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}
                    onChange={(e) => setRenewForm(f => ({ ...f, licensePhoto: e.target.files?.[0] || null }))}
                  />
                  {renewErrors.license_photo && <p className="text-red-500 text-[11px] mt-1">{renewErrors.license_photo}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={renewSubmitting}
                    className="flex-1 py-2 bg-[#0955AC] text-white text-[13px] rounded-lg font-semibold disabled:opacity-50 hover:bg-[#0744a0] transition-colors"
                  >
                    {renewSubmitting ? 'Submitting…' : 'Submit for Admin Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRenewingDriverId(null); setRenewErrors({}); }}
                    className="px-5 py-2 border border-gray-300 text-gray-700 text-[13px] rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}