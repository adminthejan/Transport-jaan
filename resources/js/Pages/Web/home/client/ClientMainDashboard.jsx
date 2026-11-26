import React, { useEffect } from "react";
import { Head } from "@inertiajs/react";
import ClientHeader from "./ClientHeader";
import ClientSidebar from "./ClientSidebar";
import ClientCardDashboard from "../../components/client/ClientCardDashboard";

const ClientMainDashboard = ({ csrf_token }) => {
    // Keep the CSRF meta tag in step with the server-issued token so later form
    // posts and axios calls don't fail with 419 after an in-app (Inertia) visit.
    useEffect(() => {
        if (!csrf_token) return;
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) meta.setAttribute("content", csrf_token);
        if (window.axios) window.axios.defaults.headers.common["X-CSRF-TOKEN"] = csrf_token;
    }, [csrf_token]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F5F8FF] via-[#F8FAFC] to-[#F8FAFC]">
            <Head title="Client Dashboard" />
            <ClientHeader />
            <div className="mx-auto flex w-full max-w-[1560px] items-start gap-2 px-4 pt-6 sm:px-6 lg:px-8">
                <ClientSidebar />
                <main className="min-w-0 flex-1">
                    <ClientCardDashboard />
                </main>
            </div>
        </div>
    );
};

export default ClientMainDashboard;
