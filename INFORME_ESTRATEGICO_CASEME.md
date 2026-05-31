# INFORME DE AUDITORÍA ESTRATÉGICA Y OPERATIVA — GRUPO CASEME
**De**: Equipo de Consultoría de Operaciones y Estrategia Senior  
**Para**: Dirección General / Alta Dirección de GRUPO CASEME  
**Fecha**: 30 de Mayo, 2026  
**Objetivo**: Diagnóstico de Rentabilidad Operativa, Capacidad de Personal (Post-Bajas) y Plan de Validación de Supervisión.

---

## 1. DIAGNÓSTICO: OPERACIÓN VS. FINANZAS (GASTOS Y COBRANZA)

Realizamos un cruce de datos masivo de los últimos 3 meses (90 días) cruzando los **Ingresos (Cobranza)** y **Gastos Directos de Materiales** (de Odoo, excluyendo nómina) con el **Esfuerzo Operativo** (de Perry: cantidad de actividades, días trabajados, asignación de ingenieros, técnicos, vehículos y equipos de elevación). 

Para subsanar la ausencia de datos de nómina de Contpaq, aplicamos un **Modelo de Costo de Recursos Teórico** basado en las asignaciones de campo registrados en Perry:
* **Día de Ingeniero en Sitio**: $2,000 MXN  
* **Día de Técnico Asignado**: $1,200 MXN  
* **Uso de Vehículo por Día**: $500 MXN  
* **Uso/Renta de Equipo de Elevación por Día**: $2,500 MXN  

### A. Proyectos de Alta Rentabilidad (Ingeniería y Servicios Puros)
Los proyectos con mejor relación costo-beneficio muestran márgenes directos superiores al 80%. Son servicios puros de ingeniería, supervisión o mano de obra especializada con nulo o mínimo gasto en materiales.

| Folio | Cliente | Ingreso (Odoo) | Gasto Materiales (Odoo) | Costo Rec. Est. (Perry) | Margen Directo Neto (Est.) | Margen % | Esfuerzo (Actividades) | Ingenieros Asignados |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **S05882** | TMMBC | $909,872.43 | $0.00 | $73,400.00 | **$836,472.43** | **91.9%** | 16 | Renzo Beristain |
| **S06254** | TMMBC | $608,335.04 | $1,115.73 | $44,400.00 | **$562,819.31** | **92.5%** | 6 | Daniel Diosdado |
| **S06363** | TMMBC | $608,335.04 | $0.00 | $65,700.00 | **$542,635.04** | **89.2%** | 18 | Daniel Diosdado |
| **S06189** | TMMBC | $608,335.04 | $0.00 | $0.00 | **$608,335.04** | **100.0%** | 0 (Admin/Garantía) | N/A |
| **S06249** | TMMBC | $175,145.36 | $18,576.00 | $10,000.00 | **$146,569.36** | **83.7%** | 6 | Daniel Diosdado |

> [!TIP]
> Estos 5 proyectos concentran la mayor rentabilidad del periodo. El uso de recursos (ingenieros y técnicos) estuvo perfectamente optimizado en relación al precio de venta del servicio.

---

### B. Proyectos Críticos o de Pérdida Operativa
Detectamos proyectos con desviaciones graves, divididos en dos categorías: **Desfases de Facturación/Garantías** (esfuerzo sin ingresos en Odoo) y **Proyectos de Bajo Margen** (alto esfuerzo, bajo precio).

| Folio | Cliente | Ingreso (Odoo) | Gasto Materiales (Odoo) | Costo Rec. Est. (Perry) | Margen Directo Neto (Est.) | Esfuerzo (Actividades) | Días Trabajados | Ingenieros Asignados |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **S05966** | N/A (TMMBC) | $0.00 | $0.00 | $30,000.00 | **-$30,000.00** | 23 | 15 | Daniel Diosdado |
| **S05881** | N/A (TMMBC) | $0.00 | $0.00 | $30,000.00 | **-$30,000.00** | 9 | 9 | Medardo B. / Jesus H. / Carlos L. |
| **S06305** | N/A (TMMBC) | $0.00 | $0.00 | $18,000.00 | **-$18,000.00** | 14 | 9 | Daniel D. / Jesus H. / Antonio V. |
| **S06343** | TMMBC | $23,986.66 | $0.00 | $18,900.00 | **$5,086.66** | 9 | 8 | Marcos Montiel / Medardo B. |
| **S06223** | TMMBC | $155,860.85 | $43,220.05 | $34,000.00 | **$78,640.80** | 22 | 17 | Medardo B. / Antonio V. |

