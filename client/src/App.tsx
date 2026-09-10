import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ReportIssue } from './pages/ReportIssue';
import { UserLogin } from './pages/UserLogin';
import { UserSignup } from './pages/UserSignup';
import { AdminLogin } from './pages/AdminLogin';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { PublicComplaints } from './pages/PublicComplaints';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { GrievancePolicy } from './pages/GrievancePolicy';
import { Footer } from './components/Footer';
import { API } from './services/api';

export const App: React.FC = () => {
  useEffect(() => {
    // 1. Immediate wakeup ping on app load
    API.pingHealth();

    // 2. Keep Render awake: ping health check every 4 minutes (240,000 ms)
    const keepAliveInterval = setInterval(() => {
      API.pingHealth();
    }, 4 * 60 * 1000);

    // 3. Ping on tab visibility change (when citizen switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        API.pingHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<PublicComplaints />} />
            <Route path="/public-complaints" element={<PublicComplaints />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/signup" element={<UserSignup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />

            {/* Policy & Legal Routes */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/grievance-policy" element={<GrievancePolicy />} />
            <Route path="/citizen-charter" element={<GrievancePolicy />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};
