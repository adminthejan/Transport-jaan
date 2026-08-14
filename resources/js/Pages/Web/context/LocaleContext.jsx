import React, { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY_LOCALE = "tj_locale";
const STORAGE_KEY_CURRENCY = "tj_currency";

// Static conversion rates against LKR, which is the currency all ticket
// prices are stored/quoted in throughout the backend.
const CURRENCY_RATES = {
    LKR: { rate: 1, locale: "en-LK" },
    USD: { rate: 1 / 300, locale: "en-US" },
    EUR: { rate: 1 / 325, locale: "de-DE" },
};

const TRANSLATIONS = {
    en: {
        from: "From",
        to: "To",
        boarding_place: "Boarding Place",
        dropoff_place: "Drop-off Place",
        journey_date: "Journey Date",
        return_date: "Return Date",
        one_way: "One way",
        round_trip: "Round Trip",
        search_buses: "Search Buses",
        search_trains: "Search Trains",
        find_your_buses: "Find Your Buses",
        find_your_trains: "Find Your Trains",
        sort_by: "Sort by",
        cheapest: "Cheapest",
        fastest: "Fastest",
        earliest: "Earliest",
        seats: "Seats",
        operator: "Operator",
        arrival: "Arrival",
        name: "Name",
        select_seats_form: "Select seats & fill form",
        select_seats_both: "Select seats for both journeys",
        passenger_details: "Passenger Details",
        passenger_information: "Passenger Information",
        passenger_name: "Passenger Name",
        full_name: "Full Name",
        mobile_number: "Mobile Number",
        phone_number: "Phone Number",
        email_optional: "Email (Optional)",
        email_address: "Email Address",
        continue_to_pay: "Continue to pay",
        confirm_booking: "Confirm Booking",
        total: "Total",
        fare_summary: "Fare Summary",
        adults: "Adults",
        children: "Children",
        infants: "Infants",
        language: "Language",
        currency: "Currency",
    },
    si: {
        from: "සිට",
        to: "දක්වා",
        boarding_place: "නැගුම් ස්ථානය",
        dropoff_place: "බැසුම් ස්ථානය",
        journey_date: "ගමන් දිනය",
        return_date: "ආපසු දිනය",
        one_way: "එක් අතක්",
        round_trip: "යාම-ඊම",
        search_buses: "බස් සොයන්න",
        search_trains: "දුම්රිය සොයන්න",
        find_your_buses: "ඔබේ බස් සොයන්න",
        find_your_trains: "ඔබේ දුම්රිය සොයන්න",
        sort_by: "වර්ග කරන්න",
        cheapest: "අඩුම මිල",
        fastest: "වේගවත්ම",
        earliest: "ඉක්මනින්ම",
        seats: "ආසන",
        operator: "මෙහෙයුම්කරු",
        arrival: "පැමිණීම",
        name: "නම",
        select_seats_form: "ආසන තෝරා පෝරමය පුරවන්න",
        select_seats_both: "ගමන් දෙකටම ආසන තෝරන්න",
        passenger_details: "මගී විස්තර",
        passenger_information: "මගී තොරතුරු",
        passenger_name: "මගියාගේ නම",
        full_name: "සම්පූර්ණ නම",
        mobile_number: "ජංගම දුරකථන අංකය",
        phone_number: "දුරකථන අංකය",
        email_optional: "විද්‍යුත් තැපෑල (විකල්ප)",
        email_address: "විද්‍යුත් තැපැල් ලිපිනය",
        continue_to_pay: "ගෙවීමට කරගෙන යන්න",
        confirm_booking: "වෙන්කිරීම තහවුරු කරන්න",
        total: "එකතුව",
        fare_summary: "ගාස්තු සාරාංශය",
        adults: "වැඩිහිටියන්",
        children: "ළමුන්",
        infants: "ළදරුවන්",
        language: "භාෂාව",
        currency: "මුදල් ඒකකය",
    },
};

// A safe default so components using useLocale() outside a <LocaleProvider>
// (e.g. shared cards also rendered on pages that haven't opted in) still
// render sensibly in English/LKR instead of crashing.
const DEFAULT_CONTEXT = {
    locale: "en",
    setLocale: () => {},
    currency: "LKR",
    setCurrency: () => {},
    t: (key, fallback) => TRANSLATIONS.en[key] ?? fallback ?? key,
    formatPrice: (lkrAmount) => `LKR ${(Number(lkrAmount) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    currencies: Object.keys(CURRENCY_RATES),
    languages: [
        { code: "en", label: "English" },
        { code: "si", label: "සිංහල" },
    ],
};

const LocaleContext = createContext(DEFAULT_CONTEXT);

function readStored(key, fallback) {
    if (typeof window === "undefined") return fallback;
    try {
        return window.localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}

export const LocaleProvider = ({ children }) => {
    const [locale, setLocaleState] = useState(() => readStored(STORAGE_KEY_LOCALE, "en"));
    const [currency, setCurrencyState] = useState(() => readStored(STORAGE_KEY_CURRENCY, "LKR"));

    const setLocale = useCallback((next) => {
        setLocaleState(next);
        try { window.localStorage.setItem(STORAGE_KEY_LOCALE, next); } catch {}
    }, []);

    const setCurrency = useCallback((next) => {
        setCurrencyState(next);
        try { window.localStorage.setItem(STORAGE_KEY_CURRENCY, next); } catch {}
    }, []);

    const t = useCallback((key, fallback) => {
        return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? fallback ?? key;
    }, [locale]);

    // `amount` defaults to LKR (every ticket booking price is quoted in LKR
    // at the source) but callers can pass their own source currency — vehicle
    // rental prices, for instance, are stored in USD, not LKR. We pivot
    // through LKR since that's what CURRENCY_RATES is defined against.
    const formatPrice = useCallback((amount, sourceCurrency = "LKR") => {
        const raw = Number(amount) || 0;
        const sourceConf = CURRENCY_RATES[sourceCurrency] || CURRENCY_RATES.LKR;
        const lkrAmount = sourceCurrency === "LKR" ? raw : raw / sourceConf.rate;

        const conf = CURRENCY_RATES[currency] || CURRENCY_RATES.LKR;
        const converted = lkrAmount * conf.rate;
        if (currency === "LKR") {
            return `LKR ${converted.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        }
        return new Intl.NumberFormat(conf.locale, { style: "currency", currency }).format(converted);
    }, [currency]);

    const value = {
        locale,
        setLocale,
        currency,
        setCurrency,
        t,
        formatPrice,
        currencies: Object.keys(CURRENCY_RATES),
        languages: [
            { code: "en", label: "English" },
            { code: "si", label: "සිංහල" },
        ],
    };

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
