import { useState, useEffect } from 'react';
import { Theme } from '../types';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<"Dark" | "Light">("Dark");

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

  function toggleTheme() {
    setCurrentTheme(prev => prev === "Dark" ? "Light" : "Dark");
  }

  return { currentTheme, toggleTheme, applyThemeCSS };
}
