/**
 * Internal API endpoint for processing pending conversion events.
 * This should be called by a cron job or background task.
 * NOT for direct user access.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildPurchaseEventPayload, sendCapiEvent } from '@/lib/meta-capi';

export const runtime = 'nodejs';

// Max 25 events per batch to avoid timeouts
const BATCH_SIZE = 25;
const MAX_RETRIES = 3;

export async function POST(request: Request) {
  try {
    // Verify this is an internal request - requires INTERNAL_API_KEY
    const expectedKey = process.env.INTERNAL_API_KEY;
    const authHeader = request.headers.get('authorization');
    const providedKey = authHeader?.replace(/^Bearer\s+/, '');

    // In production, always require valid key
    // In development, allow missing key but validate if provided
    if (process.env.NODE_ENV === 'production') {
      if (!expectedKey || !providedKey || providedKey !== expectedKey) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else if (expectedKey && providedKey && providedKey !== expectedKey) {
      // In development, if key is configured, it must be valid
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch pending conversion events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingEvents = await (prisma as any).conversionEvent.findMany({
      where: {
        status: 'PENDING',
        attemptCount: { lt: MAX_RETRIES },
      },
      include: { order: { include: { items: true } } },
      take: BATCH_SIZE,
    });

    if (pendingEvents.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results = [];

    for (const event of pendingEvents) {
      try {
        const payload = JSON.parse(event.payload);

        const capiPayload = buildPurchaseEventPayload({
          ...payload,
        });

        const sentEventId = await sendCapiEvent(capiPayload);

        if (sentEventId) {
          // Update as sent
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).conversionEvent.update({
            where: { id: event.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          results.push({
            eventId: event.eventId,
            status: 'sent',
            metaEventId: sentEventId,
          });
        } else {
          // Update attempt count and error
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).conversionEvent.update({
            where: { id: event.id },
            data: {
              attemptCount: { increment: 1 },
              lastError: 'Meta API returned error or timeout',
            },
          });

          results.push({
            eventId: event.eventId,
            status: 'failed',
            error: 'Meta API error',
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Conversion event processing error', {
          eventId: event.eventId,
          error: errorMessage,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).conversionEvent.update({
          where: { id: event.id },
          data: {
            attemptCount: { increment: 1 },
            lastError: errorMessage,
          },
        });

        results.push({
          eventId: event.eventId,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      processed: pendingEvents.length,
      results,
    });
  } catch (error) {
    console.error('Conversion processing failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 }
    );
  }
}
