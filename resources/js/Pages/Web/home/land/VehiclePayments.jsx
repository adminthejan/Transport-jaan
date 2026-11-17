import React from "react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import Payments from "../../components/LandVehicleDetails/Payments";

const VehiclePayments = () => {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased flex flex-col justify-between">
      <Header />
      <main className="flex-1">
        <Payments />
      </main>
      <Footer />
    </div>
  );
};

export default VehiclePayments;
