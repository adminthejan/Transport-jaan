import React from "react";
import flightImage from "../../assets/rentAVehicle/discover/flight.png";
import trainImage from "../../assets/rentAVehicle/discover/train.png";
import shipImage from "../../assets/rentAVehicle/discover/ship.png";

const PopularRentals = () => {
  const popularLocations = [
    "Vehicle Rental in Sri Lanka",
    "Vehicle Rental in India",
    "Vehicle Rental in Japan",
    "Vehicle Rental in London",
    "Vehicle Rental in Paris",
    "Vehicle Rental in Pakistan",
    "Vehicle Rental in Sri Lanka",
    "Vehicle Rental in India",
    "Vehicle Rental in Japan",
    "Vehicle Rental in London",
    "Vehicle Rental in Paris",
    "Vehicle Rental in Pakistan",
    "Vehicle Rental in Japan",
    "Vehicle Rental in London",
    "Vehicle Rental in Paris",
    "Vehicle Rental in Pakistan",
  ];

  return (
    <div className="w-full py-16 md:py-20 bg-[#F7F9FC]">
      <div className="container mx-auto px-5 md:px-10">
        <span className="poppins inline-block text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] bg-white px-3 py-1.5 rounded-full uppercase mb-4">
          Worldwide Reach
        </span>
        <h2 className="bebas-neue text-[28px] sm:text-[36px] md:text-[40px] font-[400] text-start mb-2">
          DISCOVER <span className="text-[#0955AC]">POPULAR</span> VEHICLE RENTAL
          IN <span className="text-[#0955AC]">WORLDWIDE</span>
        </h2>
        <p className="poppins text-[14px] sm:text-[15px] font-[400] text-[#0F0F0F80] mb-10 md:mb-12">
          Explore a diverse and extensive range of rental vehicle.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4 cursor-pointer">
          {popularLocations.map((location, index) => (
            <span
              key={index}
              className="poppins bg-white border border-black/5 text-[#0B1B34] font-[600] px-4 py-3 rounded-full text-[13px] sm:text-[14px] text-center shadow-[0_2px_8px_rgba(11,27,52,0.05)] hover:shadow-[0_10px_20px_rgba(9,85,172,0.14)] hover:text-[#0955AC] hover:border-[#0955AC]/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              {location}
            </span>
          ))}
        </div>

        {/*
          Promotional Cards Section

          <div className="bebas-neue grid grid-cols-1 md:grid-cols-2 gap-10 justify-center items-center">
            <!-- Left Column - Two Cards -->
            <div className="md:col-span-1 grid grid-cols-1 gap-6">
              <!-- Card 1: Explore More to Get Your Tickets -->
              <div
                className="relative bg-cover bg-center rounded-lg overflow-hidden shadow-md h-[314px] flex items-center justify-center"
                style={{ backgroundImage: `url(${shipImage})` }}
              >
                <div className="absolute inset-0 bg-[#0000003D]"></div>
                <div className="relative z-10 text-white text-center p-4">
                  <h3 className="text-[30px] font-[400] uppercase leading-none">
                    explore more to get your tickets <br /> booked faster than
                    ever before.
                  </h3>
                  <h3 className="poppins text-[12px] font-[400] mb-4 lowercase leading-none mt-5">
                    Explore more to get your ticket to anywhere in the world.
                  </h3>
                  <button className="poppins bg-white text-[black] h-[30px] font-[600] text-[10px] py-2 px-6 rounded-[5px] hover:bg-gray-200 cursor-pointer">
                    Booking Now  →
                  </button>
                </div>
              </div>

              <!-- Card 2: Choose From Thousands of Trusted Rentals -->
              <div
                className="relative bg-cover bg-center rounded-lg overflow-hidden shadow-md h-[314px] flex items-center justify-center"
                style={{ backgroundImage: `url(${trainImage})` }}
              >
                <div className="absolute inset-0 bg-[#0000003D]"></div>
                <div className="relative z-10 text-white text-center p-4">
                  <h3 className="text-[30px] font-[400] uppercase leading-none">
                    From small packages to large <br /> shipments, we've got it
                    covered.
                  </h3>
                  <h3 className="poppins text-[12px] font-[400] lowercase leading-none mt-5">
                    Get your items delivered safely and on time, anywhere in the
                    world.
                  </h3>
                  <button className="poppins bg-white text-[black] h-[30px] font-[600] text-[10px] py-2 px-6 rounded-[5px] hover:bg-gray-200 mt-5 cursor-pointer">
                    Booking Now  →
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column - One Card -->
            <div
              className="relative col-span-1 bg-cover bg-center rounded-lg overflow-hidden shadow-md h-[calc(100%-12px)] flex items-center justify-center"
              style={{ backgroundImage: `url(${flightImage})` }}
            >
              <div className="absolute inset-0 bg-[#0000003D]"></div>
              <div className="relative z-10 text-white text-center p-4">
                <h3 className="bebas-neue text-[50px] font-[400] mb-2 uppercase leading-none">
                  Choose from{" "}
                  <span className="text-[black]">
                    thousand of trusted rentals
                  </span>
                  <br /> over 100+ countries
                </h3>
              </div>
            </div>
          </div>
        */}
      </div>
    </div>
  );
};

export default PopularRentals;
