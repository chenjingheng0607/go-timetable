import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import { RosterData } from '../types';

export function useImageExport(
  rosterData: RosterData | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  go: () => any,
  setStatusMsg: (msg: string) => void,
  setStatusColor: (color: string) => void,
) {
  const handleExportImage = useCallback(async () => {
    if (!rosterData) return;
    const el = containerRef.current;
    if (!el) return;
    try {
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
        '.export-capture .roster-grid { border-collapse: collapse !important; }',
        '.export-capture .roster-grid th, .export-capture .roster-grid td {',
        'border: 1px solid #000000 !important; padding: 6px 8px !important;',
        'text-align: center !important; background-color: #ffffff !important; color: #000000 !important;',
        '}',
        '.export-capture .roster-grid th { background-color: #e0e0e0 !important; font-weight: bold !important; }',
        '.export-capture .week-header, .export-capture .week-cell { background-color: #e8e8e8 !important; }',
        '.export-capture .col-sep, .export-capture .col-sep-cell { display: none !important; }',
        '.export-capture .roster-grid td *, .export-capture .roster-grid th *,',
        '.export-capture .dash-member > *, .export-capture .dash-member-empty > * {',
        'background: transparent !important; border: none !important;',
        'box-shadow: none !important; border-radius: 0 !important;',
        'margin: 0 !important; padding: 0 !important;',
        '}',
        '.export-capture .dash-grid {',
        'width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;',
        'display: flex !important; justify-content: flex-start !important;',
        'align-items: flex-start !important; gap: 16px !important;',
        '}',
        '.export-capture .dash-category-col {',
        'flex: 0 0 auto !important; width: auto !important;',
        'box-sizing: border-box !important; overflow: hidden !important;',
        'border: 1px solid #000000 !important;',
        '}',
        '.export-capture .dash-category-col:nth-child(1) .dash-role-grid {',
        'grid-template-columns: repeat(7, 1fr) !important;',
        '}',
        '.export-capture .dash-role-grid {',
        'display: grid !important; width: 100% !important; overflow: hidden !important;',
        '}',
        '.export-capture .dash-role-grid > * {',
        'min-width: 0 !important;',
        'border: none !important;',
        'border-right: 1px solid #e0e0e0 !important;',
        '}',
        '.export-capture .dash-category-col:nth-child(1) .dash-role-grid > :nth-child(7n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(2) .dash-role-grid > :nth-child(3n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(3) .dash-role-grid > * { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(4) .dash-role-grid > :nth-child(3n) { border-right: none !important; }',
        '.export-capture .dash-category-col:nth-child(5) .dash-role-grid > :nth-child(2n) { border-right: none !important; }',
        '.export-capture .dash-role-header {',
        'display: flex !important; width: 100% !important; box-sizing: border-box !important;',
        'text-align: center !important;',
        'border-bottom: 1px solid #000000 !important;',
        'margin-bottom: 4px !important; padding-bottom: 4px !important;',
        'background-color: #ffffff !important; color: #000000 !important; font-weight: bold !important;',
        '}',
        '.export-capture .dash-cat-header { font-weight: bold !important; }',
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
        '.export-capture .dash-grid, .export-capture .dash-category-col,',
        '.export-capture .dash-role-grid, .export-capture .dash-role-header {',
        'background: #ffffff !important; background-color: #ffffff !important; box-shadow: none !important;',
        '}',
        '.export-capture .dash-member, .export-capture .dash-member-empty {',
        'background: #ffffff !important; background-color: #ffffff !important;',
        '}',
        '.export-capture .dash-member-warn {',
        'background: #ffcccc !important; background-color: #ffcccc !important; color: #000000 !important;',
        '}',
        '.export-capture .dash-member-note {',
        'background: #ffeeb0 !important; background-color: #ffeeb0 !important; color: #000000 !important;',
        '}',
        '.export-capture .dash-role-header, .export-capture .dash-member,',
        '.export-capture .dash-member-empty, .export-capture .mem-name,',
        '.export-capture .mem-count, .export-capture .mem-dots,',
        '.export-capture .dot-dash {',
        'color: #222222 !important;',
        '}',
        '.export-capture .dash-category-col { border: 1px solid #000000 !important; }',
        '.export-capture .dash-role-grid > * { border-right: 1px solid #cccccc !important; }',
        '.export-capture .dash-role-header { border-bottom: 1px solid #000000 !important; }',
        '.export-capture .dash-member, .export-capture .dash-member-empty { border-bottom: 1px solid #cccccc !important; }',
        '.export-capture .dash-role-header { background: #eeeeee !important; background-color: #eeeeee !important; }',
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
  }, [rosterData, containerRef, go, setStatusMsg, setStatusColor]);

  return { handleExportImage };
}
