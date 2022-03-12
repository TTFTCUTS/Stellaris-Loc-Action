import * as core from "@actions/core";
import * as github from "@actions/github";

import * as process from "./processor";

async function run(): Promise<void> {
    try {
        
        const relativePath: string = core.getInput("path");
        const sourceLanguage: string = core.getInput("source-language");
        const outputLanguages: Array<string> = core.getInput("output-languages").split(",").map((s:string) => s.trim());

        await process.processLoc(relativePath, sourceLanguage, outputLanguages);

        
        
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}


run();