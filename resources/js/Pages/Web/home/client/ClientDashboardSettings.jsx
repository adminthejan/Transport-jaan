import React from 'react';
import Header from "./ClientHeader";
import BackToDashboard from "./BackToDashboard";
import Settings from '../../components/client/Settings';
import { usePage } from '@inertiajs/react';

const ClientDashboardSettings = ({ user }) => {
  const { auth } = usePage().props;
  const fullUser = user || auth?.user;
  
  return (
    <div>
     <Header />
     <BackToDashboard />
     <Settings user={fullUser} />
    </div>
  )
}

export default ClientDashboardSettings;