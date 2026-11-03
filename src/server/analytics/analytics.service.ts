import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { forms, submissions } from "../db/schema.ts";

export type DateRange = { from: Date; to: Date };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resolveRange(from?: string, to?: string): DateRange {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: startOfDay(start), to: end };
}

function previousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - duration), to: new Date(range.from.getTime() - 1) };
}

async function projectFormIds(projectId: string): Promise<string[]> {
  const rows = await db.select({ id: forms.id, name: forms.name }).from(forms).where(eq(forms.projectId, projectId));
  return rows.map((r) => r.id);
}

async function countIn(formIds: string[], from: Date, to: Date): Promise<number> {
  if (!formIds.length) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(and(inArray(submissions.formId, formIds), gte(submissions.createdAt, from), lte(submissions.createdAt, to)));
  return Number(rows[0]?.count || 0);
}

export async function getOverview(projectId: string, range: DateRange) {
  const formRows = await db.select({ id: forms.id, name: forms.name }).from(forms).where(eq(forms.projectId, projectId));
  const formIds = formRows.map((f) => f.id);
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [total, today, week, month, rangeCount] = await Promise.all([
    formIds.length
      ? db.select({ count: sql<number>`count(*)` }).from(submissions).where(inArray(submissions.formId, formIds)).then((r) => Number(r[0]?.count || 0))
      : 0,
    countIn(formIds, todayStart, now),
    countIn(formIds, weekStart, now),
    countIn(formIds, monthStart, now),
    countIn(formIds, range.from, range.to),
  ]);

  const prev = previousRange(range);
  const prevCount = await countIn(formIds, prev.from, prev.to);

  const rows = formIds.length
    ? await db
        .select()
        .from(submissions)
        .where(and(inArray(submissions.formId, formIds), gte(submissions.createdAt, range.from), lte(submissions.createdAt, range.to)))
    : [];

  const byDay = new Map<string, number>();
  const byHour = Array.from({ length: 24 }, () => 0);
  const byForm = new Map<string, number>();
  const byDevice = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  const byBrowser = { Chrome: 0, Firefox: 0, Safari: 0, Edge: 0, Other: 0 };
  const byCountry = new Map<string, number>();

  const cursor = new Date(range.from);
  while (cursor <= range.to) {
    byDay.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
    byHour[row.createdAt.getHours()] += 1;
    byForm.set(row.formId, (byForm.get(row.formId) || 0) + 1);
    const device = (row.deviceType || "unknown") as keyof typeof byDevice;
    if (device in byDevice) byDevice[device] += 1;
    else byDevice.unknown += 1;
    const browser = (row.browser || "Other") as keyof typeof byBrowser;
    if (browser in byBrowser) byBrowser[browser] += 1;
    else byBrowser.Other += 1;
    if (row.country) byCountry.set(row.country, (byCountry.get(row.country) || 0) + 1);
  }

  const formNameMap = new Map(formRows.map((f) => [f.id, f.name]));
  const recent = formIds.length
    ? await db
        .select()
        .from(submissions)
        .where(inArray(submissions.formId, formIds))
        .orderBy(sql`${submissions.createdAt} desc`)
        .limit(8)
    : [];

  return {
    stats: {
      total,
      today,
      week,
      month,
      range: rangeCount,
      previousRange: prevCount,
      changePercent: prevCount === 0 ? null : Math.round(((rangeCount - prevCount) / prevCount) * 100),
    },
    activity: [...byDay.entries()].map(([date, count]) => ({ date, count })),
    hourly: byHour.map((count, hour) => ({ hour, count })),
    forms: formRows.map((f) => ({ formId: f.id, name: f.name, count: byForm.get(f.id) || 0 })),
    devices: byDevice,
    browsers: byBrowser,
    countries: [...byCountry.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    recent: recent.map((r) => ({
      id: r.id,
      formName: formNameMap.get(r.formId) || "Unknown",
      createdAt: r.createdAt,
      deviceType: r.deviceType,
      status: r.status,
    })),
  };
}
