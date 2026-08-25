'use client';

import { useState, useEffect } from 'react';
import {
  Landmark,
  TrendingUp,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('TODAS');

  const fetchTreasuryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/treasury/balances');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Acceso denegado: Este módulo de Tesorería Directiva es de uso exclusivo para IVAN LOPEZ.');
        } else {
          setError('Error al cargar la información de tesorería.');
        }
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
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

  const companiesList = data ? Object.keys(data.companyBreakdown) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-400/30 rounded-xl">
              <Landmark className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Bóveda de Tesorería Directiva
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Exclusivo Ivan López
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Consolidado en tiempo real de cuentas bancarias, ingresos, egresos y liquidez multiempresa Perry Intelligence.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTreasuryData}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar Saldos</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Liquidez Total MXN */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Liquidez Total (Pesos)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(data?.summary.totalLiquidityMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Caja y bancos disponibles en MXN</p>
        </div>

        {/* Card 2: Liquidez Total USD */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Liquidez Total (Dólares)</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 tracking-tight">
            {formatCurrency(data?.summary.totalLiquidityUSD || 0, 'USD')}
          </div>
          <p className="text-[11px] text-slate-500">Cuentas en Dólares USD</p>
        </div>

        {/* Card 3: Línea de Crédito Revolvente */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Líneas de Crédito</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(data?.summary.totalRevolvingCreditMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Financiamiento revolvente disponible</p>
        </div>

        {/* Card 4: Inversiones Crecientes */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Inversiones Santander</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 tracking-tight">
            {formatCurrency(data?.summary.totalInvestmentsMXN || 0, 'MXN')}
          </div>
          <p className="text-[11px] text-slate-500">Fondos en inversión activa</p>
        </div>
      </div>

      {/* Company Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 overflow-x-auto">
        <button
          onClick={() => setSelectedCompany('TODAS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5"
              >
                {/* Company Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                      {companyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{companyName}</h2>
                      <p className="text-xs text-slate-400">
                        {compData.accounts.length} cuentas registradas en tesorería
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs font-semibold">
                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                      Disponible MXN: {formatCurrency(compData.mxn, 'MXN')}
                    </div>
                    {compData.usd > 0 && (
                      <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                        Disponible USD: {formatCurrency(compData.usd, 'USD')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accounts Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Banco / Cuenta</th>
                        <th className="py-3 px-3">Moneda</th>
                        <th className="py-3 px-3 text-right">Saldo Anterior</th>
                        <th className="py-3 px-3 text-right">Ingresos</th>
                        <th className="py-3 px-3 text-right">Egresos</th>
                        <th className="py-3 px-3 text-right">Saldo Disponible</th>
                        <th className="py-3 px-3 text-center">Auditoría Math</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {compData.accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-100 flex items-center space-x-2">
                            <span>{acc.bankName}</span>
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                              {acc.accountType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              acc.currency === 'USD'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {acc.currency}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {formatCurrency(acc.initialBalance, acc.currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400">
                            {acc.income > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                {formatCurrency(acc.income, acc.currency)}
                              </span>
                            ) : (
                              '$0.00'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-400">
                            {acc.expenses > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                {formatCurrency(acc.expenses, acc.currency)}
                              </span>
                            ) : (
                              '$0.00'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-100 text-sm">
                            {formatCurrency(acc.finalBalance, acc.currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {acc.isCalculatedMatch ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correcto
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <AlertTriangle className="w-3.5 h-3.5" /> Dif. {formatCurrency(acc.calculatedDiff, acc.currency)}
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
    </div>
  );
}
