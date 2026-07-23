interface ToolbarProps {
  statusMsg: string;
  statusColor: string;
  currentTheme: "Dark" | "Light";
  onLoadFile: () => void;
  onSaveState: () => void;
  onClear: () => void;
  onExportImage: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({
  statusMsg,
  statusColor,
  currentTheme,
  onLoadFile,
  onSaveState,
  onClear,
  onExportImage,
  onToggleTheme,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button onClick={onLoadFile}>Load File</button>
      <button onClick={onSaveState}>Save State</button>
      <span className="status" style={{ color: statusColor }}>{statusMsg}</span>
      <div className="toolbar-right">
        <button className="btn-sm" onClick={onClear}>Clear</button>
        <button className="btn-sm" onClick={onExportImage}>Export Image</button>
        <button className="btn-sm" onClick={onToggleTheme}>Theme: {currentTheme}</button>
      </div>
    </div>
  );
}
