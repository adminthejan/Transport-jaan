import React from "react";
import ship5 from "../../assets/freight/ship5.svg";
import proPic1 from "../../assets/freight/proPic1.svg";
import proPic2 from "../../assets/freight/proPic2.svg";
import proPic3 from "../../assets/freight/proPic3.svg";
import proPic4 from "../../assets/freight/proPic4.svg";
import leftBlue from "../../assets/freight/leftBlue.svg";

import q from "../../assets/freight/q.svg";
import ratings from "../../assets/freight/ratings.svg";
import ProFill from "../../assets/freight/ProFill.svg";

const Review = () => {
    return (
        <div className="flex flex-col xl:flex-row gap-10 xl:gap-5 justify-between items-center xl:py-20 xl:px-20 p-5">

          {/* card 1 */}
            <div className="relative md:w-[507px] w-full h-[700px] md:h-[635px] rounded-[20px]">
                <div
                    className="w-full h-full rounded-[20px]"
                    style={{
                        backgroundImage: `url(${ship5})`,
                        backgroundSize: "cover",
                        backgroundRepeat: "no-repeat",
                    }}
                />
                <div
                    className="absolute inset-0 rounded-[20px] text-[#FFFFFF] xl:px-10 xl:py-20 p-5"
                    style={{ backgroundColor: "#0955ACD4" }}
                >
                    <h1 className="text-[24px] font-[700]">About Us</h1>
                    <h1 className="bebas-neue text-[40px]/[58px] font-[400] mt-10">
                        our success stories from our customers
                    </h1>

                    <div className="absolute left-5 bottom-5 sm:bottom-6 md:bottom-20 flex flex-row items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] rounded-full border-[1.5px] border-[#FFFFFF] overflow-hidden bg-white">
                            <img src={proPic1} alt="pro1" className="w-full h-full object-cover" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] rounded-full border-[1.5px] border-[#FFFFFF] overflow-hidden bg-white -ml-2 md:ml-0">
                            <img src={proPic2} alt="pro2" className="w-full h-full object-cover" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] rounded-full border-[1.5px] border-[#FFFFFF] overflow-hidden bg-white -ml-2 md:ml-0">
                            <img src={proPic3} alt="pro3" className="w-full h-full object-cover" />
                        </div>
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] rounded-full border-[1.5px] border-[#FFFFFF] overflow-hidden bg-white -ml-2 md:ml-0 flex items-center justify-center">
                            <img src={proPic4} alt="pro4" className="absolute inset-0 w-full h-full object-cover" />
                            <span className="relative z-10 figtree text-[10px] sm:text-[12px] md:text-[16px] font-[900] text-white">10+</span>
                        </div>
                    </div>
                    <div className="absolute bottom-5 sm:bottom-6 md:bottom-20 right-10 flex flex-row gap-3">
                        <button className="w-8 h-8 sm:w-10 sm:h-10 md:w-[45px] md:h-[45px] rounded-full bg-[#FFFFFF] flex justify-center items-center cursor-pointer">
                            <img src={leftBlue} />
                        </button>
                        <button className="w-8 h-8 sm:w-10 sm:h-10 md:w-[45px] md:h-[45px] rounded-full bg-[#FFFFFF] flex justify-center items-center cursor-pointer">
                            <img src={leftBlue} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Card 2 */}
            <div
                className="md:w-[378px] h-auto rounded-[20px] xl:px-10 xl:py-10 p-5"
                style={{ boxShadow: "2px 2px 2px 4px rgba(0, 0, 0, 0.1)" }}
            >
                <div className="flex flex-col md:flex-row items-start justify-between">
                    <div className="flex flex-row gap-5 items-center justify-center">
                        <img src={ProFill} />
                        <div>
                            <h1 className="text-[14px] font-[700]">
                                Kasun Gunawardhana
                            </h1>
                            <img src={ratings} />
                        </div>
                    </div>
                    <img src={q} />
                </div>

                <p className="poppins text-[14px]/[28px] font-[400] py-8">
                    Booking used to mean calling around and hoping for a reply. Now I search, compare fares,
                    and get my ticket confirmed in under two minutes — every single time.
                </p>

                <h1 className="text-[14px] font-[700]">Frequent Traveler</h1>
                <h1 className="text-[14px] font-[500] text-[#90A3BF]">Colombo</h1>
            </div>

            {/* Card 3 */}
            <div
                className="md:w-[378px] h-auto rounded-[20px] xl:px-10 xl:py-10 p-5"
                style={{ boxShadow: "2px 2px 2px 4px rgba(0, 0, 0, 0.1)" }}
            >
                <div className="flex flex-col md:flex-row items-start justify-between">
                    <div className="flex flex-row gap-5 items-center justify-center">
                        <img src={ProFill} />
                        <div>
                            <h1 className="text-[14px] font-[700]">
                                Nadeesha Perera
                            </h1>
                            <img src={ratings} />
                        </div>
                    </div>
                    <img src={q} />
                </div>

                <p className="poppins text-[14px]/[28px] font-[400] py-8">
                    We ship freight and book crew travel through this platform weekly. Real-time tracking
                    and instant quotes have cut our coordination time in half.
                </p>

                <h1 className="text-[14px] font-[700]">Logistics Manager</h1>
                <h1 className="text-[14px] font-[500] text-[#90A3BF]">Lanka Freight Solutions</h1>
            </div>
        </div>
    );
};

export default Review;
