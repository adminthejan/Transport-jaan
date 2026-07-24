import React, { useEffect } from 'react';
import { Link } from '@inertiajs/react';
import Header from "../client/ClientHeader";
import { Check } from 'lucide-react';

const Summary = ({ journey }) => {
    // Clear localStorage when summary page loads
    useEffect(() => {
        localStorage.removeItem('multiModelJourney');
        localStorage.removeItem('multimodel_journey');
        localStorage.removeItem('selectedVehicles');
    }, []);

    return (
        <div>
            <Header />
            <div className="min-h-screen bg-gray-50 py-10 px-5">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-[20px] shadow-2xl p-8 flex flex-col items-center">
                        <div className="my-8 relative">
                            <div className="w-32 h-32 rounded-full bg-[#2FCE20] bg-opacity-20 flex justify-center items-center">
                                <div className="w-24 h-24 rounded-full bg-[#2FCE20] bg-opacity-40 flex justify-center items-center">
                                    <div className="w-16 h-16 rounded-full bg-[#2FCE20] flex justify-center items-center">
                                        <Check className="w-10 h-10 text-white stroke-[3]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-[32px] font-[700] text-[#222222] text-center figtree">
                            {journey?.status === 'pending' && 'Booking Submitted!'}
                            {journey?.status === 'confirmed' && 'Booking Confirmed!'}
                            {journey?.status === 'completed' && 'Journey Completed!'}
                            {journey?.status === 'cancelled' && 'Booking Cancelled'}
                        </h2>
                        <p className="text-[16px] text-[#6B6B6B] text-center mt-2 poppins">
                            {journey?.status === 'pending' && 'Your multi-model journey booking has been submitted and is awaiting vendor approval!'}
                            {journey?.status === 'confirmed' && 'Your multi-model journey has been successfully confirmed!'}
                            {journey?.status === 'completed' && 'Your multi-model journey has been completed. Thank you for using our service!'}
                            {journey?.status === 'cancelled' && 'This booking has been cancelled.'}
                        </p>

                        <div className="w-full max-w-md mt-8 bg-[#F4F3F3] rounded-[10px] p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6B6B6B] font-[500]">Booking Reference:</span>
                                    <span className="text-[#0955AC] font-[700] text-[20px]">{journey?.reference}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6B6B6B] font-[500]">Status:</span>
                                    <span className={`font-[600] ${
                                        journey?.status === 'pending' ? 'text-[#FF9800]' :
                                        journey?.status === 'confirmed' ? 'text-[#2FCE20]' :
                                        journey?.status === 'completed' ? 'text-[#0955AC]' :
                                        journey?.status === 'cancelled' ? 'text-[#FF6060]' :
                                        'text-[#6B6B6B]'
                                    }`}>
                                        {journey?.status === 'pending' && 'Pending Approval'}
                                        {journey?.status === 'confirmed' && 'Confirmed'}
                                        {journey?.status === 'completed' && 'Completed'}
                                        {journey?.status === 'cancelled' && 'Cancelled'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6B6B6B] font-[500]">Total Legs:</span>
                                    <span className="text-[#222222] font-[600]">{journey?.total_legs}</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-4">
                                    <span className="text-[#222222] font-[700] text-[18px]">Total Amount:</span>
                                    <span className="text-[#0955AC] font-[700] text-[24px]">
                                        Rs {journey?.total_amount?.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6B6B6B] font-[500]">Amount Paid:</span>
                                    <span className="text-[#2FCE20] font-[600]">
                                        Rs {journey?.amount_paid?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <p className="text-[14px] text-[#0955AC] text-center">
                                {journey?.status === 'pending' && 'Your booking requires approval from each vehicle vendor. You will receive email notifications once vendors confirm your bookings.'}
                                {journey?.status === 'confirmed' && 'A confirmation email has been sent to your registered email address with all booking details.'}
                                {journey?.status === 'completed' && 'Thank you for completing your journey with us. We hope you had a great experience!'}
                                {journey?.status === 'cancelled' && 'This booking has been cancelled. If you have any questions, please contact support.'}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button
                                onClick={() => window.print()}
                                className="px-8 py-3 bg-[#0955AC] hover:bg-[#073d7a] text-white rounded-[10px] text-[16px] font-[700] transition-colors figtree"
                            >
                                Download Summary
                            </button>
                            <Link
                                href="/multiModel/available-vehicles"
                                className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-[#222222] rounded-[10px] text-[16px] font-[700] transition-colors figtree"
                            >
                                Book Another Journey
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Summary;
