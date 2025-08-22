import React, { createContext, useContext, useState, useEffect } from 'react';

const ActivityLogContext = createContext();

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
};

export const ActivityLogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Log levels
  const LOG_LEVELS = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    DEBUG: 'debug'
  };

  // Add a new log entry
  const addLog = (message, level = LOG_LEVELS.INFO, details = null, userId = null) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      message,
      level,
      details,
      userId,
      ip: null, // Will be set by server
      userAgent: navigator.userAgent
    };

    setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 999)]); // Keep last 1000 logs

    // Send to server
    sendLogToServer(newLog);
  };

  // Send log to server
  const sendLogToServer = async (log) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  };

  // Load logs from server
  const loadLogs = async (filters = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/logs?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear logs
  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  // Export logs
  const exportLogs = async (format = 'json') => {
    try {
      const response = await fetch(`/api/logs/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  // Convenience methods for different log levels
  const logInfo = (message, details = null) => addLog(message, LOG_LEVELS.INFO, details);
  const logSuccess = (message, details = null) => addLog(message, LOG_LEVELS.SUCCESS, details);
  const logWarning = (message, details = null) => addLog(message, LOG_LEVELS.WARNING, details);
  const logError = (message, details = null) => addLog(message, LOG_LEVELS.ERROR, details);
  const logDebug = (message, details = null) => addLog(message, LOG_LEVELS.DEBUG, details);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, []);

  const value = {
    logs,
    loading,
    LOG_LEVELS,
    addLog,
    logInfo,
    logSuccess,
    logWarning,
    logError,
    logDebug,
    loadLogs,
    clearLogs,
    exportLogs,
  };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
}; 