import React, { useEffect } from "react";
import { Head } from "@inertiajs/react";
import ClientHeader from "./ClientHeader";
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
            <ClientCardDashboard />
        </div>
    );
};

export default ClientMainDashboard;
