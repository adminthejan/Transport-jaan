import React from "react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import VehicleCheckoutContent from "../../components/LandVehicleDetails/VehicleCheckoutContent";

const VehicleCheckout = () => {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased flex flex-col justify-between">
      <Header />
      <main className="flex-1">
        <VehicleCheckoutContent />
      </main>
      <Footer />
    </div>
  );
};

export default VehicleCheckout;
