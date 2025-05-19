const markdownInput = document.getElementById('markdown-input');
const previewArea = document.getElementById('preview-area');
const messageBox = document.getElementById('message-box');
const helpModal = document.getElementById('help-modal');
const modalCloseButton = document.getElementById('modal-close-button');
const topBar = document.getElementById('top-bar');
const fontSelector = document.getElementById('font-selector');
const body = document.body;


const LOCAL_STORAGE_KEY = 'markdownMateContent';
const FONT_STORAGE_KEY = 'markdownMateFont';
const UML_SKELETON_CODE = `classDiagram
    class Animal {
        +String name
        +speak()
    }
    class Dog {
        +fetch()
    }
    Animal <|-- Dog`;
const UML_SKELETON_FULL = "```mermaid\n" + UML_SKELETON_CODE + "\n```";
const PAIR_MAP = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const DEFAULT_MARKDOWN_CONTENT = `# Welcome to Markdown Mate!

This is a sample document showing some features. "Smart" quotes are enabled!

## Text Formatting
* This is **bold text** using asterisks.
* This is __bold text__ using underscores.
* This is *italic text* using asterisks.
* This is _italic text_ using underscores.
* This is ***bold and italic***.
* This is ~~strikethrough~~.
* Inline \`code\` is wrapped in backticks.
* SmartyPants converts quotes: "Hello World". It also handles 'single quotes'.
* It converts dashes: An em-dash---like this. An en-dash--like that.
* And ellipses... pretty neat!

## Lists
### Unordered List
- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item
   1. Sub-item 3.1
   2. Sub-item 3.2

## Links and Images
[Visit Mermaid JS Docs](https://mermaid.js.org/intro/)

![Placeholder Image](logo.png)

## Blockquotes
> This is a blockquote.
> It can span multiple lines.

## Tables (GFM)
| Feature         | Status | Notes         |
|-----------------|--------|---------------|
| SmartyPants     | Added  | Typographic quotes, dashes, etc. |
| GFM Tables      | Active | Standard table syntax |
| Mermaid         | Active | For diagrams  |
| KaTeX           | Active | For Math      |

## Code Blocks
\`\`\`javascript
function greet(name) {
  // Template literals use backticks
  console.log(\`Hello, \${name}!\`);
}

greet('Markdown User');
\`\`\`

## Math (KaTeX)
Inline math: <span class="math-inline">E \= mc^2</span>
Block math:
<span class="math-block">\\\\frac\{\-b \\\\pm \\sqrt\{b^2 \- 4ac\}\}\{2a\}</span>

## Diagrams (Mermaid JS)
Click the UML button or type manually:
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it?};
    B -- Yes --> C[OK];
    C --> D[End];
    B -- No --> E[Fix it!];
    E --> B;
\`\`\`

---

Happy writing!
`;

// --- Scroll Sync State ---
let isSyncingScroll = false;
let scrollTimeout;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadFontPreference(); loadContent(); configureMarked(); initializeMermaid(); updatePreview(); setupScrollSync();
});

// --- Configuration ---
function configureMarked() {
    if (typeof marked === 'undefined') { console.error("Marked.js is not loaded."); return; }
    marked.setOptions({ gfm: true, breaks: true, pedantic: false, smartLists: true, smartypants: true,
        highlight: function(code, lang) { if (lang === 'mermaid') { return code; } if (typeof Prism === 'undefined' || typeof Prism.languages === 'undefined') { const escapedCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;"); return escapedCode; } const grammar = Prism.languages[lang]; if (grammar) { try { return Prism.highlight(code, grammar, lang); } catch (e) { console.warn(`Prism highlight failed: ${lang}`, e); } } const escapedCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;"); return escapedCode; }
    });
}
function initializeMermaid() {
     if (typeof mermaid === 'undefined') { console.error("Mermaid.js not loaded."); return; }
     try { mermaid.initialize({ startOnLoad: false, theme: 'dark' }); } catch (e) { console.error("Mermaid initialization failed:", e); }
}

// --- Default Content ---
function loadContent() {
    const savedContent = localStorage.getItem(LOCAL_STORAGE_KEY); markdownInput.value = savedContent || DEFAULT_MARKDOWN_CONTENT;
}
function saveContent() {
     localStorage.setItem(LOCAL_STORAGE_KEY, markdownInput.value);
}

