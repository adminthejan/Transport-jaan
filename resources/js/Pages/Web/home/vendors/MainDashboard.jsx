import React, { useEffect, useState } from "react";
import Header from "../client/ClientHeader";
import CardDashboard from "../../components/vendors/mainDashboard/CardDashboard";


const MainDashboard = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Auto-refresh the page EVERY time it's visited to prevent stale CSRF token
    useEffect(() => {
        // Use a URL parameter to track if we just refreshed
        const urlParams = new URLSearchParams(window.location.search);
        const justRefreshed = urlParams.get('refreshed');

        if (!justRefreshed) {
            // Show loader and refresh with parameter
            setIsRefreshing(true);
            setTimeout(() => {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('refreshed', '1');
                window.location.href = currentUrl.toString();
            }, 500);
        }
    }, []);

    // Track scroll position
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Simple loader overlay
    if (isRefreshing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#E5E5E5] min-h-screen">
            <div className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/10 backdrop-blur-sm shadow-md' : ''}`}>
                <Header />
            </div>
            <CardDashboard />
        </div>
    );
};

export default MainDashboard;
