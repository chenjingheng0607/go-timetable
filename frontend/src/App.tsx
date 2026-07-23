import { useRef, useEffect } from 'react';
import { Theme } from './types';
import { useTheme } from './hooks/useTheme';
import { useRosterActions } from './hooks/useRosterActions';
import { useSelections } from './hooks/useSelections';
import { useImageExport } from './hooks/useImageExport';
import { Toolbar } from './components/Toolbar';
import { RosterGrid } from './components/RosterGrid';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentTheme, toggleTheme, applyThemeCSS } = useTheme();
  const {
    rosterData,
    selections,
    setSelections,
    statusMsg,
    statusColor,
    go,
    setStatusMsg,
    setStatusColor,
    handleLoadFile,
    handleSaveState,
    handleGenerateDraft,
    handleClear,
  } = useRosterActions();

  const theme: Theme = rosterData?.config?.themes?.[currentTheme] || ({} as Theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (theme.bgMain) {
      applyThemeCSS(theme);
    }
  }, [currentTheme, theme, applyThemeCSS]);

  const selectionProps = useSelections(selections, setSelections, rosterData, theme);

  const { handleExportImage } = useImageExport(rosterData, containerRef, go, setStatusMsg, setStatusColor);

  return (
    <div className="app-container">
      <Toolbar
        statusMsg={statusMsg}
        statusColor={statusColor}
        currentTheme={currentTheme}
        onLoadFile={handleLoadFile}
        onSaveState={handleSaveState}
        onClear={handleClear}
        onExportImage={handleExportImage}
        onToggleTheme={toggleTheme}
      />
      <div className="main-content" ref={containerRef}>
        <div className="grid-section">
          <div className="scroll-area">
            <RosterGrid
              rosterData={rosterData}
              selections={selections}
              onSelectionChange={selectionProps.onSelectionChange}
              getDisplayName={selectionProps.getDisplayName}
              getAvailableOptions={selectionProps.getAvailableOptions}
              isBassLocked={selectionProps.isBassLocked}
            />
          </div>
        </div>
        <div className="dash-section">
          <div className="scroll-area">
            <Dashboard
              rosterData={rosterData}
              selections={selections}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
