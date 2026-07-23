import { RosterData } from './types';
import { ROLES_ORDER } from './constants';

export function getCellValue(sels: Record<string, string>, data: RosterData | null, week: string, role: string): string {
  const key = week + "::" + role;
  if (key in sels) return sels[key] ?? "";
  return data?.initialRoster?.[week]?.[role] ?? "";
}

export function buildSelectionsFromDraft(data: RosterData): Record<string, string> {
  const sels: Record<string, string> = {};
  for (const week of data.weekColumns) {
    for (const role of ROLES_ORDER) {
      const val = data.initialRoster[week]?.[role] ?? "";
      sels[week + "::" + role] = val.replace(" (MD)", "").trim();
    }
  }
  return sels;
}
