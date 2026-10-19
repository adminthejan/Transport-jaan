import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";

const STATUS_STYLES = {
    pending: "bg-[#FFF4E0] text-[#8A5A00]",
    quoted: "bg-[#E2F6DC] text-[#1F6B1A]",
    declined: "bg-[#F3F4F6] text-[#4B5563]",
};

const formatLkr = (amount) =>
    amount === null || amount === undefined
        ? "-"
        : `LKR ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RATE_LABELS = { per_sqft: "Per sq ft", per_cbm: "Per CBM", flat_rate: "Flat rate" };

const emptyCharges = (quote) => ({
    monthly_rate: quote?.baseMonthlyRate ?? "",
    duration_months: quote?.requestDetails?.duration_months || 1,
    security_deposit: "",
    setup_fee: "",
    tax_rate: "",
    other_charges: [],
    valid_until: "",
    vendor_notes: "",
});

const QuotesContent = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("pending");
    const [activeId, setActiveId] = useState(null);
    const [charges, setCharges] = useState(emptyCharges(null));
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await axios.get("/vendors/warehouse/api/quote-requests");
            setQuotes(Array.isArray(data?.data) ? data.data : []);
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Could not load quote requests.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const visibleQuotes = useMemo(
        () => quotes.filter((quote) => filter === "all" || quote.status === filter),
        [quotes, filter]
    );

    const activeQuote = quotes.find((quote) => quote.id === activeId) || null;

    const openQuote = (quote) => {
        setActiveId(quote.id);
        setFormError("");
        setCharges(
            quote.vendorCharges
                ? {
                    monthly_rate: quote.vendorCharges.monthly_rate ?? "",
                    duration_months: quote.vendorCharges.duration_months ?? 1,
                    security_deposit: quote.vendorCharges.security_deposit ?? "",
                    setup_fee: quote.vendorCharges.setup_fee ?? "",
                    tax_rate: quote.vendorCharges.tax_rate ?? "",
                    other_charges: quote.vendorCharges.other_charges ?? [],
                    valid_until: quote.validUntil || "",
                    vendor_notes: quote.vendorNotes || "",
                }
                : emptyCharges(quote)
        );
    };

    const setField = (field) => (event) => setCharges((previous) => ({ ...previous, [field]: event.target.value }));

    const updateOtherCharge = (index, field, value) =>
        setCharges((previous) => ({
            ...previous,
            other_charges: previous.other_charges.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
        }));

    // Live preview only; the server recomputes the authoritative totals.
    const preview = useMemo(() => {
        const monthly = Number(charges.monthly_rate) || 0;
        const months = Math.max(1, Number(charges.duration_months) || 1);
        const deposit = Number(charges.security_deposit) || 0;
        const setup = Number(charges.setup_fee) || 0;
        const taxRate = Number(charges.tax_rate) || 0;
        const others = charges.other_charges.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        const rent = monthly * months;
        const tax = (rent + others) * (taxRate / 100);
        return { rent, others, tax, total: rent + others + tax + deposit + setup, initial: monthly + deposit + setup };
    }, [charges]);

    const postCharges = async () => {
        if (!activeQuote) return;
        setSaving(true);
        setFormError("");
        try {
            await axios.post(`/vendors/warehouse/api/quote-requests/${activeQuote.id}/respond`, {
                monthly_rate: Number(charges.monthly_rate),
                duration_months: Number(charges.duration_months),
                security_deposit: charges.security_deposit === "" ? null : Number(charges.security_deposit),
                setup_fee: charges.setup_fee === "" ? null : Number(charges.setup_fee),
                tax_rate: charges.tax_rate === "" ? null : Number(charges.tax_rate),
                other_charges: charges.other_charges
                    .filter((row) => String(row.label || "").trim() !== "")
                    .map((row) => ({ label: row.label, amount: Number(row.amount) || 0 })),
                valid_until: charges.valid_until || null,
                vendor_notes: charges.vendor_notes || null,
            });
            await load();
            setActiveId(null);
        } catch (requestError) {
            const validation = requestError?.response?.data?.errors;
            const first = validation ? Object.values(validation).flat()[0] : null;
            setFormError(first || requestError?.response?.data?.message || "Could not post the charges.");
        } finally {
            setSaving(false);
        }
    };

    const declineQuote = async () => {
        if (!activeQuote || !window.confirm("Decline this quote request? The customer will be notified.")) return;
        setSaving(true);
        setFormError("");
        try {
            await axios.post(`/vendors/warehouse/api/quote-requests/${activeQuote.id}/decline`, {
                vendor_notes: charges.vendor_notes || null,
            });
            await load();
            setActiveId(null);
        } catch (requestError) {
            setFormError(requestError?.response?.data?.message || "Could not decline the request.");
        } finally {
            setSaving(false);
        }
    };

    const counts = useMemo(
        () => ({
            pending: quotes.filter((quote) => quote.status === "pending").length,
            quoted: quotes.filter((quote) => quote.status === "quoted").length,
            all: quotes.length,
        }),
        [quotes]
    );

    return (
        <div className="poppins p-5 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h1 className="text-[24px] font-[700]">Quote Requests</h1>
                    <p className="text-[13px] text-[#00000080]">
                        Customers ask for a quote on your warehouses. Once you have agreed the details with them, post your final charges here.
                    </p>
                </div>
                <div className="flex gap-2 text-[12px] font-[600]">
                    {[
                        ["pending", `Pending (${counts.pending})`],
                        ["quoted", `Quoted (${counts.quoted})`],
                        ["all", `All (${counts.all})`],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`rounded-full border px-4 py-1.5 transition-colors ${
                                filter === value ? "bg-[#0955AC] border-[#0955AC] text-white" : "border-[#0955AC55] text-[#0955AC] bg-white"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="mt-6 text-[13px] text-red-600">{error}</p>}
            {loading && <p className="mt-6 text-[13px] text-[#00000080]">Loading quote requests...</p>}

            {!loading && !error && visibleQuotes.length === 0 && (
                <div className="mt-8 rounded-[12px] border border-dashed border-[#0000002B] p-10 text-center text-[13px] text-[#00000080]">
                    No {filter === "all" ? "" : filter} quote requests yet.
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
                <div className="space-y-3">
                    {visibleQuotes.map((quote) => (
                        <button
                            key={quote.id}
                            type="button"
                            onClick={() => openQuote(quote)}
                            className={`w-full text-left rounded-[12px] border p-4 transition-colors ${
                                activeId === quote.id ? "border-[#0955AC] bg-[#0955AC0D]" : "border-[#0000001A] bg-white hover:border-[#0955AC66]"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[14px] font-[700]">{quote.warehouseName}</p>
                                    <p className="text-[12px] text-[#00000080]">
                                        {quote.customerName} &middot; {quote.reference}
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[11px] font-[700] capitalize ${STATUS_STYLES[quote.status] || ""}`}>
                                    {quote.status}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#000000B2]">
                                <span>{RATE_LABELS[quote.requestDetails?.rate_type] || "Per sq ft"}</span>
                                {quote.requestDetails?.required_space ? <span>{Number(quote.requestDetails.required_space).toLocaleString()} space</span> : null}
                                {quote.requestDetails?.duration_months ? <span>{quote.requestDetails.duration_months} mo</span> : null}
                                {quote.requestDetails?.move_in_date ? <span>from {quote.requestDetails.move_in_date}</span> : null}
                            </div>
                            <p className="mt-2 text-[12px]">
                                {quote.status === "quoted" ? (
                                    <>Quoted: <strong>{formatLkr(quote.quotedTotal)}</strong></>
                                ) : (
                                    <>Customer estimate: <strong>{formatLkr(quote.estimatedTotal)}</strong></>
                                )}
                            </p>
                        </button>
                    ))}
                </div>

                {activeQuote && (
                    <div className="rounded-[12px] border border-[#0000001A] bg-white p-5 h-fit">
                        <h2 className="text-[16px] font-[700]">{activeQuote.warehouseName}</h2>
                        <p className="text-[12px] text-[#00000080]">{activeQuote.reference}</p>

                        <div className="mt-4 rounded-[8px] bg-[#F4F3F3] p-4 text-[12px] space-y-1">
                            <p><strong>{activeQuote.customerName}</strong></p>
                            <p>{activeQuote.customerEmail}{activeQuote.customerPhone ? ` · ${activeQuote.customerPhone}` : ""}</p>
                            {activeQuote.customerNotes && <p className="pt-2 text-[#000000B2]">"{activeQuote.customerNotes}"</p>}
                        </div>

                        {activeQuote.status === "declined" ? (
                            <p className="mt-4 text-[13px] text-[#4B5563]">This request was declined.</p>
                        ) : (
                            <>
                                <h3 className="mt-5 text-[13px] font-[700]">Your charges</h3>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                                    <label>
                                        <span className="font-[600]">Monthly rate (LKR) *</span>
                                        <input type="number" min="0" step="0.01" value={charges.monthly_rate} onChange={setField("monthly_rate")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="font-[600]">Duration (months) *</span>
                                        <input type="number" min="1" max="120" value={charges.duration_months} onChange={setField("duration_months")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="font-[600]">Security deposit</span>
                                        <input type="number" min="0" step="0.01" value={charges.security_deposit} onChange={setField("security_deposit")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="font-[600]">Setup fee</span>
                                        <input type="number" min="0" step="0.01" value={charges.setup_fee} onChange={setField("setup_fee")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="font-[600]">Tax (%)</span>
                                        <input type="number" min="0" max="100" step="0.01" value={charges.tax_rate} onChange={setField("tax_rate")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                    <label>
                                        <span className="font-[600]">Valid until</span>
                                        <input type="date" value={charges.valid_until} onChange={setField("valid_until")}
                                            className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                    </label>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-[600]">Other charges</span>
                                        <button
                                            type="button"
                                            onClick={() => setCharges((previous) => ({ ...previous, other_charges: [...previous.other_charges, { label: "", amount: "" }] }))}
                                            className="inline-flex items-center gap-1 text-[12px] font-[700] text-[#0955AC]"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add charge
                                        </button>
                                    </div>
                                    {charges.other_charges.map((row, index) => (
                                        <div key={`other-${index}`} className="mt-2 grid grid-cols-[1fr_120px_28px] gap-2 text-[12px]">
                                            <input value={row.label} onChange={(event) => updateOtherCharge(index, "label", event.target.value)} placeholder="Description"
                                                className="rounded-[6px] border border-[#00000033] px-3 py-2" />
                                            <input type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateOtherCharge(index, "amount", event.target.value)} placeholder="Amount"
                                                className="rounded-[6px] border border-[#00000033] px-3 py-2" />
                                            <button
                                                type="button"
                                                onClick={() => setCharges((previous) => ({ ...previous, other_charges: previous.other_charges.filter((_, rowIndex) => rowIndex !== index) }))}
                                                className="text-red-500"
                                                aria-label="Remove charge"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <label className="block mt-4 text-[12px]">
                                    <span className="font-[600]">Notes for the customer</span>
                                    <textarea rows={3} value={charges.vendor_notes} onChange={setField("vendor_notes")} maxLength={2000}
                                        className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2" />
                                </label>

                                <div className="mt-4 rounded-[8px] bg-[#0955AC0D] p-4 text-[12px] space-y-1">
                                    <div className="flex justify-between"><span>Initial payment (first month + deposit + setup)</span><strong>{formatLkr(preview.initial)}</strong></div>
                                    <div className="flex justify-between"><span>Rent</span><span>{formatLkr(preview.rent)}</span></div>
                                    <div className="flex justify-between"><span>Other charges</span><span>{formatLkr(preview.others)}</span></div>
                                    <div className="flex justify-between"><span>Tax</span><span>{formatLkr(preview.tax)}</span></div>
                                    <div className="flex justify-between text-[14px] text-[#0955AC] pt-1 border-t border-[#0955AC33]">
                                        <strong>Total quoted</strong><strong>{formatLkr(preview.total)}</strong>
                                    </div>
                                </div>

                                {formError && <p className="mt-3 text-[12px] text-red-600">{formError}</p>}

                                <div className="mt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={postCharges}
                                        disabled={saving || !charges.monthly_rate}
                                        className="rounded-[6px] bg-[#0955AC] px-5 py-2.5 text-[12px] font-[700] text-white disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : activeQuote.status === "quoted" ? "Update charges" : "Post charges"}
                                    </button>
                                    {activeQuote.status === "pending" && (
                                        <button
                                            type="button"
                                            onClick={declineQuote}
                                            disabled={saving}
                                            className="rounded-[6px] border border-[#00000033] px-5 py-2.5 text-[12px] font-[700] text-[#4B5563]"
                                        >
                                            Decline
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotesContent;
