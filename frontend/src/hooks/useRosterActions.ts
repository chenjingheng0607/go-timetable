import { useState, useCallback } from 'react';
import { RosterData } from '../types';
import { buildSelectionsFromDraft } from '../utils';

declare const window: any;

export function useRosterActions() {
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState("No file loaded");
  const [statusColor, setStatusColor] = useState("red");

  const go = useCallback(() => window.go.main.App, []);

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

  return {
    rosterData,
    setRosterData,
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
  };
}
