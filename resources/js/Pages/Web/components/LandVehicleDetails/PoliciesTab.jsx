import React, { useState } from "react";
import { usePage } from "@inertiajs/react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Fuel,
  AlertCircle,
  Download,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

const PoliciesTab = ({ policyUrl: propPolicy }) => {
  const { vehicle } = usePage().props || {};
  const policyUrl = propPolicy ?? vehicle?.policy_stream_url ?? vehicle?.policy_pdf_url ?? null;
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(false);

  const STANDARD_POLICIES = [
    {
      icon: Clock,
      title: "Cancellation & Refund Guarantee",
      badge: "Flexible",
      color: "blue",
      items: [
        "Free cancellation up to 24 hours prior to the scheduled pick-up time.",
        "Cancellations within 24 hours are subject to a nominal 1-day rental reservation charge.",
        "Instant refunds processed directly to your original payment method or wallet balance.",
      ],
    },
    {
      icon: ShieldCheck,
      title: "Comprehensive Insurance & Protection",
      badge: "Full Cover",
      color: "emerald",
      items: [
        "All rentals include standard comprehensive third-party and collision damage coverage.",
        "24/7 dedicated breakdown and emergency roadside assistance across Sri Lanka.",
        "Zero liability for verified host mechanical failures or non-renter faults.",
      ],
    },
    {
      icon: Fuel,
      title: "Fuel & Cleanliness Policy",
      badge: "Like-for-Like",
      color: "amber",
      items: [
        "Same-to-same fuel policy: return the vehicle with the same level provided at pickup.",
        "Vehicles are delivered sanitized and cleaned; return in general clean condition.",
        "No smoking or pet carriage without host's explicit prior written agreement.",
      ],
    },
    {
      icon: CheckCircle2,
      title: "Driver Eligibility & Documents",
      badge: "Required",
      color: "purple",
      items: [
        "Valid Sri Lankan Driving License or International Driving Permit (IDP).",
        "National Identity Card (NIC) or Passport copy for identity verification.",
        "Minimum driver age requirement is 21 years with at least 1 year driving experience.",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Standard Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STANDARD_POLICIES.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-700">
                  {p.badge}
                </span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 font-medium pl-1">
                {p.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Official Policy PDF Section */}
      {policyUrl ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Official Host Rental Agreement</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed terms and conditions provided directly by the fleet owner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-600 text-xs font-bold border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showEmbeddedPdf ? "Hide Document" : "Preview Document"}</span>
            </button>

            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <span>Download PDF</span>
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3 text-xs text-slate-500">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Standard Jaan Transport platform terms and conditions apply. No custom addendum uploaded for this vehicle.
          </span>
        </div>
      )}

      {/* Embedded PDF Viewer if requested */}
      {policyUrl && showEmbeddedPdf && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-lg bg-slate-100 p-2">
          <div className="h-[600px] w-full rounded-xl overflow-hidden bg-white">
            <iframe
              src={policyUrl}
              title="Official Rental Agreement"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliciesTab;
