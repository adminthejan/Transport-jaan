import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { Star } from "lucide-react";
import Header from "../home/client/ClientHeader";
import Footer from "../layouts/Footer";
import {
    buildQuoteMatrix,
    buildReviewContext,
    computePackageMetrics,
    resolveDetailedQuotes,
} from "./courierPricing";

const USD_TO_LKR_RATE = 325;
const DEFAULT_CURRENCY = "LKR";
const DOMESTIC_CITY_LOOKUP_DEBOUNCE_MS = 300;

const normalizeCountryCode = (value) => String(value || "").trim().toUpperCase();
const normalizeFavoriteValue = (value) => String(value || "").trim().toLowerCase();
const LOCAL_SENDER_FAVORITES_KEY = "courier.localFavorites.sender";
const LOCAL_RECIPIENT_FAVORITES_KEY = "courier.localFavorites.recipient";

const readCsrfToken = () => {
    if (typeof document === "undefined") {
        return "";
    }

    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
};

const readLocalFavorites = (storageKey) => {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalFavorites = (storageKey, contacts) => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.isArray(contacts) ? contacts : []));
    } catch {
        // Best-effort persistence only.
    }
};

const resolveShipmentCategory = (payload) => {
    const senderCountry = normalizeCountryCode(payload?.sender?.address?.country);
    const recipientCountry = normalizeCountryCode(payload?.recipient?.address?.country);

    return senderCountry === "LK" && recipientCountry === "LK"
        ? "domestic"
        : "international";
};