// --- Font ---
function loadFontPreference() {
    const savedFont = localStorage.getItem(FONT_STORAGE_KEY); if (savedFont) { fontSelector.value = savedFont; } else { fontSelector.selectedIndex = 0; } applyFont(fontSelector.value || 'inter');
}
function saveFontPreference(font) {
    if (font) { localStorage.setItem(FONT_STORAGE_KEY, font); } else { localStorage.removeItem(FONT_STORAGE_KEY); }
}
function applyFont(font) {
    const fontClasses = { inter: 'font-inter', monospace: 'font-monospace', serif: 'font-serif' }; const elements = [markdownInput, previewArea]; elements.forEach(el => el.classList.remove('font-inter', 'font-monospace', 'font-serif')); const fontClass = fontClasses[font] || 'font-inter'; elements.forEach(el => el.classList.add(fontClass));
}

// --- Rendering ---
async function updatePreview() {
     const markdownText = markdownInput.value;
     if (typeof marked === 'undefined') { console.error("Marked.js not loaded."); return; }
     let htmlContent = '';
     try { htmlContent = marked.parse(markdownText); }
     catch (e) { console.error("Markdown parsing error:", e); return; }
     previewArea.innerHTML = htmlContent;

    // Highlighting
    if (typeof Prism !== 'undefined') {
        try { previewArea.querySelectorAll('pre code:not(.language-mermaid)').forEach((block) => { Prism.highlightElement(block); }); }
        catch (e) { console.error("Prism failed:", e); }
    } else { }

    // Mermaid
    if (typeof mermaid !== 'undefined') {
        try {
            const mermaidCodeBlocks = previewArea.querySelectorAll('code.language-mermaid');
            const elementsToRender = [];
            mermaidCodeBlocks.forEach((codeBlock) => {
                const preElement = codeBlock.parentElement;
                if (preElement && !preElement.classList.contains('mermaid')) {
                    preElement.classList.add('mermaid');
                    preElement.textContent = codeBlock.textContent;
                    elementsToRender.push(preElement);
                } else if (preElement && preElement.classList.contains('mermaid')) {
                     elementsToRender.push(preElement);
                }
            });
            if (elementsToRender.length > 0) { await mermaid.run({ nodes: elementsToRender }); }
        } catch (e) {
            console.error("Mermaid rendering failed:", e);
             previewArea.querySelectorAll('pre.mermaid').forEach(el => {
                 if (!el.querySelector('svg')) { el.innerHTML = `<div style="color: red; background: #333; padding: 10px; border-radius: 4px;">Mermaid Error: ${e.message || 'Unknown error'}</div>`; }
             });
        }
    }

     // ** KateX**
    if (typeof renderMathInElement === 'function') {
        try {
            renderMathInElement(previewArea, {
                delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}, {left: '\\(', right: '\\)', display: false}, {left: '\\[', right: '\\]', display: true} ],
                throwOnError: false
            });
        } catch (e) { console.error("KaTeX failed:", e); }
    } else { console.warn("KaTeX auto-render function not found."); }
}

// --- Toolbar ---
function applyMarkdownSyntax(syntax) {
    const start = markdownInput.selectionStart; const end = markdownInput.selectionEnd; const selectedText = markdownInput.value.substring(start, end); let replacement = ''; let selectPlaceholder = false; let placeholderText = '';
    switch (syntax.type) {
        case 'wrap': const prefixWrap = syntax.prefix; const suffixWrap = syntax.suffix || prefixWrap; placeholderText = syntax.placeholder || ''; if (selectedText) { replacement = prefixWrap + selectedText + suffixWrap; } else { replacement = prefixWrap + placeholderText + suffixWrap; if (placeholderText) { selectPlaceholder = true; } } break;
        case 'prefix': const linePrefix = syntax.prefix; placeholderText = syntax.placeholder || ''; if (selectedText) { const lines = selectedText.split('\n'); replacement = lines.map(line => line.trim() === '' ? line : linePrefix + line).join('\n'); } else { const currentLineStart = markdownInput.value.lastIndexOf('\n', start - 1) + 1; replacement = linePrefix + placeholderText; const before = markdownInput.value.substring(0, currentLineStart); const after = markdownInput.value.substring(currentLineStart); markdownInput.value = before + replacement + after; const placeholderStart = currentLineStart + linePrefix.length; const placeholderEnd = placeholderStart + placeholderText.length; markdownInput.focus(); markdownInput.setSelectionRange(placeholderStart, placeholderEnd); updatePreview(); saveContent(); return; } break;
        case 'link': const linkText = selectedText || 'link text'; placeholderText = 'url'; replacement = `[<span class="math-inline">\{linkText\}\]\(</span>{placeholderText})`; selectPlaceholder = !selectedText; break;
    }
    if (document.execCommand('insertText', false, replacement)) { markdownInput.focus(); if (selectPlaceholder) { const placeholderStart = start + syntax.prefix.length + (syntax.type === 'link' ? `[${selectedText || 'link text'}]`.length + 1 : 0); const placeholderEnd = placeholderStart + placeholderText.length; markdownInput.setSelectionRange(placeholderStart, placeholderEnd); } else if (selectedText && syntax.type !== 'prefix') { markdownInput.selectionStart = start + syntax.prefix.length; markdownInput.selectionEnd = start + replacement.length - (syntax.suffix || syntax.prefix).length; } } else { console.warn("execCommand('insertText') failed."); } updatePreview(); saveContent();
}

