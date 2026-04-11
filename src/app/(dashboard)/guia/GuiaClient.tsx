'use client';

import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, MessageCircle, ClipboardPlus,
  FileText, CheckCircle2, Lightbulb, ArrowRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuiaClientProps {
  userName: string;
}

/* ─── Step Data ────────────────────────────────────────── */
const steps = [
  {
    id: 'bienvenida',
    title: '¡Hola! Soy Perry 🦆',
    perryMood: 'happy',
    content: (
      <>
        <p className="text-lg mb-4">
          ¡Bienvenido a <strong>PERRY APP</strong>! Soy Perry, tu ornitorrinco asistente, y estoy aquí para ayudarte a registrar tus actividades de forma rápida y sencilla.
        </p>
        <p className="text-slate-600 mb-4">
          En esta guía aprenderás las <strong>2 formas</strong> principales de cargar tu información:
        </p>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <ClipboardPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900">Método 1: Actividad Individual</p>
              <p className="text-sm text-indigo-700">Llenas un formulario por cada actividad realizada</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-purple-900">Método 2: Importar Reporte</p>
              <p className="text-sm text-purple-700">Pegas el texto de tu reporte de WhatsApp y Perry lo clasifica automáticamente</p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'actividad-individual',
    title: 'Método 1: Nueva Actividad',
    perryMood: 'teaching',
    content: (
      <>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Usa este método cuando quieras registrar <strong>una actividad específica</strong> con todos los detalles.
          </p>
        </div>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">1</span>
          Ve a "Nueva Actividad" en el menú lateral
        </h4>
        <p className="text-slate-600 mb-5 ml-8">
          Haz clic en <strong>"Nueva Actividad"</strong> en la barra lateral de navegación. Se abrirá el formulario de captura.
        </p>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
          Llena los campos obligatorios
        </h4>
        <div className="ml-8 mb-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Campo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Qué escribir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-4 py-2.5 font-medium">📅 Fecha</td><td className="px-4 py-2.5 text-slate-600">Día en que realizaste la actividad</td></tr>
                <tr><td className="px-4 py-2.5 font-medium">📝 Título</td><td className="px-4 py-2.5 text-slate-600">Descripción breve. Ej: <em>"Instalación de guarda para botonera"</em></td></tr>
                <tr><td className="px-4 py-2.5 font-medium">🏷️ Tipo</td><td className="px-4 py-2.5 text-slate-600">Visita de Campo, Cotización, Ejecución, Planeación o Diseño</td></tr>
                <tr><td className="px-4 py-2.5 font-medium">🏢 Cliente</td><td className="px-4 py-2.5 text-slate-600">Selecciona el cliente asociado</td></tr>
                <tr><td className="px-4 py-2.5 font-medium">⏰ Hora inicio / fin</td><td className="px-4 py-2.5 text-slate-600">La duración se calcula automáticamente</td></tr>
                <tr><td className="px-4 py-2.5 font-medium">✅ Resultado</td><td className="px-4 py-2.5 text-slate-600">Qué lograste. Ej: <em>"Cotización enviada $45,000"</em></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">3</span>
          Haz clic en "Guardar Actividad"
        </h4>
        <p className="text-slate-600 ml-8">
          ¡Listo! Tu actividad quedará registrada y visible en el listado de Actividades.
        </p>
      </>
    ),
  },
  {
    id: 'importar-reporte',
    title: 'Método 2: Importar Reporte',
    perryMood: 'excited',
    content: (
      <>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5 flex gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-800">
            <strong>¡Este es el método más rápido!</strong> Pega tu reporte diario tal como lo envías por WhatsApp y Perry se encarga de clasificarlo.
          </p>
        </div>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">1</span>
          Ve a "Importar Reporte" en el menú
        </h4>
        <p className="text-slate-600 mb-5 ml-8">
          Selecciona la fecha y pega el texto completo de tu reporte. Puede ser tal cual lo mandas por WhatsApp:
        </p>
        <div className="ml-8 mb-5 bg-slate-800 rounded-xl p-4 text-sm font-mono text-green-400 leading-relaxed">
          <p className="text-slate-500 mb-1">// Ejemplo de texto:</p>
          <p>Buena tarde anexo reporte de actividades:</p>
          <p>- Se atiende reunión con Ing Alexis Campos para instalación de guarda</p>
          <p>- Instalación de lámparas de 2ft en MR1</p>
          <p>- Se envía cotización para barandales FEMSA</p>
          <p>- Revisión de planos estructurales</p>
        </div>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">2</span>
          Haz clic en "Analizar y Clasificar"
        </h4>
        <p className="text-slate-600 mb-3 ml-8">
          Perry analizará cada línea de tu reporte y las clasificará automáticamente:
        </p>
        <div className="ml-8 mb-5 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>"reunión", "visita" → <strong>Visita de Campo</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>"cotización", "precio" → <strong>Cotización</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>"instalación", "reemplazo" → <strong>Ejecución</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>"permisos", "solicitud" → <strong>Planeación</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-rose-50 rounded-lg px-3 py-2 col-span-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>"diseño", "planos", "cálculo" → <strong>Diseño</strong></span>
          </div>
        </div>

        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">3</span>
          Revisa, ajusta y guarda
        </h4>
        <p className="text-slate-600 ml-8">
          Puedes <strong>editar el título</strong>, <strong>cambiar el tipo</strong>, y <strong>asignar el cliente</strong> de cada línea antes de guardar. Desmarca las que no quieras importar.
        </p>
      </>
    ),
  },
  {
    id: 'tipos-actividad',
    title: 'Tipos de Actividad',
    perryMood: 'teaching',
    content: (
      <>
        <p className="text-slate-600 mb-5">
          Cada actividad debe tener un <strong>tipo</strong>. Aquí te explico cuándo usar cada uno:
        </p>
        <div className="space-y-3">
          {[
            { type: 'Visita de Campo', color: 'bg-blue-500', bg: 'bg-blue-50 border-blue-100', desc: 'Reuniones con clientes, levantamientos, recorridos en planta, inspecciones.' , examples: '"Reunión con Ing. Campos", "Visita a planta Ternium", "Levantamiento de grúas"' },
            { type: 'Cotización', color: 'bg-amber-500', bg: 'bg-amber-50 border-amber-100', desc: 'Elaboración, envío o seguimiento de cotizaciones y propuestas comerciales.', examples: '"Envío cotización barandales $185K", "Elaboración presupuesto sistema contra incendio"' },
            { type: 'Ejecución', color: 'bg-green-500', bg: 'bg-green-50 border-green-100', desc: 'Trabajos físicos: instalaciones, reparaciones, mantenimientos, pruebas.', examples: '"Instalación lámparas LED", "Reemplazo cableado nave 3", "Pruebas sistema neumático"' },
            { type: 'Planeación', color: 'bg-purple-500', bg: 'bg-purple-50 border-purple-100', desc: 'Coordinación, permisos, solicitudes de material, documentación, revisiones.', examples: '"Solicitud de materiales", "Permisos de fin de semana", "Coordinación con equipo"' },
            { type: 'Diseño', color: 'bg-rose-500', bg: 'bg-rose-50 border-rose-100', desc: 'Diseño de planos, cálculos estructurales, modelado, ingeniería de detalle.', examples: '"Diseño de layout planta", "Cálculo estructural barandal", "Planos eléctricos"' },
          ].map((item) => (
            <div key={item.type} className={cn('border rounded-xl p-4', item.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('w-3 h-3 rounded-full', item.color)} />
                <span className="font-semibold text-slate-800">{item.type}</span>
              </div>
              <p className="text-sm text-slate-700 mb-1">{item.desc}</p>
              <p className="text-xs text-slate-500 italic">Ejemplos: {item.examples}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'tips',
    title: 'Tips de Perry 💡',
    perryMood: 'happy',
    content: (
      <>
        <p className="text-slate-600 mb-5">
          Sigue estos consejos y tu supervisor te lo va a agradecer:
        </p>
        <div className="space-y-4">
          {[
            { emoji: '📝', tip: 'Sé específico en el título', detail: 'En vez de "Reunión" escribe "Reunión con Ing. Campos para levantamiento de botoneras CEMEX".' },
            { emoji: '⏰', tip: 'Registra tus horarios', detail: 'La hora de inicio y fin ayuda a medir productividad. No es para controlarte, es para entender la carga de trabajo del equipo.' },
            { emoji: '✅', tip: 'Llena el campo de Resultado', detail: 'Qué se logró, qué se acordó, cuántas piezas se instalaron. Esto evita dudas posteriores.' },
            { emoji: '➡️', tip: 'Indica el Siguiente Paso', detail: 'Si la actividad continúa, documenta qué falta. Ej: "Falta prueba de presión, completar lunes".' },
            { emoji: '🏢', tip: 'Siempre asigna Cliente', detail: 'Aunque sea una actividad interna, vincúlala al cliente cuando aplique. Así se puede analizar el esfuerzo por cliente.' },
            { emoji: '📱', tip: 'Usa WhatsApp Import', detail: 'Si ya mandas tu reporte por WhatsApp, ¡solo pégalo aquí! Perry hace la clasificación por ti y te ahorras el trabajo doble.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div>
                <p className="font-semibold text-slate-800">{item.tip}</p>
                <p className="text-sm text-slate-600 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'listo',
    title: '¡Eso es todo! 🎉',
    perryMood: 'excited',
    content: (
      <>
        <p className="text-lg text-slate-700 mb-6">
          Ya sabes todo lo necesario para registrar tus actividades como un profesional.
        </p>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 text-center mb-6">
          <p className="text-3xl mb-3">🏗️</p>
          <p className="text-lg font-semibold text-indigo-900 mb-1">Recuerda</p>
          <p className="text-indigo-700">
            Registrar tus actividades no es burocracia —<br />
            es la forma de <strong>hacer visible tu trabajo</strong> y que el equipo pueda<br />
            dar mejor seguimiento a los clientes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/actividades/nueva"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-5 py-3 font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
          >
            <ClipboardPlus className="w-5 h-5" />
            Crear Actividad
          </a>
          <a
            href="/reportes/importar"
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-purple-200 text-purple-700 rounded-xl px-5 py-3 font-semibold hover:bg-purple-50 transition-all"
          >
            <FileText className="w-5 h-5" />
            Importar Reporte
          </a>
        </div>
      </>
    ),
  },
];

/* ─── Component ───────────────────────────────────────── */
export function GuiaClient({ userName }: GuiaClientProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const firstName = userName.split(' ')[0];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-8">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300 flex-1',
              i <= currentStep
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                : 'bg-slate-200'
            )}
            title={s.title}
          />
        ))}
      </div>

      {/* Perry speech bubble */}
      <div className="flex gap-4 items-start mb-8">
        {/* Perry avatar */}
        <div className="flex-shrink-0">
          <div className={cn(
            'w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 transition-all duration-300',
            step.perryMood === 'happy' ? 'border-indigo-300 rotate-0' :
            step.perryMood === 'excited' ? 'border-purple-300 -rotate-3 scale-105' :
            'border-blue-300 rotate-2'
          )}>
            <img src="/perry-logo.jpg" alt="Perry" className="w-full h-full object-cover" />
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-1 font-medium">PERRY</p>
        </div>

        {/* Speech bubble */}
        <div className="flex-1 relative">
          {/* Triangle */}
          <div className="absolute left-[-8px] top-5 w-0 h-0 border-t-[8px] border-t-transparent border-r-[8px] border-r-indigo-100 border-b-[8px] border-b-transparent" />
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium">Perry dice:</span>
            </div>
            <p className="text-slate-700">
              {currentStep === 0 && `¡Hola ${firstName}! Vamos a aprender a registrar tus actividades. ¡Es fácil, te lo prometo!`}
              {currentStep === 1 && `Este método es perfecto cuando necesitas registrar una actividad con todo detalle.`}
              {currentStep === 2 && `¡Este es mi favorito! 🌟 Solo pega tu reporte y yo hago la magia de clasificarlo.`}
              {currentStep === 3 && `Es importante elegir el tipo correcto. Aquí te explico cada uno.`}
              {currentStep === 4 && `Estos tips van a hacer que tu registro sea de 10. ¡Tú puedes!`}
              {currentStep === 5 && `¡Excelente, ${firstName}! Ya estás listo para registrar actividades como profesional. Si tienes dudas, siempre puedes volver aquí. 🦆`}
            </p>
          </div>
        </div>
      </div>

      {/* Step content card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm mb-8 animate-fade-in" key={step.id}>
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
            {currentStep + 1} / {steps.length}
          </span>
          <h2 className="text-xl font-bold text-slate-800">{step.title}</h2>
        </div>

        {/* Content */}
        {step.content}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={isFirst}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
            isFirst
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <div className="flex gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                i === currentStep
                  ? 'bg-indigo-500 scale-125'
                  : 'bg-slate-200 hover:bg-slate-300'
              )}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={isLast}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
            isLast
              ? 'text-slate-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200'
          )}
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