const Details = ({
    inline = false,
    pagePropsOverride = null,
    formStateOverride = null,
    packageDetailsReadOnly = false,
    renderAsForm = true,
    showBackLink = true,
    backHref = null,
    onBackClick = null,
    showEmptyState = true,
    scrollOnSubmit = true,
    submitRoute = null,
    onSubmitOverride = null,
    hideSubmit = false,
}) => {
    const { props: inertiaProps } = usePage();
    const resolvedProps = pagePropsOverride || inertiaProps;
    const {
        formData,
        countries = [],
        packageTypes = [],
        favoriteRecipients = [],
        favoriteSenders = [],
        senderProfile = null,
        errors = {},
    } = resolvedProps;
    const resolvedFlowRoutes = resolvedProps.flowRoutes && typeof resolvedProps.flowRoutes === "object"
        ? resolvedProps.flowRoutes
        : {};
    const authUser = resolvedProps?.auth?.user || inertiaProps?.auth?.user || null;
    const resolvedBackHref = backHref || resolvedFlowRoutes.create || "/couriers/create";
    const resolvedSubmitRoute = submitRoute
        || resolvedFlowRoutes.detailsStore
        || resolvedFlowRoutes.details
        || "/couriers/details";
    const resolvedDomesticCitySearchRoute = resolvedFlowRoutes.domesticCitySearch || "/couriers/cities/search";

    const initialForm = useMemo(() => {
        if (!formData) {
            return {
                sender: {
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    saveToFavorites: false,
                    address: {
                        line1: "",
                        line2: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: countries[0] || "US",
                        instructions: "",
                    },
                },
                recipient: {
                    name: "",
                    email: "",
                    phone: "",
                    company: "",
                    saveToFavorites: false,
                    address: {
                        line1: "",
                        line2: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: countries[0] || "US",
                        instructions: "",
                    },
                },
                shipment: {
                    pickupDate: "",
                    pickupWindowStart: "",
                    pickupWindowEnd: "",
                    insurance: false,
                    estimatedValue: "",
                    codEnabled: false,
                    codAmount: "",
                    codPaymentMethod: "",
                },
                packages: [
                    {
                        label: "",
                        packageType: packageTypes[0] || "parcel",
                        quantity: 1,
                        weightKg: "",
                        lengthCm: "",
                        widthCm: "",
                        heightCm: "",
                        declaredValue: "",
                        description: "",
                        courierProvider: "",
                        serviceLevel: "",
                    },
                ],
                reviewContext: {
                    selectedQuotes: [],
                    displayCurrency: DEFAULT_CURRENCY,
                    totalPriceUSD: 0,
                },
            };
        }

        const senderAddress = formData.sender?.address ?? {};
        const recipientAddress = formData.recipient?.address ?? {};
        const shipment = formData.shipment ?? {};
        const preferredCurrency = formData.reviewContext?.displayCurrency || DEFAULT_CURRENCY;

        return {
            sender: {
                name: formData.sender?.name ?? "",
                email: formData.sender?.email ?? "",
                phone: formData.sender?.phone ?? "",
                company: formData.sender?.company ?? "",
                saveToFavorites: Boolean(formData.sender?.saveToFavorites),
                address: {
                    line1: senderAddress.line1 ?? "",
                    line2: senderAddress.line2 ?? "",
                    city: senderAddress.city ?? "",
                    state: senderAddress.state ?? "",
                    postalCode: senderAddress.postalCode ?? "",
                    country: senderAddress.country ?? (countries[0] || "US"),
                    instructions: senderAddress.instructions ?? "",
                },
            },
            recipient: {
                name: formData.recipient?.name ?? "",
                email: formData.recipient?.email ?? "",
                phone: formData.recipient?.phone ?? "",
                company: formData.recipient?.company ?? "",
                saveToFavorites: Boolean(formData.recipient?.saveToFavorites),
                address: {
                    line1: recipientAddress.line1 ?? "",
                    line2: recipientAddress.line2 ?? "",
                    city: recipientAddress.city ?? "",
                    state: recipientAddress.state ?? "",
                    postalCode: recipientAddress.postalCode ?? "",
                    country: recipientAddress.country ?? (countries[0] || "US"),
                    instructions: recipientAddress.instructions ?? "",
                },
            },
            shipment: {
                pickupDate: shipment.pickupDate ?? "",
                pickupWindowStart: shipment.pickupWindowStart ?? "",
                pickupWindowEnd: shipment.pickupWindowEnd ?? "",
                insurance: Boolean(shipment.insurance),
                estimatedValue: shipment.estimatedValue ?? "",
                codEnabled: Boolean(shipment.codEnabled),
                codAmount: shipment.codAmount ?? "",
                codPaymentMethod: shipment.codPaymentMethod ?? "",
            },
            packages: (formData.packages ?? []).map((pkg) => ({
                ...pkg,
                label: pkg.label ?? "",
                packageType: pkg.packageType ?? (packageTypes[0] || "parcel"),
                quantity: pkg.quantity ?? 1,
                weightKg: pkg.weightKg ?? "",
                lengthCm: pkg.lengthCm ?? "",
                widthCm: pkg.widthCm ?? "",
                heightCm: pkg.heightCm ?? "",
                declaredValue: pkg.declaredValue ?? "",
                description: pkg.description ?? "",
                courierProvider: pkg.courierProvider ?? "",
                serviceLevel: pkg.serviceLevel ?? "",
            })),
            reviewContext: {
                selectedQuotes: Array.isArray(formData.reviewContext?.selectedQuotes)
                    ? [...formData.reviewContext.selectedQuotes]
                    : [],
                displayCurrency: preferredCurrency,
                totalPriceUSD: Number(formData.reviewContext?.totalPriceUSD || 0),
            },
        };
    }, [formData, countries, packageTypes]);

    const baseForm = useForm(initialForm);
    const usingExternalForm = Boolean(formStateOverride);
    const data = usingExternalForm ? formStateOverride.data : baseForm.data;
    const setData = usingExternalForm ? formStateOverride.setData : baseForm.setData;
    const post = usingExternalForm ? formStateOverride.post : baseForm.post;
    const processing = usingExternalForm ? formStateOverride.processing : baseForm.processing;
    const formErrors = usingExternalForm ? formStateOverride.errors : baseForm.errors;
    const [submitError, setSubmitError] = useState("");

    const [showFavoritePicker, setShowFavoritePicker] = useState(false);
    const [showSenderFavoritePicker, setShowSenderFavoritePicker] = useState(false);
    const [useSenderDetails, setUseSenderDetails] = useState(false);
    const [savedRecipients, setSavedRecipients] = useState(() => {
        if (Array.isArray(favoriteRecipients) && favoriteRecipients.length > 0) {
            return favoriteRecipients;
        }

        return readLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY);
    });
    const [savedSenders, setSavedSenders] = useState(() => {
        if (Array.isArray(favoriteSenders) && favoriteSenders.length > 0) {
            return favoriteSenders;
        }

        return readLocalFavorites(LOCAL_SENDER_FAVORITES_KEY);
    });
    const [favoriteActionRole, setFavoriteActionRole] = useState("");
    const [favoriteActionError, setFavoriteActionError] = useState("");
    const cityLookupAbortRef = useRef({ sender: null, recipient: null });
    const cityLookupTimerRef = useRef({ sender: null, recipient: null });
    const citySuggestionAbortRef = useRef({ sender: null, recipient: null });
    const citySuggestionTimerRef = useRef({ sender: null, recipient: null });
    const [citySuggestions, setCitySuggestions] = useState({ sender: [], recipient: [] });
    const [activeAddressField, setActiveAddressField] = useState(null);
    const hasFavoriteRecipients = savedRecipients.length > 0;
    const hasFavoriteSenders = savedSenders.length > 0;

    const formatContactAddress = (address) => {
        if (!address) {
            return "—";
        }

        const street = [address.line1, address.line2].filter(Boolean).join(", ");
        const locality = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
        const country = address.country;

        return [street, locality, country].filter(Boolean).join(", ");
    };

    const matchesFavoriteContact = (formContact, savedContact) => {
        const formAddress = formContact?.address || {};
        const savedAddress = savedContact?.address || {};

        return normalizeFavoriteValue(formContact?.name) === normalizeFavoriteValue(savedContact?.name)
            && normalizeFavoriteValue(formContact?.email) === normalizeFavoriteValue(savedContact?.email)
            && normalizeFavoriteValue(formContact?.phone) === normalizeFavoriteValue(savedContact?.phone)
            && normalizeFavoriteValue(formContact?.company) === normalizeFavoriteValue(savedContact?.company)
            && normalizeFavoriteValue(formAddress?.line1) === normalizeFavoriteValue(savedAddress?.line1)
            && normalizeFavoriteValue(formAddress?.line2) === normalizeFavoriteValue(savedAddress?.line2)
            && normalizeFavoriteValue(formAddress?.instructions) === normalizeFavoriteValue(savedAddress?.instructions);
    };

    const stripFavoriteLocation = (contact) => {
        if (!contact?.address) {
            return contact;
        }

        const { city, state, postalCode, country, ...addressWithoutLocation } = contact.address;

        return {
            ...contact,
            address: addressWithoutLocation,
        };
    };

    const favoriteStorageKey = (roleKey) => roleKey === "sender"
        ? LOCAL_SENDER_FAVORITES_KEY
        : LOCAL_RECIPIENT_FAVORITES_KEY;

    const buildLocalFavorite = (roleKey, contact) => {
        const address = contact?.address || {};

        return {
            id: `local-${roleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: String(contact?.name || "").trim(),
            email: String(contact?.email || "").trim(),
            phone: String(contact?.phone || "").trim(),
            company: String(contact?.company || "").trim(),
            address: {
                line1: String(address?.line1 || "").trim(),
                line2: String(address?.line2 || "").trim(),
                instructions: String(address?.instructions || "").trim(),
            },
        };
    };

    const buildRecipientFromSender = (sender, currentRecipient) => {
        const senderAddress = sender?.address || {};
        const previousRecipient = currentRecipient || {};
        const previousAddress = previousRecipient.address || {};

        return {
            ...previousRecipient,
            name: sender?.name ?? "",
            email: sender?.email ?? "",
            phone: sender?.phone ?? "",
            company: sender?.company ?? "",
            address: {
                ...previousAddress,
                line1: senderAddress.line1 ?? "",
                line2: senderAddress.line2 ?? "",
                city: previousAddress.city ?? "",
                state: previousAddress.state ?? "",
                postalCode: previousAddress.postalCode ?? "",
                country: previousAddress.country ?? (countries[0] || "US"),
                instructions: senderAddress.instructions ?? "",
            },
        };
    };

    const senderProfileData = senderProfile?.sender || null;
    const senderProfileLabel = senderProfile?.label || "Same as profile";
    const canUseSenderProfile = Boolean(senderProfileData);

    useEffect(() => {
        const serverFavorites = Array.isArray(favoriteRecipients) ? favoriteRecipients : [];
        if (serverFavorites.length > 0) {
            const sanitizedFavorites = serverFavorites.map(stripFavoriteLocation);
            setSavedRecipients(sanitizedFavorites);
            writeLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY, sanitizedFavorites);
            return;
        }

        setSavedRecipients(readLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY).map(stripFavoriteLocation));
    }, [favoriteRecipients]);

    useEffect(() => {
        const serverFavorites = Array.isArray(favoriteSenders) ? favoriteSenders : [];
        if (serverFavorites.length > 0) {
            const sanitizedFavorites = serverFavorites.map(stripFavoriteLocation);
            setSavedSenders(sanitizedFavorites);
            writeLocalFavorites(LOCAL_SENDER_FAVORITES_KEY, sanitizedFavorites);
            return;
        }

        setSavedSenders(readLocalFavorites(LOCAL_SENDER_FAVORITES_KEY).map(stripFavoriteLocation));
    }, [favoriteSenders]);

    useEffect(() => {
        return () => {
            ["sender", "recipient"].forEach((party) => {
                const timer = cityLookupTimerRef.current[party];
                if (timer) {
                    clearTimeout(timer);
                    cityLookupTimerRef.current[party] = null;
                }

                const controller = cityLookupAbortRef.current[party];
                if (controller) {
                    controller.abort();
                    cityLookupAbortRef.current[party] = null;
                }

                const suggestionTimer = citySuggestionTimerRef.current[party];
                if (suggestionTimer) {
                    clearTimeout(suggestionTimer);
                    citySuggestionTimerRef.current[party] = null;
                }

                const suggestionController = citySuggestionAbortRef.current[party];
                if (suggestionController) {
                    suggestionController.abort();
                    citySuggestionAbortRef.current[party] = null;
                }
            });
        };
    }, []);


    const applyRecipientSelection = (recipient) => {
        if (!recipient) {
            return;
        }

        const selectedAddress = recipient.address || {};

        setData((previous) => {
            const previousRecipient = previous.recipient || {};
            const previousAddress = previousRecipient.address || {};

            return {
                ...previous,
                recipient: {
                    ...previousRecipient,
                    name: recipient.name ?? "",
                    email: recipient.email ?? "",
                    phone: recipient.phone ?? "",
                    company: recipient.company ?? "",
                    saveToFavorites: false,
                    address: {
                        ...previousAddress,
                        line1: selectedAddress.line1 ?? "",
                        line2: selectedAddress.line2 ?? "",
                        city: previousAddress.city ?? "",
                        state: previousAddress.state ?? "",
                        postalCode: previousAddress.postalCode ?? "",
                        country: previousAddress.country ?? (countries[0] || "US"),
                        instructions: selectedAddress.instructions ?? "",
                    },
                },
            };
        });

        setUseSenderDetails(false);
    };

    const applySenderSelection = (sender) => {
        if (!sender) {
            return;
        }

        const selectedAddress = sender.address || {};

        setData((previous) => {
            const previousSender = previous.sender || {};
            const previousAddress = previousSender.address || {};

            return {
                ...previous,
                sender: {
                    ...previousSender,
                    name: sender.name ?? "",
                    email: sender.email ?? "",
                    phone: sender.phone ?? "",
                    company: sender.company ?? "",
                    saveToFavorites: false,
                    address: {
                        ...previousAddress,
                        line1: selectedAddress.line1 ?? "",
                        line2: selectedAddress.line2 ?? "",
                        city: previousAddress.city ?? "",
                        state: previousAddress.state ?? "",
                        postalCode: previousAddress.postalCode ?? "",
                        country: previousAddress.country ?? (countries[0] || "US"),
                        instructions: selectedAddress.instructions ?? "",
                    },
                },
            };
        });
    };

    const handleUseSenderDetailsChange = (event) => {
        const checked = event.target.checked;
        setUseSenderDetails(checked);

        if (!checked) {
            return;
        }

        setData((previous) => {
            const sender = previous.sender || {};
            const previousRecipient = previous.recipient || {};
            const nextRecipient = buildRecipientFromSender(sender, previousRecipient);
            return {
                ...previous,
                recipient: nextRecipient,
            };
        });
    };

    const handleUseSenderProfile = () => {
        if (!senderProfileData) {
            return;
        }

        setData((previous) => {
            const previousSender = previous.sender || {};
            const previousAddress = previousSender.address || {};
            const profileAddress = senderProfileData.address || {};

            return {
                ...previous,
                sender: {
                    ...previousSender,
                    name: senderProfileData.name ?? previousSender.name ?? "",
                    email: senderProfileData.email ?? previousSender.email ?? "",
                    phone: senderProfileData.phone ?? previousSender.phone ?? "",
                    company: senderProfileData.company ?? previousSender.company ?? "",
                    address: {
                        ...previousAddress,
                        line1: profileAddress.line1 ?? previousAddress.line1 ?? "",
                        line2: profileAddress.line2 ?? previousAddress.line2 ?? "",
                        city: profileAddress.city ?? previousAddress.city ?? "",
                        state: profileAddress.state ?? previousAddress.state ?? "",
                        postalCode: profileAddress.postalCode ?? previousAddress.postalCode ?? "",
                        country: profileAddress.country ?? previousAddress.country ?? (countries[0] || "US"),
                        instructions: profileAddress.instructions ?? previousAddress.instructions ?? "",
                    },
                },
            };
        });
    };

    const scrollToTop = useCallback(() => {
        if (!scrollOnSubmit || typeof window === "undefined") {
            return;
        }

        window.scrollTo({ top: 0, behavior: "auto" });
    }, [scrollOnSubmit]);

    useEffect(() => {
        if (usingExternalForm) {
            return;
        }

        setData(() => initialForm);
    }, [initialForm, setData, usingExternalForm]);

    const updateNestedField = (path, value) => {
        setData((previous) => {
            const next = { ...previous };
            const keys = path.split(".");
            let cursor = next;

            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    cursor[key] = value;
                    return;
                }

                const current = cursor[key];
                if (Array.isArray(current)) {
                    cursor[key] = [...current];
                } else {
                    cursor[key] = current ? { ...current } : {};
                }
                cursor = cursor[key];
            });

            return next;
        });
    };

    const updatePackageField = (index, field, value) => {
        setData((previous) => {
            const packages = Array.isArray(previous.packages) ? [...previous.packages] : [];
            packages[index] = {
                ...(packages[index] ?? {}),
                [field]: value,
            };

            return {
                ...previous,
                packages,
            };
        });
    };

    const handleAddressInputBlur = (fieldKey) => {
        window.setTimeout(() => {
            setActiveAddressField((current) => (current === fieldKey ? null : current));
        }, 120);
    };

    const getProvinceSuggestions = (party, query = "") => {
        const normalized = String(query || "").trim().toLowerCase();
        const pool = Array.isArray(citySuggestions[party]) ? citySuggestions[party] : [];
        const unique = new Set();

        return pool
            .map((option) => String(option?.provinceName || option?.districtName || "").trim())
            .filter(Boolean)
            .filter((value) => {
                if (unique.has(value.toLowerCase())) {
                    return false;
                }
                unique.add(value.toLowerCase());
                return true;
            })
            .filter((value) => !normalized || value.toLowerCase().includes(normalized));
    };

    const getPostalSuggestions = (party, postalQuery = "", provinceQuery = "") => {
        const normalizedPostal = String(postalQuery || "").trim().toLowerCase();
        const normalizedProvince = String(provinceQuery || "").trim().toLowerCase();
        const pool = Array.isArray(citySuggestions[party]) ? citySuggestions[party] : [];

        return pool.filter((option) => {
            const postcode = String(option?.postcode || "").trim();
            const province = String(option?.provinceName || option?.districtName || "").trim();
            if (!postcode) {
                return false;
            }

            const postalMatches = !normalizedPostal || postcode.toLowerCase().includes(normalizedPostal);
            const provinceMatches = !normalizedProvince || province.toLowerCase().includes(normalizedProvince);
            return postalMatches && provinceMatches;
        });
    };

    const fetchCitySuggestions = useCallback((party, city, country) => {
        const normalizedCity = String(city || "").trim();
        const normalizedCountry = normalizeCountryCode(country);

        const activeTimer = citySuggestionTimerRef.current[party];
        if (activeTimer) {
            clearTimeout(activeTimer);
            citySuggestionTimerRef.current[party] = null;
        }

        const activeController = citySuggestionAbortRef.current[party];
        if (activeController) {
            activeController.abort();
            citySuggestionAbortRef.current[party] = null;
        }

        if (!normalizedCity || normalizedCountry !== "LK") {
            setCitySuggestions((previous) => ({ ...previous, [party]: [] }));
            return;
        }

        citySuggestionTimerRef.current[party] = setTimeout(async () => {
            const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            if (controller) {
                citySuggestionAbortRef.current[party] = controller;
            }

            try {
                const params = new URLSearchParams({ q: normalizedCity, limit: "20" });
                const response = await fetch(`${resolvedDomesticCitySearchRoute}?${params.toString()}`, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    signal: controller?.signal,
                });

                if (!response.ok) {
                    setCitySuggestions((previous) => ({ ...previous, [party]: [] }));
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                const cities = Array.isArray(payload?.cities)
                    ? payload.cities.map((entry) => ({
                        value: String(entry?.nameEn || "").trim(),
                        label: String(entry?.displayName || entry?.nameEn || "").trim(),
                        postcode: String(entry?.postcode || "").trim(),
                        provinceName: String(entry?.provinceName || "").trim(),
                        districtName: String(entry?.districtName || "").trim(),
                    })).filter((entry) => entry.value)
                    : [];

                setCitySuggestions((previous) => ({ ...previous, [party]: cities }));
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setCitySuggestions((previous) => ({ ...previous, [party]: [] }));
                }
            } finally {
                if (citySuggestionAbortRef.current[party] === controller) {
                    citySuggestionAbortRef.current[party] = null;
                }
            }
        }, DOMESTIC_CITY_LOOKUP_DEBOUNCE_MS);
    }, [resolvedDomesticCitySearchRoute]);

    const applyCitySuggestion = (party, option) => {
        if (!option || !option.value) {
            return;
        }

        const resolvedState = String(option.provinceName || option.districtName || "").trim();
        const resolvedPostalCode = String(option.postcode || "").trim();

        setData((previous) => {
            const contact = previous?.[party] || {};
            const address = contact.address || {};

            return {
                ...previous,
                [party]: {
                    ...contact,
                    address: {
                        ...address,
                        city: option.value,
                        state: resolvedState || address.state || "",
                        postalCode: resolvedPostalCode || address.postalCode || "",
                    },
                },
            };
        });

        setCitySuggestions((previous) => ({ ...previous, [party]: [] }));
        setActiveAddressField(null);
    };

    const applyProvinceSuggestion = (party, provinceName) => {
        const normalizedProvince = String(provinceName || "").trim();
        if (!normalizedProvince) {
            return;
        }

        const postalOptions = getPostalSuggestions(
            party,
            "",
            normalizedProvince,
        );

        setData((previous) => {
            const contact = previous?.[party] || {};
            const address = contact.address || {};
            const nextPostal = postalOptions.length === 1
                ? String(postalOptions[0]?.postcode || "").trim()
                : String(address.postalCode || "");

            return {
                ...previous,
                [party]: {
                    ...contact,
                    address: {
                        ...address,
                        state: normalizedProvince,
                        postalCode: nextPostal,
                    },
                },
            };
        });

        setActiveAddressField(null);
    };

    const applyPostalSuggestion = (party, option) => {
        const postalCode = String(option?.postcode || "").trim();
        if (!postalCode) {
            return;
        }

        const resolvedState = String(option?.provinceName || option?.districtName || "").trim();

        setData((previous) => {
            const contact = previous?.[party] || {};
            const address = contact.address || {};

            return {
                ...previous,
                [party]: {
                    ...contact,
                    address: {
                        ...address,
                        postalCode,
                        state: resolvedState || address.state || "",
                    },
                },
            };
        });

        setActiveAddressField(null);
    };

    const lookupAndApplyCityAddress = useCallback((party, city, country) => {
        const normalizedCity = String(city || "").trim();
        const normalizedCountry = normalizeCountryCode(country);

        const activeTimer = cityLookupTimerRef.current[party];
        if (activeTimer) {
            clearTimeout(activeTimer);
            cityLookupTimerRef.current[party] = null;
        }

        const activeController = cityLookupAbortRef.current[party];
        if (activeController) {
            activeController.abort();
            cityLookupAbortRef.current[party] = null;
        }

        if (!normalizedCity || normalizedCountry !== "LK") {
            return;
        }

        cityLookupTimerRef.current[party] = setTimeout(async () => {
            const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            if (controller) {
                cityLookupAbortRef.current[party] = controller;
            }

            try {
                const params = new URLSearchParams({ q: normalizedCity, limit: "20" });
                const response = await fetch(`${resolvedDomesticCitySearchRoute}?${params.toString()}`, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    signal: controller?.signal,
                });

                if (!response.ok) {
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                const cities = Array.isArray(payload?.cities) ? payload.cities : [];
                if (cities.length === 0) {
                    return;
                }

                const queryKey = normalizedCity.toLowerCase();
                const exactMatch = cities.find((entry) => String(entry?.nameEn || "").trim().toLowerCase() === queryKey);
                const prefixMatch = cities.find((entry) => String(entry?.nameEn || "").trim().toLowerCase().startsWith(queryKey));
                const selected = exactMatch || prefixMatch || cities[0];

                const resolvedState = String(selected?.provinceName || selected?.districtName || "").trim();
                const resolvedPostalCode = String(selected?.postcode || "").trim();

                if (!resolvedState && !resolvedPostalCode) {
                    return;
                }

                setData((previous) => {
                    const contact = previous?.[party] || {};
                    const address = contact.address || {};
                    const currentCity = String(address.city || "").trim().toLowerCase();
                    const currentCountry = normalizeCountryCode(address.country);

                    if (currentCity !== queryKey || currentCountry !== "LK") {
                        return previous;
                    }

                    const nextState = resolvedState || String(address.state || "").trim();
                    const nextPostalCode = resolvedPostalCode || String(address.postalCode || "").trim();

                    if (nextState === String(address.state || "") && nextPostalCode === String(address.postalCode || "")) {
                        return previous;
                    }

                    return {
                        ...previous,
                        [party]: {
                            ...contact,
                            address: {
                                ...address,
                                state: nextState,
                                postalCode: nextPostalCode,
                            },
                        },
                    };
                });
            } catch (error) {
                if (error?.name !== "AbortError") {
                    // Best-effort autofill only.
                }
            } finally {
                if (cityLookupAbortRef.current[party] === controller) {
                    cityLookupAbortRef.current[party] = null;
                }
            }
        }, DOMESTIC_CITY_LOOKUP_DEBOUNCE_MS);
    }, [resolvedDomesticCitySearchRoute, setData]);

    useEffect(() => {
        lookupAndApplyCityAddress("sender", data?.sender?.address?.city, data?.sender?.address?.country);
    }, [data?.sender?.address?.city, data?.sender?.address?.country, lookupAndApplyCityAddress]);

    useEffect(() => {
        lookupAndApplyCityAddress("recipient", data?.recipient?.address?.city, data?.recipient?.address?.country);
    }, [data?.recipient?.address?.city, data?.recipient?.address?.country, lookupAndApplyCityAddress]);

    useEffect(() => {
        if (normalizeCountryCode(data?.sender?.address?.country) !== "LK") {
            setCitySuggestions((previous) => ({ ...previous, sender: [] }));
            setActiveAddressField((current) => (String(current || "").startsWith("sender-") ? null : current));
        }
    }, [data?.sender?.address?.country]);

    useEffect(() => {
        if (normalizeCountryCode(data?.recipient?.address?.country) !== "LK") {
            setCitySuggestions((previous) => ({ ...previous, recipient: [] }));
            setActiveAddressField((current) => (String(current || "").startsWith("recipient-") ? null : current));
        }
    }, [data?.recipient?.address?.country]);

    const handleSubmit = (event) => {
        if (event?.preventDefault) {
            event.preventDefault();
        }

        if (typeof onSubmitOverride === "function") {
            onSubmitOverride({
                data,
                setSubmitError,
                scrollToTop,
            });
            return;
        }

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

        if (typeof post !== "function") {
            setSubmitError("Unable to continue. Please try again.");
            return;
        }

        post(resolvedSubmitRoute, {
            preserveScroll: false,
            onStart: () => setSubmitError(""),
            onSuccess: () => {
                setSubmitError("");
                scrollToTop();
            },
            onError: (validationErrors) => {
                const firstError = extractFirstErrorMessage(validationErrors);
                setSubmitError(
                    firstError ||
                    "Unable to continue. Please review the highlighted fields and try again.",
                );
                scrollToTop();
            },
        });
    };

    if (!formData) {
        if (inline) {
            if (!showEmptyState) {
                return null;
            }

            return (
                <div className="rounded-2xl border border-[#E3EAF5] bg-white p-6 text-center shadow-sm">
                    <h2 className="text-base font-semibold text-[#0B1739]">No shipment in progress</h2>
                    <p className="mt-2 text-xs text-[#5B6887]">
                        Start by creating a courier request and selecting your services.
                    </p>
                    {showBackLink && !onBackClick && (
                        <Link
                            href={resolvedBackHref}
                            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a4b93]"
                        >
                            Go to courier form
                        </Link>
                    )}
                    {showBackLink && onBackClick && (
                        <button
                            type="button"
                            onClick={onBackClick}
                            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a4b93]"
                        >
                            Go to courier form
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]">
                <Head title="Courier Details" />
                <Header />
                <main className="flex flex-1 items-center justify-center px-4">
                    <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-lg">
                        <h1 className="text-xl font-semibold mb-3">No shipment in progress</h1>
                        <p className="text-sm text-[#5B6887]">
                            Start by creating a courier request and selecting your services.
                        </p>
                        <Link
                            href={resolvedBackHref}
                            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#0955AC] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4b93]"
                        >
                            Go to courier form
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    const combinedErrors = { ...errors, ...formErrors };
    const packages = data.packages || [];
    const governanceRuntimeErrors = useMemo(
        () => Object.entries(combinedErrors)
            .filter(([field]) => {
                if (field === "reviewContext.totalPriceUSD") {
                    return true;
                }

                if (field === "shipment.serviceLevel") {
                    return true;
                }

                return (field.startsWith("packages.") && (field.endsWith(".serviceLevel") || field.endsWith(".courierProvider")));
            })
            .map(([, message]) => String(message || "").trim())
            .filter(Boolean),
        [combinedErrors],
    );

    const fallbackReviewContext = useMemo(() => {
        const context = formData.reviewContext || {};
        return {
            selectedQuotes: Array.isArray(context.selectedQuotes) ? [...context.selectedQuotes] : [],
            displayCurrency: context.displayCurrency || DEFAULT_CURRENCY,
            totalPriceUSD: Number(context.totalPriceUSD || 0),
        };
    }, [formData.reviewContext]);

    const packageCurrency = data.reviewContext?.displayCurrency || fallbackReviewContext.displayCurrency || DEFAULT_CURRENCY;

    const currencyFormatter = useMemo(() => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: packageCurrency,
                minimumFractionDigits: 2,
            });
        } catch (error) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 2,
            });
        }
    }, [packageCurrency]);

    const formatCurrency = useCallback(
        (value = 0) => {
            const numericValue = Number(value) || 0;
            const converted = packageCurrency === "LKR"
                ? numericValue * USD_TO_LKR_RATE
                : numericValue;

            return currencyFormatter.format(converted);
        },
        [currencyFormatter, packageCurrency]
    );

    const resolvedCodAmount = useMemo(() => {
        if (!Boolean(data?.shipment?.codEnabled)) {
            return null;
        }

        const shipmentDeclaredValue = Number(data?.shipment?.estimatedValue);
        if (Number.isFinite(shipmentDeclaredValue) && shipmentDeclaredValue > 0) {
            return Math.round(shipmentDeclaredValue * 100) / 100;
        }

        const packageDeclaredValueTotal = (packages || []).reduce((carry, pkg) => {
            const declaredValue = Number(pkg?.declaredValue);
            if (!Number.isFinite(declaredValue) || declaredValue <= 0) {
                return carry;
            }

            return carry + declaredValue;
        }, 0);

        return packageDeclaredValueTotal > 0
            ? Math.round(packageDeclaredValueTotal * 100) / 100
            : null;
    }, [data?.shipment?.codEnabled, data?.shipment?.estimatedValue, packages]);

    const shipmentCategory = useMemo(
        () => resolveShipmentCategory(data),
        [data?.sender?.address?.country, data?.recipient?.address?.country],
    );
    const codAvailableForRoute = shipmentCategory === "domestic";

    useEffect(() => {
        if (codAvailableForRoute) {
            return;
        }

        setData((previous) => {
            const shipment = previous.shipment || {};
            const codAlreadyCleared = !Boolean(shipment.codEnabled)
                && (shipment.codAmount === "" || shipment.codAmount === null || shipment.codAmount === undefined)
                && (shipment.codPaymentMethod === "" || shipment.codPaymentMethod === null || shipment.codPaymentMethod === undefined);

            if (codAlreadyCleared) {
                return previous;
            }

            return {
                ...previous,
                shipment: {
                    ...shipment,
                    codEnabled: false,
                    codAmount: "",
                    codPaymentMethod: "",
                },
            };
        });
    }, [codAvailableForRoute, setData]);

    const packageMetrics = useMemo(() => computePackageMetrics(packages), [packages]);
    const quoteMatrix = useMemo(
        () => buildQuoteMatrix(packages, { metrics: packageMetrics }),
        [packages, packageMetrics]
    );
    const detailedQuotes = useMemo(
        () => resolveDetailedQuotes(packages, quoteMatrix),
        [packages, quoteMatrix]
    );

    const computedReviewContext = useMemo(() => {
        if (detailedQuotes.length > 0) {
            return buildReviewContext(detailedQuotes, packageCurrency);
        }

        return {
            ...fallbackReviewContext,
            displayCurrency: packageCurrency,
        };
    }, [detailedQuotes, fallbackReviewContext, packageCurrency]);

    useEffect(() => {
        setData((previous) => {
            const previousPackages = Array.isArray(previous.packages) ? [...previous.packages] : [];
            let changed = false;

            const nextPackages = previousPackages.map((pkg, index) => {
                const entry = quoteMatrix.find((item) => item.packageIndex === index);
                if (!entry || entry.providers.length === 0) {
                    return pkg;
                }

                const current = pkg ? { ...pkg } : {};
                const provider = entry.providers.find((option) => option.id === current.courierProvider);

                if (!provider) {
                    const fallbackProvider = entry.providers[0];
                    if (!fallbackProvider) {
                        return pkg;
                    }

                    changed = true;
                    return {
                        ...current,
                        courierProvider: fallbackProvider.id,
                        serviceLevel: fallbackProvider.tiers?.[0]?.id || "",
                    };
                }

                const serviceExists = (provider.tiers || []).some((tier) => tier.id === current.serviceLevel);
                if (!serviceExists) {
                    changed = true;
                    return {
                        ...current,
                        serviceLevel: provider.tiers?.[0]?.id || "",
                    };
                }

                return pkg;
            });

            if (!changed) {
                return previous;
            }

            return {
                ...previous,
                packages: nextPackages,
            };
        });
    }, [quoteMatrix, setData]);

    // Keep the form payload aligned with the latest quote recalculations.
    useEffect(() => {
        setData((previous) => {
            const previousJson = JSON.stringify(previous.reviewContext || {});
            const nextJson = JSON.stringify(computedReviewContext);

            if (previousJson === nextJson) {
                return previous;
            }

            return {
                ...previous,
                reviewContext: computedReviewContext,
            };
        });
    }, [computedReviewContext, setData]);

    const selectedQuotes = computedReviewContext.selectedQuotes || [];
    const totalPriceUSD = computedReviewContext.totalPriceUSD || 0;

    const selectedQuotesMap = useMemo(() => {
        return selectedQuotes.reduce((acc, quote) => {
            acc[quote.packageIndex] = quote;
            return acc;
        }, {});
    }, [selectedQuotes]);

    const availablePackageTypes = useMemo(() => {
        const pool = new Set(packageTypes);
        packages.forEach((pkg) => {
            if (pkg?.packageType) {
                pool.add(pkg.packageType);
            }
        });
        return Array.from(pool);
    }, [packageTypes, packages]);

    const senderFavorite = Boolean(data.sender?.saveToFavorites);
    const recipientFavorite = Boolean(data.recipient?.saveToFavorites);

    const handleFavoriteToggle = async (role) => {
        if (favoriteActionRole && favoriteActionRole !== role) {
            return;
        }

        const roleKey = role === "sender" ? "sender" : "recipient";
        const roleLabel = roleKey === "sender" ? "sender" : "recipient";
        const currentContact = data?.[roleKey] || {};
        const currentAddress = currentContact.address || {};
        const currentlyFavorite = Boolean(currentContact.saveToFavorites);
        const favoritesList = roleKey === "sender" ? savedSenders : savedRecipients;
        const setFavoritesList = roleKey === "sender" ? setSavedSenders : setSavedRecipients;
        const storageKey = favoriteStorageKey(roleKey);

        setFavoriteActionError("");

        const saveLocally = () => {
            const localContact = buildLocalFavorite(roleKey, currentContact);
            setFavoritesList((previous) => {
                const deduped = previous.filter((item) => !matchesFavoriteContact(localContact, item));
                const next = [localContact, ...deduped];
                writeLocalFavorites(storageKey, next);
                return next;
            });
            updateNestedField(`${roleKey}.saveToFavorites`, true);
        };

        const removeLocally = (favoriteId) => {
            setFavoritesList((previous) => {
                const next = previous.filter((item) => item.id !== favoriteId);
                writeLocalFavorites(storageKey, next);
                return next;
            });
            updateNestedField(`${roleKey}.saveToFavorites`, false);
        };

        if (!currentlyFavorite) {
            const missingRequired = !String(currentContact.name || "").trim()
                || !String(currentAddress.line1 || "").trim()
                || !String(currentAddress.city || "").trim()
                || !String(currentAddress.country || "").trim();

            if (missingRequired) {
                setFavoriteActionError(`Fill ${roleLabel} name, address line 1, city, and country before saving to favorites.`);
                return;
            }

            if (!authUser) {
                saveLocally();
                return;
            }

            setFavoriteActionRole(roleKey);

            try {
                const response = await fetch("/couriers/favorites", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": readCsrfToken(),
                    },
                    body: JSON.stringify({
                        role: roleKey,
                        [roleKey]: currentContact,
                    }),
                });

                const result = await response.json().catch(() => null);

                const responseMessage = String(result?.message || "").toLowerCase();
                const unauthenticated = response.status === 401
                    || responseMessage.includes("unauthenticated")
                    || (!response.ok && response.status === 419);

                if (unauthenticated) {
                    saveLocally();
                    return;
                }

                if (!response.ok || !result?.success) {
                    throw new Error(result?.message || `Unable to save ${roleLabel} to favorites.`);
                }

                const savedContact = result?.contact;
                if (savedContact && savedContact.id) {
                    const sanitizedSavedContact = stripFavoriteLocation(savedContact);
                    setFavoritesList((previous) => {
                        const filtered = previous.filter((item) => item.id !== sanitizedSavedContact.id);
                        const deduped = filtered.filter((item) => !matchesFavoriteContact(sanitizedSavedContact, item));
                        const next = [sanitizedSavedContact, ...deduped];
                        writeLocalFavorites(storageKey, next);
                        return next;
                    });
                }

                updateNestedField(`${roleKey}.saveToFavorites`, true);
            } catch (error) {
                setFavoriteActionError(error?.message || `Unable to save ${roleLabel} to favorites.`);
            } finally {
                setFavoriteActionRole("");
            }

            return;
        }

        const existingFavorite = favoritesList.find((item) => matchesFavoriteContact(currentContact, item));

        if (!existingFavorite?.id) {
            updateNestedField(`${roleKey}.saveToFavorites`, false);
            return;
        }

        const isLocalFavorite = typeof existingFavorite.id === "string" && existingFavorite.id.startsWith("local-");
        if (!authUser || isLocalFavorite) {
            removeLocally(existingFavorite.id);
            return;
        }

        setFavoriteActionRole(roleKey);

        try {
            const response = await fetch(`/couriers/favorites/${existingFavorite.id}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": readCsrfToken(),
                },
            });

            const result = await response.json().catch(() => null);

            const responseMessage = String(result?.message || "").toLowerCase();
            const unauthenticated = response.status === 401
                || responseMessage.includes("unauthenticated")
                || (!response.ok && response.status === 419);

            if (unauthenticated) {
                removeLocally(existingFavorite.id);
                return;
            }

            if (!response.ok || !result?.success) {
                throw new Error(result?.message || `Unable to remove ${roleLabel} from favorites.`);
            }

            removeLocally(existingFavorite.id);
        } catch (error) {
            setFavoriteActionError(error?.message || `Unable to remove ${roleLabel} from favorites.`);
        } finally {
            setFavoriteActionRole("");
        }
    };

    const handleCourierProviderChange = (index, providerId) => {
        setData((previous) => {
            const packagesDraft = Array.isArray(previous.packages) ? [...previous.packages] : [];
            const currentPackage = packagesDraft[index] ? { ...packagesDraft[index] } : {};
            const entry = quoteMatrix.find((item) => item.packageIndex === index);
            const provider = entry?.providers?.find((option) => option.id === providerId);
            const tiers = provider?.tiers || [];

            currentPackage.courierProvider = providerId || "";
            currentPackage.serviceLevel = providerId
                ? (tiers.some((tier) => tier.id === currentPackage.serviceLevel)
                    ? currentPackage.serviceLevel
                    : tiers[0]?.id || "")
                : "";

            packagesDraft[index] = currentPackage;

            return {
                ...previous,
                packages: packagesDraft,
            };
        });
    };

    const handleServiceLevelChange = (index, serviceLevelId) => {
        setData((previous) => {
            const packagesDraft = Array.isArray(previous.packages) ? [...previous.packages] : [];
            const currentPackage = packagesDraft[index] ? { ...packagesDraft[index] } : {};
            const providerId = currentPackage.courierProvider;

            if (!providerId) {
                currentPackage.serviceLevel = serviceLevelId;
            } else {
                const entry = quoteMatrix.find((item) => item.packageIndex === index);
                const provider = entry?.providers?.find((option) => option.id === providerId);
                const tiers = provider?.tiers || [];
                const tierExists = tiers.some((tier) => tier.id === serviceLevelId);

                currentPackage.serviceLevel = tierExists ? serviceLevelId : tiers[0]?.id || "";
            }

            packagesDraft[index] = currentPackage;

            return {
                ...previous,
                packages: packagesDraft,
            };
        });
    };

    const FormTag = renderAsForm ? "form" : "div";
    const formProps = renderAsForm ? { onSubmit: handleSubmit } : {};

    return (
        <div className={inline ? "text-[#0B1739]" : "min-h-screen flex flex-col bg-[#F4F7FB] text-[#0B1739]"}>
            {!inline && <Head title="Courier Details" />}
            {!inline && <Header />}

            {!inline && (
                <section className="bg-[#0B1739] text-white">
                    <div className="container mx-auto px-4 py-6">
                        <p className="uppercase tracking-wide text-xs text-[#6FB3FF]">Courier Service</p>
                        <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Enter shipment details</h1>
                        <p className="mt-2 max-w-2xl text-xs text-white/80 md:text-sm">
                            Provide sender and recipient information along with shipment preferences. We'll use these details to prepare your booking summary.
                        </p>
                    </div>
                </section>
            )}

            <main className={inline ? "" : "container mx-auto mt-4 mb-8 flex-1 px-4"}>
                <div className={`poppins${inline ? "" : " rounded-2xl bg-white px-4 py-5 shadow-xl md:px-6"}`}>
                    <FormTag {...formProps} className="space-y-5">
                        {governanceRuntimeErrors.length > 0 && (
                            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-semibold text-amber-900">Pricing governance blocked submission</p>
                                <p className="mt-1 text-xs text-amber-800">Review the locked quote fields and selected service/provider values before continuing.</p>
                                <div className="mt-2 space-y-1">
                                    {governanceRuntimeErrors.map((message, index) => (
                                        <p key={`governance-runtime-error-${index}`} className="text-xs text-amber-900">• {message}</p>
                                    ))}
                                </div>
                            </section>
                        )}

                        {favoriteActionError && (
                            <section className="rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-xs text-red-700">{favoriteActionError}</p>
                            </section>
                        )}



                        <div className="mb-4">
                            <h2 className="text-xl font-semibold text-[#0B1739]">Shipment details</h2>
                            <p className="mt-1 text-sm text-[#5B6887]">
                                Add pickup, delivery, and shipment preferences to complete the request.
                            </p>
                        </div>
                        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <div className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#0B1739]">Sender details</h2>
                                        <p className="mt-1 text-xs text-[#5B6887]">Pickup contact and address</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {canUseSenderProfile && (
                                            <button
                                                type="button"
                                                onClick={handleUseSenderProfile}
                                                className="inline-flex items-center gap-2 rounded-[5px] border border-[#0955AC] px-3 py-1 text-xs font-semibold text-[#0955AC] hover:bg-[#0955AC]/10"
                                            >
                                                {senderProfileLabel}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setShowSenderFavoritePicker(true)}
                                            disabled={!hasFavoriteSenders}
                                            className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1 text-xs font-semibold transition ${hasFavoriteSenders ? "border-[#0955AC] text-[#0955AC] hover:bg-[#0955AC]/10" : "cursor-not-allowed border-[#D6DEEB] text-[#A0AEC0]"}`}
                                        >
                                            Use saved sender
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleFavoriteToggle("sender")}
                                            disabled={favoriteActionRole === "sender"}
                                            className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1 text-xs font-semibold transition ${senderFavorite ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#D6DEEB] bg-white text-[#0B1739] hover:border-[#0955AC]"}`}
                                            aria-pressed={senderFavorite}
                                            title={senderFavorite ? "Sender saved" : "Add sender to favorites"}
                                        >
                                            <Star
                                                className={`h-4 w-4 ${senderFavorite ? "text-amber-500" : "text-[#6B7893]"}`}
                                                fill={senderFavorite ? "currentColor" : "none"}
                                            />
                                            <span>
                                                {favoriteActionRole === "sender"
                                                    ? "Saving..."
                                                    : (senderFavorite ? "Saved to favorites" : "Add to favorites")}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Name *</label>
                                            <input
                                                type="text"
                                                value={data.sender.name}
                                                onChange={(event) => updateNestedField("sender.name", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="Jane Smith"
                                                required
                                            />
                                            {combinedErrors["sender.name"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.name"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Phone</label>
                                            <input
                                                type="text"
                                                value={data.sender.phone}
                                                onChange={(event) => updateNestedField("sender.phone", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="+1 202 555 0147"
                                            />
                                            {combinedErrors["sender.phone"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.phone"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Email</label>
                                            <input
                                                type="email"
                                                value={data.sender.email}
                                                onChange={(event) => updateNestedField("sender.email", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="jane@example.com"
                                            />
                                            {combinedErrors["sender.email"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.email"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Company</label>
                                            <input
                                                type="text"
                                                value={data.sender.company}
                                                onChange={(event) => updateNestedField("sender.company", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="Acme Corp"
                                            />
                                            {combinedErrors["sender.company"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.company"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Address line 1 *</label>
                                        <input
                                            type="text"
                                            value={data.sender.address.line1}
                                            onChange={(event) => updateNestedField("sender.address.line1", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="123 Main Street"
                                            required
                                        />
                                        {combinedErrors["sender.address.line1"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.line1"]}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Address line 2</label>
                                        <input
                                            type="text"
                                            value={data.sender.address.line2}
                                            onChange={(event) => updateNestedField("sender.address.line2", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="Suite 400"
                                        />
                                        {combinedErrors["sender.address.line2"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.line2"]}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">City *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.sender.address.city}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                    placeholder="Colombo"
                                                    required
                                                />
                                                {activeAddressField === "sender-city" && citySuggestions.sender.length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {citySuggestions.sender.map((option) => (
                                                            <button
                                                                key={`sender-city-suggestion-${option.value}-${option.postcode}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyCitySuggestion("sender", option);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {option.label}{option.postcode ? `, ${option.postcode}` : ""}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["sender.address.city"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.city"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Country *</label>
                                            <select
                                                value={data.sender.address.country}
                                                disabled
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                required
                                            >
                                                {countries.map((countryCode) => (
                                                    <option key={`sender-country-${countryCode}`} value={countryCode}>
                                                        {countryCode}
                                                    </option>
                                                ))}
                                            </select>
                                            {combinedErrors["sender.address.country"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.country"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">State / Province</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.sender.address.state}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                    placeholder="Western"
                                                />
                                                {activeAddressField === "sender-state" && getProvinceSuggestions("sender", data.sender.address.state).length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {getProvinceSuggestions("sender", data.sender.address.state).map((province) => (
                                                            <button
                                                                key={`sender-province-suggestion-${province}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyProvinceSuggestion("sender", province);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {province}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["sender.address.state"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.state"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Postal code</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.sender.address.postalCode}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                />
                                                {activeAddressField === "sender-postal" && getPostalSuggestions("sender", data.sender.address.postalCode, data.sender.address.state).length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {getPostalSuggestions("sender", data.sender.address.postalCode, data.sender.address.state).map((option) => (
                                                            <button
                                                                key={`sender-postal-suggestion-${option.value}-${option.postcode}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyPostalSuggestion("sender", option);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {option.postcode} - {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["sender.address.postalCode"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.postalCode"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Pickup instructions</label>
                                        <textarea
                                            rows="2"
                                            value={data.sender.address.instructions}
                                            onChange={(event) => updateNestedField("sender.address.instructions", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="Gate access code, preferred pickup window, etc."
                                        />
                                        {combinedErrors["sender.address.instructions"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["sender.address.instructions"]}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#0B1739]">Recipient details</h2>
                                        <p className="mt-1 text-xs text-[#5B6887]">Delivery contact and address</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowFavoritePicker(true)}
                                            disabled={!hasFavoriteRecipients}
                                            className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1 text-xs font-semibold transition ${hasFavoriteRecipients ? "border-[#0955AC] text-[#0955AC] hover:bg-[#0955AC]/10" : "cursor-not-allowed border-[#D6DEEB] text-[#A0AEC0]"}`}
                                        >
                                            Use saved recipient
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFavoriteToggle("recipient")}
                                            disabled={favoriteActionRole === "recipient"}
                                            className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1 text-xs font-semibold transition ${recipientFavorite ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#D6DEEB] bg-white text-[#0B1739] hover:border-[#0955AC]"}`}
                                            aria-pressed={recipientFavorite}
                                            title={recipientFavorite ? "Recipient saved" : "Add recipient to favorites"}
                                        >
                                            <Star
                                                className={`h-4 w-4 ${recipientFavorite ? "text-amber-500" : "text-[#6B7893]"}`}
                                                fill={recipientFavorite ? "currentColor" : "none"}
                                            />
                                            <span>
                                                {favoriteActionRole === "recipient"
                                                    ? "Saving..."
                                                    : (recipientFavorite ? "Saved to favorites" : "Add to favorites")}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2">

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Name *</label>
                                            <input
                                                type="text"
                                                value={data.recipient.name}
                                                onChange={(event) => updateNestedField("recipient.name", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="Michael Brown"
                                                required
                                            />
                                            {combinedErrors["recipient.name"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.name"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Phone</label>
                                            <input
                                                type="text"
                                                value={data.recipient.phone}
                                                onChange={(event) => updateNestedField("recipient.phone", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="+44 20 7946 0958"
                                            />
                                            {combinedErrors["recipient.phone"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.phone"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Email</label>
                                            <input
                                                type="email"
                                                value={data.recipient.email}
                                                onChange={(event) => updateNestedField("recipient.email", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="michael@example.com"
                                            />
                                            {combinedErrors["recipient.email"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.email"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Company</label>
                                            <input
                                                type="text"
                                                value={data.recipient.company}
                                                onChange={(event) => updateNestedField("recipient.company", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                                placeholder="Recipient Inc."
                                            />
                                            {combinedErrors["recipient.company"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.company"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Address line 1 *</label>
                                        <input
                                            type="text"
                                            value={data.recipient.address.line1}
                                            onChange={(event) => updateNestedField("recipient.address.line1", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="45 Oxford Street"
                                            required
                                        />
                                        {combinedErrors["recipient.address.line1"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.line1"]}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Address line 2</label>
                                        <input
                                            type="text"
                                            value={data.recipient.address.line2}
                                            onChange={(event) => updateNestedField("recipient.address.line2", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="Floor 2"
                                        />
                                        {combinedErrors["recipient.address.line2"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.line2"]}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">City *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.recipient.address.city}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                    placeholder="London"
                                                    required
                                                />
                                                {activeAddressField === "recipient-city" && citySuggestions.recipient.length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {citySuggestions.recipient.map((option) => (
                                                            <button
                                                                key={`recipient-city-suggestion-${option.value}-${option.postcode}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyCitySuggestion("recipient", option);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {option.label}{option.postcode ? `, ${option.postcode}` : ""}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["recipient.address.city"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.city"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Country *</label>
                                            <select
                                                value={data.recipient.address.country}
                                                disabled
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                required
                                            >
                                                {countries.map((countryCode) => (
                                                    <option key={`recipient-country-${countryCode}`} value={countryCode}>
                                                        {countryCode}
                                                    </option>
                                                ))}
                                            </select>
                                            {combinedErrors["recipient.address.country"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.country"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">State / Province</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.recipient.address.state}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                    placeholder="Greater London"
                                                />
                                                {activeAddressField === "recipient-state" && getProvinceSuggestions("recipient", data.recipient.address.state).length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {getProvinceSuggestions("recipient", data.recipient.address.state).map((province) => (
                                                            <button
                                                                key={`recipient-province-suggestion-${province}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyProvinceSuggestion("recipient", province);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {province}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["recipient.address.state"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.state"]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">Postal code</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.recipient.address.postalCode}
                                                    readOnly
                                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none cursor-not-allowed bg-[#F3F6FB] opacity-60"
                                                />
                                                {activeAddressField === "recipient-postal" && getPostalSuggestions("recipient", data.recipient.address.postalCode, data.recipient.address.state).length > 0 && (
                                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white shadow-lg">
                                                        {getPostalSuggestions("recipient", data.recipient.address.postalCode, data.recipient.address.state).map((option) => (
                                                            <button
                                                                key={`recipient-postal-suggestion-${option.value}-${option.postcode}`}
                                                                type="button"
                                                                onMouseDown={(event) => {
                                                                    event.preventDefault();
                                                                    applyPostalSuggestion("recipient", option);
                                                                }}
                                                                className="block w-full px-3 py-2 text-left text-xs text-[#0B1739] hover:bg-[#F0F7FF]"
                                                            >
                                                                {option.postcode} - {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {combinedErrors["recipient.address.postalCode"] && (
                                                <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.postalCode"]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-medium">Delivery instructions</label>
                                        <textarea
                                            rows="2"
                                            value={data.recipient.address.instructions}
                                            onChange={(event) => updateNestedField("recipient.address.instructions", event.target.value)}
                                            className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            placeholder="Leave with reception, call on arrival, etc."
                                        />
                                        {combinedErrors["recipient.address.instructions"] && (
                                            <p className="mt-1 text-xs text-red-500">{combinedErrors["recipient.address.instructions"]}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-[#E3EAF5] bg-[#F9FBFF] p-4">
                            <h2 className="text-base font-semibold text-[#0B1739]">Shipment preferences</h2>
                            <p className="mt-1 text-xs text-[#5B6887]">Pickup schedule and coverage options</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Pickup date</label>
                                    <input
                                        type="date"
                                        value={data.shipment.pickupDate}
                                        onChange={(event) => updateNestedField("shipment.pickupDate", event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    />
                                    {combinedErrors["shipment.pickupDate"] && (
                                        <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.pickupDate"]}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Pickup window start</label>
                                    <input
                                        type="time"
                                        value={data.shipment.pickupWindowStart}
                                        onChange={(event) => updateNestedField("shipment.pickupWindowStart", event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    />
                                    {combinedErrors["shipment.pickupWindowStart"] && (
                                        <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.pickupWindowStart"]}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Pickup window end</label>
                                    <input
                                        type="time"
                                        value={data.shipment.pickupWindowEnd}
                                        onChange={(event) => updateNestedField("shipment.pickupWindowEnd", event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    />
                                    {combinedErrors["shipment.pickupWindowEnd"] && (
                                        <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.pickupWindowEnd"]}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-[#E3EAF5] bg-white px-3 py-2">
                                    <input
                                        id="shipment-insurance"
                                        type="checkbox"
                                        checked={Boolean(data.shipment.insurance)}
                                        onChange={(event) => updateNestedField("shipment.insurance", event.target.checked)}
                                        className="h-4 w-4 rounded border-[#B8C5E0] text-[#0955AC] focus:ring-[#0955AC]"
                                    />
                                    <label htmlFor="shipment-insurance" className="text-xs text-[#0B1739]">
                                        Add insurance coverage for the declared value
                                    </label>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Declared value ({data.reviewContext?.displayCurrency || DEFAULT_CURRENCY})</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.shipment.estimatedValue}
                                        onChange={(event) => updateNestedField("shipment.estimatedValue", event.target.value)}
                                        disabled={!data.shipment.insurance && !data.shipment.codEnabled}
                                        className={`w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none ${data.shipment.insurance || data.shipment.codEnabled ? "bg-white" : "cursor-not-allowed bg-[#F3F6FB] opacity-60"}`}
                                        placeholder="0"
                                    />
                                    {combinedErrors["shipment.estimatedValue"] && (
                                        <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.estimatedValue"]}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 rounded-lg border border-[#D6DEEB] bg-white p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        id="shipment-cod-enabled"
                                        type="checkbox"
                                        checked={Boolean(data.shipment.codEnabled)}
                                        disabled={!codAvailableForRoute}
                                        onChange={(event) => {
                                            const nextValue = event.target.checked;
                                            updateNestedField("shipment.codEnabled", nextValue);
                                            if (!nextValue) {
                                                updateNestedField("shipment.codAmount", "");
                                                updateNestedField("shipment.codPaymentMethod", "");
                                            }
                                        }}
                                        className={`h-4 w-4 rounded border-[#B8C5E0] text-[#0955AC] focus:ring-[#0955AC] ${!codAvailableForRoute ? "cursor-not-allowed opacity-60" : ""}`}
                                    />
                                    <label htmlFor="shipment-cod-enabled" className="text-xs font-medium text-[#0B1739]">
                                        Enable Cash on Delivery (domestic only)
                                    </label>
                                </div>

                                {!codAvailableForRoute && (
                                    <p className="mt-2 text-xs text-[#6B7280]">
                                        COD is disabled for international routes.
                                    </p>
                                )}

                                {combinedErrors["shipment.codEnabled"] && (
                                    <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.codEnabled"]}</p>
                                )}

                                {codAvailableForRoute && Boolean(data.shipment.codEnabled) && (
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium">COD amount ({data.reviewContext?.displayCurrency || DEFAULT_CURRENCY})</label>
                                            <div className="w-full rounded-lg border border-[#D6DEEB] bg-[#F8FAFF] px-3 py-2 text-sm text-[#0B1739]">
                                                {resolvedCodAmount !== null
                                                    ? `${resolvedCodAmount.toFixed(2)} ${data.reviewContext?.displayCurrency || DEFAULT_CURRENCY}`
                                                    : "Set a declared value to auto-calculate COD amount."}
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#6B7280]">COD amount is auto-calculated from declared shipment/package values.</p>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-medium">COD payment method</label>
                                            <select
                                                value={data.shipment.codPaymentMethod || ""}
                                                onChange={(event) => updateNestedField("shipment.codPaymentMethod", event.target.value)}
                                                className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                            >
                                                <option value="">Select method</option>
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="check">Check</option>
                                                <option value="bank_transfer">Bank transfer</option>
                                            </select>
                                            {combinedErrors["shipment.codPaymentMethod"] && (
                                                <p className="mt-2 text-xs text-red-500">{combinedErrors["shipment.codPaymentMethod"]}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>



                        <div className="flex flex-col items-center gap-3">
                            {!hideSubmit && (
                                <button
                                    type={renderAsForm ? "submit" : "button"}
                                    onClick={renderAsForm ? undefined : handleSubmit}
                                    disabled={processing}
                                    className={`w-full max-w-sm rounded-lg bg-[#0955AC] px-6 py-2.5 text-center text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[#0a4b93] focus:ring-offset-2 ${processing ? "cursor-not-allowed opacity-50" : "hover:bg-[#0a4b93]"
                                        }`}
                                >
                                    {processing ? "Saving details..." : "Continue to summary"}
                                </button>
                            )}
                            {submitError && (
                                <p className="text-xs text-[#D14343]">{submitError}</p>
                            )}
                            {showBackLink && !onBackClick && (
                                <Link
                                    href={resolvedBackHref}
                                    className="text-xs text-[#5B6887] hover:text-[#0955AC] transition"
                                >
                                    ← Go back to package selection
                                </Link>
                            )}
                            {showBackLink && onBackClick && (
                                <button
                                    type="button"
                                    onClick={onBackClick}
                                    className="text-xs text-[#5B6887] hover:text-[#0955AC] transition"
                                >
                                    ← Go back to package selection
                                </button>
                            )}
                        </div>
                    </FormTag>
                </div>
            </main>

            {showFavoritePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-[#0B1739]">Saved recipients</h3>
                                <p className="text-xs text-[#5B6887]">Select a recipient to fill the form.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFavoritePicker(false)}
                                className="rounded-[5px] border border-[#D6DEEB] px-3 py-1 text-xs font-semibold text-[#0B1739] hover:border-[#0955AC]"
                            >
                                Close
                            </button>
                        </div>

                        {hasFavoriteRecipients ? (
                            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {savedRecipients.map((recipient) => (
                                    <div key={`favorite-recipient-${recipient.id}`} className="rounded-xl border border-[#E3EAF5] bg-[#F9FBFF] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-[#0B1739]">{recipient.name || "Recipient"}</p>
                                                {recipient.company && (
                                                    <p className="text-xs text-[#6B7893]">{recipient.company}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    applyRecipientSelection(recipient);
                                                    setShowFavoritePicker(false);
                                                }}
                                                className="rounded-[5px] border border-[#0955AC] px-3 py-1 text-xs font-semibold text-[#0955AC] hover:bg-[#0955AC]/10"
                                            >
                                                Use
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-[#5B6887]">
                                            {recipient.email && <p>Email: {recipient.email}</p>}
                                            {recipient.phone && <p>Phone: {recipient.phone}</p>}
                                            {recipient.address && (
                                                <p>Address: {formatContactAddress(recipient.address)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg bg-[#F9FBFF] p-3 text-xs text-[#5B6887]">
                                No saved recipients yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSenderFavoritePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-[#0B1739]">Saved senders</h3>
                                <p className="text-xs text-[#5B6887]">Select a sender to fill the form.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSenderFavoritePicker(false)}
                                className="rounded-[5px] border border-[#D6DEEB] px-3 py-1 text-xs font-semibold text-[#0B1739] hover:border-[#0955AC]"
                            >
                                Close
                            </button>
                        </div>

                        {hasFavoriteSenders ? (
                            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {savedSenders.map((sender) => (
                                    <div key={`favorite-sender-${sender.id}`} className="rounded-xl border border-[#E3EAF5] bg-[#F9FBFF] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-[#0B1739]">{sender.name || "Sender"}</p>
                                                {sender.company && (
                                                    <p className="text-xs text-[#6B7893]">{sender.company}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    applySenderSelection(sender);
                                                    setShowSenderFavoritePicker(false);
                                                }}
                                                className="rounded-[5px] border border-[#0955AC] px-3 py-1 text-xs font-semibold text-[#0955AC] hover:bg-[#0955AC]/10"
                                            >
                                                Use
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-[#5B6887]">
                                            {sender.email && <p>Email: {sender.email}</p>}
                                            {sender.phone && <p>Phone: {sender.phone}</p>}
                                            {sender.address && (
                                                <p>Address: {formatContactAddress(sender.address)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg bg-[#F9FBFF] p-3 text-xs text-[#5B6887]">
                                No saved senders yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!inline && <Footer />}
        </div>
    );
};

export default Details;


