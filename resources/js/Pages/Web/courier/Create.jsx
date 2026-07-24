import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";
import bg from "../assets/courierService/bg.png";
import dimensionGuideIcon from "../assets/landingPages/box.svg";
import presetPalletOneImage from "../assets/courierService/size-pallet-1.svg";
import presetPalletTwoImage from "../assets/courierService/size-pallet-2.svg";
import presetMovingBoxImage from "../assets/courierService/size-moving-box.svg";
import DetailsForm from "./Details";
import SummaryView from "./Summary";
import {
    buildQuoteMatrix,
    buildReviewContext,
    computePackageMetrics,
    resolveDetailedQuotes,
} from "./courierPricing";

const COUNTRY_LOOKUP_DEBOUNCE_MS = 300;
const DOMESTIC_CITY_LOOKUP_DEBOUNCE_MS = 300;

const DOMESTIC_COUNTRY_CODE = "LK";
const DOMESTIC_COUNTRY_LABEL = "Sri Lanka";
const POSTAL_LOOKUP_DEBOUNCE_MS = 300;
const POSTAL_LOOKUP_MIN_CITY_LENGTH = 3;
const POSTAL_PREFIX_LOOKUP_MIN_LENGTH = 2;
const CITY_PREFIX_LOOKUP_MIN_LENGTH = 2;
const POSTAL_CITY_MISMATCH_MESSAGE = "The postal code you entered doesn't match our database. Please retry using a valid postal code.";

const OUNCES_PER_KILOGRAM = 35.27396195;
const CENTIMETERS_PER_YARD = 91.44;
const CENTIMETERS_PER_METER = 100;
const MILLIMETERS_PER_CENTIMETER = 10;
const DIMENSION_UNIT_FACTORS = {
    cm: 1,
    mm: MILLIMETERS_PER_CENTIMETER,
    m: 1 / CENTIMETERS_PER_METER,
    yd: 1 / CENTIMETERS_PER_YARD,
};
const SHIPMENT_TYPE_OPTIONS = [
    { value: "electronics", label: "Electronics" },
    { value: "documents", label: "Documents" },
    { value: "clothing", label: "Clothing" },
    { value: "medical", label: "Medical supplies" },
    { value: "perishable", label: "Perishable" },
    { value: "fragile", label: "Fragile" },
    { value: "other", label: "Other" },
];

const DOMESTIC_DIMENSION_ASSIST_PRESETS = [
    {
        id: "a4-envelope",
        label: "A4 Envelope",
        sizeLabel: "32 x 24 x 1 cm",
        lengthCm: 32,
        widthCm: 24,
        heightCm: 1,
        prefillHeight: true,
        imageSrc: dimensionGuideIcon,
        imageAlt: "A4 envelope size example",
    },
    {
        id: "books",
        label: "One or two books",
        sizeLabel: "23 x 14 x 4 cm",
        lengthCm: 23,
        widthCm: 14,
        heightCm: 4,
        prefillHeight: true,
        imageSrc: presetPalletOneImage,
        imageAlt: "Book parcel size example",
    },
    {
        id: "shoe-box",
        label: "Shoe box",
        sizeLabel: "35 x 20 x 15 cm",
        lengthCm: 35,
        widthCm: 20,
        heightCm: 15,
        prefillHeight: true,
        imageSrc: presetPalletTwoImage,
        imageAlt: "Shoe box size example",
    },
    {
        id: "moving-box",
        label: "Moving box",
        sizeLabel: "75 x 35 x 35 cm",
        lengthCm: 75,
        widthCm: 35,
        heightCm: 35,
        prefillHeight: true,
        imageSrc: presetMovingBoxImage,
        imageAlt: "Moving box size example",
    },
];

const INTERNATIONAL_DIMENSION_ASSIST_PRESETS = [
    {
        id: "pallet-1",
        label: "Pallet 1",
        sizeLabel: "120 x 80 cm",
        lengthCm: 120,
        widthCm: 80,
        heightCm: null,
        prefillHeight: false,
        imageSrc: presetPalletOneImage,
        imageAlt: "Pallet 1 size example",
    },
    {
        id: "pallet-2",
        label: "Pallet 2",
        sizeLabel: "120 x 100 cm",
        lengthCm: 120,
        widthCm: 100,
        heightCm: null,
        prefillHeight: false,
        imageSrc: presetPalletTwoImage,
        imageAlt: "Pallet 2 size example",
    },
    {
        id: "moving-box",
        label: "Moving box",
        sizeLabel: "75 x 35 x 35 cm",
        lengthCm: 75,
        widthCm: 35,
        heightCm: 35,
        prefillHeight: true,
        imageSrc: presetMovingBoxImage,
        imageAlt: "Moving box size example",
    },
];

const QUOTE_TIER_OPTIONS = [
    { id: "economy", label: "Economy", color: "text-emerald-700" },
    { id: "express", label: "Express", color: "text-blue-700" },
    { id: "priority", label: "Priority", color: "text-purple-700" },
];

const normalizeComparableValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeComparableValue(item));
    }

    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
                accumulator[key] = normalizeComparableValue(value[key]);
                return accumulator;
            }, {});
    }

    if (typeof value === "string") {
        return value.trim();
    }

    return value;
};

const buildSummaryStepDependencyFingerprint = (formData = {}) =>
    JSON.stringify(normalizeComparableValue(formData || {}));

