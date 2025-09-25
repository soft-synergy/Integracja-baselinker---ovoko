import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Overview from './Overview';
import Products from './Products';
import Orders from './Orders';
import Queues from './Queues';
import ActivityLog from './ActivityLog';
import SmartSyncReports from './SmartSyncReports';
import OrdersSyncControl from './OrdersSyncControl';
import CsvImport from './CsvImport';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { logInfo } = useActivityLog();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    logInfo('User logged out', { username: user?.username });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header 
          user={user}
          onLogout={handleLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/smart-sync-reports" element={<SmartSyncReports />} />
            <Route path="/orders-sync" element={<OrdersSyncControl />} />
            <Route path="/csv-import" element={<CsvImport />} />
          </Routes>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard; 