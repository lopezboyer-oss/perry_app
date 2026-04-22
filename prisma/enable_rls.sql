-- ═══════════════════════════════════════════════════════════════
-- SUPABASE SECURITY FIX: Enable RLS on ALL tables
-- ═══════════════════════════════════════════════════════════════
-- 
-- This script enables Row-Level Security on all public tables.
-- Since the app uses Prisma with a direct PostgreSQL connection
-- (service_role), NOT the Supabase PostgREST API, we DON'T need
-- to create permissive policies. RLS with no policies = no access
-- through the public API, which is exactly what we want.
--
-- The Prisma connection uses the service_role key which BYPASSES
-- RLS by default, so the app continues working normally.
-- ═══════════════════════════════════════════════════════════════

-- Core tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;

-- Personnel & Weekend Assignment tables
ALTER TABLE "Technician" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafetyDedicado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendTechAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeekendSafetyAssignment" ENABLE ROW LEVEL SECURITY;

-- Prisma internal table (if exists)
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
