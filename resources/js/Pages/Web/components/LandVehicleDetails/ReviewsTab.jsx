import React, { useEffect, useState, useId } from "react";
import { usePage, router } from "@inertiajs/react";
import { route } from "ziggy-js";
import { Star, MessageSquare, CheckCircle2, User, Send, Sparkles } from "lucide-react";

/* ========= Read-only stars ========= */
const StarRating = ({ value = 0, size = 16 }) => {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(v);
        return (
          <Star
            key={i}
            className={`${size === 14 ? "w-3.5 h-3.5" : "w-4 h-4"} ${
              filled ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
};

/* ========= Interactive star picker ========= */
const StarPicker = ({ value = 5, onChange }) => {
  const [hover, setHover] = useState(null);

  return (
    <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: 5 }, (_, i) => {
        const starVal = i + 1;
        const filled = (hover || value) >= starVal;
        return (
          <button
            key={starVal}
            type="button"
            onMouseEnter={() => setHover(starVal)}
            onClick={() => onChange(starVal)}
            className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
            aria-label={`${starVal} star`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                filled ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

const displayName = (client) => {
  const raw = (client?.name || "").trim();
  if (raw && !/^provider$/i.test(raw)) return raw;
  return client?.email || "Verified Renter";
};

const ReviewsTab = () => {
  const { props } = usePage();
  const vehicle = props?.vehicle || {};
  const authUser = props?.auth?.user || null;
  const ratingBreakdown = props?.ratingBreakdown || {};

  const totalReviews =
    vehicle?.reviews_count ?? (Array.isArray(vehicle?.reviews) ? vehicle.reviews.length : 0);

  const average =
    vehicle?.rating_avg !== undefined && vehicle?.rating_avg !== null
      ? Number(vehicle.rating_avg)
      : 5.0;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRating(5);
    setComment("");
  }, [vehicle?.id]);

  const canSubmit = rating >= 1 && rating <= 5 && Boolean(vehicle?.id) && authUser?.role === "client";

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    router.post(
      route("client.vehicles.reviews.store", vehicle.id),
      { rating, comment },
      {
        preserveScroll: true,
        onSuccess: () => {
          setRating(5);
          setComment("");
          setSubmitting(false);
          router.reload({ only: ["vehicle", "ratingBreakdown"] });
        },
        onError: () => setSubmitting(false),
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Overview Score Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center justify-center w-28 h-28 rounded-2xl bg-white border border-slate-200/80 shadow-sm shrink-0">
            <span className="text-4xl font-black text-slate-900 leading-none">
              {average ? average.toFixed(1) : "5.0"}
            </span>
            <div className="mt-2">
              <StarRating value={average ?? 5} size={14} />
            </div>
            <span className="text-[11px] font-bold text-slate-400 mt-1">out of 5.0</span>
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900">Renter Feedback & Ratings</h4>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
              All ratings are verified from confirmed bookings completed on Jaan Transport.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Verified Community Feedback</span>
            </div>
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="w-full md:w-64 space-y-1.5 shrink-0">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = Number(ratingBreakdown[n] ?? (n === 5 ? totalReviews : 0));
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : (n === 5 ? 100 : 0);
            return (
              <div key={n} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                <span className="w-3 text-right">{n}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-400 text-[11px] font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write a Review Section */}
      {authUser?.role === "client" ? (
        <form onSubmit={submit} className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Leave Your Review</h4>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about the vehicle condition, pickup experience, and drive comfort…"
            className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
            rows={3}
            maxLength={2000}
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Your review helps other renters make great choices.</span>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? "Posting..." : "Submit Review"}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      ) : !authUser ? (
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-3 text-xs">
          <div className="text-blue-900 font-medium">Have you rented this vehicle? Sign in to share your experience.</div>
          <button
            type="button"
            onClick={() => router.visit("/signin")}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shrink-0"
          >
            Sign In
          </button>
        </div>
      ) : null}

      {/* Reviews List */}
      <div className="space-y-4">
        {Array.isArray(vehicle?.reviews) && vehicle.reviews.length > 0 ? (
          vehicle.reviews.map((r) => {
            const name = displayName(r?.client);
            const dateStr = r?.created_at
              ? new Date(r.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Recent";
            const ratingNum = Number(r?.rating) || 5;

            return (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase border border-blue-100 shrink-0">
                      {initials(name) || "R"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-slate-900">{name}</h5>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Verified Trip
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{dateStr}</p>
                    </div>
                  </div>

                  <StarRating value={ratingNum} size={14} />
                </div>

                {r.comment && (
                  <p className="text-xs text-slate-700 leading-relaxed font-normal pl-1">
                    "{r.comment}"
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h5 className="text-xs font-bold text-slate-700">No reviews yet</h5>
            <p className="text-[11px] text-slate-400 mt-0.5">Be the first to review this vehicle after your trip!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;
