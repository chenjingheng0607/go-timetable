package main

import (
	"errors"
	"math/rand"
	"sort"
	"strings"

	"github.com/xuri/excelize/v2"
)

var errNoNameColumn = errors.New("could not find 'Name' column")

type RosterEngine struct {
	WeekColumns     []string
	AvailabilityMap map[string]map[string][]string
	InitialRoster   map[string]map[string]string
	AllMembers      map[string]MemberInfo
}

func NewRosterEngine() *RosterEngine {
	return &RosterEngine{}
}

func (e *RosterEngine) LoadFile(path string) error {
	f, err := excelize.OpenFile(path)
	if err != nil {
		return err
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return err
	}

	headerIdx := -1
	for i, row := range rows {
		for _, cell := range row {
			if strings.TrimSpace(cell) == "Name" {
				headerIdx = i
				break
			}
		}
		if headerIdx >= 0 {
			break
		}
	}
	if headerIdx < 0 {
		return errNoNameColumn
	}

	colMap := make(map[string]int)
	header := make([]string, len(rows[headerIdx]))
	for ci, cn := range rows[headerIdx] {
		clean := strings.TrimSpace(strings.ReplaceAll(cn, "\n", " "))
		colMap[clean] = ci
		header[ci] = clean
	}

	instCol := -1
	for name, idx := range colMap {
		u := strings.ToUpper(name)
		if strings.Contains(u, "INSTRUMENT") || (strings.Contains(u, "PIANO") && strings.Contains(u, "DRUM")) {
			instCol = idx
			break
		}
	}

	filledCol := -1
	for name, idx := range colMap {
		u := strings.ToUpper(name)
		if strings.Contains(u, "FILLED") || strings.Contains(u, "\u2705") {
			filledCol = idx
			break
		}
	}

	if instCol < 0 {
		return errors.New("could not find instrument column")
	}

	skip := make(map[int]bool)
	skip[instCol] = true
	if filledCol >= 0 {
		skip[filledCol] = true
	}

	fphCol := findColumn(rows, headerIdx, skip, []string{"FPH", "PRODUCTION", "HUB"})
	fmcCol := findColumn(rows, headerIdx, skip, []string{"FMC", "MC"})
	futCol := findColumn(rows, headerIdx, skip, []string{"FUT", "USHER"})

	type weekEntry struct {
		name string
		idx  int
	}
	var weekEntries []weekEntry
	for name, idx := range colMap {
		if strings.Contains(strings.ToUpper(name), "WEEK") || strings.Contains(strings.ToUpper(name), "WK") {
			weekEntries = append(weekEntries, weekEntry{name, idx})
		}
	}
	sort.Slice(weekEntries, func(i, j int) bool {
		return weekEntries[i].idx < weekEntries[j].idx
	})

	e.WeekColumns = make([]string, len(weekEntries))
	for i, we := range weekEntries {
		e.WeekColumns[i] = we.name
	}

	e.AvailabilityMap = make(map[string]map[string][]string)
	for _, week := range e.WeekColumns {
		am := make(map[string][]string)
		for _, role := range RolesOrder {
			am[role] = []string{}
		}
		am["Cleanup 1"] = append([]string{}, CleanupOptions...)
		am["Cleanup 2"] = append([]string{}, CleanupOptions...)
		e.AvailabilityMap[week] = am
	}

	e.AllMembers = make(map[string]MemberInfo)
	dataRows := rows[headerIdx+1:]

	for _, row := range dataRows {
		if len(row) <= instCol {
			continue
		}

		if filledCol >= 0 && filledCol < len(row) {
			val := strings.ToUpper(strings.TrimSpace(row[filledCol]))
			if !(strings.Contains(val, "\u2705") || val == "TRUE" || val == "Y" || val == "1") {
				continue
			}
		}

		nameCol := colMap["Name"]
		if nameCol >= len(row) {
			continue
		}
		name := strings.TrimSpace(row[nameCol])
		if name == "" {
			continue
		}

		caps := getCapabilities(row, instCol, fphCol, fmcCol, futCol)

		availStr := ""
		for _, we := range weekEntries {
			if we.idx < len(row) {
				status := strings.ToUpper(strings.TrimSpace(row[we.idx]))
				if strings.Contains(status, "N/A") || strings.Contains(status, "NA") {
					availStr += "X"
				} else {
					availStr += "O"
				}
			} else {
				availStr += "O"
			}
		}

		e.AllMembers[name] = MemberInfo{Roles: caps, AvailString: availStr}

		for wi, week := range e.WeekColumns {
			if wi < len(availStr) && availStr[wi] == 'O' {
				for _, role := range RolesOrder {
					if role == "MD" {
						continue
					}
					if roleHasCapability(role, caps) {
						e.AvailabilityMap[week][role] = append(e.AvailabilityMap[week][role], name)
					}
				}
			}
		}
	}

	return nil
}

func findColumn(rows [][]string, headerIdx int, skip map[int]bool, keys []string) int {
	if headerIdx >= len(rows) {
		return -1
	}
	header := rows[headerIdx]
	var firstDataRow []string
	if headerIdx+1 < len(rows) {
		firstDataRow = rows[headerIdx+1]
	}

	for ci, cn := range header {
		if skip[ci] {
			continue
		}
		upperName := strings.ToUpper(strings.TrimSpace(cn))
		for _, k := range keys {
			if strings.Contains(upperName, k) {
				return ci
			}
		}

		if firstDataRow != nil && ci < len(firstDataRow) {
			upperVal := strings.ToUpper(strings.TrimSpace(firstDataRow[ci]))
			for _, k := range keys {
				if strings.Contains(upperVal, k) {
					return ci
				}
			}
		}
	}
	return -1
}

