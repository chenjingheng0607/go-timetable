export namespace main {
	
	export class CategoryConfigItem {
	    roles: string[];
	    color: string;
	    textCol: string;
	
	    static createFrom(source: any = {}) {
	        return new CategoryConfigItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.roles = source["roles"];
	        this.color = source["color"];
	        this.textCol = source["textCol"];
	    }
	}
	export class RoleCat {
	    cat: string;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new RoleCat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cat = source["cat"];
	        this.color = source["color"];
	    }
	}
	export class Theme {
	    bgMain: string;
	    bgSec: string;
	    fgPri: string;
	    fgSec: string;
	    inputBg: string;
	    inputBorder: string;
	    inputSel: string;
	    dashBgWarn: string;
	    dashBgNotice: string;
	    dashTextAvail: string;
	    dashTextUnavail: string;
	    activeCellText: string;
	    cats: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Theme(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bgMain = source["bgMain"];
	        this.bgSec = source["bgSec"];
	        this.fgPri = source["fgPri"];
	        this.fgSec = source["fgSec"];
	        this.inputBg = source["inputBg"];
	        this.inputBorder = source["inputBorder"];
	        this.inputSel = source["inputSel"];
	        this.dashBgWarn = source["dashBgWarn"];
	        this.dashBgNotice = source["dashBgNotice"];
	        this.dashTextAvail = source["dashTextAvail"];
	        this.dashTextUnavail = source["dashTextUnavail"];
	        this.activeCellText = source["activeCellText"];
	        this.cats = source["cats"];
	    }
	}
	export class ConfigData {
	    rolesOrder: string[];
	    bandRoles: string[];
	    cleanupOptions: string[];
	    categoryConfig: Record<string, CategoryConfigItem>;
	    themes: Record<string, Theme>;
	    roleToCat: Record<string, RoleCat>;
	
	    static createFrom(source: any = {}) {
	        return new ConfigData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rolesOrder = source["rolesOrder"];
	        this.bandRoles = source["bandRoles"];
	        this.cleanupOptions = source["cleanupOptions"];
	        this.categoryConfig = this.convertValues(source["categoryConfig"], CategoryConfigItem, true);
	        this.themes = this.convertValues(source["themes"], Theme, true);
	        this.roleToCat = this.convertValues(source["roleToCat"], RoleCat, true);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MemberInfo {
	    roles: string[];
	    availString: string;
	
	    static createFrom(source: any = {}) {
	        return new MemberInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.roles = source["roles"];
	        this.availString = source["availString"];
	    }
	}
	
	export class RosterData {
	    weekColumns: string[];
	    allMembers: Record<string, MemberInfo>;
	    availabilityMap: Record<string, any>;
	    initialRoster: Record<string, any>;
	    config: ConfigData;
	
	    static createFrom(source: any = {}) {
	        return new RosterData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.weekColumns = source["weekColumns"];
	        this.allMembers = this.convertValues(source["allMembers"], MemberInfo, true);
	        this.availabilityMap = source["availabilityMap"];
	        this.initialRoster = source["initialRoster"];
	        this.config = this.convertValues(source["config"], ConfigData);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

