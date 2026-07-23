import { RosterData, Theme } from '../types';
import { ROLES_ORDER, BAND_ROLES } from '../constants';
import { getCellValue } from '../utils';

export function useSelections(
  selections: Record<string, string>,
  setSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  rosterData: RosterData | null,
  theme: Theme,
) {
  function onSelectionChange(week: string, role: string, value: string) {
    const key = week + "::" + role;
    const newSelections = { ...selections, [key]: value };
    if (role === "MD") {
      updateMDSuffixes(week, value, newSelections);
    }
    setSelections({ ...newSelections });
  }

  function updateMDSuffixes(week: string, mdName: string, sels: Record<string, string>) {
    for (const role of ROLES_ORDER) {
      if (role === "MD") continue;
      const key = week + "::" + role;
      if (sels[key]) {
        sels[key] = sels[key].replace(" (MD)", "");
      }
    }
  }

  function getDisplayName(week: string, role: string, cleanName: string): string {
    if (!cleanName) return "";
    const mdRaw = getCellValue(selections, rosterData, week, "MD");
    const mdClean = mdRaw.replace(" (MD)", "").trim();
    if (mdClean && cleanName === mdClean && role !== "MD") {
      return cleanName + " (MD)";
    }
    return cleanName;
  }

  function getAvailableOptions(week: string, role: string): string[] {
    if (!rosterData) return [];
    const avail = rosterData.availabilityMap[week]?.[role];
    if (!avail) return [];

    if (role === "MD") {
      const potentials: string[] = [];
      for (const br of BAND_ROLES) {
        const val = getCellValue(selections, rosterData, week, br);
        const valClean = val.replace(" (MD)", "").trim();
        if (valClean) {
          const roles = rosterData.allMembers[valClean]?.roles || [];
          if (roles.includes("MD")) potentials.push(valClean);
        }
      }
      return [...new Set(potentials)].sort();
    }

    const currVal = getCellValue(selections, rosterData, week, role).replace(" (MD)", "").trim();

    const busy: string[] = [];
    for (const r of ROLES_ORDER) {
      if (r === role || r === "MD") continue;
      const val = getCellValue(selections, rosterData, week, r).replace(" (MD)", "").trim();
      if (val) busy.push(val);
    }

    const filtered = avail.filter(p => !busy.includes(p) || p === currVal);
    if (!role.includes("Cleanup")) {
      filtered.sort();
    }
    return filtered;
  }

  function getValidationStyle(week: string, role: string): string {
    if (!rosterData) return "";
    const txt = getCellValue(selections, rosterData, week, role);
    const val = txt.replace(" (MD)", "").trim();
    if (!val) return "";
    const bg = theme.inputBg || "#333";

    if (role === "MD") {
      const inBand = BAND_ROLES.some(br => {
        const bv = getCellValue(selections, rosterData, week, br).replace(" (MD)", "").trim();
        return bv === val;
      });
      if (!inBand) return `color: red; background-color: ${bg};`;
    }

    const seen: Record<string, boolean> = {};
    const dupes: string[] = [];
    for (const r of ROLES_ORDER) {
      if (r === "MD") continue;
      const v = getCellValue(selections, rosterData, week, r).replace(" (MD)", "").trim();
      if (v) {
        if (seen[v]) dupes.push(v);
        seen[v] = true;
      }
    }
    if (val && dupes.includes(val)) {
      return `color: red; background-color: ${bg};`;
    }

    return `color: ${theme.fgPri || '#fff'}; background-color: ${bg};`;
  }

  function isBassLocked(_week: string): boolean {
    return false;
  }

  return {
    onSelectionChange,
    getDisplayName,
    getAvailableOptions,
    getValidationStyle,
    isBassLocked,
  };
}
