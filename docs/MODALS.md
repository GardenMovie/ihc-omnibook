# Modals: what they do and how they use the backend

For whoever builds the modals. Requirements are in `SPEC.md` (sections 6 and 8) and visuals in `STYLE.md`; this file covers behavior and the functions to call. Use `AppModal` (`components/ui/app-modal.tsx`) for all of them, and put every string in `messages/pt-BR.json`.

## 1. The backend in short

Everything runs in the browser. There is no server or API. Files, covers and metadata are in IndexedDB.

| Import from | What it has |
|---|---|
| `@/lib/library` | `addFile`, `addFiles`, `getBookFile`, `deleteEverything` |
| `@/lib/db/books` | read, edit, confirm, delete, undo, collections, `listTerms` |
| `@/lib/hooks` | `useBooks`, `useDrafts`, `useCollections`, `useCoverUrl` |
| `@/lib/refs/*` | `toBibtex`, `toAbnt`, `toAbntParts`, `missingFields` |
| `@/lib/files/backup` | `exportLibrary`, `importLibrary` |
| `@/lib/storage` | `storageStatus`, `getLastExportAt` |

Rules:

- **Only change data through these functions.** Do not write to `db` from a component.
- **Do not refresh anything by hand.** The `use…` hooks update when the data changes. Their `data` is `undefined` while loading.
- **Call them from event handlers or effects**, never during render (the page is prerendered, where there is no database).
- **Writes can fail** (full disk, blocked storage). Catch the error and say what happened and how to fix it.

### The data

`Book` is defined in `lib/db/types.ts`. What the modals edit:

| Field | Type | Label (pt-BR) | Notes |
|---|---|---|---|
| `title` | `string` | Título | Never empty: a blank value is ignored |
| `authors` | `string[]` | Autor | One entry per person, see below |
| `year` | `number?` | Ano | Publication year, positive integer |
| `publisher` | `string?` | Editora | |
| `place` | `string?` | Local | City of publication, used by ABNT |
| `edition` | `string?` | Edição | `"2"` becomes "2. ed." in ABNT |
| `isbn` | `string?` | ISBN | |
| `language` | `string?` | Idioma | BCP-47: `"pt-BR"`, `"en"`. Show with `languageLabel` |
| `areas` | `string[]` | Área | Free text, many |
| `topics` | `string[]` | Tópicos | Free text, many |
| `accessibility` | object? | Acessibilidade | Read from the file; show it, no need to edit |

**Author names:** "João Silva" and "Silva, João" both work. A name ending in a comma ("Universidade Federal do ABC,") is treated as one block, for institutions. Give each author a separate input or chip, and say this in the field's hint. Do not split on commas in the form.

**To clear a field**, send it with an empty value (`""`, `[]` or `year: undefined`). A field left out of the patch is not touched.

**Auto and user values:** `book.metaSource.title` is `"auto"` or `"user"`. The functions maintain it: only values that really change become `"user"`, and those are never overwritten afterwards. A form can send every field on save.

## 2. Add book, step 1: upload (`addLivroUpload`)

**Built:** `components/modals/AddBookModal.tsx` (both steps, queue, discard and undo) and `UploadStep.tsx`.

Three ways in, all required: the **"Escolher arquivos"** button (`<input type="file" multiple accept=".pdf,.epub,.txt,.md,.markdown">`), drag and drop, and paste. Each gives a list of `File`s:

```ts
import { addFiles } from "@/lib/library";

const results = await addFiles(files, (result) => {
  // called after each file: update progress and announce it
});
```

Files are processed one at a time. A large PDF takes a moment, so show progress ("2 de 5") in an `aria-live` region and disable the buttons meanwhile.

Handle each `result.status`:

| Status | Meaning | What to show |
|---|---|---|
| `added` | File saved as a **draft** in `result.book` | Go on to step 2 |
| `added` with `unreadable: true` | Damaged or protected; only the filename was used | In step 2, say the data could not be read |
| `duplicate` | Same file already in the library (`result.book`) | "Este arquivo já está na biblioteca", offer to show it |
| `unsupported` | Not PDF, EPUB, TXT or MD | Name the file and the accepted formats |
| `failed`, `reason: "storage-full"` | No space left | Say so; suggest exporting and removing books |
| `failed`, `reason: "unknown"` | Anything else | Name the file, offer to try again |

