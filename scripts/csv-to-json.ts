// Copyright (c) 2026 alepouna
// SPDX-License-Identifier: MIT
// Project: https://github.com/alepouna/vtolvr-polyglot

import { existsSync, mkdirSync, readdirSync } from "fs";
import { basename, join, resolve } from "path";
import { CATEGORY_MAP } from "./category-map";

// Reverse mapping: CSV base filename -> JSON category key
const CSV_PREFIX_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([key, val]) => [val, key])
);

interface LanguageEntry {
  description: string;
  type: string;
  vtol_key: string;
  additional_context?: string;
  content: string;
}

type LanguageData = { [category: string]: LanguageEntry[] };

interface CSVFileInfo {
  path: string;
  prefix: string;
  lang: string;
  category?: string;
}

function parseArgs(): { csvDir: string; outDir: string; strict: boolean } {
  const args = process.argv.slice(2);
  let csvDir = "";
  let outDir = "languages";
  let strict = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--csv-dir" && args[i + 1]) {
      csvDir = args[++i];
    } else if (arg === "--out" && args[i + 1]) {
      outDir = args[++i];
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--no-strict") {
      strict = false;
    } else {
      console.error("Unknown argument:", arg);
      process.exit(1);
    }
  }

  if (!csvDir) {
    console.error("Error: --csv-dir is required");
    console.error("Usage: --csv-dir <path> [--out <path>] [--strict / --no-strict]");
    process.exit(1);
  }

  return { csvDir, outDir, strict };
}

function scanCSVDirectory(csvDir: string): Map<string, CSVFileInfo[]> {
  if (!existsSync(csvDir)) {
    console.error(`Error: Directory not found: ${csvDir}`);
    process.exit(1);
  }

  const files = readdirSync(csvDir).filter((f) => f.endsWith(".csv"));
  const langMap = new Map<string, CSVFileInfo[]>();

  for (const file of files) {
    const match = file.match(/^(.+)_([a-z]{2})\.csv$/i);
    if (!match) {
      console.warn(`  Warning: Skipping file with unexpected format: ${file}`);
      continue;
    }

    const [, prefix, lang] = match;
    const category = CSV_PREFIX_TO_CATEGORY[prefix];

    if (!category) {
      console.warn(`  Warning: Unknown CSV prefix '${prefix}' in file ${file}`);
      continue;
    }

    const info: CSVFileInfo = {
      path: join(csvDir, file),
      prefix,
      lang,
      category,
    };

    if (!langMap.has(lang)) {
      langMap.set(lang, []);
    }
    langMap.get(lang)!.push(info);
  }

  return langMap;
}

/*

  Following few functions coould be moved to use a CSV package but doing it like this seemed faster lol, fix in the future if unstable

*/
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(currentField);
      currentField = "";
      i++;
    } else {
      currentField += char;
      i++;
    }
  }

  fields.push(currentField);
  return fields;
}

