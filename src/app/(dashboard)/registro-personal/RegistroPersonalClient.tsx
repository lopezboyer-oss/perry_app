'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Camera, QrCode, LogIn, LogOut, Calendar, User, Clock,
  ExternalLink, Eye, RefreshCw, Check, Loader2, Play, Circle, ListFilter, Map, HelpCircle, X,
  Plus, Pencil, Trash2, UserPlus, AlertTriangle, Users, MessageCircle, CalendarDays
} from 'lucide-react';
import { playSuccessSound } from '@/lib/audio';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { WeeklyScheduleModal } from '@/components/ui/WeeklyScheduleModal';

// Convert datetime-local value ("2026-07-14T08:00") to ISO with timezone offset ("2026-07-14T08:00:00-07:00")
// so the server interprets the time in the user's local timezone, not UTC.
function appendTimezoneOffset(datetimeLocalValue: string): string {
  const d = new Date(datetimeLocalValue);
  const offset = -d.getTimezoneOffset(); // in minutes, positive = ahead of UTC
  const sign = offset >= 0 ? '+' : '-';
  const absH = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const absM = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${datetimeLocalValue}:00${sign}${absH}:${absM}`;
}

interface ActivityOption {
  id: string;
  title: string;
  workOrderFolio: string | null;
  date: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  ADMINISTRACION: 'Administración',
  SUPERVISOR: 'Supervisor',
  SUPERVISOR_SAFETY_LP: 'Sup. Safety',
  INGENIERO: 'Ingeniero',
};

interface UserOption {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string | null;
}

interface RegistroPersonalClientProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  activities: ActivityOption[];
  users: UserOption[];
  companyId?: string | null;
  companyName?: string;
}

export function RegistroPersonalClient({ currentUser, activities, users, companyId, companyName }: RegistroPersonalClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'registro' | 'qr-generator' | 'historial'>('registro');
  
  // Form State
  const [type, setType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [method, setMethod] = useState<'GPS' | 'SELFIE' | 'QR'>('GPS');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Camera Selfie State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // base64
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  // QR Generator State
  const [genActivityId, setGenActivityId] = useState<string>('');
  const [genType, setGenType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);

  // Logs / Historial State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterUser, setFilterUser] = useState<string>('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [filterType, setFilterType] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'this-week' | 'last-7-days' | 'custom'>('today');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // "Sin Registro Hoy" Modal State
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingUsers, setMissingUsers] = useState<any[]>([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingTotal, setMissingTotal] = useState(0);
  const [missingTotalActive, setMissingTotalActive] = useState(0);

  // Manual Registration Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUserId, setManualUserId] = useState<string>('');
  const [manualType, setManualType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [manualTimestamp, setManualTimestamp] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualUserSearch, setManualUserSearch] = useState('');
  const [isManualUserDropdownOpen, setIsManualUserDropdownOpen] = useState(false);
  const manualUserDropdownRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string>('');
  const [editType, setEditType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [editTimestamp, setEditTimestamp] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editUserName, setEditUserName] = useState<string>('');

  // Delete Confirmation State
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Weekly Schedule Modal State
  const [weeklyModal, setWeeklyModal] = useState<{ userId: string; userName: string; weekStart: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (manualUserDropdownRef.current && !manualUserDropdownRef.current.contains(e.target as Node)) {
        setIsManualUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [selectedMapCoords, setSelectedMapCoords] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [lastUserEntryType, setLastUserEntryType] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
  const [checkingLastEntry, setCheckingLastEntry] = useState(true);

  const isSupervisorOrAdmin = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(currentUser.role);
  const isAdminOrAdministracion = ['ADMIN', 'ADMINISTRACION'].includes(currentUser.role);
  const canGenerateQr = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP', 'INGENIERO'].includes(currentUser.role);

  // ----------------------------------------------------
  // GPS Geolocation Handler
  // ----------------------------------------------------
  const fetchGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Tu navegador no soporta geolocalización');
      return;
    }
    setGpsLoading(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (error) => {
        console.error('Error getting GPS:', error);
        setErrorMsg('No se pudo obtener la ubicación GPS. Verifica los permisos de tu dispositivo.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    const checkLastStatus = async () => {
      try {
        const res = await fetch('/api/time-clock');
        if (res.ok) {
          const data = await res.json();
          const myLogs = data.filter((l: any) => l.userId === currentUser.id);
          if (myLogs.length > 0) {
            const lastType = myLogs[0].type;
            setLastUserEntryType(lastType);
            setType(lastType === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
          } else {
            setLastUserEntryType(null);
            setType('CHECK_IN');
          }
        }
      } catch (err) {
        console.error('Error fetching attendance status:', err);
      } finally {
        setCheckingLastEntry(false);
      }
    };
    checkLastStatus();
  }, [currentUser.id]);

  useEffect(() => {
    if (method === 'GPS' && activeTab === 'registro') {
      fetchGps();
    } else {
      stopCamera();
    }
  }, [method, activeTab]);

  // ----------------------------------------------------
  // Selfie Camera Handlers
  // ----------------------------------------------------
  const startCamera = async () => {
    try {
      setCapturedPhoto(null);
      setErrorMsg(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setErrorMsg('No se pudo acceder a la cámara frontal. Asegúrate de otorgar permisos.');
      setMethod('GPS');
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (method === 'SELFIE' && activeTab === 'registro') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [method, activeTab]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create canvas to downsample photo to 300x300 for storage optimization
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop to 1:1 aspect ratio
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
    
    // Compress as JPEG at 60% quality
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    setCapturedPhoto(compressedDataUrl);
    stopCamera();
  };

  // ----------------------------------------------------
  // QR Scanner Handlers
  // ----------------------------------------------------
  const startQrScanner = async () => {
    setIsScanning(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    
    // Wait for DOM element to mount
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Success callback
            await stopQrScanner();
            await submitQrRegistration(decodedText);
          },
          (errorMessage) => {
            // Verbose error, ignore
          }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        setErrorMsg("Error al iniciar la cámara trasera para escanear QR.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopQrScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const submitQrRegistration = async (scannedToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/time-clock/qr-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: scannedToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al validar el código QR');
      }
      
      playSuccessSound();
      setSuccessMsg(`Registro de ${data.type === 'CHECK_IN' ? 'Entrada' : 'Salida'} exitoso vía QR.`);
      setLastUserEntryType(data.type);
      setType(data.type === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
      router.refresh();
      fetchLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al verificar QR');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // GPS / Selfie Form Submission
  // ----------------------------------------------------
  const handleRegister = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (method === 'GPS' && !gpsCoords) {
        throw new Error('Faltan coordenadas GPS. Intenta presionar "Obtener GPS" de nuevo.');
      }
      if (method === 'SELFIE' && !capturedPhoto) {
        throw new Error('Debes tomarte la selfie antes de registrar.');
      }

      const body: any = {
        type,
        method,
        activityId: selectedActivityId || undefined,
      };

      if (method === 'GPS') {
        body.latitude = gpsCoords?.latitude;
        body.longitude = gpsCoords?.longitude;
        body.accuracy = gpsCoords?.accuracy;
      } else if (method === 'SELFIE') {
        body.photo = capturedPhoto;
      }

      const res = await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      playSuccessSound();
      setSuccessMsg(`Registro de ${type === 'CHECK_IN' ? 'Entrada' : 'Salida'} exitoso.`);
      setLastUserEntryType(type);
      setType(type === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
      
      // Clean up form
      setCapturedPhoto(null);
      setGpsCoords(null);
      if (method === 'GPS') fetchGps();
      if (method === 'SELFIE') startCamera();
      
      router.refresh();
      fetchLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de servidor');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Dynamic QR Code Generator (Supervisor View)
  // ----------------------------------------------------
  const generateQrToken = async () => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/time-clock/qr-token?activityId=${genActivityId || ''}&type=${genType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Generate visual QR code
      const dataUrl = await QRCode.toDataURL(data.token, { width: 350, margin: 2 });
      setQrCodeDataUrl(dataUrl);
      setQrCountdown(30);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al generar el token QR dinámico');
    } finally {
      setQrLoading(false);
    }
  };

  // Count down and rotate token
  useEffect(() => {
    if (activeTab !== 'qr-generator') {
      setQrCodeDataUrl(null);
      return;
    }
    
    generateQrToken();
    
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          generateQrToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [genActivityId, genType, activeTab]);

  // ----------------------------------------------------
  // Logs / Historial Loader
  // ----------------------------------------------------
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let url = '/api/time-clock?';
      if (companyId) url += `companyId=${companyId}&`;
      if (filterUser) url += `userId=${filterUser}&`;
      if (filterType) url += `type=${filterType}&`;
      if (filterStartDate) url += `startDate=${filterStartDate}&`;
      if (filterEndDate) url += `endDate=${filterEndDate}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  // --- Manual Registration Handler ---
  const handleManualRegister = async () => {
    if (!manualUserId) { setErrorMsg('Selecciona un colaborador'); return; }
    setManualLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: manualType,
          method: 'MANUAL',
          targetUserId: manualUserId,
          manualTimestamp: manualTimestamp ? appendTimezoneOffset(manualTimestamp) : undefined,
          manualNotes: manualNotes || undefined,
        }),
      });
      if (res.ok) {
        playSuccessSound();
        setShowManualModal(false);
        setManualUserId(''); setManualNotes(''); setManualTimestamp(''); setManualUserSearch('');
        setSuccessMsg('Registro manual creado exitosamente');
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchLogs();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al crear registro manual');
      }
    } catch (err) {
      setErrorMsg('Error de red al crear registro manual');
    } finally {
      setManualLoading(false);
    }
  };

  // --- Edit Entry Handler ---
  const handleEditEntry = async () => {
    if (!editEntryId) return;
    setEditLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/time-clock/${editEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          timestamp: editTimestamp ? appendTimezoneOffset(editTimestamp) : undefined,
          manualNotes: editNotes || undefined,
        }),
      });
      if (res.ok) {
        playSuccessSound();
        setShowEditModal(false);
        setSuccessMsg('Registro actualizado exitosamente');
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchLogs();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al editar registro');
      }
    } catch (err) {
      setErrorMsg('Error de red al editar registro');
    } finally {
      setEditLoading(false);
    }
  };

  // --- Delete Entry Handler ---
  const handleDeleteEntry = async (entryId: string) => {
    setDeleteLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/time-clock/${entryId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteEntryId(null);
        setSuccessMsg('Registro eliminado exitosamente');
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchLogs();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al eliminar registro');
      }
    } catch (err) {
      setErrorMsg('Error de red al eliminar registro');
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Open Edit Modal ---
  const openEditModal = (log: any) => {
    setEditEntryId(log.id);
    setEditType(log.type);
    setEditUserName(log.user?.name || 'Colaborador');
    // Format timestamp for datetime-local input
    const d = new Date(log.timestamp);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    setEditTimestamp(local.toISOString().slice(0, 16));
    setEditNotes(log.manualNotes || '');
    setShowEditModal(true);
  };

  // --- Quick Date Preset Helper ---
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'this-week' | 'last-7-days') => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setDatePreset(preset);
    switch (preset) {
      case 'today': {
        const t = fmt(now);
        setFilterStartDate(t);
        setFilterEndDate(t);
        break;
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const ys = fmt(y);
        setFilterStartDate(ys);
        setFilterEndDate(ys);
        break;
      }
      case 'this-week': {
        const day = now.getDay(); // 0=Sun, 1=Mon...
        const diffToMon = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setFilterStartDate(fmt(monday));
        setFilterEndDate(fmt(sunday));
        break;
      }
      case 'last-7-days': {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        setFilterStartDate(fmt(start));
        setFilterEndDate(fmt(now));
        break;
      }
    }
  };

  // --- Missing Today Handler ---
  const fetchMissingToday = async () => {
    setMissingLoading(true);
    try {
      let url = '/api/time-clock/missing-today';
      if (companyId) url += `?companyId=${companyId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMissingUsers(data.users);
        setMissingTotal(data.total);
        setMissingTotalActive(data.totalActive);
        setShowMissingModal(true);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Error al obtener reporte');
      }
    } catch (err) {
      setErrorMsg('Error de red al obtener reporte');
    } finally {
      setMissingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchLogs();
    }
  }, [activeTab, filterUser, filterType, filterStartDate, filterEndDate]);

  // Helper date formatter
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Control de Asistencia</h1>
            <p className="text-xs text-slate-500">Registra tus horarios de entrada y salida mediante validación de presencia</p>
          </div>
        </div>
        <button
          onClick={() => setShowGuideModal(true)}
          className="self-start sm:self-center px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow hover:shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
        >
          <HelpCircle size={15} /> Guía de Uso
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
        <button
          onClick={() => { setActiveTab('registro'); stopQrScanner(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'registro' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn size={16} /> Registro Personal
        </button>
        {canGenerateQr && (
          <button
            onClick={() => { setActiveTab('qr-generator'); stopQrScanner(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'qr-generator' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode size={16} /> Generar QR
          </button>
        )}
        <button
          onClick={() => { setActiveTab('historial'); stopQrScanner(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'historial' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} /> Historial Logs
        </button>
      </div>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shadow-sm">
          <Circle className="w-4 h-4 fill-red-200 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2 shadow-sm">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5 stroke-[3]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REGISTRO PERSONAL TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'registro' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: Setup */}
            <div className="space-y-5">
              
              {/* Type selector (In/Out) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Acción a realizar</label>
                  {!checkingLastEntry && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lastUserEntryType === 'CHECK_IN' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {lastUserEntryType === 'CHECK_IN' ? 'Requerido: Salida 🚪' : 'Requerido: Entrada 🔑'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setType('CHECK_IN')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                      type === 'CHECK_IN'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LogIn size={18} /> Registrar Entrada
                  </button>
                  <button
                    onClick={() => setType('CHECK_OUT')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                      type === 'CHECK_OUT'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LogOut size={18} /> Registrar Salida
                  </button>
                </div>
              </div>

              {/* Linked Activity selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Actividad Vinculada (Opcional)</label>
                <select
                  className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                >
                  <option value="">-- Sin vincular a actividad --</option>
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      [{act.workOrderFolio || 'SIN FOLIO'}] {act.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verification method selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Método de Validación</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'GPS', label: 'Ubicación GPS', icon: MapPin },
                    { id: 'SELFIE', label: 'Tomar Selfie', icon: Camera },
                    { id: 'QR', label: 'Escanear QR', icon: QrCode },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setMethod(m.id as any); setCapturedPhoto(null); }}
                        className={`flex flex-col items-center justify-center py-4 rounded-xl border text-xs font-bold gap-2 transition-all ${
                          method === m.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/10'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={20} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right side: Verification views */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-center items-center min-h-[250px]">
              
              {/* GPS View */}
              {method === 'GPS' && (
                <div className="text-center space-y-4 w-full">
                  <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-indigo-600" />
                  </div>
                  {gpsLoading ? (
                    <div className="space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                      <p className="text-xs text-slate-500">Obteniendo coordenadas GPS de alta precisión...</p>
                    </div>
                  ) : gpsCoords ? (
                    <div className="space-y-3 w-full">
                      <p className="text-sm font-semibold text-slate-700">📍 Ubicación Detectada</p>
                      
                      <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100">
                        <iframe
                          title="Ubicación de Captura"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.longitude - 0.0025},${gpsCoords.latitude - 0.0015},${gpsCoords.longitude + 0.0025},${gpsCoords.latitude + 0.0015}&layer=mapnik&marker=${gpsCoords.latitude},${gpsCoords.longitude}`}
                          className="w-full h-full"
                        />
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono space-y-0.5 bg-white border border-slate-200 p-3 rounded-xl max-w-xs mx-auto text-left">
                        <p className="flex justify-between"><strong>Lat:</strong> <span>{gpsCoords.latitude.toFixed(6)}</span></p>
                        <p className="flex justify-between"><strong>Lng:</strong> <span>{gpsCoords.longitude.toFixed(6)}</span></p>
                        <p className="flex justify-between"><strong>Precisión:</strong> <span>±{gpsCoords.accuracy.toFixed(1)}m</span></p>
                      </div>
                      
                      <button
                        onClick={fetchGps}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mx-auto"
                      >
                        <RefreshCw size={12} /> Actualizar Coordenadas
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">Esperando coordenadas GPS...</p>
                      <button
                        onClick={fetchGps}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow hover:bg-slate-50 flex items-center gap-1 mx-auto"
                      >
                        <MapPin size={14} /> Obtener GPS
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selfie View */}
              {method === 'SELFIE' && (
                <div className="text-center w-full space-y-4">
                  {capturedPhoto ? (
                    <div className="space-y-3">
                      <div className="mx-auto w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-lg relative bg-black">
                        <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                        <Check size={12} /> Foto lista (Comprimida)
                      </p>
                      <button
                        onClick={startCamera}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mx-auto"
                      >
                        <RefreshCw size={12} /> Tomar otra foto
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stream ? (
                        <div className="space-y-3">
                          <div className="mx-auto w-40 h-40 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-black relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                          </div>
                          <button
                            onClick={capturePhoto}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/10 flex items-center gap-1.5 mx-auto"
                          >
                            <Camera size={14} /> Capturar Foto
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                          <p className="text-xs text-slate-500">Iniciando cámara frontal...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QR View */}
              {method === 'QR' && (
                <div className="text-center space-y-4 w-full">
                  <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-indigo-600" />
                  </div>
                  
                  {isScanning ? (
                    <div className="space-y-3">
                      <div className="bg-black w-60 h-60 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-400 shadow-lg relative">
                        <div id={scannerId} className="w-full h-full" />
                      </div>
                      <button
                        onClick={stopQrScanner}
                        className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 mx-auto flex items-center gap-1"
                      >
                        Cancelar Escaneo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                        Apunta tu cámara trasera al código QR dinámico proyectado en la pantalla de tu supervisor.
                      </p>
                      <button
                        onClick={startQrScanner}
                        className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/10 flex items-center gap-1.5 mx-auto"
                      >
                        <Play size={14} fill="white" /> Escanear Código QR
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* Action button for GPS and Selfie methods */}
          {method !== 'QR' && (
            <button
              onClick={handleRegister}
              disabled={loading || (method === 'GPS' && !gpsCoords) || (method === 'SELFIE' && !capturedPhoto)}
              className={`w-full py-4 rounded-xl text-sm font-extrabold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : type === 'CHECK_IN'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/15'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-600/15'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando Registro...
                </>
              ) : (
                <>
                  {type === 'CHECK_IN' ? <LogIn size={18} /> : <LogOut size={18} />}
                  Confirmar y Guardar {type === 'CHECK_IN' ? 'Entrada' : 'Salida'}
                </>
              )}
            </button>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* QR GENERATOR TAB (SUPERVISOR ONLY) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'qr-generator' && canGenerateQr && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Control Panel */}
            <div className="flex-1 space-y-5">
              <h2 className="text-lg font-bold text-slate-800">Generar QR de Asistencia</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Los técnicos en el sitio pueden escanear este código QR para registrar su asistencia. Cambia automáticamente cada 30 segundos por seguridad.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">1. Seleccionar Actividad</label>
                <select
                  className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2"
                  value={genActivityId}
                  onChange={(e) => { setGenActivityId(e.target.value); setQrCodeDataUrl(null); }}
                >
                  <option value="">-- Sin vincular (Asistencia General) --</option>
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      [{act.workOrderFolio || 'SIN FOLIO'}] {act.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">2. Tipo de Registro QR</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setGenType('CHECK_IN'); setQrCodeDataUrl(null); }}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      genType === 'CHECK_IN'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Asistencia: Entrada
                  </button>
                  <button
                    onClick={() => { setGenType('CHECK_OUT'); setQrCodeDataUrl(null); }}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                      genType === 'CHECK_OUT'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Asistencia: Salida
                  </button>
                </div>
              </div>

            </div>

            {/* QR Projection Screen */}
            <div className="w-full md:w-[380px] bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[360px]">
              {qrCodeDataUrl ? (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 inline-block">
                    <img src={qrCodeDataUrl} alt="Dynamic Attendance QR" className="w-[280px] h-[280px]" />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                    </span>
                    <p className="text-xs font-bold text-slate-600">
                      El código QR se actualizará en <span className="text-indigo-600 font-extrabold text-sm">{qrCountdown}</span> segundos
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs text-slate-500">Cargando token dinámico...</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EXPORT TO EXCEL */}
      {/* ---------------------------------------------------- */}
      {(() => {
        // defined here to keep the code organized, but can be called by the button
      })()}

      {/* ---------------------------------------------------- */}
      {/* HISTORIAL LOGS TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          
          {/* Filters (Managers Only) */}
          {isSupervisorOrAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
                <ListFilter size={16} /> Filtros de Auditoría
              </div>
              
              {/* Searchable User Combobox */}
              <div className="flex-1 min-w-[220px] relative" ref={userDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    className="w-full text-xs border border-slate-300 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={userSearchQuery}
                    onFocus={() => setIsUserDropdownOpen(true)}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setIsUserDropdownOpen(true);
                      if (e.target.value === '') {
                        setFilterUser('');
                      }
                    }}
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => {
                        setUserSearchQuery('');
                        setFilterUser('');
                        setIsUserDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {isUserDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1">
                    {(() => {
                      const filteredUsers = users.filter(u =>
                        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
                      );
                      return filteredUsers.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2 text-center">No se encontraron resultados</p>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setFilterUser('');
                              setUserSearchQuery('');
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 border-b border-slate-100"
                          >
                            -- Todos los colaboradores --
                          </button>
                          {filteredUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setFilterUser(u.id);
                                setUserSearchQuery(u.name);
                                setIsUserDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex justify-between items-center ${
                                filterUser === u.id
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{u.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                                {roleLabels[u.role] || u.role}
                              </span>
                            </button>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="w-[150px]">
                <select
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">-- Todos los tipos --</option>
                  <option value="CHECK_IN">Entrada (CHECK_IN)</option>
                  <option value="CHECK_OUT">Salida (CHECK_OUT)</option>
                </select>
              </div>

              {/* Date Filters Group */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase ml-2">Inicio</span>
                  <input
                    type="date"
                    className="w-[125px] text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    value={filterStartDate}
                    onChange={(e) => { setFilterStartDate(e.target.value); setDatePreset('custom'); }}
                  />
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Fin</span>
                  <input
                    type="date"
                    className="w-[125px] text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white mr-1"
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setDatePreset('custom'); }}
                  />
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'yesterday' as const, label: 'Ayer' },
                  { id: 'today' as const, label: 'Hoy' },
                  { id: 'this-week' as const, label: 'Esta Semana' },
                  { id: 'last-7-days' as const, label: 'Últimos 7 Días' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyDatePreset(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                      datePreset === p.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sin Registro Hoy Button (Admin/Administración Only) */}
              {isAdminOrAdministracion && (
                <button
                  onClick={fetchMissingToday}
                  disabled={missingLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-colors rounded-lg shadow-sm disabled:opacity-50"
                  title="Ver colaboradores sin registro hoy"
                >
                  {missingLoading ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                  Sin Registro Hoy
                </button>
              )}

              {/* WhatsApp Share Credentials Button (for specific selected user) */}
              {filterUser && (() => {
                const selectedUser = users.find(u => u.id === filterUser);
                if (!selectedUser) return null;
                
                const handleSendAccess = async () => {
                  try {
                    // Fetch real credentials from server instead of generating locally
                    const res = await fetch(`/api/users/${selectedUser.id}/credentials`);
                    if (!res.ok) {
                      alert('Error al obtener credenciales del servidor');
                      return;
                    }
                    const creds = await res.json();
                    const email = creds.email || '';
                    const password = creds.password || '';
                    
                    const message = `¡Hola ${selectedUser.name}! Te comparto tus datos de acceso para la aplicación PERRY APP y las instrucciones para registrar tu asistencia:\n\n🌐 Enlace: https://perryapp.netlify.app\n📧 Usuario (Email): ${email}\n🔑 Contraseña: ${password}\n\nPasos para registrar Asistencia:\n1. Inicia sesión con tus credenciales.\n2. Ve a la sección "Asistencia".\n3. Elige tu método (GPS 🗺️, Selfie 📷 o Escanear QR 🔍).\n4. Presiona Registrar Entrada o Salida.`;
                    
                    const encodedText = encodeURIComponent(message);
                    const phone = selectedUser.phone ? selectedUser.phone.replace(/[^0-9]/g, '') : '';
                    const url = phone 
                      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
                      : `https://api.whatsapp.com/send?text=${encodedText}`;
                    
                    window.open(url, '_blank');
                  } catch (err) {
                    console.error('Error fetching credentials:', err);
                    alert('Error de red al obtener credenciales');
                  }
                };

                return (
                  <button
                    onClick={handleSendAccess}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg shadow-sm"
                    title="Compartir datos de acceso e instrucciones por WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436.002 9.851-4.411 9.855-9.847.002-2.634-1.02-5.107-2.88-6.973C16.379 1.819 13.91 .795 11.278.793 5.845.793 1.43 5.207 1.426 10.64c-.001 1.517.404 2.992 1.173 4.298l-.993 3.624 3.71-.973zm13.174-7.464c-.26-.13-1.532-.757-1.77-.843-.238-.087-.41-.13-.58.13-.17.26-.66.843-.81 1.01-.15.17-.3.19-.56.06-.26-.13-1.096-.404-2.09-1.288-.773-.687-1.295-1.538-1.447-1.8-.15-.26-.016-.4.117-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.3-.02-.43-.06-.13-.58-1.393-.794-1.91-.21-.5-.42-.43-.58-.44l-.49-.01c-.17 0-.45.06-.68.3-.23.24-.89.87-.89 2.12 0 1.25.91 2.46 1.03 2.63.13.17 1.79 2.731 4.33 3.824.6.26 1.08.42 1.45.54.6.19 1.15.16 1.59.1.49-.07 1.53-.62 1.74-1.22.21-.6.21-1.12.15-1.22-.06-.1-.23-.15-.49-.28z"/>
                    </svg>
                    Enviar Acceso
                  </button>
                );
              })()}

              {/* Manual Registration Button (Admin/Administración Only) */}
              {isAdminOrAdministracion && (
                <button
                  onClick={() => {
                    setManualType('CHECK_IN');
                    const now = new Date();
                    const localISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                    setManualTimestamp(localISO);
                    setManualNotes('');
                    setManualUserId('');
                    setManualUserSearch('');
                    setShowManualModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-colors rounded-lg shadow-sm"
                  title="Registrar asistencia manual"
                >
                  <Plus size={14} strokeWidth={3} /> Registrar Asistencia
                </button>
              )}

              {/* Export to Excel Button (Admin/Administración Only) */}
              {isAdminOrAdministracion && (
                <button
                  onClick={() => {
                    if (!logs || logs.length === 0) {
                      alert("No hay datos para exportar.");
                      return;
                    }

                    const groupedLogs = logs.reduce((acc: any, log: any) => {
                      if (!acc[log.userId]) {
                        acc[log.userId] = { user: log.user, logs: [] };
                      }
                      acc[log.userId].logs.push(log);
                      return acc;
                    }, {});

                    const exportData: any[][] = [];
                    exportData.push(["Empleado", "Entrada", "Salida", "Horas trabajadas"]);

                    Object.values(groupedLogs).forEach(({ user, logs: userLogs }: any) => {
                      const sortedLogs = [...userLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                      
                      const shifts: any[] = [];
                      let currentIn: any = null;

                      sortedLogs.forEach(log => {
                        if (log.type === 'CHECK_IN') {
                          if (currentIn) {
                            shifts.push({ in: new Date(currentIn.timestamp), out: null, hours: 0 });
                          }
                          currentIn = log;
                        } else if (log.type === 'CHECK_OUT') {
                          if (currentIn) {
                            const inDate = new Date(currentIn.timestamp);
                            const outDate = new Date(log.timestamp);
                            const rawHours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
                            const hours = Number(rawHours.toFixed(1));
                            shifts.push({ in: inDate, out: outDate, hours });
                            currentIn = null;
                          } else {
                            shifts.push({ in: null, out: new Date(log.timestamp), hours: 0 });
                          }
                        }
                      });
                      if (currentIn) {
                        shifts.push({ in: new Date(currentIn.timestamp), out: null, hours: 0 });
                      }

                      const totalHours = Number(shifts.reduce((sum, shift) => sum + shift.hours, 0).toFixed(1));

                      // Group Header Row
                      exportData.push([`${user.name} (${shifts.length})`, null, null, totalHours]);

                      // Details Rows
                      const fmtDate = (d: Date | null) => d ? d.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                      shifts.forEach(shift => {
                        exportData.push([
                          user.name,
                          fmtDate(shift.in),
                          fmtDate(shift.out),
                          shift.hours
                        ]);
                      });

                      // Fila vacía para separar entre empleados
                      exportData.push([]);
                    });

                    const ws = XLSX.utils.aoa_to_sheet(exportData);
                    
                    // Ajustar el ancho de las columnas
                    ws['!cols'] = [
                      { wch: 35 }, // Empleado
                      { wch: 22 }, // Entrada
                      { wch: 22 }, // Salida
                      { wch: 18 }  // Horas trabajadas
                    ];

                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
                    
                    const compName = companyName || 'Todas';
                    const startDateStr = filterStartDate || 'Inicio';
                    const endDateStr = filterEndDate || 'Final';
                    const fileName = `Asistencia_${compName}_${startDateStr}_${endDateStr}.xlsx`;
                    
                    XLSX.writeFile(wb, fileName);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors rounded-lg shadow-sm ml-auto"
                  title="Exportar a Excel"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Exportar a Excel
                </button>
              )}
            </div>
          )}

          {/* Logs List Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {logsLoading ? (
              <div className="p-12 text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                <p className="text-xs text-slate-500">Cargando bitácora de asistencia...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Calendar size={40} className="mx-auto opacity-40 stroke-[1.5]" />
                <h3 className="font-bold text-slate-500">Sin registros encontrados</h3>
                <p className="text-xs">No hay entradas o salidas guardadas bajo estos criterios.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-2.5 py-2 text-left font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Colaborador</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Tipo</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Método</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Fecha / Hora</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Actividad</th>
                      <th className="px-2 py-2 text-center font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Verificación</th>
                      {isAdminOrAdministracion && (
                        <th className="px-1.5 py-2 text-center font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Acc.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-2.5 py-2">
                          <div className="font-semibold text-slate-800 text-xs leading-tight">{log.user?.name}</div>
                        </td>
                        
                        <td className="px-2 py-2 text-center">
                          {log.type === 'CHECK_IN' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <LogIn size={9} /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <LogOut size={9} /> Salida
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2 text-center">
                          {log.method === 'GPS' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <MapPin size={9} /> GPS
                            </span>
                          )}
                          {log.method === 'SELFIE' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-100">
                              <Camera size={9} /> Selfie
                            </span>
                          )}
                          {log.method === 'QR' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                              <QrCode size={9} /> QR
                            </span>
                          )}
                          {log.method === 'MANUAL' && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                                <UserPlus size={9} /> Manual
                              </span>
                              {log.registeredByUserName && (
                                <span className="text-[8px] text-slate-500">Por: {log.registeredByUserName}</span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-2 py-2">
                          {(() => {
                            const d = new Date(log.timestamp);
                            const date = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
                            const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <div className="leading-tight">
                                <div className="text-[11px] font-semibold text-slate-700">{date}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{time}</div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-2 py-2 text-slate-600 max-w-[140px] truncate">
                          {log.activity ? (
                            <div>
                              <span className="font-semibold text-slate-800 text-[11px] leading-tight">
                                {log.activity.title}
                              </span>
                              {log.activity.workOrderFolio && (
                                <span className="block text-[9px] text-slate-400 font-mono">
                                  {log.activity.workOrderFolio}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">—</span>
                          )}
                        </td>

                        <td className="px-2 py-2 text-center">
                          {log.method === 'GPS' && log.latitude && log.longitude && (
                            <button
                              onClick={() => setSelectedMapCoords({
                                latitude: log.latitude!,
                                longitude: log.longitude!,
                                name: log.user?.name || 'Colaborador'
                              })}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <Map size={10} /> Mapa
                            </button>
                          )}
                          {log.method === 'SELFIE' && log.photo && (
                            <button
                              onClick={() => setSelectedPhotoModal(log.photo)}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pink-600 hover:text-pink-800 hover:underline"
                            >
                              <Eye size={10} /> Foto
                            </button>
                          )}
                          {log.method === 'QR' && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-teal-600 font-bold flex items-center justify-center gap-0.5">
                                <Check size={10} /> QR
                              </span>
                              {log.verifiedByUserName && (
                                <span className="block text-[8px] text-slate-500 font-semibold">
                                  {log.verifiedByUserName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Admin Action Buttons */}
                        {isAdminOrAdministracion && (
                          <td className="px-1.5 py-2 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => {
                                  // Calculate Monday of the week containing this log's timestamp
                                  const d = new Date(log.timestamp);
                                  const day = d.getDay();
                                  const diffToMon = day === 0 ? -6 : 1 - day;
                                  const monday = new Date(d);
                                  monday.setDate(d.getDate() + diffToMon);
                                  // Use local timezone getters (not toISOString which is UTC)
                                  const yyyy = monday.getFullYear();
                                  const mm = String(monday.getMonth() + 1).padStart(2, '0');
                                  const dd = String(monday.getDate()).padStart(2, '0');
                                  setWeeklyModal({
                                    userId: log.userId,
                                    userName: log.user?.name || 'Colaborador',
                                    weekStart: `${yyyy}-${mm}-${dd}`,
                                  });
                                }}
                                className="p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Ver semana laboral"
                              >
                                <CalendarDays size={12} />
                              </button>
                              <button
                                onClick={() => openEditModal(log)}
                                className="p-1 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                                title="Editar registro"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => setDeleteEntryId(log.id)}
                                className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Selfie Preview Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl animate-fade-in border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Camera className="text-pink-500" /> Validación Biométrica (Selfie)
            </h3>
            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-black">
              <img src={selectedPhotoModal} alt="Compressed selfie validation" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="mt-5 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}
      {/* Map Preview Modal */}
      {selectedMapCoords && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full relative shadow-2xl animate-fade-in border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="text-indigo-600 animate-bounce" /> Ubicación de {selectedMapCoords.name}
              </h3>
              <a
                href={`https://www.google.com/maps?q=${selectedMapCoords.latitude},${selectedMapCoords.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 transition-colors"
              >
                <ExternalLink size={12} /> Google Maps
              </a>
            </div>
            
            <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative">
              <iframe
                title="Ubicación Detallada"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMapCoords.longitude - 0.0025},${selectedMapCoords.latitude - 0.0015},${selectedMapCoords.longitude + 0.0025},${selectedMapCoords.latitude + 0.0015}&layer=mapnik&marker=${selectedMapCoords.latitude},${selectedMapCoords.longitude}`}
                className="w-full h-full"
              />
            </div>
            
            <div className="text-xs text-slate-500 font-mono flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span><strong>Lat:</strong> {selectedMapCoords.latitude.toFixed(6)}</span>
              <span><strong>Lng:</strong> {selectedMapCoords.longitude.toFixed(6)}</span>
            </div>

            <button
              onClick={() => setSelectedMapCoords(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
            >
              Cerrar Mapa
            </button>
          </div>
        </div>
      )}
      {/* Manual Registration Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl animate-fade-in border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-white"><UserPlus size={18} /></div>
                Registro Manual de Asistencia
              </h3>
              <button onClick={() => setShowManualModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>

            {/* User Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Colaborador *</label>
              <div className="relative" ref={manualUserDropdownRef}>
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  value={manualUserSearch}
                  onFocus={() => setIsManualUserDropdownOpen(true)}
                  onChange={(e) => {
                    setManualUserSearch(e.target.value);
                    setIsManualUserDropdownOpen(true);
                    if (e.target.value === '') setManualUserId('');
                  }}
                />
                {isManualUserDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1">
                    {users.filter(u => u.name.toLowerCase().includes(manualUserSearch.toLowerCase())).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setManualUserId(u.id);
                          setManualUserSearch(u.name);
                          setIsManualUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex justify-between items-center ${
                          manualUserId === u.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{u.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{roleLabels[u.role] || u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tipo de Registro</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setManualType('CHECK_IN')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                    manualType === 'CHECK_IN' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LogIn size={16} /> Entrada
                </button>
                <button
                  onClick={() => setManualType('CHECK_OUT')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                    manualType === 'CHECK_OUT' ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LogOut size={16} /> Salida
                </button>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha y Hora</label>
              <input
                type="datetime-local"
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                value={manualTimestamp}
                onChange={(e) => setManualTimestamp(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notas / Justificación</label>
              <textarea
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                rows={2}
                placeholder="Ej: Sin datos móviles en campo, registro reportado por WhatsApp"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleManualRegister}
              disabled={manualLoading || !manualUserId}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} strokeWidth={3} />}
              Confirmar Registro Manual
            </button>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl animate-fade-in border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white"><Pencil size={18} /></div>
                Editar Registro
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="font-bold text-slate-700">{editUserName}</span>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tipo de Registro</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditType('CHECK_IN')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                    editType === 'CHECK_IN' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LogIn size={16} /> Entrada
                </button>
                <button
                  onClick={() => setEditType('CHECK_OUT')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
                    editType === 'CHECK_OUT' ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LogOut size={16} /> Salida
                </button>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha y Hora</label>
              <input
                type="datetime-local"
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={editTimestamp}
                onChange={(e) => setEditTimestamp(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notas de Edición</label>
              <textarea
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                rows={2}
                placeholder="Motivo de la edición..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleEditEntry}
              disabled={editLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} strokeWidth={3} />}
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteEntryId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl animate-fade-in border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Eliminar Registro</h3>
                <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEntryId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteEntry(deleteEntryId)}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Modal */}
      {weeklyModal && (
        <WeeklyScheduleModal
          userId={weeklyModal.userId}
          userName={weeklyModal.userName}
          initialWeekStart={weeklyModal.weekStart}
          onClose={() => setWeeklyModal(null)}
        />
      )}

      {/* Sin Registro Hoy Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full relative shadow-2xl animate-fade-in border border-slate-200 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Sin Registro Hoy</h3>
                  <p className="text-[11px] text-slate-500">
                    {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {companyName && <span className="ml-1 font-semibold text-slate-600">• {companyName}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <Users size={13} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">{missingTotal} / {missingTotalActive}</span>
                  <span className="text-[10px] text-amber-600">sin registro</span>
                </div>
                <button onClick={() => setShowMissingModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 mt-4">
              {missingUsers.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Check size={40} className="mx-auto text-emerald-400 stroke-[1.5]" />
                  <h4 className="font-bold text-slate-600">¡Todos registrados!</h4>
                  <p className="text-xs text-slate-400">Todos los colaboradores han registrado asistencia hoy.</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Colaborador</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Último Registro</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {missingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{roleLabels[u.role] || u.role}</div>
                        </td>
                        <td className="px-4 py-3">
                          {u.lastEntry ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.lastEntry.type === 'CHECK_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {u.lastEntry.type === 'CHECK_IN' ? <LogIn size={9} /> : <LogOut size={9} />}
                                {u.lastEntry.type === 'CHECK_IN' ? 'Entrada' : 'Salida'}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {new Date(u.lastEntry.timestamp).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin registros previos</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              const message = `¡Hola ${u.name}! 👋\n\nTe recordamos que hoy no tienes registro de asistencia en la app.\n\n🌐 Enlace: https://perryapp.netlify.app\n📋 Sección: Asistencia\n\nPor favor ponte en contacto para regularizar tu registro. ¡Gracias! 🙏`;
                              const encodedText = encodeURIComponent(message);
                              const phone = u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
                              const url = phone
                                ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
                                : `https://api.whatsapp.com/send?text=${encodedText}`;
                              window.open(url, '_blank');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle size={11} /> Recordar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowMissingModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guía de Uso Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full relative shadow-2xl animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="text-teal-500" /> Guía de Uso Asistencia
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Mascot Greeting */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-4 rounded-2xl border border-teal-100/50 my-4 shrink-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow bg-white border border-slate-200 shrink-0">
                <img src="/perry-logo.jpg" alt="Perry Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Perry Asistencias</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Hola, soy Perry. Te guiaré para que puedas realizar tus registros de entrada y salida de forma rápida y sencilla.
                </p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              
              {/* Card 1: GPS */}
              <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
                    <MapPin size={16} />
                  </div>
                  <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">1. Ubicación por GPS</h4>
                </div>
                <p className="text-xs text-indigo-950/80 leading-relaxed">
                  Registra asistencia en campo usando las coordenadas de tu teléfono.
                </p>
                <div className="text-xs space-y-2 text-indigo-950 bg-white/70 p-3 rounded-xl border border-indigo-100">
                  <p className="leading-relaxed">
                    <strong className="text-indigo-600 mr-1.5">Paso A:</strong>
                    <span>Selecciona el método <strong>GPS</strong> e indica la actividad correspondiente.</span>
                  </p>
                  <p className="leading-relaxed border-t border-indigo-100/50 pt-1.5">
                    <strong className="text-indigo-600 mr-1.5">Paso B:</strong>
                    <span>Presiona <strong>"Obtener GPS"</strong>. Verás un mapa interactivo con tu ubicación.</span>
                  </p>
                  <p className="leading-relaxed border-t border-indigo-100/50 pt-1.5">
                    <strong className="text-indigo-600 mr-1.5">Paso C:</strong>
                    <span>Presiona <strong>"Registrar Entrada / Salida"</strong> para guardar.</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Selfie */}
              <div className="p-4 bg-pink-50/30 rounded-2xl border border-pink-100/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-pink-500 text-white rounded-lg">
                    <Camera size={16} />
                  </div>
                  <h4 className="text-xs font-extrabold text-pink-900 uppercase tracking-wider">2. Foto Selfie</h4>
                </div>
                <p className="text-xs text-pink-950/80 leading-relaxed">
                  Acredita tu presencia visualmente usando la cámara frontal.
                </p>
                <div className="text-xs space-y-2 text-pink-950 bg-white/70 p-3 rounded-xl border border-pink-100">
                  <p className="leading-relaxed">
                    <strong className="text-pink-600 mr-1.5">Paso A:</strong>
                    <span>Elige <strong>"Tomar Selfie"</strong> y otorga permisos de cámara en tu navegador.</span>
                  </p>
                  <p className="leading-relaxed border-t border-pink-100/50 pt-1.5">
                    <strong className="text-pink-600 mr-1.5">Paso B:</strong>
                    <span>Encuadra tu rostro y presiona <strong>"Capturar Foto"</strong>.</span>
                  </p>
                  <p className="leading-relaxed border-t border-pink-100/50 pt-1.5">
                    <strong className="text-pink-600 mr-1.5">Paso C:</strong>
                    <span>Presiona <strong>"Confirmar y Guardar"</strong> (la foto se comprime de forma automática).</span>
                  </p>
                </div>
              </div>

              {/* Card 3: QR */}
              <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-500 text-white rounded-lg">
                    <QrCode size={16} />
                  </div>
                  <h4 className="text-xs font-extrabold text-teal-900 uppercase tracking-wider">3. Código QR de Supervisor</h4>
                </div>
                <p className="text-xs text-teal-950/80 leading-relaxed">
                  Ideal si te encuentras físicamente al lado del supervisor o ingeniero a cargo.
                </p>
                <div className="text-xs space-y-2 text-teal-950 bg-white/70 p-3 rounded-xl border border-teal-100">
                  <p className="leading-relaxed">
                    <strong className="text-teal-600 mr-1.5">Supervisor:</strong>
                    <span>Genera un código QR dinámico desde la pestaña <strong>"Generar QR"</strong> (cambia cada 30 segundos).</span>
                  </p>
                  <p className="leading-relaxed border-t border-teal-100/50 pt-1.5">
                    <strong className="text-teal-600 mr-1.5">Colaborador:</strong>
                    <span>Selecciona <strong>"Escanear QR"</strong> y apunta tu cámara al QR en la pantalla del supervisor.</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
