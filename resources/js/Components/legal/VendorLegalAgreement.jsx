import React, { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { X } from "lucide-react";

const TITLES = { terms: "Terms and Conditions", privacy: "Privacy Policy" };

const LegalModal = ({ type, scope, onClose }) => {
  const [state, setState] = useState({ loading: true, doc: null, error: false });

  React.useEffect(() => {
    let alive = true;
    axios
      .get(`/legal-documents/${type}`, { params: scope, headers: { Accept: "application/json" } })
      .then(({ data }) => alive && setState({ loading: false, doc: data.document, error: false }))
      .catch(() => alive && setState({ loading: false, doc: null, error: true }));
    return () => {
      alive = false;
    };
  }, [type, scope?.vehicle_id, scope?.warehouse_id, scope?.vendor_id]);

  const { loading, doc, error } = state;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[type]}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[12px] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-[16px] font-[700] text-gray-900">{TITLES[type]}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-[13px] text-gray-700">
          {loading && <p className="text-gray-400">Loading…</p>}
          {!loading && error && <p className="text-red-600">Could not load the document. Please try again.</p>}
          {!loading && !error && !doc && (
            <p className="text-gray-500">The vendor has not published their {TITLES[type]} yet.</p>
          )}
          {!loading && doc?.content && <div className="whitespace-pre-wrap leading-relaxed">{doc.content}</div>}
          {!loading && doc?.file_url && (
            <div className={doc.content ? "mt-5" : ""}>
              <iframe
                title={`${TITLES[type]} PDF`}
                src={doc.file_url}
                className="h-[60vh] w-full rounded border border-gray-200"
              />
              <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] text-[#0955AC] underline">
                Open PDF in a new tab
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[6px] bg-[#0955AC] px-5 text-[12px] font-[700] text-white hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * "Term and Condition" / "Privacy Policy" links that open the owning vendor's
 * documents in a popup. For pages that render their own checkbox.
 */
export const LegalLinks = ({ scope, termsLabel = "Term and Condition", privacyLabel = "Privacy Policy" }) => {
  const [open, setOpen] = useState(null);
  const link = (type, label) => (
    <button
      type="button"
      onClick={() => setOpen(type)}
      className="text-[#0955AC] underline underline-offset-2 hover:text-[#074a8f]"
    >
      {label}
    </button>
  );
  return (
    <>
      {link("terms", termsLabel)} and {link("privacy", privacyLabel)}
      {open && <LegalModal type={open} scope={scope} onClose={() => setOpen(null)} />}
    </>
  );
};

/**
 * Agreement checkbox block. "Term and Condition" / "Privacy Policy" are links that
 * open the owning vendor's documents in a popup.
 * scope: { vehicle_id } | { warehouse_id } | { vendor_id }
 */
const VendorLegalAgreement = ({ scope, checked, onChange, ageConfirmation = true, className = "" }) => {
  const [open, setOpen] = useState(null);

  const link = (type, label) => (
    <button
      type="button"
      onClick={() => setOpen(type)}
      className="text-[#0955AC] underline underline-offset-2 hover:text-[#074a8f]"
    >
      {label}
    </button>
  );

  return (
    <>
      <div className={`flex flex-row gap-5 text-[10px] font-[400] ${className}`}>
        <input
          className="size-[20px] shrink-0 border-[0.5px] border-[#0955AC] bg-[#FFFFFF] rounded-[4px] cursor-pointer focus:ring-transparent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div>
          <h1>
            I agree to the {link("terms", "Term and Condition")} and {link("privacy", "Privacy Policy")}.
          </h1>
          {ageConfirmation && <h1>I confirm that I am at least 21 years old and hold a valid driver's license.</h1>}
        </div>
      </div>
      {open && <LegalModal type={open} scope={scope} onClose={() => setOpen(null)} />}
    </>
  );
};

export default VendorLegalAgreement;
