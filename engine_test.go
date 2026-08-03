package main

import (
	"testing"
)

func TestLoadFileWithLifeGroupSheet(t *testing.T) {
	engine := NewRosterEngine()
	err := engine.LoadFile("Aug Unavailability.xlsx")
	if err != nil {
		t.Fatalf("failed to load Aug Unavailability.xlsx: %v", err)
	}

	opts := engine.GetCleanupOptions()
	if len(opts) == 0 {
		t.Fatalf("expected non-empty CleanupOptions from Life Group sheet")
	}

	expectedLG := []string{"LB", "LHW", "YGSS", "PK", "SJS", "FM"}
	if len(opts) != len(expectedLG) {
		t.Errorf("expected %d cleanup options, got %d (%v)", len(expectedLG), len(opts), opts)
	}

	for i, exp := range expectedLG {
		if i < len(opts) && opts[i] != exp {
			t.Errorf("at index %d, expected %s, got %s", i, exp, opts[i])
		}
	}

	// Verify Cleanup 1 availability map contains FM
	for _, week := range engine.WeekColumns {
		c1Avail := engine.AvailabilityMap[week]["Cleanup 1"]
		foundFM := false
		for _, item := range c1Avail {
			if item == "FM" {
				foundFM = true
				break
			}
		}
		if !foundFM {
			t.Errorf("expected FM in Cleanup 1 availability map for week %s", week)
		}
	}
}
