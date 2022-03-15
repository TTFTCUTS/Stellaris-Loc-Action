import * as fsp from "fs/promises";
import * as pathLib from "path";
import { LocEntry, findLocFiles, fallbackMarker } from "./shared";

/**
 * Reads in all specified languages, re-creates the output language files with the same structure as the input, preserving existing entry content.
 * Orphaned output language entries are moved to an additional file to prevent deletion.
 * 
 * @param relativePath Path of the folder containing language subfolders.
 * @param sourceLanguage Name of the language to mimic the structure of.
 * @param outputLanguages Array of languages to re-create in matching structure, and fill missing entries with source language.
 */
export async function processLoc(relativePath: string, sourceLanguage: string, outputLanguages: Array<string>) : Promise<void> {
    const unusedPrefix = "ORPHANED";

    console.log(`Path: ${relativePath}`);
    console.log(`Source language: ${sourceLanguage}`);
    console.log(`Output languages: ${outputLanguages}`);

    const allLanguages : Set<string> = new Set<string>().add(sourceLanguage);
    outputLanguages.forEach(s => allLanguages.add(s));

    const languageData = await findLocFiles(relativePath, allLanguages);

    // ####################################################################
    // clean out all of the output language files and remake them in the source's image

    const sourceLocLanguage = languageData.get(sourceLanguage)!;
    const sourceFiles = sourceLocLanguage.files;
    //console.log(sourceFiles);

    for (let i = 0; i < outputLanguages.length; i++) {
        const language: string = outputLanguages[i];
        console.log(`Process ${language}:`);

        const locLanguage = languageData.get(language)!;
        const locFiles = locLanguage.files;
        const langDir = pathLib.join(relativePath, language);

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
            const langFileName = fileName.replace(`_l_${sourceLanguage}.yml`, `_l_${language}.yml`);
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
                    var marker: string = fallbackMarker;

                    usedEntries.add(key);

                    // if we have a matching entry which does NOT match the fallback marker, replace!
                    if (locLanguage.entries.has(key)) {
                        const entry = locLanguage.entries.get(key)!;
                        if (entry.marker != fallbackMarker) {
                            value = entry.text;
                            marker = entry.marker;
                        }
                    }

                    lines.push(`  ${key}:${marker} "${value}"${line.comment.length > 0 ? ` ${line.comment}`:""}`);
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
            if ((!usedEntries.has(key)) && (entry.marker != fallbackMarker)) {
                saveOrphan = true;
                orphanLines.push(`  ${key}:${entry.marker} "${entry.text}"`)
            }
        }

        if (saveOrphan) {
            await fsp.mkdir(langDir, { recursive: true });
            await fsp.writeFile(pathLib.join(langDir, `${unusedPrefix}_l_${language}.yml`), orphanLines.join("\r\n"));
        }
    }
}

