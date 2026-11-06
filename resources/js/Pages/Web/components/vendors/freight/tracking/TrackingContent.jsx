import React from "react";
import { usePage } from "@inertiajs/react";

import search from "../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";

import map from "../../../../assets/vendors/tracking/map.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import settingsTwo from "../../../../assets/vendors/tracking/settings.svg";
import car1 from "../../../../assets/vendors/dashboard/icons/car1.svg";
import car3 from "../../../../assets/vendors/dashboard/icons/car3.svg";
import miniCarIcon from "../../../../assets/vendors/tracking/minicarIcon.svg";
import proPicTwo from "../../../../assets/vendors/tracking/proPic.svg";

import cal from "../../../../assets/vendors/tracking/cal.svg";
import cal2 from "../../../../assets/vendors/tracking/cal2.svg";
import time from "../../../../assets/vendors/tracking/time.svg";
import distance from "../../../../assets/vendors/tracking/distance.svg";

import UserDropdown from "../../UserDropdown";

const TrackingContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';

    return (
        <div className="w-full h-auto px-4 md:px-5 lg:pr-5 lg:pl-5 py-10 pt-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[24px] md:text-[35px] font-[700]">
                    Freight Tracking
                </h1>
                {/* <div className="flex flex-row gap-5">
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={search} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={settings} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={bell} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={proPic} />
                    </div>

                    <div className="figtree flex flex-col justify-center items-start">
                        <h1 className="text-[20px] font-[700]">{user?.name || 'Service Provider'}</h1>
                        <h1 className="text-[16px] font-[600] text-[#7B7B7A]">
                            Service Provider
                        </h1>
                    </div>
                </div> */}
                {/* <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown
                        settingsRoute={route("freight.settingsPage")}
                    />
                </div> */}
            </div>
            {/* end of header section */}

            <div className="flex flex-col lg:flex-row gap-4 w-full py-5 md:py-10">
                <div
                    className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-5 py-5"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <h1 className="text-[24px] font-[700]">Car Types</h1>
                    <div className="flex flex-row justify-between items-center gap-4 md:gap-8">
                        {" "}
                        <div className="w-full h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5 my-5">
                            <img src={miniSearchIcon} />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Search client name, car, etc."
                            />
                        </div>
                        <div className="size-[35px] bg-[#F3F3F3] rounded-[6px] flex justify-center items-center">
                            {" "}
                            <img src={settingsTwo} />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        {/* card 1 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 2 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 3 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 4 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 5 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 6 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 7 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 8 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* card 9 */}
                        <div className="w-full min-h-[104px] border-[1px] border-[#0000004D] rounded-[9px] mt-5 p-5 xl:p-0">
                            <div className="flex flex-col md:grid md:grid-cols-3 justify-center items-center">
                                <img
                                    src={car1}
                                    className="h-[80px] md:h-[104px] w-auto"
                                />
                                <div className="flex flex-col justify-start items-start ml-0 md:ml-8 mt-2 md:mt-0">
                                    <h1 className="text-[18px] md:text-[20px] font-[700]">
                                        Fiona Brown
                                    </h1>
                                    <div className="flex flex-row justify-start items-start text-[14px] md:text-[16px] font-[500] text-[#00000080] gap-3">
                                        <img src={miniCarIcon} />
                                        <h1>BMW LX3</h1>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2 md:mt-0">
                                    <div className=" w-[101px] h-[33px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[14px] md:text-[16px] font-[700] text-[#50AE31] flex justify-center items-center">
                                        On Trip
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="w-full min-w-[200px] md:min-w-[479px] min-h-[51px] bg-[#0955AC] rounded-[6px] text-[16px] md:text-[18px] font-[700] text-[#FFFFFF] my-8 md:my-12">
                            Check Availability
                        </button>
                    </div>
                </div>
                <div className="w-full h-auto flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex flex-col gap-4 w-full">
                            <div
                                className="min-w-[265px] w-full min-h-[128px] bg-[#FFFFFF] rounded-[10px] px-4 md:px-5 py-4 md:py-5"
                                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                            >
                                <div className="flex flex-row gap-5">
                                    <img src={proPicTwo} />
                                    <div className="flex flex-col justify-center items-start gap-1">
                                        {" "}
                                        <h1 className="text-[16px] font-[600]">
                                            Steve Gibson
                                        </h1>
                                        <h1 className="text-[14px] font-[500] text-[#616161]">
                                            steve@example.com
                                        </h1>
                                        <h1 className="text-[13px] font-[500] text-[#00000080]">
                                            +94 77 301 1345
                                        </h1>
                                        <div className="flex justify-center items-center">
                                            <div className=" w-[76px] h-[24px] rounded-[5px] border-[1.5px] bg-[#50AE3140] border-[#50AE31] text-[12px] font-[700] text-[#50AE31] flex justify-center items-center">
                                                On Trip
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="min-w-[265px] w-full min-h-[102px] bg-[#FFFFFF] rounded-[10px] px-4 md:px-5 py-4 md:py-5"
                                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                            >
                                <div className="flex flex-row gap-3">
                                    <img
                                        src={car3}
                                        className="h-[72px] w-[104px]"
                                    />
                                    <div className="text-[13px] font-[500]">
                                        <h1 className="text-[16px] font-[600]">
                                            BMW LX3
                                        </h1>
                                        <div className="flex flex-row gap-3">
                                            <h1 className="text-[#00000080]">
                                                Car Type
                                            </h1>
                                            <h1>SUV</h1>
                                        </div>
                                        <div className="flex flex-row gap-3">
                                            <h1 className="text-[#00000080]">
                                                Car Type
                                            </h1>
                                            <h1>CBK 2324</h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className="min-w-[277px] w-full min-h-[241px] bg-[#FFFFFF] rounded-[10px] px-4 md:px-5 py-4 md:py-5"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <h1 className="text-[24px] font-[700]">
                                Rent Info
                            </h1>
                            <div className="flex flex-row justify-between items-center py-7">
                                <div className="flex flex-col gap-7 justify-center items-start text-[14px] font-[500]">
                                    <div className="flex flex-row gap-2">
                                        <img src={cal} />
                                        <h1 className="text-[#00000080]">
                                            Start Date{" "}
                                        </h1>
                                    </div>

                                    <div className="flex flex-row gap-2">
                                        <img src={cal2} />
                                        <h1 className="text-[#00000080]">
                                            End Date
                                        </h1>
                                    </div>
                                    <div className="flex flex-row gap-2">
                                        <img src={time} />
                                        <h1 className="text-[#00000080]">
                                            Trip Time
                                        </h1>
                                    </div>

                                    <div className="flex flex-row gap-2">
                                        <img src={distance} />
                                        <h1 className="text-[#00000080]">
                                            Total Distance
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-7 justify-center items-start text-[14px] font-[500]">
                                    <h1>25th June 2025</h1>
                                    <h1>27th June 2025</h1>
                                    <h1>22 hr 34 mins</h1>
                                    <h1>210 miles</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                    <img
                        src={map}
                        className="w-full h-auto"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TrackingContent;