// --- Insert UML Skeleton ---
function insertUmlSkeleton() {
    const start = markdownInput.selectionStart; const end = markdownInput.selectionEnd; const textBefore = markdownInput.value.substring(0, start); const textAfter = markdownInput.value.substring(end); const needsNewlineBefore = textBefore.length > 0 && !textBefore.endsWith('\n\n') && textBefore.slice(-1) !== '\n'; const needsNewlineAfter = textAfter.length > 0 && !textAfter.startsWith('\n\n') && textAfter.slice(0, 1) !== '\n'; const skeletonToInsert = (needsNewlineBefore ? '\n' : '') + UML_SKELETON_FULL + (needsNewlineAfter ? '\n' : ''); const openingFenceLength = "```mermaid\n".length; const closingFenceLength = "\n```".length; const prefixLength = (needsNewlineBefore ? 1 : 0) + openingFenceLength; const suffixLength = closingFenceLength + (needsNewlineAfter ? 1 : 0);
    if (document.execCommand('insertText', false, skeletonToInsert)) { markdownInput.focus(); const selectionStart = start + prefixLength; const selectionEnd = start + skeletonToInsert.length - suffixLength; markdownInput.setSelectionRange(selectionStart, selectionEnd); } else { console.warn("execCommand('insertText') failed for UML skeleton."); } updatePreview(); saveContent();
}

// --- Synchronized Scrolling ---
function setupScrollSync() {
    const syncScroll = (source, target) => { if (isSyncingScroll) { isSyncingScroll = false; return; } const sourceScrollHeight = source.scrollHeight - source.clientHeight; const targetScrollHeight = target.scrollHeight - target.clientHeight; if (sourceScrollHeight <= 0 || targetScrollHeight <= 0) return; const scrollPercent = source.scrollTop / sourceScrollHeight; isSyncingScroll = true; target.scrollTop = scrollPercent * targetScrollHeight; }; const throttle = (func, limit) => { let inThrottle; return function() { const args = arguments; const context = this; if (!inThrottle) { func.apply(context, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); } } }; const throttledSyncFromInput = throttle(() => syncScroll(markdownInput, previewArea), 50); const throttledSyncFromPreview = throttle(() => syncScroll(previewArea, markdownInput), 50); markdownInput.addEventListener('scroll', throttledSyncFromInput); previewArea.addEventListener('scroll', throttledSyncFromPreview); markdownInput.addEventListener('mouseenter', () => syncScroll(previewArea, markdownInput)); previewArea.addEventListener('mouseenter', () => syncScroll(markdownInput, previewArea));
}

