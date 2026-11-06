import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Building2, Eye, EyeOff, FileCheck2, KeyRound, ShieldCheck, User, Users } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";
import zxcvbn from "zxcvbn";

const EMPTY = {
    isTeamUser: false,
    profile: {
        logoUrl: null,
        companyName: "",
        displayName: "",
        ownerName: "",
        ownerAddress: "",
        ownerCountry: "",
        ownerEmail: "",
        ownerPhone: "",
        businessRegistrationNo: "",
        taxId: "",
        website: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        supportEmail: "",
        supportHotline: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        publicAbout: "",
        publicSupportHours: "",
        status: "draft",
        reviewedAt: "",
        adminNotes: "",
    },
    summary: {
        completionScore: 0,
        approvedServices: 0,
        pendingServices: 0,
        rejectedServices: 0,
    },
    serviceEnrollment: [],
    activity: [],
};

const PROFILE_SECURITY_STATUS_EMPTY = {
    trustedDevices: [],
    stepUpVerifiedAt: "",
    twoFactorVerifiedAt: "",
    anomalyDetectedAt: "",
};

const statusBadge = (status) => {
    switch (status) {
        case "approved":
            return "bg-[#DCFCE7] text-[#166534]";
        case "submitted":
            return "bg-[#DBEAFE] text-[#1D4ED8]";
        case "revision_requested":
            return "bg-[#FEF3C7] text-[#92400E]";
        case "rejected":
            return "bg-[#FEE2E2] text-[#991B1B]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const PASSWORD_STRENGTH_LEVELS = [
    { label: "Weak", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-yellow-500" },
    { label: "Good", color: "bg-blue-500" },
    { label: "Strong", color: "bg-green-500" },
];

const buildPasswordStrength = (password) => {
    if (!password) {
        return { score: 0, label: "", color: "" };
    }
    const { score } = zxcvbn(password);
    const safeScore = Math.max(0, Math.min(score, 4));
    const level = PASSWORD_STRENGTH_LEVELS[safeScore] || PASSWORD_STRENGTH_LEVELS[0];
    return { score: safeScore, label: level.label, color: level.color };
};

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const TAB_CONFIG = [
    { key: "company", label: "Company Info", icon: Building2 },
    { key: "owner", label: "Personal Info", icon: User },
    { key: "security", label: "Security", icon: KeyRound },
    { key: "compliance", label: "Compliance", icon: FileCheck2 },
    { key: "services", label: "Service Access", icon: ShieldCheck },
    { key: "activity", label: "Activity Log", icon: Users },
];

const TAB_FIELDS = {
    company: [
        "companyName",
        "displayName",
        "businessRegistrationNo",
        "taxId",
        "website",
        "contactPerson",
        "contactEmail",
        "contactPhone",
        "supportEmail",
        "supportHotline",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
        "publicAbout",
        "publicSupportHours",
    ],
    owner: [
        "ownerName",
        "ownerAddress",
        "ownerCountry",
        "ownerEmail",
        "ownerPhone",
    ],
    security: [],
    compliance: [],
    services: [],
    activity: [],
};

const SectionCard = ({ title, description, children }) => (
    <div className="bg-white rounded-[10px] p-5 md:p-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
        <div className="mb-4">
            <h2 className="text-[18px] font-[700] text-[#111827]">{title}</h2>
            {description && <p className="text-[12px] text-[#6B7280] mt-1">{description}</p>}
        </div>
        {children}
    </div>
);

const Field = ({ label, children, help }) => (
    <label className="block">
        <span className="text-[13px] font-[700] text-[#374151]">{label}</span>
        <div className="mt-1">{children}</div>
        {help && <p className="text-[11px] text-[#6B7280] mt-1">{help}</p>}
    </label>
);

const ErrorText = ({ children }) => (children ? <p className="text-[11px] text-[#DC2626] mt-1">{children}</p> : null);

const ProfileContent = () => {
    const props = usePage().props;
    const courierProfile = props.courierProfile || EMPTY;
    const isTeamUser = Boolean(courierProfile.isTeamUser);
    const flash = props.flash || {};
    const errors = props.errors || {};
    const logoInputRef = useRef(null);
    const ownerPhotoInputRef = useRef(null);
    const stepUpGuidanceRef = useRef(null);
    const stepUpGuidanceTimerRef = useRef(null);
    const [logoPreview, setLogoPreview] = useState(courierProfile.profile.logoUrl || null);
    const [logoFile, setLogoFile] = useState(null);
    const [ownerPhotoPreview, setOwnerPhotoPreview] = useState(courierProfile.profile.ownerImageUrl || null);
    const [ownerPhotoFile, setOwnerPhotoFile] = useState(null);
    const [clientErrors, setClientErrors] = useState({});
    const initialProfileModule = String(props.initialProfileModule || "company");
    const profileSecurityStatus = props.profileSecurityStatus && typeof props.profileSecurityStatus === "object"
        ? props.profileSecurityStatus
        : PROFILE_SECURITY_STATUS_EMPTY;

    const [activeTab, setActiveTab] = useState(
        TAB_CONFIG.some((tab) => tab.key === initialProfileModule) ? initialProfileModule : "company",
    );
    const initialForm = useMemo(() => ({
        companyName: courierProfile.profile.companyName || "",
        displayName: courierProfile.profile.displayName || "",
        ownerName: courierProfile.profile.ownerName || "",
        ownerAddress: courierProfile.profile.ownerAddress || "",
        ownerCountry: courierProfile.profile.ownerCountry || "",
        ownerEmail: courierProfile.profile.ownerEmail || "",
        ownerPhone: courierProfile.profile.ownerPhone || "",
        businessRegistrationNo: courierProfile.profile.businessRegistrationNo || "",
        taxId: courierProfile.profile.taxId || "",
        website: courierProfile.profile.website || "",
        contactPerson: courierProfile.profile.contactPerson || "",
        contactEmail: courierProfile.profile.contactEmail || "",
        contactPhone: courierProfile.profile.contactPhone || "",
        supportEmail: courierProfile.profile.supportEmail || "",
        supportHotline: courierProfile.profile.supportHotline || "",
        addressLine1: courierProfile.profile.addressLine1 || "",
        addressLine2: courierProfile.profile.addressLine2 || "",
        city: courierProfile.profile.city || "",
        state: courierProfile.profile.state || "",
        postalCode: courierProfile.profile.postalCode || "",
        country: courierProfile.profile.country || "",
        publicAbout: courierProfile.profile.publicAbout || "",
        publicSupportHours: courierProfile.profile.publicSupportHours || "",
    }), [courierProfile.profile]);

    const [form, setForm] = useState(initialForm);
    const [baselineForm, setBaselineForm] = useState(initialForm);
    const [securityForm, setSecurityForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        next: false,
        confirm: false,
    });
    const [sessionSecurityStatus, setSessionSecurityStatus] = useState(profileSecurityStatus);
    const [stepUpForm, setStepUpForm] = useState({
        currentPassword: "",
        otpCode: "",
    });
    const [showStepUpPassword, setShowStepUpPassword] = useState(false);
    const [stepUpGuidanceHighlight, setStepUpGuidanceHighlight] = useState(false);
    const passwordStrength = useMemo(() => buildPasswordStrength(securityForm.password), [securityForm.password]);

    const {
        feedback,
        closeFeedback,
        setFeedback,
        confirmState,
        openConfirm,
        closeConfirm,
        runConfirm,
    } = useCourierActionModal(flash, 2800);

    const serviceRows = Array.isArray(courierProfile.serviceEnrollment) ? courierProfile.serviceEnrollment : [];
    const activityRows = Array.isArray(courierProfile.activity) ? courierProfile.activity : [];
    const isCompanyDirty = JSON.stringify(form) !== JSON.stringify(baselineForm) || Boolean(logoFile) || Boolean(ownerPhotoFile);
    const isSecurityDirty = Object.values(securityForm).some((value) => String(value || "").trim() !== "");
    const isDirty = isCompanyDirty || isSecurityDirty;
    const editableTab = activeTab === "company" || activeTab === "owner" || activeTab === "security";
    const isTabDirty = activeTab === "security"
        ? isSecurityDirty
        : (TAB_FIELDS[activeTab].some((field) => form[field] !== baselineForm[field])
            || (activeTab === "company" && Boolean(logoFile))
            || (activeTab === "owner" && Boolean(ownerPhotoFile)));
    const visibleTabs = isTeamUser
        ? TAB_CONFIG.filter((tab) => ["company", "security"].includes(tab.key))
        : TAB_CONFIG;

    useEffect(() => {
        if (!TAB_CONFIG.some((tab) => tab.key === initialProfileModule)) {
            return;
        }

        if (isTeamUser && !["company", "security"].includes(initialProfileModule)) {
            setActiveTab("company");
            return;
        }

        setActiveTab(initialProfileModule);
    }, [initialProfileModule, isTeamUser]);

    const summaryCards = useMemo(
        () => isTeamUser
            ? [
                { key: "completionScore", label: "Profile Completion", value: `${courierProfile.summary.completionScore}%` },
            ]
            : [
                { key: "completionScore", label: "Profile Completion", value: `${courierProfile.summary.completionScore}%` },
                { key: "approvedServices", label: "Approved Services", value: courierProfile.summary.approvedServices },
                { key: "pendingServices", label: "Pending Services", value: courierProfile.summary.pendingServices },
                { key: "rejectedServices", label: "Rejected Services", value: courierProfile.summary.rejectedServices },
            ],
        [courierProfile.summary, isTeamUser],
    );

    useEffect(() => {
        setSessionSecurityStatus(profileSecurityStatus);
    }, [profileSecurityStatus]);

    useEffect(() => {
        setLogoPreview(courierProfile.profile.logoUrl || null);
    }, [courierProfile.profile.logoUrl]);

    useEffect(() => {
        setOwnerPhotoPreview(courierProfile.profile.ownerImageUrl || null);
    }, [courierProfile.profile.ownerImageUrl]);

    const requestJson = async (method, url, body = null) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
            },
            credentials: "same-origin",
            body: body ? JSON.stringify(body) : undefined,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(payload?.message || "Request failed");
            error.code = payload?.code || null;
            error.status = response.status;
            throw error;
        }

        return payload;
    };

    const isStepUpRequiredError = (error) => {
        const code = String(error?.code || "").toLowerCase();
        const message = String(error?.message || "").toLowerCase();

        return code === "step_up_required" || message.includes("step-up authentication is required");
    };

    const highlightStepUpGuidance = () => {
        if (stepUpGuidanceTimerRef.current) {
            window.clearTimeout(stepUpGuidanceTimerRef.current);
        }

        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                if (!stepUpGuidanceRef.current) {
                    return;
                }

                stepUpGuidanceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                setStepUpGuidanceHighlight(true);
                stepUpGuidanceTimerRef.current = window.setTimeout(() => {
                    setStepUpGuidanceHighlight(false);
                }, 4200);
            }, 80);
        });
    };

    const openProfileStepUpGuidance = (message) => {
        setActiveTab("security");
        setFeedback({
            type: "error",
            message: message || "Step-up authentication is required before this action. Complete verification in Profile Security, then retry.",
        });
        highlightStepUpGuidance();
    };

    const requestStepUpCode = async () => {
        try {
            const payload = await requestJson("POST", route("courierService.security.step-up.request"));
            setFeedback({ type: "success", message: payload?.message || "Step-up verification code sent." });
        } catch (error) {
            setFeedback({ type: "error", message: error.message || "Failed to request step-up code." });
        }
    };

    const confirmRequestStepUpCode = () => {
        openConfirm({
            type: "info",
            title: "Request OTP Code",
            message: "Send a new OTP code to your registered email now?",
            confirmText: "Send OTP",
            onConfirm: requestStepUpCode,
        });
    };

    const verifyStepUp = async () => {
        if (!String(stepUpForm.currentPassword || "").trim() || !String(stepUpForm.otpCode || "").trim()) {
            setFeedback({ type: "error", message: "Current password and OTP code are required." });
            return;
        }

        try {
            const payload = await requestJson("POST", route("courierService.security.step-up.verify"), {
                currentPassword: stepUpForm.currentPassword,
                otpCode: stepUpForm.otpCode,
            });
            setFeedback({ type: "success", message: payload?.message || "Step-up verification completed." });
            const trustedDevices = Array.isArray(payload?.trustedDevices) ? payload.trustedDevices : [];
            setSessionSecurityStatus((prev) => ({
                ...prev,
                trustedDevices,
                stepUpVerifiedAt: payload?.stepUpVerifiedAt || prev.stepUpVerifiedAt,
                twoFactorVerifiedAt: payload?.twoFactorVerifiedAt || prev.twoFactorVerifiedAt,
                anomalyDetectedAt: payload?.anomalyDetectedAt || prev.anomalyDetectedAt,
            }));
            setStepUpForm({ currentPassword: "", otpCode: "" });
            router.reload({ only: ["profileSecurityStatus"], preserveScroll: true, preserveState: true });
        } catch (error) {
            setFeedback({ type: "error", message: error.message || "Failed to complete step-up verification." });
        }
    };

    const trustThisDevice = async () => {
        try {
            const payload = await requestJson("POST", route("courierService.security.device.trust"), {
                label: "Current Browser",
            });
            setFeedback({ type: "success", message: payload?.message || "Current device trusted." });
            const trustedDevices = Array.isArray(payload?.trustedDevices) ? payload.trustedDevices : [];
            setSessionSecurityStatus((prev) => ({ ...prev, trustedDevices }));
            router.reload({ only: ["profileSecurityStatus"], preserveScroll: true, preserveState: true });
        } catch (error) {
            if (isStepUpRequiredError(error)) {
                openProfileStepUpGuidance(error?.message);
                return;
            }
            setFeedback({ type: "error", message: error?.message || "Failed to trust current device." });
        }
    };

    const saveProfile = () => {
        if (!String(form.companyName || "").trim()) {
            setClientErrors((prev) => ({ ...prev, companyName: "Company name is required." }));
            return;
        }

        openConfirm({
            title: "Save Courier Profile",
            message: "Save profile updates now?",
            onConfirm: () => {
                router.post(route("courierService.profile.update"), { ...form, logo: logoFile, section: activeTab }, {
                    preserveScroll: true,
                    preserveState: true,
                    forceFormData: true,
                    onSuccess: () => {
                        setBaselineForm(form);
                        setLogoFile(null);
                    },
                    onError: () => {
                        setFeedback({ type: "error", message: "Failed to save courier profile. Please review inputs." });
                    },
                });
            },
        });
    };

    const saveSecurity = () => {
        const currentPassword = String(securityForm.current_password || "").trim();
        const newPassword = String(securityForm.password || "").trim();
        const confirmPassword = String(securityForm.password_confirmation || "").trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            setFeedback({ type: "error", message: "Please fill current, new, and confirm password fields." });
            return;
        }

        if (newPassword !== confirmPassword) {
            setFeedback({ type: "error", message: "New password and confirmation do not match." });
            return;
        }

        openConfirm({
            title: "Update Password",
            message: "Save your new account password now?",
            onConfirm: () => {
                router.put(route("password.update"), securityForm, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setSecurityForm({
                            current_password: "",
                            password: "",
                            password_confirmation: "",
                        });
                        setFeedback({ type: "success", message: "Password updated successfully." });
                    },
                    onError: () => {
                        setFeedback({ type: "error", message: "Failed to update password. Check your current password and try again." });
                    },
                });
            },
        });
    };

    const submitOwnerProfile = ({
        ownerImage = ownerPhotoFile,
        successMessage = "Owner profile info updated successfully.",
    } = {}) => {
        // Normalize phone: if it is only a dial code (≤4 digits, no spaces), send empty string
        const rawPhone = String(form.ownerPhone || "").trim();
        const normalizedPhone = rawPhone.replace(/\D/g, "").length >= 5 ? rawPhone : "";
        router.post(route("courierService.profile.owner.update"), {
            ownerName: form.ownerName,
            ownerAddress: form.ownerAddress,
            ownerCountry: form.ownerCountry,
            ownerEmail: form.ownerEmail,
            ownerPhone: normalizedPhone,
            ownerImage,
        }, {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            onSuccess: () => {
                setBaselineForm((prev) => ({
                    ...prev,
                    ownerName: form.ownerName,
                    ownerAddress: form.ownerAddress,
                    ownerCountry: form.ownerCountry,
                    ownerEmail: form.ownerEmail,
                    ownerPhone: form.ownerPhone,
                }));
                setOwnerPhotoFile(null);
                setFeedback({ type: "success", message: successMessage });
                router.reload({ only: ["auth", "courierProfile"], preserveScroll: true, preserveState: true });
            },
            onError: (submitErrors = {}) => {
                const firstError = Object.values(submitErrors).find((value) => Array.isArray(value)
                    ? value.length > 0
                    : Boolean(value));
                const message = Array.isArray(firstError)
                    ? String(firstError[0] || "")
                    : String(firstError || "");
                setFeedback({
                    type: "error",
                    message: message || "Failed to save owner profile info. Please review inputs.",
                });
            },
        });
    };

    const saveOwnerProfile = () => {
        if (!String(form.ownerName || "").trim()) {
            setFeedback({ type: "error", message: "Owner name is required." });
            return;
        }

        if (!String(form.ownerEmail || "").trim()) {
            setFeedback({ type: "error", message: "Owner email is required." });
            return;
        }

        openConfirm({
            title: "Save Owner Profile",
            message: "Save owner profile info now?",
            onConfirm: () => submitOwnerProfile(),
        });
    };

    const discardUnsavedChanges = () => {
        setForm(baselineForm);
        setSecurityForm({
            current_password: "",
            password: "",
            password_confirmation: "",
        });
        setClientErrors({});
        setLogoFile(null);
        setOwnerPhotoFile(null);
        setLogoPreview(courierProfile.profile.logoUrl || null);
        setOwnerPhotoPreview(courierProfile.profile.ownerImageUrl || null);
    };

    const navigateProfileTab = (nextTab) => {
        const isValidTab = TAB_CONFIG.some((tab) => tab.key === nextTab);
        if (!isValidTab) {
            return;
        }

        const safeTab = isTeamUser && !["company", "security"].includes(nextTab)
            ? "company"
            : nextTab;

        setActiveTab(safeTab);
        router.get(route("courierService.profile.module", { module: safeTab }), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleTabChange = (nextTab) => {
        if (nextTab === activeTab) {
            return;
        }

        if (!isDirty) {
            navigateProfileTab(nextTab);
            return;
        }

        openConfirm({
            title: "Unsaved Changes",
            message: "You have unsaved profile changes. Switch tab without saving?",
            onConfirm: () => {
                discardUnsavedChanges();
                navigateProfileTab(nextTab);
            },
        });
    };

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (window.sessionStorage.getItem("courier.profileStepUpGuidancePending") !== "1") {
            return;
        }

        window.sessionStorage.removeItem("courier.profileStepUpGuidancePending");
        setActiveTab("security");
        setFeedback({
            type: "error",
            message: "Step-up authentication is required before this action. Complete verification in Profile Security, then retry.",
        });
        highlightStepUpGuidance();
    }, [setFeedback]);

    useEffect(() => () => {
        if (stepUpGuidanceTimerRef.current) {
            window.clearTimeout(stepUpGuidanceTimerRef.current);
        }
    }, []);

    const removeLogo = () => {
        openConfirm({
            title: isTeamUser ? "Remove Profile Picture" : "Remove Profile Logo",
            message: isTeamUser ? "Remove your current profile picture?" : "Remove the current company logo from profile?",
            onConfirm: () => {
                router.delete(route("courierService.profile.logo.remove"), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setLogoPreview(null);
                        setLogoFile(null);
                    },
                    onError: () => {
                        setFeedback({ type: "error", message: "Failed to remove profile logo." });
                    },
                });
            },
        });
    };

    const onLogoChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
            setClientErrors((prev) => ({ ...prev, logo: isTeamUser ? "Please upload a JPG, PNG, or WEBP profile picture." : "Please upload JPG, PNG, or WEBP image." }));
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            setClientErrors((prev) => ({ ...prev, logo: isTeamUser ? "Profile picture must be under 3MB." : "Logo must be under 3MB." }));
            return;
        }

        setClientErrors((prev) => ({ ...prev, logo: undefined }));
        setLogoFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoPreview(e.target?.result || null);
        };
        reader.readAsDataURL(file);
    };

    const onOwnerPhotoChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
            setClientErrors((prev) => ({ ...prev, ownerImage: "Please upload a JPG, PNG, or WEBP profile picture." }));
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            setClientErrors((prev) => ({ ...prev, ownerImage: "Profile picture must be under 3MB." }));
            return;
        }

        setClientErrors((prev) => ({ ...prev, ownerImage: undefined }));
        setOwnerPhotoFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setOwnerPhotoPreview(e.target?.result || null);
        };
        reader.readAsDataURL(file);

        submitOwnerProfile({
            ownerImage: file,
            successMessage: "Profile picture updated successfully.",
        });
    };

    const removeOwnerPhoto = () => {
        openConfirm({
            title: "Remove Profile Picture",
            message: "Remove your current personal profile picture?",
            onConfirm: () => {
                router.delete(route("courierService.profile.owner.image.remove"), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setOwnerPhotoPreview(null);
                        setOwnerPhotoFile(null);
                        router.reload({ only: ["auth", "courierProfile"], preserveScroll: true, preserveState: true });
                    },
                    onError: () => {
                        setFeedback({ type: "error", message: "Failed to remove owner profile picture." });
                    },
                });
            },
        });
    };

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <style>{`
                .courier-owner-phone-input {
                    width: 100%;
                }
                .courier-owner-phone-input .form-control {
                    width: 100% !important;
                    height: 42px !important;
                    border: 1px solid #D1D5DB !important;
                    border-radius: 8px !important;
                    padding-left: 52px !important;
                    font-size: 14px !important;
                    color: #111827 !important;
                    background: #FFFFFF !important;
                }
                .courier-owner-phone-input .form-control:focus {
                    box-shadow: none !important;
                    outline: none !important;
                    border-color: #0955AC !important;
                }
                .courier-owner-phone-input .form-control::placeholder {
                    color: #9CA3AF !important;
                }
                .courier-owner-phone-input .flag-dropdown {
                    border: 1px solid #D1D5DB !important;
                    border-right: none !important;
                    border-radius: 8px 0 0 8px !important;
                    background: #FFFFFF !important;
                }
                .courier-owner-phone-input .selected-flag {
                    border-radius: 8px 0 0 8px !important;
                    background: #FFFFFF !important;
                }
                .courier-owner-phone-input .selected-flag:hover,
                .courier-owner-phone-input .selected-flag:focus {
                    background: #FFFFFF !important;
                }
            `}</style>

            <CourierFeedbackModal
                open={Boolean(feedback)}
                type={feedback?.type || "info"}
                message={feedback?.message || ""}
                passwordChangeRequired={Boolean(feedback?.passwordChangeRequired)}
                passwordChangeTargetUrl={feedback?.passwordChangeTargetUrl || ""}
                onConfirm={
                    typeof feedback?.message === "string" && feedback.message.toLowerCase().includes("please update your password before continuing")
                        ? () => { closeFeedback(); navigateProfileTab("security"); }
                        : undefined
                }
                onClose={closeFeedback}
            />

            <CourierFeedbackModal
                open={confirmState.open}
                type={confirmState.type || "warning"}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText || "Confirm"}
                showCancel={true}
                onConfirm={runConfirm}
                onClose={closeConfirm}
            />

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">{isTeamUser ? "My Courier Profile" : "Courier Profile"}</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        {isTeamUser
                            ? "Manage your personal profile details used in courier team workflows."
                            : "Manage business identity, compliance readiness, service enrollment, and account activity."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={activeTab === "security" ? saveSecurity : (activeTab === "owner" ? saveOwnerProfile : saveProfile)}
                    disabled={!isDirty || !editableTab}
                    className="h-[38px] px-5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50"
                >
                    {activeTab === "security" ? "Update Password" : (activeTab === "owner" ? "Save Owner Profile" : "Save Profile")}
                </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${isTeamUser ? "xl:grid-cols-1" : "xl:grid-cols-4"} gap-4 mb-5`}>
                {summaryCards.map((card) => (
                    <div key={card.key} className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <p className="text-[12px] text-[#6B7280] font-[600]">{card.label}</p>
                        <p className="text-[26px] leading-tight font-[700] mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-5">
                <div className="bg-white rounded-[10px] p-4 h-fit" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                    <p className="text-[12px] text-[#6B7280] font-[700] uppercase tracking-wide mb-3">{isTeamUser ? "My Profile" : "Profile Modules"}</p>
                    <div className="space-y-2">
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-left text-[13px] font-[700] transition-colors ${
                                        activeTab === tab.key
                                            ? "bg-[#0955AC] text-white"
                                            : "bg-[#F3F4F6] text-[#374151]"
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    {activeTab === "company" && (
                        <SectionCard title={isTeamUser ? "My Account Profile" : "Company and Contact Profile"} description={isTeamUser ? "Personal identity and contact details for your courier team account." : "Core identity and operational contacts used in courier workflows."}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 border border-[#E5E7EB] rounded-[8px] p-4 flex items-center gap-4">
                                    <div className="h-[72px] w-[72px] rounded-full bg-[#F3F4F6] overflow-hidden flex items-center justify-center text-[11px] text-[#6B7280]">
                                        {logoPreview ? <img src={logoPreview} alt={isTeamUser ? "Profile picture" : "Company logo"} className="h-full w-full object-cover" /> : (isTeamUser ? "No Photo" : "No Logo")}
                                    </div>
                                    <div>
                                        <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={onLogoChange} />
                                        <div className="flex gap-2">
                                            <button type="button" className="h-[34px] px-3 rounded-[8px] bg-[#0955AC] text-white text-[12px] font-[700]" onClick={() => logoInputRef.current?.click()}>
                                                {isTeamUser ? "Upload Profile Picture" : "Upload Logo"}
                                            </button>
                                            {logoPreview && (
                                                <button type="button" className="h-[34px] px-3 rounded-[8px] border border-[#DC2626] text-[#DC2626] text-[12px] font-[700]" onClick={removeLogo}>
                                                    {isTeamUser ? "Remove Picture" : "Remove Logo"}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[#6B7280] mt-1">{isTeamUser ? "JPG, PNG, WEBP profile picture up to 3MB." : "JPG, PNG, WEBP up to 3MB."}</p>
                                        <ErrorText>{clientErrors.logo || errors.logo}</ErrorText>
                                    </div>
                                </div>
                                <Field label={isTeamUser ? "Full Name" : "Company Name"}><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.companyName} onChange={(e) => { setForm((prev) => ({ ...prev, companyName: e.target.value })); setClientErrors((prev) => ({ ...prev, companyName: undefined })); }} /><ErrorText>{clientErrors.companyName || errors.companyName}</ErrorText></Field>
                                <Field label="Display Name"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.displayName} onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))} /></Field>
                                {!isTeamUser && <Field label="Business Registration No"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.businessRegistrationNo} onChange={(e) => setForm((prev) => ({ ...prev, businessRegistrationNo: e.target.value }))} /><ErrorText>{errors.businessRegistrationNo}</ErrorText></Field>}
                                {!isTeamUser && <Field label="Tax ID"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.taxId} onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))} /><ErrorText>{errors.taxId}</ErrorText></Field>}
                                <Field label="Contact Person"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.contactPerson} onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))} /></Field>
                                <Field label="Contact Email"><input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} /><ErrorText>{errors.contactEmail}</ErrorText></Field>
                                <Field label="Contact Phone"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.contactPhone} onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))} /><ErrorText>{errors.contactPhone}</ErrorText></Field>
                                <Field label="Website"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} /><ErrorText>{errors.website}</ErrorText></Field>
                                {!isTeamUser && <Field label="Support Email"><input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.supportEmail} onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))} /><ErrorText>{errors.supportEmail}</ErrorText></Field>}
                                {!isTeamUser && <Field label="Support Hotline"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.supportHotline} onChange={(e) => setForm((prev) => ({ ...prev, supportHotline: e.target.value }))} /><ErrorText>{errors.supportHotline}</ErrorText></Field>}
                                <Field label="Address Line 1"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.addressLine1} onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))} /></Field>
                                <Field label="Address Line 2"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.addressLine2} onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))} /></Field>
                                <Field label="City"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} /></Field>
                                <Field label="State"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} /></Field>
                                <Field label="Postal Code"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.postalCode} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} /><ErrorText>{errors.postalCode}</ErrorText></Field>
                                <Field label="Country"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} /></Field>
                                {!isTeamUser && <div className="md:col-span-2">
                                    <Field label="Public About"><textarea rows={3} className="w-full rounded-[8px] border border-[#D1D5DB]" value={form.publicAbout} onChange={(e) => setForm((prev) => ({ ...prev, publicAbout: e.target.value }))} /></Field>
                                </div>}
                                {!isTeamUser && <Field label="Public Support Hours"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.publicSupportHours} onChange={(e) => setForm((prev) => ({ ...prev, publicSupportHours: e.target.value }))} /></Field>}
                            </div>
                        </SectionCard>
                    )}

                    {activeTab === "owner" && !isTeamUser && (
                        <SectionCard title="Owner Profile" description="Personal account details for the owner. These fields are saved directly to the users table.">
                            <div className="mb-4 border border-[#E5E7EB] rounded-[8px] p-4 flex items-center gap-4">
                                <div className="h-[72px] w-[72px] rounded-full bg-[#F3F4F6] overflow-hidden flex items-center justify-center text-[11px] text-[#6B7280]">
                                    {ownerPhotoPreview ? <img src={ownerPhotoPreview} alt="Profile picture" className="h-full w-full object-cover" /> : "No Photo"}
                                </div>
                                <div>
                                    <input ref={ownerPhotoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={onOwnerPhotoChange} />
                                    <div className="flex gap-2">
                                        <button type="button" className="h-[34px] px-3 rounded-[8px] bg-[#0955AC] text-white text-[12px] font-[700]" onClick={() => ownerPhotoInputRef.current?.click()}>
                                            Upload Profile Picture
                                        </button>
                                        {ownerPhotoPreview && (
                                            <button type="button" className="h-[34px] px-3 rounded-[8px] border border-[#DC2626] text-[#DC2626] text-[12px] font-[700]" onClick={removeOwnerPhoto}>
                                                Remove Picture
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-[#6B7280] mt-1">JPG, PNG, WEBP profile picture up to 3MB.</p>
                                    <ErrorText>{clientErrors.ownerImage || errors.ownerImage}</ErrorText>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Name"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.ownerName} onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))} /><ErrorText>{errors.ownerName}</ErrorText></Field>
                                <Field label="Address"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.ownerAddress} onChange={(e) => setForm((prev) => ({ ...prev, ownerAddress: e.target.value }))} /><ErrorText>{errors.ownerAddress}</ErrorText></Field>
                                <Field label="Email"><input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.ownerEmail} onChange={(e) => setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))} /><ErrorText>{errors.ownerEmail}</ErrorText></Field>
                                <Field label="Phone">
                                    <PhoneInput
                                        country={'lk'}
                                        value={form.ownerPhone}
                                        onChange={(phone) => setForm((prev) => ({ ...prev, ownerPhone: phone }))}
                                        countryCodeEditable={false}
                                        containerClass="courier-owner-phone-input"
                                        inputClass="form-control"
                                        buttonClass="flag-dropdown"
                                        dropdownClass="text-gray-800 bg-white"
                                        searchClass="text-gray-800"
                                        preferredCountries={['lk', 'in', 'us', 'gb', 'ca', 'au']}
                                        enableSearch={true}
                                        placeholder="Enter your phone number"
                                    />
                                    <ErrorText>{errors.ownerPhone}</ErrorText>
                                </Field>
                                <Field label="Country"><input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={form.ownerCountry} onChange={(e) => setForm((prev) => ({ ...prev, ownerCountry: e.target.value }))} /><ErrorText>{errors.ownerCountry}</ErrorText></Field>
                            </div>
                        </SectionCard>
                    )}

                    {activeTab === "security" && (
                        <SectionCard title="Profile Security" description="Change your account password and keep your team access secure.">
                            <div
                                ref={stepUpGuidanceRef}
                                className={`border rounded-[8px] p-3 transition-all duration-300 ${stepUpGuidanceHighlight
                                    ? "border-[#0955AC] ring-2 ring-[#93C5FD] bg-[#EFF6FF]"
                                    : "border-[#E5E7EB] bg-[#F8FAFC]"
                                }`}
                            >
                                <p className="text-[13px] font-[700] text-[#111827] mb-1">Step-up Verification (Runtime)</p>
                                <p className="text-[11px] text-[#6B7280] mb-2">Risky actions are blocked until step-up is verified with password + one-time code.</p>
                                {stepUpGuidanceHighlight && (
                                    <p className="text-[11px] font-[700] text-[#0955AC] mb-2">Complete this verification now, then retry your previous action.</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <div className="relative">
                                        <input
                                            type={showStepUpPassword ? "text" : "password"}
                                            className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 pr-9 text-[12px]"
                                            placeholder="Current password"
                                            value={stepUpForm.currentPassword}
                                            onChange={(e) => setStepUpForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 text-[#6B7280] hover:text-[#111827]"
                                            onClick={() => setShowStepUpPassword((prev) => !prev)}
                                        >
                                            {showStepUpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="OTP code"
                                        value={stepUpForm.otpCode}
                                        onChange={(e) => setStepUpForm((prev) => ({ ...prev, otpCode: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className="h-[34px] rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                        onClick={confirmRequestStepUpCode}
                                    >
                                        Request OTP
                                    </button>
                                    <button
                                        type="button"
                                        className="h-[34px] rounded-[8px] bg-[#0955AC] text-white text-[11px] font-[700]"
                                        onClick={verifyStepUp}
                                    >
                                        Verify Step-up
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#475569]">
                                    <span>Step-up: {sessionSecurityStatus?.stepUpVerifiedAt || "Not verified"}</span>
                                    <span>2FA: {sessionSecurityStatus?.twoFactorVerifiedAt || "Not verified"}</span>
                                    <span>Anomaly Flag: {sessionSecurityStatus?.anomalyDetectedAt || "None"}</span>
                                    <button
                                        type="button"
                                        className="h-[28px] px-2 rounded-[6px] border border-[#D1D5DB] text-[10px] font-[700]"
                                        onClick={trustThisDevice}
                                    >
                                        Trust This Device
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    {(sessionSecurityStatus?.trustedDevices || []).map((device) => (
                                        <p key={`td-${device.id}`} className="text-[11px] text-[#6B7280]">
                                            {(device.label || "Trusted Device")} • Last IP: {(device.lastIpAddress || "-")} • Expires: {(device.expiresAt || "-")}
                                        </p>
                                    ))}
                                    {(!Array.isArray(sessionSecurityStatus?.trustedDevices) || sessionSecurityStatus.trustedDevices.length === 0) && (
                                        <p className="text-[11px] text-[#6B7280]">No trusted devices recorded for current actor.</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Current Password">
                                    <div className="relative">
                                        <input
                                            type={showPasswords.current ? "text" : "password"}
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB] pr-10"
                                            value={securityForm.current_password}
                                            onChange={(e) => setSecurityForm((prev) => ({ ...prev, current_password: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 text-[#6B7280] hover:text-[#111827]"
                                            onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                                        >
                                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <ErrorText>{errors.current_password}</ErrorText>
                                </Field>
                                <div />
                                <Field label="New Password">
                                    <div className="relative">
                                        <input
                                            type={showPasswords.next ? "text" : "password"}
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB] pr-10"
                                            value={securityForm.password}
                                            onChange={(e) => setSecurityForm((prev) => ({ ...prev, password: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 text-[#6B7280] hover:text-[#111827]"
                                            onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                                        >
                                            {showPasswords.next ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <ErrorText>{errors.password}</ErrorText>
                                    {passwordStrength.label && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="flex h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                                                {[...Array(4)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-full w-1/4 border-r border-white last:border-0 ${i < passwordStrength.score ? passwordStrength.color : "bg-transparent"} transition-all duration-300`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-[#6B7280] w-12 text-right font-medium">{passwordStrength.label}</span>
                                        </div>
                                    )}
                                </Field>
                                <Field label="Confirm New Password">
                                    <div className="relative">
                                        <input
                                            type={showPasswords.confirm ? "text" : "password"}
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB] pr-10"
                                            value={securityForm.password_confirmation}
                                            onChange={(e) => setSecurityForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 text-[#6B7280] hover:text-[#111827]"
                                            onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                                        >
                                            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <ErrorText>{errors.password_confirmation}</ErrorText>
                                </Field>
                            </div>
                        </SectionCard>
                    )}

                    {activeTab === "compliance" && (
                        <SectionCard title="Compliance and Verification" description="Current compliance status for vendor profile verification.">
                            <div className="space-y-3 text-[14px]">
                                <p><span className="font-[700]">Submission Status:</span> <span className={`ml-2 px-2 py-1 rounded-full text-[11px] font-[700] ${statusBadge(courierProfile.profile.status)}`}>{titleCase(courierProfile.profile.status)}</span></p>
                                <p><span className="font-[700]">Reviewed At:</span> {courierProfile.profile.reviewedAt || "-"}</p>
                                <p><span className="font-[700]">Admin Notes:</span> {courierProfile.profile.adminNotes || "No notes"}</p>
                            </div>
                        </SectionCard>
                    )}

                    {activeTab === "services" && (
                        <SectionCard title="Service Enrollment" description="All registered service sub-categories and their approval state.">
                            <div className="mb-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => router.visit(route("vendor.profile.step2"))}
                                    className="h-[36px] px-4 rounded-[8px] bg-[#16A34A] text-white text-[12px] font-[700] hover:bg-[#15803D] transition-colors"
                                >
                                    Register for new Service
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-[13px]">
                                    <thead className="bg-[#D8E4F2]">
                                        <tr>
                                            <th className="px-3 py-3 font-[700]">Service</th>
                                            <th className="px-3 py-3 font-[700]">Category</th>
                                            <th className="px-3 py-3 font-[700]">Status</th>
                                            <th className="px-3 py-3 font-[700]">Submitted</th>
                                            <th className="px-3 py-3 font-[700]">Reviewed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceRows.length > 0 ? serviceRows.map((row) => (
                                            <tr key={row.id} className="border-b border-[#E5E7EB]">
                                                <td className="px-3 py-3">{row.service || "-"}</td>
                                                <td className="px-3 py-3">{row.category || "-"}</td>
                                                <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-[700] ${statusBadge(row.status)}`}>{titleCase(row.status)}</span></td>
                                                <td className="px-3 py-3">{row.submittedAt || "-"}</td>
                                                <td className="px-3 py-3">{row.reviewedAt || "-"}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-8 text-center text-[#6B7280]">No service enrollment records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    {activeTab === "activity" && (
                        <SectionCard title="Recent Activity" description="Latest account-level activity records for this vendor.">
                            <div className="space-y-2">
                                {activityRows.length > 0 ? activityRows.map((item) => (
                                    <div key={item.id} className="border border-[#E5E7EB] rounded-[8px] px-3 py-3">
                                        <p className="text-[13px] font-[700]">{item.description}</p>
                                        <p className="text-[11px] text-[#6B7280] mt-1">{titleCase(item.action)} • {item.createdAt || "-"}</p>
                                    </div>
                                )) : (
                                    <p className="text-[13px] text-[#6B7280]">No recent activity records.</p>
                                )}
                            </div>
                        </SectionCard>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        {!editableTab && <p className="text-[12px] text-[#6B7280]">This tab is view-only.</p>}
                        <button
                            type="button"
                            onClick={activeTab === "security" ? saveSecurity : (activeTab === "owner" ? saveOwnerProfile : saveProfile)}
                            disabled={!isDirty || !editableTab || !isTabDirty}
                            className="h-[38px] px-5 rounded-[8px] bg-[#111827] text-white text-[13px] font-[700] disabled:opacity-50"
                        >
                            {activeTab === "security" ? "Update Password" : "Save Current Tab"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileContent;
