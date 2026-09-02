export interface DailyPlanPDFExportParams {
  dateStr: string;
  selectedCompany: string;
  plans: any[];
  warnings: Array<{
    personName: string;
    count: number;
    assignments: { companyName: string; activityTitle: string }[];
  }>;
}

export function exportDailyPlanPDFClient({
  dateStr,
  selectedCompany,
  plans,
  warnings,
}: DailyPlanPDFExportParams) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes en tu navegador para ver e imprimir el PDF del Plan Diario.');
    return;
  }

  const generatedAt = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Tijuana',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getCompanyColor = (name: string) => {
    const upper = name.toUpperCase();
    if (upper.includes('OPUS')) return { bg: '#f59e0b', text: '#78350f', border: '#fcd34d' };
    if (upper.includes('DROBOTS')) return { bg: '#0284c7', text: '#0c4a6e', border: '#7dd3fc' };
    if (upper.includes('GLOBAL') || upper.includes('CASEME')) return { bg: '#10b981', text: '#064e3b', border: '#6ee7b7' };
    return { bg: '#6366f1', text: '#1e1b4b', border: '#a5b4fc' };
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Plan Diario — ${dateStr}</title>
      <style>
        @page {
          size: letter landscape;
          margin: 8mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 9.5px;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
        }

        /* Anti-corte de página estricto */
        .page-block, .plan-card, .activity-table, .warning-banner, .footer-audit {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .section-header {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        /* Top Header */
        .main-header {
          background: #0f172a !important;
          color: #ffffff !important;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .header-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 700;
        }

        /* Warning Banner */
        .warning-banner {
          background: #fffbeeb0 !important;
          border: 1.5px solid #fde047;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 12px;
        }

        .warning-title {
          font-size: 10px;
          font-weight: 900;
          color: #854d0e;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .warning-item {
          font-size: 8.5px;
          color: #713f12;
          margin-bottom: 2px;
        }

        /* Plan Card */
        .plan-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          margin-bottom: 14px;
          overflow: hidden;
          background: #ffffff;
        }

        .plan-card-header {
          padding: 8px 12px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Activity Table */
        table.act-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }

        table.act-table th {
          background: #f1f5f9 !important;
          color: #334155 !important;
          font-weight: 800;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: 8.5px;
          text-transform: uppercase;
        }

        table.act-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }

        table.act-table tr:nth-child(even) {
          background: #f8fafc !important;
        }

        .badge-cross {
          background: #dbeafe !important;
          color: #1e40af !important;
          border: 1px solid #93c5fd;
          padding: 1.5px 5px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 7.5px;
          display: inline-block;
          margin-top: 3px;
        }

        .badge-warning {
          background: #fef3c7 !important;
          color: #92400e !important;
          border: 1px solid #fcd34d;
          padding: 1.5px 4px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 7.5px;
          display: inline-block;
          margin-top: 2px;
        }

        /* Personnel Status Block */
        .personnel-status-box {
          background: #f8fafc !important;
          border-top: 1.5px solid #e2e8f0;
          padding: 8px 12px;
        }

        .status-pill {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 8px;
          margin-right: 6px;
          margin-bottom: 4px;
        }

        .status-descanso { background: #dcfce7 !important; color: #166534 !important; border: 1px solid #86efac; }
        .status-vacaciones { background: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fca5a5; }
        .status-compras { background: #e0e7ff !important; color: #3730a3 !important; border: 1px solid #a5b4fc; }

        /* Footer */
        .footer-audit {
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          color: #64748b;
          font-size: 8px;
          font-weight: 700;
        }
      </style>
    </head>
    <body>

      <!-- Main Banner Header -->
      <div class="main-header">
        <div>
          <div class="header-title">PLAN DE TRABAJO DIARIO (LUNES A VIERNES)</div>
          <div class="header-subtitle">Perry Intelligence • Control Operativo Multiempresa</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 900; color: #38bdf8;">${dateStr.toUpperCase()}</div>
          <div style="font-size: 8.5px; color: #94a3b8;">${selectedCompany === 'TODAS' ? 'CONSOLIDADO MULTIEMPRESA' : selectedCompany}</div>
        </div>
      </div>

      <!-- Overlapping Technician Warning Banner -->
      ${
        warnings.length > 0
          ? `
        <div class="warning-banner">
          <div class="warning-title">⚠️ ADVERTENCIAS PREVENTIVAS DE SOBRE-ASIGNACIÓN DE PERSONAL:</div>
          ${warnings
            .map(
              (w) => `
            <div class="warning-item">
              <strong>• ${w.personName}</strong> está asignado a <strong>${w.count} actividades</strong> el mismo día: 
              ${w.assignments.map((a) => `[${a.companyName}: ${a.activityTitle}]`).join(' | ')}
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      <!-- Plans Iteration -->
      ${
        plans.length === 0
          ? `<div style="text-align:center; padding: 40px; color:#64748b; font-weight:700;">No hay actividades programadas en el Plan Diario para esta fecha.</div>`
          : plans
              .map((plan) => {
                const colors = getCompanyColor(plan.companyName);
                return `
          <div class="plan-card">
            <div class="plan-card-header" style="background: ${colors.bg};">
              <span>🏢 ${plan.companyName.toUpperCase()} — PLAN DE TRABAJO</span>
              <span>${plan.activities.length} ACTIVIDADES PROGRAMADAS</span>
            </div>

            <table class="act-table">
              <thead>
                <tr>
                  <th style="width: 4%;">#</th>
                  <th style="width: 28%;">ACTIVIDAD / TRABAJO</th>
                  <th style="width: 24%;">PERSONAS ASIGNADAS</th>
                  <th style="width: 8%;">HORARIO</th>
                  <th style="width: 10%;">CLIENTE</th>
                  <th style="width: 14%;">SUPERVISIÓN</th>
                  <th style="width: 12%;">COTIZACIÓN / P.O.</th>
                </tr>
              </thead>
              <tbody>
                ${
                  plan.activities.length === 0
                    ? `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Sin actividades registradas</td></tr>`
                    : plan.activities
                        .map(
                          (act: any, idx: number) => `
                      <tr>
                        <td style="font-weight:900; text-align:center;">${idx + 1}</td>
                        <td>
                          <strong style="color:#0f172a; font-size:10px;">${act.title}</strong>
                          ${
                            act.isCrossSupport
                              ? `<br/><span class="badge-cross">🤝 SOPORTE CRUZADO: ${act.crossSupportCompany || 'INTER-EMPRESA'}</span>`
                              : ''
                          }
                        </td>
                        <td>
                          ${act.assignedPersonnel || '-'}
                        </td>
                        <td style="font-weight:700;">
                          ${act.dayOfWeek || ''}<br/>${act.startTime || '08:00 AM'}
                        </td>
                        <td style="font-weight:800; color:#1e293b;">
                          ${act.clientName || 'OFICINA / TRAILA'}
                        </td>
                        <td style="font-size:8px;">
                          ${act.supervisorOperativo ? `<div><strong>Operativo:</strong> ${act.supervisorOperativo}</div>` : ''}
                          ${act.supervisorCotizador ? `<div><strong>Cotizador:</strong> ${act.supervisorCotizador}</div>` : ''}
                          ${act.supervisorTMMBC ? `<div><strong>TMMBC:</strong> ${act.supervisorTMMBC}</div>` : ''}
                          ${act.safetyDedicado ? `<div style="color:#166534;"><strong>Safety:</strong> ${act.safetyDedicado}</div>` : '<div><strong>Safety:</strong> no</div>'}
                        </td>
                        <td style="font-weight:700; font-family:monospace;">
                          ${act.cotizacionFolio ? `<div>Cot: ${act.cotizacionFolio}</div>` : ''}
                          ${act.poNumber ? `<div>PO: ${act.poNumber}</div>` : ''}
                        </td>
                      </tr>
                    `
                        )
                        .join('')
                }
              </tbody>
            </table>

            ${
              plan.personnelStatus && plan.personnelStatus.length > 0
                ? `
              <div class="personnel-status-box">
                <strong style="font-size:8.5px; color:#475569; display:block; margin-bottom:4px; text-transform:uppercase;">Estatus Especial de Personal (Descansos / Vacaciones / Compras):</strong>
                ${plan.personnelStatus
                  .map((ps: any) => {
                    const st = (ps.statusType || 'DESCANSO').toUpperCase();
                    const cls = st.includes('VACACION') ? 'status-vacaciones' : st.includes('COMPRA') ? 'status-compras' : 'status-descanso';
                    return `<span class="status-pill ${cls}">${st}: ${ps.personName} ${ps.notes ? `(${ps.notes})` : ''}</span>`;
                  })
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
        `;
              })
              .join('')
      }

      <!-- Footer Audit -->
      <div class="footer-audit">
        <span>${selectedCompany} • Control Operativo Plan Diario | Perry Intelligence</span>
        <span>Generado: ${generatedAt}</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
