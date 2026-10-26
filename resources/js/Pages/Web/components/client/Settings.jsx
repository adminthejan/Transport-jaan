import React, { useMemo, useRef, useState } from "react";
import { useForm } from "@inertiajs/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { 
    FiCheckCircle, 
    FiXCircle, 
    FiUser, 
    FiLock, 
    FiBell, 
    FiShield, 
    FiAlertTriangle,
    FiCreditCard,
    FiMapPin
} from "react-icons/fi";

/* ------------------------------------------------------------------ */
/*  Re-usable components                                              */
/* ------------------------------------------------------------------ */
const Section = ({ title, description, children, editBtn }) => (
    <section className="bg-white rounded-[10px] border border-gray-200 p-6 md:p-8 transition-all duration-300 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-[18px] font-[700] text-gray-900">{title}</h2>
                {description && (
                    <p className="text-[12px] text-gray-500 mt-1">{description}</p>
                )}
            </div>
            {editBtn && <div>{editBtn}</div>}
        </div>
        {children}
    </section>
);

const Field = ({ label, htmlFor, children, required, help }) => (
    <label className="block" htmlFor={htmlFor}>
        <span className="block text-[14px] font-[700] text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </span>
        <div className="relative transition-all duration-300">{children}</div>
        {help && <p className="mt-1 text-[10px] text-gray-500">{help}</p>}
    </label>
);

const ErrorText = ({ children }) =>
    children ? (
        <p className="mt-1 text-[13px] text-red-600 animate-pulse">{children}</p>
    ) : null;

const Toggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
        <div className="pr-4">
            <p className="text-[14px] font-[600] text-gray-900">{label}</p>
            {description && <p className="text-[12px] text-gray-500 mt-1">{description}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${checked ? 'bg-[#0955AC]' : 'bg-gray-200'}`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const EditableSection = ({
    title,
    description,
    isEditing,
    toggleEdit,
    onSave,
    children,
  }) => {
    return (
      <Section
        title={title}
        description={description}
        editBtn={
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0955AC] rounded-md transition-colors hover:bg-blue-700 shadow-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={toggleEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md transition-colors hover:bg-gray-50 shadow-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={toggleEdit}
                className="px-4 py-2 text-sm font-medium text-[#0955AC] border border-[#0955AC] rounded-md transition-colors hover:bg-blue-50 shadow-sm"
              >
                Edit
              </button>
            )}
          </div>
        }
      >
        <div className={`transition-opacity duration-300 ${isEditing ? 'opacity-100' : 'opacity-90'}`}>
          {children}
        </div>
      </Section>
    );
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const MAX_AVATAR_MB = 3; 
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const Settings = ({ user = {} }) => {
    const fileInputRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(user?.avatar_url || user?.image || null);
    const [clientErrors, setClientErrors] = useState({});
    const [activeTab, setActiveTab] = useState("profile");

    // Modals state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    /* ---------- editing flags for each section ---------- */
    const [editing, setEditing] = useState({
        profile: false,
        address: false,
        security: false,
        payment: false,
    });

    const toggleSection = (section) => {
        setEditing((prev) => ({ ...prev, [section]: !prev[section] }));
        if (editing[section]) {
            reset();
            setClientErrors({});
            setPhotoPreview(user?.avatar_url || user?.image || null);
        }
    };

    const initial = useMemo(
        () => ({
            // profile
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            phone: user.phone || "",
            date_of_birth: user.date_of_birth || "",
            nic_number: user.nic_number || "",
            // address
            address_line1: user.address_line1 || user.address || "",
            address_line2: user.address_line2 || "",
            city: user.city || "",
            state: user.state || "",
            postal_code: user.postal_code || "",
            country: user.country || "",
            // payment
            cardholder_name: user.cardholder_name || "",
            card_brand: user.card_brand || "",
            card_last4: user.card_last4 || "",
            expiry_month: user.expiry_month || "",
            expiry_year: user.expiry_year || "",
            // security
            current_password: "",
            new_password: "",
            confirm_password: "",
            // notifications
            notify_email: user.notify_email ?? true,
            notify_sms: user.notify_sms ?? false,
            notify_push: user.notify_push ?? true,
            // preferences
            language: user.language || "en",
            timezone: user.timezone || "Asia/Colombo",
            // image file
            avatar: null,
            // Advanced
            two_factor: false,
        }),
        [user]
    );

    const {
        data,
        setData,
        post,
        processing,
        errors,
        clearErrors,
        reset,
        transform,
    } = useForm(initial);

    // Resolve update URL safely
    const resolveUpdateUrl = () => {
        try {
            if (typeof route === "function") {
                if (typeof route().has === "function" ? route().has("client.settings.update") : true) {
                    return route("client.settings.update");
                }
            }
        } catch (_) {}
        return "/client/settings";
    };

    const updateUrl = resolveUpdateUrl();
    transform((formData) => ({ ...formData }));

    /* ---------- Profile Completion Calculation ---------- */
    const profileCompletion = useMemo(() => {
        const fields = [
            data.first_name,
            data.last_name,
            data.email,
            data.phone,
            data.address_line1,
            data.city,
            data.country,
            photoPreview,
        ];
        const filledFields = fields.filter((field) => field && String(field).trim() !== "").length;
        return Math.round((filledFields / fields.length) * 100);
    }, [data, photoPreview]);

    const validatePasswords = () => {
        const e = {};
        if (data.new_password || data.confirm_password || data.current_password) {
            if (!data.current_password)
                e.current_password = "Current password is required to change your password.";
            if ((data.new_password?.length || 0) < 8)
                e.new_password = "Use at least 8 characters.";
            if (data.new_password !== data.confirm_password)
                e.confirm_password = "Passwords do not match.";
        }
        return e;
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validateAvatar = (file) => {
        const e = {};
        if (!file) return e;
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
            e.avatar = "Please upload a JPG, PNG, or WEBP image.";
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_AVATAR_MB)
            e.avatar = `Image must be under ${MAX_AVATAR_MB}MB.`;
        return e;
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        const eAvatar = validateAvatar(file);
        setClientErrors((prev) => ({ ...prev, ...eAvatar }));
        if (Object.keys(eAvatar).length === 0) {
            setData("avatar", file || null);
            clearErrors("avatar");
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setPhotoPreview(ev.target.result);
                    toast.success("Image selected successfully!");
                };
                reader.readAsDataURL(file);
            } else {
                setPhotoPreview(user?.avatar_url || user?.image || null);
            }
        } else {
            toast.error(eAvatar.avatar);
        }
    };

    const removePhoto = () => {
        setData("avatar", null);
        setPhotoPreview(null);
        setClientErrors((prev) => ({ ...prev, avatar: undefined }));
        toast.info("Image removed. Save changes to apply.");
    };

    const submitSection = (sectionName) => {
        let hasErrors = false;
        
        if (sectionName === "security") {
            const pwdErr = validatePasswords();
            setClientErrors((prev) => ({ ...prev, ...pwdErr }));
            if (Object.keys(pwdErr).length > 0) {
                toast.error("Please fix the password errors.");
                hasErrors = true;
            }
        }

        if (hasErrors) return;

        post(updateUrl, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setEditing((prev) => ({ ...prev, [sectionName]: false }));
                if (sectionName === "security") {
                    setData({ ...data, current_password: "", new_password: "", confirm_password: "" });
                }
                clearErrors();
                setClientErrors({});
                toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} updated successfully!`);
            },
            onError: () => toast.error(`Failed to update ${sectionName}. Please check the fields.`)
        });
    };

    /* ---------- Render helpers for read-only values ---------- */
    const ReadOnly = ({ value }) => (
        <div className="h-12 flex items-center text-gray-900 border border-transparent px-3 bg-gray-50 rounded-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
            {value && value !== "" ? value : <span className="text-gray-400 italic text-[13px]">Not provided</span>}
        </div>
    );

    /* ---------- Sidebar Menu Configuration ---------- */
    const menuItems = [
        { id: "profile", label: "Profile Info", icon: <FiUser className="w-5 h-5" /> },
        { id: "address", label: "Address", icon: <FiMapPin className="w-5 h-5" /> },
        { id: "payment", label: "Payment", icon: <FiCreditCard className="w-5 h-5" /> },
        { id: "security", label: "Security", icon: <FiLock className="w-5 h-5" /> },
        { id: "preferences", label: "Preferences", icon: <FiBell className="w-5 h-5" /> },
        { id: "advanced", label: "Advanced", icon: <FiShield className="w-5 h-5" /> },
    ];

    return (
        <div className="bg-[#E5E5E5] poppins min-h-screen pb-10">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            <div className="max-w-[1300px] mx-auto px-4 md:px-6 lg:px-10 py-10">
                
                {/* Header & Progress Bar */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-[35px] font-[700] text-gray-900">
                            Account <span className="text-[#0955AC]">Settings</span>
                        </h1>
                        <p className="mt-2 text-gray-600 text-[14px]">
                            Manage your personal info, security, and payment preferences.
                        </p>
                    </div>
                    
                    <div className="w-full lg:w-96 bg-white p-4 rounded-[12px] shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[13px] font-[600] text-gray-700">Profile Completion</span>
                            <span className="text-[14px] font-[700] text-[#0955AC]">{profileCompletion}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#0955AC] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${profileCompletion}%` }}></div>
                        </div>
                        {profileCompletion < 100 && (
                            <p className="text-[11px] text-gray-500 mt-2">Complete your profile to unlock all features.</p>
                        )}
                    </div>
                </div>

                {/* Layout: Sidebar + Content */}
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar Navigation */}
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <nav className="bg-white rounded-[12px] shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                            <ul className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
                                {menuItems.map((item) => (
                                    <li key={item.id} className="min-w-max md:min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors duration-200 ${
                                                activeTab === item.id 
                                                ? 'bg-blue-50 text-[#0955AC] border-b-2 md:border-b-0 md:border-l-4 border-[#0955AC]' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-b-2 md:border-b-0 md:border-l-4 border-transparent'
                                            }`}
                                        >
                                            <span className={`${activeTab === item.id ? 'text-[#0955AC]' : 'text-gray-400'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="font-[600] text-[14px]">{item.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </aside>

                    {/* Right Content Area */}
                    <div className="flex-1 space-y-6">
                        
                        {/* --- TAB: PROFILE --- */}
                        {activeTab === "profile" && (
                            <div className="animate-fade-in">
                                <EditableSection
                                    title="Profile Information"
                                    description="Update your photo and personal details."
                                    isEditing={editing.profile}
                                    toggleEdit={() => toggleSection("profile")}
                                    onSave={() => submitSection("profile")}
                                >
                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-4">
                                        {/* Photo Section */}
                                        <div className="xl:col-span-3 flex flex-col items-center xl:items-start gap-4">
                                            <div className="sm:h-40 sm:w-40 w-28 h-28 rounded-full overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300 shadow-sm flex-shrink-0 relative group">
                                            {photoPreview ? (
                                                <img
                                                    src={photoPreview}
                                                    alt="Profile"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 gap-1">
                                                    <FiUser className="w-8 h-8 opacity-50" />
                                                    <span className="text-[10px] font-medium">No Photo</span>
                                                </div>
                                            )}
                                            {editing.profile && (
                                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                    <span className="text-white text-xs font-semibold">Change</span>
                                                </div>
                                            )}
                                            </div>

                                            {editing.profile && (
                                            <div className="flex flex-col gap-3 w-full items-center xl:items-start">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                                <div className="flex flex-wrap justify-center xl:justify-start gap-2 w-full">
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex-1 min-w-[100px] px-3 py-2 text-[13px] text-white font-[600] rounded-md bg-[#0955AC] hover:bg-blue-700 transition-colors shadow-sm text-center"
                                                    >
                                                        Upload
                                                    </button>
                                                    {photoPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={removePhoto}
                                                            className="flex-1 min-w-[100px] px-3 py-2 text-[13px] font-[600] rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors text-center"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <ErrorText>{clientErrors.avatar || errors.avatar}</ErrorText>
                                                <p className="text-[11px] text-gray-500 text-center xl:text-left mt-1">
                                                    Allowed: JPG, PNG, WEBP (Max: {MAX_AVATAR_MB}MB)
                                                </p>
                                            </div>
                                            )}
                                        </div>

                                        {/* Fields Section */}
                                        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                            <Field label="First Name" htmlFor="first_name" required>
                                                {editing.profile ? (
                                                    <input
                                                        id="first_name"
                                                        type="text"
                                                        value={data.first_name}
                                                        onChange={(e) => setData("first_name", e.target.value)}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                        required
                                                        placeholder="John"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.first_name} />
                                                )}
                                                <ErrorText>{errors.first_name}</ErrorText>
                                            </Field>

                                            <Field label="Last Name" htmlFor="last_name" required>
                                                {editing.profile ? (
                                                    <input
                                                        id="last_name"
                                                        type="text"
                                                        value={data.last_name}
                                                        onChange={(e) => setData("last_name", e.target.value)}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                        required
                                                        placeholder="Doe"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.last_name} />
                                                )}
                                                <ErrorText>{errors.last_name}</ErrorText>
                                            </Field>

                                            <Field label="Email Address" htmlFor="email" required>
                                                {editing.profile ? (
                                                    <div className="relative">
                                                        <input
                                                            id="email"
                                                            type="email"
                                                            value={data.email}
                                                            onChange={(e) => setData("email", e.target.value)}
                                                            className={`w-full h-12 px-3 pr-10 rounded-[10px] border ${data.email.length > 0 && !validateEmail(data.email) ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'} transition-shadow`}
                                                            required
                                                            placeholder="john@example.com"
                                                        />
                                                        {data.email.length > 0 && (
                                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                                {validateEmail(data.email) ? (
                                                                    <FiCheckCircle className="text-green-500 h-5 w-5" />
                                                                ) : (
                                                                    <FiXCircle className="text-red-500 h-5 w-5" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <ReadOnly value={data.email} />
                                                )}
                                                <ErrorText>{errors.email}</ErrorText>
                                            </Field>

                                            <Field label="Phone Number" htmlFor="phone">
                                                {editing.profile ? (
                                                    <PhoneInput
                                                        country={'lk'}
                                                        value={data.phone}
                                                        onChange={(phone) => setData("phone", phone)}
                                                        inputStyle={{
                                                            width: '100%',
                                                            height: '48px',
                                                            borderRadius: '10px',
                                                            borderColor: '#D1D5DB'
                                                        }}
                                                        buttonStyle={{
                                                            borderRadius: '10px 0 0 10px',
                                                            borderColor: '#D1D5DB',
                                                            backgroundColor: '#F9FAFB'
                                                        }}
                                                        containerClass="w-full"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.phone ? `+${data.phone}` : ""} />
                                                )}
                                                <ErrorText>{errors.phone}</ErrorText>
                                            </Field>

                                            <Field label="Birthday" htmlFor="date_of_birth" help="Used to pre-fill rental and ticket forms.">
                                                {editing.profile ? (
                                                    <input
                                                        id="date_of_birth"
                                                        type="date"
                                                        value={data.date_of_birth || ""}
                                                        max={new Date().toISOString().slice(0, 10)}
                                                        onChange={(e) => setData("date_of_birth", e.target.value)}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.date_of_birth} />
                                                )}
                                                <ErrorText>{errors.date_of_birth}</ErrorText>
                                            </Field>

                                            <Field label="NIC Number" htmlFor="nic_number" help="Required on every booking; saved here so you only type it once.">
                                                {editing.profile ? (
                                                    <input
                                                        id="nic_number"
                                                        type="text"
                                                        value={data.nic_number}
                                                        maxLength={12}
                                                        placeholder="199012345678"
                                                        onChange={(e) => setData("nic_number", e.target.value.toUpperCase().replace(/\s/g, ""))}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.nic_number} />
                                                )}
                                                <ErrorText>{errors.nic_number}</ErrorText>
                                            </Field>
                                        </div>
                                    </div>
                                </EditableSection>
                            </div>
                        )}

                        {/* --- TAB: ADDRESS --- */}
                        {activeTab === "address" && (
                            <div className="animate-fade-in">
                                <EditableSection
                                    title="Address Information"
                                    description="Your primary address will be used for billing and receipts."
                                    isEditing={editing.address}
                                    toggleEdit={() => toggleSection("address")}
                                    onSave={() => submitSection("address")}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                                        <Field label="Address line 1" htmlFor="address_line1" required>
                                            {editing.address ? (
                                                <input
                                                    id="address_line1"
                                                    type="text"
                                                    value={data.address_line1}
                                                    onChange={(e) => setData("address_line1", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    placeholder="No. 123, Main Street"
                                                    required
                                                />
                                            ) : (
                                                <ReadOnly value={data.address_line1} />
                                            )}
                                            <ErrorText>{errors.address_line1}</ErrorText>
                                        </Field>

                                        <Field label="Address line 2" htmlFor="address_line2">
                                            {editing.address ? (
                                                <input
                                                    id="address_line2"
                                                    type="text"
                                                    value={data.address_line2}
                                                    onChange={(e) => setData("address_line2", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    placeholder="Apartment, suite, etc. (optional)"
                                                />
                                            ) : (
                                                <ReadOnly value={data.address_line2} />
                                            )}
                                            <ErrorText>{errors.address_line2}</ErrorText>
                                        </Field>

                                        <Field label="City" htmlFor="city" required>
                                            {editing.address ? (
                                                <input
                                                    id="city"
                                                    type="text"
                                                    value={data.city}
                                                    onChange={(e) => setData("city", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    required
                                                />
                                            ) : (
                                                <ReadOnly value={data.city} />
                                            )}
                                            <ErrorText>{errors.city}</ErrorText>
                                        </Field>

                                        <Field label="State/Province" htmlFor="state">
                                            {editing.address ? (
                                                <input
                                                    id="state"
                                                    type="text"
                                                    value={data.state}
                                                    onChange={(e) => setData("state", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                />
                                            ) : (
                                                <ReadOnly value={data.state} />
                                            )}
                                            <ErrorText>{errors.state}</ErrorText>
                                        </Field>

                                        <Field label="Postal code" htmlFor="postal_code" required>
                                            {editing.address ? (
                                                <input
                                                    id="postal_code"
                                                    type="text"
                                                    value={data.postal_code}
                                                    onChange={(e) => setData("postal_code", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    required
                                                />
                                            ) : (
                                                <ReadOnly value={data.postal_code} />
                                            )}
                                            <ErrorText>{errors.postal_code}</ErrorText>
                                        </Field>

                                        <Field label="Country" htmlFor="country" required>
                                            {editing.address ? (
                                                <input
                                                    id="country"
                                                    type="text"
                                                    value={data.country}
                                                    onChange={(e) => setData("country", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    placeholder="Sri Lanka"
                                                    required
                                                />
                                            ) : (
                                                <ReadOnly value={data.country} />
                                            )}
                                            <ErrorText>{errors.country}</ErrorText>
                                        </Field>
                                    </div>
                                </EditableSection>
                            </div>
                        )}

                        {/* --- TAB: PAYMENT --- */}
                        {activeTab === "payment" && (
                            <div className="animate-fade-in">
                                <EditableSection
                                    title="Payment Details"
                                    description="Update your saved card details. We recommend using tokenized gateways."
                                    isEditing={editing.payment}
                                    toggleEdit={() => toggleSection("payment")}
                                    onSave={() => submitSection("payment")}
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-4">
                                        <Field label="Cardholder name" htmlFor="cardholder_name" required>
                                            {editing.payment ? (
                                                <input
                                                    id="cardholder_name"
                                                    type="text"
                                                    value={data.cardholder_name}
                                                    onChange={(e) => setData("cardholder_name", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    required
                                                />
                                            ) : (
                                                <ReadOnly value={data.cardholder_name} />
                                            )}
                                            <ErrorText>{errors.cardholder_name}</ErrorText>
                                        </Field>

                                        <Field label="Card brand" htmlFor="card_brand" help="e.g., Visa / Mastercard">
                                            {editing.payment ? (
                                                <input
                                                    id="card_brand"
                                                    type="text"
                                                    value={data.card_brand}
                                                    onChange={(e) => setData("card_brand", e.target.value)}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    placeholder="Visa / Mastercard"
                                                />
                                            ) : (
                                                <ReadOnly value={data.card_brand} />
                                            )}
                                            <ErrorText>{errors.card_brand}</ErrorText>
                                        </Field>

                                        <Field label="Last 4 digits" htmlFor="card_last4" help="Shown for reference only.">
                                            {editing.payment ? (
                                                <input
                                                    id="card_last4"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    value={data.card_last4}
                                                    onChange={(e) => setData("card_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                                                    className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                    placeholder="1234"
                                                />
                                            ) : (
                                                <ReadOnly value={data.card_last4} />
                                            )}
                                            <ErrorText>{errors.card_last4}</ErrorText>
                                        </Field>

                                        <div className="grid grid-cols-2 gap-6">
                                            <Field label="Expiry month" htmlFor="expiry_month">
                                                {editing.payment ? (
                                                    <input
                                                        id="expiry_month"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={data.expiry_month}
                                                        onChange={(e) => setData("expiry_month", e.target.value.replace(/\D/g, "").slice(0, 2))}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                        placeholder="MM"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.expiry_month} />
                                                )}
                                                <ErrorText>{errors.expiry_month}</ErrorText>
                                            </Field>
                                            <Field label="Expiry year" htmlFor="expiry_year">
                                                {editing.payment ? (
                                                    <input
                                                        id="expiry_year"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        value={data.expiry_year}
                                                        onChange={(e) => setData("expiry_year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                                                        className="w-full h-12 px-3 rounded-[10px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                                        placeholder="YYYY"
                                                    />
                                                ) : (
                                                    <ReadOnly value={data.expiry_year} />
                                                )}
                                                <ErrorText>{errors.expiry_year}</ErrorText>
                                            </Field>
                                        </div>
                                    </div>
                                    {editing.payment && (
                                        <p className="mt-4 text-xs text-gray-500">
                                            Tip: Integrate Stripe/PayHere and collect a payment method token on the frontend; submit that token here instead of card numbers.
                                        </p>
                                    )}
                                </EditableSection>
                            </div>
                        )}

                        {/* --- TAB: SECURITY --- */}
                        {activeTab === "security" && (
                            <div className="animate-fade-in space-y-6">
                                <EditableSection
                                    title="Change Password"
                                    description="Ensure your account is using a long, random password to stay secure."
                                    isEditing={editing.security}
                                    toggleEdit={() => toggleSection("security")}
                                    onSave={() => submitSection("security")}
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                        {[
                                            { id: "current_password", label: "Current Password" },
                                            { id: "new_password", label: "New Password" },
                                            { id: "confirm_password", label: "Confirm New Password" },
                                        ].map((f) => (
                                            <div key={f.id} className={f.id === "current_password" ? "lg:col-span-2 lg:w-1/2" : ""}>
                                                <Field label={f.label} htmlFor={f.id}>
                                                    {editing.security ? (
                                                        <div className="relative">
                                                            <input
                                                                id={f.id}
                                                                type="password"
                                                                value={data[f.id]}
                                                                onChange={(e) => {
                                                                    setData(f.id, e.target.value);
                                                                    if (clientErrors[f.id]) {
                                                                        setClientErrors(prev => ({...prev, [f.id]: undefined}));
                                                                    }
                                                                }}
                                                                className={`w-full h-12 px-3 pr-10 rounded-[10px] border ${clientErrors[f.id] ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'} transition-shadow`}
                                                                autoComplete={f.id.includes("current") ? "current-password" : "new-password"}
                                                                placeholder="••••••••"
                                                            />
                                                            {f.id === "new_password" && data.new_password.length > 0 && (
                                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                                    {data.new_password.length >= 8 ? (
                                                                        <FiCheckCircle className="text-green-500 h-5 w-5" />
                                                                    ) : (
                                                                        <FiXCircle className="text-red-500 h-5 w-5" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {f.id === "confirm_password" && data.confirm_password.length > 0 && (
                                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                                    {data.new_password === data.confirm_password ? (
                                                                        <FiCheckCircle className="text-green-500 h-5 w-5" />
                                                                    ) : (
                                                                        <FiXCircle className="text-red-500 h-5 w-5" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <ReadOnly value={data[f.id] ? "••••••••" : ""} />
                                                    )}
                                                    <ErrorText>{clientErrors[f.id] || errors[f.id]}</ErrorText>
                                                    {f.id === "new_password" && editing.security && data.new_password.length > 0 && data.new_password.length < 8 && (
                                                        <p className="mt-1 text-[11px] text-red-500 font-medium">Too short. Use at least 8 characters.</p>
                                                    )}
                                                    {f.id === "confirm_password" && editing.security && data.confirm_password.length > 0 && data.new_password !== data.confirm_password && (
                                                        <p className="mt-1 text-[11px] text-red-500 font-medium">Passwords do not match.</p>
                                                    )}
                                                </Field>
                                            </div>
                                        ))}
                                    </div>
                                </EditableSection>
                                
                                {/* Security Info Card */}
                                <Section title="Security Recommendations">
                                    <div className="bg-blue-50 text-[#0955AC] p-4 rounded-lg flex items-start gap-4 border border-blue-100">
                                        <FiShield className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-[700] text-[14px]">Protect Your Account</h4>
                                            <p className="text-[13px] mt-1 opacity-90 leading-relaxed">
                                                Avoid using the same password for multiple websites. Ensure your password is at least 8 characters long and contains a mix of letters, numbers, and symbols. We highly recommend enabling Two-Factor Authentication in the Advanced tab.
                                            </p>
                                        </div>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* --- TAB: PREFERENCES --- */}
                        {activeTab === "preferences" && (
                            <div className="animate-fade-in space-y-6">
                                <Section 
                                    title="Regional Settings" 
                                    description="Set your preferred language and timezone for the platform."
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                                        <Field label="Language" htmlFor="language">
                                            <select
                                                id="language"
                                                value={data.language}
                                                onChange={(e) => {
                                                    setData("language", e.target.value);
                                                    post(updateUrl, { preserveScroll: true, onSuccess: () => toast.success("Language preference updated.") });
                                                }}
                                                className="w-full h-12 px-3 rounded-[10px] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-white text-gray-700"
                                            >
                                                <option value="en">English (US)</option>
                                                <option value="es">Español</option>
                                                <option value="fr">Français</option>
                                                <option value="si">Sinhala</option>
                                                <option value="ta">Tamil</option>
                                            </select>
                                        </Field>
                                        <Field label="Timezone" htmlFor="timezone">
                                            <select
                                                id="timezone"
                                                value={data.timezone}
                                                onChange={(e) => {
                                                    setData("timezone", e.target.value);
                                                    post(updateUrl, { preserveScroll: true, onSuccess: () => toast.success("Timezone preference updated.") });
                                                }}
                                                className="w-full h-12 px-3 rounded-[10px] border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-white text-gray-700"
                                            >
                                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                <option value="Asia/Colombo">Asia/Colombo (IST)</option>
                                                <option value="America/New_York">America/New_York (EST)</option>
                                                <option value="Europe/London">Europe/London (GMT)</option>
                                                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                                            </select>
                                        </Field>
                                    </div>
                                </Section>

                                <Section 
                                    title="Notification Preferences" 
                                    description="Manage how we communicate with you regarding your bookings and updates."
                                >
                                    <div className="mt-4">
                                        <Toggle 
                                            label="Email Notifications" 
                                            description="Get updates and receipts in your inbox."
                                            checked={data.notify_email} 
                                            onChange={(val) => {
                                                setData('notify_email', val);
                                                post(updateUrl, { preserveScroll: true, onSuccess: () => toast.success("Email preference updated.") });
                                            }} 
                                        />
                                        <Toggle 
                                            label="SMS / Text Messages" 
                                            description="Receive updates via text messages."
                                            checked={data.notify_sms} 
                                            onChange={(val) => {
                                                setData('notify_sms', val);
                                                post(updateUrl, { preserveScroll: true, onSuccess: () => toast.success("SMS preference updated.") });
                                            }} 
                                        />
                                        <Toggle 
                                            label="Push Notifications" 
                                            description="Allow browser or app push notifications for instant alerts."
                                            checked={data.notify_push} 
                                            onChange={(val) => {
                                                setData('notify_push', val);
                                                post(updateUrl, { preserveScroll: true, onSuccess: () => toast.success("Push preference updated.") });
                                            }} 
                                        />
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* --- TAB: ADVANCED --- */}
                        {activeTab === "advanced" && (
                            <div className="animate-fade-in space-y-6">
                                <Section title="Email Verification" description="Verify your email address to secure your account.">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-gray-50 border border-gray-200 rounded-lg gap-4">
                                        <div>
                                            <p className="font-[600] text-[14px] text-gray-900">Email Address: {data.email || 'Not provided'}</p>
                                            <p className="text-[12px] text-gray-500 mt-1 max-w-md">
                                                {user?.email_verified_at 
                                                    ? 'Your email address has been verified.' 
                                                    : 'Please verify your email address to unlock all features and secure your account.'}
                                            </p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => user?.email_verified_at ? toast.info("Email is already verified.") : toast.success("Verification link sent to your email!")}
                                            className={`px-4 py-2 text-sm font-[600] rounded-md transition-colors shadow-sm ${user?.email_verified_at ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-800 text-white hover:bg-gray-900'}`}
                                        >
                                            {user?.email_verified_at ? 'Verified' : 'Verify Email'}
                                            </button>
                                        </div>
                                    </Section>

                                <Section title="Recent Activity" description="Review recent logins and activity on your account.">
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Device / IP</th>
                                                    <th className="px-6 py-3 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-gray-900">Login Successful</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-500">Windows • Chrome<br/><span className="text-[11px]">192.168.1.1</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] text-gray-500">Today, 10:45 AM</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-gray-900">Profile Updated</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-500">Windows • Chrome<br/><span className="text-[11px]">192.168.1.1</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] text-gray-500">Yesterday, 2:30 PM</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </Section>

                                <section className="bg-white rounded-[10px] border border-red-200 p-6 md:p-8 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiAlertTriangle className="w-5 h-5 text-red-600" />
                                        <h2 className="text-[18px] font-[700] text-red-600">Danger Zone</h2>
                                    </div>
                                    <p className="text-[13px] text-gray-600 mb-6 max-w-2xl">
                                        Once you delete your account, there is no going back. All of your bookings, history, and personal data will be permanently wiped from our servers. Please be certain.
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => toast.info("Data export initiated. You will receive an email shortly.")}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
                                        >
                                            Export My Data
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowDeleteModal(true)}
                                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 shadow-sm"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                    </div>
                </div>
            </div>
            
            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 transition-opacity">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-[700] text-gray-900 flex items-center gap-2">
                                <FiAlertTriangle className="w-5 h-5 text-red-600" />
                                Delete Account
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FiXCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            This action cannot be undone. This will permanently delete your account, active bookings, history, and all personal data associated with your profile.
                        </p>
                        <p className="text-sm text-gray-800 mb-2 font-medium">
                            Please type <span className="font-bold text-red-600 select-none">DELETE</span> to confirm.
                        </p>
                        <input 
                            type="text" 
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full h-12 px-4 border border-gray-300 rounded-[8px] focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-6 text-center font-[600] tracking-widest uppercase"
                            placeholder="DELETE"
                            autoComplete="off"
                        />
                        <div className="flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText("");
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                disabled={deleteConfirmText !== "DELETE"}
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    toast.success("Account deletion request submitted to administration.");
                                    setDeleteConfirmText("");
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            

            <style dangerouslySetAttribute={{__html: `
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
};

export default Settings;