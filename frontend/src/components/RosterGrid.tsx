import { RosterData } from '../types';
import { ROLES_ORDER } from '../constants';
import { getCellValue } from '../utils';

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
