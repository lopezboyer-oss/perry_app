# METODOLOGÍA DE VALIDACIÓN PRÁCTICA Y EFECTIVA DE KPIs — GRUPO CASEME
## Protocolo de Evidencia Digital, Gobernanza e Integración en Perry App
### Documento de Trabajo v1.0 | Agosto 2026

---

## 1. INTRODUCCIÓN Y PRINCIPIOS DE GOBERNANZA DIGITAL

Para garantizar que el **Modelo de Remuneración por Valor y KPIs de Grupo Caseme** sea transparente, objetivo y libre de fricciones o disputas, es indispensable establecer una **Metodología de Validación Práctica y Efectiva**.

Ningún KPI se dará por cumplido mediante reportes verbales o hojas de cálculo manuales no verificables. **Toda medición debe generar una evidencia digital inalterable dentro de la plataforma Perry App**, la cual actuará como la única fuente de verdad (*Single Source of Truth*) para la Junta Directiva y el Consejo de Administración.

### Los 5 Pilares de Validación en Perry App:
1. **Evidencia Digital Obligatoria**: Cada KPI se respalda con un registro en sistema, geolocalización, documento adjunto o log de actividad.
2. **Cero Hojas de Cálculo Aisladas**: Todo flujo de aprobación, auditoría o seguimiento se realiza directamente dentro de la interfaz de Perry.
3. **Trazabilidad Inalterable (Audit Trail)**: Sistema automático de fecha, hora (`timestamp`) e identidad del usuario que ejecuta o aprueba cada acción.
4. **Flujos de Trabajo Ágiles (Sin Burocracia)**: La validación ocurre de forma natural como parte del trabajo diario (un clic de aprobación, un check-in de campo, una foto).
5. **Visibilidad en Tiempo Real para el Consejo**: Panel de control con semáforos automáticos de cumplimiento para **IVAN JOSE LOPEZ BOYER** y **CARLOS SEVILLA MERCADO**.

---

## 2. METODOLOGÍA DE VALIDACIÓN — PUESTO EJECUTIVO 1
### TITULAR: IVAN JOSE LOPEZ BOYER
**Puesto**: Director de Tecnología, Inteligencia de Negocio y Gobierno Legal  
**Perfiles**: P3 (Analista) + P5 (CTO) + P7 (Gobierno Legal y Control de Activos) + 50% P2 (Co-Dirección Comercial)

---

### Módulo A: Tecnología, Innovación y Plataforma Digital (Perfil 5)

#### 1. KPI: Funcionalidades nuevas implementadas en Perry App (Meta: ≥ 2 / mes)
* **Problema a Evitar**: Desarrollar funciones que no agreguen valor real o hacer cambios sin consenso.
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"Propuestas, Votación y Aprobación de Sistemas"*.
  * **Mecanismo Práctico**:
    1. Antes de desarrollar, el CTO registra la propuesta en Perry especificando: Justificación operativa, impacto esperado y esfuerzo estimado.
    2. Se habilita un espacio de votación digital para el Consejo Directivo.
    3. Una vez aprobada por el Consejo en Perry, entra a desarrollo.
    4. Al liberar la función en producción, Perry registra automáticamente la versión (`release tag`) y el acta digital de entrega.
  * **Evidencia Auditada**: Log de aprobación del Consejo + Registro de versión desplegada en el historial del sistema.

#### 2. KPI: Uptime de la plataforma Perry App (Meta: ≥ 99.5% mensual)
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Integración de servicio de *Monitor Automatizado de Infraestructura (Pinger / Healthcheck)*.
  * **Mecanismo Práctico**: El sistema ejecuta consultas automáticas cada 60 segundos. Perry genera al cierre del mes un reporte automático de disponibilidad (horas en línea vs horas en mantenimiento/caída).
  * **Evidencia Auditada**: Reporte automático de Uptime emitido sin intervención humana.

#### 3. KPI: Tasa de adopción de herramientas por el equipo (Meta: ≥ 80%)
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo de *Telemetría y Analítica de Usuarios*.
  * **Mecanismo Práctico**: Perry contabiliza de forma automática los inicios de sesión y las interacciones diarias de los ~70 colaboradores por departamento, comparándolos contra la plantilla activa.
  * **Evidencia Auditada**: Dashboard de adopción con porcentaje mensual de usuarios activos por área.

