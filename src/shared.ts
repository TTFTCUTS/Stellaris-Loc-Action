import * as fs from "fs";
import * as fsp from "fs/promises";
import * as pathLib from "path";

// entries with this marker are assumed to be fallbacks from the source language
export const fallbackMarker = "99";

export async function findLocFiles(relativePath: string, allLanguages: Set<string>): Promise<Map<string, LocLanguage>> {
    const languageData = new Map<string, LocLanguage>();

    var locDir: Array<fs.Dirent> = await fsp.readdir(relativePath, {withFileTypes: true});

    // for each entry in the loc dir
    for (let i = 0; i < locDir.length; i++) {
        const entry : fs.Dirent = locDir[i];
        
        // if the entry is a language directory
        if (entry.isDirectory() && allLanguages.has(entry.name)) {
            const language = entry.name;
            //console.log(`Found directory for ${language}`);

            const locLanguage = new LocLanguage();
            const fileNames: Array<string> = [];
            
            var path = pathLib.join(relativePath, language);

            await findFilesRecursively(path, fileNames);

            // for each file in the language folder
            for(let i=0; i < fileNames.length; i++) {
                const filePath = fileNames[i];
                const dir = pathLib.dirname(filePath);
                const name = pathLib.basename(filePath);
                const extension = pathLib.extname(name);

                // if it's a potential lang file
                if (extension == ".yml") {
                    const contents: string = await fsp.readFile(filePath, {encoding: "utf8"});

                    const parsed: Nullable<LocFile> = LocFile.parse(contents.split("\n").map(s => s.trim()), dir, name, language);

                    // if it turns out to have actually been a loc file
                    if (parsed instanceof LocFile) {
                        locLanguage.files.set(name, parsed);
                        for (let [key,val] of parsed.entries) {
                            locLanguage.entries.set(key,val);
                        }
                    }
                }
            }

            languageData.set(language, locLanguage);
        }
    }

    // add empty languages if we didn't find the folder in the source (no translations etc)
    for (const lang of allLanguages) {
        if (!languageData.has(lang)) {
            languageData.set(lang, new LocLanguage());
        }
    }

    //console.log(languageData);

    return languageData;
}

// ####################################################################
// CLASSES ETC

export async function findFilesRecursively(path: string, list: Array<string>, depth: number = 0): Promise<void> {
    const dir: Array<fs.Dirent> = await fsp.readdir(path, {withFileTypes: true});

    //console.log(dir);

    for (let i = 0; i < dir.length; i++) {
        const entry : fs.Dirent = dir[i];

        if (entry.isDirectory()) {
            // subdirectory, recurse
            await findFilesRecursively(pathLib.join(path, entry.name), list, depth+1);
        }
        else if(entry.isFile()) {
            list.push(pathLib.join(path, entry.name));
        }
    }
}

export type Nullable<T> = T | null | undefined;

export type LocLine = string | LocEntry

export class LocLanguage {
    files = new Map<string, LocFile>();
    entries = new Map<string, LocEntry>();
}

export class LocEntry {
    key: string;
    marker: string;
    text: string;
    comment: string;

    constructor(key: string, marker: string, text: string, comment: string = "") {
        this.key = key;
        this.marker = marker;
        this.text = text;
        this.comment = comment;
    }
}

export class LocFile {
    static pattern: RegExp = new RegExp(/^([\S]+):(\d*)\s+"(.*)"\s*(#.*)*$/);

    entries: Map<string, LocEntry> = new Map<string, LocEntry>();
    lines: Array<LocLine> = [];
    path: string;
    language: string;

    constructor(path: string, language: string) {
        this.language = language;
        this.path = path;
    }

    static parse(lines: Array<string>, path: string, name: string, language: string) : Nullable<LocFile> {
        //console.log(`Attempting parse of ${pathLib.join(path, name)}`);

        // empty file or not formatted as a lang file
        if (lines.length == 0 || (!name.endsWith(`_l_${language}.yml`)) || (lines[0] != `l_${language}:`)) { 
            //console.warn("Invalid file")
            return; 
        }

        const locFile = new LocFile(pathLib.join(path, name), language);

        // starting at 1 because we already know the language
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            var matches: Nullable<RegExpMatchArray> = line.match(this.pattern);

            if (matches != null) {
                
                // this is a loc entry
                const key: string = matches[1];
                var marker: string = matches[2];
                const text: string = matches[3];
                const comment: string = matches[4];

                // if we're missing the number, assume 0
                if (marker == null || marker.length == 0) {
                    marker = "0";
                }

                //console.log(`match: ${matches[0]}`);

                const locEntry: LocEntry = new LocEntry(key, marker, text, comment);

                //console.log(locEntry);

                locFile.entries.set(key, locEntry)
                locFile.lines.push(locEntry);
            } else {
                // this is some other line

                // check that this is a comment or empty, otherwise warn
                if (line.length > 0 && !line.startsWith("#")) {
                    console.warn(`Non-comment @ ${locFile.path} ${Colours.FgYellow}line ${i+1}${Colours.Reset}: ${line}`);
                }

                locFile.lines.push(line);
            }
        }

        return locFile;
    }
}

// ####################################################################
// colours

export abstract class Colours {
    static Reset = "\x1b[0m"
    static Bright = "\x1b[1m"
    static Dim = "\x1b[2m"
    static Underscore = "\x1b[4m"
    static Blink = "\x1b[5m"
    static Reverse = "\x1b[7m"
    static Hidden = "\x1b[8m"

    static FgBlack = "\x1b[30m"
    static FgRed = "\x1b[31m"
    static FgGreen = "\x1b[32m"
    static FgYellow = "\x1b[33m"
    static FgBlue = "\x1b[34m"
    static FgMagenta = "\x1b[35m"
    static FgCyan = "\x1b[36m"
    static FgWhite = "\x1b[37m"

    static BgBlack = "\x1b[40m"
    static BgRed = "\x1b[41m"
    static BgGreen = "\x1b[42m"
    static BgYellow = "\x1b[43m"
    static BgBlue = "\x1b[44m"
    static BgMagenta = "\x1b[45m"
    static BgCyan = "\x1b[46m"
    static BgWhite = "\x1b[47m"
}