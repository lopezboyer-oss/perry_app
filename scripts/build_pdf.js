const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function createPdf() {
  const imgPath = '/Users/ivanjoselopezboyer/.gemini/antigravity-ide/brain/42577fa5-880b-423c-bf5b-103d69750ea4/perry_architecture_diagram_hd_1787769684812.jpg';
  const logoPath = path.join(__dirname, '../public/perry-logo.jpg');
  
  // Copy HD image to docs folder
  const docsDir = path.join(__dirname, '../docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.copyFileSync(imgPath, path.join(docsDir, 'perry_architecture_hd.jpg'));
  fs.copyFileSync(imgPath, '/Users/ivanjoselopezboyer/.gemini/antigravity-ide/brain/42577fa5-880b-423c-bf5b-103d69750ea4/perry_architecture_hd.jpg');

  const imgBase64 = fs.readFileSync(imgPath).toString('base64');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ecosistema y Arquitectura Perry App v2.0</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
    }

    .page {
      padding: 36px 44px;
      page-break-after: always;
      position: relative;
      height: 100vh;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Header Banner */
    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
    }

    .brand-container {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .logo-img {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      border: 2px solid rgba(6, 182, 212, 0.4);
      object-fit: cover;
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
    }

    .title-group h1 {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .title-group p {
      font-size: 11px;
      color: #38bdf8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .badge-v2 {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.4);
      color: #22d3ee;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    /* Section Headers */
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title span.icon {
      background: #e0f2fe;
      color: #0284c7;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    /* Ecosystem Diagram Frame */
    .diagram-container {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 12px;
      margin-bottom: 20px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    }

    .diagram-img {
      width: 100%;
      height: auto;
      border-radius: 10px;
      display: block;
    }

    .diagram-caption {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 8px;
      font-weight: 500;
    }

    /* Grid of Tools */
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }

    .tool-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .tool-icon {
      font-size: 16px;
    }

    .tool-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }

    .tool-tag {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
      background: #e2e8f0;
      color: #475569;
    }

    .tool-desc {
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
    }

    /* Companies Banner */
    .companies-bar {
      background: #0f172a;
      color: #ffffff;
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .company-pill {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      padding: 3px 10px;
      border-radius: 6px;
    }

    .footer {
      position: absolute;
      bottom: 16px;
      left: 44px;
      right: 44px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER & INFOGRAPHIC DIAGRAM -->
  <div class="page">
    <div class="header-banner">
      <div class="brand-container">
        <img src="data:image/jpeg;base64,${logoBase64}" class="logo-img" alt="Perry Logo" />
        <div class="title-group">
          <h1>PERRY INTELLIGENCE ECOSYSTEM</h1>
          <p>Documento de Arquitectura e Interconexión de Herramientas v2.0</p>
        </div>
      </div>
      <div class="badge-v2">OFICIAL C-SUITE</div>
    </div>

    <div class="companies-bar">
      <span style="font-size: 10px; font-weight: 700; color: #94a3b8;">Consorcio Corporativo:</span>
      <span class="company-pill">🏢 GRUPO CASEME</span>
      <span class="company-pill">🏢 DROBOTS</span>
      <span class="company-pill">🏢 OPUS INGENIUM</span>
      <span class="company-pill">🏢 VULCAN FORGE</span>
    </div>

    <div class="section-title">
      <span class="icon">🗺️</span>
      <span>DIAGRAMA INTEGRAL DE ARQUITECTURA E INTERCONEXIÓN</span>
    </div>

    <div class="diagram-container">
      <img src="data:image/jpeg;base64,${imgBase64}" class="diagram-img" alt="Diagrama de Arquitectura Perry App" />
      <div class="diagram-caption">Interconexión en tiempo real entre Antigravity, Gemini 2.5 Vision, Telcel 5G, UltraMsg, Next.js, Supabase, Cron Workers y CFO Control.</div>
    </div>

    <div class="footer">
      <span>Perry App © 2026 — Grupo Caseme / Consorcio Corporativo</span>
      <span>Página 1 de 2</span>
    </div>
  </div>

  <!-- PAGE 2: TOOL DETAILS & FLUX -->
  <div class="page">
    <div class="section-title" style="margin-top: 10px;">
      <span class="icon">⚙️</span>
      <span>DESGLOSE DE HERRAMIENTAS Y FUNCIONALIDADES CLAVE</span>
    </div>

    <div class="tools-grid">

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">🤖</span>
          <span class="tool-name">Google Antigravity</span>
          <span class="tool-tag" style="background:#dbeafe; color:#1e40af;">IA Dev Agent</span>
        </div>
        <p class="tool-desc">Pareja de programación autónoma. Diseña la arquitectura full-stack, implementa lógica de negocio, modela bases de datos en Prisma y automatiza despliegues en GitHub y Netlify.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">🧠</span>
          <span class="tool-name">Gemini 2.5 Vision AI</span>
          <span class="tool-tag" style="background:#ccfbf1; color:#115e59;">Auditoría IA</span>
        </div>
        <p class="tool-desc">Motor multimodal de visión por computadora. Audita capturas bancarias de saldos y hojas de nómina (Excel/PDF) diferenciando la dispersión por banco (CONTPAQ) y desembolso en Efectivo.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">📶</span>
          <span class="tool-name">Telcel (Red Móvil 5G)</span>
          <span class="tool-tag" style="background:#fee2e2; color:#991b1b;">Conectividad</span>
        </div>
        <p class="tool-desc">Tarjeta SIM y red de datos celulares dedicada que mantiene en línea la línea telefónica corporativa de Perry 24/7, garantizando recepción continua de webhooks y notificaciones por WhatsApp.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">💬</span>
          <span class="tool-name">WhatsApp & UltraMsg</span>
          <span class="tool-tag" style="background:#dcfce7; color:#166534;">Messaging API</span>
        </div>
        <p class="tool-desc">Pasarela de mensajería en tiempo real conectada a los grupos de las 4 empresas. Recibe evidencias en campo y envía enlaces de firma tokenizada a la Dirección General.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">⏰</span>
          <span class="tool-name">Cron Jobs & Workers</span>
          <span class="tool-tag" style="background:#fef3c7; color:#92400e;">Automatización</span>
        </div>
        <p class="tool-desc">Orquestador de tareas automatizadas en segundo plano. Dispara resúmenes ejecutivos diarios por WhatsApp y monitorea alertas críticas de ordenes abiertas no atendidas.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">⚡</span>
          <span class="tool-name">Next.js 14 & Netlify</span>
          <span class="tool-tag" style="background:#f3e8ff; color:#6b21a8;">Full-Stack Cloud</span>
        </div>
        <p class="tool-desc">Core full-stack web y hosting en la nube con despliegue continuo (CI/CD). Renderiza la Bóveda de Tesorería, Tableros de Operaciones e Interfaces Directivas.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">🗄️</span>
          <span class="tool-name">Supabase & Prisma ORM</span>
          <span class="tool-tag" style="background:#e0e7ff; color:#3730a3;">Base de Datos</span>
        </div>
        <p class="tool-desc">Bóveda relacional PostgreSQL con RLS y modelado de datos Prisma. Almacena bitácoras de estados financieros, nominas semanales y llaves API de integración.</p>
      </div>

      <div class="tool-card">
        <div class="tool-header">
          <span class="tool-icon">🔒</span>
          <span class="tool-name">NextAuth.js & Token Hash</span>
          <span class="tool-tag" style="background:#ffe4e6; color:#9f1239;">Seguridad C-Suite</span>
        </div>
        <p class="tool-desc">Gestor de identidades y firmas digitales tokenizadas. Exige autenticación de sesión de la Dirección General (Ivan López, Carlos Sevilla, Enrique López) para firmar nóminas.</p>
      </div>

      <div class="tool-card" style="grid-column: span 2;">
        <div class="tool-header">
          <span class="tool-icon">🔗</span>
          <span class="tool-name">API Externa v1 (CFO CONTROL)</span>
          <span class="tool-tag" style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">Sync Multisoftware</span>
        </div>
        <p class="tool-desc">API REST v1 protegida por API Keys (perry_sec_...) para transmitir saldos consolidados, liquidez patrimonial y movimientos financieros en tiempo real hacia aplicaciones hermanas como CFO CONTROL.</p>
      </div>

    </div>

    <div class="section-title">
      <span class="icon">🔒</span>
      <span>GOBIERNO Y SEGURIDAD PATRIMONIAL</span>
    </div>

    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; font-size: 10px; color: #334155; line-height: 1.45;">
      El ecosistema <strong>Perry App</strong> está diseñado con un modelo de seguridad multiestrato: las vistas de Tesorería y gestión de API Keys están restringidas estrictamente a la Dirección General mediante verificación de email y NextAuth. Ningún usuario externo puede visualizar la liquidez consolidada o nóminas de otras empresas.
    </div>

    <div class="footer">
      <span>Perry App © 2026 — Grupo Caseme / Consorcio Corporativo</span>
      <span>Página 2 de 2</span>
    </div>
  </div>

</body>
</html>`;

  const pdfPath = path.join(docsDir, 'Ecosistema_y_Arquitectura_Perry_App.pdf');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();
  console.log('PDF generado exitosamente en:', pdfPath);
}

createPdf().catch(console.error);
