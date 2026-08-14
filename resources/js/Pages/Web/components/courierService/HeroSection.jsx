import React from "react";
import { Link, router } from "@inertiajs/react";
import bg from "../../assets/courierService/bg.png";
import person from "../../assets/courierService/person.png";

const HeroSection = () => {
    const handleTrackingClick = (e) => {
        e.preventDefault();
        router.visit("/track-shipment");
    };

    return (
        <div className="relative h-[700px] lg:h-[600px]">
            <img src={bg} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#000000B8]" />
            <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4">
                    <div className="relative text-white flex flex-row items-center justify-between gap-8">
                        {/* text section */}
                        <div className="">
                            <div className="h-[5px] w-[125px] bg-[#FFFFFF] rounded-sm" />
                            <h1 className="mt-8 bebas-neue text-[38px] md:text-[78px]/[70px] font-[400] leading-tight">
                                Fast,{" "}
                                <span className="text-[#0955AC]">
                                    {" "}
                                    Secure,{" "}
                                </span>
                                and{" "}
                                <span className="text-[#0955AC]">
                                    {" "}
                                    Affordable{" "}
                                </span>
                                Worldwide{" "}
                                <span className="text-[#0955AC]">
                                    {" "}
                                    Shipping{" "}
                                </span>
                            </h1>
                            <p className="mt-10 poppins text-[14px] md:text-[18px]/[20px] text-justify">
                                Experience hassle-free delivery to over 200
                                countries with our fast, secure, and affordable
                                courier services. From same-day deliveries to
                                international freight, we offer a range of
                                solutions to suit your needs. Start shipping
                                today with just a few clicks.
                            </p>
                            {/* button section */}
                            <div className="figtree mt-20 lg:gap-7 gap-5 flex flex-col md:flex-row w-full text-[12px] md:text-[16px] font-[700]">
                                <Link
                                    href="/couriers/create"
                                    className="bg-[#0955AC] text-white rounded-lg transition duration-300  w-[100px] h-[40px] md:w-[202px] md:h-[56px] flex justify-center items-center"
                                >
                                    Send a package
                                </Link>
                                <button
                                    onClick={handleTrackingClick}
                                    className="bg-[#FFFFFF82] border-[2px] border-[#0955AC] text-[#0955AC] rounded-lg transition duration-300 w-[100px] h-[40px] md:w-[202px] md:h-[56px] flex justify-center items-center hover:bg-[#FFFFFF] cursor-pointer"
                                >
                                    Track Parcel
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end w-full h-auto overflow-visible">
                            <img
                                src={person}
                                alt="Courier service person"
                                className="h-[500px] hidden lg:block lg:absolute lg:top-[32px] xl:top-[-12px] right-0 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
