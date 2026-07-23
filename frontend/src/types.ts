export interface RosterData {
  weekColumns: string[];
  allMembers: Record<string, MemberInfo>;
  availabilityMap: Record<string, Record<string, string[]>>;
  initialRoster: Record<string, Record<string, string>>;
  config: ConfigData;
}

export interface MemberInfo {
  roles: string[];
  availString: string;
}

export interface ConfigData {
  rolesOrder: string[];
  bandRoles: string[];
  cleanupOptions: string[];
  categoryConfig: Record<string, CategoryConfigItem>;
  themes: Record<string, Theme>;
  roleToCat: Record<string, RoleCat>;
}

export interface CategoryConfigItem {
  roles: string[];
  color: string;
  textCol: string;
}

export interface RoleCat {
  cat: string;
  color: string;
}

export interface Theme {
  bgMain: string;
  bgSec: string;
  fgPri: string;
  fgSec: string;
  inputBg: string;
  inputBorder: string;
  inputSel: string;
  dashBgWarn: string;
  dashBgNotice: string;
  dashTextAvail: string;
  dashTextUnavail: string;
  activeCellText: string;
  cats: Record<string, string>;
}
