package main

import (
	"encoding/base64"
	"os"
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

	return os.WriteFile(path, decoded, 0644)
}
