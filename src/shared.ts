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

    constructor(key: string, marker: string, text: string) {
        this.key = key;
        this.marker = marker;
        this.text = text;
    }
}

export class LocFile {
    static pattern: RegExp = new RegExp(/^([\w\d_.]+):(\d+)\s+"(.*)"$/);

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
                const marker: string = matches[2];
                const text: string = matches[3];

                //console.log(`match: ${matches[0]}`);

                const locEntry: LocEntry = new LocEntry(key, marker, text);

                //console.log(locEntry);

                locFile.entries.set(key, locEntry)
                locFile.lines.push(locEntry);
            } else {
                // this is some other line
                locFile.lines.push(line);
            }
        }

        return locFile;
    }
}