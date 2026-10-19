import React, { useMemo } from "react";

export const formatLkr = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const addMonths = (isoDate, months) => {
  if (!isoDate) return null;
  const base = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setMonth(base.getMonth() + months);
  return next;
};

const formatDate = (date) =>
  date ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

/**
 * Splits the contract into what is payable now and what remains, and lays out
 * the instalments that follow.
 *
 * - "deposit": the first month + security deposit + setup fee are payable now,
 *   the remaining months are billed monthly.
 * - "full": the whole contract is payable now.
 */
export const buildPaymentPlan = (pricing = {}, paymentOption = "deposit", moveInDate = "") => {
  const months = Math.max(1, Number(pricing.duration_months || pricing.duration) || 1);
  const monthlyRate = Number(pricing.monthly_rate) || 0;
  const addOns = Number(pricing.add_ons_cost) || 0;
  const deposit = Number(pricing.security_deposit) || 0;
  const setup = Number(pricing.setup_fee) || 0;
  const taxTotal = Number(pricing.tax_amount) || 0;

  const monthlyBase = monthlyRate + addOns;
  const monthlyInstalment = monthlyBase + taxTotal / months;
  const computedTotal = monthlyBase * months + taxTotal + deposit + setup;
  const total = round2(Number(pricing.final_amount) > 0 ? pricing.final_amount : computedTotal);

  const initialPayment = Math.min(round2(monthlyInstalment + deposit + setup), total);
  const payNow = paymentOption === "full" ? total : initialPayment;
  const remaining = round2(Math.max(total - payNow, 0));

  const rows = [];
  let balance = total;

  rows.push({
    label: paymentOption === "full" ? "Full payment" : "Initial payment",
    detail: paymentOption === "full" ? "Contract paid in full at booking" : "First month + deposit + setup fee",
    due: "At booking",
    amount: payNow,
    balance: (balance = round2(balance - payNow)),
  });

  if (paymentOption !== "full") {
    for (let month = 2; month <= months; month += 1) {
      const isLast = month === months;
      const amount = isLast ? balance : Math.min(round2(monthlyInstalment), balance);
      const dueDate = addMonths(moveInDate, month - 1);
      rows.push({
        label: `Month ${month}`,
        detail: isLast ? "Final instalment" : "Monthly instalment",
        due: formatDate(dueDate) || `Month ${month}`,
        amount,
        balance: (balance = round2(Math.max(balance - amount, 0))),
      });
    }
  }

  return {
    months,
    total,
    initialPayment,
    payNow,
    remaining,
    monthlyInstalment: round2(monthlyInstalment),
    rows,
  };
};

const MAX_VISIBLE_ROWS = 8;

/**
 * Payment summary: contract total, amount payable now, remaining balance and
 * the instalment schedule with the outstanding balance after each payment.
 */
const WarehousePaymentPlan = ({ pricing, paymentOption = "deposit", moveInDate = "", title = "Payment Plan" }) => {
  const plan = useMemo(
    () => buildPaymentPlan(pricing, paymentOption, moveInDate),
    [pricing, paymentOption, moveInDate]
  );

  if (!plan.total || plan.total <= 0) {
    return null;
  }

  const hiddenRows = Math.max(plan.rows.length - MAX_VISIBLE_ROWS, 0);
  const visibleRows = hiddenRows > 0 ? plan.rows.slice(0, MAX_VISIBLE_ROWS - 1).concat(plan.rows.slice(-1)) : plan.rows;

  return (
    <div className="poppins text-[11px] text-[#000000CC] bg-white rounded-[8px] border border-[#0000001A] p-4 min-w-0 max-w-full">
      <h2 className="text-[12px] font-[700] text-[#000000D9] mb-3">{title}</h2>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-[#00000099]">Total contract value</span>
          <span className="font-[700]">{formatLkr(plan.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#00000099]">Initial payment (due at booking)</span>
          <span className="font-[600]">{formatLkr(plan.initialPayment)}</span>
        </div>
        <div className="flex justify-between rounded-[6px] bg-[#E2F6DC] px-3 py-2 text-[12px] font-[700] text-[#1F6B1A]">
          <span>Payable now</span>
          <span>{formatLkr(plan.payNow)}</span>
        </div>
        <div className="flex justify-between rounded-[6px] bg-[#FFF4E0] px-3 py-2 text-[12px] font-[700] text-[#8A5A00]">
          <span>Remaining balance</span>
          <span>{formatLkr(plan.remaining)}</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#0000001A] text-[#00000099]">
              <th className="py-1.5 pr-2 font-[600]">Payment</th>
              <th className="py-1.5 pr-2 font-[600]">Due</th>
              <th className="py-1.5 pr-2 text-right font-[600]">Amount</th>
              <th className="py-1.5 text-right font-[600]">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <React.Fragment key={`${row.label}-${index}`}>
                {hiddenRows > 0 && index === visibleRows.length - 1 && (
                  <tr>
                    <td colSpan={4} className="py-1.5 text-center text-[10px] text-[#00000080]">
                      + {hiddenRows} more monthly instalments of {formatLkr(plan.monthlyInstalment)}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-[#00000010]">
                  <td className="py-1.5 pr-2">
                    <div className="font-[600]">{row.label}</div>
                    <div className="text-[10px] text-[#00000080]">{row.detail}</div>
                  </td>
                  <td className="py-1.5 pr-2">{row.due}</td>
                  <td className="py-1.5 pr-2 text-right font-[600]">{formatLkr(row.amount)}</td>
                  <td className="py-1.5 text-right">{formatLkr(row.balance)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WarehousePaymentPlan;
