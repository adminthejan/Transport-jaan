import React, { useState } from "react";
import bg from "../../assets/landingPages/bg.svg";
import linkedin from "../../assets/landingPages/in.svg";
import fb from "../../assets/landingPages/fb.svg";
import twitter from "../../assets/landingPages/twitter.svg";
import burgerIcon from "../../assets/landingPages/burgerIcon.svg";
import CompanyLogo from "../CompanyLogo";
// If you want to use navigation links, use react-router-dom instead of lucide-react
import { Link } from '@inertiajs/react';

const Hero = ({ auth }) => {
    // console.log(auth);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll to section by id
  const handleScroll = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false); // close sidebar if open
    }
  };

  return (
    <div className="flex relative justify-center items-center md:py-10 md:px-20 px-10 poppins">
      {/* Logo */}
      <div
        className="absolute md:top-[30px] top-[10px] md:text-[31px] text-[20px] font-[700] poppins uppercase cursor-pointer"
        onClick={() => (window.location.href = "/")}
      >
        <CompanyLogo className="h-[100px] object-contain" fallbackClassName="md:text-[31px] text-[20px] font-[700] poppins uppercase" />
      </div>

      {/* Social Icons */}
      <div className="flex xl:flex-col flex-row gap-5 absolute xl:bottom-[330px] bottom-[80px] xl:left-16 xl:pb-10">
        <div className="size-[35px] rounded-full border-[1.5px] border-[#FF7003] flex justify-center items-center cursor-pointer">
          <img src={linkedin} alt="linkedin" />
        </div>
        <div className="size-[35px] rounded-full border-[1.5px] border-[#FF7003] flex justify-center items-center cursor-pointer">
          <img src={fb} alt="facebook" />
        </div>
        <div className="size-[35px] rounded-full border-[1.5px] border-[#FF7003] flex justify-center items-center cursor-pointer">
          <img src={twitter} alt="twitter" />
        </div>
      </div>

      {/* Background section */}
      <div
        className="h-screen w-full bg-cover bg-center py-[100px] px-10 xl:px-20"
        style={{ backgroundImage: `url(${bg})` }}
      >
        {/* Navbar section - desktop only */}
        <div className="md:flex flex-row hidden justify-between">
          <div className="flex flex-row gap-5 xl:text-[17px] text-[10px] font-[400]">
            <div
              className="xl:w-[101px] h-[38px] border-[1.2px] border-[#FFFFFF91] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2"
              onClick={() => handleScroll("home")}
            >
              Home
            </div>
            <div
              className="xl:w-[121px] h-[38px] border-[1.2px] border-[#FFFFFF91] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2"
              onClick={() => handleScroll("about")}
            >
              About Us
            </div>
            <div
              className="xl:w-[114px] h-[38px] border-[1.2px] border-[#FFFFFF91] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2"
              onClick={() => handleScroll("services")}
            >
              Services
            </div>
            <div
              className="xl:w-[81px] h-[38px] border-[1.2px] border-[#FFFFFF91] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2"
              onClick={() => handleScroll("blog")}
            >
              Blog
            </div>
            <div
              className="xl:w-[137px] h-[38px] border-[1.2px] border-[#FFFFFF91] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2"
              onClick={() => handleScroll("contact")}
            >
              Contact Us
            </div>
          </div>

          {/* Auth Section */}
          <div className="flex flex-row gap-5 xl:text-[17px] text-[10px] font-[700]">
            {auth && auth.user ? (
              <>
                {auth.user.role === "vendor" && (
                  <Link
                    href="/vendorAllBookings"
                    className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-white text-[18px] font-medium"
                  >
                    Dashboard
                  </Link>
                )}
                {auth.user.role === "client" && (
                  <Link
                    href="/client/dashboard"
                    className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-white text-[18px] font-medium"
                  >
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              <>
              <div
                 className="xl:w-[137px] h-[38px] bg-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer"
                     onClick={() => (window.location.href = "/signin")}
             >
                Login
              </div>
              <div
                className="xl:w-[137px] h-[38px] text-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer"
                      onClick={() => (window.location.href = "/signup")}
                >
                     Register
             </div>
                {/* <Link to="/signin">
                  <div className="xl:w-[137px] h-[38px] bg-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2">
                    Login
                  </div>
                </Link>

                <Link to="/signup">
                  <div className="xl:w-[137px] h-[38px] text-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center cursor-pointer px-4 py-2">
                    Register
                  </div>
                </Link> */}
              </>
            )}
          </div>
        </div>
        {/* end desktop navbar */}

        {/* Burger menu - mobile only */}
        <div className="md:hidden">
          <div
            className="size-[30px] rounded-full border-[0.3px] border-[#FFFFFF] flex justify-center items-center cursor-pointer"
            onClick={() => setMenuOpen(true)}
          >
            <img src={burgerIcon} alt="menu" />
          </div>
        </div>

        {/* Sidebar mobile menu */}
        {menuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black bg-opacity-40 z-40"
              onClick={() => setMenuOpen(false)}
            ></div>
            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-full w-64 bg-[#0A0630] z-50 shadow-lg flex flex-col p-6 animate-slideIn">
              <div className="flex justify-end mb-6">
                <button
                  className="text-white text-2xl"
                  onClick={() => setMenuOpen(false)}
                >
                  &times;
                </button>
              </div>
              <div className="flex flex-col gap-4 text-white text-[17px] font-[400]">
                <div
                  className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                  onClick={() => handleScroll("home")}
                >
                  Home
                </div>
                <div
                  className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                  onClick={() => handleScroll("about")}
                >
                  About Us
                </div>
                <div
                  className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                  onClick={() => handleScroll("services")}
                >
                  Services
                </div>
                <div
                  className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                  onClick={() => handleScroll("blog")}
                >
                  Blog
                </div>
                <div
                  className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                  onClick={() => handleScroll("contact")}
                >
                  Contact Us
                </div>
              </div>
              <div className="flex flex-row gap-5 xl:text-[17px] text-[10px] font-[700]">
                {auth && auth.user ? (
                  <>
                    {auth.user.role=== "vendor" && (
                      <Link
                        href="/vendorAllBookings"
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-white text-[12px] font-medium"
                      >
                        Dashboard
                      </Link>
                    )}
                    {auth.user.role === "client" && (
                      <Link
                        href="/client/dashboard"
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-white text-[12px] font-medium"
                      >
                        Dashboard
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                     <div
                 className="xl:w-[137px] h-[38px] bg-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer"
                            onClick={() => (window.location.href = "/signin")}
                    >
                        Login
                    </div>
                    <div
                        className="xl:w-[137px] h-[38px] text-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer"
                            onClick={() => (window.location.href = "/signup")}
                        >
                            Register
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col items-center xl:text-[59px] md:text-[39px] text-[20px] font-[600]">
          <h1 className="xl:mt-[100px] mt-[40px] text-center">
            From City Streets to Global Skies <br /> We Power Your Every Move.{" "}
          </h1>

          <p className="xl:text-[17px] md:text-[10px] text-[8px] font-[600] text-center mt-[20px] xl:mt-[30px]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec
            semper eu risus ut ornare. In bibendum tempus <br />
            sapien, tristique consectetur purus pellentesque ac. Quisque
            facilisis laoreet feugiat.{" "}
          </p>

          <div
            className="xl:w-[174px] xl:h-[41px] xl:text-[17px] md:text-[10px] text-[8px] font-[700] flex justify-center items-center rounded-[44px] cursor-pointer xl:mt-[80px] mt-[20px] px-4 py-2"
            style={{
              background:
                "linear-gradient(90deg, #11207D 0%, #1F3AE3 46.63%, #485BD2 99.04%)",
            }}
          >
            Try it now
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
