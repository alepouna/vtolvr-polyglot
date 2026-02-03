# How can I contribute? 

Currently, you will need to either 1) Edit an existing language, or 2) Create a new language. 

If you are creating a new language, duplicate the `en.json` file from the languages folder, and edit the `content` field. 

You will need to use a text editor like Notepad++ or VSC/Zed for the best experience though. I am looking into making a simple website that loads a language file and allows you to edit it like how you can edit files in VTOL right now.

Once you are done, feel free to open a PR here (by forking the project first and uploading the new language file in your fork). I will typically accept language contributions without any hesitation, after I do a quick scan for any profanities/trolling or any issues with the workflows. 

### GitHub Newbs: How do I open a PR 

This GitHub blog post goes through the process (but also shows how to add files to your fork/repo via the terminal, you don't have to, you can just use the web 'Add Files' button when looking at the Code of your fork):
https://github.blog/developer-skills/github/beginners-guide-to-github-creating-a-pull-request/

(Also make sure your PR targets this repository, not a branch in your fork!)

## For Developers

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