const Create = ({ forcedRouteType = null, lockFlowToUrl = false, flowRouteOverrides = null }) => {
    const { props } = usePage();
    const packageTypes = props.packageTypes || [];
    const countries = props.countries || [];
    const quoteProviders = Array.isArray(props.quoteProviders) ? props.quoteProviders : [];
    const { flash } = props;
    const recentShipmentId = props.recentShipmentId;
    const recentPricingExplanation = props.recentPricingExplanation;
    const packageSectionDescription = "Use the quick calculator layout to set locations, weight, and dimensions.";
    const defaultDomesticFromCity = "";
    const defaultDomesticToCity = "";
    const normalizedForcedRouteType = forcedRouteType === "international"
        ? "international"
        : (forcedRouteType === "domestic" ? "domestic" : null);
    const pageBookingFlow = props.bookingFlow === "international"
        ? "international"
        : (props.bookingFlow === "domestic" ? "domestic" : null);
    const lockedBookingFlow = normalizedForcedRouteType || pageBookingFlow;
    const shouldLockRouteType = Boolean(lockFlowToUrl || lockedBookingFlow);
    const flowRoutesFromPage = props.flowRoutes && typeof props.flowRoutes === "object" ? props.flowRoutes : {};
    const flowRoutesOverride = flowRouteOverrides && typeof flowRouteOverrides === "object" ? flowRouteOverrides : {};

    const normalizePath = (value, fallback) => {
        const raw = typeof value === "string" ? value.trim() : "";
        if (!raw) {
            return fallback;
        }

        return raw.endsWith("/") ? raw.slice(0, -1) : raw;
    };

    const fallbackBasePath = `/couriers/${lockedBookingFlow || "domestic"}`;
    const flowBasePath = normalizePath(
        flowRoutesOverride.basePath || flowRoutesFromPage.basePath,
        fallbackBasePath,
    );
    const flowRoutes = {
        basePath: flowBasePath,
        create: flowRoutesOverride.create || flowRoutesFromPage.create || `${flowBasePath}/create`,
        review: flowRoutesOverride.review || flowRoutesFromPage.review || `${flowBasePath}/review`,
        details: flowRoutesOverride.details || flowRoutesFromPage.details || `${flowBasePath}/details`,
        detailsStore: flowRoutesOverride.detailsStore || flowRoutesFromPage.detailsStore || `${flowBasePath}/details`,
        summary: flowRoutesOverride.summary || flowRoutesFromPage.summary || `${flowBasePath}/summary`,
        countrySuggestions: flowRoutesOverride.countrySuggestions
            || flowRoutesFromPage.countrySuggestions
            || `${flowBasePath}/countries/suggestions`,
        postalByCity: flowRoutesOverride.postalByCity
            || flowRoutesFromPage.postalByCity
            || `${flowBasePath}/postal-codes/by-city`,
        cityByPostal: flowRoutesOverride.cityByPostal
            || flowRoutesFromPage.cityByPostal
            || `${flowBasePath}/cities/by-postal-code`,
        domesticCitySearch: flowRoutesOverride.domesticCitySearch
            || flowRoutesFromPage.domesticCitySearch
            || `${flowBasePath}/cities/search`,
        store: flowRoutesOverride.store || flowRoutesFromPage.store || `${flowBasePath}`,
        createByFlow: {
            domestic: flowRoutesOverride.createByFlow?.domestic
                || flowRoutesFromPage.createByFlow?.domestic
                || "/couriers/domestic/create",
            international: flowRoutesOverride.createByFlow?.international
                || flowRoutesFromPage.createByFlow?.international
                || "/couriers/international/create",
        },
    };

    const buildDefaultQuoteFilters = () => ({
        providerSearch: "",
        minPrice: "",
        maxPrice: "",
        tiers: QUOTE_TIER_OPTIONS.reduce((acc, tier) => ({
            ...acc,
            [tier.id]: true,
        }), {}),
    });

    const verifiedQuoteProviders = useMemo(() => {
        return quoteProviders.filter((provider) => {
            if (provider?.isVerified === true) {
                return true;
            }

            const providerStatus = String(provider?.status || provider?.vendorStatus || "").trim().toLowerCase();
            return providerStatus === "verified";
        });
    }, [quoteProviders]);

    // Currency conversion state
    const [displayCurrency, setDisplayCurrency] = useState('LKR');
    const USD_TO_LKR_RATE = 325; // Exchange rate (you can make this dynamic later)

    // Active package for courier selection
    const [activePackageIndex, setActivePackageIndex] = useState(0);
    const [revealedPackageDetails, setRevealedPackageDetails] = useState({});

    const [isPlacing, setIsPlacing] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [quoteOnlyMessage, setQuoteOnlyMessage] = useState("");
    const [serviceDetailsModal, setServiceDetailsModal] = useState(null);
    const [routeSwitchPrompt, setRouteSwitchPrompt] = useState(null);
    const [quoteFilters, setQuoteFilters] = useState(() => buildDefaultQuoteFilters());
    const [appliedQuoteFilters, setAppliedQuoteFilters] = useState(() => buildDefaultQuoteFilters());
    const [showQuotes, setShowQuotes] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [stepFlowNotice, setStepFlowNotice] = useState("");
    const quotesStepUpstreamVersionRef = useRef(0);
    const detailsStepUpstreamVersionRef = useRef(0);
    const summaryStepDependencyRef = useRef("");
    const upstreamChangeCounterRef = useRef(0);
    const [upstreamChangeVersion, setUpstreamChangeVersion] = useState(0);
    const quotesSectionRef = useRef(null);
    const quotesTableRef = useRef(null);
    const shipmentDimensionSectionRef = useRef(null);
    const shipmentSectionAutoScrollPendingRef = useRef(false);
    const detailsSectionRef = useRef(null);
    const summarySectionRef = useRef(null);

    const markUpstreamChange = () => {
        upstreamChangeCounterRef.current += 1;
        setUpstreamChangeVersion((previous) => previous + 1);
    };

    const buildEmptyForm = (routeType) => {
        const isDomestic = routeType !== "international";
        return {
            sender: {
                name: "",
                email: "",
                phone: "",
                company: "",
                address: {
                    line1: "",
                    line2: "",
                    city: isDomestic ? defaultDomesticFromCity : "",
                    state: "",
                    postalCode: "",
                    country: isDomestic ? DOMESTIC_COUNTRY_CODE : "",
                    instructions: "",
                },
            },
            recipient: {
                name: "",
                email: "",
                phone: "",
                company: "",
                address: {
                    line1: "",
                    line2: "",
                    city: isDomestic ? defaultDomesticToCity : "",
                    state: "",
                    postalCode: "",
                    country: isDomestic ? DOMESTIC_COUNTRY_CODE : "",
                    isResidential: false,
                    instructions: "",
                },
            },
            shipment: {
                pickupDate: "",
                pickupWindowStart: "",
                pickupWindowEnd: "",
                routeType: isDomestic ? "domestic" : "international",
                courierProvider: "",
                insurance: false,
                estimatedValue: "",
                paymentOptions: {
                    all: false,
                    cod: false,
                    card: !isDomestic,
                },
                containsDangerousGoods: false,
                containsExclusivelyDocuments: false,
                shipmentType: "",
                shipmentTypeDescription: "",
            },
            packages: [
                {
                    label: "",
                    packageType: packageTypes[0] || "parcel",
                    quantity: 1,
                    weightKg: "",
                    weightUnit: "kg",
                    lengthCm: "",
                    widthCm: "",
                    heightCm: "",
                    dimensionUnit: "cm",
                    nonStackable: false,
                    declaredValue: "",
                    description: "",
                    courierProvider: "",
                    serviceLevel: "",
                },
            ],
        };
    };

    const initialForm = buildEmptyForm(lockedBookingFlow || "domestic");
    const {
        data,
        setData,
        errors,
        post,
        processing,
        setError,
        clearErrors,
    } = useForm(initialForm);
    const [activeLocationField, setActiveLocationField] = useState(null);
    const [locationSearch, setLocationSearch] = useState({
        senderCity: initialForm.sender.address.city || "",
        recipientCity: initialForm.recipient.address.city || "",
        senderCountry: initialForm.sender.address.country || "",
        recipientCountry: initialForm.recipient.address.country || "",
    });
    const [postalLookupOptions, setPostalLookupOptions] = useState({
        sender: [],
        recipient: [],
    });
    const [postalLookupState, setPostalLookupState] = useState({
        sender: { loading: false, error: "" },
        recipient: { loading: false, error: "" },
    });
    const [postalCityNotice, setPostalCityNotice] = useState({
        sender: "",
        recipient: "",
    });
    const postalLookupAbortRef = useRef({
        sender: null,
        recipient: null,
    });
    const [cityLookupState, setCityLookupState] = useState({
        sender: { loading: false, error: "" },
        recipient: { loading: false, error: "" },
    });
    const [postalCitySuggestions, setPostalCitySuggestions] = useState({
        sender: [],
        recipient: [],
    });
    const [domesticCitySuggestions, setDomesticCitySuggestions] = useState({
        sender: [],
        recipient: [],
    });
    const [domesticCityLoading, setDomesticCityLoading] = useState({
        sender: false,
        recipient: false,
    });
    const domesticCityAbortRef = useRef({
        sender: null,
        recipient: null,
    });
    const domesticCityTimerRef = useRef({
        sender: null,
        recipient: null,
    });
    const cityLookupAbortRef = useRef({
        sender: null,
        recipient: null,
    });
    const [countryLookupOptions, setCountryLookupOptions] = useState({
        sender: [],
        recipient: [],
    });
    const [countryLookupState, setCountryLookupState] = useState({
        sender: { loading: false, error: "" },
        recipient: { loading: false, error: "" },
    });
    const countryLookupAbortRef = useRef({
        sender: null,
        recipient: null,
    });

    const POLICY_ADJUSTMENT_LABELS = {
        remote_area_surcharge: "Remote area surcharge",
        overweight_surcharge: "Overweight surcharge",
        oversize_surcharge: "Oversize surcharge",
        holiday_surcharge: "Holiday surcharge",
        peak_hour_surcharge: "Peak-hour surcharge",
        cod_fee: "COD fee",
        minimum_shipment_guardrail: "Minimum shipment guardrail",
        speed_eta_tier_multiplier: "Speed/ETA tier multiplier",
        international_dimensions_engine: "International dimensions engine",
        quote_runtime_discount_applied: "Quote runtime discount applied",
        quote_runtime_discount_ceiling_guardrail: "Quote runtime discount ceiling guardrail",
        quote_runtime_floor_price_guardrail: "Quote runtime floor-price guardrail",
    };

    const formatPolicyAdjustmentLabel = (key) => {
        const normalizedKey = String(key || "").trim();
        if (!normalizedKey) {
            return "Policy adjustment";
        }

        return POLICY_ADJUSTMENT_LABELS[normalizedKey]
            || normalizedKey.replaceAll("_", " ");
    };

    const updatePackage = (index, field, value) => {
        const nextPackages = data.packages.map((item, idx) =>
            idx === index
                ? {
                    ...item,
                    [field]: value,
                }
                : item
        );
        markUpstreamChange();
        setData("packages", nextPackages);
    };

    const applyDimensionPreset = (index, preset) => {
        if (!preset) {
            return;
        }

        const nextPackages = data.packages.map((item, idx) => (
            idx === index
                ? {
                    ...item,
                    lengthCm: String(preset.lengthCm),
                    widthCm: String(preset.widthCm),
                    heightCm: preset.prefillHeight ? String(preset.heightCm) : "",
                }
                : item
        ));

        markUpstreamChange();
        setData("packages", nextPackages);
    };

    const updateAddressCountry = (party, countryCode) => {
        const currentParty = party === "recipient" ? data.recipient : data.sender;

        markUpstreamChange();
        setData(party, {
            ...currentParty,
            address: {
                ...currentParty.address,
                country: countryCode,
            },
        });

        setPostalMismatchNotice(party, false);
    };

    const fetchDomesticCitySuggestions = (party, query) => {
        const normalized = String(query || "").trim();

        // Clear any pending timer
        if (domesticCityTimerRef.current[party]) {
            clearTimeout(domesticCityTimerRef.current[party]);
            domesticCityTimerRef.current[party] = null;
        }

        // Abort any in-flight request
        if (domesticCityAbortRef.current[party]) {
            domesticCityAbortRef.current[party].abort();
            domesticCityAbortRef.current[party] = null;
        }

        if (normalized.length < 1) {
            setDomesticCitySuggestions((prev) => ({ ...prev, [party]: [] }));
            setDomesticCityLoading((prev) => ({ ...prev, [party]: false }));
            return;
        }

        setDomesticCityLoading((prev) => ({ ...prev, [party]: true }));

        domesticCityTimerRef.current[party] = setTimeout(async () => {
            const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            if (controller) {
                domesticCityAbortRef.current[party] = controller;
            }

            try {
                const params = new URLSearchParams({ q: normalized, limit: "20" });
                const response = await fetch(
                    `${flowRoutes.domesticCitySearch}?${params.toString()}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                        credentials: "same-origin",
                        signal: controller?.signal,
                    }
                );

                if (!response.ok) {
                    setDomesticCitySuggestions((prev) => ({ ...prev, [party]: [] }));
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                const cities = Array.isArray(payload?.cities)
                    ? payload.cities.map((c) => ({
                        value: String(c.nameEn || ""),
                        label: String(c.displayName || c.nameEn || ""),
                        postcode: c.postcode || null,
                    }))
                    : [];

                setDomesticCitySuggestions((prev) => ({ ...prev, [party]: cities }));
            } catch (error) {
                if (error?.name === "AbortError") {
                    return;
                }
                setDomesticCitySuggestions((prev) => ({ ...prev, [party]: [] }));
            } finally {
                if (domesticCityAbortRef.current[party] === controller) {
                    domesticCityAbortRef.current[party] = null;
                }
                setDomesticCityLoading((prev) => ({ ...prev, [party]: false }));
            }
        }, DOMESTIC_CITY_LOOKUP_DEBOUNCE_MS);
    };

    const countryOptions = useMemo(() => {
        const fallbackOptions = Array.isArray(countries)
            ? countries
                .map((code) => {
                    const normalizedCode = String(code || "").trim().toUpperCase();

                    if (!normalizedCode) {
                        return null;
                    }

                    return {
                        value: normalizedCode,
                        label: normalizedCode,
                    };
                })
                .filter(Boolean)
            : [];

        const combinedOptions = [
            ...(Array.isArray(countryLookupOptions.sender) ? countryLookupOptions.sender : []),
            ...(Array.isArray(countryLookupOptions.recipient) ? countryLookupOptions.recipient : []),
            ...fallbackOptions,
        ];

        const seen = new Set();

        return combinedOptions.filter((option) => {
            const value = String(option?.value || "").trim().toUpperCase();
            const label = String(option?.label || "").trim();

            if (!value || !label || seen.has(value)) {
                return false;
            }

            seen.add(value);
            return true;
        });
    }, [countryLookupOptions.sender, countryLookupOptions.recipient, countries]);

    const getCountryOptionsForParty = (party) => {
        const partyOptions = countryLookupOptions[party];
        if (Array.isArray(partyOptions) && partyOptions.length > 0) {
            return partyOptions;
        }

        return countryOptions;
    };

    const stripCountryCodeSuffix = (label) =>
        String(label || "").replace(/\s*\([A-Z]{2}\)\s*$/i, "").trim();

    const filterLocationOptions = (options, query) => {
        const normalized = String(query || "").trim().toLowerCase();
        if (!normalized) {
            return options;
        }

        return options.filter((option) => {
            const label = String(option.label || "").toLowerCase();
            const value = String(option.value || "").toLowerCase();
            const stripped = stripCountryCodeSuffix(option.label || "").toLowerCase();
            return label.includes(normalized) || value.includes(normalized) || stripped.includes(normalized);
        });
    };

    const matchLocationOption = (options, query) => {
        const normalized = String(query || "").trim().toLowerCase();
        if (!normalized) {
            return null;
        }

        return options.find((option) => {
            const label = String(option.label || "").toLowerCase();
            const value = String(option.value || "").toLowerCase();
            const stripped = stripCountryCodeSuffix(option.label || "").toLowerCase();
            return label === normalized || value === normalized || stripped === normalized;
        }) || null;
    };

    const handleLocationInputBlur = (fieldKey) => {
        window.setTimeout(() => {
            setActiveLocationField((current) => (current === fieldKey ? null : current));
        }, 120);
    };

    const updateAddressCity = (party, cityName) => {
        const currentParty = party === "recipient" ? data.recipient : data.sender;

        markUpstreamChange();
        setData(party, {
            ...currentParty,
            address: {
                ...currentParty.address,
                city: cityName,
                country: selectedRouteType === "domestic"
                    ? DOMESTIC_COUNTRY_CODE
                    : currentParty.address.country,
            },
        });
    };

    const updateAddressPostalCode = (party, postalCode) => {
        const currentParty = party === "recipient" ? data.recipient : data.sender;

        markUpstreamChange();
        setData(party, {
            ...currentParty,
            address: {
                ...currentParty.address,
                postalCode,
            },
        });

        setPostalCityNotice((previous) => ({
            ...previous,
            [party]: "",
        }));
    };

    const updateAddressResidential = (party, isResidential) => {
        const currentParty = party === "recipient" ? data.recipient : data.sender;

        markUpstreamChange();
        setData(party, {
            ...currentParty,
            address: {
                ...currentParty.address,
                isResidential,
            },
        });
    };

    const setPostalMismatchNotice = (party, shouldShow) => {
        setPostalCityNotice((previous) => ({
            ...previous,
            [party]: shouldShow ? POSTAL_CITY_MISMATCH_MESSAGE : "",
        }));
    };

    const filterPostalCitySuggestions = (suggestions, query) => {
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            return [];
        }

        const normalized = String(query || "").trim().toLowerCase();
        if (!normalized) {
            return suggestions;
        }

        return suggestions.filter((suggestion) => {
            const city = String(suggestion?.city || "").toLowerCase();
            const postalCode = String(suggestion?.postalCode || "").toLowerCase();
            return city.includes(normalized) || postalCode.includes(normalized);
        });
    };

    const normalizePostalCodeSuggestions = (codes) => {
        if (!Array.isArray(codes)) {
            return [];
        }

        return Array.from(new Set(
            codes
                .map((code) => String(code || "").trim())
                .filter(Boolean)
        )).slice(0, 100);
    };

    const normalizeCountrySuggestions = (suggestions) => {
        if (!Array.isArray(suggestions)) {
            return [];
        }

        const normalized = suggestions
            .map((item) => {
                const value = String(item?.code || item?.value || "").trim().toUpperCase();
                const label = String(item?.name || item?.label || "").trim();

                if (!value || !label) {
                    return null;
                }

                return {
                    value,
                    label,
                };
            })
            .filter(Boolean);

        const seen = new Set();

        return normalized.filter((option) => {
            if (seen.has(option.value)) {
                return false;
            }

            seen.add(option.value);
            return true;
        });
    };

    const clearCountryLookupForParty = (party) => {
        setCountryLookupOptions((previous) => ({
            ...previous,
            [party]: [],
        }));
        setCountryLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: false,
                error: "",
            },
        }));
    };

    const abortCountryLookupForParty = (party) => {
        const controller = countryLookupAbortRef.current[party];
        if (controller) {
            controller.abort();
            countryLookupAbortRef.current[party] = null;
        }
    };

    const lookupCountrySuggestions = async (party, query, routeType = "domestic") => {
        const normalizedQuery = String(query || "").trim();

        if (routeType !== "international") {
            abortCountryLookupForParty(party);
            clearCountryLookupForParty(party);
            return;
        }

        abortCountryLookupForParty(party);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (controller) {
            countryLookupAbortRef.current[party] = controller;
        }

        setCountryLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: true,
                error: "",
            },
        }));

        try {
            const params = new URLSearchParams({
                limit: "20",
            });

            if (normalizedQuery) {
                params.set("query", normalizedQuery);
            }

            const response = await fetch(`${flowRoutes.countrySuggestions}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                signal: controller?.signal,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message = typeof payload?.message === "string" && payload.message.trim() !== ""
                    ? payload.message
                    : "Unable to fetch countries right now.";

                throw new Error(message);
            }

            const payload = await response.json().catch(() => ({}));
            const suggestions = normalizeCountrySuggestions(payload?.suggestions);

            setCountryLookupOptions((previous) => ({
                ...previous,
                [party]: suggestions,
            }));
            setCountryLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: "",
                },
            }));
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            const errorMessage = typeof error?.message === "string" && error.message.trim() !== ""
                ? error.message
                : "Unable to fetch countries right now.";

            setCountryLookupOptions((previous) => ({
                ...previous,
                [party]: [],
            }));
            setCountryLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: errorMessage,
                },
            }));
        } finally {
            if (countryLookupAbortRef.current[party] === controller) {
                countryLookupAbortRef.current[party] = null;
            }
        }
    };

    const clearPostalLookupForParty = (party) => {
        setPostalLookupOptions((previous) => ({
            ...previous,
            [party]: [],
        }));
        setPostalLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: false,
                error: "",
            },
        }));
    };

    const abortPostalLookupForParty = (party) => {
        const controller = postalLookupAbortRef.current[party];
        if (controller) {
            controller.abort();
            postalLookupAbortRef.current[party] = null;
        }
    };

    const lookupInternationalPostalCodes = async (party, city, country, state = "", routeType = "domestic") => {
        const normalizedCity = String(city || "").trim();
        const normalizedCountry = String(country || "").trim().toUpperCase();
        const normalizedState = String(state || "").trim();

        if (
            routeType !== "international"
            || normalizedCity.length < POSTAL_LOOKUP_MIN_CITY_LENGTH
            || normalizedCountry.length !== 2
        ) {
            abortPostalLookupForParty(party);
            clearPostalLookupForParty(party);
            return;
        }

        abortPostalLookupForParty(party);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (controller) {
            postalLookupAbortRef.current[party] = controller;
        }

        setPostalLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: true,
                error: "",
            },
        }));

        try {
            const params = new URLSearchParams({
                city: normalizedCity,
                country: normalizedCountry,
                routeType: "international",
                limit: "15",
            });

            if (normalizedState) {
                params.set("state", normalizedState);
            }

            const response = await fetch(`${flowRoutes.postalByCity}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                signal: controller?.signal,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message = typeof payload?.message === "string" && payload.message.trim() !== ""
                    ? payload.message
                    : "Unable to fetch postal codes for this city.";
                throw new Error(message);
            }

            const payload = await response.json().catch(() => ({}));
            const suggestions = normalizePostalCodeSuggestions(payload?.postalCodes);

            setPostalLookupOptions((previous) => ({
                ...previous,
                [party]: suggestions,
            }));
            setPostalLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: "",
                },
            }));
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            const errorMessage = typeof error?.message === "string" && error.message.trim() !== ""
                ? error.message
                : "Unable to fetch postal codes for this city.";

            setPostalLookupOptions((previous) => ({
                ...previous,
                [party]: [],
            }));
            setPostalLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: errorMessage,
                },
            }));
        } finally {
            if (postalLookupAbortRef.current[party] === controller) {
                postalLookupAbortRef.current[party] = null;
            }
        }
    };

    const clearCityLookupForParty = (party) => {
        setPostalCitySuggestions((previous) => ({
            ...previous,
            [party]: [],
        }));
        setPostalMismatchNotice(party, false);
        setCityLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: false,
                error: "",
            },
        }));
    };

    const abortCityLookupForParty = (party) => {
        const controller = cityLookupAbortRef.current[party];
        if (controller) {
            controller.abort();
            cityLookupAbortRef.current[party] = null;
        }
    };

    const lookupInternationalCityByPostalCode = async (party, postalCode, country, routeType = "domestic") => {
        const normalizedPostalCode = String(postalCode || "").trim();
        const normalizedCountry = String(country || "").trim().toUpperCase();

        if (routeType !== "international") {
            abortCityLookupForParty(party);
            clearCityLookupForParty(party);
            return;
        }

        if (!normalizedPostalCode) {
            abortCityLookupForParty(party);
            clearCityLookupForParty(party);
            return;
        }

        if (normalizedPostalCode.length < POSTAL_PREFIX_LOOKUP_MIN_LENGTH) {
            abortCityLookupForParty(party);
            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: [],
            }));
            setCityLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: "",
                },
            }));
            return;
        }

        if (normalizedCountry.length !== 2) {
            abortCityLookupForParty(party);
            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: [],
            }));
            setCityLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: "Select country first.",
                },
            }));
            return;
        }

        abortCityLookupForParty(party);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (controller) {
            cityLookupAbortRef.current[party] = controller;
        }

        setCityLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: true,
                error: "",
            },
        }));

        try {
            const params = new URLSearchParams({
                postalCode: normalizedPostalCode,
                country: normalizedCountry,
                routeType: "international",
                limit: "20",
            });

            const response = await fetch(`${flowRoutes.cityByPostal}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                signal: controller?.signal,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message = typeof payload?.message === "string" && payload.message.trim() !== ""
                    ? payload.message
                    : "Unable to fetch city for this postal code.";
                throw new Error(message);
            }

            const payload = await response.json().catch(() => ({}));
            const suggestions = Array.isArray(payload?.suggestions)
                ? payload.suggestions
                    .map((item) => ({
                        postalCode: String(item?.postalCode || "").trim(),
                        city: String(item?.city || "").trim(),
                    }))
                    .filter((item) => item.postalCode && item.city)
                : [];
            const city = typeof payload?.city === "string" ? payload.city.trim() : "";

            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: suggestions,
            }));

            if (city) {
                setPostalMismatchNotice(party, false);

                updateAddressCity(party, city);
                setCityLookupState((previous) => ({
                    ...previous,
                    [party]: {
                        loading: false,
                        error: "",
                    },
                }));
                return;
            }

            if (suggestions.length > 0) {
                updateAddressCity(party, "");
                setPostalMismatchNotice(party, false);
                setCityLookupState((previous) => ({
                    ...previous,
                    [party]: {
                        loading: false,
                        error: "",
                    },
                }));
                return;
            }

            updateAddressCity(party, "");
            setPostalMismatchNotice(party, true);
            setCityLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: "",
                },
            }));
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            const errorMessage = typeof error?.message === "string" && error.message.trim() !== ""
                ? error.message
                : "Unable to fetch city for this postal code.";

            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: [],
            }));

            setCityLookupState((previous) => ({
                ...previous,
                [party]: {
                    loading: false,
                    error: errorMessage,
                },
            }));
        } finally {
            if (cityLookupAbortRef.current[party] === controller) {
                cityLookupAbortRef.current[party] = null;
            }
        }
    };

    const lookupInternationalPostalCitySuggestionsByCity = async (party, city, country, routeType = "domestic") => {
        const normalizedCity = String(city || "").trim();
        const normalizedCountry = String(country || "").trim().toUpperCase();

        if (routeType !== "international") {
            return;
        }

        if (normalizedCity.length < CITY_PREFIX_LOOKUP_MIN_LENGTH || normalizedCountry.length !== 2) {
            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: [],
            }));
            return;
        }

        abortCityLookupForParty(party);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (controller) {
            cityLookupAbortRef.current[party] = controller;
        }

        try {
            const params = new URLSearchParams({
                city: normalizedCity,
                country: normalizedCountry,
                routeType: "international",
                limit: "20",
            });

            const response = await fetch(`${flowRoutes.cityByPostal}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                signal: controller?.signal,
            });

            if (!response.ok) {
                setPostalCitySuggestions((previous) => ({
                    ...previous,
                    [party]: [],
                }));
                return;
            }

            const payload = await response.json().catch(() => ({}));
            const suggestions = Array.isArray(payload?.suggestions)
                ? payload.suggestions
                    .map((item) => ({
                        postalCode: String(item?.postalCode || "").trim(),
                        city: String(item?.city || "").trim(),
                    }))
                    .filter((item) => item.postalCode && item.city)
                : [];

            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: suggestions,
            }));
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            setPostalCitySuggestions((previous) => ({
                ...previous,
                [party]: [],
            }));
        } finally {
            if (cityLookupAbortRef.current[party] === controller) {
                cityLookupAbortRef.current[party] = null;
            }
        }
    };

    const handlePostalSuggestionSelect = (party, fieldKey, suggestion) => {
        if (!suggestion || !suggestion.postalCode) {
            return;
        }

        const currentParty = party === "recipient" ? data.recipient : data.sender;
        const nextPostalCode = String(suggestion.postalCode || "").trim();
        const nextCity = String(suggestion.city || currentParty?.address?.city || "").trim();

        setData(party, {
            ...currentParty,
            address: {
                ...currentParty.address,
                postalCode: nextPostalCode,
                city: nextCity,
            },
        });

        setPostalMismatchNotice(party, false);

        setCityLookupState((previous) => ({
            ...previous,
            [party]: {
                loading: false,
                error: "",
            },
        }));
        setActiveLocationField((current) => (current === fieldKey ? null : current));
    };

    const handleCitySearchChange = (party, fieldKey, value) => {
        setLocationSearch((previous) => ({
            ...previous,
            [fieldKey]: value,
        }));
        updateAddressCity(party, value);

        if (selectedRouteType === "domestic") {
            fetchDomesticCitySuggestions(party, value);
        }
    };

    const handleCountrySearchChange = (party, fieldKey, value) => {
        setLocationSearch((previous) => ({
            ...previous,
            [fieldKey]: value,
        }));

        const partyOptions = getCountryOptionsForParty(party);
        const match = matchLocationOption(partyOptions, value) || matchLocationOption(countryOptions, value);
        updateAddressCountry(party, match ? match.value : "");
    };

    const handleLocationSelect = (party, fieldKey, option, type) => {
        if (!option) {
            return;
        }

        if (type === "city") {
            updateAddressCity(party, option.value);
            setLocationSearch((previous) => ({
                ...previous,
                [fieldKey]: option.label,
            }));
        } else {
            updateAddressCountry(party, option.value);
            setLocationSearch((previous) => ({
                ...previous,
                [fieldKey]: option.label,
            }));
        }

        setActiveLocationField(null);
    };

    const resetForRouteType = (nextRouteType) => {
        const nextForm = buildEmptyForm(nextRouteType);
        setData(nextForm);
        setRevealedPackageDetails({});
        setLocationSearch({
            senderCity: nextForm.sender.address.city || "",
            recipientCity: nextForm.recipient.address.city || "",
            senderCountry: nextForm.sender.address.country || "",
            recipientCountry: nextForm.recipient.address.country || "",
        });
        setActiveLocationField(null);
        setActivePackageIndex(0);
        setDisplayCurrency("LKR");
        setServiceDetailsModal(null);
        setIsPlacing(false);
        setShowQuotes(false);
        setShowDetails(false);
        setShowSummary(false);
        setIsSummaryLoading(false);
        setStepFlowNotice("");
        quotesStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        detailsStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        summaryStepDependencyRef.current = "";
        ["sender", "recipient"].forEach((party) => {
            abortPostalLookupForParty(party);
            clearPostalLookupForParty(party);
            abortCityLookupForParty(party);
            clearCityLookupForParty(party);
            abortCountryLookupForParty(party);
            clearCountryLookupForParty(party);
        });
        clearErrors();
    };

    const handleConfirmRouteSwitch = () => {
        if (!routeSwitchPrompt?.nextRouteType) {
            setRouteSwitchPrompt(null);
            return;
        }

        const nextRouteType = routeSwitchPrompt.nextRouteType;
        const targetCreateUrl = routeSwitchPrompt.targetCreateUrl;
        setRouteSwitchPrompt(null);

        if (targetCreateUrl) {
            if (typeof window !== "undefined") {
                window.location.assign(targetCreateUrl);
            }
            return;
        }

        resetForRouteType(nextRouteType);
    };

    const handleCancelRouteSwitch = () => {
        setRouteSwitchPrompt(null);
    };

    const handleRouteTypeChange = (routeType) => {
        const nextRouteType = routeType === "international" ? "international" : "domestic";
        const targetCreateUrl = flowRoutes.createByFlow[nextRouteType] || `/couriers/${nextRouteType}/create`;

        if (nextRouteType === selectedRouteType) {
            return;
        }

        const baseline = buildEmptyForm(selectedRouteType);
        const hasRouteInput = JSON.stringify(data) !== JSON.stringify(baseline);

        if (shouldLockRouteType) {
            if (hasRouteInput) {
                setRouteSwitchPrompt({
                    nextRouteType,
                    targetCreateUrl,
                });
                return;
            }

            if (typeof window !== "undefined") {
                window.location.assign(targetCreateUrl);
            }
            return;
        }

        if (hasRouteInput) {
            setRouteSwitchPrompt({
                nextRouteType,
                targetCreateUrl,
            });
            return;
        }

        if (typeof window !== "undefined") {
            window.location.assign(targetCreateUrl);
            return;
        }

        resetForRouteType(nextRouteType);
    };

    const handleShipmentTypeChange = (value) => {
        markUpstreamChange();
        setData("shipment", {
            ...data.shipment,
            shipmentType: value,
            shipmentTypeDescription: value === "other" ? (data.shipment.shipmentTypeDescription || "") : "",
        });
    };

    const updateShipmentPreference = (key, value) => {
        markUpstreamChange();
        setData("shipment", {
            ...data.shipment,
            [key]: value,
        });
    };

    const updatePaymentOptions = (optionKey, checked) => {
        const currentOptions = data.shipment?.paymentOptions || { all: false, cod: false, card: false };
        let nextOptions = { ...currentOptions };

        if (optionKey === "all") {
            nextOptions = {
                all: checked,
                cod: checked,
                card: checked,
            };
        } else {
            nextOptions[optionKey] = checked;
            nextOptions.all = nextOptions.cod && nextOptions.card;
        }

        markUpstreamChange();
        setData("shipment", {
            ...data.shipment,
            paymentOptions: nextOptions,
        });
    };

    const updatePackageQuantity = (index, delta) => {
        const currentQuantity = Math.max(1, Number(data.packages[index]?.quantity) || 1);
        const nextQuantity = Math.max(1, currentQuantity + delta);
        updatePackage(index, "quantity", nextQuantity);
    };

    const toDisplayValue = (rawValue, factor = 1, decimalPlaces = 2) => {
        if (rawValue === "" || rawValue === null || rawValue === undefined) {
            return "";
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            return "";
        }

        return Number((numericValue * factor).toFixed(decimalPlaces)).toString();
    };

    const toBaseValue = (rawValue, factor = 1, decimalPlaces = 4) => {
        if (rawValue === "") {
            return "";
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
            return "";
        }

        return Number((numericValue / factor).toFixed(decimalPlaces)).toString();
    };

    const hasValue = (value) => String(value || "").trim().length > 0;

    const addPackage = () => {
        const nextPackageIndex = data.packages.length;
        const isInternationalRoute = data.shipment?.routeType === "international";
        const shouldRevealNewPackageDetails = isInternationalRoute
            && data.packages.every((_, packageIndex) => Boolean(revealedPackageDetails[packageIndex]));

        markUpstreamChange();
        setData("packages", [
            ...data.packages,
            {
                label: "",
                packageType: packageTypes[0] || "parcel",
                quantity: 1,
                weightKg: "",
                weightUnit: "kg",
                lengthCm: "",
                widthCm: "",
                heightCm: "",
                dimensionUnit: "cm",
                nonStackable: false,
                declaredValue: "",
                description: "",
                courierProvider: "",
                serviceLevel: "",
            },
        ]);

        if (shouldRevealNewPackageDetails) {
            setRevealedPackageDetails((previous) => ({
                ...previous,
                [nextPackageIndex]: true,
            }));
        }
    };

    const removePackage = (index) => {
        if (data.packages.length === 1) {
            return;
        }

        setRevealedPackageDetails((previous) => {
            const next = {};

            Object.entries(previous).forEach(([key, isVisible]) => {
                const parsedIndex = Number(key);

                if (!isVisible || Number.isNaN(parsedIndex) || parsedIndex === index) {
                    return;
                }

                const shiftedIndex = parsedIndex > index ? parsedIndex - 1 : parsedIndex;
                next[shiftedIndex] = true;
            });

            return next;
        });

        markUpstreamChange();
        setData(
            "packages",
            data.packages.filter((_, idx) => idx !== index)
        );
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        triggerEligibleContinueAction(event?.target?.ownerDocument?.activeElement);
    };

    const selectedRouteType = data.shipment?.routeType === "international" ? "international" : "domestic";
    const paymentOptions = data.shipment?.paymentOptions || { all: false, cod: false, card: false };
    const hasPaymentOption = Boolean(paymentOptions.all || paymentOptions.cod || paymentOptions.card);
    const hasLocationDetailsForDescribe = selectedRouteType !== "international"
        || (
            hasValue(data.sender?.address?.country)
            && hasValue(data.sender?.address?.city)
            && hasValue(data.sender?.address?.postalCode)
            && hasValue(data.recipient?.address?.country)
            && hasValue(data.recipient?.address?.city)
            && hasValue(data.recipient?.address?.postalCode)
        );
    const areAllPackageDetailsRevealed = data.packages.every((_, packageIndex) => Boolean(revealedPackageDetails[packageIndex]));
    const shouldShowShipmentDetailsSection = selectedRouteType !== "international"
        || areAllPackageDetailsRevealed;
    const shouldShowDescribeShipmentCta = selectedRouteType === "international"
        && !shouldShowShipmentDetailsSection;

    const triggerEligibleContinueAction = (activeElement = null) => {
        const activeTag = String(activeElement?.tagName || "").toLowerCase();
        const inputType = String(activeElement?.type || "").toLowerCase();
        const isTypingInTextarea = activeTag === "textarea";
        const isTypingInSelect = activeTag === "select";
        const isContentEditable = Boolean(activeElement?.isContentEditable);
        const isButtonLike = activeTag === "button" || activeTag === "a";
        const isNonTextInput = activeTag === "input" && ["checkbox", "radio", "file"].includes(inputType);
        if (isTypingInTextarea || isTypingInSelect || isContentEditable || isButtonLike || isNonTextInput) {
            return false;
        }

        if (showDetails && !showSummary && !isSummaryLoading) {
            handleContinueToSummary();
            return true;
        }

        if (shouldShowDescribeShipmentCta) {
            if (hasLocationDetailsForDescribe) {
                revealShipmentDetailsSection();
                return true;
            }
            return false;
        }

        if (!showQuotes) {
            if (hasRequiredDetails && !isPlacing) {
                handleContinueToQuotes();
                return true;
            }
            return false;
        }

        if (isReadyToPlace && !isPlacing) {
            handleContinueToDetails();
            return true;
        }
        return false;
    };

    const handleFormKeyDown = (event) => {
        if (event.key !== "Enter" || event.defaultPrevented || event.shiftKey || event.isComposing) {
            return;
        }

        const activeElement = event?.target;
        const activeTag = String(activeElement?.tagName || "").toLowerCase();
        const isTypingInTextarea = activeTag === "textarea";
        const isTypingInSelect = activeTag === "select";
        const isContentEditable = Boolean(activeElement?.isContentEditable);
        if (isTypingInTextarea || isTypingInSelect || isContentEditable) {
            return;
        }

        event.preventDefault();
        triggerEligibleContinueAction(activeElement);
    };

    const revealShipmentDetailsSection = () => {
        const nextVisibleState = {};
        data.packages.forEach((_, packageIndex) => {
            nextVisibleState[packageIndex] = true;
        });
        shipmentSectionAutoScrollPendingRef.current = true;
        setRevealedPackageDetails(nextVisibleState);
    };

    useEffect(() => {
        if (!shipmentSectionAutoScrollPendingRef.current || !shouldShowShipmentDetailsSection || typeof window === "undefined") {
            return undefined;
        }

        let secondFrameId = null;
        const firstFrameId = window.requestAnimationFrame(() => {
            secondFrameId = window.requestAnimationFrame(() => {
                const target = shipmentDimensionSectionRef.current;
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                shipmentSectionAutoScrollPendingRef.current = false;
            });
        });

        return () => {
            window.cancelAnimationFrame(firstFrameId);
            if (secondFrameId !== null) {
                window.cancelAnimationFrame(secondFrameId);
            }
        };
    }, [shouldShowShipmentDetailsSection, data.packages.length]);

    useEffect(() => {
        if (selectedRouteType === "international") {
            return;
        }

        ["sender", "recipient"].forEach((party) => {
            abortPostalLookupForParty(party);
            clearPostalLookupForParty(party);
            abortCityLookupForParty(party);
            clearCityLookupForParty(party);
            abortCountryLookupForParty(party);
            clearCountryLookupForParty(party);
        });
    }, [selectedRouteType]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupCountrySuggestions(
                "sender",
                locationSearch.senderCountry,
                selectedRouteType,
            );
        }, COUNTRY_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        locationSearch.senderCountry,
        flowRoutes.countrySuggestions,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupCountrySuggestions(
                "recipient",
                locationSearch.recipientCountry,
                selectedRouteType,
            );
        }, COUNTRY_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        locationSearch.recipientCountry,
        flowRoutes.countrySuggestions,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalCityByPostalCode(
                "sender",
                data.sender?.address?.postalCode,
                data.sender?.address?.country,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.sender?.address?.postalCode,
        data.sender?.address?.country,
        flowRoutes.cityByPostal,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalCityByPostalCode(
                "recipient",
                data.recipient?.address?.postalCode,
                data.recipient?.address?.country,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.recipient?.address?.postalCode,
        data.recipient?.address?.country,
        flowRoutes.cityByPostal,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalPostalCitySuggestionsByCity(
                "sender",
                data.sender?.address?.city,
                data.sender?.address?.country,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.sender?.address?.city,
        data.sender?.address?.country,
        flowRoutes.cityByPostal,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalPostalCitySuggestionsByCity(
                "recipient",
                data.recipient?.address?.city,
                data.recipient?.address?.country,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.recipient?.address?.city,
        data.recipient?.address?.country,
        flowRoutes.cityByPostal,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalPostalCodes(
                "sender",
                data.sender?.address?.city,
                data.sender?.address?.country,
                data.sender?.address?.state,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.sender?.address?.city,
        data.sender?.address?.country,
        data.sender?.address?.state,
        flowRoutes.postalByCity,
    ]);

    useEffect(() => {
        if (selectedRouteType !== "international") {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            lookupInternationalPostalCodes(
                "recipient",
                data.recipient?.address?.city,
                data.recipient?.address?.country,
                data.recipient?.address?.state,
                selectedRouteType,
            );
        }, POSTAL_LOOKUP_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [
        selectedRouteType,
        data.recipient?.address?.city,
        data.recipient?.address?.country,
        data.recipient?.address?.state,
        flowRoutes.postalByCity,
    ]);

    useEffect(() => {
        return () => {
            ["sender", "recipient"].forEach((party) => {
                abortPostalLookupForParty(party);
                abortCityLookupForParty(party);
                abortCountryLookupForParty(party);
            });
        };
    }, []);

    const packageMetrics = useMemo(() => computePackageMetrics(data.packages), [data.packages]);

    const currencyFormatter = useMemo(() => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: displayCurrency,
                minimumFractionDigits: 2,
            });
        } catch (error) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 2,
            });
        }
    }, [displayCurrency]);

    const formatCurrency = (value) => {
        if (!Number.isFinite(value)) {
            return currencyFormatter.format(0);
        }

        let convertedValue = value;
        if (displayCurrency === 'LKR') {
            convertedValue = value * USD_TO_LKR_RATE;
        }

        return currencyFormatter.format(convertedValue);
    };

    const getDisplayAmount = (value) => {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return displayCurrency === "LKR" ? value * USD_TO_LKR_RATE : value;
    };

    const resetQuoteFilters = () => {
        const defaults = buildDefaultQuoteFilters();
        setQuoteFilters(defaults);
        setAppliedQuoteFilters(defaults);
    };

    const hasActiveQuoteFilters = useMemo(() => {
        const tiers = appliedQuoteFilters.tiers || {};
        const allTiersEnabled = QUOTE_TIER_OPTIONS.every((tier) => tiers[tier.id]);
        return Boolean(
            appliedQuoteFilters.providerSearch
            || appliedQuoteFilters.minPrice
            || appliedQuoteFilters.maxPrice
            || !allTiersEnabled
        );
    }, [appliedQuoteFilters]);

    const openServiceDetailsModal = (provider, tier, options = {}) => {
        if (!provider || !tier) {
            return;
        }

        const safeDiff = Number(options.diff);

        setServiceDetailsModal({
            providerId: provider.id || "",
            providerName: provider.name || "Unknown provider",
            providerCategory: provider.category || "unknown",
            coverage: provider.coverage || "Not specified",
            cutoff: provider.cutoff || "Not specified",
            badges: Array.isArray(provider.badges) ? provider.badges : [],
            serviceLevel: tier.id || "",
            tierLabel: tier.label || tier.id || "Service",
            tierEta: tier.eta || "Not specified",
            tierDescription: tier.description || "No additional description available.",
            price: Number(tier.price) || 0,
            breakdown: tier.breakdown || null,
            isBest: Boolean(options.isBest),
            diff: Number.isFinite(safeDiff) ? safeDiff : null,
            packageIndex: Number.isInteger(options.packageIndex) ? options.packageIndex : null,
        });
    };

    const closeServiceDetailsModal = () => {
        setServiceDetailsModal(null);
    };

    const handleSelectServiceFromModal = () => {
        if (!serviceDetailsModal) {
            return;
        }

        const packageIndex = Number.isInteger(serviceDetailsModal.packageIndex)
            ? serviceDetailsModal.packageIndex
            : -1;

        if (packageIndex < 0 || !serviceDetailsModal.providerId || !serviceDetailsModal.serviceLevel) {
            return;
        }

        const updatedPackages = [...data.packages];
        if (!updatedPackages[packageIndex]) {
            return;
        }

        updatedPackages[packageIndex] = {
            ...updatedPackages[packageIndex],
            courierProvider: serviceDetailsModal.providerId,
            serviceLevel: serviceDetailsModal.serviceLevel,
        };

        setData("packages", updatedPackages);
        setActivePackageIndex(packageIndex);
        closeServiceDetailsModal();
    };

    useEffect(() => {
        if (!serviceDetailsModal || typeof document === "undefined") {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const previousPaddingRight = document.body.style.paddingRight;
        const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = "hidden";
        if (scrollbarCompensation > 0) {
            document.body.style.paddingRight = `${scrollbarCompensation}px`;
        }

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPaddingRight;
        };
    }, [serviceDetailsModal]);

    const toggleCurrency = () => {
        const nextCurrency = displayCurrency === 'USD' ? 'LKR' : 'USD';
        setDisplayCurrency(nextCurrency);
        setData('shipment', {
            ...data.shipment,
            currency: nextCurrency,
        });
    };

    const filterQuoteProvidersByPaymentOptions = useCallback((options = {}) => {
        const requiresCod = Boolean(options.cod);
        const requiresCard = Boolean(options.card);
        const isAllSelected = Boolean(options.all);

        // If 'All' is selected, we show everything (OR logic)
        // If 'All' is NOT selected, but specific ones are, we filter strictly (AND logic)
        if (!requiresCod && !requiresCard && !isAllSelected) {
            return verifiedQuoteProviders;
        }

        return verifiedQuoteProviders.filter((provider) => {
            const providerPaymentOptions = provider?.paymentOptions || {};
            const supportsCod = Boolean(providerPaymentOptions.cod);
            const supportsCard = providerPaymentOptions.card === undefined
                ? true
                : Boolean(providerPaymentOptions.card);

            if (isAllSelected) {
                // When 'All' is selected, show providers that support EITHER COD or Card
                return supportsCod || supportsCard;
            }

            // Strict filtering when specific options are picked
            if (requiresCod && !supportsCod) {
                return false;
            }

            if (requiresCard && !supportsCard) {
                return false;
            }

            return true;
        });
    }, [verifiedQuoteProviders]);

    const paymentFilteredQuoteProviders = useMemo(
        () => filterQuoteProvidersByPaymentOptions(paymentOptions),
        [filterQuoteProvidersByPaymentOptions, paymentOptions]
    );

    const quoteMatrix = useMemo(
        () => buildQuoteMatrix(data.packages, {
            metrics: packageMetrics,
            services: paymentFilteredQuoteProviders,
        }),
        [data.packages, packageMetrics, paymentFilteredQuoteProviders]
    );

    const selectedQuotes = useMemo(
        () => resolveDetailedQuotes(data.packages, quoteMatrix),
        [data.packages, quoteMatrix]
    );

    const computeReviewContextForPayload = useCallback((payload = {}) => {
        const payloadPackages = Array.isArray(payload?.packages) ? payload.packages : [];
        const payloadShipment = payload?.shipment || {};
        const payloadPaymentOptions = payloadShipment?.paymentOptions || {};
        const payloadCurrency = String(
            payload?.reviewContext?.displayCurrency
            || payloadShipment?.currency
            || displayCurrency
            || "LKR"
        ).toUpperCase();

        const services = filterQuoteProvidersByPaymentOptions(payloadPaymentOptions);
        const metrics = computePackageMetrics(payloadPackages);
        const payloadQuoteMatrix = buildQuoteMatrix(payloadPackages, {
            metrics,
            services,
        });
        const payloadDetailedQuotes = resolveDetailedQuotes(payloadPackages, payloadQuoteMatrix);

        return buildReviewContext(payloadDetailedQuotes, payloadCurrency);
    }, [displayCurrency, filterQuoteProvidersByPaymentOptions]);
    const summaryStepDependencyFingerprint = useMemo(
        () => buildSummaryStepDependencyFingerprint(data),
        [data]
    );

    useEffect(() => {
        if (!Array.isArray(data.packages) || data.packages.length === 0) {
            return;
        }

        let hasChanges = false;

        const nextPackages = data.packages.map((pkg, index) => {
            const currentProvider = String(pkg?.courierProvider || "").trim();
            const currentServiceLevel = String(pkg?.serviceLevel || "").trim();

            if (!currentProvider && !currentServiceLevel) {
                return pkg;
            }

            const packageQuotes = quoteMatrix.find((item) => item.packageIndex === index);
            if (!packageQuotes) {
                hasChanges = true;
                return {
                    ...pkg,
                    courierProvider: "",
                    serviceLevel: "",
                };
            }

            const provider = (packageQuotes.providers || []).find(
                (candidate) => candidate.id === currentProvider
            );
            if (!provider) {
                hasChanges = true;
                return {
                    ...pkg,
                    courierProvider: "",
                    serviceLevel: "",
                };
            }

            const tier = (provider.tiers || []).find((candidate) => candidate.id === currentServiceLevel);
            if (!tier) {
                hasChanges = true;
                return {
                    ...pkg,
                    courierProvider: "",
                    serviceLevel: "",
                };
            }

            return pkg;
        });

        if (hasChanges) {
            setData("packages", nextPackages);
        }
    }, [data.packages, quoteMatrix, setData]);

    useEffect(() => {
        if (!showQuotes) {
            return;
        }

        if (upstreamChangeCounterRef.current === quotesStepUpstreamVersionRef.current) {
            return;
        }

        setShowQuotes(false);
        setShowDetails(false);
        setShowSummary(false);
        setIsSummaryLoading(false);
        setSubmitError("");
        setQuoteOnlyMessage("");
        clearErrors();
        setStepFlowNotice("");
        quotesStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        detailsStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        summaryStepDependencyRef.current = "";
    }, [showQuotes, upstreamChangeVersion, clearErrors]);

    useEffect(() => {
        if (!showDetails) {
            return;
        }

        if (upstreamChangeCounterRef.current === detailsStepUpstreamVersionRef.current) {
            return;
        }

        setShowDetails(false);
        setShowSummary(false);
        setIsSummaryLoading(false);
        setSubmitError("");
        setQuoteOnlyMessage("");
        clearErrors();
        setStepFlowNotice("");
        detailsStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        summaryStepDependencyRef.current = "";
    }, [showDetails, upstreamChangeVersion, clearErrors]);

    useEffect(() => {
        if (!showSummary) {
            return;
        }

        if (!summaryStepDependencyRef.current) {
            summaryStepDependencyRef.current = summaryStepDependencyFingerprint;
            return;
        }

        if (summaryStepDependencyRef.current === summaryStepDependencyFingerprint) {
            return;
        }

        setShowSummary(false);
        setIsSummaryLoading(false);
        setSubmitError("");
        clearErrors();
        setStepFlowNotice("Details changed. Continue from details to regenerate summary.");
        summaryStepDependencyRef.current = summaryStepDependencyFingerprint;
    }, [showSummary, summaryStepDependencyFingerprint, clearErrors]);

    const incompletePackages = useMemo(() => {
        if (!Array.isArray(data.packages) || !data.packages.length) {
            return 0;
        }

        return data.packages.filter((pkg) => {
            const quantity = Number(pkg.quantity) || 0;
            const weight = Number(pkg.weightKg) || 0;
            return !(quantity > 0 && weight > 0);
        }).length;
    }, [data.packages]);

    const hasRequiredDetails = useMemo(() => {
        if (!Array.isArray(data.packages) || data.packages.length === 0) {
            return false;
        }

        const senderAddress = data.sender?.address || {};
        const recipientAddress = data.recipient?.address || {};
        const hasRouteLocations = selectedRouteType === "domestic"
            ? Boolean(senderAddress.city && recipientAddress.city)
            : Boolean(
                senderAddress.country
                && senderAddress.city
                && senderAddress.postalCode
                && recipientAddress.country
                && recipientAddress.city
                && recipientAddress.postalCode
            );

        const hasShipmentType = Boolean(data.shipment?.shipmentType);
        const needsShipmentDescription = data.shipment?.shipmentType === "other";
        const hasShipmentDescription = !needsShipmentDescription
            || Boolean(String(data.shipment?.shipmentTypeDescription || "").trim());

        const packagesHaveNumbers = data.packages.every((pkg) => {
            const quantity = Number(pkg.quantity) || 0;
            const weight = Number(pkg.weightKg) || 0;
            const length = Number(pkg.lengthCm) || 0;
            const width = Number(pkg.widthCm) || 0;
            const height = Number(pkg.heightCm) || 0;
            return quantity > 0 && weight > 0 && length > 0 && width > 0 && height > 0;
        });

        const hasEstimatedValueIfRequired = (!data.shipment?.insurance && !data.shipment?.codEnabled) || Boolean(String(data.shipment?.estimatedValue || "").trim());

        return hasRouteLocations
            && hasShipmentType
            && hasShipmentDescription
            && packagesHaveNumbers
            && hasEstimatedValueIfRequired
            && (selectedRouteType !== "domestic" || hasPaymentOption);
    }, [
        data.packages,
        data.sender,
        data.recipient,
        data.shipment,
        selectedRouteType,
        hasPaymentOption,
    ]);

    const hasRequiredDetailsForQuoteOnly = useMemo(() => {
        if (!Array.isArray(data.packages) || data.packages.length === 0) {
            return false;
        }

        const senderAddress = data.sender?.address || {};
        const recipientAddress = data.recipient?.address || {};
        const hasRouteLocations = selectedRouteType === "domestic"
            ? Boolean(senderAddress.city && recipientAddress.city)
            : Boolean(
                senderAddress.country
                && senderAddress.city
                && senderAddress.postalCode
                && recipientAddress.country
                && recipientAddress.city
                && recipientAddress.postalCode
            );

        const hasShipmentType = Boolean(data.shipment?.shipmentType);
        const needsShipmentDescription = data.shipment?.shipmentType === "other";
        const hasShipmentDescription = !needsShipmentDescription
            || Boolean(String(data.shipment?.shipmentTypeDescription || "").trim());

        const packagesHaveNumbers = data.packages.every((pkg) => {
            const quantity = Number(pkg.quantity) || 0;
            const weight = Number(pkg.weightKg) || 0;
            const length = Number(pkg.lengthCm) || 0;
            const width = Number(pkg.widthCm) || 0;
            const height = Number(pkg.heightCm) || 0;
            return quantity > 0 && weight > 0 && length > 0 && width > 0 && height > 0;
        });

        const hasEstimatedValueIfRequired = (!data.shipment?.insurance && !data.shipment?.codEnabled) || Boolean(String(data.shipment?.estimatedValue || "").trim());

        return hasRouteLocations
            && hasShipmentType
            && hasShipmentDescription
            && packagesHaveNumbers
            && hasEstimatedValueIfRequired;
    }, [
        data.packages,
        data.sender,
        data.recipient,
        data.shipment,
        selectedRouteType,
    ]);

    const hasSelectedServices = useMemo(() => {
        if (!Array.isArray(data.packages) || data.packages.length === 0) {
            return false;
        }

        if (selectedQuotes.length !== data.packages.length) {
            return false;
        }

        return data.packages.every((pkg) => pkg.courierProvider && pkg.serviceLevel);
    }, [data.packages, selectedQuotes]);

    useEffect(() => {
        if (!showQuotes || typeof window === "undefined") {
            return;
        }

        const target = quotesSectionRef.current;
        if (!target) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);

        return () => window.clearTimeout(timeoutId);
    }, [showQuotes]);

    useEffect(() => {
        if (!showDetails || typeof window === "undefined") {
            return;
        }

        const target = detailsSectionRef.current;
        if (!target) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);

        return () => window.clearTimeout(timeoutId);
    }, [showDetails]);

    useEffect(() => {
        if (!showSummary || typeof window === "undefined") {
            return;
        }

        const target = summarySectionRef.current;
        if (!target) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);

        return () => window.clearTimeout(timeoutId);
    }, [showSummary]);

    const extractFirstErrorMessage = (errorBag) => {
        const queue = Array.isArray(errorBag)
            ? [...errorBag]
            : Object.values(errorBag || {});

        while (queue.length > 0) {
            const current = queue.shift();

            if (typeof current === "string" && current.trim() !== "") {
                return current;
            }

            if (Array.isArray(current)) {
                queue.push(...current);
                continue;
            }

            if (current && typeof current === "object") {
                queue.push(...Object.values(current));
            }
        }

        return "";
    };

    const getCsrfToken = () => {
        if (typeof document === "undefined") {
            return "";
        }

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        return token || "";
    };

    const prepareDetailsSession = async (payload) => {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            return {
                ok: false,
                message: "Unable to continue. Please refresh and try again.",
            };
        }

        try {
            const response = await fetch(flowRoutes.review, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            if (response.status === 422) {
                const errorPayload = await response.json().catch(() => ({}));
                const firstError = extractFirstErrorMessage(errorPayload.errors || errorPayload);
                return {
                    ok: false,
                    message:
                        firstError ||
                        "Unable to continue. Please review the highlighted fields and try again.",
                };
            }

            if (!response.ok) {
                return {
                    ok: false,
                    message: "Unable to continue. Please try again.",
                };
            }

            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                message: "Unable to continue. Please check your connection and try again.",
            };
        }
    };

    const prepareSummarySession = async (payload) => {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            return {
                ok: false,
                message: "Unable to continue. Please refresh and try again.",
            };
        }

        try {
            const response = await fetch(flowRoutes.detailsStore, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            if (response.status === 422) {
                const errorPayload = await response.json().catch(() => ({}));
                const firstError = extractFirstErrorMessage(errorPayload.errors || errorPayload);
                return {
                    ok: false,
                    errors: errorPayload.errors || errorPayload,
                    message:
                        firstError ||
                        "Unable to continue. Please review the highlighted fields and try again.",
                };
            }

            if (!response.ok) {
                return {
                    ok: false,
                    message: "Unable to continue. Please try again.",
                };
            }

            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                message: "Unable to continue. Please check your connection and try again.",
            };
        }
    };

    const isReadyToPlace = useMemo(() => {
        return hasRequiredDetails && hasSelectedServices;
    }, [hasRequiredDetails, hasSelectedServices]);

    const isReadyForQuoteOnly = useMemo(() => {
        return hasRequiredDetailsForQuoteOnly && hasSelectedServices;
    }, [hasRequiredDetailsForQuoteOnly, hasSelectedServices]);

    const handleGetQuoteOnly = () => {
        if (!isReadyForQuoteOnly || isPlacing) {
            setSubmitError(
                hasRequiredDetailsForQuoteOnly
                    ? "Select a courier service for each package to get a quote."
                    : "Complete all required fields before getting a quote.",
            );
            return;
        }

        const payload = JSON.parse(JSON.stringify(data));
        const reviewContext = computeReviewContextForPayload(payload);
        setData((previous) => ({
            ...previous,
            reviewContext,
        }));

        setSubmitError("");
        setQuoteOnlyMessage(
            `Quotation ready. Estimated total: ${formatCurrency(reviewContext.totalPriceUSD || 0)} for ${reviewContext.selectedQuotes?.length || 0} package(s).`,
        );
        handleDownloadQuotation();
    };

    const getBase64ImageFromUrl = async (imageUrl) => {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    };

    const handleDownloadQuotation = async () => {
        if (!selectedQuotes.length || typeof window === "undefined") {
            setSubmitError("Select at least one quoted service before downloading the quotation.");
            return;
        }

        const doc = new jsPDF();
        const totalUsd = selectedQuotes.reduce((sum, quote) => sum + (Number(quote?.tier?.price) || 0), 0);
        const totalDisplay = formatCurrency(totalUsd);
        const generatedAt = new Date();
        const generatedAtLabel = generatedAt.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
        const senderCity = data?.sender?.address?.city || "-";
        const senderCountry = data?.sender?.address?.country || "-";
        const recipientCity = data?.recipient?.address?.city || "-";
        const recipientCountry = data?.recipient?.address?.country || "-";

        const cachedLogoUrl = localStorage.getItem('cachedCompanyLogoUrl');
        const pageWidth = doc.internal.pageSize.getWidth();
        const rightMargin = 14;

        if (cachedLogoUrl) {
            const base64Logo = await getBase64ImageFromUrl(cachedLogoUrl);
            if (base64Logo) {
                try {
                    const logoWidth = 40;
                    const logoHeight = 15;
                    doc.addImage(base64Logo, 'PNG', pageWidth - rightMargin - logoWidth, 10, logoWidth, logoHeight);
                } catch (e) {
                    console.error("Error adding app logo", e);
                    doc.setFontSize(20);
                    doc.text("Company Logo", pageWidth - rightMargin, 20, { align: "right" });
                }
            } else {
                doc.setFontSize(20);
                doc.text("Company Logo", pageWidth - rightMargin, 20, { align: "right" });
            }
        } else {
            doc.setFontSize(20);
            doc.text("Company Logo", pageWidth - rightMargin, 20, { align: "right" });
        }

        const uniqueProviderLogos = [];
        const seenLogos = new Set();
        for (const quote of selectedQuotes) {
            const logo = quote?.provider?.logo;
            if (logo && !seenLogos.has(logo)) {
                seenLogos.add(logo);
                uniqueProviderLogos.push(logo);
            }
        }
        
        const topProviderLogosBase64 = await Promise.all(
            uniqueProviderLogos.map(logoUrl => getBase64ImageFromUrl(logoUrl))
        );

        let currentVendorX = 14;
        topProviderLogosBase64.forEach(base64 => {
            if (base64) {
                try {
                    const format = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
                    doc.addImage(base64, format, currentVendorX, 10, 20, 15);
                    currentVendorX += 25;
                } catch (e) {
                    console.error("Error adding vendor logo", e);
                }
            }
        });

        doc.setFontSize(16);
        doc.text("Courier Quotation", 14, 35);
        
        doc.setFontSize(10);
        doc.text(`Generated at: ${generatedAtLabel}`, 14, 45);
        doc.text(`Route type: ${selectedRouteType}`, 14, 50);
        doc.text(`From: ${senderCity}, ${senderCountry}`, 14, 55);
        doc.text(`To: ${recipientCity}, ${recipientCountry}`, 14, 60);
        doc.text(`Currency view: ${displayCurrency}`, 14, 65);

        const tableBody = [];
        for (let index = 0; index < selectedQuotes.length; index++) {
            const quote = selectedQuotes[index];
            const packageLabel = quote?.packageInfo?.label || `Package ${index + 1}`;
            const providerName = quote?.provider?.name || "Unknown provider";
            const tierLabel = quote?.tier?.label || "Unknown tier";
            const eta = quote?.tier?.eta || "-";
            const priceLabel = formatCurrency(Number(quote?.tier?.price) || 0);
            
            tableBody.push([
                index + 1,
                packageLabel,
                providerName,
                tierLabel,
                eta,
                priceLabel
            ]);
        }

        autoTable(doc, {
            startY: 75,
            head: [['#', 'Package', 'Provider', 'Service', 'ETA', 'Price']],
            body: tableBody,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        const finalY = doc.lastAutoTable.finalY || 75;
        doc.setFontSize(12);
        doc.text(`Total shipping cost: ${totalDisplay}`, 14, finalY + 10);

        const datePart = generatedAt.toISOString().slice(0, 10);
        doc.save(`courier-quotation-${datePart}.pdf`);
        setSubmitError("");
    };

    const handleContinueToDetails = async () => {
        if (!isReadyToPlace || isPlacing) {
            return;
        }

        setStepFlowNotice("");
        setSubmitError("");
        setQuoteOnlyMessage("");
        setIsPlacing(true);

        const basePayload = JSON.parse(JSON.stringify(data));
        const reviewContext = computeReviewContextForPayload(basePayload);
        const payload = {
            ...basePayload,
            reviewContext,
        };

        const result = await prepareDetailsSession(payload);
        if (!result.ok) {
            setSubmitError(result.message || "Unable to continue. Please try again.");
            setIsPlacing(false);
            return;
        }

        setData((previous) => ({
            ...previous,
            reviewContext,
        }));
        detailsStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        summaryStepDependencyRef.current = "";
        setShowDetails(true);
        setShowSummary(false);
        setIsPlacing(false);
    };

    const handleContinueToQuotes = () => {
        setStepFlowNotice("");
        setSubmitError("");
        setQuoteOnlyMessage("");

        if (!hasRequiredDetails) {
            setSubmitError(
                selectedRouteType === "domestic" && !hasPaymentOption
                    ? "Select at least one payment option to continue."
                    : "Complete all required fields before continuing.",
            );
            return;
        }

        clearErrors();
        setShowQuotes(true);
        setShowDetails(false);
        setShowSummary(false);
        setIsSummaryLoading(false);
        quotesStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        detailsStepUpstreamVersionRef.current = upstreamChangeCounterRef.current;
        summaryStepDependencyRef.current = "";
    };

    const handleContinueToSummary = async ({ setSubmitError: setDetailsSubmitError } = {}) => {
        if (isSummaryLoading) {
            return;
        }

        const setErrorMessage = typeof setDetailsSubmitError === "function"
            ? setDetailsSubmitError
            : setSubmitError;

        setStepFlowNotice("");
        setErrorMessage("");
        clearErrors();
        setIsSummaryLoading(true);

        const payload = JSON.parse(JSON.stringify(data));
        const reviewContext = computeReviewContextForPayload(payload);
        payload.reviewContext = reviewContext;
        setData((previous) => ({
            ...previous,
            reviewContext,
        }));
        const result = await prepareSummarySession(payload);
        if (!result.ok) {
            if (result.errors) {
                setError(result.errors);
            }
            setErrorMessage(result.message || "Unable to continue. Please try again.");
            setIsSummaryLoading(false);
            return;
        }

        summaryStepDependencyRef.current = buildSummaryStepDependencyFingerprint(payload);
        setShowSummary(true);
        setIsSummaryLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]">
            <Head title="Send a Package" />
            <Header />

            {/* <section className="relative">
                <img
                    src={bg}
                    className="w-full h-[300px] object-cover"
                    alt="Courier service hero"
                />
                <div className="absolute inset-0 bg-[#000000B8]" />
                <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl text-white poppins">
                            <p className="uppercase tracking-wide text-xs md:text-sm text-[#6FB3FF]">
                                Courier Service
                            </p>
                            <h1 className="text-3xl md:text-5xl font-semibold mt-4 leading-tight">
                                Schedule a pickup and send packages worldwide
                            </h1>
                            <p className="mt-4 text-sm md:text-base text-white/80">
                                Provide pickup, delivery, and package details in a few quick steps.
                                We will match your request with the best courier option and send
                                confirmations straight to your inbox.
                            </p>
                            <div className="mt-6">
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 text-xs md:text-sm text-white/70 hover:text-white transition"
                                >
                                    ← Back to home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section> */}

            <main>
                <div className="bg-white shadow-xl rounded-2xl px-6 md:px-10 py-10 poppins mt-6">
                    {flash?.success && (
                        <div className="mb-6 space-y-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            <p>{flash.success}</p>
                            {props.recentReference && (
                                <p className="font-semibold">
                                    Reference: {props.recentReference}
                                </p>
                            )}
                            {recentShipmentId && (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-xs text-green-800">
                                        Download the courier bill to keep a record of this request.
                                    </span>
                                    <a
                                        href={`${flowRoutes.basePath}/${recentShipmentId}/bill`}
                                        className="inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a4b93]"
                                    >
                                        Download bill
                                    </a>
                                </div>
                            )}
                            {recentPricingExplanation && (
                                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-xs text-[#1E3A8A]">
                                    <p className="font-semibold">Pricing enforcement summary</p>
                                    <p className="mt-1">Mode: {recentPricingExplanation.mode === "lane_matrix" ? "Lane Matrix" : "Selected Quotes"}</p>
                                    {recentPricingExplanation.reason && (
                                        <p className="mt-1">Reason: {recentPricingExplanation.reason}</p>
                                    )}
                                    {recentPricingExplanation.distanceKm !== null && recentPricingExplanation.distanceKm !== undefined && (
                                        <p className="mt-1">Distance: {Number(recentPricingExplanation.distanceKm).toFixed(1)} km</p>
                                    )}
                                    {recentPricingExplanation.matchedRule && (
                                        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                            <p>Lane: {recentPricingExplanation.matchedRule.originZone} → {recentPricingExplanation.matchedRule.destinationZone}</p>
                                            <p>Service: {recentPricingExplanation.matchedRule.serviceLevelKey || "any"}</p>
                                            <p>Band: {Number(recentPricingExplanation.matchedRule.distanceFromKm || 0).toFixed(1)} - {recentPricingExplanation.matchedRule.distanceToKm === null || recentPricingExplanation.matchedRule.distanceToKm === undefined ? "*" : Number(recentPricingExplanation.matchedRule.distanceToKm).toFixed(1)} km</p>
                                            <p>Estimate (USD): {Number(recentPricingExplanation.totalEstimatedUsd || 0).toFixed(2)}</p>
                                        </div>
                                    )}
                                    {recentPricingExplanation.speedEtaTier && (
                                        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                            <p>Speed/ETA Tier: {recentPricingExplanation.speedEtaTier.etaLabel || recentPricingExplanation.speedEtaTier.tierLabel || recentPricingExplanation.speedEtaTier.tierKey || "—"}</p>
                                            <p>ETA Range: {Number(recentPricingExplanation.speedEtaTier.etaMinDays || 0)} - {recentPricingExplanation.speedEtaTier.etaMaxDays === null || recentPricingExplanation.speedEtaTier.etaMaxDays === undefined ? "*" : Number(recentPricingExplanation.speedEtaTier.etaMaxDays)} days</p>
                                            <p>Projected Window: {recentPricingExplanation.speedEtaTier.etaStartDate || "—"} {recentPricingExplanation.speedEtaTier.etaEndDate ? `to ${recentPricingExplanation.speedEtaTier.etaEndDate}` : ""}</p>
                                            <p>Tier Multiplier: x{Number(recentPricingExplanation.speedEtaTier.priceMultiplier || 1).toFixed(2)} {recentPricingExplanation.speedEtaTier.enforceTierPricingMultiplier ? "(enforced)" : "(display only)"}</p>
                                        </div>
                                    )}
                                    {recentPricingExplanation.internationalDimensions && (
                                        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                            <p>International Unit Type: {recentPricingExplanation.internationalDimensions.unitType || "—"}</p>
                                            <p>Route Class: {recentPricingExplanation.internationalDimensions.routeClass || "—"}</p>
                                            <p>Handling Class: {recentPricingExplanation.internationalDimensions.handlingClass || "—"}</p>
                                            <p>W2W Mode: {recentPricingExplanation.internationalDimensions.w2wMode || "—"}</p>
                                            <p>Unit Count: {recentPricingExplanation.internationalDimensions.unitCount || "—"}</p>
                                            <p>Combined Multiplier: x{Number(recentPricingExplanation.internationalDimensions.totalMultiplier || 1).toFixed(2)}</p>
                                        </div>
                                    )}
                                    {Array.isArray(recentPricingExplanation.policyAdjustments) && recentPricingExplanation.policyAdjustments.length > 0 && (
                                        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                                            {recentPricingExplanation.policyAdjustments.map((item, idx) => (
                                                <p key={`recent-pricing-adjustment-${idx}`}>
                                                    {formatPolicyAdjustmentLabel(item?.key)}: {Number(item?.amount || 0) >= 0 ? "+" : "-"}{Math.abs(Number(item?.amount || 0)).toFixed(2)}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-10">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div>
                                <h2 className="text-lg font-semibold text-[#0B1739]">Shipment route type</h2>
                                <p className="mt-1 text-sm text-[#5B6887]">
                                    Choose the route type first. Courier companies will be filtered to match your selection.
                                </p>
                            </div>
                            <div className="inline-flex w-[300px] max-w-md justify-between rounded-xl border border-[#D6DEEB] bg-white p-1 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => handleRouteTypeChange('domestic')}
                                    className={`min-w-[140px] rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${selectedRouteType === 'domestic'
                                        ? 'border-[#0955AC] bg-[#0955AC] text-white shadow-sm'
                                        : 'border-blue bg-white text-[#5B6887] hover:border-[#D6DEEB] hover:text-[#0B1739]'
                                        }`}
                                >
                                    Domestic
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRouteTypeChange('international')}
                                    className={`min-w-[140px] rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${selectedRouteType === 'international'
                                        ? 'border-[#0955AC] bg-[#0955AC] text-white shadow-sm'
                                        : 'border-blue bg-white text-[#5B6887] hover:border-[#D6DEEB] hover:text-[#0B1739]'
                                        }`}
                                >
                                    International
                                </button>
                            </div>
                        </div>

                        <section className="space-y-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h2 className="text-2xl font-semibold text-[#0B1739]">Package details</h2>
                                    <p className="mt-2 text-sm text-[#5B6887]">
                                        {packageSectionDescription}
                                    </p>
                                </div>
                                {selectedRouteType !== "international" && (
                                    <button
                                        type="button"
                                        onClick={addPackage}
                                        className="inline-flex items-center gap-2 rounded-lg border border-[#D6DEEB] bg-[#0955AC] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#04356d] hover:text-white"
                                    >
                                        + Add item
                                    </button>
                                )}
                            </div>

                            <div className="space-y-5">
                                {data.packages.map((item, index) => {
                                    const weightUnit = item.weightUnit === "oz" ? "oz" : "kg";
                                    const dimensionUnit = Object.prototype.hasOwnProperty.call(DIMENSION_UNIT_FACTORS, item.dimensionUnit)
                                        ? item.dimensionUnit
                                        : "cm";
                                    const weightFactor = weightUnit === "oz" ? OUNCES_PER_KILOGRAM : 1;
                                    const dimensionFactor = DIMENSION_UNIT_FACTORS[dimensionUnit] || 1;
                                    const itemLength = Number(item.lengthCm) || 0;
                                    const itemWidth = Number(item.widthCm) || 0;
                                    const itemHeight = Number(item.heightCm) || 0;
                                    const itemQuantity = Math.max(1, Number(item.quantity) || 1);
                                    const dimensionAssistPresets = selectedRouteType === "international"
                                        ? INTERNATIONAL_DIMENSION_ASSIST_PRESETS
                                        : DOMESTIC_DIMENSION_ASSIST_PRESETS;
                                    const isPackageDetailsVisible = shouldShowShipmentDetailsSection;

                                    return (
                                        <div
                                            key={`package-${index}`}
                                            className="space-y-4"
                                        >
                                            {(selectedRouteType !== "international" || index === 0) && (
                                                <div className="rounded-2xl border border-[#D6DEEB] bg-white px-5 py-6 shadow-sm">
                                                    {selectedRouteType !== "international" && (
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <h3 className="text-base font-semibold text-[#0B1739]">
                                                                Package {index + 1}
                                                            </h3>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePackage(index)}
                                                                className="text-sm text-red-500 hover:text-red-600 disabled:text-red-300"
                                                                disabled={data.packages.length === 1}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="mb-2 block text-sm font-medium text-[#0B1739]">
                                                                Locations*
                                                            </label>
                                                            <div
                                                                className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${selectedRouteType === "domestic" ? "xl:grid-cols-3" : "xl:grid-cols-2"
                                                                    }`}
                                                            >
                                                                {selectedRouteType === "domestic" && (
                                                                    <div>
                                                                        <label className="mb-1 block text-xs font-medium text-[#5B6887]">Country*</label>
                                                                        <select
                                                                            value={DOMESTIC_COUNTRY_CODE}
                                                                            disabled
                                                                            className="h-[52px] w-full cursor-not-allowed rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] opacity-80"
                                                                        >
                                                                            <option value={DOMESTIC_COUNTRY_CODE}>
                                                                                {DOMESTIC_COUNTRY_LABEL} ({DOMESTIC_COUNTRY_CODE})
                                                                            </option>
                                                                        </select>
                                                                    </div>
                                                                )}
                                                                {selectedRouteType === "domestic" ? (
                                                                    <>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium text-[#5B6887]">Pickup city*</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    value={locationSearch.senderCity}
                                                                                    onChange={(event) => {
                                                                                        setActiveLocationField(`sender-city-${index}`);
                                                                                        handleCitySearchChange("sender", "senderCity", event.target.value);
                                                                                    }}
                                                                                    onFocus={() => {
                                                                                        setActiveLocationField(`sender-city-${index}`);
                                                                                        if (locationSearch.senderCity.length >= 1) {
                                                                                            fetchDomesticCitySuggestions("sender", locationSearch.senderCity);
                                                                                        }
                                                                                    }}
                                                                                    onBlur={() => handleLocationInputBlur(`sender-city-${index}`)}
                                                                                    className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                                    placeholder="Type to search city..."
                                                                                />
                                                                                {domesticCityLoading.sender && (
                                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5B6887]">...</span>
                                                                                )}
                                                                                {activeLocationField === `sender-city-${index}` && domesticCitySuggestions.sender.length > 0 && (
                                                                                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                        {domesticCitySuggestions.sender.map((option) => (
                                                                                            <button
                                                                                                key={`pickup-city-${index}-${option.value}`}
                                                                                                type="button"
                                                                                                onMouseDown={(event) => {
                                                                                                    event.preventDefault();
                                                                                                    handleLocationSelect("sender", "senderCity", option, "city");
                                                                                                    setDomesticCitySuggestions((prev) => ({ ...prev, sender: [] }));
                                                                                                }}
                                                                                                className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                            >
                                                                                                {option.label}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium text-[#5B6887]">Destination city*</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    value={locationSearch.recipientCity}
                                                                                    onChange={(event) => {
                                                                                        setActiveLocationField(`recipient-city-${index}`);
                                                                                        handleCitySearchChange("recipient", "recipientCity", event.target.value);
                                                                                    }}
                                                                                    onFocus={() => {
                                                                                        setActiveLocationField(`recipient-city-${index}`);
                                                                                        if (locationSearch.recipientCity.length >= 1) {
                                                                                            fetchDomesticCitySuggestions("recipient", locationSearch.recipientCity);
                                                                                        }
                                                                                    }}
                                                                                    onBlur={() => handleLocationInputBlur(`recipient-city-${index}`)}
                                                                                    className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                                    placeholder="Type to search city..."
                                                                                />
                                                                                {domesticCityLoading.recipient && (
                                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5B6887]">...</span>
                                                                                )}
                                                                                {activeLocationField === `recipient-city-${index}` && domesticCitySuggestions.recipient.length > 0 && (
                                                                                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                        {domesticCitySuggestions.recipient.map((option) => (
                                                                                            <button
                                                                                                key={`destination-city-${index}-${option.value}`}
                                                                                                type="button"
                                                                                                onMouseDown={(event) => {
                                                                                                    event.preventDefault();
                                                                                                    handleLocationSelect("recipient", "recipientCity", option, "city");
                                                                                                    setDomesticCitySuggestions((prev) => ({ ...prev, recipient: [] }));
                                                                                                }}
                                                                                                className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                            >
                                                                                                {option.label}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="space-y-3 sm:col-span-2 xl:col-span-2">
                                                                            <p className="text-sm font-semibold text-[#0B1739]">From</p>
                                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Pickup country*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={locationSearch.senderCountry}
                                                                                            onChange={(event) => handleCountrySearchChange("sender", "senderCountry", event.target.value)}
                                                                                            onFocus={() => setActiveLocationField(`sender-country-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`sender-country-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder="Select pickup country"
                                                                                        />
                                                                                        {activeLocationField === `sender-country-${index}` && (
                                                                                            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                {filterLocationOptions(getCountryOptionsForParty("sender"), locationSearch.senderCountry).map((option) => (
                                                                                                    <button
                                                                                                        key={`pickup-${index}-${option.value}`}
                                                                                                        type="button"
                                                                                                        onMouseDown={(event) => {
                                                                                                            event.preventDefault();
                                                                                                            handleLocationSelect("sender", "senderCountry", option, "country");
                                                                                                        }}
                                                                                                        className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                    >
                                                                                                        {option.label}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {countryLookupState.sender.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Loading countries...</p>
                                                                                    )}
                                                                                    {!countryLookupState.sender.loading && countryLookupState.sender.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{countryLookupState.sender.error}</p>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Pickup city*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={data.sender?.address?.city || ""}
                                                                                            onChange={(event) => updateAddressCity("sender", event.target.value)}
                                                                                            disabled={!data.sender?.address?.country}
                                                                                            onFocus={() => setActiveLocationField(`sender-city-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`sender-city-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder={data.sender?.address?.country ? "Enter pickup city" : "Select pickup country first"}
                                                                                        />
                                                                                        {activeLocationField === `sender-city-${index}`
                                                                                            && filterPostalCitySuggestions(
                                                                                                postalCitySuggestions.sender,
                                                                                                data.sender?.address?.city,
                                                                                            ).length > 0 && (
                                                                                                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                    {filterPostalCitySuggestions(
                                                                                                        postalCitySuggestions.sender,
                                                                                                        data.sender?.address?.city,
                                                                                                    ).map((suggestion) => (
                                                                                                        <button
                                                                                                            key={`sender-city-suggestion-${suggestion.postalCode}-${suggestion.city}`}
                                                                                                            type="button"
                                                                                                            onMouseDown={(event) => {
                                                                                                                event.preventDefault();
                                                                                                                handlePostalSuggestionSelect(
                                                                                                                    "sender",
                                                                                                                    `sender-city-${index}`,
                                                                                                                    suggestion,
                                                                                                                );
                                                                                                            }}
                                                                                                            className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                        >
                                                                                                            {suggestion.city}, {suggestion.postalCode}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Pickup postal code*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={data.sender?.address?.postalCode || ""}
                                                                                            onChange={(event) => updateAddressPostalCode("sender", event.target.value)}
                                                                                            disabled={!data.sender?.address?.country}
                                                                                            onFocus={() => setActiveLocationField(`sender-postal-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`sender-postal-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder={data.sender?.address?.country ? "Enter pickup postal code" : "Select pickup country first"}
                                                                                        />
                                                                                        {activeLocationField === `sender-postal-${index}` && postalCitySuggestions.sender.length > 0 && (
                                                                                            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                {postalCitySuggestions.sender.map((suggestion) => (
                                                                                                    <button
                                                                                                        key={`sender-postal-suggestion-${suggestion.postalCode}-${suggestion.city}`}
                                                                                                        type="button"
                                                                                                        onMouseDown={(event) => {
                                                                                                            event.preventDefault();
                                                                                                            handlePostalSuggestionSelect(
                                                                                                                "sender",
                                                                                                                `sender-postal-${index}`,
                                                                                                                suggestion,
                                                                                                            );
                                                                                                        }}
                                                                                                        className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                    >
                                                                                                        {suggestion.city}, {suggestion.postalCode}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {cityLookupState.sender.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Finding city from postal code...</p>
                                                                                    )}
                                                                                    {!cityLookupState.sender.loading && cityLookupState.sender.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{cityLookupState.sender.error}</p>
                                                                                    )}
                                                                                    {postalLookupState.sender.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Loading postal code suggestions...</p>
                                                                                    )}
                                                                                    {!postalLookupState.sender.loading && postalLookupState.sender.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{postalLookupState.sender.error}</p>
                                                                                    )}
                                                                                    {postalCityNotice.sender && (
                                                                                        <div className="mt-2 rounded-md bg-[#E5E7EB] px-3 py-2 text-sm leading-5 text-[#1F2937]">
                                                                                            {postalCityNotice.sender}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3 sm:col-span-2 xl:col-span-2">
                                                                            <p className="text-sm font-semibold text-[#0B1739]">To</p>
                                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Destination country*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={locationSearch.recipientCountry}
                                                                                            onChange={(event) => handleCountrySearchChange("recipient", "recipientCountry", event.target.value)}
                                                                                            onFocus={() => setActiveLocationField(`recipient-country-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`recipient-country-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder="Select destination country"
                                                                                        />
                                                                                        {activeLocationField === `recipient-country-${index}` && (
                                                                                            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                {filterLocationOptions(getCountryOptionsForParty("recipient"), locationSearch.recipientCountry).map((option) => (
                                                                                                    <button
                                                                                                        key={`destination-${index}-${option.value}`}
                                                                                                        type="button"
                                                                                                        onMouseDown={(event) => {
                                                                                                            event.preventDefault();
                                                                                                            handleLocationSelect("recipient", "recipientCountry", option, "country");
                                                                                                        }}
                                                                                                        className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                    >
                                                                                                        {option.label}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {countryLookupState.recipient.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Loading countries...</p>
                                                                                    )}
                                                                                    {!countryLookupState.recipient.loading && countryLookupState.recipient.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{countryLookupState.recipient.error}</p>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Destination city*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={data.recipient?.address?.city || ""}
                                                                                            onChange={(event) => updateAddressCity("recipient", event.target.value)}
                                                                                            disabled={!data.recipient?.address?.country}
                                                                                            onFocus={() => setActiveLocationField(`recipient-city-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`recipient-city-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder={data.recipient?.address?.country ? "Enter destination city" : "Select destination country first"}
                                                                                        />
                                                                                        {activeLocationField === `recipient-city-${index}`
                                                                                            && filterPostalCitySuggestions(
                                                                                                postalCitySuggestions.recipient,
                                                                                                data.recipient?.address?.city,
                                                                                            ).length > 0 && (
                                                                                                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                    {filterPostalCitySuggestions(
                                                                                                        postalCitySuggestions.recipient,
                                                                                                        data.recipient?.address?.city,
                                                                                                    ).map((suggestion) => (
                                                                                                        <button
                                                                                                            key={`recipient-city-suggestion-${suggestion.postalCode}-${suggestion.city}`}
                                                                                                            type="button"
                                                                                                            onMouseDown={(event) => {
                                                                                                                event.preventDefault();
                                                                                                                handlePostalSuggestionSelect(
                                                                                                                    "recipient",
                                                                                                                    `recipient-city-${index}`,
                                                                                                                    suggestion,
                                                                                                                );
                                                                                                            }}
                                                                                                            className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                        >
                                                                                                            {suggestion.city}, {suggestion.postalCode}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <label className="mb-1 block text-xs font-medium text-[#5B6887]">Destination postal code*</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            value={data.recipient?.address?.postalCode || ""}
                                                                                            onChange={(event) => updateAddressPostalCode("recipient", event.target.value)}
                                                                                            disabled={!data.recipient?.address?.country}
                                                                                            onFocus={() => setActiveLocationField(`recipient-postal-${index}`)}
                                                                                            onBlur={() => handleLocationInputBlur(`recipient-postal-${index}`)}
                                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm leading-5 text-[#0B1739] disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                            placeholder={data.recipient?.address?.country ? "Enter destination postal code" : "Select destination country first"}
                                                                                        />
                                                                                        {activeLocationField === `recipient-postal-${index}` && postalCitySuggestions.recipient.length > 0 && (
                                                                                            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                                                                {postalCitySuggestions.recipient.map((suggestion) => (
                                                                                                    <button
                                                                                                        key={`recipient-postal-suggestion-${suggestion.postalCode}-${suggestion.city}`}
                                                                                                        type="button"
                                                                                                        onMouseDown={(event) => {
                                                                                                            event.preventDefault();
                                                                                                            handlePostalSuggestionSelect(
                                                                                                                "recipient",
                                                                                                                `recipient-postal-${index}`,
                                                                                                                suggestion,
                                                                                                            );
                                                                                                        }}
                                                                                                        className="block w-full px-3 py-2 text-left text-sm text-[#0B1739] hover:bg-[#F0F7FF]"
                                                                                                    >
                                                                                                        {suggestion.city}, {suggestion.postalCode}
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {cityLookupState.recipient.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Finding city from postal code...</p>
                                                                                    )}
                                                                                    {!cityLookupState.recipient.loading && cityLookupState.recipient.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{cityLookupState.recipient.error}</p>
                                                                                    )}
                                                                                    {postalLookupState.recipient.loading && (
                                                                                        <p className="mt-1 text-xs text-[#5B6887]">Loading postal code suggestions...</p>
                                                                                    )}
                                                                                    {!postalLookupState.recipient.loading && postalLookupState.recipient.error && (
                                                                                        <p className="mt-1 text-xs text-[#C43D35]">{postalLookupState.recipient.error}</p>
                                                                                    )}
                                                                                    {postalCityNotice.recipient && (
                                                                                        <div className="mt-2 rounded-md bg-[#E5E7EB] px-3 py-2 text-sm leading-5 text-[#1F2937]">
                                                                                            {postalCityNotice.recipient}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-3 flex items-center gap-3">
                                                                                <input
                                                                                    id={`recipient-residential-${index}`}
                                                                                    type="checkbox"
                                                                                    checked={Boolean(data.recipient?.address?.isResidential)}
                                                                                    onChange={(event) => updateAddressResidential("recipient", event.target.checked)}
                                                                                    className="h-6 w-6 rounded-md border border-[#B8C4D8] accent-[#4D8A26]"
                                                                                />
                                                                                <label
                                                                                    htmlFor={`recipient-residential-${index}`}
                                                                                    className="text-base leading-none text-[#0B1739]"
                                                                                >
                                                                                    This is a residential address
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {selectedRouteType === "domestic" && (
                                                            <div className="border-t border-[#E4EAF5] pt-6">
                                                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr_1.2fr] xl:items-start">
                                                                    <div>
                                                                        <label className="mb-2 block text-sm font-medium text-[#0B1739]">
                                                                            Package weight*
                                                                        </label>

                                                                        <div className="mt-3 grid grid-cols-[1fr_90px] gap-2">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                value={toDisplayValue(item.weightKg, weightFactor, 2)}
                                                                                onChange={(event) =>
                                                                                    updatePackage(index, "weightKg", toBaseValue(event.target.value, weightFactor))
                                                                                }
                                                                                className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                placeholder="Weight"
                                                                            />
                                                                            <select
                                                                                value={weightUnit}
                                                                                onChange={(event) => updatePackage(index, "weightUnit", event.target.value)}
                                                                                className="h-[52px] w-[90px] rounded-lg border border-[#D6DEEB] bg-white pl-3 pr-8 text-sm font-semibold leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                            >
                                                                                <option value="kg">kg</option>
                                                                                <option value="oz">lb</option>
                                                                            </select>
                                                                        </div>
                                                                        {errors[`packages.${index}.weightKg`] && (
                                                                            <p className="mt-2 text-sm text-red-500">
                                                                                {errors[`packages.${index}.weightKg`]}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <label className="block text-sm font-medium text-[#0B1739]">
                                                                                Dimensions *
                                                                            </label>
                                                                        </div>

                                                                        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_90px]">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.1"
                                                                                value={toDisplayValue(item.lengthCm, dimensionFactor, 2)}
                                                                                onChange={(event) =>
                                                                                    updatePackage(index, "lengthCm", toBaseValue(event.target.value, dimensionFactor))
                                                                                }
                                                                                className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                placeholder="Length"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.1"
                                                                                value={toDisplayValue(item.widthCm, dimensionFactor, 2)}
                                                                                onChange={(event) =>
                                                                                    updatePackage(index, "widthCm", toBaseValue(event.target.value, dimensionFactor))
                                                                                }
                                                                                className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                                placeholder="Width"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.1"
                                                                                value={toDisplayValue(item.heightCm, dimensionFactor, 2)}
                                                                                onChange={(event) =>
                                                                                    updatePackage(index, "heightCm", toBaseValue(event.target.value, dimensionFactor))
                                                                                }
                                                                                className="col-span-2 h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none md:col-span-1"
                                                                                placeholder="Height"
                                                                            />
                                                                            <select
                                                                                value={dimensionUnit}
                                                                                onChange={(event) => updatePackage(index, "dimensionUnit", event.target.value)}
                                                                                className="col-span-2 h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white pl-3 pr-8 text-sm font-semibold leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none md:col-span-1"
                                                                            >
                                                                                <option value="mm">mm</option>
                                                                                <option value="cm">cm</option>
                                                                                <option value="m">m</option>
                                                                                <option value="yd">yd</option>
                                                                            </select>
                                                                        </div>

                                                                        {(errors[`packages.${index}.lengthCm`] || errors[`packages.${index}.widthCm`] || errors[`packages.${index}.heightCm`]) && (
                                                                            <p className="mt-2 text-sm text-red-500">
                                                                                {errors[`packages.${index}.lengthCm`] || errors[`packages.${index}.widthCm`] || errors[`packages.${index}.heightCm`]}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <label className="mb-2 block text-sm font-medium text-[#0B1739]">Type</label>
                                                                        <select
                                                                            value={data.shipment.shipmentType || ""}
                                                                            onChange={(event) => handleShipmentTypeChange(event.target.value)}
                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                        >
                                                                            <option value="">Select type</option>
                                                                            {SHIPMENT_TYPE_OPTIONS.map((option) => (
                                                                                <option key={`shipment-type-${option.value}`} value={option.value}>
                                                                                    {option.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {data.shipment.shipmentType === "other" && (
                                                                    <div className="mt-4 w-full">
                                                                        <label className="mb-2 block text-sm font-medium text-[#0B1739]">Describe shipment</label>
                                                                        <textarea
                                                                            value={data.shipment.shipmentTypeDescription || ""}
                                                                            onChange={(event) => {
                                                                                markUpstreamChange();
                                                                                setData("shipment", {
                                                                                    ...data.shipment,
                                                                                    shipmentTypeDescription: event.target.value,
                                                                                });
                                                                            }}
                                                                            className="min-h-[96px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 py-3 text-sm text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                            placeholder="Describe the shipment type"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="mt-5 border-t border-[#E4EAF5] pt-5">
                                                                    <p className="text-sm font-semibold text-[#0B1739]">Your Item is...</p>
                                                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={Boolean(item.nonStackable)}
                                                                            onChange={(event) => updatePackage(index, "nonStackable", event.target.checked)}
                                                                            className="h-4 w-4 rounded border border-[#B8C4D8] accent-[#0955AC]"
                                                                        />
                                                                        <span className="text-[16px] leading-none text-[#8A8A8A]">Non-Stackable</span>

                                                                        <div className="group relative">
                                                                            <button
                                                                                type="button"
                                                                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8A8A8A] text-base font-semibold text-[#404040]"
                                                                                aria-label="Why do we need this information"
                                                                            >
                                                                                ?
                                                                            </button>

                                                                            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[340px] rounded-md border border-[#B8B8B8] bg-white p-3 text-left text-sm text-[#333333] shadow-lg group-hover:block group-focus-within:block sm:left-full sm:top-1/2 sm:ml-3 sm:mt-0 sm:-translate-y-1/2">
                                                                                <span className="hidden sm:block absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[#B8B8B8] bg-white" />
                                                                                <p className="font-semibold">Why do we need this information?</p>
                                                                                <p className="mt-2 leading-6">
                                                                                    Please choose "Non-Stackable" when your shipment does not allow other goods to be placed on top of it - for example, if it contains fragile goods or its packaging does not provide a flat, uniform top. For an accurate quote for shipments over 40kg, this specification is required.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {selectedRouteType === "domestic" && (
                                                                        <>
                                                                            <p className="mt-4 text-sm font-semibold text-[#0B1739]">Payment options*</p>
                                                                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#5B6887]">
                                                                                <label className="inline-flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-4 w-4 accent-[#0955AC]"
                                                                                        checked={paymentOptions.all}
                                                                                        onChange={(event) => updatePaymentOptions("all", event.target.checked)}
                                                                                    />
                                                                                    All
                                                                                </label>
                                                                                <label className="inline-flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-4 w-4 accent-[#0955AC]"
                                                                                        checked={paymentOptions.cod}
                                                                                        onChange={(event) => updatePaymentOptions("cod", event.target.checked)}
                                                                                    />
                                                                                    COD
                                                                                </label>
                                                                                <label className="inline-flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-4 w-4 accent-[#0955AC]"
                                                                                        checked={paymentOptions.card}
                                                                                        onChange={(event) => updatePaymentOptions("card", event.target.checked)}
                                                                                    />
                                                                                    Debit / Credit
                                                                                </label>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedRouteType === "international" && isPackageDetailsVisible && (
                                                <div
                                                    ref={index === 0 ? shipmentDimensionSectionRef : null}
                                                    className="space-y-4 pt-11"
                                                >
                                                    {index === 0 && (
                                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                            <div>
                                                                <h2 className="text-2xl font-semibold text-[#0B1739]">Shipment</h2>
                                                                <p className="mt-2 text-sm text-[#5B6887]">
                                                                    Use the quick calculator layout to set package weight, dimensions, and shipment options.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={addPackage}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-[#D6DEEB] bg-[#0955AC] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#04356d] hover:text-white"
                                                            >
                                                                + Add item
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-base font-semibold text-[#0B1739]">
                                                            Shipment {index + 1}
                                                        </h3>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePackage(index)}
                                                            className="text-sm text-red-500 hover:text-red-600 disabled:text-red-300"
                                                            disabled={data.packages.length === 1}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>

                                                    <div
                                                        className="rounded-2xl border border-[#D6DEEB] bg-white px-5 py-6 shadow-sm"
                                                    >
                                                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr_1.2fr] xl:items-start">
                                                            <div>
                                                                <label className="mb-2 block text-sm font-medium text-[#0B1739]">
                                                                    Package weight*
                                                                </label>

                                                                <div className="mt-3 grid grid-cols-[1fr_90px] gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={toDisplayValue(item.weightKg, weightFactor, 2)}
                                                                        onChange={(event) =>
                                                                            updatePackage(index, "weightKg", toBaseValue(event.target.value, weightFactor))
                                                                        }
                                                                        className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                        placeholder="Weight"
                                                                    />
                                                                    <select
                                                                        value={weightUnit}
                                                                        onChange={(event) => updatePackage(index, "weightUnit", event.target.value)}
                                                                        className="h-[52px] w-[90px] rounded-lg border border-[#D6DEEB] bg-white pl-3 pr-8 text-sm font-semibold leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                    >
                                                                        <option value="kg">kg</option>
                                                                        <option value="oz">lb</option>
                                                                    </select>
                                                                </div>
                                                                {errors[`packages.${index}.weightKg`] && (
                                                                    <p className="mt-2 text-sm text-red-500">
                                                                        {errors[`packages.${index}.weightKg`]}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <div className="mb-2 flex items-center gap-2">
                                                                    <label className="block text-sm font-medium text-[#0B1739]">
                                                                        Dimensions *
                                                                    </label>
                                                                </div>

                                                                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_90px]">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.1"
                                                                        value={toDisplayValue(item.lengthCm, dimensionFactor, 2)}
                                                                        onChange={(event) =>
                                                                            updatePackage(index, "lengthCm", toBaseValue(event.target.value, dimensionFactor))
                                                                        }
                                                                        className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                        placeholder="Length"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.1"
                                                                        value={toDisplayValue(item.widthCm, dimensionFactor, 2)}
                                                                        onChange={(event) =>
                                                                            updatePackage(index, "widthCm", toBaseValue(event.target.value, dimensionFactor))
                                                                        }
                                                                        className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none"
                                                                        placeholder="Width"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.1"
                                                                        value={toDisplayValue(item.heightCm, dimensionFactor, 2)}
                                                                        onChange={(event) =>
                                                                            updatePackage(index, "heightCm", toBaseValue(event.target.value, dimensionFactor))
                                                                        }
                                                                        className="col-span-2 h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] placeholder:text-[#8C97B0] focus:border-[#0955AC] focus:outline-none md:col-span-1"
                                                                        placeholder="Height"
                                                                    />
                                                                    <select
                                                                        value={dimensionUnit}
                                                                        onChange={(event) => updatePackage(index, "dimensionUnit", event.target.value)}
                                                                        className="col-span-2 h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white pl-3 pr-8 text-sm font-semibold leading-5 text-[#0B1739] focus:border-[#0955AC] focus:outline-none md:col-span-1"
                                                                    >
                                                                        <option value="mm">mm</option>
                                                                        <option value="cm">cm</option>
                                                                        <option value="m">m</option>
                                                                        <option value="yd">yd</option>
                                                                    </select>
                                                                </div>

                                                                {(errors[`packages.${index}.lengthCm`] || errors[`packages.${index}.widthCm`] || errors[`packages.${index}.heightCm`]) && (
                                                                    <p className="mt-2 text-sm text-red-500">
                                                                        {errors[`packages.${index}.lengthCm`] || errors[`packages.${index}.widthCm`] || errors[`packages.${index}.heightCm`]}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="w-full">
                                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                    <div>
                                                                        <label className="mb-1 block text-sm font-medium text-[#0B1739]">Item quantity</label>
                                                                        <div className="mt-2 flex h-[52px] items-center justify-between rounded-lg border border-[#D6DEEB] bg-white px-2.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updatePackageQuantity(index, -1)}
                                                                                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D6DEEB] text-base font-semibold text-[#0B1739] hover:border-[#0955AC]"
                                                                                aria-label="Decrease item quantity"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className="text-sm font-semibold text-[#0B1739]">{itemQuantity}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updatePackageQuantity(index, 1)}
                                                                                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D6DEEB] text-base font-semibold text-[#0B1739] hover:border-[#0955AC]"
                                                                                aria-label="Increase item quantity"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                        {errors[`packages.${index}.quantity`] && (
                                                                            <p className="mt-2 text-sm text-red-500">
                                                                                {errors[`packages.${index}.quantity`]}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <label className="mb-1 block text-sm font-medium text-[#0B1739]">Type</label>
                                                                        <select
                                                                            value={data.shipment.shipmentType || ""}
                                                                            onChange={(event) => handleShipmentTypeChange(event.target.value)}
                                                                            className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                        >
                                                                            <option value="">Select type</option>
                                                                            {SHIPMENT_TYPE_OPTIONS.map((option) => (
                                                                                <option key={`shipment-type-${option.value}`} value={option.value}>
                                                                                    {option.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 border-t border-[#E4EAF5] pt-4">
                                                            <p className="text-sm font-semibold text-[#0B1739]">Not sure about the sizes?</p>
                                                            <div className={`mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 ${selectedRouteType === "international" ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
                                                                {dimensionAssistPresets.map((preset) => {
                                                                    const hasMatchingBase = itemLength === preset.lengthCm
                                                                        && itemWidth === preset.widthCm;
                                                                    const isActive = preset.prefillHeight
                                                                        ? (hasMatchingBase && itemHeight === preset.heightCm)
                                                                        : hasMatchingBase;

                                                                    return (
                                                                        <button
                                                                            key={`preset-${index}-${preset.id}`}
                                                                            type="button"
                                                                            onClick={() => applyDimensionPreset(index, preset)}
                                                                            className={`relative overflow-hidden rounded-lg border px-3 py-3 text-left transition ${isActive
                                                                                ? "border-[#0955AC] bg-white shadow-[0_2px_8px_rgba(9,85,172,0.12)]"
                                                                                : "border-[#D6DEEB] bg-white hover:border-[#AFC2E0] hover:bg-[#F8FBFF]"
                                                                                }`}
                                                                        >
                                                                            {isActive && (
                                                                                <span className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-br-md bg-[#0955AC] text-[11px] font-bold text-white">
                                                                                    ✓
                                                                                </span>
                                                                            )}
                                                                            <div className="flex items-center gap-3">
                                                                                <img
                                                                                    src={preset.imageSrc}
                                                                                    alt={preset.imageAlt}
                                                                                    className="h-10 w-20 object-contain"
                                                                                />
                                                                                <div>
                                                                                    <p className="text-sm font-semibold text-[#0B1739]">{preset.label}</p>
                                                                                    <p className="text-sm text-[#5B6887]">{preset.sizeLabel}</p>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="mt-5">
                                                                <p className="text-sm font-semibold text-[#0B1739]">Your Item is...</p>
                                                                <div className="mt-3 flex items-center gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(item.nonStackable)}
                                                                        onChange={(event) => updatePackage(index, "nonStackable", event.target.checked)}
                                                                        className="h-4 w-4 rounded border border-[#B8C4D8] accent-[#0955AC]"
                                                                    />
                                                                    <span className="text-[16px] leading-none text-[#8A8A8A]">Non-Stackable</span>

                                                                    <div className="group relative">
                                                                        <button
                                                                            type="button"
                                                                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8A8A8A] text-base font-semibold text-[#404040]"
                                                                            aria-label="Why do we need this information"
                                                                        >
                                                                            ?
                                                                        </button>

                                                                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[340px] rounded-md border border-[#B8B8B8] bg-white p-3 text-left text-sm text-[#333333] shadow-lg group-hover:block group-focus-within:block sm:left-full sm:top-1/2 sm:ml-3 sm:mt-0 sm:-translate-y-1/2">
                                                                            <span className="hidden sm:block absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[#B8B8B8] bg-white" />
                                                                            <p className="font-semibold">Why do we need this information?</p>
                                                                            <p className="mt-2 leading-6">
                                                                                Please choose "Non-Stackable" when your shipment does not allow other goods to be placed on top of it - for example, if it contains fragile goods or its packaging does not provide a flat, uniform top. For an accurate quote for shipments over 40kg, this specification is required.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {data.shipment.shipmentType === "other" && (
                                                            <div className="w-full">
                                                                <label className="mb-2 block text-sm font-medium text-[#0B1739]">Describe shipment</label>
                                                                <textarea
                                                                    value={data.shipment.shipmentTypeDescription || ""}
                                                                    onChange={(event) => {
                                                                        markUpstreamChange();
                                                                        setData("shipment", {
                                                                            ...data.shipment,
                                                                            shipmentTypeDescription: event.target.value,
                                                                        });
                                                                    }}
                                                                    className="h-[52px] w-full rounded-lg border border-[#D6DEEB] bg-white px-4 text-sm text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                                    placeholder="Describe the shipment type"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="mt-5 flex flex-col gap-3 border-t border-[#E4EAF5] pt-5 text-sm text-[#0B1739]">
                                                            <label className="inline-flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-5 rounded border border-[#B8C4D8] accent-[#0955AC]"
                                                                    checked={Boolean(data.shipment?.containsDangerousGoods)}
                                                                    onChange={(event) => updateShipmentPreference("containsDangerousGoods", event.target.checked)}
                                                                />
                                                                Shipment contains dangerous goods
                                                            </label>

                                                            <label className="inline-flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-5 rounded border border-[#B8C4D8] accent-[#0955AC]"
                                                                    checked={Boolean(data.shipment?.containsExclusivelyDocuments)}
                                                                    onChange={(event) => updateShipmentPreference("containsExclusivelyDocuments", event.target.checked)}
                                                                />
                                                                Shipment contains exclusively documents
                                                            </label>
                                                        </div>

                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {showQuotes && hasRequiredDetails && (
                            <section
                                id="courier-quotes-section"
                                ref={quotesSectionRef}
                                className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] px-6 py-8"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-[#0B1739]">
                                            Courier service quotes
                                        </h2>
                                        <p className="mt-2 text-sm text-[#5B6887]">
                                            {packageMetrics.readyForQuote
                                                ? "Select a service per package. Use tabs to switch."
                                                : `Provide quantity and weight for each package to generate live carrier rates.`}
                                        </p>
                                    </div>

                                    {packageMetrics.totalWeight > 0 && (
                                        <div className="inline-flex w-fit max-w-full flex-col gap-4 rounded-xl border border-[#D6DEEB] bg-[#EEF3FC] px-6 py-4 text-sm text-[#0B1739] md:flex-row md:items-center">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[#0955AC]">
                                                    Shipment summary
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-4">
                                                    <span>
                                                        Packages: <strong>{packageMetrics.totalPackages}</strong>
                                                    </span>
                                                    <span>
                                                        Weight: <strong>{packageMetrics.totalWeight.toFixed(2)} kg</strong>
                                                    </span>
                                                    <span>
                                                        Billable weight: <strong>{packageMetrics.billableWeight.toFixed(2)} kg</strong>
                                                    </span>
                                                    {packageMetrics.volumetricWeight > packageMetrics.totalWeight && (
                                                        <span>
                                                            Volumetric: <strong>{packageMetrics.volumetricWeight.toFixed(2)} kg</strong>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {packageMetrics.requiresSpecialHandling && (
                                                <div className="rounded-lg bg-[#F8E7D8] px-4 py-2 text-xs font-medium text-[#7B3F00]">
                                                    Includes freight or temperature-controlled cargo
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {packageMetrics.readyForQuote && (
                                        <button
                                            type="button"
                                            onClick={toggleCurrency}
                                            className="rounded-lg border border-[#E3EAF5] bg-white px-4 py-2 text-xs font-semibold text-[#5B6887] shadow-sm hover:bg-[#F9FBFF] hover:border-[#0955AC] hover:text-[#0955AC] transition-all duration-200 cursor-pointer"
                                            title={`Click to convert to ${displayCurrency === 'USD' ? 'LKR' : 'USD'}`}
                                        >
                                            Rates in {displayCurrency} {displayCurrency === 'LKR' && '(≈ 1 USD = 325 LKR)'}
                                            <span className="ml-2 text-[10px] opacity-60">↻</span>
                                        </button>
                                    )}
                                </div>

                                {quoteMatrix.length === 0 ? (
                                    <div className="mt-6 rounded-lg border border-dashed border-[#B8C5E0] bg-white px-5 py-6 text-sm text-[#5B6887]">
                                        {incompletePackages > 0
                                            ? `Add quantity and weight for all packages (${incompletePackages} incomplete) to view available ${selectedRouteType} courier services.`
                                            : `Add package details to view available ${selectedRouteType} courier services.`}
                                    </div>
                                ) : (
                                    <div ref={quotesTableRef} className="mt-8 space-y-8">
                                        {/* Package Tabs */}
                                        {quoteMatrix.length > 1 && (
                                            <div className="border-b border-[#E8F0FE]">
                                                <nav className="flex space-x-8 overflow-x-auto">
                                                    {quoteMatrix.map((packageQuotes) => {
                                                        const isActive = activePackageIndex === packageQuotes.packageIndex;
                                                        const hasSelection = data.packages[packageQuotes.packageIndex]?.courierProvider;

                                                        return (
                                                            <button
                                                                key={packageQuotes.packageIndex}
                                                                type="button"
                                                                onClick={() => setActivePackageIndex(packageQuotes.packageIndex)}
                                                                className={`flex items-center gap-3 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${isActive
                                                                    ? 'border-[#0955AC] text-[#0955AC]'
                                                                    : 'border-transparent text-[#5B6887] hover:border-[#D6DEEB] hover:text-[#0B1739]'
                                                                    }`}
                                                            >
                                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isActive
                                                                    ? 'bg-[#0955AC] text-white'
                                                                    : hasSelection
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-[#E8F0FE] text-[#5B6887]'
                                                                    }`}>
                                                                    {hasSelection && !isActive ? (
                                                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    ) : (
                                                                        packageQuotes.packageIndex + 1
                                                                    )}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium">
                                                                        {packageQuotes.packageInfo.label}
                                                                    </div>
                                                                    <div className="text-xs text-[#6B7893]">
                                                                        {packageQuotes.packageInfo.weight.toFixed(1)}kg
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </nav>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr] xl:items-start">
                                            <aside className="rounded-xl border border-[#E3EAF5] bg-white  p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="mt-1 text-sm font-semibold text-[#0B1739]">Refine courier quotes</h3>
                                                        <p className="mt-1 text-xs text-[#6B7893]">Filters apply to the active package.</p>
                                                    </div>
                                                    {hasActiveQuoteFilters && (
                                                        <span className="rounded-full bg-[#E6F3FF] px-2 py-1 text-[10px] font-semibold text-[#0955AC]">Active</span>
                                                    )}
                                                </div>

                                                <div className="mt-4 space-y-4">
                                                    <div>
                                                        <label className="mb-2 block text-xs font-medium text-[#0B1739]">Provider search</label>
                                                        <input
                                                            type="text"
                                                            value={quoteFilters.providerSearch}
                                                            onChange={(event) => setQuoteFilters((previous) => ({
                                                                ...previous,
                                                                providerSearch: event.target.value,
                                                            }))}
                                                            className="h-[44px] w-full rounded-lg border border-[#D6DEEB] bg-white px-3 text-sm text-[#0B1739] focus:border-[#0955AC] focus:outline-none"
                                                            placeholder="Search provider or coverage"
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <label className="text-xs font-medium text-[#0B1739]">Max price ({displayCurrency})</label>
                                                            <span className="text-xs font-bold text-[#0955AC]">
                                                                {quoteFilters.maxPrice ? currencyFormatter.format(Number(quoteFilters.maxPrice)) : 'Any'}
                                                            </span>
                                                        </div>
                                                        {(() => {
                                                            const activePackageQuotesForSlider = quoteMatrix.find(item => item.packageIndex === activePackageIndex) || quoteMatrix[0];
                                                            const maxAvailablePrice = activePackageQuotesForSlider ? Math.ceil(Math.max(10, 0, ...activePackageQuotesForSlider.providers.flatMap(p => p.tiers.map(t => getDisplayAmount(Number(t.price) || 0))))) : 1000;
                                                            return (
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max={maxAvailablePrice}
                                                                    step="1"
                                                                    value={quoteFilters.maxPrice || maxAvailablePrice}
                                                                    onChange={(event) => {
                                                                        const val = Number(event.target.value);
                                                                        setQuoteFilters((previous) => ({
                                                                            ...previous,
                                                                            minPrice: "0",
                                                                            maxPrice: val >= maxAvailablePrice ? "" : String(val),
                                                                        }));
                                                                    }}
                                                                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E3EAF5] accent-[#0955AC]"
                                                                />
                                                            );
                                                        })()}
                                                        <div className="mt-1 flex justify-between text-[10px] text-[#6B7893]">
                                                            <span>0</span>
                                                            <span>Max</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-xs font-medium text-[#0B1739]">Service tiers</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {QUOTE_TIER_OPTIONS.map((tier) => (
                                                                <label
                                                                    key={`quote-filter-tier-${tier.id}`}
                                                                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${quoteFilters.tiers?.[tier.id]
                                                                        ? 'border-[#0955AC] text-[#0B1739]'
                                                                        : 'border-[#D6DEEB] text-[#5B6887]'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(quoteFilters.tiers?.[tier.id])}
                                                                        onChange={(event) => setQuoteFilters((previous) => ({
                                                                            ...previous,
                                                                            tiers: {
                                                                                ...previous.tiers,
                                                                                [tier.id]: event.target.checked,
                                                                            },
                                                                        }))}
                                                                        className="h-4 w-4 accent-[#0955AC]"
                                                                    />
                                                                    {tier.label}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#E3EAF5] pt-3">
                                                    <button
                                                        type="button"
                                                        onClick={resetQuoteFilters}
                                                        className="rounded-lg border border-[#D6DEEB] px-3 py-1.5 text-[11px] font-semibold text-[#5B6887] transition hover:border-[#0955AC] hover:text-[#0955AC]"
                                                    >
                                                        Reset
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAppliedQuoteFilters(quoteFilters)}
                                                        className="rounded-lg bg-[#0955AC] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#07468f]"
                                                    >
                                                        Filter
                                                    </button>
                                                </div>
                                            </aside>

                                            <div>
                                                {/* Inline Comparison Table — Compact */}
                                                {(() => {
                                                    const activePackageQuotes = quoteMatrix.find(item => item.packageIndex === activePackageIndex) || quoteMatrix[0];
                                                    if (!activePackageQuotes) return null;

                                                    const TIER_IDS = QUOTE_TIER_OPTIONS.map((tier) => tier.id);
                                                    const TIER_META = Object.fromEntries(
                                                        QUOTE_TIER_OPTIONS.map((tier) => [tier.id, { label: tier.label, color: tier.color }])
                                                    );

                                                    const domesticProviders = activePackageQuotes.providers.filter(p => p.category === 'domestic');
                                                    const internationalProviders = activePackageQuotes.providers.filter(p => p.category === 'international');
                                                    const currentPackage = data.packages[activePackageQuotes.packageIndex];

                                                    const cheapestByTierInGroup = (providers, tierId) => {
                                                        const prices = providers
                                                            .map(p => (p.tiers.find(t => t.id === tierId) || {}).price)
                                                            .filter(v => v !== undefined);
                                                        return prices.length ? Math.min(...prices) : Infinity;
                                                    };

                                                    const renderCategoryTable = (providers, categoryLabel, accentColor, accentBg) => {
                                                        if (!providers.length) return null;

                                                        const selectedTierIds = QUOTE_TIER_OPTIONS
                                                            .filter((tier) => appliedQuoteFilters.tiers?.[tier.id])
                                                            .map((tier) => tier.id);
                                                        const visibleTierIds = selectedTierIds.length ? selectedTierIds : TIER_IDS;
                                                        const searchValue = String(appliedQuoteFilters.providerSearch || "").trim().toLowerCase();
                                                        const minPriceValue = appliedQuoteFilters.minPrice !== "" ? Number(appliedQuoteFilters.minPrice) : null;
                                                        const maxPriceValue = appliedQuoteFilters.maxPrice !== "" ? Number(appliedQuoteFilters.maxPrice) : null;

                                                        const handleSelectService = (providerId, tierId) => {
                                                            const updatedPackages = [...data.packages];
                                                            updatedPackages[activePackageQuotes.packageIndex] = {
                                                                ...updatedPackages[activePackageQuotes.packageIndex],
                                                                courierProvider: providerId,
                                                                serviceLevel: tierId,
                                                            };
                                                            setData('packages', updatedPackages);
                                                        };

                                                        const handleSelectKeyDown = (event, providerId, tierId) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault();
                                                                handleSelectService(providerId, tierId);
                                                            }
                                                        };

                                                        const getProviderBestPrice = (provider, tierIds) => {
                                                            if (!provider?.tiers?.length) return Infinity;
                                                            return provider.tiers.reduce((best, tier) => {
                                                                if (!tierIds.includes(tier.id)) {
                                                                    return best;
                                                                }
                                                                const priceValue = Number(tier?.price);
                                                                return Number.isFinite(priceValue) ? Math.min(best, priceValue) : best;
                                                            }, Infinity);
                                                        };

                                                        const filteredProviders = providers.filter((provider) => {
                                                            if (!provider) return false;
                                                            const providerLabel = `${provider.name || ""} ${provider.coverage || ""}`.toLowerCase();
                                                            if (searchValue && !providerLabel.includes(searchValue)) {
                                                                return false;
                                                            }

                                                            const hasVisibleTier = Array.isArray(provider.tiers)
                                                                && provider.tiers.some((tier) => visibleTierIds.includes(tier.id));
                                                            if (!hasVisibleTier) {
                                                                return false;
                                                            }

                                                            const bestPrice = getProviderBestPrice(provider, visibleTierIds);
                                                            if (!Number.isFinite(bestPrice)) {
                                                                return false;
                                                            }

                                                            const bestDisplayPrice = getDisplayAmount(bestPrice);
                                                            if (Number.isFinite(minPriceValue) && bestDisplayPrice < minPriceValue) {
                                                                return false;
                                                            }
                                                            if (Number.isFinite(maxPriceValue) && bestDisplayPrice > maxPriceValue) {
                                                                return false;
                                                            }

                                                            return true;
                                                        });

                                                        if (!filteredProviders.length) {
                                                            return (
                                                                <div className="rounded-xl border border-[#E8F0FE] bg-white px-4 py-6 text-sm text-[#5B6887]">
                                                                    No providers match the selected filters.
                                                                </div>
                                                            );
                                                        }

                                                        const cheapest = Object.fromEntries(
                                                            visibleTierIds.map((id) => [id, cheapestByTierInGroup(filteredProviders, id)])
                                                        );
                                                        const sortedProviders = [...filteredProviders].sort((a, b) => {
                                                            const aBest = getProviderBestPrice(a, visibleTierIds);
                                                            const bBest = getProviderBestPrice(b, visibleTierIds);
                                                            if (aBest !== bBest) return aBest - bBest;
                                                            return (a?.name || "").localeCompare(b?.name || "");
                                                        });

                                                        return (
                                                            <div className="rounded-xl border border-[#E8F0FE] overflow-hidden">
                                                                {/* ── Mobile: provider card, tier rows ── */}
                                                                <div className="sm:hidden max-h-[420px] overflow-y-auto divide-y divide-[#F0F4F8]">
                                                                    {sortedProviders.map((provider) => (
                                                                        <div key={provider.id} className="bg-white">
                                                                            {/* Provider header strip */}
                                                                            <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: accentBg }}>
                                                                                {provider.logo ? (
                                                                                    <img src={provider.logo} alt={provider.name} className="h-5 w-auto max-w-[38px] object-contain" loading="lazy" />
                                                                                ) : (
                                                                                    <div className="flex h-5 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: provider.brandColor }}>
                                                                                        {provider.name.slice(0, 2).toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <div className="text-xs font-semibold text-[#0B1739] truncate flex items-center gap-1.5">
                                                                                        {provider.name}
                                                                                        <div className="flex gap-1">
                                                                                            {provider.paymentOptions?.cod && (
                                                                                                <span className="bg-amber-100 text-amber-700 text-[8px] px-1 rounded font-bold uppercase tracking-tight">COD</span>
                                                                                            )}
                                                                                            {provider.paymentOptions?.card && (
                                                                                                <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded font-bold uppercase tracking-tight">Card</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-[10px] text-[#6B7893] truncate">{provider.coverage}</div>
                                                                                </div>
                                                                            </div>
                                                                            {/* Tier rows */}
                                                                            <div className="divide-y divide-[#F7F9FC]">
                                                                                {visibleTierIds.map(tierId => {
                                                                                    const tierMeta = TIER_META[tierId] || { label: tierId, color: "text-[#0B1739]" };
                                                                                    const tier = provider.tiers.find(t => t.id === tierId);
                                                                                    if (!tier) return null;
                                                                                    const isBest = tier.price === cheapest[tierId];
                                                                                    const diff = tier.price - cheapest[tierId];
                                                                                    const isSelected =
                                                                                        currentPackage?.courierProvider === provider.id &&
                                                                                        currentPackage?.serviceLevel === tierId;
                                                                                    return (
                                                                                        <div
                                                                                            key={tierId}
                                                                                            role="button"
                                                                                            tabIndex={0}
                                                                                            onClick={() => handleSelectService(provider.id, tierId)}
                                                                                            onKeyDown={(event) => handleSelectKeyDown(event, provider.id, tierId)}
                                                                                            className={`flex w-full items-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:ring-offset-1 ${isSelected
                                                                                                ? 'bg-[#0955AC]'
                                                                                                : isBest
                                                                                                    ? 'bg-emerald-50'
                                                                                                    : 'bg-white'
                                                                                                }`}
                                                                                        >
                                                                                            <div className="flex min-w-0 flex-1 items-center px-3 py-2 text-left">
                                                                                                {/* Tier label — fixed width */}
                                                                                                <span className={`text-[11px] font-semibold shrink-0 w-[62px] ${isSelected ? 'text-white' : tierMeta.color}`}>
                                                                                                    {tierMeta.label}
                                                                                                </span>
                                                                                                {/* Spacer */}
                                                                                                <span className="flex-1" />
                                                                                                {/* Price + status stacked, fixed width */}
                                                                                                <div className="shrink-0 text-right ml-2 w-[90px]">
                                                                                                    <div className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-[#0B1739]'}`}>
                                                                                                        {formatCurrency(tier.price)}
                                                                                                    </div>
                                                                                                    {isSelected ? (
                                                                                                        <div className="text-[9px] text-white/70">✓ Selected</div>
                                                                                                    ) : isBest ? (
                                                                                                        <div className="text-[9px] font-bold text-emerald-700">● best price</div>
                                                                                                    ) : diff > 0 ? (
                                                                                                        <div className="text-[9px] text-[#8C97B0]">+{formatCurrency(diff)}</div>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(event) => {
                                                                                                    event.stopPropagation();
                                                                                                    openServiceDetailsModal(provider, tier, {
                                                                                                        isBest,
                                                                                                        diff,
                                                                                                        packageIndex: activePackageQuotes.packageIndex,
                                                                                                    });
                                                                                                }}
                                                                                                className={`mr-2 rounded border px-2 py-0.5 text-[9px] font-semibold transition ${isSelected
                                                                                                    ? 'border-white/50 text-white hover:bg-white/10'
                                                                                                    : 'border-[#D6DEEB] text-[#5B6887] hover:border-[#0955AC] hover:text-[#0955AC]'
                                                                                                    }`}
                                                                                            >
                                                                                                See more
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* ── Desktop: compact table ── */}
                                                                <div className="hidden sm:block">
                                                                    <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                                                                        <table className="w-full border-collapse text-xs">
                                                                            <thead className="sticky top-0 z-10" style={{ backgroundColor: accentBg }}>
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left text-[#0B1739] font-semibold w-40">Provider</th>
                                                                                    {visibleTierIds.map(id => (
                                                                                        <th key={id} className={`px-2 py-2 text-center font-semibold ${TIER_META[id]?.color || "text-[#0B1739]"}`}>
                                                                                            {TIER_META[id]?.label || id}
                                                                                        </th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {sortedProviders.map((provider, rowIdx) => (
                                                                                    <tr key={provider.id} className={`transition-colors hover:bg-[#F9FBFF] ${rowIdx < sortedProviders.length - 1 ? 'border-b border-[#F0F4F8]' : ''}`}>
                                                                                        <td className="px-3 py-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                {provider.logo ? (
                                                                                                    <img src={provider.logo} alt={provider.name} className="h-5 w-auto max-w-[40px] object-contain" loading="lazy" />
                                                                                                ) : (
                                                                                                    <div className="flex h-5 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white" style={{ backgroundColor: provider.brandColor }}>
                                                                                                        {provider.name.slice(0, 2).toUpperCase()}
                                                                                                    </div>
                                                                                                )}
                                                                                                <div className="min-w-0">
                                                                                                    <div className="font-semibold text-[#0B1739] truncate leading-tight flex items-center gap-1.5">
                                                                                                        {provider.name}
                                                                                                        <div className="flex gap-1">
                                                                                                            {provider.paymentOptions?.cod && (
                                                                                                                <span className="bg-amber-100 text-amber-700 text-[8px] px-1 rounded font-bold uppercase tracking-tight">COD</span>
                                                                                                            )}
                                                                                                            {provider.paymentOptions?.card && (
                                                                                                                <span className="bg-blue-100 text-blue-700 text-[8px] px-1 rounded font-bold uppercase tracking-tight">Card</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="text-[10px] text-[#6B7893] truncate">{provider.coverage}</div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                        {visibleTierIds.map(tierId => {
                                                                                            const tier = provider.tiers.find(t => t.id === tierId);
                                                                                            if (!tier) return <td key={tierId} className="px-2 py-2 text-center text-[#C5CDE0]">—</td>;
                                                                                            const isBest = tier.price === cheapest[tierId];
                                                                                            const diff = tier.price - cheapest[tierId];
                                                                                            const isSelected =
                                                                                                currentPackage?.courierProvider === provider.id &&
                                                                                                currentPackage?.serviceLevel === tierId;
                                                                                            return (
                                                                                                <td key={tierId} className="px-1.5 py-1.5 text-center">
                                                                                                    <div
                                                                                                        role="button"
                                                                                                        tabIndex={0}
                                                                                                        title={`${provider.name} — ${TIER_META[tierId]?.label || tierId} · ${tier.eta}`}
                                                                                                        onClick={() => handleSelectService(provider.id, tierId)}
                                                                                                        onKeyDown={(event) => handleSelectKeyDown(event, provider.id, tierId)}
                                                                                                        className={`inline-flex w-full flex-col items-center rounded-lg border px-1.5 py-1.5 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0955AC] focus:ring-offset-1 ${isSelected
                                                                                                            ? 'border-[#0955AC] bg-[#0955AC] shadow-sm'
                                                                                                            : isBest
                                                                                                                ? 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100'
                                                                                                                : 'border-[#E8F0FE] bg-white hover:border-[#0955AC]/30 hover:bg-[#F9FBFF]'
                                                                                                            }`}
                                                                                                    >
                                                                                                        <div className="flex w-full flex-col items-center">
                                                                                                            <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-[#0B1739]'}`}>
                                                                                                                {formatCurrency(tier.price)}
                                                                                                            </span>
                                                                                                            <span className={`text-[9px] leading-tight ${isSelected ? 'text-white/70' : 'text-[#6B7893]'}`}>
                                                                                                                {tier.eta}
                                                                                                            </span>
                                                                                                            {isSelected ? (
                                                                                                                <span className="text-[9px] text-white/80">✓</span>
                                                                                                            ) : isBest ? (
                                                                                                                <span className="text-[9px] font-bold text-emerald-700">best</span>
                                                                                                            ) : diff > 0 ? (
                                                                                                                <span className="text-[9px] text-[#8C97B0]">+{formatCurrency(diff)}</span>
                                                                                                            ) : null}
                                                                                                        </div>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(event) => {
                                                                                                                event.stopPropagation();
                                                                                                                openServiceDetailsModal(provider, tier, {
                                                                                                                    isBest,
                                                                                                                    diff,
                                                                                                                    packageIndex: activePackageQuotes.packageIndex,
                                                                                                                });
                                                                                                            }}
                                                                                                            className={`mt-1 rounded border px-1.5 py-[1px] text-[9px] font-semibold transition ${isSelected
                                                                                                                ? 'border-white/50 text-white hover:bg-white/10'
                                                                                                                : 'border-[#D6DEEB] text-[#5B6887] hover:border-[#0955AC] hover:text-[#0955AC]'
                                                                                                                }`}
                                                                                                        >
                                                                                                            See more
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            );
                                                                                        })}
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    };

                                                    const hasDomestic = domesticProviders.length > 0;
                                                    const hasInternational = internationalProviders.length > 0;
                                                    const preferredCategory = selectedRouteType === 'international' ? 'international' : 'domestic';
                                                    const currentCategory = preferredCategory === 'domestic'
                                                        ? (hasDomestic ? 'domestic' : null)
                                                        : (hasInternational ? 'international' : null);

                                                    return (
                                                        <div className="space-y-3">
                                                            {currentCategory === 'domestic' && renderCategoryTable(domesticProviders, 'Domestic', '#2563EB', '#EFF6FF')}
                                                            {currentCategory === 'international' && renderCategoryTable(internationalProviders, 'International', '#0955AC', '#F0F7FF')}
                                                            {!currentCategory && (
                                                                <div className="rounded-lg border border-dashed border-[#B8C5E0] bg-white px-5 py-6 text-sm text-[#5B6887]">
                                                                    No {selectedRouteType} courier providers are currently available for this package.
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Selected Services Summary */}
                                {selectedQuotes.length > 0 && (
                                    <div className="mt-8 space-y-4">
                                        <h3 className="text-lg font-semibold text-[#0B1739]">Selected Services Summary</h3>
                                        <div className="w-fullgrid grid-cols-1 gap-3 md:grid-cols-2">
                                            {selectedQuotes.map((quote) => (
                                                <div key={quote.packageIndex} className="rounded-lg border border-[#D6DEEB] bg-white p-4 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {quote.provider.logo && (
                                                                <img
                                                                    src={quote.provider.logo}
                                                                    alt={`${quote.provider.name} logo`}
                                                                    className="h-6 w-auto object-contain"
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-[#0B1739]">{quote.packageInfo.label}</div>
                                                                <div className="text-xs text-[#6B7893]">
                                                                    {quote.provider.name} · {quote.tier.label}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-[#0B1739]">
                                                                {formatCurrency(quote.tier.price)}
                                                            </div>
                                                            <div className="text-xs text-[#6B7893]">{quote.tier.eta}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="rounded-lg border-2 border-[#0955AC] bg-gradient-to-r from-[#F0F7FF] to-[#E6F3FF] p-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-semibold text-[#0B1739]">Total Shipping Cost</span>
                                                <span className="text-2xl font-bold text-[#0955AC]">
                                                    {formatCurrency(selectedQuotes.reduce((total, quote) => total + quote.tier.price, 0))}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {showDetails && (
                                                <button
                                                    type="button"
                                                    onClick={handleGetQuoteOnly}
                                                    disabled={!isReadyForQuoteOnly || isPlacing}
                                                    className={`rounded-lg border border-[#0955AC] bg-white px-4 py-2 text-sm font-semibold text-[#0955AC] transition ${!isReadyForQuoteOnly || isPlacing ? "cursor-not-allowed opacity-50" : "hover:bg-[#EEF5FF]"}`}
                                                >
                                                    Get a quote
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {showDetails && (
                            <section
                                ref={detailsSectionRef}
                                className="rounded-2xl border border-[#E3EAF5] bg-white px-6 py-8 shadow-sm"
                            >
                                {stepFlowNotice && !showSummary && (
                                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                        {stepFlowNotice}
                                    </div>
                                )}
                                <DetailsForm
                                    inline
                                    renderAsForm={false}
                                    showBackLink={false}
                                    scrollOnSubmit={false}
                                    packageDetailsReadOnly
                                    onSubmitOverride={handleContinueToSummary}
                                    hideSubmit={showSummary}
                                    formStateOverride={{
                                        data,
                                        setData,
                                        post,
                                        processing: processing || isSummaryLoading,
                                        errors,
                                    }}
                                    pagePropsOverride={{
                                        formData: data,
                                        countries,
                                        packageTypes,
                                        favoriteRecipients: props.favoriteRecipients || [],
                                        favoriteSenders: props.favoriteSenders || [],
                                        senderProfile: props.senderProfile || null,
                                        flowRoutes,
                                        errors: errors || {},
                                    }}
                                />
                            </section>
                        )}

                        {showSummary && (
                            <section
                                ref={summarySectionRef}
                                className="rounded-2xl border border-[#E3EAF5] bg-white px-6 py-8 shadow-sm"
                            >
                                <div className="mb-4">
                                    <h2 className="text-xl font-semibold text-[#0B1739]">Review & confirm</h2>
                                    <p className="mt-1 text-sm text-[#5B6887]">
                                        Review the shipment summary and confirm your booking details.
                                    </p>
                                </div>
                                <SummaryView
                                    inline
                                    showEditLinks={false}
                                    showHero={false}
                                    formStateOverride={data}
                                    pagePropsOverride={{
                                        formData: data,
                                        pricingPreview: null,
                                        flowRoutes,
                                        errors: errors || {},
                                    }}
                                />
                            </section>
                        )}

                        {serviceDetailsModal && typeof document !== "undefined" && createPortal(
                            <div
                                className="fixed inset-0 z-[2147483647] overflow-y-auto bg-[#0B1739]/55 p-4 sm:p-6"
                                onClick={closeServiceDetailsModal}
                            >
                                <div className="flex min-h-full items-center justify-center">
                                    <div
                                        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6887]">
                                                    Service details
                                                </p>
                                                <h3 className="mt-1 text-lg font-semibold text-[#0B1739]">
                                                    {serviceDetailsModal.providerName} · {serviceDetailsModal.tierLabel}
                                                </h3>
                                                <p className="mt-1 text-xs text-[#6B7893]">
                                                    {serviceDetailsModal.providerCategory === "international" ? "International" : "Domestic"} service
                                                    {serviceDetailsModal.packageIndex !== null ? ` for Package ${serviceDetailsModal.packageIndex + 1}` : ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={closeServiceDetailsModal}
                                                className="rounded-lg border border-[#D6DEEB] px-3 py-1 text-xs font-semibold text-[#5B6887] transition hover:border-[#0955AC] hover:text-[#0955AC]"
                                            >
                                                Close
                                            </button>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-lg border border-[#E3EAF5] bg-[#F9FBFF] px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-[#6B7893]">Rate</p>
                                                <p className="text-sm font-semibold text-[#0B1739]">{formatCurrency(serviceDetailsModal.price)}</p>
                                                {serviceDetailsModal.isBest && (
                                                    <p className="text-[11px] font-semibold text-emerald-700">Best price in this tier</p>
                                                )}
                                                {!serviceDetailsModal.isBest && serviceDetailsModal.diff !== null && serviceDetailsModal.diff > 0 && (
                                                    <p className="text-[11px] text-[#6B7893]">+{formatCurrency(serviceDetailsModal.diff)} vs best</p>
                                                )}
                                            </div>
                                            <div className="rounded-lg border border-[#E3EAF5] bg-[#F9FBFF] px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-[#6B7893]">ETA</p>
                                                <p className="text-sm font-semibold text-[#0B1739]">{serviceDetailsModal.tierEta}</p>
                                                <p className="text-[11px] text-[#6B7893]">Cutoff: {serviceDetailsModal.cutoff}</p>
                                            </div>
                                        </div>

                                        <div className="mt-3 rounded-lg border border-[#E3EAF5] bg-white px-3 py-2 text-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-[#6B7893]">Coverage</p>
                                            <p className="mt-1 text-[#0B1739]">{serviceDetailsModal.coverage}</p>
                                        </div>

                                        <div className="mt-3 rounded-lg border border-[#E3EAF5] bg-white px-3 py-2 text-sm">
                                            <p className="text-[11px] uppercase tracking-wide text-[#6B7893]">Service description</p>
                                            <p className="mt-1 text-[#0B1739]">{serviceDetailsModal.tierDescription}</p>
                                        </div>

                                        {serviceDetailsModal.breakdown && (
                                            <div className="mt-3 rounded-lg border border-[#E3EAF5] bg-white px-3 py-2 text-sm">
                                                <p className="text-[11px] uppercase tracking-wide text-[#6B7893]">Price breakdown</p>
                                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                    <p className="text-[#0B1739]">Base: <span className="font-semibold">{formatCurrency(serviceDetailsModal.breakdown.base || 0)}</span></p>
                                                    <p className="text-[#0B1739]">Weight: <span className="font-semibold">{formatCurrency(serviceDetailsModal.breakdown.weight || 0)}</span></p>
                                                    <p className="text-[#0B1739]">Adjustments: <span className="font-semibold">{formatCurrency(serviceDetailsModal.breakdown.adjustments || 0)}</span></p>
                                                </div>
                                            </div>
                                        )}

                                        {Array.isArray(serviceDetailsModal.badges) && serviceDetailsModal.badges.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {serviceDetailsModal.badges.map((badge) => (
                                                    <span
                                                        key={`badge-${badge}`}
                                                        className="rounded-full border border-[#D6DEEB] bg-[#F9FBFF] px-3 py-1 text-[11px] font-medium text-[#5B6887]"
                                                    >
                                                        {badge}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#E3EAF5] pt-4">
                                            <button
                                                type="button"
                                                onClick={closeServiceDetailsModal}
                                                className="rounded-lg border border-[#D6DEEB] px-3 py-2 text-xs font-semibold text-[#5B6887] transition hover:border-[#0955AC] hover:text-[#0955AC]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSelectServiceFromModal}
                                                disabled={
                                                    !serviceDetailsModal.providerId
                                                    || !serviceDetailsModal.serviceLevel
                                                    || serviceDetailsModal.packageIndex === null
                                                }
                                                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${!serviceDetailsModal.providerId
                                                    || !serviceDetailsModal.serviceLevel
                                                    || serviceDetailsModal.packageIndex === null
                                                    ? "cursor-not-allowed bg-[#9BB9E3]"
                                                    : "bg-[#0955AC] hover:bg-[#0a4b93]"
                                                    }`}
                                            >
                                                Select service
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>,
                            document.body,
                        )}

                        {routeSwitchPrompt && typeof document !== "undefined" && createPortal(
                            <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/50 p-4">
                                <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                                    <h3 className="text-lg font-semibold text-[#0B1739]">Switch route type?</h3>
                                    <p className="mt-1 text-sm text-[#5B6887]">
                                        Switching to {routeSwitchPrompt.nextRouteType} will reset the form. Continue?
                                    </p>
                                    <div className="mt-4 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCancelRouteSwitch}
                                            className="rounded-lg border border-[#D6DEEB] px-3 py-2 text-xs font-semibold text-[#5B6887] transition hover:border-[#0955AC] hover:text-[#0955AC]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmRouteSwitch}
                                            className="rounded-lg bg-[#0955AC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a4b93]"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            </div>,
                            document.body,
                        )}

                        <p className="text-center text-xs text-[#5B6887]">
                            Rates are indicative and will be finalized once pickup and delivery details are confirmed; carrier fuel and customs surcharges may vary by route.
                        </p>

                        {!showDetails && (
                            <div className="mt-8 flex flex-col items-center gap-3">
                                {stepFlowNotice && (
                                    <div className="w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                        {stepFlowNotice}
                                    </div>
                                )}
                                {shouldShowDescribeShipmentCta ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={revealShipmentDetailsSection}
                                            disabled={!hasLocationDetailsForDescribe}
                                            className={`w-full max-w-sm rounded-lg bg-[#0955AC] px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${!hasLocationDetailsForDescribe ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#0a4b93]'
                                                }`}
                                        >
                                            Continue to Shipment
                                        </button>
                                        {!hasLocationDetailsForDescribe && (
                                            <p className="text-xs text-[#D14343]">
                                                Complete From and To location details to continue.
                                            </p>
                                        )}
                                    </>
                                ) : !showQuotes ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleContinueToQuotes}
                                            disabled={!hasRequiredDetails || isPlacing}
                                            className={`w-full max-w-sm rounded-lg bg-[#0955AC] px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${!hasRequiredDetails || isPlacing ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#0a4b93]'
                                                }`}
                                        >
                                            Continue to Courier service quotes
                                        </button>
                                        {!hasRequiredDetails && (
                                            <p className="text-xs text-[#D14343]">
                                                {selectedRouteType === 'domestic' && !hasPaymentOption
                                                    ? 'Select at least one payment option to continue.'
                                                    : 'Complete all required fields before continuing.'}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={handleGetQuoteOnly}
                                                disabled={!isReadyForQuoteOnly || isPlacing}
                                                className={`rounded-lg border border-[#0955AC] bg-white px-6 py-3 text-center text-sm font-semibold text-[#0955AC] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${!isReadyForQuoteOnly || isPlacing ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#EEF5FF]'
                                                    }`}
                                            >
                                                Get a quote
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleContinueToDetails}
                                                disabled={!isReadyToPlace || isPlacing}
                                                className={`rounded-lg bg-[#0955AC] px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${!isReadyToPlace || isPlacing ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#0a4b93]'
                                                    }`}
                                            >
                                                {isPlacing ? 'Preparing details...' : 'Continue'}
                                            </button>
                                        </div>
                                        {!isReadyToPlace && (
                                            <p className="text-xs text-[#D14343]">
                                                {hasRequiredDetails
                                                    ? 'Select a courier service for each package to continue.'
                                                    : selectedRouteType === 'domestic' && !hasPaymentOption
                                                        ? 'Select at least one payment option to continue.'
                                                        : 'Complete all required fields before continuing.'}
                                            </p>
                                        )}
                                        {quoteOnlyMessage && (
                                            <p className="text-xs text-[#0B7A44]">
                                                {quoteOnlyMessage}
                                            </p>
                                        )}
                                    </>
                                )}
                                {submitError && (
                                    <p className="text-xs text-[#D14343]">
                                        {submitError}
                                    </p>
                                )}
                            </div>
                        )}
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Create;
