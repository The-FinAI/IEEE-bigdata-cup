import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dir = new URL("public/references/", root);

async function bibFiles() {
  return (await readdir(dir)).filter((n) => n.endsWith(".bib")).sort();
}

const read = (name) => readFile(new URL(name, dir), "utf8");

/** Entries as {key: body}, keyed on the citation key. */
function entries(text) {
  const found = {};
  const re = /@\w+\{([^,\s]+),/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    // Walk braces from the entry's opening brace to its matching close, so a
    // malformed entry is visible rather than silently swallowing the next one.
    let depth = 0;
    let i = text.indexOf("{", match.index);
    const start = i;
    for (; i < text.length; i += 1) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    found[match[1]] = text.slice(start, i + 1);
  }
  return found;
}

test("every published .bib is brace-balanced", async () => {
  // A citation entry whose closing brace went missing does not fail quietly:
  // BibTeX errors, and because the home page serves these files for copy and
  // download, the entry swallows whatever follows it in the file. This nearly
  // shipped -- a pasted entry had its final "}" percent-encoded into the url
  // field, leaving nine opening braces against eight closing ones.
  for (const name of await bibFiles()) {
    const text = await read(name);
    const open = (text.match(/\{/g) ?? []).length;
    const close = (text.match(/\}/g) ?? []).length;
    assert.equal(open, close, `${name}: ${open} opening braces, ${close} closing`);
  }
});

test("no published .bib carries a percent-encoded brace", async () => {
  // %7B and %7D are how a brace arrives when an entry has been round-tripped
  // through a URL. In a url field it also makes the link itself wrong.
  for (const name of await bibFiles()) {
    const text = await read(name);
    assert.doesNotMatch(text, /%7[BD]/i, `${name} contains a percent-encoded brace`);
  }
});

test("the combined overviews file matches each standalone entry", async () => {
  // The combined download is a separate copy with no generator keeping it in
  // step, so updating one file and forgetting the other publishes two
  // different author lists for the same citation key.
  const combined = entries(await read("finreason2026-overviews.bib"));
  const standalone = (await bibFiles()).filter(
    (n) => n.startsWith("finreason2026") && n !== "finreason2026-overviews.bib",
  );
  assert.ok(standalone.length >= 3, `expected the overview files, got ${standalone}`);
  for (const name of standalone) {
    for (const [key, body] of Object.entries(entries(await read(name)))) {
      assert.ok(key in combined, `${key} is in ${name} but missing from the combined file`);
      assert.equal(
        body.replace(/\s+/g, " ").trim(),
        combined[key].replace(/\s+/g, " ").trim(),
        `${key} differs between ${name} and the combined file`,
      );
    }
  }
});

test("the page names exactly the tasks whose authors are still pending", async () => {
  // The card label is derived from the file -- it flips on
  // bibtex.includes("{{Pending}}") -- but the sentence above it is prose, and
  // prose does not follow a file. Filling in Task 3's authors left the page
  // telling participants that Task 3 was still pending.
  const page = await readFile(new URL("out/index.html", root), "utf8");
  const pending = [];
  for (const name of await bibFiles()) {
    if (!name.startsWith("finreason2026") || name.endsWith("overviews.bib")) continue;
    const task = name.match(/task(\d)/)?.[1];
    if (task && (await read(name)).includes("{{Pending}}")) pending.push(task);
  }
  const sentence = page.match(/[^.<>]*uses? <code>Pending<\/code>[^.]*\./)?.[0] ?? "";
  assert.notEqual(sentence, "", "the page no longer says which authors are pending");
  for (const task of ["1", "2", "3"]) {
    const named = new RegExp(`Task ${task}`).test(sentence);
    assert.equal(
      named,
      pending.includes(task),
      pending.includes(task)
        ? `Task ${task} still has {{Pending}} authors but the page omits it`
        : `Task ${task}'s authors are filled in but the page still calls them pending`,
    );
  }
});
