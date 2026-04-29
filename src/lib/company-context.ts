// Company context helpers for multi-company Perry
// Resolves the active company for any request based on role, cookies, and user access

import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE_NAME = 'perry_active_company';

/**
 * Get the active company ID for the current request.
 * 
 * Logic:
 * 1. Check cookie perry_active_company
 * 2. Validate user has access to that company
 * 3. Fallback to user's default company
 * 
 * For ADMIN with "ALL" selected: returns null (consolidated view)
 */
export async function getActiveCompanyId(
  userId: string,
  role: string,
  userCompanyIds: string[],
  defaultCompanyId: string | null,
): Promise<string | null> {
  const cookieStore = cookies();
  const cookieVal = cookieStore.get(COOKIE_NAME)?.value;

  // ADMIN can select "ALL"
  if (cookieVal === 'ALL' && role === 'ADMIN') return null;

  // If cookie is set and user has access, use it
  if (cookieVal && userCompanyIds.includes(cookieVal)) {
    return cookieVal;
  }

  // Fallback to default company
  return defaultCompanyId || userCompanyIds[0] || null;
}

/**
 * Get the Prisma where filter for company-scoped queries.
 * Returns {} for ADMIN consolidated view (no filter needed).
 */
export function getCompanyWhereFilter(
  activeCompanyId: string | null,
): { companyId: string } | {} {
  if (!activeCompanyId) return {}; // ADMIN "ALL" — no filter
  return { companyId: activeCompanyId };
}

/**
 * Convenience: get company filter from cookies + role in one call.
 * Use this in server pages/API routes.
 */
export function getCompanyFilterFromCookies(role: string): { companyId: string } | {} {
  const cookieStore = cookies();
  const cookieVal = cookieStore.get(COOKIE_NAME)?.value;

  // ADMIN with "ALL" = no filter
  if (cookieVal === 'ALL' && role === 'ADMIN') return {};

  // If a specific company is selected
  if (cookieVal && cookieVal !== 'ALL') return { companyId: cookieVal };

  // No cookie set — return empty (will show all for ADMIN, or need baseCompanyId)
  return {};
}

/**
 * Get user's companies with full details for the CompanySwitcher.
 */
export async function getUserCompanies(userId: string) {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true, name: true, shortName: true,
          odooId: true, color: true, sortOrder: true,
        },
      },
    },
    orderBy: { company: { sortOrder: 'asc' } },
  });

  return userCompanies.map(uc => ({
    ...uc.company,
    isDefault: uc.isDefault,
  }));
}
