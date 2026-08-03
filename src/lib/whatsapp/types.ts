export interface IncomingWhatsappPayload {
  messageId: string;
  groupId: string;
  groupName?: string;
  senderPhone: string;
  senderName?: string;
  messageText?: string;
  mediaUrls?: string[];
  timestamp?: number; // Epoch seconds or ms
}

export interface ExtractedPart {
  name: string;
  quantity: number;
  providerType: 'COTIZAR' | 'CLIENTE';
}

export interface GeminiParsedReport {
  manPowerEquipo: string | null; // e.g. "EQ-0105", "G-02"
  workOrderFolio: string | null; // e.g. "S06447"
  title: string;
  weekendNotes: string | null;
  equipmentStatus: 'OPERATIVO' | 'FUERA_DE_SERVICIO' | 'DEGRADADO' | null;
  suggestedAction: string | null;
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
  parts: ExtractedPart[];
  isComplete: boolean;
  missingFields: string[]; // e.g. ["manPowerEquipo"]
}
