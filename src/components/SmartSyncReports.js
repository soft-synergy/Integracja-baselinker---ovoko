import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  X
} from 'lucide-react';

const SmartSyncReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({
    type: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportData, setSelectedReportData] = useState(null);
  const [viewing, setViewing] = useState(false);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.search) {
        const needle = filters.search.toLowerCase();
        const hay = JSON.stringify(r).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [reports, filters]);

  useEffect(() => {
    loadReports(1);
  }, []);

  const loadReports = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        type: filters.type
      });
      const res = await fetch(`/api/smart-sync-reports?${params}`);
      if (!res.ok) throw new Error('Nie udało się pobrać raportów');
      const data = await res.json();
      setReports(data.reports || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      // noop UI-level; could integrate with activity log context in future
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (report) => {
    try {
      setViewing(true);
      setSelectedReport(report);
      setSelectedReportData(null);
      const res = await fetch(`/api/smart-sync-reports/${encodeURIComponent(report.filename)}`);
      if (!res.ok) throw new Error('Nie udało się pobrać raportu');
      const json = await res.json();
      setSelectedReportData(json);
    } catch (e) {
      setSelectedReportData({ error: 'Nie udało się pobrać raportu' });
    } finally {
      setViewing(false);
    }
  };

  const handleDownload = async (report) => {
    const res = await fetch(`/api/smart-sync-reports/${encodeURIComponent(report.filename)}`);
    if (!res.ok) return;
    const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporty Smart Sync</h1>
          <p className="text-gray-600 mt-1">Przeglądaj szczegółowe raporty i błędy z inteligentnej synchronizacji</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => loadReports(pagination.page)} className="btn-secondary flex items-center" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filtry
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="input-field"
              >
                <option value="all">Wszystkie</option>
                <option value="report">Raporty</option>
                <option value="error">Błędy</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Szukaj</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Szukaj po nazwie pliku, statusie, liczbach..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
            <button onClick={() => { setFilters({ type: 'all', search: '' }); loadReports(1); }} className="btn-secondary">
              Wyczyść filtry
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Czas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Podsumowanie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((r) => (
                <tr key={r.filename} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {r.type === 'error' ? (
                        <AlertTriangle className="h-4 w-4 text-error-600 mr-2" />
                      ) : (
                        <Activity className="h-4 w-4 text-primary-600 mr-2" />
                      )}
                      <span className={`status-badge ${r.type === 'error' ? 'status-error' : 'status-success'}`}>
                        {r.type === 'error' ? 'Błąd' : 'Raport'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{r.filename}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {r.timestamp ? new Date(r.timestamp).toLocaleString('pl-PL') : '—'}
                    </div>
                    {typeof r.duration === 'number' && (
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        {r.duration}s
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {r.type === 'error' ? (
                      <div className="text-sm text-error-700 truncate max-w-md">{r.error || 'Nieznany błąd'}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div className="text-gray-500">Nowe:</div>
                        <div className="text-gray-900">{r.summary?.new_products ?? '—'}</div>
                        <div className="text-gray-500">Usunięte:</div>
                        <div className="text-gray-900">{r.summary?.removed_products ?? '—'}</div>
                        <div className="text-gray-500">Zmiany stanu:</div>
                        <div className="text-gray-900">{r.summary?.stock_changes ?? '—'}</div>
                        <div className="text-gray-500">Usunięte w Ovoko:</div>
                        <div className="text-gray-900">{r.summary?.products_removed_from_ovoko ?? '—'}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                    <button onClick={() => viewReport(r)} className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      Podgląd
                    </button>
                    <button onClick={() => handleDownload(r)} className="text-gray-600 hover:text-gray-900 inline-flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      Pobierz
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak raportów</h3>
            <p className="mt-1 text-sm text-gray-500">Nie znaleziono raportów dla ustawionych filtrów.</p>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedReport.filename}</h3>
              <button onClick={() => { setSelectedReport(null); setSelectedReportData(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {viewing && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            )}

            {!viewing && selectedReportData && (
              <div className="space-y-6">
                {selectedReport.type === 'error' ? (
                  <div className="card">
                    <div className="text-sm text-error-700">{selectedReportData.error || 'Nieznany błąd'}</div>
                    {selectedReportData.stack && (
                      <pre className="mt-4 p-3 bg-gray-50 rounded text-xs overflow-auto">
{selectedReportData.stack}
                      </pre>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="card">
                        <div className="text-sm text-gray-500">Czas trwania</div>
                        <div className="text-lg font-medium text-gray-900 mt-1">{selectedReportData.duration}s</div>
                      </div>
                      <div className="card">
                        <div className="text-sm text-gray-500">Łącznie produktów</div>
                        <div className="text-lg font-medium text-gray-900 mt-1">{selectedReportData.current_inventory?.total_products}</div>
                      </div>
                      <div className="card">
                        <div className="text-sm text-gray-500">Zmiany</div>
                        <div className="text-lg font-medium text-gray-900 mt-1">
                          {(selectedReportData.summary?.new_products || 0)
                            + (selectedReportData.summary?.removed_products || 0)
                            + (selectedReportData.summary?.stock_changes || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="card">
                        <div className="font-medium text-gray-900 mb-2">Nowe produkty</div>
                        <pre className="text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(selectedReportData.changes?.new_products, null, 2)}</pre>
                      </div>
                      <div className="card">
                        <div className="font-medium text-gray-900 mb-2">Usunięte produkty</div>
                        <pre className="text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(selectedReportData.changes?.removed_products, null, 2)}</pre>
                      </div>
                      <div className="card">
                        <div className="font-medium text-gray-900 mb-2">Zmiany stanów</div>
                        <pre className="text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(selectedReportData.changes?.stock_changes, null, 2)}</pre>
                      </div>
                    </div>

                    <div className="card">
                      <div className="font-medium text-gray-900 mb-2">Wynik usuwania z Ovoko</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded max-h-64 overflow-auto">{JSON.stringify(selectedReportData.removal_results, null, 2)}</pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSyncReports;

