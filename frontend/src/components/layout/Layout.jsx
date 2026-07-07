import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import UpdateNotification from '../UpdateNotification';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden selection:bg-teal-200 print:block print:h-auto print:overflow-visible print:bg-white">
      <UpdateNotification />
      <div className="flex flex-1 min-h-0">
      <div className="print:hidden h-full flex flex-col">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Topbar setMobileMenuOpen={setMobileMenuOpen} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible">
          <div className="mx-auto max-w-7xl animate-fade-in print:max-w-none print:mx-0">
            <Outlet />
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
