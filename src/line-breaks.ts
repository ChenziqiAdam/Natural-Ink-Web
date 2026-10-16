const cjk =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]/u;
const closing = /^[，。！？：；、）》」』】〕〉”’…,.!?;:）\]]$/u;
const opening = /^[（《「『【〔〈“‘(\[]$/u;
// Keep Latin words together, permit CJK breaks, and bind punctuation to its neighbour.
export function breakTokens(text: string): string[] {
  if (!cjk.test(text)) return text.match(/\S+\s*|\s+/g) ?? [];
  const pieces: string[] = [];
  let buffer = "";
  function flush(): void {
    if (buffer) {
      pieces.push(buffer);
      buffer = "";
    }
  }
  for (const char of text) {
    if (/\s/u.test(char)) {
      flush();
      if (pieces.length) pieces[pieces.length - 1] += char;
      else pieces.push(char);
    } else if (closing.test(char)) {
      flush();
      if (pieces.length) pieces[pieces.length - 1] += char;
      else buffer = char;
    } else if (opening.test(char)) {
      flush();
      buffer = char;
    } else if (cjk.test(char)) {
      if (buffer && !opening.test(buffer)) flush();
      pieces.push(buffer + char);
      buffer = "";
    } else {
      if (buffer && !opening.test(buffer) && cjk.test(buffer)) flush();
      buffer += char;
    }
  }
  flush();
  return pieces;
}
