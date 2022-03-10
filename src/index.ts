import * as core from "@actions/core";
import * as github from "@actions/github";

async function run(): Promise<void> {
    try {
        
        const relativePath: string = core.getInput("path");
        const sourceLanguage: string = core.getInput("source-language");
        const outputLanguages: Array<string> = core.getInput("output-languages").split(",").map((s:string) => s.trim());

        console.log(`Path: ${relativePath}`);
        console.log(`Source language: ${sourceLanguage}`);
        console.log(`Output languages: ${outputLanguages}`);

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();