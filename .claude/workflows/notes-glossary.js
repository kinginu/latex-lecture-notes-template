export const meta = {
  name: 'notes-glossary',
  description: 'Build glossary.tsv (term ownership, Japanese terms, readings) for a latex-lecture-notes book before its chapters are written',
  whenToUse: 'In a book repository made from latex-lecture-notes-template, after docs/book.md and docs/syllabus.json are filled in. args: {repo?: "/abs/path"}',
  phases: [{ title: 'Glossary', detail: 'one row per concept, owned by the chapter that first defines it' }],
}

const repo = args && args.repo
  ? `Repository: ${args.repo} — work only inside it and run every command from its root.`
  : 'Repository: the current working directory, a book made from latex-lecture-notes-template — work only inside it and run every command from its root.'

const GLOSSARY = {
  type: 'object',
  properties: {
    rows: { type: 'integer' },
    perChapter: { type: 'string' },
    hardChoices: { type: 'array', items: { type: 'string' } },
    commitOutput: { type: 'string' },
  },
  required: ['rows', 'perChapter', 'hardChoices', 'commitOutput'],
}

phase('Glossary')
const g = await agent(`Build the terminology glossary of a bilingual (English/Japanese) book of notes.
${repo}
Read: docs/book.md (source material, field), docs/style-guide.md (§3, §6), docs/syllabus.json (chapters and their source units), and any chapters that already exist in en/lessons/ and ja/lessons/ (their \\term entries are final: keep exactly their English key, Japanese term and reading, with the chapter where they appear).
For software documentation or tutorials, read the source (WebFetch) at the version docs/book.md pins.

Write glossary.tsv — UTF-8, tab-separated, header line exactly:
en\tja\treading\tlesson\tnote
- en: canonical English index key, lowercase except proper nouns and acronyms, full form ("static single assignment form"). One row per concept. Acronyms get their own row with note "see: <full form>" and the same lesson.
- ja: the standard Japanese technical term of the field as used in Japanese textbooks and documentation (katakana for established loanwords; keep the English term or acronym where Japanese literature does, e.g. TLB, SSA, MLIR).
- reading: hiragana reading of the ja term for index sorting (ー allowed); for Latin-letter terms repeat the term.
- lesson: the number of the chapter where the source FIRST DEFINES the concept (that chapter owns the \\term; later chapters must not re-define it).
- note: optional disambiguation.
Cover every concept the source defines, in source order within each chapter — typically 15–60 terms per chapter. Code identifiers (class and function names) are not glossary terms.
Validate with a short script: every row has exactly 5 fields, lesson is a chapter number from the syllabus, no duplicate en keys, readings contain only hiragana, ー, Latin letters, digits and spaces. Fix and re-validate until clean.
Commit and push with: tools/commit-pass.sh "Glossary: <N> terms for <M> chapters"
Return the row count, a compact per-chapter count, the hard terminology choices you made, and the commit output.`, { label: 'glossary', phase: 'Glossary', schema: GLOSSARY })
if (!g) throw new Error('glossary agent failed')
log(`glossary: ${g.rows} rows (${g.perChapter})`)
return g
