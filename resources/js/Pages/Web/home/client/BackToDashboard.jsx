import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";

// Shared "back to hub" link for every client sub-dashboard.
const BackToDashboard = ({ className = "" }) => (
    <div className={`mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 ${className}`}>
        <div className="py-3">
            <Link
                href="/client/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-[600] text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Main Dashboard
            </Link>
        </div>
    </div>
);

export default BackToDashboard;
