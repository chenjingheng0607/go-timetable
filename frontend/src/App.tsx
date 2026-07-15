import { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

declare const window: any;

interface RosterData {
  weekColumns: string[];
  allMembers: Record<string, MemberInfo>;
  availabilityMap: Record<string, Record<string, string[]>>;
  initialRoster: Record<string, Record<string, string>>;
  config: ConfigData;
}

interface MemberInfo {
  roles: string[];
  availString: string;
}

interface ConfigData {
  rolesOrder: string[];
  bandRoles: string[];
  cleanupOptions: string[];
  categoryConfig: Record<string, CategoryConfigItem>;
  themes: Record<string, Theme>;
  roleToCat: Record<string, RoleCat>;
}

interface CategoryConfigItem {
  roles: string[];
  color: string;
  textCol: string;
}

interface RoleCat {
  cat: string;
  color: string;
}

interface Theme {
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

const ROLES_ORDER = [
  "MD", "Lead", "Vocal 1", "Vocal 2", "Piano", "Drum/Cajon", "Bass", "Guitar",
  "PPT", "Sound", "Lighting/OBS",
  "MC",
  "Usher 1", "Usher 2", "Usher 3",
  "Cleanup 1", "Cleanup 2",
];

const BAND_ROLES = ["Piano", "Bass", "Guitar"];
const CATEGORY_ORDER = ["Praise & Worship", "FPH", "MC", "Usher", "LG"];

function getCellValue(sels: Record<string, string>, data: RosterData | null, week: string, role: string): string {
  const key = week + "::" + role;
  if (key in sels) return sels[key] ?? "";
  return data?.initialRoster?.[week]?.[role] ?? "";
}

function App() {
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState("No file loaded");
  const [statusColor, setStatusColor] = useState("red");
  const [currentTheme, setCurrentTheme] = useState<"Dark" | "Light">("Dark");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const theme: Theme = rosterData?.config?.themes?.[currentTheme] || ({} as Theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (theme.bgMain) {
      applyThemeCSS(theme);
    }
  }, [currentTheme, theme]);

  const go = useCallback(() => window.go.main.App, []);

  function applyThemeCSS(t: Theme) {
    const root = document.documentElement;
    root.style.setProperty('--bg-main', t.bgMain);
    root.style.setProperty('--bg-sec', t.bgSec);
    root.style.setProperty('--fg-pri', t.fgPri);
    root.style.setProperty('--fg-sec', t.fgSec);
    root.style.setProperty('--input-bg', t.inputBg);
    root.style.setProperty('--input-border', t.inputBorder);
    root.style.setProperty('--input-sel', t.inputSel);
    root.style.setProperty('--dash-bg-warn', t.dashBgWarn);
    root.style.setProperty('--dash-bg-notice', t.dashBgNotice);
    root.style.setProperty('--dash-text-unavail', t.dashTextUnavail);
    root.style.setProperty('--active-cell-text', t.activeCellText);
  }

  async function handleLoadFile() {
    try {
      const data: RosterData = await go().LoadFile();
      if (data && data.weekColumns && data.weekColumns.length > 0) {
        setRosterData(data);
        setSelections(buildSelectionsFromDraft(data));
        setStatusMsg("Loaded Excel successfully");
        setStatusColor("#4CAF50");
      } else if (data) {
        setRosterData(data);
      }
    } catch (err: any) {
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleSaveState() {
    try {
      await go().SaveState(selections);
    } catch (err: any) {
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleGenerateDraft() {
    if (!rosterData) return;
    try {
      const data: RosterData = await go().GenerateDraft();
      setRosterData(data);
      setSelections(buildSelectionsFromDraft(data));
      setStatusMsg("Draft generated");
      setStatusColor("#4CAF50");
    } catch (err: any) {
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleClear() {
    if (!rosterData) return;
    if (!window.confirm("Clear all?")) return;
    try {
      const data: RosterData = await go().ClearSelections();
      setRosterData(data);
      setSelections({});
      setStatusMsg("Cleared");
      setStatusColor("#4CAF50");
    } catch (err: any) {
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleExportImage() {
    if (!rosterData) return;
    const el = containerRef.current;
    if (!el) return;
    try {
      // Capture select values from live DOM (React-controlled value property NOT preserved by cloneNode)
      const liveSelects = el.querySelectorAll<HTMLSelectElement>('select.role-select');
      const selectTexts: string[] = [];
      for (const sel of liveSelects) {
        selectTexts.push(sel.options[sel.selectedIndex]?.textContent || sel.value || '');
      }

      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = 'max-content';
      clone.style.minWidth = el.offsetWidth + 'px';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.fontFamily = "'Open Sans', sans-serif";
      const overridables = clone.querySelectorAll<HTMLElement>('.grid-section, .dash-section, .scroll-area');
      for (const e of overridables) {
        e.style.overflow = 'visible';
        e.style.height = 'auto';
        e.style.flex = 'none';
      }
      document.body.appendChild(clone);
      clone.classList.add('export-capture');

      // Replace native <select> elements with readable spans
      const clonedSelects = clone.querySelectorAll<HTMLSelectElement>('select.role-select');
      let selIdx = 0;
      for (const sel of clonedSelects) {
        const span = document.createElement('span');
        span.textContent = selectTexts[selIdx] || '';
        span.className = sel.className;
        span.style.cssText = [
          'display: inline-flex',
          'align-items: center',
          'justify-content: center',
          `width: ${sel.offsetWidth}px`,
          `height: ${sel.offsetHeight}px`,
          'background-color: #ffffff',
          'color: #000000',
          `font-family: 'Open Sans', Arial, sans-serif`,
          'font-size: 11px',
          'font-weight: 400',
          'border: 1px solid #000000',
          'border-radius: 2px',
          'padding: 1px 3px',
          'box-sizing: border-box',
          'text-align: center',
        ].join('; ');
        sel.parentNode?.replaceChild(span, sel);
        selIdx++;
      }

      // Apply export-specific light theme styles
      const exportStyle = document.createElement('style');
      exportStyle.textContent = [
        '.export-capture {',
        '--bg-main: #ffffff; --bg-sec: #f5f5f5; --fg-pri: #000000; --fg-sec: #444444;',
        '--input-bg: #ffffff; --input-border: #000000; --input-sel: #cce5ff;',
        '--dash-bg-warn: #ffcccc; --dash-bg-notice: #fff3cc;',
        '--dash-text-unavail: #999999; --active-cell-text: #000000;',
        '}',
        '.export-capture .app-container, .export-capture .app-container * { font-family: "Open Sans", sans-serif !important; }',
        '.export-capture .grid-section, .export-capture .dash-section, .export-capture .toolbar, .export-capture .main-content {',
        'background-color: #ffffff !important; color: #000000 !important;',
        '}',
        // Roster grid
        '.export-capture .roster-grid { border-collapse: collapse !important; }',
        '.export-capture .roster-grid th, .export-capture .roster-grid td {',
        'border: 1px solid #000000 !important; padding: 6px 8px !important;',
        'text-align: center !important; background-color: #ffffff !important; color: #000000 !important;',
        '}',
        '.export-capture .roster-grid th { background-color: #e0e0e0 !important; font-weight: bold !important; }',
        '.export-capture .week-header, .export-capture .week-cell { background-color: #e8e8e8 !important; }',
        '.export-capture .col-sep, .export-capture .col-sep-cell { display: none !important; }',
        // Strip inner element styling to prevent double-box effect
        '.export-capture .roster-grid td *, .export-capture .roster-grid th *,',
        '.export-capture .dash-member > *, .export-capture .dash-member-empty > * {',
        'background: transparent !important; border: none !important;',
        'box-shadow: none !important; border-radius: 0 !important;',
        'margin: 0 !important; padding: 0 !important;',
        '}',
        // Dashboard — 5 independent card blocks side by side
        '.export-capture .dash-grid {',
        'width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;',
        'display: flex !important; justify-content: flex-start !important;',
        'align-items: flex-start !important; gap: 16px !important;',
        '}',
        // Each category is a bordered card sized to its content
        '.export-capture .dash-category-col {',
        'flex: 0 0 auto !important; width: auto !important;',
        'box-sizing: border-box !important; overflow: hidden !important;',
        'border: 1px solid #000000 !important;',
        '}',
        // P&W card: force 7-column grid (MD column excluded)
        '.export-capture .dash-category-col:nth-child(1) .dash-role-grid {',
        'grid-template-columns: repeat(7, 1fr) !important;',
        '}',
        '.export-capture .dash-role-grid {',
        'display: grid !important; width: 100% !important; overflow: hidden !important;',
        '}',
        // Vertical gridlines between role columns
        '.export-capture .dash-role-grid > * {',
        'min-width: 0 !important;',
        'border: none !important;',
        'border-right: 1px solid #e0e0e0 !important;',
        '}',
        // Last-column gridlines removed per category
        '.export-capture .dash-category-col:nth-child(1) .dash-role-grid > :nth-child(7n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(2) .dash-role-grid > :nth-child(3n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(3) .dash-role-grid > * { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(4) .dash-role-grid > :nth-child(3n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(5) .dash-role-grid > :nth-child(2n) { border-right: none !important; }',
        // Sub-role headers: solid black baseline with spacing
        '.export-capture .dash-role-header {',
        'display: flex !important; width: 100% !important; box-sizing: border-box !important;',
        'text-align: center !important;',
        'border-bottom: 1px solid #000000 !important;',
        'margin-bottom: 4px !important; padding-bottom: 4px !important;',
        'background-color: #ffffff !important; color: #000000 !important; font-weight: bold !important;',
        '}',
        '.export-capture .dash-cat-header { font-weight: bold !important; }',
        // Data rows with vertical spacing and bottom separator
        '.export-capture .dash-member {',
        'display: flex !important; justify-content: space-between !important;',
        'align-items: center !important; width: 100% !important; box-sizing: border-box !important;',
        'gap: 6px !important;',
        'padding: 6px 4px !important; min-height: 35px !important;',
        'border-bottom: 1px solid #f0f0f0 !important;',
        '}',
        '.export-capture .dash-member-empty {',
        'padding: 6px 4px !important; width: 100% !important; box-sizing: border-box !important;',
        'min-height: 35px !important;',
        'border-bottom: 1px solid #f0f0f0 !important;',
        '}',
        '.export-capture .mem-name {',
        'color: #000000 !important; font-size: 12px !important; font-weight: 600 !important;',
        'white-space: nowrap !important; overflow: visible !important;',
        'text-overflow: clip !important; flex-grow: 1 !important; text-align: left !important;',
        '}',
        '.export-capture .mem-dots {',
        'font-size: 10px !important; white-space: nowrap !important;',
        'flex-shrink: 0 !important; display: flex !important;',
        'gap: 2px !important; align-items: center !important;',
        '}',
        '.export-capture .mem-count {',
        'color: #666666 !important; font-size: 10px !important;',
        'white-space: nowrap !important; flex-shrink: 0 !important;',
        '}',
        '.export-capture .legend, .export-capture .empty-state { color: #000000 !important; }',
        // Brute-force white panels (excl. category headers)
        '.export-capture .dash-grid, .export-capture .dash-category-col,',
        '.export-capture .dash-role-grid, .export-capture .dash-role-header {',
        'background: #ffffff !important; background-color: #ffffff !important; box-shadow: none !important;',
        '}',
        // Data rows: white defaults
        '.export-capture .dash-member, .export-capture .dash-member-empty {',
        'background: #ffffff !important; background-color: #ffffff !important;',
        '}',
        // Highlighted rows: match Python PNG export
        '.export-capture .dash-member-warn {',
        'background: #ffcccc !important; background-color: #ffcccc !important; color: #000000 !important;',
        '}',
        '.export-capture .dash-member-note {',
        'background: #ffeeb0 !important; background-color: #ffeeb0 !important; color: #000000 !important;',
        '}',
        // Dark text for content (not category headers)
        '.export-capture .dash-role-header, .export-capture .dash-member,',
        '.export-capture .dash-member-empty, .export-capture .mem-name,',
        '.export-capture .mem-count, .export-capture .mem-dots,',
        '.export-capture .dot-dash {',
        'color: #222222 !important;',
        '}',
        // Card border and internal grid lines
        '.export-capture .dash-category-col { border: 1px solid #000000 !important; }',
        '.export-capture .dash-role-grid > * { border-right: 1px solid #cccccc !important; }',
        '.export-capture .dash-role-header { border-bottom: 1px solid #000000 !important; }',
        '.export-capture .dash-member, .export-capture .dash-member-empty { border-bottom: 1px solid #cccccc !important; }',
        // Role sub-header: Python PNG export uses #eee
        '.export-capture .dash-role-header { background: #eeeeee !important; background-color: #eeeeee !important; }',
        // Status X: Python PNG export uses #ccc
        '.export-capture .dot-x { color: #cccccc !important; }',
      ].join('\n');
      clone.appendChild(exportStyle);

      const canvas = await html2canvas(clone, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      document.body.removeChild(clone);

      const base64 = canvas.toDataURL("image/png");
      await go().ExportImage(base64);
    } catch (err: any) {
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  function toggleTheme() {
    setCurrentTheme(prev => prev === "Dark" ? "Light" : "Dark");
  }

  function onSelectionChange(week: string, role: string, value: string) {
    const key = week + "::" + role;
    const newSelections = { ...selections, [key]: value };
    // If MD changed, update suffixes for all roles in this week
    if (role === "MD") {
      updateMDSuffixes(week, value, newSelections);
    } else {
      // Check if this person is the MD for this week
      const mdKey = week + "::MD";
      if (newSelections[mdKey] && newSelections[mdKey] === value) {
        // If person selected as MD, keep their name clean
      }
    }

    setSelections({ ...newSelections });
  }

  function updateMDSuffixForWeek(week: string) {
    // No-op in state-based approach; display handles suffixes
  }

  function updateMDSuffixes(week: string, mdName: string, sels: Record<string, string>) {
    // When MD changes, clean any MD suffixes from other roles in this week
    for (const role of ROLES_ORDER) {
      if (role === "MD") continue;
      const key = week + "::" + role;
      if (sels[key]) {
        const clean = sels[key].replace(" (MD)", "");
        sels[key] = clean;
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

    // Bass validation removed - bass role no longer requires piano assignment, allowing non-pianists to play bass independently

    return `color: ${theme.fgPri || '#fff'}; background-color: ${bg};`;
  }

  function isBassLocked(week: string): boolean {
    // Removed restriction: Bass selection now always available - any member can select regardless of piano assignment
    return false;
  }

  function renderToolbar() {
    return (
      <div className="toolbar">
        <button onClick={handleLoadFile}>Load File</button>
        <button onClick={handleSaveState}>Save State</button>
        <span className="status" style={{ color: statusColor }}>{statusMsg}</span>
        <div className="toolbar-right">
          <button className="btn-sm" onClick={handleClear}>Clear</button>
          <button className="btn-sm" onClick={handleExportImage}>Export Image</button>
          <button className="btn-sm" onClick={toggleTheme}>Theme: {currentTheme}</button>
        </div>
      </div>
    );
  }

  function renderRosterGrid() {
    if (!rosterData) return <div className="empty-state">Load an Excel file to begin</div>;
    const { weekColumns, config } = rosterData;
    const rtc = config.roleToCat;
    const displayRoles = ROLES_ORDER;

    const headerCells: React.ReactNode[] = [
      <th key="week" className="week-header">Week</th>
    ];
    displayRoles.forEach((role, i) => {
      if (i > 0) {
        const prevInfo = rtc[displayRoles[i - 1]];
        const curInfo = rtc[role];
        if (prevInfo?.cat !== curInfo?.cat) {
          headerCells.push(<th key={"sp-" + role} className="col-sep" />);
        }
      }
      const info = rtc[role];
      headerCells.push(
        <th key={role} className="role-header" style={{ color: info?.color || '#fff' }}>
          {role}
        </th>
      );
    });

    const bodyRows = weekColumns.map(week => {
      const cells: React.ReactNode[] = [
        <td key="week" className="week-cell">{week}</td>
      ];
      displayRoles.forEach((role, ci) => {
        if (ci > 0) {
          const prevInfo = rtc[displayRoles[ci - 1]];
          const curInfo = rtc[role];
          if (prevInfo?.cat !== curInfo?.cat) {
            cells.push(<td key={"sp-" + week + "-" + role} className="col-sep-cell" />);
          }
        }
        const key = week + "::" + role;
        const currentVal = getCellValue(selections, rosterData, week, role);
        const cleanVal = currentVal.replace(" (MD)", "").trim();
        const locked = role === "Bass" && isBassLocked(week);
        cells.push(
          <td key={key}>
            <select
              value={cleanVal}
              disabled={locked}
              className="role-select"
              onChange={(e) => onSelectionChange(week, role, e.target.value)}
            >
              <option value=""></option>
              {getAvailableOptions(week, role).map(name => (
                <option key={name} value={name}>
                  {getDisplayName(week, role, name)}
                </option>
              ))}
            </select>
          </td>
        );
      });
      return <tr key={week}>{cells}</tr>;
    });

    return (
      <div className="grid-wrapper">
        <table className="roster-grid">
          <thead><tr>{headerCells}</tr></thead>
          <tbody>{bodyRows}</tbody>
        </table>
      </div>
    );
  }

  function renderDashboard() {
    if (!rosterData || !rosterData.weekColumns.length) return null;
    const { weekColumns, allMembers, config } = rosterData;

    const counts: Record<string, number> = {};
    const clCounts: Record<string, number> = {};
    const memActive: Record<string, Set<string>> = {};
    const clActive: Record<string, Set<string>> = {};

    for (const name of Object.keys(allMembers)) {
      counts[name] = 0;
      memActive[name] = new Set();
    }
    for (const o of config.cleanupOptions) {
      clCounts[o] = 0;
      clActive[o] = new Set();
    }

    const assignedMap: Record<string, Record<string, string>> = {};
    for (const w of weekColumns) {
      assignedMap[w] = {};
      for (const r of ROLES_ORDER) {
        const val = getCellValue(selections, rosterData, w, r).replace(" (MD)", "").trim();
        if (val) {
          assignedMap[w][val] = r;
          if (r.includes("Cleanup")) {
            if (clCounts[val] !== undefined) {
              clCounts[val]++;
              clActive[val].add(r);
            }
          } else if (r !== "MD") {
            if (counts[val] !== undefined) {
              counts[val]++;
              memActive[val].add(r);
            }
          }
        }
      }
    }

    const cats = config.categoryConfig;

    return (
      <div className="dashboard">
        <div className="legend">
          <span className="legend-label">LEGEND:</span>
          {CATEGORY_ORDER.map(cat => {
            const d = cats[cat];
            if (!d) return null;
            return (
              <span key={cat} className="legend-item" style={{ color: d.color }}>
                ■ {cat}
              </span>
            );
          })}
        </div>
        <div className="dash-grid">
          {CATEGORY_ORDER.map(cat => {
            const catData = cats[cat];
            if (!catData) return null;

            // Collect members per role (exclude MD — only used for name suffix)
            const filteredRoles = catData.roles.filter(r => r !== "MD");
            const roleData = filteredRoles.map(role => {
              const members: Array<{
                name: string;
                av: string;
                c: number;
                act: boolean;
                sv: number;
              }> = [];

              if (cat === "LG") {
                for (const o of config.cleanupOptions) {
                  const act = clActive[o]?.has(role) || false;
                  let sv = 2;
                  if (act) sv = (clCounts[o] || 0) >= 3 ? 0 : 1;
                  members.push({ name: o, av: "XXXX", c: clCounts[o] || 0, act, sv });
                }
              } else {
                for (const [name, info] of Object.entries(allMembers)) {
                  let can = false;
                  if (role.includes("Usher")) can = info.roles.includes("Usher");
                  else if (role.includes("Vocal")) can = info.roles.includes("Vocal");
                  else can = info.roles.includes(role);
                  if (can) {
                    const act = memActive[name]?.has(role) || false;
                    const cnt = counts[name] || 0;
                    let sv = 2;
                    if (act) sv = cnt >= 3 ? 0 : 1;
                    members.push({ name, av: info.availString, c: cnt, act, sv });
                  }
                }
              }

              members.sort((a, b) => {
                if (a.sv !== b.sv) return a.sv - b.sv;
                if (a.c !== b.c) return b.c - a.c;
                return a.name.localeCompare(b.name);
              });

              return { role, members };
            });

            const maxRows = Math.max(...roleData.map(rd => rd.members.length));

            return (
            <div key={cat} className="dash-category-col">
              <div className="dash-cat-header" style={{ backgroundColor: catData.color, color: catData.textCol }}>
                {cat}
              </div>
              <div className="dash-role-grid" style={{ gridTemplateColumns: `repeat(${filteredRoles.length}, 1fr)` }}>
                {roleData.map(rd => (
                  <div key={`h-${rd.role}`} className="dash-role-header">{rd.role}</div>
                ))}
                {Array.from({ length: maxRows }).map((_, ri) =>
                  roleData.map((rd, ci) => {
                    const m = rd.members[ri];
                    return (
                      <div key={`r${ri}-c${ci}`}
                        className={`dash-member${m ? '' : ' dash-member-empty'}${m && m.act ? (m.c >= 3 ? ' dash-member-warn' : ' dash-member-note') : ''}`}
                        style={m ? {
                          backgroundColor: m.act
                            ? (m.c >= 3 ? theme.dashBgWarn : theme.dashBgNotice)
                            : theme.bgSec,
                        } : {
                          backgroundColor: theme.bgSec,
                        }}
                      >
                        {m ? (
                          <>
                            <span className="mem-name" style={{ color: m.act ? theme.activeCellText : theme.fgPri }}>
                              {m.name}
                            </span>
                            <span className="mem-dots">
                              {cat === "LG" ? (
                                <span className="dot-dash">----</span>
                              ) : (
                                m.av.split('').map((c: string, i: number) => {
                                  let col = theme.fgPri;
                                  if (c === 'X') col = theme.dashTextUnavail;
                                  else {
                                    const wk = weekColumns[i];
                                    const assignedRole = assignedMap[wk]?.[m.name];
                                    if (assignedRole && rosterData.config.roleToCat[assignedRole]) {
                                      col = rosterData.config.roleToCat[assignedRole].color;
                                    }
                                  }
                                  return (
                                    <span key={i} className={`dot ${c === 'X' ? 'dot-x' : 'dot-o'}`} style={{ color: col }}>
                                      {c === 'X' ? 'X' : 'O'}
                                    </span>
                                  );
                                })
                              )}
                            </span>
                            <span className="mem-count">({m.c})</span>
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {renderToolbar()}
      <div className="main-content" ref={containerRef}>
        <div className="grid-section">
          <div className="scroll-area">
            {renderRosterGrid()}
          </div>
        </div>
        <div className="dash-section">
          <div className="scroll-area">
            {renderDashboard()}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

function buildSelectionsFromDraft(data: RosterData): Record<string, string> {
  const sels: Record<string, string> = {};
  for (const week of data.weekColumns) {
    for (const role of ROLES_ORDER) {
      const val = data.initialRoster[week]?.[role] ?? "";
      sels[week + "::" + role] = val.replace(" (MD)", "").trim();
    }
  }
  return sels;
}



export default App;
