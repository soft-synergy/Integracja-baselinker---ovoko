import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Database
} from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const Queues = () => {
  const [queueStatus, setQueueStatus] = useState({
    ordersQueue: { running: false, lastRun: null, nextRun: null, stats: {} },
    productsQueue: { running: false, lastRun: null, nextRun: null, stats: {} }
  });
  const [loading, setLoading] = useState(true);
  const { logInfo, logSuccess, logError } = useActivityLog();

  useEffect(() => {
    loadQueueStatus();
    const interval = setInterval(loadQueueStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const response = await fetch('/api/queue-status');
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
        if (loading) setLoading(false);
      }
    } catch (error) {
      logError('Failed to load queue status', { error: error.message });
      if (loading) setLoading(false);
    }
  };

  const handleQueueControl = async (action, target) => {
    try {
      logInfo('Queue control action', { action, target });
      
      const response = await fetch('/api/queue-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target })
      });

      if (response.ok) {
        const result = await response.json();
        logSuccess('Queue control successful', { action, target, message: result.message });
        await loadQueueStatus(); // Refresh status
      } else {
        throw new Error('Queue control failed');
      }
    } catch (error) {
      logError('Queue control failed', { action, target, error: error.message });
    }
  };

  const getQueueIcon = (queue) => {
    if (queue.running) {
      return <RefreshCw className="h-6 w-6 text-success-600 animate-spin" />;
    }
    return <Pause className="h-6 w-6 text-gray-400" />;
  };

  const getQueueStatusBadge = (queue) => {
    if (queue.running) {
      return (
        <span className="status-badge status-success flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" />
          Uruchomiona
        </span>
      );
    }
    return (
      <span className="status-badge status-warning flex items-center">
        <Pause className="h-3 w-3 mr-1" />
          Zatrzymana
        </span>
      );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nigdy';
    return new Date(dateString).toLocaleString('pl-PL');
  };

  const getNextRunTime = (queue) => {
    if (!queue.nextRun) return 'Nie zaplanowano';
    const nextRun = new Date(queue.nextRun);
    const now = new Date();
    const diff = nextRun - now;
    
    if (diff <= 0) return 'Wkrótce';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `za ${minutes}m ${seconds}s`;
    }
    return `za ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kolejki synchronizacji</h1>
          <p className="text-gray-600 mt-1">
            Zarządzaj kolejkami synchronizacji produktów i zamówień
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadQueueStatus}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </button>
        </div>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Queue */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary-500 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Kolejka zamówień</h3>
                <p className="text-sm text-gray-600">Synchronizacja zamówień Ovoko → BaseLinker</p>
              </div>
            </div>
            {getQueueIcon(queueStatus.ordersQueue)}
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              {getQueueStatusBadge(queueStatus.ordersQueue)}
            </div>

            {/* Last Run */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Ostatnie uruchomienie:</span>
              <span className="text-sm text-gray-900">
                {formatDate(queueStatus.ordersQueue.lastRun)}
              </span>
            </div>

            {/* Next Run */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Następne uruchomienie:</span>
              <span className="text-sm text-gray-900">
                {getNextRunTime(queueStatus.ordersQueue)}
              </span>
            </div>

            {/* Stats */}
            {queueStatus.ordersQueue.stats && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Sukces:</span>
                    <span className="ml-2 font-medium text-success-600">
                      {queueStatus.ordersQueue.stats.successful || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Błędy:</span>
                    <span className="ml-2 font-medium text-error-600">
                      {queueStatus.ordersQueue.stats.failed || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {queueStatus.ordersQueue.running ? (
                  <button
                    onClick={() => handleQueueControl('stop', 'orders')}
                    className="btn-error flex-1 flex items-center justify-center"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Zatrzymaj
                  </button>
                ) : (
                  <button
                    onClick={() => handleQueueControl('start', 'orders')}
                    className="btn-success flex-1 flex items-center justify-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Uruchom
                  </button>
                )}
                
                <button
                  onClick={() => handleQueueControl('manual-fetch', 'orders')}
                  className="btn-primary flex items-center justify-center px-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ręcznie
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Queue */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-success-500 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Kolejka produktów</h3>
                <p className="text-sm text-gray-600">Pobieranie produktów z BaseLinker</p>
              </div>
            </div>
            {getQueueIcon(queueStatus.productsQueue)}
          </div>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              {getQueueStatusBadge(queueStatus.productsQueue)}
            </div>

            {/* Last Run */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Ostatnie uruchomienie:</span>
              <span className="text-sm text-gray-900">
                {formatDate(queueStatus.productsQueue.lastRun)}
              </span>
            </div>

            {/* Next Run */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Następne uruchomienie:</span>
              <span className="text-sm text-gray-900">
                {getNextRunTime(queueStatus.productsQueue)}
              </span>
            </div>

            {/* Stats */}
            {queueStatus.productsQueue.stats && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pobrane:</span>
                    <span className="ml-2 font-medium text-success-600">
                      {queueStatus.productsQueue.stats.fetched || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Błędy:</span>
                    <span className="ml-2 font-medium text-error-600">
                      {queueStatus.productsQueue.stats.errors || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                {queueStatus.productsQueue.running ? (
                  <button
                    onClick={() => handleQueueControl('stop', 'products')}
                    className="btn-error flex-1 flex items-center justify-center"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Zatrzymaj
                  </button>
                ) : (
                  <button
                    onClick={() => handleQueueControl('start', 'products')}
                    className="btn-success flex-1 flex items-center justify-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Uruchom
                  </button>
                )}
                
                <button
                  onClick={() => handleQueueControl('manual-fetch', 'products')}
                  className="btn-primary flex items-center justify-center px-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ręcznie
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o kolejkach</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Kolejka zamówień</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Synchronizuje zamówienia z Ovoko do BaseLinker</li>
              <li>• Uruchamia się co 10 minut</li>
              <li>• Tworzy zamówienia w BaseLinker</li>
              <li>• Aktualizuje stany magazynowe</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Kolejka produktów</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Pobiera produkty z BaseLinker</li>
              <li>• Uruchamia się co 10 minut</li>
              <li>• Sprawdza zmiany w produktach</li>
              <li>• Aktualizuje lokalną bazę danych</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Automatyczne uruchamianie</h4>
              <p className="text-sm text-blue-700 mt-1">
                Kolejki są automatycznie uruchamiane przy starcie serwera. Możesz je zatrzymać lub uruchomić ręcznie w dowolnym momencie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Queues; 