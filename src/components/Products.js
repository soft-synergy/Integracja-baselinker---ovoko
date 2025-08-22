import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Download,
  RefreshCw as UpdateIcon,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useActivityLog } from '../contexts/ActivityLogContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [importing, setImporting] = useState({});
  const [updating, setUpdating] = useState({});
  const [checkingChanges, setCheckingChanges] = useState(false);
  const [updatingVersions, setUpdatingVersions] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 150,
    totalProducts: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const { logInfo, logSuccess, logError } = useActivityLog();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (page = 1, search = searchTerm, filter = filterStatus) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '150',
        search: search,
        filterStatus: filter
      });
      
      const response = await fetch(`/api/baselinker-products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(data.pagination);
        logInfo('Products loaded successfully', { 
          count: data.products.length,
          page: data.pagination.page,
          totalProducts: data.pagination.totalProducts
        });
      } else {
        throw new Error('Failed to load products');
      }
    } catch (error) {
      logError('Failed to load products', { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (product) => {
    try {
      setImporting(prev => ({ ...prev, [product.sku]: true }));
      logInfo('Starting product import', { sku: product.sku, name: product.text_fields?.name });

      const response = await fetch('/api/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product })
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Product imported successfully', { 
          sku: product.sku, 
          ovokoPartId: result.part_id 
        });
        // Refresh products to update sync status
        await loadProducts(pagination.page);
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      logError('Product import failed', { 
        sku: product.sku, 
        error: error.message 
      });
    } finally {
      setImporting(prev => ({ ...prev, [product.sku]: false }));
    }
  };

  const handleUpdate = async (product) => {
    try {
      setUpdating(prev => ({ ...prev, [product.sku]: true }));
      logInfo('Starting product update', { sku: product.sku, name: product.text_fields?.name });

      const response = await fetch('/api/update-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product })
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Product updated successfully', { 
          sku: product.sku,
          message: result.message
        });
        // Refresh products to update sync timestamp
        await loadProducts(pagination.page);
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      logError('Product update failed', { 
        sku: product.sku, 
        error: error.message 
      });
    } finally {
      setUpdating(prev => ({ ...prev, [product.sku]: false }));
    }
  };

  const handleCheckChanges = async () => {
    try {
      setCheckingChanges(true);
      logInfo('Checking for product changes');

      const response = await fetch('/api/check-product-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        if (result.changesFound > 0) {
          logSuccess('Product changes detected', { 
            changesFound: result.changesFound,
            message: result.message
          });
          // Refresh products to show updated data
          await loadProducts(pagination.page);
        } else {
          logInfo('No product changes detected');
        }
      } else {
        throw new Error(result.error || 'Failed to check changes');
      }
    } catch (error) {
      logError('Failed to check product changes', { error: error.message });
    } finally {
      setCheckingChanges(false);
    }
  };

  const handleUpdateVersions = async () => {
    try {
      setUpdatingVersions(true);
      logInfo('Updating product versions');

      const response = await fetch('/api/update-product-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        logSuccess('Product versions updated', { 
          updated: result.updated,
          message: result.message
        });
        // Refresh products to show updated data
        await loadProducts(pagination.page);
      } else {
        throw new Error(result.error || 'Failed to update versions');
      }
    } catch (error) {
      logError('Failed to update product versions', { error: error.message });
    } finally {
      setUpdatingVersions(false);
    }
  };

  const handleClearSync = async () => {
    try {
      const response = await fetch('/api/clear-sync', { method: 'POST' });
      if (response.ok) {
        logInfo('Sync status cleared');
        await loadProducts(1);
      }
    } catch (error) {
      logError('Failed to clear sync status', { error: error.message });
    }
  };

  const handleSearch = () => {
    loadProducts(1, searchTerm, filterStatus);
  };

  const handleFilterChange = (newFilter) => {
    setFilterStatus(newFilter);
    loadProducts(1, searchTerm, newFilter);
  };

  const handlePageChange = (newPage) => {
    loadProducts(newPage, searchTerm, filterStatus);
  };

  const handleFirstPage = () => {
    handlePageChange(1);
  };

  const handleLastPage = () => {
    handlePageChange(pagination.totalPages);
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      handlePageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(pagination.page + 1);
    }
  };

  // Products are already filtered by the server
  const filteredProducts = products;

  const getStatusBadge = (product) => {
    if (product.isSynced) {
      return (
        <span className="status-badge status-success flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" />
          Zsynchronizowany
        </span>
      );
    }
    return (
      <span className="status-badge status-warning flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        Oczekuje
      </span>
    );
  };

  const getPrice = (product) => {
    if (product.prices && Object.keys(product.prices).length > 0) {
      const price = Object.values(product.prices)[0];
      return `${price} PLN`;
    }
    return 'Brak ceny';
  };

  const getProductName = (product) => {
    return product.text_fields?.name || product || 'Brak nazwy';
  };

  const getProductSku = (product) => {
    return product.sku || 'Brak SKU';
  };

  const getLastSyncInfo = (product) => {
    if (!product.isSynced || !product.syncedAt) return null;
    
    const syncDate = new Date(product.syncedAt);
    const now = new Date();
    const diffInHours = Math.floor((now - syncDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Przed chwilą';
    if (diffInHours < 24) return `${diffInHours}h temu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d temu`;
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
          <h1 className="text-2xl font-bold text-gray-900">Produkty BaseLinker</h1>
          <p className="text-gray-600 mt-1">
            Zarządzaj produktami i synchronizacją z Ovoko
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadProducts}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </button>
          <button
            onClick={handleClearSync}
            className="btn-warning flex items-center"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Wyczyść status sync
          </button>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-info-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Sprawdź zmiany</h3>
                <p className="text-sm text-gray-600">Wykryj zmiany w produktach BaseLinker</p>
              </div>
            </div>
            <button
              onClick={handleCheckChanges}
              disabled={checkingChanges}
              className="btn-primary flex items-center"
            >
              {checkingChanges ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sprawdzam...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Sprawdź
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-warning-500 rounded-lg">
                <Info className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Aktualizuj wersje</h3>
                <p className="text-sm text-gray-600">Zaktualizuj wersje produktów w statusie sync</p>
              </div>
            </div>
            <button
              onClick={handleUpdateVersions}
              disabled={updatingVersions}
              className="btn-warning flex items-center"
            >
              {updatingVersions ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Aktualizuję...
                </>
              ) : (
                <>
                  <Info className="h-4 w-4 mr-2" />
                  Aktualizuj
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-primary-500 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Łącznie produktów</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-success-500 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Na tej stronie</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-info-500 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Strona</p>
              <p className="text-2xl font-bold text-gray-900">
                {pagination.page} / {pagination.totalPages}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-warning-500 rounded-lg">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produktów na stronę</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.limit}</p>
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
                placeholder="Szukaj produktów..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="input-field"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="synced">Zsynchronizowane</option>
              <option value="unsynced">Oczekujące</option>
            </select>
          </div>
          
          <button
            onClick={handleSearch}
            className="btn-primary flex items-center"
          >
            <Search className="h-4 w-4 mr-2" />
            Szukaj
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id || product.sku} className="card hover:shadow-medium transition-shadow duration-200">
            {/* Product Image */}
            <div className="aspect-w-16 aspect-h-9 mb-4 bg-gray-100 rounded-lg overflow-hidden">
              {product.images && Object.keys(product.images).length > 0 ? (
                <img
                  src={Object.values(product.images)[0]}
                  alt={getProductName(product)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="w-full h-full items-center justify-center text-gray-400 flex">
                  <Package className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-2">
                  {getProductName(product)}
                </h3>
                <p className="text-sm text-gray-500">SKU: {getProductSku(product)}</p>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-primary-600">
                  {getPrice(product)}
                </span>
                {getStatusBadge(product)}
              </div>

              {/* Out of Stock Warning */}
              {product.isOutOfStock && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      Brak na stanie magazynowym
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Stan: {product.currentStock || 0} sztuk
                  </p>
                </div>
              )}

              {/* Sync Info */}
              {product.isSynced && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Ovoko ID: {product.ovokoPartId}</p>
                  <p>Zsynchronizowano: {new Date(product.syncedAt).toLocaleDateString('pl-PL')}</p>
                  <p className="text-blue-600 font-medium">
                    Ostatnia aktualizacja: {getLastSyncInfo(product)}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                {!product.isSynced ? (
                  <button
                    onClick={() => handleImport(product)}
                    disabled={importing[product.sku]}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    {importing[product.sku] ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importuję...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importuj
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdate(product)}
                    disabled={updating[product.sku]}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    {updating[product.sku] ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Aktualizuję...
                      </>
                    ) : (
                      <>
                        <UpdateIcon className="h-4 w-4 mr-2" />
                        Aktualizuj
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak produktów</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie znaleziono produktów spełniających kryteria wyszukiwania.
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Pokazuję {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalProducts)} z {pagination.totalProducts} produktów
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleFirstPage}
                disabled={!pagination.hasPrevPage}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pierwsza strona"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrevPage}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Poprzednia strona"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        pageNum === pagination.page
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Następna strona"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleLastPage}
                disabled={!pagination.hasNextPage}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ostatnia strona"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              Strona {pagination.page} z {pagination.totalPages}
            </div>
          </div>
        </div>
      )}

      {/* Info about update functionality */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <UpdateIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Aktualizacja produktów</h4>
            <p className="text-sm text-blue-700 mt-1">
              Po zaimportowaniu produktu do Ovoko, możesz użyć przycisku "Aktualizuj" aby zsynchronizować 
              go ponownie z aktualnym stanem z BaseLinker. Aktualizuje cenę, zdjęcia i inne dane.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products; 