#### 4. KPI: Roadmap tecnológico documentado y vigente (Meta: 1 activo semestral)
* **Metodología de Validación en Perry App**: Carga del documento de arquitectura y planificación en la biblioteca ejecutiva de Perry con firma digital de enterado del Consejo.

#### 5. KPI: Procesos automatizados nuevos (Meta: ≥ 1 por trimestre)
* **Metodología de Validación en Perry App**: Acta de liberación firmada en Perry por el líder del área beneficiada confirmando el ahorro de tiempo/errores.

---

### Módulo B: Inteligencia Operativa y Analítica de Negocio (Perfil 3)

#### 6. KPI: Alertas tempranas detectadas y comunicadas (Meta: Registro completo)
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"Centro de Alertas de Inteligencia Operativa"*.
  * **Mecanismo Práctico**: Al detectar anomalías (caída de productividad, sobrecarga de horas extra, retrasos en cotizaciones), el Analista emite una Alerta Oportuna desde Perry, la cual envía notificación push/email automática a los Directores con acuse de lectura automático.
  * **Evidencia Auditada**: Bitácora de Alertas Emitidas con timestamp de envío y confirmación de lectura.

#### 7. KPI: Reportes de análisis para dirección (Meta: ≥ 2 por mes)
* **Metodología de Validación en Perry App**: Carga del informe ejecutivo de Data Intelligence en Perry con sección de comentarios e insights accionables.

#### 8. KPI: Patrones recurrentes documentados con plan de acción (Meta: ≥ 1 por mes)
* **Metodología de Validación en Perry App**: Registro en el *Módulo de Mejora Continua* relacionando causas raíz identificadas con su plan de acción asignado a un responsable.

---

### Módulo C: Gobierno Legal, Fiduciario y Control de Activos (Perfil 7)

#### 9. KPI 🚗: Regularización y pólizas de seguro de flota vehicular y maquinaria (Meta: 100% al día)
* **Problema a Evitar**: Vehículos circulando sin seguro, tenencias vencidas, maquinaria sin contratos de leasing regularizados o multas por falta de verificación.
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"Control Patrimonial de Activos (Flota y Maquinaria)"*.
  * **Mecanismo Práctico**:
    1. Se crea un expediente digital por cada vehículo, maquinaria y equipo pesado (VIN/Serie, placas, tarjeta de circulación, póliza de seguro, contrato leasing).
    2. El sistema programa un **Semáforo Automático de Vencimientos** (30, 15 y 5 días previos al vencimiento de seguros, tenencias, verificaciones y licencias).
    3. El Director adjunta en Perry la póliza vigente renovada y el comprobante de pago de tenencia/verificación.
  * **Evidencia Auditada**: Dashboard con 100% de la flota vehicular y maquinaria en estatus **VERDE (Al día)** y expedientes digitales con documentos cargados.

#### 10. KPI: Cumplimiento de obligaciones regulatorias (REPSE, SAT, IMSS) (Meta: 100% sin multas)
* **Metodología de Validación en Perry App**: Módulo de *Semáforo Regulatorio* donde se cargan mensualmente las opiniones de cumplimiento 32-D (SAT), constancia IMSS y registro REPSE activo.

#### 11. KPI: Atención de requerimientos legales/fiscales (Meta: ≤ 5 días hábiles)
* **Metodología de Validación en Perry App**: Sistema de *Tickets Legal/Fiscal* que marca el tiempo exacto entre la notificación del requerimiento y la fecha de contestación ante autoridad.

#### 12. KPI: Contratos firmados y revisados legalmente (Meta: Registro completo)
* **Metodología de Validación en Perry App**: Bóveda Digital de Contratos en Perry con el check digital de validación de cláusulas y archivo PDF firmado por las partes.

#### 13. KPI: Atender procesos de despido sin demanda procedente (Meta: ≥ 90%)
* **Metodología de Validación en Perry App**: Expediente de Rescisión en Perry adjuntando el Convenio de Finiquito ratificado ante el Centro de Conciliación Laboral.

---

### Módulo D: Co-Dirección Comercial y Estratégica (Perfil 2 - 50%)

#### 14. KPI: Reuniones de alto nivel con gerencia del cliente (Meta: ≥ 2 por mes)
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"CRM / Relaciones Estratégicas"*.
  * **Mecanismo Práctico**: Registro de la Minuta Ejecutiva en Perry inmediatamente después de la junta/comida de negocios con el cliente (asistentes, temas tratados, compromisos) adjuntando comprobante/foto o correo de seguimiento.
  * **Evidencia Auditada**: Bitácora de minutas registradas en el CRM de Perry.

