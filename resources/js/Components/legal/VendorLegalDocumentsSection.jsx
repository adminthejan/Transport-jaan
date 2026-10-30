import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FileText, Trash2, Upload } from "lucide-react";

const DOCS = [
  { type: "terms", title: "Terms & Conditions", hint: "Shown to clients when they open “Terms and Condition” while booking." },
  { type: "privacy", title: "Privacy Policy", hint: "Shown to clients when they open “Privacy Policy” while booking." },
];

const DocEditor = ({ type, title, hint, initial, onSaved }) => {
  const [content, setContent] = useState(initial?.content || "");
  const [file, setFile] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setContent(initial?.content || "");
    setFile(null);
    setRemovePdf(false);
  }, [initial]);

  const existingPdf = !removePdf && !file && initial?.file_url;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.append("content", content);
      if (file) body.append("pdf", file);
      if (removePdf) body.append("remove_pdf", "1");
      const { data } = await axios.post(`/vendor/legal-documents/${type}`, body, {
        headers: { Accept: "application/json" },
      });
      onSaved(type, data.document);
      setMsg({ ok: true, text: data.document ? "Saved." : "Removed (nothing to show clients)." });
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : null;
      setMsg({ ok: false, text: first || e?.response?.data?.message || "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!initial && !content && !file) return;
    if (!window.confirm(`Remove the ${title}? Clients will no longer see it.`)) return;
    setBusy(true);
    try {
      await axios.delete(`/vendor/legal-documents/${type}`);
      onSaved(type, null);
      setMsg({ ok: true, text: "Removed." });
    } catch {
      setMsg({ ok: false, text: "Could not remove." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-gray-200 p-4 md:p-5 space-y-3">
      <div>
        <h3 className="text-[15px] font-[700] text-gray-900">{title}</h3>
        <p className="text-[11px] text-gray-500">{hint}</p>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder={`Type your ${title} here (or upload a PDF below)…`}
        className="w-full rounded-[8px] border border-gray-300 px-3 py-2 text-[13px] focus:outline-none focus:border-[#0955AC]"
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setRemovePdf(false);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-[8px] border border-[#0955AC] px-3 py-2 text-[12px] font-[700] text-[#0955AC] hover:bg-[#0955AC] hover:text-white transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload PDF
        </button>
        {file && (
          <span className="inline-flex items-center gap-1 text-[12px] text-gray-700">
            <FileText className="w-4 h-4" /> {file.name}
          </span>
        )}
        {existingPdf && (
          <span className="inline-flex items-center gap-2 text-[12px] text-gray-700">
            <a href={initial.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0955AC] underline">
              <FileText className="w-4 h-4" /> {initial.original_name || "Current PDF"}
            </a>
            <button type="button" onClick={() => setRemovePdf(true)} className="text-red-600 hover:underline">
              remove
            </button>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-[8px] bg-[#0955AC] px-4 py-2 text-[12px] font-[700] text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : `Save ${title}`}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-[8px] border border-red-300 px-3 py-2 text-[12px] font-[700] text-red-600 disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" /> Remove
        </button>
        {msg && <span className={`text-[12px] ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
};

/**
 * Vendor-side editor for the Terms & Conditions / Privacy Policy that clients see
 * in a popup while booking. Self-contained: loads and saves through /vendor/legal-documents.
 */
const VendorLegalDocumentsSection = () => {
  const [docs, setDocs] = useState({ terms: null, privacy: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/vendor/legal-documents", { headers: { Accept: "application/json" } })
      .then(({ data }) => setDocs({ terms: data.terms, privacy: data.privacy }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white rounded-[10px] border border-gray-200 p-6 md:p-10">
      <div className="mb-6">
        <h2 className="text-[18px] font-[700] text-gray-900">Terms &amp; Privacy Policy</h2>
        <p className="text-[12px] text-gray-500">
          Write the text directly or upload a PDF. Clients see these in a popup when they tick the agreement at checkout.
        </p>
      </div>
      {loading ? (
        <p className="text-[13px] text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-5">
          {DOCS.map((d) => (
            <DocEditor
              key={d.type}
              {...d}
              initial={docs[d.type]}
              onSaved={(type, doc) => setDocs((prev) => ({ ...prev, [type]: doc }))}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default VendorLegalDocumentsSection;
