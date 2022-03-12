import * as fsp from "fs/promises";
import * as pathLib from "path";
import { LocEntry, findLocFiles, fallbackMarker } from "./shared";

export async function preProcessLoc(inputPath: string, outputPath: string, sourceLanguage: string, outputLanguages: Array<string>) : Promise<void> {
    console.log(`Paths: ${inputPath} -> ${outputPath}`);
    console.log(`Source language: ${sourceLanguage}`);
    console.log(`Output languages: ${outputLanguages}`);

    const allLanguages : Set<string> = new Set<string>().add(sourceLanguage);
    outputLanguages.forEach(s => allLanguages.add(s));

    const languageData = await findLocFiles(inputPath, allLanguages);

    // ####################################################################
    // write our clean and unstructured output files to the output directory

    const sourceLocLanguage = languageData.get(sourceLanguage)!;
    const sourceFiles = sourceLocLanguage.files;
    //console.log(sourceFiles);

    for (let i = 0; i < outputLanguages.length; i++) {
        const language: string = outputLanguages[i];
        const locLanguage = languageData.get(language)!;
        const langDir = pathLib.join(outputPath, language);

        console.log(`Preprocess ${language}:`);

        // skip this language if there's no input file, since there'd be no output anyway!
        if (locLanguage == undefined) { continue; }

        const lines: Array<string> = [`l_${language}:`];

        for (const [key,entry] of locLanguage.entries) {

            // if either the entry doesn't exist in the source, OR it DOES exist but is different and doesn't have the special marker
            let sourceEntry = sourceLocLanguage.entries.get(key);
            if (sourceEntry == undefined || (sourceEntry.marker != fallbackMarker && sourceEntry.text != entry.text)) {
                lines.push(`  ${key}:${entry.marker} "${entry.text}"`);
            }
        }

        // if we have anything, write the output file, otherwise we needn't
        if (lines.length < 2) { continue; }

        await fsp.mkdir(langDir, {recursive: true});
        await fsp.writeFile(pathLib.join(langDir,`preprocessed_l_${language}.yml`), lines.join("\r\n"));
    }
}