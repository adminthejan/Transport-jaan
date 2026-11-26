import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard({ user }) {
    // Auto-redirect based on user role type
    useEffect(() => {
        if (user) {
            const redirectPath = {
                'client': '/client/dashboard',
                'vendor': '/vendorAllBookings',
                'SuperAdmin': '/superadmin/dashboard',
                'admin': '/'
            }[user.role] || '/';
            router.visit(redirectPath);
        }
    }, [user]);

    return (
        <AuthenticatedLayout user={user}>
            <Head title="Dashboard" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            Redirecting to your dashboard...
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