#### Desviaciones Clave:
1. **Falta de Facturación o Retrabajos (S05966, S05881, S06305)**: Estos folios muestran **cero ingresos** en Odoo pero tienen un alto número de actividades y días trabajados en Perry (23, 9 y 14 actividades respectivamente). Si son retrabajos por garantías, representan un costo hundido directo para la empresa. Si el proyecto se completó con éxito, indica una grave falla en el proceso administrativo de facturación.
2. **Margen Crítico en S06343**: Este proyecto de TMMBC facturó únicamente $23,986.66, pero requirió 9 actividades y 8 días de trabajo de campo de Marcos Montiel y Medardo Bohorquez. Su margen directo teórico es de apenas **21.2% ($5,086.66)**. Si descontamos el costo administrativo proporcional y la nómina de Contpaq, este proyecto opera con pérdidas netas.

---

### C. Ineficiencias en el Uso de Recursos Críticos (Vehículos y Equipos de Elevación)
Analizamos los folios con uso intensivo de recursos de logística y elevación:
* **S06319**: Para realizar únicamente **4 actividades**, se asignaron **3 vehículos y 3 equipos de elevación**, generando un costo de recursos estimado de **$27,800.00 MXN** contra una facturación de $85,040.82 MXN. Esto representa un ratio de utilización ineficiente de los equipos de elevación rentados/propios en campo (subutilización por jornada).
* **S02176**: Registró 2 actividades con 2 vehículos y 2 equipos de elevación asignados sin ninguna facturación asociada en Odoo, generando una pérdida directa estimada de **-$14,800.00 MXN**.

---

## 2. ANÁLISIS DE CAPACIDAD Y PERFIL DE RECLUTAMIENTO (POST-BAJAS)

### A. Impacto Operativo de las Bajas
Analizamos la evolución del volumen de actividades de CASEME semana a semana, considerando las bajas de **Antonio Villanueva** (Semana 20) y **Jesús Hernández** (Semana 21):

* **Semana 21 (Baja de Antonio Villanueva)**: Para cubrir la salida de Antonio sin reducir la operación, el equipo se vio sobrecargado.
  - **Daniel Diosdado** escaló de 8 a **29 actividades**.
  - **Carlos López** escaló de 4 a **19 actividades**.
  - **Jesús Hernández** trabajó a su máxima capacidad en su última semana, registrando **32 actividades**.
  - **Medardo Bohorquez** (Supervisor) tuvo que asumir carga operativa directa subiendo a **18 actividades**.
* **Semana 22 (Bajas de Antonio y Jesús consolidada)**: La capacidad operativa del equipo colapsó. El número de actividades semanales de CASEME cayó de **132 actividades** (Semana 21) a **48 actividades** (Semana 22), una **reducción del 63.6%**. El equipo restante simplemente no pudo absorber la demanda de TMMBC.

### B. Determinación de Contratación
**Conclusión: Es estrictamente necesaria la contratación inmediata de por lo menos un Ingeniero (de preferencia dos para restaurar la capacidad original de 5 ingenieros).**
El equipo actual de 3 ingenieros activos (Marcos Montiel, Daniel Diosdado, Carlos López) se encuentra en nivel de saturación crítica. No pueden cubrir el promedio histórico de 120 actividades semanales sin poner en riesgo:
1. La calidad técnica de las ejecuciones en la planta automotriz (lo que incrementaría los costosos retrabajos).
2. Los tiempos de respuesta para generar cotizaciones (lo que detendría el flujo de nuevos ingresos).
3. La retención del personal actual debido a la fatiga y el burnout.

### C. Perfil de Reclutamiento Propuesto

Basándonos en que el **32.7%** de las tareas son de **`EJECUCION`** y el **26.5%** son de **`COTIZACION`**, el perfil del candidato debe ser:

#### 1. Perfil Técnico (Hard Skills)
* **Educación**: Ingeniería Mecánica, Eléctrica, Mecatrónica o afín.
* **Experiencia en Tier 1**: Mínimo 2-3 años trabajando como contratista dentro de plantas automotrices bajo altos estándares (idealmente TMMBC / Toyota).
* **Cotización y Estimación**: Habilidad probada para realizar levantamiento de alcances en campo (`VISITA_CAMPO`) y estructurar cotizaciones detalladas de materiales y horas hombre.
* **Seguridad Industrial**: Certificaciones o conocimientos en candadeo LOTO, trabajos en alturas (plataformas de elevación), espacios confinados y llenado de permisos de seguridad de alto riesgo (TERA).

