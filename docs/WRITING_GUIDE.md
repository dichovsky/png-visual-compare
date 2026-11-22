# Writing Guide

This guide gives the rules for prose in this repository. The rules apply ASD-STE100 Simplified Technical English (STE) principles.

## STE Edition and Source

- **Edition:** ASD-STE100 Issue 9 (January 2025).
- **Rules source:** the core rules in this guide. They are a summary, not the specification.
- **Vocabulary source:** the unofficial `biz-dfch-asdste100vocab` 0.8.1 data (AGPL-3.0). This data claims to follow Issue 9. ASD did not publish it.
- **Official specification:** request a free copy at <https://www.asd-ste100.org/STE_downloads.html>.

The repository does not contain the specification or the vocabulary data. Do not state that text is "STE compliant" or that a word is "approved". No one has checked this repository against the official dictionary.

## Scope

These rules apply to:

- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CONTEXT.md`, and `BACKLOG.md`
- All files in `docs/`
- Doc comments on the public API (`src/types/`, `src/errors.ts`, and the exported functions)
- New entries in the `[Unreleased]` section of `CHANGELOG.md`

These rules do not apply to:

- Released sections of `CHANGELOG.md` and all of `BACKLOG-ARCHIVE.md`. These files are historical records.
- `LICENSE`. This file is legal text.
- `CODEMAP.md`. `npm run codemap` generates this file from the source code.
- `src/vendor/`. This directory is a port of `pixelmatch`. Its comments follow the upstream code.
- Runtime strings, such as error messages. Tests and users can match on the exact text.
- Agent instruction files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.claude/`).

## Core Rules

### Sentences and Paragraphs

- Write procedural sentences with a maximum of 20 words.
- Write descriptive sentences with a maximum of 25 words.
- Write paragraphs about one topic, with a maximum of 6 sentences.
- Keep the articles ("the", "a", "an"). Do not use a telegraphic style.
- Use vertical lists for sequences, conditions, and options.

### Instructions

- Use the imperative mood.
- Write one instruction in each sentence, unless the actions occur at the same time.
- Use the active voice in procedures. Use the active voice as much as possible in other text.
- Put each instruction in a sentence of its own, separate from descriptive text.

### Warnings and Cautions

- Start with a short, clear command. Then give the reason.
- Do not make a hazard less serious, and do not remove it.

### Words

- Use one word for one meaning, and one word for one concept. Do not use synonyms for variety.
- Do not use idioms.
- Do not use a phrasal verb if a single verb has the same meaning.
- Do not use "it", "this", or "that" if the noun that they refer to is not clear.
- Keep the RFC 2119 keywords (MUST, SHOULD, MAY) exactly where they occur.

### Names and Code

- Do not change identifiers, API fields, commands, flags, environment variables, config keys, file paths, or protocol values.
- Do not change Markdown headings in `README.md`. Links and the npm and GitHub anchors use them.
- If a heading change alters an anchor, update all internal links to that anchor.

## Terminology

Precise technical terms have priority over STE vocabulary. Keep a technical word if it is the precise term. This rule also applies if the STE dictionary rejects the word in general language. For general language, use the STE alternative if it has the same meaning. Examples: "gives" (not "provides"), "lets" (not "allows" or "enables"), "is necessary" (not "is required").

`CONTEXT.md` defines the domain terms. This table does not repeat their definitions.

| Term                                                                                                                                                        | Category                                 | Meaning                                                               | Do not use for the same concept                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| png-visual-compare, pixelmatch, Playwright, Jest, Vitest, Node.js, npm, TypeScript, PNG, `Buffer`                                                           | Product name or technical name           | The named product, format, or type                                    | Changed spelling or changed letter case                                  |
| Baseline, received image, diff image, mismatched pixels, excluded area, extended area                                                                       | Technical name (defined in `CONTEXT.md`) | See `CONTEXT.md`                                                      | The "Do not use" terms in `CONTEXT.md`                                   |
| Snapshot                                                                                                                                                    | Technical name                           | The matcher API (`toMatchPngSnapshot`) and framework snapshot storage | Snapshot as a name for the stored image (use "baseline")                 |
| Matcher                                                                                                                                                     | Technical name                           | A test-framework assertion, such as `toMatchPngSnapshot`              | Checker, asserter                                                        |
| Image, pixel, path, directory, file, symlink, inode, option, default, error, package, dependency, coverage                                                  | Technical noun                           | The usual software meaning                                            | Folder (for directory), setting (for option)                             |
| Run, compare, match, return, throw, pass, call, import, export, build, install, validate, resolve, decode, write, read, load, store, publish, commit, merge | Technical verb                           | The usual software meaning                                            | Operate (for run), agree (for match), keep (for store)                   |
| Color                                                                                                                                                       | Technical noun                           | An RGB value. This spelling agrees with the API.                      | Colour. Exception: "IHDR colour type", the term in the PNG specification |
| `-actual.png`, `-expected.png`, `-diff.png`                                                                                                                 | Exception (file name)                    | Playwright report attachments                                         | Do not change these names                                                |

## Exceptions

- Quoted text, legal text, and historical records stay as they are.
- Runtime strings stay as they are. The tests and the users of this library can match on the exact text.
- If you cannot find the meaning of a sentence from the code and tests, keep the original sentence.

## Validation

Run these existing commands after you change prose:

```sh
npm run format:check
npm run codemap:check
npm run test:unit
```

- `npm run format:check` examines the Markdown and TypeScript format with Prettier.
- `npm run codemap:check` fails if a doc comment changed and `CODEMAP.md` is out of date. To update the file, run `npm run codemap`.
- `npm run test:unit` runs lint, the type check, and the tests with the 100% coverage gate.

## Limits of Automated Checks

- No command in this repository examines STE vocabulary or sentence length.
- A sentence-length count or a vocabulary search is only an aid for a review. It does not prove that the text obeys STE.
- A person must review each change for meaning, requirement strength, warnings, and technical accuracy.
