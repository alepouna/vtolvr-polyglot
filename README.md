# VTOLVR Polyglot

VTOLVR Localization project by the community for the community. 

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
