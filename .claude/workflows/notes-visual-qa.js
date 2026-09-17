export const meta = {
  name: 'notes-visual-qa',
  description: 'Full-book visual QA of a latex-lecture-notes book, one edition at a time: build, read every page, fix layout, commit',
  whenToUse: 'In a finished latex-lecture-notes book, after notes-integration. args: {langs?: ["en", "ja"], repo?: "/abs/path"}. Editions run one after the other on purpose (a whole-book build needs ~2.5 GB).',
  phases: [{ title: 'Visual QA', detail: 'build one edition, render every page, read them all, fix layout in the chapter sources' }],
}

const langs = (args && args.langs) || ['en', 'ja']
const repo = args && args.repo
  ? `Repository: ${args.repo} — work only inside it and run every command from its root.`
  : 'Repository: the current working directory, a book made from latex-lecture-notes-template — work only inside it and run every command from its root.'

const QA = {
  type: 'object',
  properties: {
    pagesInspected: { type: 'integer' },
    defectsFound: { type: 'array', items: { type: 'object', properties: {
      page: { type: 'integer' }, kind: { type: 'string' }, description: { type: 'string' }, fixed: { type: 'boolean' },
    }, required: ['page', 'kind', 'description', 'fixed'] } },
    classChangesNeeded: { type: 'array', items: { type: 'string' } },
    chaptersTouched: { type: 'array', items: { type: 'string' } },
    pagesAfter: { type: 'integer' },
    buildClean: { type: 'boolean' },
    commitOutput: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['pagesInspected', 'defectsFound', 'classChangesNeeded', 'chaptersTouched', 'pagesAfter', 'buildClean', 'commitOutput', 'notes'],
}

function prompt(lang) {
  const L = lang === 'en' ? 'English' : 'Japanese'
  return `Read the whole ${L} edition of this book page by page and fix what looks wrong.
${repo}
The book is complete. Rules: docs/style-guide.md — §8 (page layout) in particular; this book: docs/book.md.
Memory is limited: never run more than one LaTeX or Ghostscript container at a time; use the tools below, which set the limits.

1. Build and render the ${L} edition: tools/book-check.sh ${lang}  (10–30 min; Bash timeout 2400000). It prints a log summary and renders every page to .png/book-${lang}-NNN.png.
2. Read EVERY rendered page, in batches of about 10, and look for defects a log cannot show:
   - glyphs printed as black boxes or stray characters, garbled math, missing CJK or accents;
   - text, tables, listings or figures running into the margin column or off the page;
   - margin notes colliding, drifting far from their anchor, running below the text block, or printed over a figure;
   - large empty areas, orphaned headings, split short listings, a page holding only a summary box;
   - figure text too small to read at 110 dpi, Japanese labels overflowing their boxes;
   - table of contents, bibliography and index: broken entries, wrong order, overlapping numbers.
3. Fix what is fixable in the chapter sources of THIS edition (${lang}/lessons/) and in shared figures (figures/, changing only the ${L} output of a figure). Layout only — do not rewrite content; a content-affecting fix must also be made in the other edition (say so).
   Do not edit format/ (the class is shared by several books). A defect that only the class can fix goes under classChangesNeeded, with the change you suggest.
4. If the working tree already contains uncommitted edits from an interrupted earlier run (git status), review those in ${lang}/lessons/ and figures/ as part of your pass: keep what is right, revert what is not. Leave the other edition's files alone.
5. Rebuild with tools/book-check.sh ${lang}, re-read the pages you changed and their neighbours (page breaks move). Then commit and push:
   COMMIT_SCOPE=${lang} tools/commit-pass.sh "Visual QA of the ${L} edition: <main kinds of fixes>" "<body: what was fixed where, page count, build status>"
   Never force-push or rewrite history.
Report pages inspected, every defect (page, kind, description, fixed or not), needed class changes, chapters touched, the page count after your fixes, whether the final build is clean, the commit output, and notes.`
}

phase('Visual QA')
const out = []
for (const lang of langs) {
  const r = await agent(prompt(lang), { label: `visual-qa:${lang}`, phase: 'Visual QA', schema: QA })
  if (!r) { log(`visual QA ${lang} FAILED — continuing with the next edition`); out.push({ lang, failed: true }); continue }
  log(`${lang}: ${r.pagesInspected} pages, ${r.defectsFound.length} defects (${r.defectsFound.filter(d => d.fixed).length} fixed), ${r.classChangesNeeded.length} class changes suggested`)
  out.push({ lang, ...r })
}
return { results: out, classChangesNeeded: out.flatMap(r => (r.classChangesNeeded || []).map(c => `${r.lang}: ${c}`)) }
