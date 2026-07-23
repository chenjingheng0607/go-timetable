import { RosterData, Theme } from '../types';
import { ROLES_ORDER, CATEGORY_ORDER } from '../constants';
import { getCellValue } from '../utils';

interface DashboardProps {
  rosterData: RosterData | null;
  selections: Record<string, string>;
  theme: Theme;
}

export function Dashboard({ rosterData, selections, theme }: DashboardProps) {
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
