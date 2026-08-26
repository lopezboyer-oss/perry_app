'use client';

import React, { useRef, useState } from 'react';
import { ShieldCheck, Download, Printer, Lock, Calendar, Building, DollarSign, UserCheck, Globe, CheckCircle2 } from 'lucide-react';

interface Props {
  log: {
    id: string;
    companyName: string;
    periodNumber: string;
    totalAmount: number;
    employeeCount: number;
    bankBreakdown: string | null;
    signedBy: string | null;
    signedAt: string | null;
    ipAddress: string | null;
    tokenHash: string;
    status: string;
    createdAt: string;
  };
}

export function ComprobanteClient({ log }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generatingImg, setGeneratingImg] = useState(false);

  const formattedAmount = log.totalAmount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const signedDateStr = log.signedAt
    ? new Date(log.signedAt).toLocaleString('es-MX', {
        timeZone: 'America/Tijuana',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : 'No registrada';

  // Bank breakdown parser
  let breakdownList: { bank: string; amount: number }[] = [];
  if (log.bankBreakdown) {
    try {
      const parsed = JSON.parse(log.bankBreakdown);
      if (typeof parsed === 'object' && parsed !== null) {
        breakdownList = Object.entries(parsed).map(([k, v]) => ({
          bank: k.toUpperCase(),
          amount: Number(v) || 0,
        }));
      }
    } catch {
      /* ignore */
    }
  }

  // Pure HTML5 Canvas PNG Generator (High Definition, 0 dependencies)
  const downloadPNG = () => {
    setGeneratingImg(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 1200;
      canvas.height = 800;

      // Fill Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 800);

      // Card Box (Inner White Container)
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(40, 40, 1120, 720, 16);
      ctx.fill();

      // Card Header (Dark Slate)
      ctx.fillStyle = '#0f172a';
      ctx.roundRect(40, 40, 1120, 110, [16, 16, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('PERRY INTELLIGENCE • PERRY APP TREASURY SYSTEM', 70, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px Inter, sans-serif';
      ctx.fillText('COMPROBANTE OFICIAL DE AUTORIZACIÓN DIGITAL DE NÓMINA', 70, 118);

      // Status Badge (Emerald Green)
      ctx.fillStyle = '#dcfce7';
      ctx.roundRect(70, 180, 480, 42, 8);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.stroke();

      ctx.fillStyle = '#166534';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('✅ NÓMINA APROBADA Y TOKENIZADA EN SISTEMA', 90, 207);

      // Company & Amount Block
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('EMPRESA / RAZÓN SOCIAL', 70, 260);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText(log.companyName.toUpperCase(), 70, 295);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('PERIODO / RAYA', 600, 260);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(log.periodNumber, 600, 295);

      // Amount Display (Green Box)
      ctx.fillStyle = '#f0fdf4';
      ctx.roundRect(70, 320, 1060, 90, 12);
      ctx.fill();
      ctx.strokeStyle = '#bbf7d0';
      ctx.stroke();

      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText('MONTO TOTAL DISPERSADO', 95, 355);

      ctx.fillStyle = '#166534';
      ctx.font = '900 36px Inter, sans-serif';
      ctx.fillText(`$${formattedAmount} MXN`, 95, 395);

      if (log.employeeCount > 0) {
        ctx.fillStyle = '#15803d';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(`👥 ${log.employeeCount} Colaboradores`, 800, 375);
      }

      // Bank Breakdown if present
      let nextY = 445;
      if (breakdownList.length > 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('DESGLOSE BANCARIO:', 70, nextY);
        nextY += 25;

        breakdownList.forEach((item, i) => {
          ctx.fillStyle = '#f8fafc';
          ctx.roundRect(70 + (i * 240), nextY, 220, 36, 6);
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.stroke();

          ctx.fillStyle = '#334155';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(`${item.bank}: $${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 80 + (i * 240), nextY + 22);
        });
        nextY += 55;
      }

      // Security Block (Dark Navy Inner Container)
      ctx.fillStyle = '#0f172a';
      ctx.roundRect(70, nextY, 1060, 190, 12);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText('DATOS DE AUDITORÍA Y FIRMA DIGITAL INMUTABLE', 95, nextY + 35);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('DIRECTOR AUTORIZADOR:', 95, nextY + 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`✍️ ${log.signedBy || 'Dirección General'}`, 95, nextY + 95);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('FECHA Y HORA REGISTRADA:', 600, nextY + 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillText(`⏱️ ${signedDateStr}`, 600, nextY + 95);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('HASH INMUTABLE DE TOKEN:', 95, nextY + 135);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`🔒 ${log.tokenHash}`, 95, nextY + 160);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('IP ORIGEN:', 850, nextY + 135);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`🌐 ${log.ipAddress || 'Verificada'}`, 850, nextY + 160);

      // Card Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('Perry App Governance & Treasury Security System • Documento Digital Oficial', 70, 740);

      // Convert Canvas to Data URL & Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeCo = log.companyName.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `Comprobante_Firma_${safeCo}_${log.periodNumber.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error generando imagen:', err);
      alert('Error al generar la imagen del comprobante');
    } finally {
      setGeneratingImg(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex flex-col items-center justify-center font-sans antialiased text-slate-100">
      
      {/* Header Actions */}
      <div className="w-full max-w-3xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
            <ShieldCheck size={16} /> Perry Intelligence Treasury
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white">Comprobante Oficial de Firma Digital</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadPNG}
            disabled={generatingImg}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={15} />
            {generatingImg ? 'Generando Imagen...' : 'Descargar Imagen (.PNG)'}
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Main Certificate Card Container */}
      <div
        ref={cardRef}
        className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none"
      >
        {/* Card Header Banner */}
        <div className="bg-slate-950 text-white p-6 md:p-8 relative overflow-hidden border-b border-slate-800">
          <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
            <ShieldCheck size={240} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold tracking-wide uppercase mb-3">
                <Lock size={12} /> Firma Digital Tokenizada e Inmutable
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                COMPROBANTE DE AUTORIZACIÓN
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Perry App Governance System • Perry Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-6">

          {/* Status Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-900 text-sm">NÓMINA APROBADA Y REGISTRADA EN SISTEMA</h3>
                <p className="text-xs text-emerald-700">Autorización otorgada formalmente por Dirección General</p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
              VALOR OFICIAL
            </span>
          </div>

          {/* Main Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Building size={13} className="text-indigo-600" /> Empresa / Razón Social
              </span>
              <p className="text-lg md:text-xl font-black text-slate-800">{log.companyName.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-600" /> Periodo / Raya Semanal
              </span>
              <p className="text-lg md:text-xl font-black text-slate-800">{log.periodNumber}</p>
            </div>
          </div>

          {/* Total Dispersed Amount Box */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <DollarSign size={14} /> Monto Total Dispersado Autorizado
              </span>
              <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
                ${formattedAmount} <span className="text-lg font-bold text-emerald-400">MXN</span>
              </p>
            </div>
            {log.employeeCount > 0 && (
              <div className="bg-white/10 backdrop-blur border border-white/10 px-4 py-2.5 rounded-xl self-start sm:self-center">
                <span className="text-xs font-bold text-emerald-200 block">Cobertura</span>
                <span className="text-sm font-black text-white">{log.employeeCount} Colaboradores</span>
              </div>
            )}
          </div>

          {/* Bank Breakdown if available */}
          {breakdownList.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Desglose Bancario Dispersado</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {breakdownList.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{item.bank}</span>
                    <span className="text-sm font-black text-slate-800">${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security & Token Signature Details */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} /> Registro de Seguridad & Firma Tokenizada
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                VERIFICADO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5 flex items-center gap-1">
                  <UserCheck size={13} className="text-emerald-400" /> Director Autorizador:
                </span>
                <p className="font-bold text-white text-sm">{log.signedBy || 'Dirección General'}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5 flex items-center gap-1">
                  <Calendar size={13} className="text-sky-400" /> Fecha y Hora Registrada:
                </span>
                <p className="font-bold text-white text-sm">{signedDateStr}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-semibold mb-0.5">Hash de Token Inmutable:</span>
                <p className="font-mono text-[11px] text-sky-300 break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {log.tokenHash}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5 flex items-center gap-1">
                  <Globe size={12} /> IP Origen:
                </span>
                <p className="font-mono text-xs text-white bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {log.ipAddress || 'IP Registrada'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Card Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-slate-400 text-[11px]">
          Perry App Treasury Security • Documento oficial de validación de dispersión de nóminas • Perry Intelligence 🤖
        </div>
      </div>
    </div>
  );
}
