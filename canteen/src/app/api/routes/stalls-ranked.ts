import { app } from '@/lib/hono';
import { db } from '@/db';
import { stalls, rankingSnapshots } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withRetry } from '@/lib/retry';
import { serializeForJson } from '@/lib/db-utils';

function calculateStallScore(
  avgRating: number,
  totalReviews: number,
  totalViews: number
): number {
  const ratingScore = avgRating * 20;

  const reviewWeight = Math.min(
    1.0,
    0.7 + (Math.log(totalReviews + 1) / Math.log(100)) * 0.3
  );

  const viewWeight = Math.min(
    1.0,
    0.85 + (Math.log(totalViews + 1) / Math.log(500)) * 0.15
  );

  return ratingScore * reviewWeight * viewWeight;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

app.get('/stalls/ranked', async (c) => {
  const cafeteriaId = c.req.query('cafeteriaId');

  const where = cafeteriaId ? eq(stalls.cafeteriaId, cafeteriaId) : undefined;

  const allStalls = await withRetry(() =>
    (db as any).query.stalls.findMany({
      where,
      orderBy: desc(stalls.totalReviews),
      with: {
        cafeteria: true,
        merchant: {
          columns: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })
  );

  // Calculate scores and sort first, then assign rank
  const rankedStalls = (allStalls as any[])
    .map((stall) => ({
      ...stall,
      score: calculateStallScore(
        parseFloat(stall.avgRating),
        stall.totalReviews,
        stall.totalViews
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((stall, index) => ({
      ...stall,
      rank: index + 1,
      ratingChange: 0, // default, will be overwritten below
    }));

  // Query yesterday's snapshot to compute ratingChange
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  try {
    const snapshots = await withRetry(() =>
      (db as any).query.rankingSnapshots.findMany({
        where: eq(rankingSnapshots.snapshotDate, yesterdayStr),
      })
    );

    if (snapshots && snapshots.length > 0) {
      const snapshotMap = new Map<string, number>();
      for (const snap of snapshots) {
        snapshotMap.set(snap.stallId, parseFloat(snap.avgRating));
      }

      for (const stall of rankedStalls) {
        const yesterdayRating = snapshotMap.get(stall.id);
        if (yesterdayRating !== undefined) {
          stall.ratingChange = parseFloat((parseFloat(stall.avgRating) - yesterdayRating).toFixed(1));
        }
      }
    }
  } catch {
    // If snapshot query fails, keep ratingChange as 0
  }

  return c.json({
    success: true,
    data: serializeForJson(rankedStalls),
  });
});

export { calculateStallScore };
