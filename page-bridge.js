(() => {
  'use strict';

  /* Why this small MAIN-world bridge exists:
  
  content.js already reads the rendered page DOM from Chrome's default ISOLATED
  world. For Mermaid blocks, however, DeepWiki replaces the original source text
  with an <svg>; the exact `graph TD ...` input is no longer present in that DOM
  subtree. React still retains the input on the <pre> element's private
  `__reactProps$...` property, but JavaScript expandos belong to the world that
  created them and are therefore invisible to the isolated content script.
  
  This file runs in the page's MAIN world solely to read that retained render
  input. On an explicit request from content.js it copies the source onto the
  corresponding SVG as a DOM attribute, which both worlds can see. It does not
  execute the source, access extension APIs, observe the page continuously, or
  transmit data anywhere. */
  const PREPARE_EVENT = 'deepwiki-md:prepare-mermaid-sources';
  const SOURCE_ATTRIBUTE = 'data-deepwiki-mermaid-source';

  function findMermaidSource(value, seen = new WeakSet(), depth = 0) {
    if (!value || typeof value !== 'object' || depth > 6 || seen.has(value)) {
      return '';
    }
    seen.add(value);

    const className = typeof value.className === 'string' ? value.className : '';
    if (/\blanguage-mermaid\b/.test(className) && typeof value.children === 'string') {
      return value.children;
    }

    const candidates = Array.isArray(value)
      ? value
      : [value.props, value.children];
    for (const candidate of candidates) {
      const source = findMermaidSource(candidate, seen, depth + 1);
      if (source) return source;
    }
    return '';
  }

  function getReactProps(element) {
    const propsKey = Object.keys(element).find(key => key.startsWith('__reactProps$'));
    return propsKey ? element[propsKey] : null;
  }

  function attachMermaidSources() {
    document.querySelectorAll('pre').forEach(pre => {
      const svgs = pre.querySelectorAll('svg');
      if (svgs.length === 0) return;

      svgs.forEach(svg => svg.removeAttribute(SOURCE_ATTRIBUTE));
      const source = findMermaidSource(getReactProps(pre));
      if (!source) return;
      svgs.forEach(svg => svg.setAttribute(SOURCE_ATTRIBUTE, source));
    });
  }

  if (typeof window.__deepwikiMermaidBridgeHandler === 'function') {
    document.removeEventListener(PREPARE_EVENT, window.__deepwikiMermaidBridgeHandler);
  }
  window.__deepwikiMermaidBridgeHandler = attachMermaidSources;
  document.addEventListener(PREPARE_EVENT, attachMermaidSources);
})();
