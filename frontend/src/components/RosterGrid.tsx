import { Fragment } from 'react';
import { RosterData } from '../types';
import { CATEGORY_ORDER } from '../constants';
import { getCategoryHeaderStyle, getCellValue } from '../utils';

interface RosterGridProps {
  rosterData: RosterData | null;
  selections: Record<string, string>;
  onSelectionChange: (week: string, role: string, value: string) => void;
  getDisplayName: (week: string, role: string, cleanName: string) => string;
  getAvailableOptions: (week: string, role: string) => string[];
  isBassLocked: (week: string) => boolean;
}

export function RosterGrid({
  rosterData,
  selections,
  onSelectionChange,
  getDisplayName,
  getAvailableOptions,
  isBassLocked,
}: RosterGridProps) {
  if (!rosterData) return <div className="empty-state">Load an Excel file to begin</div>;
  const { weekColumns, config } = rosterData;
  const roleSections = CATEGORY_ORDER.map(title => ({
    title,
    roles: config.categoryConfig[title]?.roles || [],
  })).filter(section => section.roles.length > 0);

  const bodyRows = weekColumns.map(week => {
    const cells: React.ReactNode[] = [
      <td key="week" className="week-cell">{week}</td>
    ];
    roleSections.forEach(section => {
      section.roles.forEach(role => {
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
    });
    return <tr key={week}>{cells}</tr>;
  });

  return (
    <div className="grid-wrapper">
      <table className="roster-grid">
        <thead>
          <tr>
            <th className="week-header" rowSpan={2}>Week</th>
            {roleSections.map(section => (
              <th
                key={section.title}
                className="section-heading"
                colSpan={section.roles.length}
                style={getCategoryHeaderStyle(config.categoryConfig[section.title].color)}
              >
                {section.title}
              </th>
            ))}
          </tr>
          <tr>
            {roleSections.map(section => (
              <Fragment key={section.title}>
                {section.roles.map(role => {
                  return (
                    <th
                      key={role}
                      className="role-header"
                    >
                      {role}
                    </th>
                  );
                })}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