#### 15. KPI: Contratos/pólizas renovadas sin pérdida (Meta: 100%)
* **Metodología de Validación en Perry App**: Módulo de Contratos Activos con tasa de renovación calculada automáticamente por el sistema.

---

## 3. METODOLOGÍA DE VALIDACIÓN — PUESTO EJECUTIVO 2
### TITULAR: CARLOS SEVILLA MERCADO
**Puesto**: Director de Operaciones, Rentabilidad y Administración de Operaciones  
**Perfiles**: P1 (Auditor) + P4 (Controller) + P6 (Director Admin) + 50% P2 (Co-Dirección Comercial)

---

### Módulo A: Auditoría de Campo y Seguimiento Operativo (Perfil 1)

#### 16. KPI: Visitas de auditoría/campo realizadas (Meta: ≥ 12 por mes)
* **Problema a Evitar**: Afirmar que se visitaron proyectos u oficinas de campo sin comprobación real o auditable.
* **Metodología de Validación en Perry App**:
  * **Función en Perry App**: Módulo Móvil *"Check-in de Visita de Auditoría de Campo"*.
  * **Mecanismo Práctico**:
    1. Al llegar a la obra, proyecto u oficina de campo, el Director abre Perry App desde su teléfono móvil y presiona el botón **"Iniciar Auditoría de Campo"**.
    2. La app captura automáticamente la **Geolocalización GPS (coordenadas exactas)**, fecha y hora inalterable.
    3. Toma un mínimo de 3 fotografías de evidencia técnica a través de la misma app (desactivando la carga de fotos antiguas de galería).
    4. Solicita la firma digital en pantalla del responsable o residente del proyecto.
  * **Evidencia Auditada**: Registro geolocalizado en mapa con fotos con marca de agua y firma digital del residente.

#### 17. KPI: Informes de auditoría emitidos (Meta: ≥ 4 por mes)
* **Metodología de Validación en Perry App**: Formulario de Auditoría Estructurado dentro de Perry App que genera automáticamente el informe PDF al finalizar el recorrido de campo.

#### 18. KPI: Puntos críticos revisados diariamente en Perry (Meta: 100% días hábiles)
* **Metodología de Validación en Perry App**: Log de Auditoría de Perry App que verifica automáticamente el acceso del Director al panel de puntos críticos y el registro de comentarios/seguimiento diario.

#### 19. KPI: Puntos críticos sin atención > 48 horas (Meta: 0)
* **Metodología de Validación en Perry App**: Monitor de Alertas en Perry que contabiliza de forma automática los puntos críticos que no han recibido actualización sustantiva en 48h.

#### 20. KPI: Reporte semanal de seguimiento crítico emitido (Meta: 100% de semanas)
* **Metodología de Validación en Perry App**: Envío del resumen semanal de puntos críticos a través del módulo corporativo de Perry con acuse automático.

---

### Módulo B: Control de Costos de Proyecto y Rentabilidad (Perfil 4)

#### 21. KPI: Cotizaciones revisadas vs emitidas (Meta: 100%)
* **Problema a Evitar**: Enviar cotizaciones al cliente con errores de cálculo, alcance incompleto o márgenes negativos.
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"Flujo de Aprobación de Cotizaciones"*.
  * **Mecanismo Práctico**:
    1. Ningún vendedor u operativo puede descargar ni enviar una cotización formal sin el **Sello Digital de Aprobación del Controller**.
    2. El Director revisa el desglose de costos, precios unitarios y margen de utilidad en Perry y otorga el clic de aprobación digital.
  * **Evidencia Auditada**: 100% de las cotizaciones enviadas cuentan con el token de validación del Controller grabado en la base de datos de Perry.

#### 22. KPI: Proyectos con desviación de costo detectada oportunamente (Meta: ≥ 90%)
* **Metodología de Validación en Perry App**: Sistema de Alerta Temprana en Perry que compara en tiempo real las compras y horas hombre gastadas vs el presupuesto original del proyecto.

#### 23. KPI: Antigüedad promedio de cuentas por cobrar (Meta: Reducción progresiva)
* **Metodología de Validación en Perry App**: Módulo de Cobranza en Perry alimentado con las facturas emitidas y los complementos de pago aplicados.

---

### Módulo C: Control Administrativo y Egresos (Perfil 6)

