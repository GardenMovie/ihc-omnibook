import "fake-indexeddb/auto";
import { DOMParser } from "linkedom";

// Node has no DOMParser; the EPUB reader uses the browser's.
globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