`duplicate` can point to a draft (added before, never confirmed); the modal says it is waiting for review, and "Continuar" opens the queue.

To let the user turn auto-fill off (SPEC 5.2), call `addFile(file, { autoFill: false })` for each file.

The first add asks the browser to keep the data (`navigator.storage.persist()`). Firefox may show its own permission prompt.

## 3. Add book, step 2: details (`addLivroDetalhes`)

**Built:** `components/modals/DetailsStep.tsx`. The form itself (state, validation and groups of fields) is in `book-form.tsx`, shared with "Editar"; the inputs are in `fields.tsx`.

Reviews one draft at a time. The queue is the list of drafts:

```ts
const { data: drafts } = useDrafts(); // oldest first
const draft = drafts?.[0];
```

- Show the banner "Preenchido automaticamente. Confira e corrija o que precisar." (not when nothing was filled in).
- Fields: cover (`<BookCover book={draft} />`), Título, Autor, Ano, Idioma, Área, Tópicos. Editora, Local, Edição and ISBN are always shown, and are optional: references need them.
- Reset the form when `draft.id` changes (`key={draft.id}`).
- Show the position in the queue ("Livro 1 de 3").
- **Confirm:** `await confirmDraft(draft.id, formValues)`. The book appears in the library and the next draft takes its place. Announce "Livro adicionado".
- **Cancel or close (Esc):** do nothing. The draft stays saved, so no added file is lost. When drafts exist, the main screen should offer "Revisar N livros pendentes".
- **Discard** (a separate, clearly named action): `deleteBook(draft.id)`, with undo through `restoreBook(draft.id)`.

## 4. Edit metadata (`editarMetadados`)

**Built:** `components/modals/EditBookModal.tsx`, including delete with confirmation and undo. Collections are not in it yet.

Two sections: **Dados do livro** (title, authors, year, publisher, place, edition, ISBN, language) and **Organização** (areas, topics, and optionally collections).

```ts
await updateBook(book.id, formValues);
```

Suggest values already in use, so people do not create near-duplicates:

```ts
const { areas, topics } = await listTerms();
```

Repeats that differ only in case or accents are removed on save.

Collections (`useCollections()` for the list):

```ts
await createCollection("TCC", [book.id]);
await addToCollection(collectionId, [book.id]);
await removeFromCollection(collectionId, [book.id]);
await renameCollection(collectionId, "Novo nome"); // throws if blank
await deleteCollection(collectionId);              // books are kept
```

**Delete the book:** confirm with a dialog that names it, call `deleteBook(id)`, and show a toast with "Desfazer" that calls `restoreBook(id)`. Deleted books are removed for good when the app is opened at least a day later.

## 5. Export reference (`exportarReferencia`)

**Built:** `components/modals/ExportRefModal.tsx`. "Editar" from it returns to the reference afterwards.

```ts
const bibtex = toBibtex(book);        // string
const abnt = toAbnt(book);            // plain string
const parts = toAbntParts(book);      // [{ text, bold? }], title is bold
const missing = missingFields(book, format); // "abnt" | "bibtex"
```

- BibTeX | ABNT toggle, preview, copy.
- Render ABNT from `parts` (`bold` as `<strong>`). To keep the bold when pasting into a word processor, copy both `text/html` and `text/plain` with `navigator.clipboard.write`; escape the text when building the HTML.
- If `missing` is not empty, list those fields by their labels and offer "Editar". Missing parts are left out of the reference, never invented.
- Pass the live book from `useBooks()` so the preview updates after an edit.
- **Baixar .bib:** make a `Blob` from `bibtex` and name it `bookFileName(book).replace(/\.[^.]+$/, ".bib")`.
- Announce "Referência copiada".

BibTeX braces are added only around words with a capital after the first letter ("DNA"). Other proper nouns cannot be detected.

## 6. Other screens that need the backend

No modal is designed for these yet.

**Book details on narrow screens (built):** below 64rem the details panel is not shown under the list. Choosing a book opens it as a full-window `AppModal` (`fullScreen`, no footer), closed with the X or Esc. Edit, export and the reader open on top of it and return to it; deleting the book closes it. The browser's Back button does not close it.

