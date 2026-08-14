import React from "react";
import { Globe, Coins } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

/** Compact language + currency picker for the ticket booking toolbar. */
const LocaleSelector = () => {
    const { locale, setLocale, currency, setCurrency, languages, currencies } = useLocale();

    const selectClass =
        "appearance-none bg-white border border-[#E2E8F0] rounded-full pl-8 pr-3 py-1.5 text-[12px] font-[700] text-[#475569] focus:outline-none focus:border-[#0955AC]/40 cursor-pointer";

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <Globe className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0955AC]" />
                <select value={locale} onChange={(e) => setLocale(e.target.value)} className={selectClass}>
                    {languages.map((l) => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                </select>
            </div>
            <div className="relative">
                <Coins className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0955AC]" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                    {currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default LocaleSelector;
