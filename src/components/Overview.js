import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Activity,
  Play,
  Pause
} from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const Overview = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    syncStatus: 'idle',
    lastSync: null,
    pendingChanges: 0,
    errors: 0
  });
  const [queueStatus, setQueueStatus] = useState({
    ordersQueue: { running: false },
    productsQueue: { running: false }
  });
  const [loading, setLoading] = useState(true);
  const { logs, logInfo, logSuccess, logError } = useActivityLog();

  useEffect(() => {
    loadOverviewData();
    loadQueueStatus();
    
    // Refresh queue status every 10 seconds
    const interval = setInterval(loadQueueStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOverviewData = async () => {
    try {
      const response = await fetch('/api/overview');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        logInfo('Overview data loaded successfully');
      } else {
        throw new Error('Failed to load overview data');
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
      logError('Failed to load overview data', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadQueueStatus = async () => {
    try {
      const response = await fetch('/api/queue-status');
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('Failed to load queue status:', error);
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
        await loadQueueStatus();
      } else {
        throw new Error('Queue control failed');
      }
    } catch (error) {
      logError('Queue control failed', { action, target, error: error.message });
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change, loading }) => (
    <div className="card">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-success-600' : 'text-error-600'}`}>
              {change > 0 ? '+' : ''}{change}% od ostatniego tygodnia
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const QueueStatusCard = ({ title, description, icon: Icon, queue, target, color }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${queue.running ? 'bg-success-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">
            {queue.running ? 'Uruchomiona' : 'Zatrzymana'}
          </span>
        </div>
      </div>
      
      <div className="flex space-x-2">
        {queue.running ? (
          <button
            onClick={() => handleQueueControl('stop', target)}
            className="btn-error flex-1 flex items-center justify-center"
          >
            <Pause className="h-4 w-4 mr-2" />
            Zatrzymaj
          </button>
        ) : (
          <button
            onClick={() => handleQueueControl('start', target)}
            className="btn-success flex-1 flex items-center justify-center"
          >
            <Play className="h-4 w-4 mr-2" />
            Uruchom
          </button>
        )}
        
        <button
          onClick={() => handleQueueControl('manual-fetch', target)}
          className="btn-primary flex items-center justify-center px-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Ręcznie
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Przegląd systemu</h1>
        <p className="text-gray-600 mt-1">
          Monitoruj stan synchronizacji i aktywność systemu
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Łącznie produktów"
          value={stats.totalProducts.toLocaleString()}
          icon={Package}
          color="bg-primary-500"
        />
        <StatCard
          title="Łącznie zamówień"
          value={stats.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          color="bg-success-500"
        />
        <StatCard
          title="Oczekujące zmiany"
          value={stats.pendingChanges}
          icon={Clock}
          color="bg-warning-500"
        />
        <StatCard
          title="Błędy"
          value={stats.errors}
          icon={AlertTriangle}
          color="bg-error-500"
        />
      </div>

      {/* Queue Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueStatusCard
          title="Kolejka zamówień"
          description="Synchronizacja zamówień Ovoko → BaseLinker"
          icon={Activity}
          queue={queueStatus.ordersQueue}
          target="orders"
          color="bg-primary-500"
        />
        
        <QueueStatusCard
          title="Kolejka produktów"
          description="Pobieranie produktów z BaseLinker"
          icon={Package}
          queue={queueStatus.productsQueue}
          target="products"
          color="bg-success-500"
        />
      </div>

      {/* Sync Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Status synchronizacji</h3>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${
              stats.syncStatus === 'completed' ? 'bg-success-500' :
              stats.syncStatus === 'syncing' ? 'bg-warning-500' :
              stats.syncStatus === 'error' ? 'bg-error-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm text-gray-600 capitalize">
              {stats.syncStatus === 'completed' ? 'Zakończona' :
               stats.syncStatus === 'syncing' ? 'W trakcie' :
               stats.syncStatus === 'error' ? 'Błąd' : 'Bezczynna'}
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Ostatnia synchronizacja:</span>
            <span className="text-gray-900">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleString('pl-PL') : 'Nigdy'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Kolejki:</span>
            <span className="text-gray-900">
              {queueStatus.ordersQueue.running && queueStatus.productsQueue.running ? 'Wszystkie uruchomione' :
               queueStatus.ordersQueue.running ? 'Tylko zamówienia' :
               queueStatus.productsQueue.running ? 'Tylko produkty' : 'Wszystkie zatrzymane'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ostatnia aktywność</h3>
        <div className="space-y-3">
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${
                log.level === 'success' ? 'bg-success-100 text-success-600' :
                log.level === 'warning' ? 'bg-warning-100 text-warning-600' :
                log.level === 'error' ? 'bg-error-100 text-error-600' :
                'bg-primary-100 text-primary-600'
              }`}>
                {log.level === 'success' ? <CheckCircle className="h-4 w-4" /> :
                 log.level === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                 log.level === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                 <Activity className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{log.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString('pl-PL')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview; 