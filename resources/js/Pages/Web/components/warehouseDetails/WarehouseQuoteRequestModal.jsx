import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";
import QuoteModal from "../LandVehicleDetails/QuoteModal";
import { formatLkr } from "./WarehousePaymentPlan";

const RATE_LABELS = { per_sqft: "Per sq ft", per_cbm: "Per CBM", flat_rate: "Flat rate" };

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

/**
 * "Request a Quote": sends the customer's requirements to the warehouse
 * owner, who discusses them and then posts their final charges (see the
 * vendor Quotes page). Also offers a printable estimate right away.
 */
const WarehouseQuoteRequestModal = ({ open, onClose, warehouse, formData, pricing, rateType, user }) => {
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentReference, setSentReference] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setSentReference("");
    setContact((previous) => ({
      name: previous.name || user?.name || formData?.contact_person || "",
      email: previous.email || user?.email || formData?.email || "",
      phone: previous.phone || user?.phone || formData?.phone || "",
      notes: previous.notes,
    }));
  }, [open]);

  const isFlatRate = rateType === "flat_rate";
  const unitLabel = rateType === "per_cbm" ? "CBM" : "sq ft";
  const months = Number(formData?.leaseDuration) || 0;

  const summaryRows = useMemo(() => {
    const rows = [
      ["Warehouse", warehouse?.name || "-"],
      ["Location", formData?.warehouseLocation || warehouse?.address || "-"],
      ["Rate type", RATE_LABELS[rateType] || RATE_LABELS.per_sqft],
    ];
    if (!isFlatRate) {
      rows.push(["Required space", formData?.requiredSpace ? `${Number(formData.requiredSpace).toLocaleString()} ${unitLabel}` : "-"]);
    }
    rows.push(["Move-in date", formData?.moveinDate || "-"]);
    rows.push(["Duration", months ? `${months} month${months > 1 ? "s" : ""}` : "-"]);
    if (formData?.fulfillmentService) {
      rows.push(["Services", "Storage & Fulfillment"]);
    }
    return rows;
  }, [warehouse, formData, rateType, isFlatRate, unitLabel, months]);

  const estimatedTotal = Number(pricing?.final_amount) || 0;

  const setField = (field) => (event) => setContact((previous) => ({ ...previous, [field]: event.target.value }));

  const sendRequest = async () => {
    setError("");

    if (!user) {
      router.get("/signin", { return_to: window.location.pathname + window.location.search });
      return;
    }

    if (!contact.name.trim() || !contact.email.trim()) {
      setError("Please enter your name and email so the owner can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post("/warehouse-bookings/quote-requests", {
        warehouse_id: warehouse?.id,
        customer_name: contact.name.trim(),
        customer_email: contact.email.trim(),
        customer_phone: contact.phone.trim() || null,
        customer_notes: contact.notes.trim() || null,
        required_space: isFlatRate ? null : (formData?.requiredSpace ? Number(formData.requiredSpace) : null),
        rate_type: rateType,
        move_in_date: formData?.moveinDate || null,
        duration_months: months || null,
        services: formData?.fulfillmentService ? ["fulfillment"] : [],
        estimated_total: estimatedTotal > 0 ? estimatedTotal : null,
      });

      setSentReference(data?.reference || "sent");
    } catch (requestError) {
      const validation = requestError?.response?.data?.errors;
      const firstValidation = validation ? Object.values(validation).flat()[0] : null;
      setError(firstValidation || requestError?.response?.data?.message || "Could not send your quote request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const printQuotation = () => {
    const popup = window.open("", "_blank", "width=820,height=900");
    if (!popup) {
      setError("Allow pop-ups to download the quotation.");
      return;
    }

    const rows = summaryRows
      .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join("");
    const breakdown = estimatedTotal > 0
      ? `<tr><td>Monthly rate</td><td>${escapeHtml(formatLkr(pricing.monthly_rate))}</td></tr>
         <tr><td>Security deposit</td><td>${escapeHtml(formatLkr(pricing.security_deposit))}</td></tr>
         <tr><td>Setup fee</td><td>${escapeHtml(formatLkr(pricing.setup_fee))}</td></tr>
         <tr><td>Tax</td><td>${escapeHtml(formatLkr(pricing.tax_amount))}</td></tr>
         <tr class="total"><td>Estimated total contract value</td><td>${escapeHtml(formatLkr(estimatedTotal))}</td></tr>`
      : `<tr><td colspan="2">Select your requirements to see an estimate.</td></tr>`;
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    popup.document.write(`<!doctype html><html><head><title>Quotation - ${escapeHtml(warehouse?.name)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111;margin:40px}
        h1{color:#0955AC;margin:0 0 4px} h2{font-size:15px;margin:24px 0 8px}
        table{width:100%;border-collapse:collapse} td{padding:7px 4px;border-bottom:1px solid #ddd;font-size:13px}
        td:last-child{text-align:right;font-weight:600} tr.total td{border-top:2px solid #0955AC;font-size:15px;color:#0955AC}
        .muted{color:#666;font-size:12px}
      </style></head><body>
      <h1>Quotation (estimate)</h1>
      <div class="muted">Prepared by Xsarva (Pvt) Ltd for ${escapeHtml(contact.name || "customer")} &middot; valid until ${escapeHtml(validUntil)}</div>
      <h2>Requirements</h2><table>${rows}</table>
      <h2>Estimated charges</h2><table>${breakdown}</table>
      <p class="muted">This is an estimate based on the listed rates. The warehouse owner confirms the final charges after discussing your requirements.</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    popup.document.close();
  };

  return (
    <QuoteModal open={open} onClose={onClose}>
      <div className="poppins">
        <h1 className="text-[22px] font-[700] text-[#0955AC]">Request a Quote</h1>
        <p className="text-[12px] text-[#00000080] mt-1">
          Send your requirements to the warehouse owner. They will discuss the details with you and post their charges.
        </p>

        {sentReference ? (
          <div className="mt-6 rounded-[10px] bg-[#E2F6DC] p-5 text-[13px] text-[#1F6B1A]">
            <p className="font-[700]">Quote request sent{sentReference !== "sent" ? ` (Ref: ${sentReference})` : ""}.</p>
            <p className="mt-1">You will be notified as soon as the owner posts their charges.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-[6px] bg-[#0955AC] px-5 py-2 text-[12px] font-[700] text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-[10px] border border-[#0000001A] p-4">
              <table className="w-full text-[12px]">
                <tbody>
                  {summaryRows.map(([label, value]) => (
                    <tr key={label} className="border-b border-[#0000000F] last:border-0">
                      <td className="py-2 pr-3 text-[#00000080]">{label}</td>
                      <td className="py-2 text-right font-[600]">{value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 pr-3 font-[700] text-[#0955AC]">Estimated total</td>
                    <td className="pt-3 text-right text-[15px] font-[700] text-[#0955AC]">
                      {estimatedTotal > 0 ? formatLkr(estimatedTotal) : "Select space and duration"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
              <label className="block">
                <span className="font-[600]">Your name *</span>
                <input
                  value={contact.name}
                  onChange={setField("name")}
                  className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2 focus:outline-none focus:border-[#0955AC]"
                />
              </label>
              <label className="block">
                <span className="font-[600]">Email *</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={setField("email")}
                  className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2 focus:outline-none focus:border-[#0955AC]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-[600]">Phone</span>
                <input
                  value={contact.phone}
                  onChange={setField("phone")}
                  className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2 focus:outline-none focus:border-[#0955AC]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="font-[600]">Notes for the owner</span>
                <textarea
                  rows={3}
                  value={contact.notes}
                  onChange={setField("notes")}
                  maxLength={2000}
                  placeholder="Goods, handling needs, access times, anything the owner should know..."
                  className="mt-1 w-full rounded-[6px] border border-[#00000033] px-3 py-2 focus:outline-none focus:border-[#0955AC]"
                />
              </label>
            </div>

            {!user && (
              <p className="mt-3 text-[12px] text-[#8A5A00]">You need to sign in before sending a quote request.</p>
            )}
            {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={sendRequest}
                disabled={submitting}
                className="rounded-[6px] bg-[#0955AC] px-6 py-2.5 text-[12px] font-[700] text-white hover:bg-[#074494] disabled:opacity-60"
              >
                {submitting ? "Sending..." : user ? "Send quote request" : "Sign in to send request"}
              </button>
              <button
                type="button"
                onClick={printQuotation}
                className="rounded-[6px] border border-[#0955AC] px-6 py-2.5 text-[12px] font-[700] text-[#0955AC] hover:bg-[#0955AC0D]"
              >
                Download quotation
              </button>
            </div>
          </>
        )}
      </div>
    </QuoteModal>
  );
};

export default WarehouseQuoteRequestModal;
