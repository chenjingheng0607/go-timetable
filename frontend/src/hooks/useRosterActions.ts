import { useState } from 'react';
import { RosterData } from '../types';
import { buildSelectionsFromDraft } from '../utils';
import { LoadFile, SaveState, GenerateDraft, ClearSelections } from "../../bindings/go-timetable/app";

export function useRosterActions() {
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState("No file loaded");
  const [statusColor, setStatusColor] = useState("red");

  async function handleLoadFile() {
    try {
      console.log("[LoadFile] invoking Wails binding");
      const data = (await LoadFile()) as unknown as RosterData;
      console.log("[LoadFile] success", data?.weekColumns?.length, "weeks");
      if (data && data.weekColumns && data.weekColumns.length > 0) {
        setRosterData(data);
        setSelections(buildSelectionsFromDraft(data));
        setStatusMsg("Loaded Excel successfully");
        setStatusColor("#4CAF50");
      } else if (data) {
        setRosterData(data);
        setStatusMsg("Loaded (no weeks)");
        setStatusColor("#FFA500");
      }
    } catch (err: any) {
      console.error("[LoadFile] failed:", err);
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleSaveState() {
    try {
      console.log("[SaveState] invoking with", Object.keys(selections).length, "selections");
      await SaveState(selections);
      console.log("[SaveState] success");
      setStatusMsg("Saved to Download/roster_state.json");
      setStatusColor("#4CAF50");
    } catch (err: any) {
      console.error("[SaveState] failed:", err);
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleGenerateDraft() {
    if (!rosterData) {
      console.warn("[GenerateDraft] no rosterData");
      setStatusMsg("No file loaded");
      setStatusColor("red");
      return;
    }
    try {
      console.log("[GenerateDraft] invoking");
      const data = (await GenerateDraft()) as unknown as RosterData;
      console.log("[GenerateDraft] success");
      setRosterData(data);
      setSelections(buildSelectionsFromDraft(data));
      setStatusMsg("Draft generated");
      setStatusColor("#4CAF50");
    } catch (err: any) {
      console.error("[GenerateDraft] failed:", err);
      setStatusMsg("Error: " + (err.message || err));
      setStatusColor("red");
    }
  }

  async function handleClear() {
    if (!rosterData) {
      console.warn("[Clear] no rosterData");
      return;
    }
    try {
      if (!window.confirm("Clear all?")) {
        console.log("[Clear] cancelled by user");
        return;
      }
    } catch (confirmErr) {
      console.error("[Clear] confirm failed:", confirmErr);
      // Fall through to clear anyway on Android where confirm may be unsupported
    }
    try {
      console.log("[Clear] invoking ClearSelections");
      const data = (await ClearSelections()) as unknown as RosterData;
      console.log("[Clear] success");
      setRosterData(data);
      setSelections({});
      setStatusMsg("Cleared");
      setStatusColor("#4CAF50");
    } catch (err: any) {
      console.error("[Clear] failed:", err);
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
    setStatusMsg,
    setStatusColor,
    handleLoadFile,
    handleSaveState,
    handleGenerateDraft,
    handleClear,
  };
}
