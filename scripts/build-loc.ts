// Copyright (c) 2026 alepouna
// SPDX-License-Identifier: MIT
// Project: https://github.com/alepouna/vtolvr-polyglot

import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { basename, join, resolve } from "path";
import { CATEGORY_MAP } from "./category-map.ts";

// 
interface LanguageEntry {
  description: string // What the translation is for (csv 'En' field)
  type: string; // What type of key is this (csv 'Description' field - baha why)
  vtol_key: string; // VTOL specific code (csv 'Key')
  additional_context?: string; // Any additional context that can help with identifying the purpose/usage of this translation (custom field, not on the CSV)
  content: string; // Translated key
}

type LanguageData = { [category: string]: LanguageEntry[] };

//CLI flag parsin g
function parseArgs(): { langs: string[]; outDir: string; strict: boolean; release: boolean } {
  const args = process.argv.slice(2);
  let outDir = "dist";
  let strict = true;
  let release = false;
  let all = false;
  const langs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") { //maybe switch this in the future and not pull a yandare
      all = true;
    } else if (arg === "--lang" && args[i + 1]) {
      langs.push(args[++i]);
    } else if (arg === "--out" && args[i + 1]) {
      outDir = args[++i];
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--no-strict") {
      strict = false;
    } else if (arg === "--release") {
      release = true;
    } else {
      process.exit(0);
    }
  }

  if (all) {
    const langDir = resolve(import.meta.dir, "../languages");
    if (existsSync(langDir)) {
      for (const f of readdirSync(langDir)) {
        if (f.endsWith(".json") && f !== "en.json") {
          langs.push(basename(f, ".json"));
        }
      }
    }
  }

  if (langs.length === 0) {
    console.error("Error: No languages specified. Use --lang <code> or --all");
    process.exit(1);
  }

  return { langs, outDir, strict, release };
}

// CSV escaping in case its needed
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// Keys validation
function validateAndBuild(
  lang: string,
  data: LanguageData,
  strict: boolean
): Map<string, string> | null {
  let errors: string[] = [];
  let warnings: string[] = [];
  const csvFiles = new Map<string, string>();

  // Process each known category
  for (const [jsonKey, csvBase] of Object.entries(CATEGORY_MAP)) {
    const records = data[jsonKey];
    const csvName = `${csvBase}_${lang}.csv`;
    const lines: string[] = [`Key,Description,en,${lang}`]; // as seen on loc CSVs

    if (!records || !Array.isArray(records) || records.length === 0) {
      warnings.push(`Category '${jsonKey}' is missing or empty`);
      csvFiles.set(csvName, lines.join("\n") + "\n");
      continue;
    }

    const seenKeys = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const vtolKey = rec.vtol_key?.trim();
      const type = rec.type?.trim();

      // Validate vtol_key (required)
      if (!vtolKey) {
        errors.push(`[${lang}] ${jsonKey}[${i}]: missing or empty vtol_key`);
        continue;
      }


      // Check duplicates
      if (seenKeys.has(vtolKey)) {
        errors.push(`[${lang}] ${jsonKey}: duplicate vtol_key "${vtolKey}"`);
        continue;
      }
      seenKeys.add(vtolKey);

      // Determine translated value
      const content = rec.content?.trim();
      const translated = content || `<localization.${vtolKey}>`;
      const description = rec.description?.trim() || "";

      // Build CSV row: Key,Description,en,<lang>
      lines.push(
        `${escapeCSV(vtolKey)},${escapeCSV(type || "")},${escapeCSV(description)},${escapeCSV(translated)}`
      );
    }

    csvFiles.set(csvName, lines.join("\n") + "\n");
  }

  // Output warnings
  for (const w of warnings) {
    console.warn(`  Warning: ${w}`);
  }

  // Handle errors
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`  Error: ${e}`);
    }
    if (strict) {
      return null;
    }
  }

  return csvFiles;
}

