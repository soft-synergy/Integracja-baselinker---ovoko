import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const Header = ({ user, onLogout, onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userMenuRef = useRef(null);
  const { logInfo } = useActivityLog();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logInfo('User initiated logout', { username: user?.username });
    onLogout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={onMenuClick}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Center - Page title (hidden on mobile) */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center lg:justify-start">
            <h1 className="text-lg font-semibold text-gray-900">
              System synchronizacji Ovoko
            </h1>
          </div>

          {/* Right side - User menu and notifications */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-md">
              <Bell className="h-6 w-6" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full"></span>
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="h-8 w-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.username || 'Użytkownik'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.username || 'Użytkownik'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 