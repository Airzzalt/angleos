import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { ZipLimitError, docxXmlToText, extOf, extractText, isZipMagic, normalizeText, readZip, safeName } from "../src/lib/uploads/extract.ts";

const LIM = { maxEntries: 400, maxTotal: 60 * 1024 * 1024, maxFile: 15 * 1024 * 1024, maxRatio: 200 };
const XL = { maxChars: 800_000, maxPdfPages: 300, maxFileBytes: 15 * 1024 * 1024 };
const accept = (n) => (/\.(txt|md)$/.test(n) ? null : "unsupported");

test("a normal zip is read and unsupported files are skipped", () => {
  const z = zipSync({ "a.txt": strToU8("hello world"), "sub/b.md": strToU8("# hi"), "run.exe": strToU8("MZ"), "empty/": new Uint8Array() });
  const r = readZip(z, accept, LIM);
  assert.deepEqual(r.entries.map((e) => e.name).sort(), ["a.txt", "sub/b.md"]);
  assert.ok(r.skipped.some((s) => s.name === "run.exe" && s.reason === "unsupported"));
});

test("zip bomb: a huge file inside a tiny zip is stopped", () => {
  const big = new Uint8Array(70 * 1024 * 1024); // zeros compress to almost nothing
  const z = zipSync({ "bomb.txt": big }, { level: 9 });
  assert.ok(z.length < 1024 * 1024);
  const r = readZip(z, accept, LIM);
  assert.equal(r.entries.length, 0);
  assert.ok(r.skipped.some((s) => s.name === "bomb.txt"));
});

test("zip bomb: many medium files past the total limit abort the whole zip", () => {
  const files = {};
  for (let i = 0; i < 8; i++) files[`f${i}.txt`] = new Uint8Array(10 * 1024 * 1024).map((_, j) => (j * 7 + i) % 251);
  const z = zipSync(files, { level: 0 });
  assert.throws(() => readZip(z, accept, { ...LIM, maxTotal: 40 * 1024 * 1024 }), ZipLimitError);
});

test("too many entries aborts", () => {
  const files = {};
  for (let i = 0; i < 30; i++) files[`f${i}.txt`] = strToU8("x");
  assert.throws(() => readZip(zipSync(files), accept, { ...LIM, maxEntries: 10 }), ZipLimitError);
});

test("zip files are recognised by content, not by name", () => {
  assert.equal(isZipMagic(strToU8("this is definitely not a zip file at all")), false);
  assert.equal(isZipMagic(zipSync({ "a.txt": strToU8("x") })), true);
});

test("names are cleaned (no climbing out of folders)", () => {
  assert.equal(safeName("../../etc/passwd"), "etc/passwd");
  assert.equal(safeName("C:\\Users\\me\\notes.txt"), "C/Users/me/notes.txt");
  assert.equal(safeName("a\u0000b<c>.txt"), "abc.txt");
  assert.equal(safeName("///"), "file");
  assert.equal(extOf("Report.PDF"), "pdf");
});

test("text files: read, binary refused", async () => {
  const ok = await extractText("n.txt", strToU8("Hello\r\n\r\n\r\n\r\n\r\nWorld"), XL);
  assert.equal(ok.type, "txt");
  assert.equal(ok.text, "Hello\n\n\nWorld");
  await assert.rejects(extractText("n.txt", new Uint8Array([72, 0, 1, 2, 0, 0]), XL), /binary/);
});

test("fake PDF and fake DOCX are refused by content, not name", async () => {
  await assert.rejects(extractText("a.pdf", strToU8("just text pretending"), XL), /not a real PDF/);
  await assert.rejects(extractText("a.docx", strToU8("just text pretending"), XL), /not a real Word/);
  await assert.rejects(extractText("a.exe", strToU8("MZ"), XL), /unsupported/);
});

test("docx text is extracted from the document XML", async () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>Hello &amp; welcome</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p></w:body></w:document>';
  const z = zipSync({ "word/document.xml": strToU8(xml), "[Content_Types].xml": strToU8("<x/>") });
  const r = await extractText("a.docx", z, XL);
  assert.equal(r.text, "Hello & welcome\nSecond");
  assert.equal(docxXmlToText("<w:t>a</w:t><w:tab/><w:t>b</w:t>"), "a\tb");
});

test("very long text is trimmed and flagged", async () => {
  const r = await extractText("big.txt", strToU8("word ".repeat(5000)), { ...XL, maxChars: 1000 });
  assert.equal(r.text.length, 1000);
  assert.equal(r.truncated, true);
});

test("normalizeText removes control characters", () => {
  assert.equal(normalizeText("a\u0001b\u0007c"), "abc");
});
