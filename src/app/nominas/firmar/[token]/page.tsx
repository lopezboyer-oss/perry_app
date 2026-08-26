'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  UserCheck,
  Calendar,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  companyName: string;
  periodNumber: string;
  reportDate: string;
  totalAmount: number;
  employeeCount: number;
  bankBreakdown: string;
  observations: string;
  imageUrl: string;
  signedImageUrl: string;
  status: string;
  signedBy: string;
  signedAt: string;
  tokenHash: string;
  createdAt: string;
}

interface UserSessionInfo {
  isAuthenticated: boolean;
  email: string;
  isDirector: boolean;
  signerName: string | null;
}

export default function FirmarNominaPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [log, setLog] = useState<PayrollRecord | null>(null);
  const [userSession, setUserSession] = useState<UserSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/treasury/nominas/authorize?token=${token}`);
      if (!res.ok) {
        setError('No se pudo cargar la información de la nómina. El enlace podría haber expirado.');
        setLoading(false);
        return;
      }
      const json = await res.json();
      setLog(json.log);
      setUserSession(json.userSession || null);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPayroll();
  }, [token]);

  const handleAuthorize = async (action: 'APPROVE' | 'REJECT') => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/treasury/nominas/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          notes: rejectReason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error procesando la firma digital');
      }

      const json = await res.json();
      setLog(json.log);
      setSuccessMsg(
        action === 'APPROVE'
          ? `Nómina autorizada y tokenizada con éxito por ${json.log.signedBy}. Se ha notificado al grupo de WhatsApp.`
          : `La nómina ha sido rechazada por ${json.log.signedBy}. Se ha notificado al grupo de WhatsApp.`
      );
    } catch (err: any) {
      setError(err.message || 'Error autorizando nómina');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Cargando Bóveda de Firma de Nómina...</p>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-100">Enlace de Nómina Inválido</h1>
          <p className="text-xs text-slate-400">{error || 'No se encontró la nómina solicitada.'}</p>
        </div>
      </div>
    );
  }

  let bankBreakdownList: Array<{ bankOrSource: string; amount: number }> = [];
  try {
    if (log.bankBreakdown) bankBreakdownList = JSON.parse(log.bankBreakdown);
  } catch {}

  const isApproved = log.status === 'APROBADA_TOKENIZADA' || log.status === 'APROBADA_FIRMA_MANUAL';
  const isRejected = log.status === 'RECHAZADA';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
              <FileText className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Firma Digital Tokenizada
              </span>
              <h1 className="text-xl font-black text-slate-100 mt-1">{log.companyName}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {log.periodNumber || 'Raya Semanal'} — {new Date(log.reportDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="text-right">
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg">
                <CheckCircle2 className="w-4 h-4" /> Aprobada
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-lg">
                <XCircle className="w-4 h-4" /> Rechazada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
                <Clock className="w-4 h-4" /> Pendiente
              </span>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Total Amount Summary Card */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-500/20 p-6 rounded-2xl space-y-2 text-center shadow-inner">
          <p className="text-xs text-indigo-300 uppercase tracking-widest font-bold">Monto Total de Nómina a Dispersar</p>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight font-mono">
            {formatCurrency(log.totalAmount)}
          </div>
          {log.employeeCount > 0 && (
            <p className="text-xs text-slate-400">{log.employeeCount} empleados registrados</p>
          )}
        </div>

        {/* Bank Breakdown */}
        {bankBreakdownList.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Desglose de Dispersión por Banco / Fuente
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              {bankBreakdownList.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.bankOrSource}</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {log.observations && (
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
            <p className="text-[11px] font-bold uppercase text-amber-400">Observaciones de Asistente:</p>
            <p className="text-xs text-slate-300 italic">"{log.observations}"</p>
          </div>
        )}

        {/* Image Sheet Preview */}
        {log.imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Hoja de Nómina Adjunta</span>
              <a
                href={log.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver Imagen Completa
              </a>
            </div>
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-black max-h-72 flex items-center justify-center">
              <img src={log.imageUrl} alt="Nómina" className="max-h-72 object-contain" />
            </div>
          </div>
        )}

        {/* Audit Signer Trail if Approved */}
        {isApproved && (
          <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-2xl space-y-1.5 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Firmado Digitalmente con Token Seguro</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Autorizado por: <strong className="text-white">{log.signedBy}</strong> el {new Date(log.signedAt).toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}
            </p>
            <p className="text-[10px] font-mono text-slate-500 break-all">
              Hash Token: {log.tokenHash}
            </p>
          </div>
        )}

        {/* Action Buttons for Unapproved Status */}
        {!isApproved && !isRejected && (
          <div className="space-y-4 pt-2">
            {!userSession?.isAuthenticated ? (
              <div className="bg-amber-950/30 border border-amber-500/30 p-5 rounded-2xl text-center space-y-3 shadow-xl">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Sesión Directiva Requerida</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Para garantizar la validez e infalsificabilidad legal de la firma tokenizada, debes iniciar sesión con tu cuenta de Dirección General en Perry App.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/login?callbackUrl=/nominas/firmar/${token}`)}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  🔐 Iniciar Sesión en Perry App para Firmar
                </button>
              </div>
            ) : !userSession?.isDirector ? (
              <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-2xl text-center space-y-2 shadow-xl">
                <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-100">Acceso Restringido Directivo</h3>
                <p className="text-xs text-slate-400">
                  La sesión activa (<strong className="text-slate-200">{userSession.email}</strong>) no cuenta con privilegios de Dirección General para autorizar la nómina.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Sesión Directiva Verificada</p>
                      <p className="font-bold text-emerald-300 text-xs">{userSession.signerName}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                    {userSession.email}
                  </span>
                </div>

                {!showRejectForm ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleAuthorize('APPROVE')}
                      disabled={submitting}
                      className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs shadow-xl transition-all flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>{submitting ? 'Procesando Firma Tokenizada...' : `✍️ Autorizar y Firmar como ${userSession.signerName?.split(' ')[0]}`}</span>
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl text-xs transition-all"
                    >
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs font-bold text-rose-400">Motivo de Rechazo:</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Escribe el motivo del rechazo para notificar al asistente..."
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAuthorize('REJECT')}
                        disabled={submitting}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                      >
                        Confirmar Rechazo
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