function parseCSVRow(
  lines: string[],
  startIndex: number,
  expectedFieldCount: number
): { row: string[] | null; nextIndex: number } {
  if (startIndex >= lines.length || !lines[startIndex].trim()) {
    return { row: null, nextIndex: startIndex + 1 };
  }

  let combinedLine = lines[startIndex];
  let currentIndex = startIndex;

  let quoteCount = (combinedLine.match(/"/g) || []).length;
  
  while (quoteCount % 2 !== 0 && currentIndex + 1 < lines.length) {
    currentIndex++;
    combinedLine += "\n" + lines[currentIndex];
    quoteCount = (combinedLine.match(/"/g) || []).length;
  }

  const fields = parseCSVLine(combinedLine);

  if (fields.length !== expectedFieldCount) {
    return { row: null, nextIndex: currentIndex + 1 };
  }

  return { row: fields, nextIndex: currentIndex + 1 };
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0) return [];

  const header = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  let i = 1;
  while (i < lines.length) {
    const { row, nextIndex } = parseCSVRow(lines, i, header.length);
    if (row) {
      const record: Record<string, string> = {};
      for (let j = 0; j < header.length; j++) {
        record[header[j]] = row[j] || "";
      }
      rows.push(record);
    }
    i = nextIndex;
  }

  return rows;
}

async function processCSVFile(
  info: CSVFileInfo,
  strict: boolean
): Promise<{ entries: LanguageEntry[]; errors: string[]; warnings: string[]; missingKeys: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entries: LanguageEntry[] = [];
  const missingKeys: string[] = [];

  try {
    const text = await Bun.file(info.path).text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      warnings.push(`Empty CSV file: ${basename(info.path)}`);
      return { entries, errors, warnings, missingKeys };
    }

    const firstRow = rows[0];
    if (!("Key" in firstRow) || !("Description" in firstRow) || !("en" in firstRow)) {
      errors.push(`Invalid CSV header in ${basename(info.path)}`);
      return { entries, errors, warnings, missingKeys };
    }

    const seenKeys = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vtolKey = row["Key"]?.trim();
      const type = row["Description"]?.trim();
      const description = row["en"]?.trim();
      const content = row[info.lang]?.trim();

      if (!vtolKey) {
        warnings.push(`Row ${i + 2}: Missing vtol_key, skipping`);
        continue;
      }

      if (!type) {
        warnings.push(`Row ${i + 2}: Missing type for key '${vtolKey}', skipping`);
        continue;
      }

      if (!description) {
        warnings.push(`Row ${i + 2}: Missing description for key '${vtolKey}', skipping`);
        continue;
      }

      if (seenKeys.has(vtolKey)) {
        const msg = `Duplicate vtol_key '${vtolKey}' in ${basename(info.path)}`;
        if (strict) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
        continue;
      }
      seenKeys.add(vtolKey);

      const finalContent = content || `<localization.${vtolKey}>`;
      
      // Track missing translations
      if (!content) {
        missingKeys.push(`${vtolKey} - ${info.prefix}`);
      }

      entries.push({
        description,
        type,
        vtol_key: vtolKey,
        additional_context: "",
        content: finalContent,
      });
    }
  } catch (e) {
    errors.push(`Failed to process ${basename(info.path)}: ${e}`);
  }

  return { entries, errors, warnings, missingKeys };
}

async function main() {
  const { csvDir, outDir, strict } = parseArgs();
  const rootDir = resolve(".");
  const csvDirPath = resolve(rootDir, csvDir);
  const outDirPath = resolve(rootDir, outDir);

  console.log(`Scanning directory: ${csvDir}\n`);

  const langMap = scanCSVDirectory(csvDirPath);

  if (langMap.size === 0) {
    console.error("Error: No valid CSV files found");
    process.exit(1);
  }

  const languages = Array.from(langMap.keys()).sort();
  console.log(`Found ${Array.from(langMap.values()).flat().length} CSV files for ${languages.length} language(s): ${languages.join(", ")}\n`);

  if (!existsSync(outDirPath)) {
    mkdirSync(outDirPath, { recursive: true });
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalMissing = 0;
  const processedLanguages: string[] = [];

  for (const lang of languages) {
    console.log(`Processing language: ${lang}`);
    const csvFiles = langMap.get(lang)!;
    const langData: LanguageData = {};
    let langErrors = 0;
    let langWarnings = 0;
    const langMissingKeys: string[] = [];

    for (const csvFile of csvFiles) {
      const { entries, errors, warnings, missingKeys } = await processCSVFile(csvFile, strict);

      if (errors.length > 0) {
        for (const err of errors) {
          console.error(`  Error: ${err}`);
          langErrors++;
        }
        if (strict) continue;
      }

      if (warnings.length > 0) {
        for (const warn of warnings) {
          console.warn(`  Warning: ${warn}`);
          langWarnings++;
        }
      }

      // Collect missing keys for this language
      langMissingKeys.push(...missingKeys);

      if (entries.length > 0 && csvFile.category) {
        langData[csvFile.category] = entries;
        console.log(`  ✓ ${basename(csvFile.path)} → ${csvFile.category} (${entries.length} entries)`);
      }
    }

    const allCategories = Object.keys(CATEGORY_MAP);
    const presentCategories = Object.keys(langData);
    const missingCategories = allCategories.filter((cat) => !presentCategories.includes(cat));

    if (missingCategories.length > 0) {
      console.warn(`  ⚠ Missing categories: ${missingCategories.join(", ")}`);
      langWarnings++;
    }

    totalErrors += langErrors;
    totalWarnings += langWarnings;
    totalMissing += langMissingKeys.length;

    if (Object.keys(langData).length > 0) {
      const outputPath = join(outDirPath, `${lang}.json`);
      // Reorder langData to match CATEGORY_MAP order
      const orderedData: LanguageData = {};
      for (const category of Object.keys(CATEGORY_MAP)) {
        if (langData[category]) {
          orderedData[category] = langData[category];
        }
      }
      await Bun.write(outputPath, JSON.stringify(orderedData, null, 2) + "\n");
      processedLanguages.push(lang);
      console.log(`  → Output: ${outputPath}`);
      
      // Write missing keys file if there are any missing translations or categories
      if (langMissingKeys.length > 0 || missingCategories.length > 0) {
        const missingPath = join(outDirPath, `${lang}.missing.txt`);
        const missingContent: string[] = [];
        
        // Add missing categories header if any
        if (missingCategories.length > 0) {
          missingContent.push("=== Missing Categories (CSV Files) ===");
          for (const cat of missingCategories) {
            missingContent.push(`${CATEGORY_MAP[cat]}`);
          }
          missingContent.push("");
        }
        
        // Add missing keys header if any
        if (langMissingKeys.length > 0) {
          if (missingCategories.length > 0) {
            missingContent.push("=== Missing Translations ===");
          }
          missingContent.push(...langMissingKeys);
        }
        
        await Bun.write(missingPath, missingContent.join("\n") + "\n");
        const totalMissingItems = langMissingKeys.length + missingCategories.length;
        console.log(`  → Missing key s: ${missingPath} (${totalMissingItems} items: ${missingCategories.length} categories, ${langMissingKeys.length} translations)`);
      }
      
      console.log();
    } else {
      console.error(`  Error: No valid entries for language '${lang}'\n`);
      if (strict) {
        process.exit(1);
      }
    }
  }

  console.log("=== Summary ===");
  console.log(`Languages processed: ${processedLanguages.join(", ") || "(none)"}`);
  console.log(`Output directory: ${outDirPath}`);
  console.log(`Warnings: ${totalWarnings}`);
  console.log(`Errors: ${totalErrors}`);
  if (totalMissing > 0) {
    console.log(`Missing translations: ${totalMissing} (see *.missing.txt files)`);
  }

  if (totalErrors > 0 && strict) {
    console.error("\nFailed due to errors in strict mode");
    process.exit(1);
  }

  console.log("\nYipee!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
