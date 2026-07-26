/**
 * The posts mix three math notations: `$…$`/`$$…$$` (what remark-math parses),
 * GitHub-style ```math fences, and TeX `\[…\]` / `\(…\)` delimiters. The last
 * two reach the page as literal backslashes, so normalise everything to the
 * dollar form before remark parses the document.
 *
 * Everything happens on the raw source because markdown consumes `\[` as an
 * escaped bracket during parsing — by mdast time the delimiter is already gone.
 */

const MATH_LANGUAGES = new Set(["math", "latex", "katex", "tex"]);

/** @param {string} line */
function splitOnInlineCode(line) {
  return line.split(/(`+[^`]*`+)/g);
}

/** Convert `\(x\)` to `$x$` when the delimiters are balanced on this line. */
function convertInlineDelimiters(text) {
  const open = (text.match(/\\\(/g) ?? []).length;
  const close = (text.match(/\\\)/g) ?? []).length;
  if (open === 0 || open !== close) return text;
  return text.replace(/\\[()]/g, () => "$");
}

/** @param {string} line */
function convertLine(line) {
  return splitOnInlineCode(line)
    .map((part, index) => (index % 2 === 1 ? part : convertInlineDelimiters(part)))
    .join("");
}

/** A lone `\[` or `\]` on its own line opens/closes a display block. */
const DISPLAY_DELIMITER = /^(\s*)\\[[\]]\s*$/;

/**
 * @param {string} markdown
 * @returns {string}
 */
export function normalizeTexNotation(markdown) {
  const lines = markdown.split("\n");
  const output = [];
  /** @type {{ char: string, length: number, indent: string, isMath: boolean } | null} */
  let fence = null;

  for (const line of lines) {
    if (fence) {
      const closing = new RegExp(`^\\s*\\${fence.char}{${fence.length},}\\s*\\r?$`).test(line);
      if (closing) {
        output.push(fence.isMath ? `${fence.indent}$$` : line);
        fence = null;
      } else {
        output.push(line);
      }
      continue;
    }

    const opening = /^(\s*)(`{3,}|~{3,})[ \t]*([^\s`]*)/.exec(line);
    if (opening) {
      const [, indent, marker, language] = opening;
      const isMath = MATH_LANGUAGES.has(language.toLowerCase());
      fence = { char: marker[0], length: marker.length, indent, isMath };
      output.push(isMath ? `${indent}$$` : line);
      continue;
    }

    const display = DISPLAY_DELIMITER.exec(line);
    if (display) {
      output.push(`${display[1]}$$`);
      continue;
    }

    output.push(convertLine(line));
  }

  return output.join("\n");
}

/**
 * Remark plugin wrapper: normalises the source before remark-math's syntax
 * extension runs, since that extension acts at parse time.
 */
export function remarkTexNotation() {
  const original = this.parser;
  if (typeof original !== "function") {
    throw new Error("remarkTexNotation must run after remark-parse");
  }

  this.parser = (document, file) => original(normalizeTexNotation(document), file);
}
