package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type App struct {
	engine *RosterEngine
}

func NewApp() *App {
	return &App{engine: NewRosterEngine()}
}

// ServiceStartup is called by Wails v3 during app startup.
// It guarantees a.app is ready and the engine is initialised.
func (a *App) ServiceStartup(_ context.Context, _ application.ServiceOptions) error {
	if a.engine == nil {
		a.engine = NewRosterEngine()
	}
	return nil
}

func (a *App) ServiceShutdown() error { return nil }

func (a *App) GetConfig() ConfigData {
	return getConfigData()
}

func (a *App) GetRosterData() RosterData {
	return a.engine.BuildRosterData()
}

// ---------------------------------------------------------------------------
// Platform-aware helpers (Desktop fs vs Android SAF / sandbox)
// ---------------------------------------------------------------------------

func isAndroid() bool { return runtime.GOOS == "android" }

// resolveFilePath handles Android SAF quirks:
// - On Android, Wails copies picked documents into cache and returns a real
//   filesystem path, so normally this is a no-op.
// - If a content:// URI leaks through (older alpha / manual intent), we
//   surface a clear error instead of passing it to os.ReadFile/excelize.
func resolveFilePath(path string) (string, error) {
	if strings.HasPrefix(path, "content://") {
		return "", fmt.Errorf("content URI not directly readable: %s (Wails Android should copy to cache; report if seen)", path)
	}
	return path, nil
}

// sandboxSavePath returns a writable path inside the app sandbox.
// On Android save dialogs are unsupported, so we route directly to public Download
// (/storage/emulated/0/Download) for user-visible files per spec.
// Falls back to internal cache only if Download is inaccessible.
func sandboxSavePath(filename string) string {
	if isAndroid() {
		const downloadDir = "/storage/emulated/0/Download"
		// Ensure Download exists and test writability
		_ = os.MkdirAll(downloadDir, 0755)
		if _, err := os.Stat(downloadDir); err == nil {
			testPath := filepath.Join(downloadDir, ".wails_write_test")
			if f, err := os.Create(testPath); err == nil {
				f.Close()
				os.Remove(testPath)
				return filepath.Join(downloadDir, filename)
			}
			// Stat succeeded but write test failed — still try Download (MediaStore may allow)
			// If direct write fails later, caller will get error and can fallback
			// For now, prefer Download if it exists (user asked for it)
			return filepath.Join(downloadDir, filename)
		}
		// Fallback: app-private cache (always writable)
		if dir, err := os.UserCacheDir(); err == nil && dir != "" && dir != "/data/local/tmp" {
			_ = os.MkdirAll(dir, 0755)
			return filepath.Join(dir, filename)
		}
		if tmp := os.TempDir(); tmp != "" && tmp != "/data/local/tmp" {
			_ = os.MkdirAll(tmp, 0o755)
			return filepath.Join(tmp, filename)
		}
		const fallback = "/data/user/0/com.example.gotimetable/cache"
		_ = os.MkdirAll(fallback, 0755)
		return filepath.Join(fallback, filename)
	}
	// Desktop: prefer config dir, then cache, then temp.
	if dir, err := os.UserConfigDir(); err == nil && dir != "" {
		_ = os.MkdirAll(dir, 0o755)
		return filepath.Join(dir, filename)
	}
	if dir, err := os.UserCacheDir(); err == nil && dir != "" {
		_ = os.MkdirAll(dir, 0o755)
		return filepath.Join(dir, filename)
	}
	return filepath.Join(os.TempDir(), filename)
}

// dialog helpers — keep call-sites short and handle nil app (tests)
func getDialog() *application.DialogManager {
	if app := application.Get(); app != nil {
		return app.Dialog
	}
	return nil
}

func promptOpenFile(title, displayName, pattern string) (string, error) {
	dm := getDialog()
	if dm == nil {
		return "", fmt.Errorf("dialog manager unavailable (app not started)")
	}
	return dm.OpenFile().
		SetTitle(title).
		AddFilter(displayName, pattern).
		PromptForSingleSelection()
}

func promptSaveFile(title, filename, displayName, pattern string) (string, error) {
	if isAndroid() {
		return "", fmt.Errorf("save file dialogs are not supported on Android: write the file inside the app sandbox (e.g. the app's files directory) instead")
	}
	dm := getDialog()
	if dm == nil {
		return "", fmt.Errorf("dialog manager unavailable (app not started)")
	}
	// SaveFileDialogStruct has no SetTitle in v3.0.0-beta.14 — use SetOptions to set Title, then chain Filename/Filter
	d := dm.SaveFile()
	d.SetOptions(&application.SaveFileDialogOptions{Title: title})
	return d.SetFilename(filename).
		AddFilter(displayName, pattern).
		PromptForSingleSelection()
}

