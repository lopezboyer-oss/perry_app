import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const activitySchema = z.object({
  date: z.string().min(1, 'La fecha es requerida'),
  userId: z.string().min(1, 'El responsable es requerido'),
  type: z.enum(['VISITA_CAMPO', 'COTIZACION', 'EJECUCION', 'PLANEACION', 'DISENO'], {
    errorMap: () => ({ message: 'Tipo de actividad no válido' }),
  }),
  status: z.enum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA']).default('PENDIENTE'),
  title: z.string().min(1, 'El título es requerido').max(500),
  clientId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  workOrderFolio: z.string().optional().nullable(),
  purchaseOrder: z.string().optional().nullable(),
  projectArea: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  nextStep: z.string().optional().nullable(),
  commitmentDate: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  durationMinutes: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
