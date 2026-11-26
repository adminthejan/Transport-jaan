import React from 'react';
import Header from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Settings from '../../components/client/Settings';
import { Head, usePage } from '@inertiajs/react';

const ClientDashboardSettings = ({ user }) => {
  const { auth } = usePage().props;
  const fullUser = user || auth?.user;
  
  return (
    <div>
     <Head title="Account Settings" />
     <Header />
     <BackToDashboard />
     <Settings user={fullUser} />
    </div>
  )
}

export default ClientDashboardSettings;