#### 2. Habilidades Blandas (Soft Skills)
* **Orientación al Cliente**: Capacidad para comunicarse de forma ejecutiva con los contactos técnicos y de compras de TMMBC (ej: Alexis Campos, Andrea Isela González, Carlos Joaquín Montes).
* **Gestión del Estrés en Planta**: Habilidad para solucionar imprevistos en sitio de forma rápida cuando la línea de producción o la operación del cliente se ven afectadas.
* **Autonomía**: Capacidad de reportar sus actividades de manera limpia y oportuna en Perry App y coordinarse eficazmente con la supervisión de campo.

---

## 3. PERFIL DE LIDERAZGO Y VALIDACIÓN DEL SUPERVISOR (MEDARDO BOHORQUEZ)

Para que Medardo Bohorquez controle eficientemente la operación de CASEME, debe transicionar de un rol operativo (en la semana 21 tuvo 18 actividades operativas) a un rol puramente directivo y de control de calidad.

### A. Habilidades Críticas Requeridas
1. **Planificación y Distribución del Trabajo**: Balancear la asignación de actividades entre los ingenieros para evitar sobrecargas (evitar picos de 34 actividades en un ingeniero mientras otros tienen cargas menores).
2. **Control de Presupuesto Logístico**: Monitorear diariamente que el uso de vehículos y equipos de elevación rentados esté justificado con actividades programadas.
3. **Auditoría de Seguridad y Calidad**: Validar que todos los trabajos de alto riesgo cuenten con candadeo LOTO y su folio TERA aprobado en Perry antes de iniciar.

### B. Método Práctico de Validación (KPIs en Perry App)
Medardo será evaluado mensualmente mediante el cumplimiento de los siguientes indicadores extraídos directamente de Perry:

```markdown
1. Tasa de Registro de Asistencia (Target: >95%)
   - Fórmula: (Días con check-in/out registrados / Días de asignación en plan) * 100
   - Objetivo: Asegurar que todo el personal a su cargo registra su horario con foto y GPS en Perry.

2. Cumplimiento de Cierre de Actividades (Target: >90% en <24 horas)
   - Fórmula: (Actividades cerradas como COMPLETADA en menos de 24h / Total actividades asignadas) * 100
   - Objetivo: Mantener la bitácora de Perry al día para agilizar la pre-facturación y evitar retrasos en Odoo.

3. Cobertura TERA en Trabajos de Alto Riesgo (Target: 100%)
   - Fórmula: (Actividades con folio TERA registrado / Total actividades con riesgo alto) * 100
   - Objetivo: Cero tolerancia a incidentes de seguridad y cumplimiento de normativas de TMMBC.

4. Eficiencia de Utilización de Equipos de Elevación (Target: Mínimo 2 actividades/día por equipo)
   - Fórmula: Total actividades ejecutadas con equipo / Total de días de renta pagados de equipos de elevación
   - Objetivo: Reducir costos de renta ociosa de elevadores.
```

---

## 4. RECOMENDACIONES DE ALTA DIRECCIÓN (INSIGHTS CONSULTIVOS)

1. **Auditoría Inmediata a Proyectos con Ingreso Cero (Materiales sin Cobro)**:
   - Se debe comisionar a Medardo y al área administrativa revisar con urgencia los folios **S05966**, **S05881** y **S06305**. Si estas actividades representan re-trabajos o fallas de calidad, se deben registrar como "Costo por No Calidad" en lugar de cargarse al folio comercial regular. Si son proyectos viables, deben facturarse en Odoo de inmediato.
2. **Establecer un Proceso de Conciliación Operación-Nómina**:
   - Dado que los gastos de nómina están fuera de Odoo (en Contpaq), sugerimos implementar en la app Perry un costo por hora teórica configurado por rol de usuario. Esto permitirá que la app genere un reporte de costo de mano de obra estimado por proyecto de forma automática para compararlo con Odoo semanalmente.
3. **Política de Liberación Inmediata de Elevadores y Vehículos**:
   - Implementar la regla de que cualquier equipo de elevación rentado que no tenga actividades programadas en Perry para las próximas 48 horas debe ser devuelto al proveedor. La renta ociosa de estos equipos representa un costo de fuga silencioso pero muy alto para GRUPO CASEME.
4. **Estandarización y Escalamiento a las otras 4 empresas**:
   - El uso de Perry App para capturar la geolocalización, asistencia y uso de vehículos ha demostrado ser vital para estimar la carga de trabajo real. Recomendamos replicar este modelo de control de recursos en las otras 4 empresas del grupo para estandarizar los costos operativos indirectos a nivel corporativo.
