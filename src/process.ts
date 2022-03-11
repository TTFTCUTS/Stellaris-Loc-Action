import * as fs from "fs";
import * as fsp from "fs/promises";
import * as pathLib from "path";

type Nullable<T> = T | null | undefined;

export async function processLoc(relativePath: string, sourceLanguage: string, outputLanguages: Array<string>) : Promise<void> {
    // entries with this cardinality are assumed to be fallbacks from the source language
    const fallbackCardinality = "99";
    const unusedPrefix = "ORPHANED";

    console.log(`Path: ${relativePath}`);
    console.log(`Source language: ${sourceLanguage}`);
    console.log(`Output languages: ${outputLanguages}`);

    const allLanguages : Set<string> = new Set<string>().add(sourceLanguage);
    outputLanguages.forEach(s => allLanguages.add(s));

    var locDir: Array<fs.Dirent> = await fsp.readdir(relativePath, {withFileTypes: true});

    console.log(locDir);

    const languageData = new Map<string, LocLanguage>();

    // ####################################################################
    // find all the files and process their lines and entries
    
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

    console.log(languageData);

    // ####################################################################
    // clean out all of the output language files and remake them in the source's image

    const sourceLocLanguage = languageData.get(sourceLanguage)!;
    const sourceFiles = sourceLocLanguage.files;
    //console.log(sourceFiles);

    for (let i = 0; i < outputLanguages.length; i++) {
        const language: string = outputLanguages[i];
        const locLanguage = languageData.get(language)!;
        const locFiles = locLanguage.files;
        const langDir = pathLib.join(relativePath, language);

        console.log(`Process ${language}:`);

        // clean out all of the existing files
        if (locFiles != undefined) { 
            for (let [key, locFile] of locFiles) {
                //console.log(`delete: ${locFile.path}`);
                await fsp.rm(locFile.path);
            }
        }

        // set for tracking which entries have a home
        const usedEntries = new Set<string>();

        // for each source language file
        for (let [key, sourceFile] of sourceFiles) {
            const relFilePath = pathLib.relative(pathLib.join(relativePath, sourceLanguage), sourceFile.path);
            const fileName = pathLib.basename(sourceFile.path);
            const dir = pathLib.dirname(relFilePath);
            const langFileDir = pathLib.join(langDir,dir);
            const langFileName = fileName.replace(`_${sourceLanguage}.yml`, `_l_${language}.yml`);
            const finalPath = pathLib.join(langFileDir, langFileName);
            
            console.log(`${sourceFile.path} -> ${finalPath}`);
            const lines: Array<string> = [`l_${language}:`];

            // for each line in the source file
            for (let i=0; i<sourceFile.lines.length; i++) {
                const line = sourceFile.lines[i];

                if (line instanceof LocEntry) {
                    // a full blown entry
                    const key: string = line.key;
                    var value: string = line.text;
                    var cardinality: string = fallbackCardinality;

                    usedEntries.add(key);

                    // if we have a matching entry which does NOT match the fallback cardinality, replace!
                    if (locLanguage.entries.has(key)) {
                        const entry = locLanguage.entries.get(key)!;
                        if (entry.cardinality != fallbackCardinality) {
                            value = entry.text;
                            cardinality = entry.cardinality;
                        }
                    }

                    lines.push(`  ${key}:${cardinality} "${value}"`);
                } else {
                    // a non-entry line
                    lines.push(`  ${line}`);
                }
            }

            await fsp.mkdir(langFileDir, { recursive: true });

            // write that file! hopefully this doesn't care about outputs?
            await fsp.writeFile(finalPath, lines.join("\r\n"));
            //console.log(lines);
        }

        // put any entries which were not used into a file for orphaned entries
        var saveOrphan = false;
        const orphanLines: Array<string> = [`l_${language}:`, `  # These entries were in the previous [${language}] loc files but are not present in the current [${sourceLanguage}] files.`];
        for(let [key, entry] of locLanguage.entries) {
            if ((!usedEntries.has(key)) && (entry.cardinality != fallbackCardinality)) {
                saveOrphan = true;
                orphanLines.push(`  ${key}:${entry.cardinality} "${entry.text}"`)
            }
        }

        if (saveOrphan) {
            await fsp.mkdir(langDir, { recursive: true });
            await fsp.writeFile(pathLib.join(langDir, `${unusedPrefix}_l_${language}.yml`), orphanLines.join("\r\n"));
        }
    }
}

async function findFilesRecursively(path: string, list: Array<string>, depth: number = 0): Promise<void> {
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

type LocLine = string | LocEntry

class LocLanguage {
    files = new Map<string, LocFile>();
    entries = new Map<string, LocEntry>();
}

class LocEntry {
    key: string;
    cardinality: string;
    text: string;

    constructor(key: string, cardinality: string, text: string) {
        this.key = key;
        this.cardinality = cardinality;
        this.text = text;
    }
}

class LocFile {
    static pattern: RegExp = new RegExp(/^([\w\d_]+):(\d+)\s+"(.*)"$/);

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
                const cardinality: string = matches[2];
                const text: string = matches[3];

                //console.log(`match: ${matches[0]}`);

                const locEntry: LocEntry = new LocEntry(key, cardinality, text);

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