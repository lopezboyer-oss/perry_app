export interface IncomingWhatsappPayload {
  messageId: string;
  groupId: string;
  groupName?: string;
  senderPhone: string;
  senderName?: string;
  messageText?: string;
  mediaUrls?: string[];
  messageType?: 'text' | 'image' | 'audio' | 'ptt' | 'document' | 'video' | 'sticker';
  timestamp?: number; // Epoch seconds or ms
}

export interface ExtractedPart {
  name: string;
  quantity: number;
  providerType: 'COTIZAR' | 'CLIENTE';
}

export interface GeminiParsedReport {
  messageType: 'WORK_REPORT' | 'ISSUE_ALERT' | 'MATERIAL_REQUEST' | 'COORDINATION' | 'CLIENT_REQUEST' | 'GENERAL_OPERATIONAL' | 'SOCIAL_CHAT' | 'DIRECT_PRIVATE_CHAT';
  manPowerEquipo: string | null; // e.g. "EQ-0105", "G-02", "C-10"
  workOrderFolio: string | null; // e.g. "S06447"
  title: string;
  summary: string | null;
  transcription?: string | null; // Verbatim audio transcription from voice notes
  weekendNotes: string | null;
  equipmentStatus: 'OPERATIVO' | 'FUERA_DE_SERVICIO' | 'DEGRADADO' | null;
  suggestedAction: string | null;
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
  parts: ExtractedPart[];
  tags: string[]; // e.g. ["mantenimiento", "falla_hidraulica", "refaccion", "llegada_sitio"]
  isOperationalEvent: boolean; // true if contains relevant field operations, equipment, or logistics
  isComplete: boolean;
  missingFields: string[];
}


