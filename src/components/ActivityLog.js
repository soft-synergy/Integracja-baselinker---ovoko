import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Calendar,
  User,
  Eye,
  X
} from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const ActivityLog = () => {
  const { 
    logs, 
    loading, 
    LOG_LEVELS, 
    loadLogs, 
    clearLogs, 
    exportLogs 
  } = useActivityLog();
  
  const [filters, setFilters] = useState({
    level: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    userId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [viewLog, setViewLog] = useState(null);

  useEffect(() => {
    loadLogs(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      level: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      userId: ''
    });
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log.id));
    }
  };

  const handleClearSelected = async () => {
    if (selectedLogs.length > 0) {
      // Implementation for clearing selected logs
      setSelectedLogs([]);
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case LOG_LEVELS.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case LOG_LEVELS.WARNING:
        return <AlertTriangle className="h-4 w-4 text-warning-600" />;
      case LOG_LEVELS.ERROR:
        return <XCircle className="h-4 w-4 text-error-600" />;
      case LOG_LEVELS.DEBUG:
        return <Activity className="h-4 w-4 text-primary-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelBadge = (level) => {
    const baseClasses = "status-badge";
    switch (level) {
      case LOG_LEVELS.SUCCESS:
        return `${baseClasses} status-success`;
      case LOG_LEVELS.WARNING:
        return `${baseClasses} status-warning`;
      case LOG_LEVELS.ERROR:
        return `${baseClasses} status-error`;
      case LOG_LEVELS.DEBUG:
        return `${baseClasses} status-info`;
      default:
        return `${baseClasses} status-info`;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filters.level && log.level !== filters.level) return false;
    if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo)) return false;
    if (filters.userId && log.userId !== filters.userId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dziennik zdarzeń</h1>
          <p className="text-gray-600 mt-1">
            Monitoruj wszystkie aktywności i zdarzenia w systemie
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => exportLogs('json')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Eksportuj
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtry
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poziom logu
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="input-field"
              >
                <option value="">Wszystkie poziomy</option>
                {Object.values(LOG_LEVELS).map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data od
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Użytkownik
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="input-field"
                placeholder="ID użytkownika"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleClearFilters}
              className="btn-secondary"
            >
              Wyczyść filtry
            </button>
            <div className="text-sm text-gray-600">
              Znaleziono {filteredLogs.length} z {logs.length} wpisów
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Szukaj w dzienniku zdarzeń..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {selectedLogs.length === logs.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
          </button>
          
          {selectedLogs.length > 0 && (
            <button
              onClick={handleClearSelected}
              className="btn-error flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Usuń zaznaczone ({selectedLogs.length})
            </button>
          )}
        </div>
        
        <button
          onClick={() => loadLogs(filters)}
          disabled={loading}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedLogs.length === logs.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poziom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wiadomość
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Użytkownik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLogs.includes(log.id)}
                      onChange={() => handleSelectLog(log.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getLevelIcon(log.level)}
                      <span className={`ml-2 ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate">
                      <p className="text-sm text-gray-900">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">
                          Szczegóły dostępne
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(log.timestamp).toLocaleString('pl-PL')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {log.userId || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setViewLog(log)}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Szczegóły
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak wpisów</h3>
            <p className="mt-1 text-sm text-gray-500">
              Nie znaleziono wpisów spełniających kryteria wyszukiwania.
            </p>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {viewLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Szczegóły wpisu</h3>
              <button
                onClick={() => setViewLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Poziom</label>
                <div className="mt-1 flex items-center">
                  {getLevelIcon(viewLog.level)}
                  <span className={`ml-2 ${getLevelBadge(viewLog.level)}`}>
                    {viewLog.level}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Wiadomość</label>
                <p className="mt-1 text-sm text-gray-900">{viewLog.message}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Data i czas</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(viewLog.timestamp).toLocaleString('pl-PL')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Użytkownik</label>
                <p className="mt-1 text-sm text-gray-900">{viewLog.userId || 'System'}</p>
              </div>
              
              {viewLog.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Szczegóły</label>
                  <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-auto">
                    {JSON.stringify(viewLog.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {viewLog.ip && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adres IP</label>
                  <p className="mt-1 text-sm text-gray-900">{viewLog.ip}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewLog(null)}
                className="btn-secondary"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog; 