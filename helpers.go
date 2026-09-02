package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

func excelizeNewFile() *excelize.File {
	return excelize.NewFile()
}

func excelizeColumnIndexToLetters(col int) (string, error) {
	return excelize.ColumnNumberToName(col)
}

func cellRef(col, row int) string {
	colName, err := excelize.ColumnNumberToName(col + 1)
	if err != nil {
		return "A" + strconv.Itoa(row)
	}
	return colName + strconv.Itoa(row)
}

func saveBase64PNG(base64Data string, path string) error {
	// Remove data URL prefix if present
	data := base64Data
	if idx := strings.Index(data, ","); idx >= 0 {
		data = data[idx+1:]
	}

	decoded, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return err
	}

	// Android SEAndroid blocks /data/local/tmp for regular apps.
	// If caller still passes a blocked path (e.g. legacy fallback), redirect to app cache.
	if runtime.GOOS == "android" && strings.HasPrefix(path, "/data/local/tmp") {
		if dir, err := os.UserCacheDir(); err == nil && dir != "" && dir != "/data/local/tmp" {
			path = filepath.Join(dir, filepath.Base(path))
		} else if tmp := os.TempDir(); tmp != "" && tmp != "/data/local/tmp" {
			path = filepath.Join(tmp, filepath.Base(path))
		} else {
			path = filepath.Join("/data/user/0/com.example.gotimetable/cache", filepath.Base(path))
		}
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, decoded, 0644)
}

// ---------------------------------------------------------------------------
// Android SAF / sandbox-aware I/O abstractions (used by app.go)
// ---------------------------------------------------------------------------

// isContentURI reports whether the dialog returned a Storage Access
// Framework content:// URI instead of a filesystem path.
func isContentURI(path string) bool { return strings.HasPrefix(path, "content://") }

// openExcelFromDialogPath opens an Excel file from a dialog-returned path.
// On Android the SAF picker copies the document into the app cache and
// returns a real path; if a content:// URI leaks through we return a clear
// error (Wails Android will handle this in future by copying).
func openExcelFromDialogPath(path string) (*excelize.File, error) {
	if isContentURI(path) {
		return nil, fmt.Errorf("content URI not yet resolved to filesystem path: %s", path)
	}
	// Ensure path exists and is readable (handles both desktop and Android cache paths)
	if _, err := os.Stat(path); err != nil {
		return nil, fmt.Errorf("file not accessible at %s: %w", path, err)
	}
	return excelize.OpenFile(path)
}

// writeToDialogPath writes raw bytes to a dialog-returned path, handling
// Android sandbox fallbacks. On Android save dialogs are unsupported, so
// callers should have already resolved to a sandbox path via sandboxSavePath.
func writeToDialogPath(path string, data []byte) error {
	if isContentURI(path) {
		return fmt.Errorf("cannot write to content:// URI directly: %s (write to sandbox and share via intent)", path)
	}
	// Guard against SEAndroid-blocked /data/local/tmp on Android.
	if runtime.GOOS == "android" && strings.HasPrefix(path, "/data/local/tmp") {
		if dir, err := os.UserCacheDir(); err == nil && dir != "" && dir != "/data/local/tmp" {
			path = filepath.Join(dir, filepath.Base(path))
		} else {
			path = filepath.Join("/data/user/0/com.example.gotimetable/cache", filepath.Base(path))
		}
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// copyFile is a small utility for tests / fallback copying of SAF content.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// isAndroidRuntime reports GOOS at runtime (desktop vs android/ios).
func isAndroidRuntime() bool { return runtime.GOOS == "android" }