func getCapabilities(row []string, instCol, fphCol, fmcCol, futCol int) []string {
	if instCol >= len(row) {
		return []string{}
	}

	raw := strings.ToUpper(row[instCol])
	raw = strings.NewReplacer("\n", ",", "/", ",", "(", "", ")", "").Replace(raw)
	parts := strings.Split(raw, ",")

	caps := []string{}
	seen := make(map[string]bool)

	for _, code := range parts {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		if mapped, ok := InstrumentMap[code]; ok {
			if !seen[mapped] {
				caps = append(caps, mapped)
				seen[mapped] = true
			}
		} else if strings.Contains(code, "PPT") {
			addCap(&caps, &seen, "PPT")
		} else if strings.Contains(code, "SOUND") {
			addCap(&caps, &seen, "Sound")
		} else if strings.Contains(code, "OBS") || strings.Contains(code, "LIGHT") {
			addCap(&caps, &seen, "Lighting/OBS")
		}
	}

	if fphCol >= 0 && fphCol < len(row) && isActive(row[fphCol]) {
		addCap(&caps, &seen, "Sound")
		addCap(&caps, &seen, "PPT")
		addCap(&caps, &seen, "Lighting/OBS")
	}
	if fmcCol >= 0 && fmcCol < len(row) && isActive(row[fmcCol]) {
		addCap(&caps, &seen, "MC")
	}
	if futCol >= 0 && futCol < len(row) && isActive(row[futCol]) {
		addCap(&caps, &seen, "Usher")
	}

	return caps
}

func addCap(caps *[]string, seen *map[string]bool, role string) {
	if !(*seen)[role] {
		*caps = append(*caps, role)
		(*seen)[role] = true
	}
}

func isActive(val string) bool {
	s := strings.ToUpper(strings.TrimSpace(val))
	return s == "Y" || s == "TRUE" || s == "YES" || s == "1"
}

func roleHasCapability(role string, caps []string) bool {
	for _, c := range caps {
		if strings.Contains(role, "Usher") && c == "Usher" {
			return true
		}
		if strings.Contains(role, "Vocal") && c == "Vocal" {
			return true
		}
		if c == role {
			return true
		}
	}
	return false
}

func (e *RosterEngine) GenerateDraft() {
	e.InitialRoster = make(map[string]map[string]string)
	for _, week := range e.WeekColumns {
		e.InitialRoster[week] = make(map[string]string)
	}

	burnout := make(map[string]int)
	lastWeekPlayed := make(map[string]int)
	for name := range e.AllMembers {
		burnout[name] = 0
		lastWeekPlayed[name] = -1
	}

	for wi, week := range e.WeekColumns {
		assigned := make(map[string]bool)

		type roleCount struct {
			role  string
			count int
		}
		var sortedRoles []roleCount
		for _, role := range RolesOrder {
			if role == "MD" {
				continue
			}
			cnt := len(e.AvailabilityMap[week][role])
			sortedRoles = append(sortedRoles, roleCount{role, cnt})
		}
		sort.Slice(sortedRoles, func(i, j int) bool {
			return sortedRoles[i].count < sortedRoles[j].count
		})

		for _, rc := range sortedRoles {
			role := rc.role
			candidates := []string{}
			for _, p := range e.AvailabilityMap[week][role] {
				if !assigned[p] {
					candidates = append(candidates, p)
				}
			}
			if len(candidates) == 0 {
				e.InitialRoster[week][role] = ""
				continue
			}

			rand.Shuffle(len(candidates), func(i, j int) {
				candidates[i], candidates[j] = candidates[j], candidates[i]
			})

			if strings.Contains(role, "Cleanup") {
				winner := candidates[0]
				e.InitialRoster[week][role] = winner
				assigned[winner] = true
			} else {
				sort.SliceStable(candidates, func(i, j int) bool {
					scoreI := burnout[candidates[i]]*10 + 50
					scoreJ := burnout[candidates[j]]*10 + 50
					if lastWeekPlayed[candidates[i]] == wi-1 {
						scoreI += 50
					}
					if lastWeekPlayed[candidates[j]] == wi-1 {
						scoreJ += 50
					}
					return scoreI < scoreJ
				})
				winner := candidates[0]
				e.InitialRoster[week][role] = winner
				assigned[winner] = true
				burnout[winner]++
				lastWeekPlayed[winner] = wi
			}
		}

		if e.InitialRoster[week]["Piano"] == "" {
			if e.InitialRoster[week]["Bass"] != "" {
				bassist := e.InitialRoster[week]["Bass"]
				e.InitialRoster[week]["Bass"] = ""
				burnout[bassist]--
			}
		}

		e.InitialRoster[week]["MD"] = ""
		for _, br := range BandRoles {
			person := e.InitialRoster[week][br]
			if person != "" {
				if mi, ok := e.AllMembers[person]; ok {
					for _, r := range mi.Roles {
						if r == "MD" {
							e.InitialRoster[week]["MD"] = person
							break
						}
					}
				}
			}
			if e.InitialRoster[week]["MD"] != "" {
				break
			}
		}
	}
}

func (e *RosterEngine) ClearRoster() {
	e.InitialRoster = make(map[string]map[string]string)
	for _, week := range e.WeekColumns {
		e.InitialRoster[week] = make(map[string]string)
	}
}

func (e *RosterEngine) BuildRosterData() RosterData {
	return RosterData{
		WeekColumns:     e.WeekColumns,
		AllMembers:      e.AllMembers,
		AvailabilityMap: e.AvailabilityMap,
		InitialRoster:   e.InitialRoster,
		Config:          getConfigData(),
	}
}
