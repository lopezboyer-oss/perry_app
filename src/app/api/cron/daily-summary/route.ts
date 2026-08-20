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

    // 2. Trigger the worker endpoint and wait just long enough to confirm it was received
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://perryapp.netlify.app';
    const workerUrl = `${appUrl}/api/cron/daily-summary/worker?secret=${cronSecret}`;

    // We await the fetch but with a short timeout — we just need to confirm the request
    // reached Netlify. The worker function runs independently with its own 60s timeout.
    const controller = new AbortController();
    const shortTimeout = setTimeout(() => controller.abort(), 8000); // 8s max wait

    let workerTriggered = false;
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(shortTimeout);
      workerTriggered = true;
      console.log(`[CRON] Worker triggered, status: ${res.status}`);
    } catch (err: any) {
      clearTimeout(shortTimeout);
      if (err.name === 'AbortError') {
        // Timeout is OK — worker is running, we just didn't wait for full response
        workerTriggered = true;
        console.log('[CRON] Worker triggered (timeout waiting for response, but request was sent)');
      } else {
        console.error('[CRON] Failed to trigger worker:', err.message);
      }
    }

    // 3. Return to cron-job.org (well within 30s)
    return NextResponse.json({
      status: workerTriggered ? 'Worker triggered' : 'Worker trigger may have failed',
      message: 'Summary generation started in background. Check WhatsApp group for result.',
      triggeredAt: new Date().toISOString(),
    }, { status: workerTriggered ? 202 : 500 });

  } catch (error: any) {
    console.error('[CRON] Trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
