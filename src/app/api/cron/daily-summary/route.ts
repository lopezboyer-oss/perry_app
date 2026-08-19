import { NextRequest, NextResponse } from 'next/server';

// GET or POST /api/cron/daily-summary?secret=YOUR_CRON_SECRET
// Called by cron-job.org daily at 8 PM Tijuana time.
// This is a LIGHTWEIGHT TRIGGER that immediately returns 202 Accepted,
// then fires the actual heavy processing to /api/cron/daily-summary/worker.
export async function GET(req: NextRequest) {
  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}

async function handleCronTrigger(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET (via query param or header)
    const { searchParams } = new URL(req.url);
    const secretFromUrl = searchParams.get('secret');
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isAuthorized = cronSecret && (
      secretFromUrl === cronSecret ||
      authHeader === `Bearer ${cronSecret}`
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fire-and-forget: trigger the worker endpoint (separate Netlify function)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
    const workerUrl = `${appUrl}/api/cron/daily-summary/worker?secret=${cronSecret}`;

    // Don't await — the worker runs as its own Netlify function with a 60s timeout
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(err => {
      // Log but don't fail — the worker is already running independently
      console.error('[CRON] Failed to trigger worker:', err.message);
    });

    // 3. Return immediately (within <2s) so cron-job.org doesn't timeout
    return NextResponse.json({
      status: 'Worker triggered',
      message: 'Summary generation started in background. Check WhatsApp group for result.',
      triggeredAt: new Date().toISOString(),
    }, { status: 202 });

  } catch (error: any) {
    console.error('[CRON] Trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
