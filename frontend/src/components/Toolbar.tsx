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
  // Ensure handlers are bound and not disabled; log to console on click for Android WebView debugging
  const wrap = (name: string, fn: () => void) => () => {
    try {
      console.log(`[Toolbar] ${name} clicked`);
      fn();
    } catch (e) {
      console.error(`[Toolbar] ${name} handler error:`, e);
    }
  };
  return (
    <div className="toolbar">
      <button type="button" onClick={wrap("LoadFile", onLoadFile)}>Load File</button>
      <button type="button" onClick={wrap("SaveState", onSaveState)}>Save State</button>
      <span className="status" style={{ color: statusColor }}>{statusMsg}</span>
      <div className="toolbar-right">
        <button type="button" className="btn-sm" onClick={wrap("Clear", onClear)}>Clear</button>
        <button type="button" className="btn-sm" onClick={wrap("ExportImage", onExportImage)}>Export Image</button>
        <button type="button" className="btn-sm" onClick={wrap("ToggleTheme", onToggleTheme)}>Theme: {currentTheme}</button>
      </div>
    </div>
  );
}
