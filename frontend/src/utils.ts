import { RosterData } from './types';
import { ROLES_ORDER } from './constants';

function getRelativeLuminance(fill: string): number | null {
  const hex = fill.trim().replace('#', '');
  const expanded = hex.length === 3
    ? hex.split('').map(char => char + char).join('')
    : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  const channels = [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function getCategoryHeaderStyle(fill: string) {
  const luminance = getRelativeLuminance(fill);
  return {
    backgroundColor: fill,
    color: luminance === null || luminance > 0.179 ? 'black' : 'white',
  };
}

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