// --- Event Listeners ---
markdownInput.addEventListener('input', () => { requestAnimationFrame(() => { updatePreview(); saveContent(); }); });
topBar.addEventListener('click', (e) => {
    const button = e.target.closest('button'); if (button) { if (button.id === 'help-button') { helpModal.style.display = 'flex'; } else if (button.id === 'copy-html-button') { navigator.clipboard.writeText(previewArea.innerHTML).then(() => showNotification('HTML copied!')).catch(err => showNotification('Copy failed!', true)); } else if (button.id === 'export-md-button') { const blob = new Blob([markdownInput.value], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'markdown-mate.md'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showNotification('Markdown exported!'); } else if (button.dataset.action) { const action = button.dataset.action; switch (action) { case 'bold': applyMarkdownSyntax({ type: 'wrap', prefix: '**', placeholder: 'bold text', action: action }); break; case 'italic': applyMarkdownSyntax({ type: 'wrap', prefix: '*', placeholder: 'italic text', action: action }); break; case 'strikethrough': applyMarkdownSyntax({ type: 'wrap', prefix: '~~', placeholder: 'strikethrough', action: action }); break; case 'link': applyMarkdownSyntax({ type: 'link', prefix: '[', suffix: '](url)', placeholder: 'link text', action: action }); break; case 'code': applyMarkdownSyntax({ type: 'wrap', prefix: '`', suffix: '`', placeholder: 'code', action: action }); break; case 'blockquote': applyMarkdownSyntax({ type: 'prefix', prefix: '> ', placeholder: 'quote', action: action }); break; case 'uml-skeleton': insertUmlSkeleton(); break; } } }
});
markdownInput.addEventListener('beforeinput', (e) => {
    const data = e.data; if (data && data.length === 1 && PAIR_MAP.hasOwnProperty(data)) { e.preventDefault(); const start = markdownInput.selectionStart; const end = markdownInput.selectionEnd; const closing = PAIR_MAP[data]; const selectedText = markdownInput.value.substring(start, end); const textBefore = markdownInput.value.substring(0, start); const textAfter = markdownInput.value.substring(end); let replacement = ''; let finalCursorPos = start + 1; if (selectedText) { replacement = data + selectedText + closing; finalCursorPos = start + replacement.length; } else { replacement = data + closing; } markdownInput.value = textBefore + replacement + textAfter; markdownInput.focus(); markdownInput.selectionStart = markdownInput.selectionEnd = finalCursorPos; requestAnimationFrame(() => { updatePreview(); saveContent(); }); }
});
markdownInput.addEventListener('keydown', (e) => {
    const key = e.key; const start = markdownInput.selectionStart; const end = markdownInput.selectionEnd; if (key === 'Enter') { const cursor = markdownInput.selectionStart; const textBefore = markdownInput.value.substring(0, cursor); const lineStart = textBefore.lastIndexOf('\n') + 1; const lineEnd = markdownInput.value.indexOf('\n', cursor); const currentLineFull = markdownInput.value.substring(lineStart, lineEnd === -1 ? markdownInput.value.length : lineEnd); const olRegex = /^(\s*)(\d+)\.(\s+)/; const ulRegex = /^(\s*)([-*])(\s+)/; const olMatch = currentLineFull.match(olRegex); const ulMatch = currentLineFull.match(ulRegex); let listMatch = olMatch || ulMatch; let listType = olMatch ? 'ol' : (ulMatch ? 'ul' : null); if (listMatch && cursor >= lineStart + listMatch[0].length) { const prefixWhitespace = listMatch[1]; const marker = listMatch[2]; const separator = listMatch[3]; const fullPrefix = listMatch[0]; if (currentLineFull.trim() === fullPrefix.trim()) { e.preventDefault(); const beforeText = markdownInput.value.substring(0, lineStart); const afterText = markdownInput.value.substring(lineEnd === -1 ? markdownInput.value.length : lineEnd); markdownInput.value = beforeText + afterText; markdownInput.selectionStart = markdownInput.selectionEnd = lineStart; } else { e.preventDefault(); let nextPrefix = ''; if (listType === 'ol') { const nextNum = parseInt(marker, 10) + 1; nextPrefix = `\n${prefixWhitespace}<span class="math-inline">\{nextNum\}\.</span>{separator}`; } else { nextPrefix = `\n${fullPrefix}`; } const textBeforeCursorOnLine = markdownInput.value.substring(0, cursor); const textAfterCursorOnLine = markdownInput.value.substring(cursor, lineEnd === -1 ? markdownInput.value.length : lineEnd); const textAfterLine = markdownInput.value.substring(lineEnd === -1 ? markdownInput.value.length : lineEnd); markdownInput.value = textBeforeCursorOnLine + nextPrefix + textAfterCursorOnLine + textAfterLine; const newCursorPos = cursor + nextPrefix.length; markdownInput.selectionStart = markdownInput.selectionEnd = newCursorPos; } updatePreview(); saveContent(); return; } } if (e.ctrlKey || e.metaKey) { let handled = false; switch (key.toLowerCase()) { case 'b': applyMarkdownSyntax({ type: 'wrap', prefix: '**', placeholder: 'bold text', action: 'bold' }); handled = true; break; case 'i': applyMarkdownSyntax({ type: 'wrap', prefix: '*', placeholder: 'italic text', action: 'italic' }); handled = true; break; case 'k': applyMarkdownSyntax({ type: 'link', prefix: '[', suffix: '](url)', placeholder: 'link text', action: 'link' }); handled = true; break; } if (handled) { e.preventDefault(); } }
});

// Font
fontSelector.addEventListener('change', (e) => { applyFont(e.target.value); saveFontPreference(e.target.value); });
modalCloseButton.addEventListener('click', () => { helpModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target === helpModal) { helpModal.style.display = 'none'; } });
// --- Utility ---
function showNotification(message, isError = false) {
    messageBox.textContent = message; messageBox.style.backgroundColor = isError ? '#e53e3e' : '#38a169'; messageBox.classList.add('show'); setTimeout(() => { messageBox.classList.remove('show'); }, 3000);
}