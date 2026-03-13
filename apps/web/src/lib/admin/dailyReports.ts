export type DailyReportFishCatch = {
  speciesId: string;
  speciesNameSnapshot: string;
  subspeciesId: string;
  subspeciesNameSnapshot: string;
  count: number;
};

export type DailyReportRecord = {
  captainId: string;
  captainNameSnapshot: string;
  captainEmailSnapshot: string;
  dateKey: string;
  reportDate: string;
  notes: string;
  fishCatches: DailyReportFishCatch[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const dailyReportsCollectionPath = ["admin", "data", "dailyReports"] as const;

export function dailyReportDocPath(reportId: string) {
  return [...dailyReportsCollectionPath, reportId] as const;
}

export function buildDailyReportId(captainId: string, dateKey: string) {
  return `${captainId}_${dateKey}`;
}

export function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
