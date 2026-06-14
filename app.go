package main

import (
	"context"
	"encoding/json"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx    context.Context
	engine *RosterEngine
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.engine = NewRosterEngine()
}

func (a *App) GetConfig() ConfigData {
	return getConfigData()
}

func (a *App) GetRosterData() RosterData {
	return a.engine.BuildRosterData()
}

func (a *App) LoadFile() (RosterData, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open Excel",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return RosterData{}, err
	}
	if path == "" {
		return a.engine.BuildRosterData(), nil
	}

	if err := a.engine.LoadFile(path); err != nil {
		return RosterData{}, err
	}
	a.engine.GenerateDraft()
	return a.engine.BuildRosterData(), nil
}

func (a *App) SaveState(selections map[string]string) error {
	if len(a.engine.WeekColumns) == 0 {
		return nil
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save State",
		DefaultFilename: "roster_state.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}

	data := map[string]interface{}{
		"weekColumns":     a.engine.WeekColumns,
		"allMembers":      a.engine.AllMembers,
		"availabilityMap": a.engine.AvailabilityMap,
		"selections":      selections,
	}

	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

func (a *App) LoadState() (RosterData, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Load State",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return RosterData{}, err
	}
	if path == "" {
		return a.engine.BuildRosterData(), nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return RosterData{}, err
	}

	var state struct {
		WeekColumns     []string              `json:"weekColumns"`
		AllMembers      map[string]MemberInfo `json:"allMembers"`
		AvailabilityMap map[string]map[string][]string `json:"availabilityMap"`
		Selections      map[string]string     `json:"selections"`
	}

	if err := json.Unmarshal(data, &state); err != nil {
		return RosterData{}, err
	}

	a.engine.WeekColumns = state.WeekColumns
	a.engine.AllMembers = state.AllMembers
	a.engine.AvailabilityMap = state.AvailabilityMap

	if a.engine.AvailabilityMap == nil {
		a.engine.AvailabilityMap = make(map[string]map[string][]string)
	}

	a.engine.InitialRoster = make(map[string]map[string]string)
	for _, week := range a.engine.WeekColumns {
		a.engine.InitialRoster[week] = make(map[string]string)
	}

	for key, val := range state.Selections {
		parts := strings.SplitN(key, "::", 2)
		if len(parts) == 2 {
			week, role := parts[0], parts[1]
			if _, ok := a.engine.InitialRoster[week]; ok {
				a.engine.InitialRoster[week][role] = val
			}
		}
	}

	return a.engine.BuildRosterData(), nil
}

func (a *App) GenerateDraft() RosterData {
	a.engine.GenerateDraft()
	return a.engine.BuildRosterData()
}

func (a *App) ClearSelections() RosterData {
	a.engine.ClearRoster()
	return a.engine.BuildRosterData()
}

func (a *App) ExportExcel(selections map[string]string) error {
	if len(a.engine.WeekColumns) == 0 {
		return nil
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Excel",
		DefaultFilename: "roster.xlsx",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel Files (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}

	f := excelizeNewFile()
	sheetName := "Sheet1"

	exportRoles := []string{}
	for _, r := range RolesOrder {
		if r != "MD" {
			exportRoles = append(exportRoles, r)
		}
	}

	header := []string{"Week", "Band Mode"}
	header = append(header, exportRoles...)
	for ci, h := range header {
		cell, _ := excelizeColumnIndexToLetters(ci + 1)
		f.SetCellValue(sheetName, cell+"1", h)
	}

	for ri, week := range a.engine.WeekColumns {
		row := ri + 2
		f.SetCellValue(sheetName, cellRef(0, row), week)

		r := map[string]string{}
		for _, role := range exportRoles {
			val := selections[week+"::"+role]
			r[role] = val
		}

		hd := r["Drum/Cajon"] != ""
		hk := r["Piano"] != ""
		hb := r["Bass"] != ""
		mode := "INCOMPLETE"
		if hb {
			mode = "FULL BAND"
		} else if hd && hk {
			mode = "ACOUSTIC SET"
		}
		f.SetCellValue(sheetName, cellRef(1, row), mode)

		for ci, role := range exportRoles {
			f.SetCellValue(sheetName, cellRef(ci+2, row), r[role])
		}
	}

	if err := f.SaveAs(path); err != nil {
		return err
	}
	return nil
}

func (a *App) ExportImage(base64Data string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Image",
		DefaultFilename: "roster.png",
		Filters: []runtime.FileFilter{
			{DisplayName: "PNG (*.png)", Pattern: "*.png"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}

	return saveBase64PNG(base64Data, path)
}
