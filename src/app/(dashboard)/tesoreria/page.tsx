'use client';

import { useState, useEffect } from 'react';
import {
  Landmark,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Share2,
  Printer,
  Copy,
  Check,
  Key,
  Plus,
  Trash2,
  Power,
  Code2,
  ExternalLink,
  Search,
  Eye,
  X,
  ImageIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { PayrollAuditModal, PayrollAuditData } from './components/PayrollAuditModal';

interface AccountBalance {
  id: string;
  companyName: string;
  reportDate: string;
  bankName: string;
  accountType: string;
  currency: string;
  initialBalance: number;
  income: number;
  expenses: number;
  finalBalance: number;
  isCalculatedMatch: boolean;
  calculatedDiff: number;
  rawMessage?: string;
  imageUrl?: string;
  createdAt: string;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  createdBy: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

interface TreasuryData {
  accessGrantedTo: string;
  summary: {
    totalLiquidityMXN: number;
    totalLiquidityUSD: number;
    totalRevolvingCreditMXN: number;
    totalInvestmentsMXN: number;
    companiesCount: number;
  };
  companyBreakdown: Record<string, {
    mxn: number;
    usd: number;
    revolvingCredit: number;
    investments: number;
    accounts: AccountBalance[];
  }>;
  logs: AccountBalance[];
}

export default function TesoreriaPage() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'BALANCES' | 'NOMINAS'>('BALANCES');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('TODAS');
  const [copiedCompany, setCopiedCompany] = useState<string | null>(null);
  const [payrollSearch, setPayrollSearch] = useState('');
  const [activeImageModal, setActiveImageModal] = useState<{
    title: string;
    imageUrl: string;
    signedImageUrl?: string | null;
  } | null>(null);

  // Payroll Audit & Deletion state
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [auditModalPayroll, setAuditModalPayroll] = useState<any | null>(null);
  const [auditData, setAuditData] = useState<PayrollAuditData | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [deleteConfirmPayroll, setDeleteConfirmPayroll] = useState<any | null>(null);
  const [isDeletingPayroll, setIsDeletingPayroll] = useState(false);

  // API Key Management state
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleStartAudit = async (pay: any) => {
    setAuditingId(pay.id);
    setAuditModalPayroll(pay);
    setAuditData(null);
    setIsAuditing(true);

    try {
      const res = await fetch(`/api/treasury/nominas/${pay.id}/reanalyze`, {
        method: 'POST',
      });

      let json: any = null;
      try {
        const text = await res.text();
        json = JSON.parse(text);
      } catch {
        // En caso de que la respuesta sea HTML (por timeout o error de servidor de Netlify)
      }

      if (!res.ok) {
        const errorMsg =
          json?.error ||
          json?.message ||
          (res.status === 504
            ? 'Tiempo de espera agotado en el servidor (504). Por favor intenta de nuevo.'
            : res.status === 401
            ? 'Sesión expirada o no autorizada. Por favor recarga la página.'
            : `Error del servidor (${res.status})`);
        alert(`Error al analizar con IA: ${errorMsg}`);
        setIsAuditing(false);
        setAuditingId(null);
        return;
      }

      if (json && json.audit) {
        setAuditData(json.audit);
      } else {
        alert('No se pudieron extraer datos de auditoría para esta hoja.');
      }
    } catch (err: any) {
      alert(`Error en análisis: ${err.message}`);
    } finally {
      setIsAuditing(false);
      setAuditingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPayroll) return;
    setIsDeletingPayroll(true);
    try {
      const res = await fetch(`/api/treasury/nominas/${deleteConfirmPayroll.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error al eliminar: ${err.error || 'Error desconocido'}`);
        return;
      }
      setPayrolls((prev) => prev.filter((p) => p.id !== deleteConfirmPayroll.id));
      setDeleteConfirmPayroll(null);
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setIsDeletingPayroll(false);
    }
  };

  const handlePayrollUpdated = (updatedLog: any) => {
    setPayrolls((prev) =>
      prev.map((p) => (p.id === updatedLog.id ? { ...p, ...updatedLog } : p))
    );
  };

  const handlePayrollDeleted = (deletedId: string) => {
    setPayrolls((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const fetchTreasuryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, payRes] = await Promise.all([
        fetch('/api/treasury/balances'),
        fetch('/api/treasury/nominas'),
      ]);

      if (!balRes.ok) {
        if (balRes.status === 403) {
          setError('Acceso denegado: Este módulo de Tesorería Directiva es de uso exclusivo para la Dirección General.');
        } else {
          setError('Error al cargar la información de tesorería.');
        }
        setLoading(false);
        return;
      }
      const json = await balRes.json();
      setData(json);

      if (payRes.ok) {
        const payJson = await payRes.json();
        setPayrolls(payJson.logs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/treasury/keys');
      if (res.ok) {
        const json = await res.json();
        setApiKeys(json.keys || []);
      }
    } catch (err) {
      console.error('Error cargando API keys:', err);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  useEffect(() => {
    if (showKeysModal) {
      fetchApiKeys();
    }
  }, [showKeysModal]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    try {
      const res = await fetch('/api/treasury/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Software Antigravity - Integración Interna' }),
      });
      if (res.ok) {
        setNewKeyName('');
        await fetchApiKeys();
      }
    } catch (err) {
      console.error('Error creando API Key:', err);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleToggleKey = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/treasury/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (res.ok) {
        await fetchApiKeys();
      }
    } catch (err) {
      console.error('Error cambiando estatus:', err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta API Key permanentemente?')) return;
    try {
      const res = await fetch(`/api/treasury/keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchApiKeys();
      }
    } catch (err) {
      console.error('Error eliminando API Key:', err);
    }
  };

  const handleCopyKeyStr = (id: string, keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const generateWhatsappReportText = (companyName: string) => {
    if (!data) return '';
    const compData = data.companyBreakdown[companyName];
    if (!compData) return '';

    const todayStr = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let text = `📊 *REPORTE DE SALDOS DIARIOS - ${companyName.toUpperCase()}*\n`;
    text += `📅 *Fecha:* ${todayStr}\n\n`;

    compData.accounts.forEach((acc) => {
      text += `🏦 *${acc.bankName} (${acc.currency})* [${acc.accountType}]\n`;
      text += `• Saldo Anterior: ${formatCurrency(acc.initialBalance, acc.currency)}\n`;
      if (acc.income > 0) text += `• Ingresos: ${formatCurrency(acc.income, acc.currency)}\n`;
      if (acc.expenses > 0) text += `• Egresos: ${formatCurrency(acc.expenses, acc.currency)}\n`;
      text += `• *Saldo Disponible:* ${formatCurrency(acc.finalBalance, acc.currency)}\n`;
      if (!acc.isCalculatedMatch) {
        text += `⚠️ *Diferencia matemática:* ${formatCurrency(acc.calculatedDiff, acc.currency)}\n`;
      }
      text += `\n`;
    });

    text += `💰 *TOTAL DISPONIBLE ${companyName.toUpperCase()}:* ${formatCurrency(compData.mxn, 'MXN')}`;
    if (compData.usd > 0) {
      text += ` | ${formatCurrency(compData.usd, 'USD')}`;
    }
    if (compData.revolvingCredit > 0) {
      text += `\n💳 *Líneas de Crédito:* ${formatCurrency(compData.revolvingCredit, 'MXN')}`;
    }
    if (compData.investments > 0) {
      text += `\n📈 *Inversiones Santander:* ${formatCurrency(compData.investments, 'MXN')}`;
    }
    text += `\n\n_Reporte directo desde Perry Intelligence 🤖_`;

    return text;
  };

  const handleShareWhatsapp = (companyName: string) => {
    const reportText = generateWhatsappReportText(companyName);
    if (!reportText) return;
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  const handleCopyReport = (companyName: string) => {
    const reportText = generateWhatsappReportText(companyName);
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopiedCompany(companyName);
    setTimeout(() => setCopiedCompany(null), 2500);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium">Cargando Bóveda de Tesorería Directiva...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-slate-900 border border-red-500/30 rounded-xl text-center shadow-xl">
        <Lock className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Acceso Restringido Directivo</h2>
        <p className="text-red-300 text-sm mb-6">{error}</p>
        <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
          Módulo de Control Patrimonial y Flujo de Efectivo reservado exclusivamente para la Dirección General.
        </div>
      </div>
    );
  }

  const currentUserEmail = (data?.accessGrantedTo || '').toLowerCase().trim();
  const isIvanLopezOnly =
    ['lopezboyer@gmail.com', 'ivanjoselopezboyer@gmail.com', 'ivan@grupocaseme.com'].includes(currentUserEmail) ||
    currentUserEmail.includes('lopezboyer');
  const companiesList = data ? Object.keys(data.companyBreakdown) : [];

  return (
    <div className="space-y-6 p-4 sm:p-6 text-slate-100 max-w-7xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
            <Landmark className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Bóveda de Tesorería Directiva
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Acceso Directivo
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Consolidado en tiempo real de cuentas bancarias, ingresos, egresos y liquidez multiempresa Perry Intelligence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* API Key Management Button — EXCLUSIVO IVAN LÓPEZ */}
          {isIvanLopezOnly && (
            <button
              onClick={() => {
                fetchApiKeys();
                setShowKeysModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition-all shadow"
              title="Gestionar API Keys de integración para otros softwares de la empresa"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>API Keys & Integraciones</span>
            </button>
          )}

          <button
            onClick={handlePrintPdf}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow"
            title="Exportar / Imprimir reporte en PDF"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Imprimir PDF</span>
          </button>

          <button
            onClick={fetchTreasuryData}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all shadow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Main View Switcher (Saldos vs Nóminas) */}
      <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl w-fit shadow-lg">
        <button
          onClick={() => setActiveView('BALANCES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'BALANCES'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Saldos Bancarios & Flujo</span>
        </button>
        <button
          onClick={() => setActiveView('NOMINAS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'NOMINAS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Control de Nóminas & Firmas ({payrolls.length})</span>
        </button>
      </div>

      {activeView === 'NOMINAS' ? (
        /* VISTA DE CONTROL DE NÓMINAS Y FIRMAS TOKENIZADAS CON FILTROS Y VISOR DE IMÁGENES */
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Control de Nóminas & Firmas Tokenizadas
                </h2>
                <p className="text-xs text-slate-400">
                  Histórico consecutivo de dispersiones salariales por semana y empresa con verificación de firma directiva.
                </p>
              </div>

              {/* Input de Búsqueda por Período / Raya */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={payrollSearch}
                  onChange={(e) => setPayrollSearch(e.target.value)}
                  placeholder="Buscar semana o raya (ej. Raya 34)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Selector Superior de Empresas (Filtro por Empresa) */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
              <button
                onClick={() => setSelectedCompany('TODAS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCompany === 'TODAS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                🌐 Todas las Empresas ({(payrolls || []).length})
              </button>
              {['GRUPO CASEME', 'DROBOTS', 'OPUS INGENIUM', 'VULCAN FORGE'].map((comp) => {
                const compCount = (payrolls || []).filter((p) => p.companyName === comp).length;
                return (
                  <button
                    key={comp}
                    onClick={() => setSelectedCompany(comp)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                      selectedCompany === comp
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>🏢 {comp}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-slate-300 font-mono">
                      {compCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Renderizado de Tarjetas de Nómina Filtradas */}
            {(() => {
              const filteredPayrolls = (payrolls || []).filter((p) => {
                const matchesCompany = selectedCompany === 'TODAS' || p.companyName === selectedCompany;
                const searchLower = payrollSearch.toLowerCase().trim();
                const matchesSearch =
                  !searchLower ||
                  (p.periodNumber || '').toLowerCase().includes(searchLower) ||
                  (p.companyName || '').toLowerCase().includes(searchLower) ||
                  (p.observations || '').toLowerCase().includes(searchLower);
                return matchesCompany && matchesSearch;
              });

              if (filteredPayrolls.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No se encontraron nóminas registradas para los filtros seleccionados.</p>
                    <p className="text-[11px] text-slate-600">Al compartir una imagen de nómina en los grupos de administración de WhatsApp, Perry la procesará automáticamente.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredPayrolls.map((pay) => {
                    let breakdownList: any[] = [];
                    try {
                      if (pay.bankBreakdown) breakdownList = JSON.parse(pay.bankBreakdown);
                    } catch {}

                    const isAppr = pay.status === 'APROBADA_TOKENIZADA' || pay.status === 'APROBADA_FIRMA_MANUAL';
                    const isRej = pay.status === 'RECHAZADA';
                    const isAux = pay.status === 'REPORTE_AUXILIAR';

                    return (
                      <div
                        key={pay.id}
                        className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-3">
                          {/* Top Header */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                              🏢 {pay.companyName}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isAppr
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isRej
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : isAux
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                              }`}
                            >
                              {isAppr ? '✅ APROBADA' : isRej ? '❌ RECHAZADA' : isAux ? '📎 AUXILIAR / HORAS EXTRA' : '⏳ PENDIENTE'}
                            </span>
                          </div>

                          {/* Period & Date */}
                          <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-slate-200 font-bold text-xs">{pay.periodNumber || 'Raya Semanal'}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {pay.reportDate ? new Date(pay.reportDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                            </span>
                          </div>

                          {/* Total Amount Box */}
                          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950 p-4 rounded-xl border border-indigo-500/20 text-center space-y-0.5 shadow-inner">
                            <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Monto Total de Dispersión</p>
                            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                              {formatCurrency(pay.totalAmount || 0, 'MXN')}
                            </div>
                            {pay.employeeCount > 0 && (
                              <p className="text-[10px] text-slate-500">{pay.employeeCount} empleados registrados</p>
                            )}
                          </div>

                          {/* Breakdown List */}
                          {breakdownList.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desglose por Banco / Fuente:</p>
                              <div className="bg-slate-900 p-2.5 rounded-xl text-xs space-y-1 divide-y divide-slate-800/80 border border-slate-800">
                                {breakdownList.map((b: any, bIdx: number) => (
                                  <div key={bIdx} className="flex justify-between pt-1">
                                    <span className="text-slate-300 font-medium">{b.bankOrSource}</span>
                                    <span className="font-mono text-emerald-400 font-bold">{formatCurrency(b.amount, 'MXN')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Observations */}
                          {pay.observations && (
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 italic">
                              <span className="font-bold text-amber-400 uppercase not-italic block text-[10px]">Observaciones:</span>
                              "{pay.observations}"
                            </div>
                          )}

                          {/* Signer Audit Info if Approved */}
                          {isAppr && pay.signedBy && (
                            <div className="bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl text-[11px] space-y-0.5">
                              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Firmado por: {pay.signedBy}</span>
                              </div>
                              {pay.signedAt && (
                                <p className="text-slate-400 text-[10px]">
                                  {new Date(pay.signedAt).toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Bar */}
                        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                          {/* Image Viewer Button */}
                          {pay.imageUrl || pay.signedImageUrl ? (
                            <button
                              onClick={() =>
                                setActiveImageModal({
                                  title: `${pay.companyName} — ${pay.periodNumber || 'Raya Semanal'}`,
                                  imageUrl: pay.imageUrl,
                                  signedImageUrl: pay.signedImageUrl,
                                })
                              }
                              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                              title="Ver hoja completa"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Ver Hoja</span>
                            </button>
                          ) : null}

                          {/* AI Audit Button */}
                          <button
                            onClick={() => handleStartAudit(pay)}
                            disabled={auditingId === pay.id}
                            className="py-2 px-3 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                            title="Analizar cantidades y estructura con IA"
                          >
                            {auditingId === pay.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            <span>{auditingId === pay.id ? 'Analizando...' : 'Analizar con IA'}</span>
                          </button>

                          {/* Token Signature Button / Comprobante */}
                          {pay.tokenHash ? (
                            <a
                              href={isAppr ? `/nominas/comprobante/${pay.tokenHash}` : `/nominas/firmar/${pay.tokenHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex-1 py-2 px-3 ${isAppr ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200'} border font-bold rounded-xl text-xs text-center transition-all flex items-center justify-center space-x-1.5`}
                            >
                              <span>{isAppr ? '📜 Comprobante' : '✍️ Firma Digital'}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500">Sin token</span>
                          )}

                          {/* Delete Card Button */}
                          <button
                            onClick={() => setDeleteConfirmPayroll(pay)}
                            className="p-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all"
                            title="Eliminar este registro de nómina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <>
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Liquidez Total MXN */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Liquidez Total (Pesos)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight font-mono">
            {formatCurrency(data?.summary.totalLiquidityMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Caja y bancos disponibles en MXN</p>
        </div>

        {/* Card 2: Liquidez Total USD */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Liquidez Total (Dólares)</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight font-mono">
            {formatCurrency(data?.summary.totalLiquidityUSD || 0, 'USD')}
          </div>
          <p className="text-[11px] text-slate-500">Cuentas en Dólares USD</p>
        </div>

        {/* Card 3: Línea de Crédito Revolvente */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Líneas de Crédito</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight font-mono">
            {formatCurrency(data?.summary.totalRevolvingCreditMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Financiamiento revolvente disponible</p>
        </div>

        {/* Card 4: Inversiones Crecientes */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Inversiones Santander</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 tracking-tight font-mono">
            {formatCurrency(data?.summary.totalInvestmentsMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Fondos en inversión activa</p>
        </div>
      </div>

      {/* Company Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setSelectedCompany('TODAS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCompany === 'TODAS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          🌐 Todas las Empresas ({companiesList.length})
        </button>
        {companiesList.map((comp) => (
          <button
            key={comp}
            onClick={() => setSelectedCompany(comp)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCompany === comp
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            🏢 {comp}
          </button>
        ))}
      </div>

      {/* Breakdown per Company */}
      <div className="space-y-6">
        {companiesList
          .filter((comp) => selectedCompany === 'TODAS' || selectedCompany === comp)
          .map((companyName) => {
            const compData = data?.companyBreakdown[companyName];
            if (!compData) return null;

            return (
              <div
                key={companyName}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
              >
                {/* Company Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/40 flex items-center justify-center font-bold text-indigo-400 text-sm">
                      {companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{companyName}</h2>
                      <p className="text-xs text-slate-400">
                        {compData.accounts.length} cuentas registradas en tesorería
                      </p>
                    </div>
                  </div>

                  {/* Actions & Totals */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold font-mono">
                      MXN: {formatCurrency(compData.mxn, 'MXN')}
                    </div>
                    {compData.usd > 0 && (
                      <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold font-mono">
                        USD: {formatCurrency(compData.usd, 'USD')}
                      </div>
                    )}

                    {/* WhatsApp Export Button */}
                    <button
                      onClick={() => handleShareWhatsapp(companyName)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold transition-all shadow"
                      title="Enviar reporte por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Copy Text Button */}
                    <button
                      onClick={() => handleCopyReport(companyName)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      title="Copiar texto formateado al portapapeles"
                    >
                      {copiedCompany === companyName ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Accounts Table — Optimized Column Widths */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                        <th className="py-2.5 px-3 min-w-[180px]">Banco / Cuenta</th>
                        <th className="py-2.5 px-2 w-[70px] text-center">Moneda</th>
                        <th className="py-2.5 px-3 w-[120px] text-right">Saldo Anterior</th>
                        <th className="py-2.5 px-3 w-[110px] text-right">Ingresos</th>
                        <th className="py-2.5 px-3 w-[110px] text-right">Egresos</th>
                        <th className="py-2.5 px-3 w-[130px] text-right">Saldo Disponible</th>
                        <th className="py-2.5 px-3 w-[110px] text-center">Auditoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200 bg-slate-900/40 font-mono">
                      {compData.accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-100 flex items-center space-x-2">
                            <span className="truncate max-w-[130px]">{acc.bankName}</span>
                            <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded border shrink-0 ${
                              acc.accountType === 'TARJETA_EJECUTIVA'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 font-semibold'
                                : acc.accountType === 'CREDITO_REVOLVENTE'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 font-semibold'
                                : 'bg-slate-800 text-slate-400 border-slate-700/80'
                            }`}>
                              {acc.accountType === 'TARJETA_EJECUTIVA' ? 'TARJETA EJECUTIVA (DÉBITO)' : acc.accountType}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                              acc.currency === 'USD'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {acc.currency}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {formatCurrency(acc.initialBalance, acc.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                            {acc.income > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                {formatCurrency(acc.income, acc.currency)}
                              </span>
                            ) : (
                              '$0.00'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">
                            {acc.expenses > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                {formatCurrency(acc.expenses, acc.currency)}
                              </span>
                            ) : (
                              '$0.00'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-100 text-sm">
                            {formatCurrency(acc.finalBalance, acc.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {acc.isCalculatedMatch ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Correcto
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" /> Dif. {formatCurrency(acc.calculatedDiff, acc.currency)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
      </div>
      </>
      )}

      {/* API KEYS MANAGEMENT MODAL (RESTRICTED TO IVAN LOPEZ) */}
      {showKeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                  <Key className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">API Keys de Integración Externa</h2>
                  <p className="text-xs text-slate-400">
                    Credenciales de acceso para conectar otros softwares de la empresa desarrollados en Antigravity.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKeysModal(false)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Create New Key Form */}
            <form onSubmit={handleCreateKey} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Generar Nueva API Key de Acceso
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nombre de la app (ej: Software Antigravity - Módulo Financiero)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shrink-0 flex items-center justify-center space-x-1"
                >
                  {creatingKey ? 'Generando...' : 'Generar Key'}
                </button>
              </div>
            </form>

            {/* Documentation Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" /> Endpoint de Integración para el Desarrollador
                </span>
                <span className="text-[10px] text-slate-500 font-mono">GET API v1</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 break-all select-all">
                https://perryapp.netlify.app/api/v1/treasury/external-sync
              </div>
              <p className="text-[11px] text-slate-400">
                El desarrollador debe enviar el encabezado HTTP <code className="text-amber-300">X-Perry-Api-Key: tu_api_key</code> en sus peticiones para obtener la JSON estructurado de saldos.
              </p>
            </div>

            {/* Keys Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                API Keys Activas ({apiKeys.length})
              </h3>
              {apiKeys.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  No hay API Keys generadas. Crea la primera arriba para compartir con el equipo de desarrollo.
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-200 text-xs">{k.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            k.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {k.isActive ? 'ACTIVA' : 'REVOCADA'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="text-[11px] font-mono text-amber-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            {k.key}
                          </code>
                          <button
                            onClick={() => handleCopyKeyStr(k.id, k.key)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Copiar API Key"
                          >
                            {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Usos: {k.usageCount} | Creada: {new Date(k.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleToggleKey(k.id, k.isActive)}
                          className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                            k.isActive
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                          title={k.isActive ? 'Desactivar / Revocar' : 'Activar'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HIGH RESOLUTION PAYROLL IMAGE LIGHTBOX MODAL */}
      {activeImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                  <ImageIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{activeImageModal.title}</h3>
                  <p className="text-[11px] text-slate-400">Hoja de Nómina / Raya Semanal procesada por Perry Intelligence</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={activeImageModal.signedImageUrl || activeImageModal.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir Original
                </a>
                <button
                  onClick={() => setActiveImageModal(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Content */}
            <div className="p-4 flex-1 overflow-auto bg-black flex items-center justify-center">
              <img
                src={activeImageModal.signedImageUrl || activeImageModal.imageUrl}
                alt="Hoja de Nómina"
                className="max-h-[75vh] w-auto object-contain rounded-lg border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* PAYROLL AI AUDIT & VISUAL VALIDATION MODAL */}
      {auditModalPayroll && (
        <PayrollAuditModal
          payroll={auditModalPayroll}
          auditData={auditData}
          isLoading={isAuditing}
          onClose={() => {
            setAuditModalPayroll(null);
            setAuditData(null);
          }}
          onUpdate={handlePayrollUpdated}
          onDelete={handlePayrollDeleted}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">¿Eliminar registro de nómina?</h3>
                <p className="text-[11px] text-slate-400">{deleteConfirmPayroll.companyName} — {deleteConfirmPayroll.periodNumber || 'Raya Semanal'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Esta acción descartará permanentemente esta tarjeta de nómina y cancelará el enlace tokenizado de firma digital. Úsalo si el registro fue generado por una imagen preliminar, un reporte auxiliar o un falso positivo.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmPayroll(null)}
                disabled={isDeletingPayroll}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingPayroll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-rose-900/20"
              >
                {isDeletingPayroll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirmar y Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
