import React, { useMemo, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import axios from "axios";
import {
  Share2,
  Heart,
  Star,
  CheckCircle2,
  ShieldCheck,
  FileText,
  MessageSquare,
  Images,
  Car,
  Clock,
  Sparkles,
} from "lucide-react";

import CarDetailsTab from "./CarDetailsTab";
import PoliciesTab from "./PoliciesTab";
import ReviewsTab from "./ReviewsTab";
import GalleryTab from "./GalleryTab";

const VehicleInfo = () => {
  const { props } = usePage();
  const vehicle = props?.vehicle;

  const initialIsLiked = useMemo(() => {
    if (!vehicle) return false;
    if (typeof vehicle.is_liked === "boolean") return vehicle.is_liked;
    const likedIds = props?.likedVehicleIds || [];
    return Array.isArray(likedIds) ? likedIds.includes(vehicle.id) : false;
  }, [props, vehicle]);

  const [selectedTab, setSelectedTab] = useState("car-details");
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const titleBrand = vehicle?.manufacturer || "Vehicle";
  const titleModel = vehicle?.model || vehicle?.name || "";
  const titleYear = vehicle?.manufacture_year || vehicle?.registration_year || "";
  const isAvailable = (vehicle?.status || "").toLowerCase() === "active";
  const rating = vehicle?.rating_avg ? Number(vehicle.rating_avg).toFixed(1) : null;
  const reviewsCount = vehicle?.reviews_count ?? (Array.isArray(vehicle?.reviews) ? vehicle.reviews.length : 0);

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${titleBrand} ${titleModel}`,
          text: `Check out this ${titleBrand} ${titleModel} on Jaan Transport`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) {}
  };

  const onToggleWishlist = async () => {
    if (!vehicle?.id) return;
    if (!props?.auth?.user) {
      router.visit(route?.("signin") ?? "/signin");
      return;
    }

    const next = !isLiked;
    setIsLiked(next);
    setBusy(true);

    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
      await axios.post(
        route("client.vehicle.like.toggle"),
        { vehicle_id: vehicle.id },
        { headers: { "X-CSRF-TOKEN": token } }
      );
    } catch (err) {
      setIsLiked(!next);
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (!vehicle) {
    return (
      <div className="w-full py-8 text-center text-slate-400">
        <p className="text-sm">No vehicle information available.</p>
      </div>
    );
  }

  const TABS = [
    { key: "car-details", label: "Overview & Specs", icon: Car },
    { key: "policies", label: "Rental Policies", icon: FileText },
    { key: "reviews", label: `Reviews (${reviewsCount})`, icon: MessageSquare },
    { key: "gallery", label: "Photo Gallery", icon: Images },
  ];

  return (
    <div className="w-full">
      {/* Brand & Category pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {titleBrand}
          </span>
          {vehicle.category?.name && (
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              {vehicle.category.name}
            </span>
          )}
        </div>

        {/* Action Buttons: Share & Wishlist */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? "Copied Link!" : "Share"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleWishlist}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLiked
                ? "bg-rose-50 border border-rose-200 text-rose-600 shadow-sm"
                : "border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{isLiked ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {titleBrand} <span className="text-blue-600">{titleModel}</span>{" "}
            {titleYear ? <span className="text-slate-400 font-normal">({titleYear})</span> : null}
          </h1>

          {/* Ratings & Trust Badges */}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-bold">{rating ?? "5.0"}</span>
              <span className="text-amber-700/80 font-normal">
                ({reviewsCount} {reviewsCount === 1 ? "review" : "reviews"})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAvailable ? "Ready for Instant Booking" : "Currently Reserved"}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Verified Host & Inspected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="mt-8 mb-6 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-px scrollbar-hide">
          {TABS.map((tab) => {
            const active = selectedTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={`group inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {selectedTab === "car-details" && <CarDetailsTab vehicle={vehicle} />}
        {selectedTab === "policies" && <PoliciesTab vehicle={vehicle} />}
        {selectedTab === "reviews" && <ReviewsTab vehicle={vehicle} />}
        {selectedTab === "gallery" && <GalleryTab vehicle={vehicle} />}
      </div>
    </div>
  );
};

export default VehicleInfo;
