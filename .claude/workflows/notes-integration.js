export const meta = {
  name: 'notes-integration',
  description: 'Book-level passes over a finished latex-lecture-notes book: terminology and index, then cross-references and conventions',
  whenToUse: 'In a latex-lecture-notes book once every chapter is written (and margin-enriched). Run notes-visual-qa afterwards. args: {repo?: "/abs/path"}',
  phases: [
    { title: 'Terminology & index', detail: 'glossary gaps, translation drift, index keys, readings, see-entries, term ownership' },
    { title: 'Cross-references', detail: 'chapter numbers, \\cref targets, labels, per-chapter conventions' },
  ],
}

const repo = args && args.repo
  ? `Repository: ${args.repo} — work only inside it and run every command from its root.`
  : 'Repository: the current working directory, a book made from latex-lecture-notes-template — work only inside it and run every command from its root.'

const RESULT = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    chaptersTouched: { type: 'array', items: { type: 'string' } },
    buildsClean: { type: 'boolean' },
    commitOutput: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['fixed', 'deferred', 'chaptersTouched', 'buildsClean', 'commitOutput', 'notes'],
}

const common = `${repo}
The book is complete: every chapter of docs/syllabus.json exists in en/lessons/ and ja/lessons/, with shared figures/, bib/, glossary.tsv. Rules: docs/style-guide.md; this book: docs/book.md.
Build one chapter: tools/chapter-check.sh <en|ja> <slug> (Bash timeout 900000). Do not build the whole book in this pass.
Commit with tools/commit-pass.sh "<subject>" "<body>"; it stages the content directories, commits and pushes. Never force-push or rewrite history.
The two editions are mirrors: a content change in one edition is made in the other too.`

phase('Terminology & index')
const term = await agent(`Make terminology and the index consistent across the whole book.
${common}
1. Inventory: collect every \\term (with its sort key and gloss) and every explicit \\index from all chapters of both editions, plus every row of glossary.tsv — write a compact script for this.
2. Find and fix:
   - \\term'ed terms without a glossary row (add the row);
   - one English concept translated differently in different chapters, or one Japanese term used for two concepts — unify on the glossary form (or fix the glossary if it is the outlier) in every affected chapter of both editions;
   - English index keys that differ only in case, number or acronym-vs-full-form, so one concept produces two index entries;
   - Japanese readings that are wrong, missing where the term contains kanji, or inconsistent between chapters (they decide the index order);
   - \\index{X|see{Y}} entries that are circular or point at a term the index does not contain;
   - concepts the glossary assigns to a chapter that never \\term's them, and terms \\term'ed in more than one chapter (only the owning chapter should).
3. Apply the fixes. Re-run tools/chapter-check.sh for every chapter you touched, in both editions, until each is clean.
4. Commit with tools/commit-pass.sh.
Report what you fixed, what you deliberately left (with the reason), chapters touched, whether all rebuilt chapters are clean, and the commit output.`, { label: 'terminology', phase: 'Terminology & index', schema: RESULT })
if (!term) throw new Error('terminology pass failed')
log(`terminology: ${term.fixed.length} fixed, ${term.chaptersTouched.length} chapters touched`)

phase('Cross-references')
const xref = await agent(`Check and fix cross-references and per-chapter conventions across the whole book.
${common}
Check every chapter of both editions for:
- references in prose to another chapter ("Lesson N"/"Chapter N" and "第N章"): does the number match the chapter that covers the topic (docs/syllabus.json is the authority)? Forward references must point at existing chapters.
- \\cref targets: every referenced label exists; Japanese chapters do not use \\Cref.
- labels: unique across the book, prefixed with the chapter number (l<NN>-), identical in the two editions of a chapter.
- \\lessoninfo present and complete, with the same information in both editions; a final keypoint summary in every chapter; one \\source per section.
- figures: every figures/l<NN>-*.tex is \\input by the chapter that owns it; no orphan figure files; Japanese branches wherever a figure carries prose.
- bibliography: every bib/<slug>.bib is listed in both main.tex files (tools/sync-main.py --check), no duplicate keys across bib files, no unused entries.
- code listings: \\end{lstlisting} at column 0, lines within the body width.
Fix what is wrong in both editions, re-run tools/chapter-check.sh for every chapter you touched until clean, and commit with tools/commit-pass.sh.
Report fixed items, deferred items with reasons, chapters touched, build status and the commit output.`, { label: 'cross-references', phase: 'Cross-references', schema: RESULT })
if (!xref) throw new Error('cross-reference pass failed')
log(`cross-references: ${xref.fixed.length} fixed`)

return { terminology: term, crossReferences: xref }
