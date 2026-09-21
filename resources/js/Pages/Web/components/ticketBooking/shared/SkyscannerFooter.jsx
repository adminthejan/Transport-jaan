import React from "react";
import { Link } from "@inertiajs/react";
import { ShieldCheck, Globe2, ArrowUpRight } from "lucide-react";
import CompanyLogo from "../../CompanyLogo";

const SkyscannerFooter = () => {
  return (
    <footer className="bg-[#0B1B34] text-white border-t border-white/10 mt-auto">
      {/* Upper Footer: Travel Columns */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Col 1: Brand & Promise */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <CompanyLogo
                className="h-[36px] object-contain"
                fallbackClassName="text-white text-[24px] font-[800] tracking-tight poppins"
                href="/"
              />
            </div>
            <p className="text-[13px] text-white/70 leading-relaxed">
              Compare millions of cheap flights, hotels, and car rentals worldwide. Fast, transparent, and always 100% free to search.
            </p>
            <div className="flex items-center gap-2 text-[12px] text-white/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Global Travel Aggregator</span>
            </div>
          </div>

          {/* Col 2: Popular Flights */}
          <div>
            <h4 className="text-[13px] font-[800] tracking-wider uppercase text-white mb-4">
              Top Flights from CMB
            </h4>
            <ul className="space-y-2.5 text-[13px] text-white/75">
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=Dubai+(DXB)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to Dubai
                </Link>
              </li>
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=Singapore+(SIN)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to Singapore
                </Link>
              </li>
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=Male+(MLE)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to Maldives
                </Link>
              </li>
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=Bangkok+(BKK)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to Bangkok
                </Link>
              </li>
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=London+(LHR)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to London
                </Link>
              </li>
              <li>
                <Link href="/flightResults?departure_airport=Colombo+(CMB)&arriving_airport=Kuala+Lumpur+(KUL)&trip_type=oneway" className="hover:text-white transition-colors">
                  Colombo to Kuala Lumpur
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Domestic Air & Charters */}
          <div>
            <h4 className="text-[13px] font-[800] tracking-wider uppercase text-white mb-4">
              Domestic Flights
            </h4>
            <ul className="space-y-2.5 text-[13px] text-white/75">
              <li>
                <Link href="/ticketBooking?type=flight" className="hover:text-white transition-colors">
                  Colombo to Jaffna
                </Link>
              </li>
              <li>
                <Link href="/ticketBooking?type=flight" className="hover:text-white transition-colors">
                  Colombo to Trincomalee
                </Link>
              </li>
              <li>
                <Link href="/ticketBooking?type=flight" className="hover:text-white transition-colors">
                  Castlereagh Seaplane
                </Link>
              </li>
              <li>
                <Link href="/ticketBooking?type=flight" className="hover:text-white transition-colors">
                  Koggala / Galle Scenic
                </Link>
              </li>
              <li>
                <Link href="/flightBooking" className="text-[#38BDF8] hover:underline flex items-center gap-1 font-[600]">
                  <span>Private Air Charter Quote</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Partner Airlines */}
          <div>
            <h4 className="text-[13px] font-[800] tracking-wider uppercase text-white mb-4">
              Airlines
            </h4>
            <ul className="space-y-2.5 text-[13px] text-white/75">
              <li>
                <span className="hover:text-white cursor-pointer">SriLankan Airlines</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Emirates</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Qatar Airways</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Singapore Airlines</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Cinnamon Air</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">FitsAir</span>
              </li>
            </ul>
          </div>

          {/* Col 5: Travel Tools & Help */}
          <div>
            <h4 className="text-[13px] font-[800] tracking-wider uppercase text-white mb-4">
              Explore & Support
            </h4>
            <ul className="space-y-2.5 text-[13px] text-white/75">
              <li>
                <Link href="/busTicketBookingDetails" className="hover:text-white transition-colors">
                  Bus Ticket Booking
                </Link>
              </li>
              <li>
                <Link href="/trainTicketBookingDetails" className="hover:text-white transition-colors">
                  Train Ticket Booking
                </Link>
              </li>
              <li>
                <Link href="/warehouseList" className="hover:text-white transition-colors">
                  Hotel Stays & Warehouses
                </Link>
              </li>
              <li>
                <Link href="/vehicleList" className="hover:text-white transition-colors">
                  Car Rentals & Transfers
                </Link>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Help & FAQs</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">Price Alert Guarantee</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Bar: Country & Currency Strip */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/80">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white font-[600]">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Sri Lanka · English (UK)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white font-[600]">
              <span>🇱🇰 Rs LKR</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-[12.5px] text-white/60">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <span className="hover:text-white cursor-pointer">Cookie Settings</span>
            <span className="hover:text-white cursor-pointer">Security</span>
          </div>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="bg-[#071325] py-4 px-4 sm:px-6 lg:px-8 text-center text-white/40 text-[11.5px]">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Transport Jaan. All rights reserved. Compare and book flights worldwide.</span>
          <span className="text-white/30">Powered by Xsarva Global Travel Search Engine</span>
        </div>
      </div>
    </footer>
  );
};

export default SkyscannerFooter;
