import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Calendar,
  Database,
  Link,
  ExternalLink
} from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState({});
  const [orderSyncStatuses, setOrderSyncStatuses] = useState({});
  const [fetchDateRange, setFetchDateRange] = useState({
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    toDate: new Date().toISOString().split('T')[0] // today
  });
  const { logInfo, logSuccess, logError } = useActivityLog();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ovoko-orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        logInfo('Orders loaded successfully', { count: data.length });
        
        // Load sync statuses for all orders
        await loadOrderSyncStatuses(data);
      } else {
        throw new Error('Failed to load orders');
      }
    } catch (error) {
      logError('Failed to load orders', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderSyncStatuses = async (ordersList) => {
    try {
      const statuses = {};
      for (const order of ordersList) {
        const response = await fetch(`/api/order-sync-status/${order.order_id}`);
        if (response.ok) {
          const status = await response.json();
          statuses[order.order_id] = status;
        }
      }
      setOrderSyncStatuses(statuses);
    } catch (error) {
      console.error('Failed to load order sync statuses:', error);
    }
  };

  const handleFetchOrdersV2 = async () => {
    try {
      setFetchingOrders(true);
      logInfo('Fetching orders from V2 API', { fromDate: fetchDateRange.fromDate, toDate: fetchDateRange.toDate });

      const response = await fetch('/api/fetch-ovoko-orders-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchDateRange)
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Orders fetched successfully from V2 API', { 
          ordersCount: result.ordersCount,
          filename: result.filename
        });
        
        // Show auto-sync results if available
        if (result.syncResults) {
          const { synced, failed, details } = result.syncResults;
          let message = `✅ Pobrano ${result.ordersCount} zamówień z V2 API\n\n`;
          message += `🔄 Automatyczna synchronizacja z BaseLinker:\n`;
          message += `   • Zsynchronizowano: ${synced}\n`;
          message += `   • Błędy: ${failed}\n`;
          
          if (details.length > 0) {
            message += `\n📋 Szczegóły synchronizacji:\n`;
            details.forEach(detail => {
              if (detail.status === 'success') {
                message += `   ✅ ${detail.orderId} → BL ID: ${detail.baselinkerOrderId}\n`;
              } else if (detail.status === 'skipped') {
                message += `   ⏭️  ${detail.orderId} → ${detail.reason}\n`;
              } else {
                message += `   ❌ ${detail.orderId} → ${detail.error}\n`;
              }
            });
          }
          
          alert(message);
          
          // Auto-check and list products for successfully synced orders
          if (synced > 0) {
            logInfo('Starting auto-listing check for synced orders', { syncedCount: synced });
            // Note: Auto-listing will be handled by the server-side auto-sync function
          }
        } else {
          alert(`✅ Pobrano ${result.ordersCount} zamówień z V2 API`);
        }
        
        // Refresh orders to show new data
        await loadOrders();
      } else {
        throw new Error(result.error || 'Failed to fetch orders');
      }
    } catch (error) {
      logError('Failed to fetch orders from V2 API', { error: error.message });
    } finally {
      setFetchingOrders(false);
    }
  };

  const handleSyncToBaseLinker = async (orderId) => {
    try {
      setSyncingOrders(prev => ({ ...prev, [orderId]: true }));
      logInfo('Starting order sync to BaseLinker', { orderId });

      const response = await fetch('/api/sync-order-to-baselinker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Order synced to BaseLinker successfully', { 
          orderId,
          baselinkerOrderId: result.baselinkerOrderId
        });
        
        // Update local sync status
        setOrderSyncStatuses(prev => ({
          ...prev,
          [orderId]: {
            synced: true,
            baselinkerOrderId: result.baselinkerOrderId,
            syncedAt: new Date().toISOString(),
            orderData: {
              customer_name: orders.find(o => o.order_id === orderId)?.customer_name,
              total_value: orders.find(o => o.order_id === orderId)?.total_price_buyer,
              items_count: orders.find(o => o.order_id === orderId)?.item_list?.length || 0
            }
          }
        }));
        
        // Note: Auto-listing is scheduled with 30-minute delay on server side
        logInfo('Auto-listing scheduled with 30-minute delay', { orderId });
        
        // Show success message
        alert(`Zamówienie zostało zsynchronizowane z BaseLinker!\nID w BaseLinker: ${result.baselinkerOrderId}\n\n📦 Auto-listing produktów zaplanowany na 30 minut!`);
      } else {
        if (result.error === 'Order already synced to BaseLinker') {
          alert(`Zamówienie już zostało zsynchronizowane z BaseLinker!\nID w BaseLinker: ${result.baselinkerOrderId}\nData synchronizacji: ${new Date(result.syncedAt).toLocaleString('pl-PL')}`);
          
          // Update local sync status
          setOrderSyncStatuses(prev => ({
            ...prev,
            [orderId]: {
              synced: true,
              baselinkerOrderId: result.baselinkerOrderId,
              syncedAt: result.syncedAt,
              orderData: {
                customer_name: orders.find(o => o.order_id === orderId)?.customer_name,
                total_value: orders.find(o => o.order_id === orderId)?.total_price_buyer,
                items_count: orders.find(o => o.order_id === orderId)?.item_list?.length || 0
              }
            }
          }));
        } else {
          throw new Error(result.error || 'Failed to sync order');
        }
      }
    } catch (error) {
      logError('Failed to sync order to BaseLinker', { orderId, error: error.message });
      alert(`Błąd synchronizacji: ${error.message}`);
    } finally {
      setSyncingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleEnqueueTasks = async (orderId) => {
    try {
      logInfo('Enqueuing tasks for order', { orderId });
      
      const response = await fetch('/api/enqueue-order-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ovoko_order_id: orderId })
      });

      if (response.ok) {
        logSuccess('Tasks enqueued successfully', { orderId });
      } else {
        throw new Error('Failed to enqueue tasks');
      }
    } catch (error) {
      logError('Failed to enqueue tasks', { orderId, error: error.message });
    }
  };

  const checkAndAutoListProducts = async (orderId) => {
    try {
      logInfo('Checking products for auto-listing after order sync', { orderId });
      
      const response = await fetch('/api/auto-list-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      const result = await response.json();

      if (result.success) {
        if (result.listedCount > 0) {
          logSuccess('Products auto-listed successfully', { 
            orderId,
            listedCount: result.listedCount,
            products: result.products
          });
          
          // Show success message with details
          let message = `✅ Automatyczne wystawienie listingów:\n\n`;
          message += `📦 Wystawiono: ${result.listedCount} produktów\n\n`;
          
          if (result.products && result.products.length > 0) {
            message += `📋 Wystawione produkty:\n`;
            result.products.forEach(product => {
              message += `   • ${product.sku} - ${product.name}\n`;
            });
          }
          
          alert(message);
        } else {
          logInfo('No products needed auto-listing', { orderId });
        }
      } else {
        logError('Auto-listing failed', { orderId, error: result.error });
      }
    } catch (error) {
      logError('Failed to check and auto-list products', { orderId, error: error.message });
    }
  };

  const handleManualAutoList = async () => {
    try {
      logInfo('Manual auto-listing triggered for all orders');
      
      const response = await fetch('/api/manual-auto-list-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Manual auto-listing completed', { 
          listedCount: result.listedCount,
          processedOrders: result.processedOrders
        });
        
        // Show success message with details
        let message = `✅ Ręczne wystawienie listingów:\n\n`;
        message += `📦 Wystawiono: ${result.listedCount} produktów\n`;
        message += `📋 Przetworzono: ${result.processedOrders} zamówień\n\n`;
        
        if (result.products && result.products.length > 0) {
          message += `📋 Wystawione produkty:\n`;
          result.products.slice(0, 10).forEach(product => {
            message += `   • ${product.sku} - ${product.name}\n`;
          });
          if (result.products.length > 10) {
            message += `   ... i ${result.products.length - 10} więcej\n`;
          }
        }
        
        alert(message);
      } else {
        logError('Manual auto-listing failed', { error: result.error });
        alert(`Błąd auto-listing: ${result.error}`);
      }
    } catch (error) {
      logError('Failed to run manual auto-listing', { error: error.message });
      alert(`Błąd auto-listing: ${error.message}`);
    }
  };

  const getSyncStatusBadge = (orderId) => {
    const status = orderSyncStatuses[orderId];
    
    if (!status) {
      return (
        <span className="status-badge status-info flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Sprawdzam...
        </span>
      );
    }
    
    if (status.synced) {
      return (
        <span className="status-badge status-success flex items-center">
          <Link className="h-3 w-3 mr-1" />
          Zsynchronizowane
        </span>
      );
    }
    
    return (
      <span className="status-badge status-warning flex items-center">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Oczekuje
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_id?.toString().includes(searchTerm) ||
                         order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'pending' && order.order_status === 'NEW') ||
                         (filterStatus === 'completed' && order.order_status === 'COMPLETED');
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (order) => {
    switch (order.order_status) {
      case 'COMPLETED':
        return (
          <span className="status-badge status-success flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Zakończone
          </span>
        );
      case 'NEW':
        return (
          <span className="status-badge status-warning flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Nowe
          </span>
        );
      default:
        return (
          <span className="status-badge status-info flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {order.order_status || 'Nieznany'}
          </span>
        );
    }
  };

  const getTotalValue = (order) => {
    if (order.total_price_buyer) {
      return `${order.total_price_buyer} ${order.item_list?.[0]?.currency || 'EUR'}`;
    }
    if (order.item_list && Array.isArray(order.item_list)) {
      return order.item_list.reduce((total, item) => {
        const price = parseFloat(item.price || 0);
        return total + price;
      }, 0).toFixed(2) + ' EUR';
    }
    return '0 EUR';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Zamówienia Ovoko</h1>
          <p className="text-gray-600 mt-1">
            Zarządzaj zamówieniami i synchronizacją z BaseLinker
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadOrders}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </button>
          <button
            onClick={handleManualAutoList}
            className="btn-primary flex items-center"
          >
            <Database className="h-4 w-4 mr-2" />
            Auto-listing
          </button>
        </div>
      </div>

      {/* Fetch Orders V2 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="p-3 bg-primary-500 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Pobierz zamówienia z API V2</h3>
              <p className="text-sm text-gray-600">Użyj nowego API V2 do pobrania najświeższych zamówień</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data od
            </label>
            <input
              type="date"
              value={fetchDateRange.fromDate}
              onChange={(e) => setFetchDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data do
            </label>
            <input
              type="date"
              value={fetchDateRange.toDate}
              onChange={(e) => setFetchDateRange(prev => ({ ...prev, toDate: e.target.value }))}
              className="input-field"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleFetchOrdersV2}
              disabled={fetchingOrders}
              className="btn-primary w-full flex items-center justify-center"
            >
              {fetchingOrders ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Pobieram...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Pobierz z V2 + Auto-sync
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>💡 <strong>API V2</strong> zapewnia pełniejsze dane zamówień, w tym:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Szczegółowe informacje o klientach i firmach</li>
            <li>Pełne dane o cenach (sprzedawca/kupujący)</li>
            <li>Informacje o dostawie i przewoźnikach</li>
            <li>Dane VAT i faktur</li>
            <li>Lepsze mapowanie przedmiotów</li>
          </ul>
          <p className="mt-2 text-blue-600 font-medium">🔄 Po pobraniu zamówień automatycznie uruchomi się synchronizacja z BaseLinker!</p>
          <p className="mt-1 text-green-600 font-medium">📦 Automatyczne wystawianie listingów: produkty ze stanem &gt; 1 zostaną automatycznie dodane do Ovoko po 30 minutach!</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-primary-500 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Łącznie zamówień</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-warning-500 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nowe</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.order_status === 'NEW').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-success-500 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Zakończone</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.order_status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj zamówień..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="pending">Nowe</option>
              <option value="completed">Zakończone</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => (
          <div key={order.order_id} className="card hover:shadow-medium transition-shadow duration-200">
            {/* Order Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Zamówienie #{order.order_id}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.order_date).toLocaleDateString('pl-PL')}
                </p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {getStatusBadge(order)}
                {getSyncStatusBadge(order.order_id)}
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900">
                {order.customer_name || 'Brak nazwy klienta'}
              </p>
              <p className="text-xs text-gray-500">
                {order.customer_email || 'Brak email'}
              </p>
              {order.company_title && (
                <p className="text-xs text-gray-500">
                  Firma: {order.company_title}
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Przedmioty ({order.item_list?.length || 0}):
              </p>
              <div className="space-y-1">
                {order.item_list?.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-xs text-gray-500">
                    <div className="flex justify-between items-start">
                      <span className="truncate flex-1">{item.name || 'Brak nazwy'}</span>
                      <span className="text-right ml-2">{item.price || 0} {item.currency || 'EUR'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="mr-2">Ovoko: {item.id}</span>
                      {item.external_id && (
                        <span className="text-blue-500">BL: {item.external_id}</span>
                      )}
                    </div>
                  </div>
                ))}
                {order.item_list?.length > 3 && (
                  <p className="text-xs text-gray-400">
                    +{order.item_list.length - 3} więcej...
                  </p>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Wartość całkowita:</span>
                <span className="font-bold text-primary-600">
                  {getTotalValue(order)}
                </span>
              </div>
              
              {order.delivery_type && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Dostawa:</span>
                  <span className="text-gray-800 capitalize">
                    {order.delivery_type.replace('_', ' ')}
                  </span>
                </div>
              )}
              
              {order.shipping_provider && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Przewoźnik:</span>
                  <span className="text-gray-800">
                    {order.shipping_provider}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedOrder(order)}
                className="btn-secondary flex-1 flex items-center justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                Szczegóły
              </button>
              
              {orderSyncStatuses[order.order_id]?.synced ? (
                <button
                  disabled
                  className="btn-success flex-1 flex items-center justify-center cursor-not-allowed"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Zsynchronizowane
                </button>
              ) : (
                <button
                  onClick={() => handleSyncToBaseLinker(order.order_id)}
                  disabled={syncingOrders[order.order_id]}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {syncingOrders[order.order_id] ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Synchronizuję...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sync z BL
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="card text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak zamówień</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie znaleziono zamówień spełniających kryteria wyszukiwania.
          </p>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Szczegóły zamówienia #{selectedOrder.order_id}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Eye className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID zamówienia</label>
                  <p className="text-sm text-gray-900">{selectedOrder.order_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.order_date).toLocaleString('pl-PL')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Wartość</label>
                  <p className="text-sm text-gray-900">{getTotalValue(selectedOrder)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Klient</label>
                <p className="text-sm text-gray-900">{selectedOrder.customer_name || 'Brak nazwy'}</p>
                <p className="text-sm text-gray-500">{selectedOrder.customer_email || 'Brak email'}</p>
                {selectedOrder.customer_phone && (
                  <p className="text-sm text-gray-500">Tel: {selectedOrder.customer_phone}</p>
                )}
              </div>
              
              {selectedOrder.company_title && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Firma</label>
                  <p className="text-sm text-gray-900">{selectedOrder.company_title}</p>
                  {selectedOrder.company_code && (
                    <p className="text-sm text-gray-500">Kod: {selectedOrder.company_code}</p>
                  )}
                  {selectedOrder.company_vat_code && (
                    <p className="text-sm text-gray-500">VAT: {selectedOrder.company_vat_code}</p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Adres</label>
                <p className="text-sm text-gray-900">{selectedOrder.customer_address_street || selectedOrder.customer_address}</p>
                <p className="text-sm text-gray-500">
                  {selectedOrder.customer_address_zip_code} {selectedOrder.customer_address_city}
                </p>
                <p className="text-sm text-gray-500">{selectedOrder.customer_address_country}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Dostawa</label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Typ:</span>
                    <span className="ml-2 text-gray-900 capitalize">
                      {selectedOrder.delivery_type?.replace('_', ' ') || 'Nieznany'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Przewoźnik:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedOrder.shipping_provider || 'Nieznany'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Przedmioty</label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.item_list?.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.name || 'Brak nazwy'}
                          </p>
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-gray-500">ID Ovoko: {item.id}</p>
                            {item.id_bridge && item.id_bridge !== '0' && (
                              <p className="text-xs text-gray-500">ID Bridge: {item.id_bridge}</p>
                            )}
                            {item.external_id && (
                              <p className="text-xs text-blue-600 font-medium">ID Baselinker: {item.external_id}</p>
                            )}
                            {item.car_id && (
                              <p className="text-xs text-gray-500">Car ID: {item.car_id}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {item.price || 0} {item.currency || 'EUR'}
                          </p>
                          {item.sell_price_seller && (
                            <p className="text-xs text-gray-500">
                              Sprzedawca: {item.sell_price_seller} PLN
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedOrder.invoice_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Faktura</label>
                  <p className="text-sm text-gray-900">{selectedOrder.invoice_number}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              {!orderSyncStatuses[selectedOrder.order_id]?.synced ? (
                <button
                  onClick={() => handleSyncToBaseLinker(selectedOrder.order_id)}
                  disabled={syncingOrders[selectedOrder.order_id]}
                  className="btn-primary"
                >
                  {syncingOrders[selectedOrder.order_id] ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Synchronizuję...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Synchronizuj z BaseLinker
                    </>
                  )}
                </button>
              ) : (
                <div className="text-sm text-success-600 font-medium">
                  ✅ Zsynchronizowane z BaseLinker (ID: {orderSyncStatuses[selectedOrder.order_id]?.baselinkerOrderId})
                </div>
              )}
              
              <button
                onClick={() => setSelectedOrder(null)}
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

export default Orders; 