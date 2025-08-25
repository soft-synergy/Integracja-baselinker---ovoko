import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Settings,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  Activity
} from 'lucide-react';

const OrdersSyncControl = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    interval: 10,
    enabled: true
  });

  useEffect(() => {
    loadStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/orders-sync/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setConfig({
          interval: data.intervalMinutes,
          enabled: data.enabled
        });
      }
    } catch (error) {
      console.error('Failed to load orders sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/orders-sync/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`${action} result:`, result);
        await loadStatus();
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      alert(`Błąd podczas wykonywania akcji: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfigUpdate = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/orders-sync/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update-config', 
          config: { 
            interval: parseInt(config.interval), 
            enabled: config.enabled 
          } 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Config update result:', result);
        await loadStatus();
        setShowConfig(false);
      } else {
        throw new Error('Config update failed');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      alert(`Błąd podczas aktualizacji konfiguracji: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak';
    return new Date(dateString).toLocaleString('pl-PL');
  };

  const formatTimeUntil = (dateString) => {
    if (!dateString) return 'Brak';
    const now = new Date();
    const target = new Date(dateString);
    const diff = target - now;
    
    if (diff <= 0) return 'Teraz';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `za ${hours}h ${minutes % 60}min`;
    } else {
      return `za ${minutes}min`;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
          <span className="ml-2">Ładowanie statusu synchronizacji zamówień...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automatyczna synchronizacja zamówień</h2>
          <p className="text-gray-600 mt-1">
            Automatyczne pobieranie zamówień z Ovoko V2 API i synchronizacja z BaseLinker co {status?.intervalMinutes || 10} minut
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-secondary flex items-center"
            disabled={actionLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            Konfiguracja
          </button>
          <button
            onClick={() => loadStatus()}
            className="btn-secondary flex items-center"
            disabled={actionLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Status scheduler'a</h3>
          <div className="flex items-center space-x-2">
            {status?.isRunning ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Działa
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Zatrzymany
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {status?.isRunning ? 'Działa' : 'Zatrzymany'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Interwał</p>
                <p className="text-lg font-semibold text-gray-900">
                  {status?.intervalMinutes || 10} min
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Ostatnie uruchomienie</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(status?.lastRun)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Następne uruchomienie</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTimeUntil(status?.nextRun)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Łącznie uruchomień</p>
              <p className="text-lg font-semibold text-gray-900">{status?.totalRuns || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ostatnia synchronizacja</p>
              <p className="text-sm font-medium text-gray-900">
                {status?.lastSyncDate ? new Date(status.lastSyncDate).toLocaleDateString('pl-PL') : 'Brak'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ostatni błąd</p>
              <p className="text-sm font-medium text-gray-900">
                {status?.lastError ? 'Wystąpił błąd' : 'Brak błędów'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sterowanie</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAction('start')}
            disabled={status?.isRunning || actionLoading}
            className="btn-success flex items-center"
          >
            <Play className="h-4 w-4 mr-2" />
            Uruchom
          </button>
          
          <button
            onClick={() => handleAction('stop')}
            disabled={!status?.isRunning || actionLoading}
            className="btn-warning flex items-center"
          >
            <Pause className="h-4 w-4 mr-2" />
            Zatrzymaj
          </button>
          
          <button
            onClick={() => handleAction('trigger')}
            disabled={!status?.isRunning || actionLoading}
            className="btn-primary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Uruchom teraz
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfiguracja</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interwał synchronizacji (minuty)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={config.interval}
                onChange={(e) => setConfig(prev => ({ ...prev, interval: parseInt(e.target.value) || 10 }))}
                className="input-field w-full"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimalny: 1 min, Maksymalny: 1440 min (24h)
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                Włącz automatyczną synchronizację
              </label>
            </div>
            
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleConfigUpdate}
                disabled={actionLoading}
                className="btn-primary flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Zastosuj zmiany
              </button>
              
              <button
                onClick={() => setShowConfig(false)}
                className="btn-secondary"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Jak to działa?</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Scheduler automatycznie uruchamia się co {status?.intervalMinutes || 10} minut</li>
              <li>• Pobiera nowe zamówienia z Ovoko V2 API (tylko z dzisiejszą datą)</li>
              <li>• Automatycznie synchronizuje je z BaseLinker</li>
              <li>• Pomija już zsynchronizowane zamówienia</li>
              <li>• Zapisuje szczegółowe logi synchronizacji</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersSyncControl; 