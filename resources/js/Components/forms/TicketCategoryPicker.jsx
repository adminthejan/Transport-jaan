import React from "react";
import { subNames } from "../../constants/ticketCategories";

const selectClass = (hasError) =>
  `w-full h-[52px] rounded-[12px] border px-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors cursor-pointer ${
    hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
  }`;
const labelClass = "block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5";

/**
 * Two linked dropdowns: category, then its sub-category. The sub-category list
 * resets when the category changes.
 */
const TicketCategoryPicker = ({ categories, category, subCategory, onChange, errors = {} }) => {
  const current = categories.find((c) => c.name === category);
  const subs = subNames(current);
  const note = current?.subs?.find((s) => typeof s !== "string" && s.name === subCategory)?.note;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label className={labelClass}>CATEGORY *</label>
        <select value={category} onChange={(e) => onChange({ category: e.target.value, subCategory: "" })} className={selectClass(errors.category)}>
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
      </div>
      <div>
        <label className={labelClass}>SUB-CATEGORY *</label>
        <select
          value={subCategory}
          onChange={(e) => onChange({ category, subCategory: e.target.value })}
          disabled={!current}
          className={`${selectClass(errors.subCategory)} disabled:bg-[#F8FAFC] disabled:cursor-not-allowed`}
        >
          <option value="">{current ? "Select a sub-category" : "Choose a category first"}</option>
          {subs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {note && <p className="text-[#64748B] text-[11px] mt-1">{note}</p>}
        {errors.subCategory && <p className="text-red-500 text-xs mt-1">{errors.subCategory}</p>}
      </div>
    </div>
  );
};

export default TicketCategoryPicker;
