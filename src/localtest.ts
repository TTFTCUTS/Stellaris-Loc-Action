import * as process from "./process";

async function run(): Promise<void> {
    const relativePath: string = "test-data";
    const sourceLanguage: string = "source";
    const outputLanguages: Array<string> = ["output", "output2"];

    await process.processLoc(relativePath, sourceLanguage, outputLanguages);
}

run();