**Download a book (built):** "Baixar arquivo" in the details panel. `getBookFile(id)` returns a `File` already named `Autor - Título (Ano).ext`; `saveFile` (`lib/download.ts`) hands it to the browser.

**Open a book (built for TXT and MD):** "Abrir" shows `components/reader/ReaderModal.tsx`, a full-window `AppModal` (`fullScreen`). Opening calls `markOpened(id)` so "Acesso recente" works. The place reached is kept in `book.readPosition` (0 to 1) with `saveReadPosition`, and goes into backups. The browser's Back button closes the reader. Markdown never runs HTML or loads images. PDF opens in a new tab with the browser's own viewer, from a `blob:` address (no reading position is kept). EPUB still shows the "em breve" notice, since browsers cannot display it; read `personalDocs/EPUB-SECURITY.md` first.

**Search:** plain words match the title and authors only.

**Filters (built):** typed in the search box as `@área:` and `@tópico:` (also `@area:`, `@topico:`, `@topic:`), with quotes around values with spaces. `@arquivo:` (or `@file:`) filters by file type (`.txt`, `.md`, `.pdf`, `.epub`, dot optional); typing just `@arquivo` already lists the four. Syntax and suggestions are in `lib/search.ts`; highlighting and the suggestion list in `components/library/SearchBox.tsx`. Filters of the same kind add up (OR); different kinds and plain words narrow (AND).

**Collections (later):** the idea is that a collection is a saved search query. That would not use the `bookIds` collections in `lib/db/books.ts` described in section 4.

**Export the library (built):** settings, "Seus dados" tab.

```ts
const { blob, fileName } = await exportLibrary({ settings }); // everything
const some = await exportLibrary({ ids });                    // selection
```

**Import a backup (built):** settings, "Seus dados" tab. It shows the counts, and offers the backup's settings only if they differ.

```ts
const result = await importLibrary(zipFile); // throws if it is not readable
// result: { added, merged, skipped, unlisted, settings? }
```

- `merged` books were already there; local user edits were kept.
- `unlisted` are files without saved data: `AddResult`s like step 1, waiting as drafts.
- `settings` came from the backup and was not checked or applied. Ask first, and pass it through `readSettings` (`lib/settings.ts`).
- A folder of PDFs or EPUBs (no zip) goes through `addFiles`.

**Storage and privacy (settings):** "Apagar tudo" is built, in the "Seus dados" tab, with one confirmation (at most 2 steps, SPEC 5.2). Not shown yet: `storageStatus()` gives `persisted`, `usedBytes` and `quotaBytes`; `getLastExportAt()` supports a gentle backup reminder.

### Keyboard shortcuts

Defined in `lib/shortcuts.ts`, handled in `Library`, listed and changed in Configurações, tab "Atalhos" (`?` opens it). They do nothing while the user types or a modal is open (except the book's own, over its full-screen details). Single-character ones can be remapped or turned off (WCAG 2.1.4).
## 7. Checklist for each modal

SPEC section 11: keyboard only, focus trapped and restored, labeled for screen readers, changes announced, works at 200% zoom, no information by color alone, plain pt-BR.

## 8. Development tools

`npm run dev` shows a **Dev tools** panel (bottom left) to load sample books, export, import and delete everything. It is not in the production build. Most samples are stand-ins; the Gutenberg TXT books and "Teste de Markdown" are real files (in `lib/dev/books/`) for trying the reader. Delete `components/dev/` and its use in `Library.tsx` once screens cover export, import and delete (the browser tests use them).

**Testing note:** Playwright's Firefox segfaults when files are chosen in a page where axe has already run, so the browser tests run axe in Chromium only.

## 9. Not done yet

- **OPFS:** files are stored in IndexedDB. See the note in `lib/files/store.ts` before moving them.
- **Offline (PWA) and the exe.** The exe's server must serve `.mjs` files as JavaScript, or PDF reading fails.
- **Scanned PDFs:** pages using JBIG2 or JPEG 2000 images may get a blank cover, because pdf.js's decoder files are not shipped with the app.
- **Large libraries:** the backup zip is built in the browser's memory or temporary storage. It has not been tried with hundreds of books.
