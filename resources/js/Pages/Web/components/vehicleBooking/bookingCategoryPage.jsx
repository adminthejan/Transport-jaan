import React from 'react';
import Header from '../../home/client/ClientHeader';
import Footer from '../../layouts/Footer';
import { Car, Ship, Plane } from 'lucide-react'; // Optional icons, install lucide-react

export default function bookingCategoryPage() {
  return (
    <div className="bg-gradient-to-br from-gray-100 via-white to-gray-50 min-h-screen flex flex-col justify-between">
      <Header />



      <main className="py-16 px-4 sm:px-8 lg:px-20">

        <div className='max-w-7xl mx-auto px-10 py-6'>
            <a href="/" className="mb-6">
                <button>
                    <div className="flex items-center justify-between mb-6 text-gray-800 font-semibold text-lg">
                        <h2> ⬅️ Back</h2>
                    </div>
                </button>
            </a>
        </div>

        <h1 className="text-5xl font-extrabold text-center text-gray-900 mb-16 tracking-tight">
          Select Your Mode of Travel
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Land Vehicles */}
          <a href="/vehicle-bookings/bookings/land">
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <Car className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800">Land Vehicles</h2>
                <p className="text-center text-gray-600 text-sm">
                    Includes cars, trucks, buses, and motorcycles — ideal for road transportation, personal or commercial use.
                </p>
              </div>
            </div>
          </a>


          {/* Water Vehicles */}
          <a href="/vehicle-bookings/bookings/sea">
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex flex-col items-center space-y-4">
                    <div className="bg-blue-100 p-4 rounded-full">
                        <Ship className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-800">Water Vehicles</h2>
                    <p className="text-center text-gray-600 text-sm">
                        Boats and yachts designed for water navigation and leisure trips over lakes, rivers, or oceans.
                    </p>
                </div>
            </div>
          </a>


          {/* Air Vehicles */}
          <a href="/vehicle-bookings/bookings/air">
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex flex-col items-center space-y-4">
                    <div className="bg-purple-100 p-4 rounded-full">
                        <Plane className="h-10 w-10 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-purple-800">Air Vehicles</h2>
                    <p className="text-center text-gray-600 text-sm">
                        Aircraft such as helicopters or private jets for fast and flexible air travel.
                    </p>
                </div>
            </div>
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
