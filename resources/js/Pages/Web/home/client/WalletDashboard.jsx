import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, RefreshCcw, SlidersHorizontal } from "lucide-react";
import ClientHeader from "./ClientHeader";

const money = (v) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_META = {
  topup: { label: "Top Up", icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50", sign: "+" },
  refund: { label: "Refund", icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50", sign: "+" },
  adjustment: { label: "Adjustment", icon: RefreshCcw, color: "text-amber-600", bg: "bg-amber-50", sign: "" },
  payment: { label: "Payment", icon: ArrowUpRight, color: "text-red-600", bg: "bg-red-50", sign: "-" },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const WalletDashboard = () => {
  const { props } = usePage();
  const wallet = props?.wallet || { balance: 0, currency: "LKR" };
  const transactionsPage = props?.transactions || { data: [], links: [] };
  const transactions = transactionsPage.data || [];

  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const quickAmounts = [1000, 2500, 5000, 10000];

  const handleTopup = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter a valid top-up amount.");
      return;
    }
    setError("");
    setSubmitting(true);
    router.post(
      route("client.wallet.topup"),
      { amount: value },
      {
        preserveScroll: true,
        onFinish: () => setSubmitting(false),
        onSuccess: () => setAmount(""),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <ClientHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0955AC] to-[#073E82] text-white shadow-lg p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <Wallet size={18} />
              <span>Wallet Balance</span>
            </div>
            <div className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
              {wallet.currency} {money(wallet.balance)}
            </div>
            <p className="mt-2 text-white/70 text-sm">
              Use your wallet balance to pay instantly across Vehicle Rental, Ticket Booking, Courier and more.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/10 backdrop-blur-sm p-4">
            <Wallet size={56} className="text-white/90" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Top up form */}
          <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm p-6 h-fit">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-[#0955AC]" />
              Top Up Wallet
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add funds to your wallet. Funds are credited instantly.
            </p>

            <form onSubmit={handleTopup} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Amount ({wallet.currency})</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    {wallet.currency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 pl-14 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0955AC]/30 focus:border-[#0955AC] text-sm font-medium"
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-gray-700 hover:bg-[#E2E8F0] transition"
                  >
                    +{v.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-12 rounded-xl bg-[#0955AC] hover:bg-[#073E82] disabled:opacity-60 text-white font-semibold transition flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {submitting ? "Processing..." : "Top Up Now"}
              </button>
            </form>
          </div>

          {/* Transaction history */}
          <div className="lg:col-span-3 rounded-2xl bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#0955AC]" />
                Transaction History
              </h2>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-gray-100">
              {transactions.length === 0 && (
                <p className="text-sm text-gray-500 py-10 text-center">No transactions yet.</p>
              )}
              {transactions.map((tx) => {
                const meta = TYPE_META[tx.type] || TYPE_META.adjustment;
                const Icon = meta.icon;
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 size-10 rounded-full ${meta.bg} flex items-center justify-center`}>
                        <Icon size={18} className={meta.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {tx.description || meta.label}
                        </p>
                        <p className="text-xs text-gray-500">{fmtDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${meta.color}`}>
                        {meta.sign}
                        {wallet.currency} {money(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Balance: {wallet.currency} {money(tx.balance_after)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {transactionsPage.links && transactionsPage.links.length > 3 && (
              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                {transactionsPage.links.map((link, i) => (
                  <button
                    key={i}
                    disabled={!link.url}
                    onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      link.active
                        ? "bg-[#0955AC] text-white shadow-md"
                        : "bg-[#F1F5F9] text-gray-600 hover:bg-[#E2E8F0] disabled:opacity-40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;
