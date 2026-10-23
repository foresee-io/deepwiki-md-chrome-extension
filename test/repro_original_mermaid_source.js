// Verify that the MAIN-world bridge exposes DeepWiki's original Mermaid source and
// that content.js prefers it over reconstructing the rendered SVG.
// Run: node test/repro_original_mermaid_source.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const originalSource = `graph TD
    A["Original label"] -->|"Exact edge text"| B["Destination"]`;
const dom = new JSDOM(`<!DOCTYPE html><body>
  <pre><div><svg class="flowchart" aria-roledescription="flowchart-v2"></svg></div></pre>
</body>`, { runScripts: 'outside-only' });

const { document } = dom.window;
const pre = document.querySelector('pre');
pre.__reactProps$test = {
  children: {
    props: {
      className: 'language-mermaid',
      children: originalSource
    }
  }
};

dom.window.eval(fs.readFileSync(path.join(__dirname, '..', 'page-bridge.js'), 'utf8'));
document.dispatchEvent(new dom.window.Event('deepwiki-md:prepare-mermaid-sources'));

const contentSrc = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const match = contentSrc.match(/function convertSvgToMarkdown\s*\([\s\S]*?\n  \}/m);
if (!match) throw new Error('Could not extract convertSvgToMarkdown');

const DEBUG_MODE = false;
eval(match[0]);
const markdown = convertSvgToMarkdown(document.querySelector('svg'));

if (!markdown.includes(originalSource)) throw new Error('Original Mermaid source was not preserved');
if (markdown.includes('[Flowchart Diagram]')) throw new Error('Placeholder was emitted');
console.log('PASS: original Mermaid source was exported verbatim');
