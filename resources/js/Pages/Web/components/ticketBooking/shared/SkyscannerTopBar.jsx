import React from "react";
import { router } from "@inertiajs/react";
import { HelpCircle, Heart } from "lucide-react";
import CompanyLogo from "../../CompanyLogo";

// Dark navy platform header shared by the flight search hero and the
// results page, so the whole air-ticket experience feels like one
// self-contained product rather than the main site chrome + a results page.
const SkyscannerTopBar = ({ sticky = false }) => (
  <div className={`border-b border-white/10 bg-[#0B1B34]/95 backdrop-blur-md ${sticky ? "sticky top-0 z-50" : ""}`}>
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <CompanyLogo
          className="h-[34px] sm:h-[40px] object-contain"
          fallbackClassName="text-white text-[22px] sm:text-[25px] font-[800] tracking-tight poppins"
          href="/"
        />
      </div>

      <div className="flex items-center gap-3 sm:gap-6 text-[13px] font-[600]">
        <button type="button" className="text-white/90 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer">
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Help</span>
        </button>
        <button type="button" className="text-white/90 hover:text-white transition-colors cursor-pointer">
          English (UK)
        </button>
        <div className="hidden md:flex items-center gap-1.5 text-white/90">
          <span className="text-base">🇱🇰</span>
          <span>Sri Lanka</span>
          <span className="text-white/60">Rs LKR</span>
        </div>
        <button type="button" className="text-white/90 hover:text-white p-1 transition-colors cursor-pointer" aria-label="Wishlist">
          <Heart className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => router.visit("/signin")}
          className="bg-white hover:bg-gray-100 text-[#0B1B34] font-[700] px-4 py-1.5 rounded-[6px] transition-colors cursor-pointer"
        >
          Log in
        </button>
      </div>
    </div>
  </div>
);

export default SkyscannerTopBar;
