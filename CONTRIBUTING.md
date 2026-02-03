# How can I contribute? 

Currently, you will need to either 1) Edit an existing language, or 2) Create a new language. 

If you are creating a new language, duplicate the `en.json` file from the languages folder, and edit the `content` field. 

You will need to use a text editor like Notepad++ or VSC/Zed for the best experience though. I am looking into making a simple website that loads a language file and allows you to edit it like how you can edit files in VTOL right now.

Once you are done, feel free to open a PR here (by forking the project first and uploading the new language file in your fork). I will typically accept language contributions without any hesitation, after I do a quick scan for any profanities/trolling or any issues with the workflows. 

### GitHub Newbs: How do I open a PR 

This GitHub blog post goes through the process (but also shows how to add files to your fork/repo via the terminal, you don't have to, you can just use the web 'Add Files' button when looking at the Code of your fork):
https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/

(Also make sure your PR targets this repository, not a branch in your fork!)

## Converting existing VTOLVR CSV files 

If you have already made a translation pack and you would like to easily convert it to a Polyglot compatible file, there is now a script that allows you to do. 

You can download the repository on your local PC and set it up (using the For Developers section below), and then: 

1. Create a folder (i.e. vtolcsv) and place all the CSV files for the languages that you would like to convert
2. Run `bun run csv2json -- --csv-dir ./vtolcsv --out ./converted_files --no-strict`

You should see almost instantly the files being parsed, and converted. Open the newly created "converted_files" folder and you will see the language .json file.
If there any translations that are missing, the script will log them in a .missing.txt file. You can use this file as a reference to see if you are missing any CSV files generally, or any loc keys that have not been translated in the language. 
> [!WARNING]
> The script currently does not check if any keys that exist in VTOL but not in your CSV file exist (i.e. outdated/old CSVs). You will have to do some due diligence right now.
> I will be working on upgrading the script to check for missing keys generally, not just missing translation entries in existing keys.

You can then take the outputed json file, and follow the instructions from earlier to submit it.


## For Developers

This project scripts were made using TypeScript and Bun. You will need to install Bun on your system, see how here: https://bun.com/
(Any version should work just fine, this project was made in 1.2.23)

You typically do not need to run anything else, just the scripts, but if you get any funny errors just run `bun install` and then the scripts and you should be good to go!

If you are looking into running the loc building scripts locally here's how:

```bash
# Build a single language
bun scripts/build-loc.ts --lang el

# Build all languages in /languages (skips english)
bun scripts/build-loc.ts --all

# Build with custom output directory
bun scripts/build-loc.ts --all --out build

# Build for release (includes ALL.zip)
bun scripts/build-loc.ts --all --release
```

All Options

- `--lang <code>`: Build a single language
- `--all`: Build all languages
- `--out <dir>`: Cahnge the output directory (default: `dist`)
- `--strict`: Fail on errors (default)
- `--no-strict`: Warn instead of fail (useful for development)
- `--release`: Also create `ALL.zip`

---

The CSV2JSON script has these options:

```bash
# Convert all CSVs to JSONs in a folder, without strict checks (fail on errors)
bun run csv2json -- --csv-dir ./vtolcsv --out ./converted_files --no-strict
```
Yes, you will need to include that double vacant `--`! 

All Options
- `--csv-dir <path>`: A path to the CSV directory. Can be static paths (i.e. "C:/path/ath/th/h" or dynamic "./folder inside the project files" or "../one folder behind the project folder")
- `--out <dir>`: The directory to output the files, same as above (default: `languages`)
- `--strict`: Fail script on errors (default behavior)
- `--no-strict`: Warn instead of fail (useful for development or incomplete translations)