#### 24. KPI: Nóminas revisadas antes de su dispersión (Meta: 100% de nóminas)
* **Problema a Evitar**: Pagar nóminas con errores, incidencias no autorizadas o duplicidades.
* **Metodología de Validación en Perry App**:
  * **Función en Perry**: Módulo *"Pre-Nómina y Autorización de Dispersión"*.
  * **Mecanismo Práctico**:
    1. El departamento de RH/Contabilidad carga la pre-nómina semanal en Perry.
    2. El Director efectúa la revisión de totales, bonos e incidencias y aplica la **Firma Digital de Autorización de Nómina** en Perry.
    3. El archivo de dispersión bancaria solo se libera si cuenta con la firma de aprobación digital.
  * **Evidencia Auditada**: Registro de autorización de nómina firmado previamente a la fecha de pago bancario.

#### 25. KPI: Horas extra auditadas vs reportadas (Meta: 100%)
* **Metodología de Validación en Perry App**: Módulo de Auditoría de Horas Extra en Perry que cruza los registros de entrada/salida de la app con la justificación del supervisor de obra antes de incluir el pago en nómina.

#### 26. KPI: Órdenes de Compra (OC) revisadas antes de emisión (Meta: 100%)
* **Metodología de Validación en Perry App**: Sistema de Autorización de Compras en Perry. Ninguna OC se genera ni envía al proveedor sin la aprobación previa en la app.

---

### Módulo D: Co-Dirección Comercial y Estratégica (Perfil 2 - 50%)

#### 27. KPI: Reuniones de alto nivel con gerencia del cliente (Meta: ≥ 2 por mes)
* **Metodología de Validación en Perry App**: Carga de minuta de reunión ejecutiva en el CRM de Perry App con acuerdos y compromisos comerciales.

#### 28. KPI: Conflictos con cliente atendidos oportunamente (Meta: ≤ 48 horas)
* **Metodología de Validación en Perry App**: Módulo de Atención a Quejas en Perry registrando hora de recepción del reclamo y hora de la solución técnica/comercial brindada.

---

## 4. TABLA MATRIZ DE REQUERIMIENTOS TÉCNICOS EN PERRY APP

| Módulo a Habilitar en Perry App | Puesto Ejecutivo | KPIs que Valida | Tipo de Evidencia Generada |
|---|---|---|---|
| **Check-in GPS y Auditoría Móvil** | Director de Operaciones (CARLOS SEVILLA) | Visitas de campo (P1) | Coordenadas GPS, Fotos con marca de agua, Firma digital |
| **Aprobación y Votación de Software** | Director de Tecnología (IVAN LOPEZ) | Funcionalidades nuevas (P5) | Log de votación de Consejo, Release tags |
| **Control Patrimonial Flota / Maquinaria** | Director de Tecnología (IVAN LOPEZ) | Pólizas y tenencias al día (P7) | Expedientes digitales, Semáforo de vencimientos |
| **Sello Digital de Cotizaciones** | Director de Operaciones (CARLOS SEVILLA) | Revisión de cotizaciones (P4) | Token de validación previa en base de datos |
| **Autorización Digital de Nómina y OC** | Director de Operaciones (CARLOS SEVILLA) | Nóminas y OC revisadas (P6) | Firma digital previa a dispersión/emisión |
| **Centro de Alertas de Inteligencia** | Director de Tecnología (IVAN LOPEZ) | Alertas tempranas y KPIs (P3) | Log con timestamp y confirmación de lectura |
| **CRM / Minutas de Clientes** | Ambos Puestos (IVAN LOPEZ / CARLOS SEVILLA) | Reuniones alto nivel (P2) | Minutas registradas, fotos/correos de acuse |

---

## 5. CONCLUSIÓN Y PRÓXIMOS PASOS

La implementación de esta **Metodología de Validación en Perry App** transforma el modelo de remuneración en un proceso **100% auditable, automatizado y transparente**.

### Hoja de Ruta de Implementación:
1. **Aprobación de la Metodología**: Firma del protocolo de validación por parte del Consejo Directivo.
2. **Desarrollo en Perry App**: Habilitar en la plataforma los 7 módulos técnicos descritos en la Matriz.
3. **Inicio de Auditoría Digital**: Comenzar la medición formal con captura de evidencias a partir del siguiente periodo operativo.

---
*CONFIDENCIAL — Documento de trabajo para Junta Directiva · Grupo Caseme · Perry Intelligence v1.0*
