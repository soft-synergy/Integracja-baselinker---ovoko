import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  RefreshCw, 
  Activity, 
  X,
  Shield
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, currentPath }) => {
  const navigation = [
    { name: 'Przegląd', href: '/dashboard', icon: Home },
    { name: 'Produkty BaseLinker', href: '/dashboard/products', icon: Package },
    { name: 'Zamówienia Ovoko', href: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Kolejki', href: '/dashboard/queues', icon: RefreshCw },
    { name: 'Dziennik zdarzeń', href: '/dashboard/activity-log', icon: Activity },
    { name: 'Raporty Smart Sync', href: '/dashboard/smart-sync-reports', icon: Activity },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <div className="h-8 w-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-bold text-gray-900">Ovoko Sync</h1>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 text-center">
                System synchronizacji
              </p>
              <p className="text-xs text-gray-400 text-center mt-1">
                v2.0.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900">Ovoko Sync</h1>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile Footer */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 text-center">
                System synchronizacji
              </p>
              <p className="text-xs text-gray-400 text-center mt-1">
                v2.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 