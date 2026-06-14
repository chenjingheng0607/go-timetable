package main

type MemberInfo struct {
	Roles       []string `json:"roles"`
	AvailString string   `json:"availString"`
}

type CategoryConfigItem struct {
	Roles   []string `json:"roles"`
	Color   string   `json:"color"`
	TextCol string   `json:"textCol"`
}

type RoleCat struct {
	Cat   string `json:"cat"`
	Color string `json:"color"`
}

type Theme struct {
	BgMain          string            `json:"bgMain"`
	BgSec           string            `json:"bgSec"`
	FgPri           string            `json:"fgPri"`
	FgSec           string            `json:"fgSec"`
	InputBg         string            `json:"inputBg"`
	InputBorder     string            `json:"inputBorder"`
	InputSel        string            `json:"inputSel"`
	DashBgWarn      string            `json:"dashBgWarn"`
	DashBgNotice    string            `json:"dashBgNotice"`
	DashTextAvail   string            `json:"dashTextAvail"`
	DashTextUnavail string            `json:"dashTextUnavail"`
	ActiveCellText  string            `json:"activeCellText"`
	Cats            map[string]string `json:"cats"`
}

type ConfigData struct {
	RolesOrder     []string                     `json:"rolesOrder"`
	BandRoles      []string                     `json:"bandRoles"`
	CleanupOptions []string                     `json:"cleanupOptions"`
	CategoryConfig map[string]CategoryConfigItem `json:"categoryConfig"`
	Themes         map[string]Theme             `json:"themes"`
	RoleToCat      map[string]RoleCat           `json:"roleToCat"`
}

type RosterData struct {
	WeekColumns     []string                   `json:"weekColumns"`
	AllMembers      map[string]MemberInfo      `json:"allMembers"`
	AvailabilityMap map[string]map[string][]string `json:"availabilityMap"`
	InitialRoster   map[string]map[string]string   `json:"initialRoster"`
	Config          ConfigData                 `json:"config"`
}

var RolesOrder = []string{
	"MD", "Lead", "Vocal 1", "Vocal 2", "Piano", "Drum/Cajon", "Bass", "Guitar",
	"PPT", "Sound", "Lighting/OBS",
	"MC",
	"Usher 1", "Usher 2", "Usher 3",
	"Cleanup 1", "Cleanup 2",
}

var BandRoles = []string{"Piano", "Bass", "Guitar"}

var CleanupOptions = []string{"LHW", "UF", "LB", "YGSS", "SJS", "PK"}

var InstrumentMap = map[string]string{
	"WL": "Lead", "V": "Vocal", "P": "Piano", "G": "Guitar",
	"B": "Bass", "D": "Drum/Cajon", "PPT": "PPT",
	"S": "Sound", "SOUND": "Sound",
	"OBS": "Lighting/OBS", "LIGHT": "Lighting/OBS", "L": "Lighting/OBS",
	"MC": "MC", "USHER": "Usher",
	"MD": "MD", "M.D.": "MD",
}

var CategoryConfigData = map[string]CategoryConfigItem{
	"Praise & Worship": {
		Roles:   []string{"MD", "Lead", "Vocal 1", "Vocal 2", "Piano", "Drum/Cajon", "Bass", "Guitar"},
		Color:   "#c00000",
		TextCol: "white",
	},
	"FPH": {
		Roles:   []string{"PPT", "Sound", "Lighting/OBS"},
		Color:   "#0070c0",
		TextCol: "white",
	},
	"MC": {
		Roles:   []string{"MC"},
		Color:   "#7030a0",
		TextCol: "white",
	},
	"Usher": {
		Roles:   []string{"Usher 1", "Usher 2", "Usher 3"},
		Color:   "#ffc000",
		TextCol: "black",
	},
	"LG": {
		Roles:   []string{"Cleanup 1", "Cleanup 2"},
		Color:   "#00b050",
		TextCol: "white",
	},
}

var Themes = map[string]Theme{
	"Dark": {
		BgMain:          "#1e1e1e",
		BgSec:           "#252526",
		FgPri:           "#ffffff",
		FgSec:           "#cccccc",
		InputBg:         "#333333",
		InputBorder:     "#3e3e42",
		InputSel:        "#264f78",
		DashBgWarn:      "#4a0000",
		DashBgNotice:    "#4a3b00",
		DashTextAvail:   "white",
		DashTextUnavail: "#666666",
		ActiveCellText:  "#ffffff",
		Cats: map[string]string{
			"Praise & Worship": "#ff6666",
			"FPH":              "#66b3ff",
			"MC":               "#d9b3ff",
			"Usher":            "#ffdf80",
			"LG":               "#66ff66",
		},
	},
	"Light": {
		BgMain:          "#fafafa",
		BgSec:           "#e0e0e0",
		FgPri:           "#000000",
		FgSec:           "#333333",
		InputBg:         "#ffffff",
		InputBorder:     "#bdc3c7",
		InputSel:        "#0078d7",
		DashBgWarn:      "#FFEBEE",
		DashBgNotice:    "#FFFDE7",
		DashTextAvail:   "black",
		DashTextUnavail: "#999999",
		ActiveCellText:  "#000000",
		Cats: map[string]string{
			"Praise & Worship": "#c00000",
			"FPH":              "#0070c0",
			"MC":               "#7030a0",
			"Usher":            "#ffc000",
			"LG":               "#00b050",
		},
	},
}

func buildRoleToCat() map[string]RoleCat {
	m := make(map[string]RoleCat)
	for cat, data := range CategoryConfigData {
		for _, r := range data.Roles {
			m[r] = RoleCat{Cat: cat, Color: data.Color}
		}
	}
	return m
}

func getConfigData() ConfigData {
	return ConfigData{
		RolesOrder:     RolesOrder,
		BandRoles:      BandRoles,
		CleanupOptions: CleanupOptions,
		CategoryConfig: CategoryConfigData,
		Themes:         Themes,
		RoleToCat:      buildRoleToCat(),
	}
}
