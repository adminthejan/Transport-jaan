import React from "react";
import { usePage } from "@inertiajs/react";
import { ShieldCheck } from "lucide-react";

const FALLBACK_RULES = [
  "Cancel before the start date for a refund according to the platform cancellation policy.",
  "No refund once the booking start date has passed.",
];

/**
 * Shows the warehouse cancellation/refund rules. The rules come from the
 * server (WarehouseCancellationPolicy) so this always matches what the
 * cancellation endpoint will actually refund.
 */
const CancellationPolicyNotice = ({ className = "" }) => {
  const { props } = usePage();
  const rules = Array.isArray(props?.cancellationPolicy?.rules) && props.cancellationPolicy.rules.length > 0
    ? props.cancellationPolicy.rules
    : FALLBACK_RULES;

  return (
    <div className={`poppins rounded-[8px] border border-[#0955AC33] bg-[#0955AC0D] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-[#0955AC]" />
        <h2 className="text-[12px] font-[700] text-[#000000D9]">Cancellation Policy</h2>
      </div>
      <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#000000B2] leading-relaxed">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
};

export default CancellationPolicyNotice;