async function createZip(zipPath: string, files: string[], cwd: string): Promise<boolean> {
  const relFiles = files.map((f) => basename(f));
  const proc = Bun.spawn(["zip", "-j", zipPath, ...relFiles], {
    cwd,
    stdout: "ignore",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    if (stderr.includes("not found") || exitCode === 127) {
      console.error(
        "Error: 'zip' command not found. Please install it:\n" +
          "  macOS: brew install zip\n" +
          "  Ubuntu/Debian: sudo apt-get install zip\n" +
          "  Windows: use WSL or install zip from GnuWin32"
      );
    } else {
      console.error(`Error creating zip: ${stderr}`);
    }
    return false;
  }
  return true;
}

async function createAllZip( // ALL.zip structure: lang/CSVs (no .loc.zip files)
  zipPath: string,
  langDirs: string[],
  distDir: string
): Promise<boolean> {
  const args: string[] = ["-r", zipPath];
  for (const langDir of langDirs) {
    args.push(basename(langDir) + "/");
  }
  const proc = Bun.spawn(["zip", ...args], {
    cwd: distDir,
    stdout: "ignore",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error(`Error creating ALL.zip: ${stderr}`);
    return false;
  }
  return true;
}

// da loc
async function main() {
  const { langs, outDir, strict, release } = parseArgs();
  const rootDir = resolve(import.meta.dir, "..");
  const distDir = resolve(rootDir, outDir);
  const langDir = resolve(rootDir, "languages");

  // Clean and create dist
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  const builtLangs: string[] = [];
  const langDirs: string[] = [];
  let totalCsvCount = 0;

  console.log(`Building ${langs.length} language(s)...\n`);

  for (const lang of langs) {
    console.log(`Processing: ${lang}`);
    const jsonPath = join(langDir, `${lang}.json`);

    if (!existsSync(jsonPath)) {
      console.error(`  Error: File not found: ${jsonPath}`);
      if (strict) process.exit(1);
      continue;
    }

    let data: LanguageData;
    try {
      const content = await Bun.file(jsonPath).text();
      data = JSON.parse(content);
    } catch (e) {
      console.error(`  Error: Failed to parse ${jsonPath}: ${e}`);
      if (strict) process.exit(1);
      continue;
    }

    const csvFiles = validateAndBuild(lang, data, strict);
    if (!csvFiles) {
      if (strict) process.exit(1);
      continue;
    }

    // Write CSVs
    const langOutDir = join(distDir, lang);
    mkdirSync(langOutDir, { recursive: true });

    const csvPaths: string[] = [];
    for (const [name, content] of csvFiles) {
      const csvPath = join(langOutDir, name);
      await Bun.write(csvPath, content);
      csvPaths.push(csvPath);
    }

    totalCsvCount += csvPaths.length;
    langDirs.push(langOutDir);

    // Create <lang>.loc.zip
    const zipPath = join(distDir, `${lang}.loc.zip`);
    const zipOk = await createZip(zipPath, csvPaths, langOutDir);
    if (!zipOk) {
      if (strict) process.exit(1);
      continue;
    }

    builtLangs.push(lang);
    console.log(`  Created: ${csvPaths.length} CSVs, ${lang}.loc.zip`);
  }

  // Create ALL.zip if release mode
  if (release && langDirs.length > 0) {
    const allZipPath = join(distDir, "ALL.zip");
    console.log(`\nCreating ALL.zip...`);
    const ok = await createAllZip(allZipPath, langDirs, distDir);
    if (!ok && strict) process.exit(1);
    if (ok) console.log(`  Created: ALL.zip`);
  }

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Languages built: ${builtLangs.join(", ") || "(none)"}`);
  console.log(`Total CSV files: ${totalCsvCount}`);
  console.log(`Output directory: ${distDir}`);
  console.log('Yipee!')
  if (builtLangs.length > 0) {
    console.log(`Zip files:`);
    for (const lang of builtLangs) {
      console.log(`  - ${lang}.loc.zip`);
    }
    if (release) {
      console.log(`  - ALL.zip`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
