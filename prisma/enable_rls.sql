-- ═══════════════════════════════════════════════════════════════
-- SUPABASE SECURITY FIX: Enable RLS on ALL tables
-- ═══════════════════════════════════════════════════════════════
-- 
-- This script enables Row-Level Security on all public tables.
-- Since the app uses Prisma with a direct PostgreSQL connection
-- (postgres superuser), NOT the Supabase PostgREST API, we DON'T
-- need to create permissive policies. RLS with no policies = no
-- access through the public API, which is exactly what we want.
--
-- The Prisma connection uses the postgres superuser which BYPASSES
-- RLS by default, so the app continues working normally.
--
-- This script is IDEMPOTENT — safe to run multiple times.
--
-- Last updated: 2026-05-25 (covers all 23 models)
-- ═══════════════════════════════════════════════════════════════

-- ── Core tables ──
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;

-- ── Time Registry ──
ALTER TABLE "TimeRegistryEntry" ENABLE ROW LEVEL SECURITY;

-- ── Personnel & Resources ──
ALTER TABLE "Technician" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contractor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafetyDedicado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElevationEquip" ENABLE ROW LEVEL SECURITY;

-- ── Weekend Assignments ──
ALTER TABLE "WeekendTechAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendSafetyAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendVehicleAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendDriverAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendEquipAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendUserSafetyAssignment" ENABLE ROW LEVEL SECURITY;

-- ── Planning ──
ALTER TABLE "ExtraPlanDay" ENABLE ROW LEVEL SECURITY;

-- ── Financial ──
ALTER TABLE "InvoiceReceipt" ENABLE ROW LEVEL SECURITY;

-- ── Multi-empresa ──
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCompany" ENABLE ROW LEVEL SECURITY;

-- ── Equipment Records ──
ALTER TABLE "EquipRecord" ENABLE ROW LEVEL SECURITY;

-- ── Time Clock Personal ──
ALTER TABLE "TimeClockEntry" ENABLE ROW LEVEL SECURITY;

-- ── Prisma internal ──
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
