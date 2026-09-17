# Producing a book

How a book made from this template is written, checked and published.
The writing rules are in [`style-guide.md`](style-guide.md), the book's own
settings in [`book.md`](book.md).  The stages below were used for two
complete books (38 chapters, ~200 pages per edition); each stage exists
because skipping it let real defects through.

## 1. Start a book

1. Create the repository from the template and build the image once:
   ```sh
   gh repo create <name>-notes --template <owner>/latex-lecture-notes-template --public --clone
   cd <name>-notes && make docker-build
   ```
2. Fill in `docs/book.md` (source material, citation formats, textbook,
   code language, exclusions) and `docs/syllabus.json` (one entry per
   chapter: `number`, `slug`, `title`, `title_ja`, `units`; optional
   `parts`; `unit` is the word used in commit messages).
3. Set the title block and class options in `en/main.tex` and `ja/main.tex`
   (`chapter` option for "Chapter 3" instead of "Lesson 3"), delete the two
   sample chapters and their `glossary.tsv` rows, and run
   `tools/sync-main.py`.
4. Replace `README.md` with the book's own (title, links to the PDFs,
   status table, content license).  For a public repository enable GitHub
   Pages on the `pdf` branch (Settings → Pages); CI publishes both PDFs
   there on every push to `main`.
5. Write `glossary.tsv` **before** the chapters: one row per concept with
   the chapter that first defines it (`lesson`), the Japanese term and its
   reading.  Term ownership is what keeps 20 independently written chapters
   from defining the same term five times.

## 2. Write chapters

Each chapter goes through five stages; chapters are independent and can
run in parallel (see §5 for how many).

| Stage | What happens | Output |
|---|---|---|
| Write EN | reconstruct the outline of the source unit, write the English chapter with its figures, margin items (style guide §3.1) and bibliography; `tools/chapter-check.sh en`, read every page | `en/lessons/NN-slug.tex`, `figures/lNN-*`, `bib/NN-slug.bib` |
| Review EN | two independent reviewers, in parallel, who do not edit: **technical** (recompute every number, re-trace every example, check every citation exists) and **scope/conventions** (every source unit covered, nothing beyond it, register, excluded material, macros, labels, layout) | issue lists |
| Fix EN | verify each finding (reviewers can be wrong), fix the real ones, rebuild, read the pages | revised chapter |
| Write JA | mirror translation per style guide §6, Japanese branches in shared figures | `ja/lessons/NN-slug.tex` |
| Check JA + commit | adversarial mirror check against the current English chapter, Japanese quality, index readings; fix; rebuild both editions; `tools/commit-lesson.sh NN-slug` | one commit per chapter, pushed |

A chapter is pushed as soon as it is finished, so the published PDFs grow
chapter by chapter.

## 3. Finish the book

After the last chapter, one edition or one concern at a time:

1. **Margin enrichment** (only if chapters fell short of style guide §3.1):
   add real-world numbers, cautions, tips, cross-chapter links and
   sidenotes to both editions without touching the body.
2. **Terminology and index**: one inventory of every `\term`/`\index` of
   both editions against `glossary.tsv`; unify translations, case and
   plural variants of index keys, readings, `see` entries, term ownership.
3. **Cross-references**: chapter numbers in prose against the syllabus,
   `\cref` targets, label prefixes and identity across editions,
   `\lessoninfo` and summaries, orphan figures.
4. **Full-book visual QA**, strictly one edition at a time:
   `tools/book-check.sh <lang>`, then read **every** rendered page and fix
   layout in the chapter sources (style guide §8).  Commit each edition with
   `COMMIT_SCOPE=<lang> tools/commit-pass.sh "<subject>" "<body>"`.
   Defects that only the class can fix are collected, not patched locally
   (§4).

Each pass commits with `tools/commit-pass.sh`.

## 4. Class changes

`format/` is shared by every book made from the template and must stay
identical everywhere.

1. Change `format/lnotes.cls` in the **template** repository only; build the
   template book and a small test document that exercises the change.
2. Copy the class into each book repository, then for each edition:
   `tools/book-check.sh <lang>` and `tools/layout-diff.sh <lang>`.  The
   diff shows every page whose text moved; a change meant to be cosmetic
   must not change page counts or page breaks.
3. Commit the template, then each book ("Class …, synced from the
   template").

Loading order matters in the class: `amsmath` and `mathtools` must be
loaded before `unicode-math`, or `\underbrace` prints black boxes while the
log stays clean.  This is why every stage reads the rendered pages.

## 5. Machine resources

- A chapter build needs ~1.5 GB (`CHAPTER_MEM`), a whole-book build ~2.5 GB
  (`BOOK_MEM`) plus rendering.  `tools/book-check.sh` lets only one book
  build run on the machine at a time; do not start whole-book builds by
  hand in parallel.
- On a 12 GB machine, about six agents writing chapters in parallel is the
  limit.  When the session is killed, check
  `/sys/fs/cgroup/user.slice/user-$(id -u).slice/memory.events`
  (`oom_kill`): a rising count with the container's own limit untouched
  means the host ran out of memory — reduce parallelism.
- Long runs belong in a terminal multiplexer that survives the editor
  (e.g. a systemd user service running tmux).

## 6. Git and publishing

- Commit only through `tools/commit-lesson.sh` and `tools/commit-pass.sh`;
  they stage the content directories only and serialize concurrent commits.
  Never force-push or rewrite history — CI and Pages follow `main`.
- Trailer lines for every commit (e.g. `Co-Authored-By:`) go into
  `.git/commit-trailers` (not tracked) or `$COMMIT_TRAILERS`.
- CI builds both editions on every push, publishes them to the `pdf` branch
  (and Pages) and attaches them to `v*` releases; a newer push cancels a
  running build.

## 7. With Claude Code

The stages above exist as saved workflows in `.claude/workflows/`
(run them by name, e.g. "run the notes-chapters workflow for chapters
4–9").  Each reads `docs/book.md`, `docs/syllabus.json` and this guide from
the repository it runs in.

| Workflow | Args | Does |
|---|---|---|
| `notes-glossary` | — | writes `glossary.tsv` from the syllabus and the source |
| `notes-chapters` | `{chapters: [4, 5, …]}` | §2 for each chapter, committed one by one |
| `notes-margins` | `{chapters: [...]}` | §3.1 margin enrichment |
| `notes-integration` | — | §3.2 terminology and §3.3 cross-references |
| `notes-visual-qa` | `{langs: ["en", "ja"]}` | §3.4, one edition after the other |

Before running them, write the commit trailers to `.git/commit-trailers`.
A workflow that is interrupted part-way is best continued by looking at
what each chapter already has (files, commits) and starting a fresh run
for the remaining stages, rather than by resuming.
