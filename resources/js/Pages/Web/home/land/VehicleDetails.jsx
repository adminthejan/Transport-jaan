import React, { useMemo } from "react";
import { usePage, Link } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import ChatWithVendorButton from "@/Components/chat/ChatWithVendorButton";
import BackButton from "../../components/BackBtn";
import VehicleImageViewer from "../../../../Components/vehicle/VehicleImageViewer";
import VehicleSearch from "../../components/LandVehicleDetails/VehicleSearch";
import VehicleInfo from "../../components/LandVehicleDetails/VehicleInfo";
import Suggestions from "../../components/LandVehicleDetails/Suggestions";
import { ChevronRight, ShieldCheck, Clock, Award, Sparkles, AlertCircle } from "lucide-react";

const VehicleDetails = () => {
  const { props } = usePage();
  const { vehicle, similarVehicles } = props;

  const memoizedVehicle = useMemo(() => {
    if (!vehicle) return null;
    return {
      ...vehicle,
      name: vehicle.model || vehicle.name,
      price: vehicle.price ?? vehicle.rental_price_per_day,
      image: vehicle.image ?? vehicle.primary_image_url,
    };
  }, [vehicle]);

  if (!memoizedVehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Vehicle Not Found</h2>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            The vehicle you are looking for may be temporarily unavailable or unlisted.
          </p>
          <Link
            href="/vehicleList"
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md"
          >
            Browse All Available Vehicles
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const manufacturer = memoizedVehicle.manufacturer || "Vehicle";
  const model = memoizedVehicle.model || "";

  return (
    <div className="vehicle-details-page bg-slate-50 min-h-screen text-slate-800 antialiased flex flex-col">
      <Header />

      {/* Breadcrumbs & Action Topbar */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium text-slate-500 whitespace-nowrap">
            <BackButton />
            <span className="text-slate-300">/</span>
            <Link href="/vehicleList" className="hover:text-blue-600 transition-colors">
              Fleet
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">{manufacturer}</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]">{model}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ChatWithVendorButton contextType="vehicle" contextId={memoizedVehicle.id} />
          </div>
        </div>
      </div>

      {/* Main Content Showcase */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Visual Media & Full Vehicle Information */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8 min-w-0">
            {/* High-Definition Image Showcase */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-3 sm:p-4 overflow-hidden">
              <VehicleImageViewer />
            </div>

            {/* Comprehensive Specs, Tabs & Host Details */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6 sm:p-8">
              <VehicleInfo />
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget & Similar Fleet */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-16">
            <VehicleSearch />
            <Suggestions similarVehicles={similarVehicles} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VehicleDetails;