// ---------------------------------------------------------------------------
// Bound methods (exposed to frontend via Wails v3 bindings)
// ---------------------------------------------------------------------------

func (a *App) LoadFile() (RosterData, error) {
	path, err := promptOpenFile("Open Roster File", "Roster Files (*.xlsx, *.json)", "*.xlsx;*.json")
	if err != nil {
		return RosterData{}, err
	}
	if path == "" {
		return a.engine.BuildRosterData(), nil
	}
	if resolved, err := resolveFilePath(path); err != nil {
		return RosterData{}, err
	} else {
		path = resolved
	}
	// Android: fallback to Download for cross-device files
	if isAndroid() {
		if _, err := os.Stat(path); err != nil {
			alt := filepath.Join("/storage/emulated/0/Download", filepath.Base(path))
			if _, errAlt := os.Stat(alt); errAlt == nil {
				path = alt
			}
		}
	}

	if strings.HasSuffix(strings.ToLower(path), ".json") {
		data, err := os.ReadFile(path)
		if err != nil {
			return RosterData{}, err
		}

		var state struct {
			WeekColumns     []string                       `json:"weekColumns"`
			AllMembers      map[string]MemberInfo          `json:"allMembers"`
			AvailabilityMap map[string]map[string][]string `json:"availabilityMap"`
			Selections      map[string]string              `json:"selections"`
			CleanupOptions  []string                       `json:"cleanupOptions"`
		}

		if err := json.Unmarshal(data, &state); err != nil {
			return RosterData{}, err
		}

		a.engine.WeekColumns = state.WeekColumns
		a.engine.AllMembers = state.AllMembers
		a.engine.AvailabilityMap = state.AvailabilityMap
		a.engine.CleanupOptions = state.CleanupOptions

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

	var path string
	if isAndroid() {
		path = sandboxSavePath("roster_state.json")
	} else {
		p, err := promptSaveFile("Save State", "roster_state.json", "JSON Files (*.json)", "*.json")
		if err != nil {
			return err
		}
		if p == "" {
			return nil
		}
		path = p
	}

	data := map[string]interface{}{
		"weekColumns":     a.engine.WeekColumns,
		"allMembers":      a.engine.AllMembers,
		"availabilityMap": a.engine.AvailabilityMap,
		"selections":      selections,
		"cleanupOptions":  a.engine.GetCleanupOptions(),
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
	path, err := promptOpenFile("Load State", "JSON Files (*.json)", "*.json")
	if err != nil {
		return RosterData{}, err
	}
	if path == "" {
		return a.engine.BuildRosterData(), nil
	}
	if resolved, err := resolveFilePath(path); err != nil {
		return RosterData{}, err
	} else {
		path = resolved
	}
	// Android: fallback to Download for cross-device files
	if isAndroid() {
		if _, err := os.Stat(path); err != nil {
			alt := filepath.Join("/storage/emulated/0/Download", filepath.Base(path))
			if _, errAlt := os.Stat(alt); errAlt == nil {
				path = alt
			}
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return RosterData{}, err
	}

	var state struct {
		WeekColumns     []string                       `json:"weekColumns"`
		AllMembers      map[string]MemberInfo          `json:"allMembers"`
		AvailabilityMap map[string]map[string][]string `json:"availabilityMap"`
		Selections      map[string]string              `json:"selections"`
		CleanupOptions  []string                       `json:"cleanupOptions"`
	}

	if err := json.Unmarshal(data, &state); err != nil {
		return RosterData{}, err
	}

	a.engine.WeekColumns = state.WeekColumns
	a.engine.AllMembers = state.AllMembers
	a.engine.AvailabilityMap = state.AvailabilityMap
	a.engine.CleanupOptions = state.CleanupOptions

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

	var path string
	if isAndroid() {
		path = sandboxSavePath("roster.xlsx")
	} else {
		p, err := promptSaveFile("Save Excel", "roster.xlsx", "Excel Files (*.xlsx)", "*.xlsx")
		if err != nil {
			return err
		}
		if p == "" {
			return nil
		}
		path = p
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
	var path string
	if isAndroid() {
		timestamp := time.Now().Format("20060102_1504")
		filename := fmt.Sprintf("roster_%s.png", timestamp)
		path = sandboxSavePath(filename)
	} else {
		p, err := promptSaveFile("Save Image", "roster.png", "PNG (*.png)", "*.png")
		if err != nil {
			return err
		}
		if p == "" {
			return nil
		}
		path = p
	}

	if err := saveBase64PNG(base64Data, path); err != nil {
		return err
	}
	if isAndroid() {
		// Trigger media scan so PNG appears immediately in Gallery / Files
		go func(p string) {
			cmd := exec.Command("am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE", "-d", "file://"+p)
			_ = cmd.Run()
		}(path)
	}
	return nil
}
