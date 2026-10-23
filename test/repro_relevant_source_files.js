// Verify that DeepWiki's generated "Relevant source files" provenance block is
// omitted without removing ordinary <details> content.
// Run: node test/repro_relevant_source_files.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const contentSrc = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const helperMatch = contentSrc.match(/function isRelevantSourceFilesDetails\s*\([\s\S]*?\n  \}/m);
const processMatch = contentSrc.match(/function processNode\s*\([\s\S]*?\n  \}/m);
if (!helperMatch || !processMatch) throw new Error('Could not extract conversion functions');

const dom = new JSDOM(`<!DOCTYPE html><body>
  <h1>Introduction</h1>
  <details open>
    <summary><span>Relevant   source files</span></summary>
    <p>The following files were used as context for generating this wiki page:</p>
    <ul><li><a href="README.md">README.md</a></li></ul>
  </details>
  <p>Article body remains.</p>
  <details><summary>Implementation notes</summary><p>Keep this disclosure.</p></details>
</body>`);

const Node = dom.window.Node;
eval(helperMatch[0]);
eval(processMatch[0]);

let markdown = '';
dom.window.document.body.childNodes.forEach(child => {
  markdown += processNode(child);
});

if (/Relevant\s+source files/i.test(markdown)) throw new Error('Provenance summary was exported');
if (markdown.includes('README.md')) throw new Error('Provenance file list was exported');
if (!markdown.includes('Article body remains.')) throw new Error('Article body was removed');
if (!markdown.includes('Implementation notes') || !markdown.includes('Keep this disclosure.')) {
  throw new Error('Ordinary details content was removed');
}
console.log('PASS: provenance block omitted and ordinary details preserved');
