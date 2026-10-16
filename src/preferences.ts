/** UI preferences never persist document contents or affect render options. */
export type Language = "en" | "zh";
export type Theme = "light" | "dark";
export function preference(value: string | null, kind: "language"): Language;
export function preference(value: string | null, kind: "theme"): Theme;
export function preference(value: string | null, kind: "language" | "theme") {
  return kind === "language"
    ? value === "zh"
      ? "zh"
      : "en"
    : value === "dark"
      ? "dark"
      : "light";
}
const zh: Record<string, string> = {
  "Toggle dark mode": "切换深色模式",
  "Margins must be between 0 and 100 points.": "边距必须在 0–100 pt 之间。",
  "Text size must be between 6 and 32 points.": "字号必须在 6–32 pt 之间。",
  "Line height must be between 1 and 3.": "行距必须在 1–3 倍之间。",
  "Paragraph spacing must be between 0 and 50 points.":
    "段间距必须在 0–50 pt 之间。",
  "Choose 1, 2 or 3 columns.": "请选择单栏、双栏或三栏。",
  "Column gap must be between 0 and 72 points.": "栏间距必须在 0–72 pt 之间。",
  "Variation must be between 0 and 1.": "字形变化必须在 0–1 之间。",
  "Could not load the font outlines. Reload to retry.":
    "无法加载字体轮廓，请刷新重试。",
  "Could not load Chinese font outlines. Check the connection and retry.":
    "无法加载中文字体轮廓，请检查网络后重试。",
  "The document changed. Wait for the latest preview, then download again.":
    "文档已更改，请等待最新预览完成后重新下载。",
  "Use a PDF of 50 pages or fewer. Split longer documents before importing.":
    "PDF 最多支持 50 页，请拆分后导入。",
  "The PDF contains over 200,000 extracted characters. Import a shorter document.":
    "PDF 提取文本超过 200,000 字符，请导入更短的文档。",
  "Password-protected PDFs are not supported. Import an unlocked copy.":
    "不支持密码保护的 PDF，请导入已解锁的副本。",
  "Invalid PDF structure.": "PDF 文件结构无效。",
  "Markdown nesting is too deep.": "Markdown 嵌套层级过深。",
  "Paste some text or a formula to start.": "请先输入文字或公式。",
  "These margins and columns leave too little space. Reduce margins, column count or text size.":
    "可用排版空间不足，请减小边距、栏数或字号。",
  "This document exceeds the 20-page browser limit.":
    "文档超过浏览器版的 20 页上限。",
  "A character is wider than the writable page area.":
    "某个字符超出页面可用宽度。",
  "A formula is wider than the writable column. Shorten it, use a smaller text size, or split it into separate formulas.":
    "公式超出栏宽，请缩短公式、减小字号或拆分公式。",
  "A display formula is wider than the writable column. Reduce text size or split the formula.":
    "独立公式超出栏宽，请减小字号或拆分公式。",
  "A formula is taller than the writable page area.": "公式超出页面可用高度。",
  "List or quote nesting leaves too little space on the page.":
    "列表或引用嵌套占用过多空间。",
  "An inline formula is taller than a page.": "行内公式高度超过一页。",
  "Keep each formula below 2,000 characters.":
    "每个公式最多支持 2,000 个字符。",
  "Missing LaTeX argument. Use braces, for example \\frac{a}{b}.":
    "缺少 LaTeX 参数，请使用花括号，例如 \\frac{a}{b}。",
  "This LaTeX command needs a {text} argument.":
    "此 LaTeX 命令需要 {text} 参数。",
  "Unclosed LaTeX group.": "LaTeX 分组未闭合。",
  "Missing LaTeX expression.": "缺少 LaTeX 表达式。",
  "Indexed roots are not supported yet. Use \\sqrt{...} or a fractional exponent.":
    "暂不支持高次根号，请使用 \\sqrt{...} 或分数指数。",
  "Supported blackboard letters: \\mathbb{R}, \\mathbb{E}.":
    "空心字母支持：\\mathbb{R}、\\mathbb{E}。",
  "Formula nesting is too deep (maximum 24 groups).":
    "公式嵌套过深（最多 24 层）。",
  "Duplicate superscript.": "上标重复。",
  "Duplicate subscript.": "下标重复。",
  "The formula is empty.": "公式为空。",
  "Unclosed inline formula. Close it with \\).":
    "行内公式未闭合，请用 \\) 结束。",
  "Unclosed inline formula. Pair $...$, or escape a currency dollar as \\$.":
    "行内公式未闭合，请成对使用 $...$，货币符号请写为 \\$。",

  "Files stay on your device": "文件保留在你的设备上",
  "Interface language": "界面语言",
  "Dark mode": "深色模式",
  "Light mode": "浅色模式",
  "Source ↗": "源代码 ↗",
  "THE HANDWRITING WORKBENCH": "手写排版工作台",
  "A little variation.": "一点自然变化。",
  "A readable page.": "一页清晰手写。",
  "Paste your words. Add a little mathematics.": "粘贴文字，加入一些公式。",
  "Watch them become handwriting,": "看着它们变成手写字，",
  "then take the whole document as a PDF.": "再将整份文档下载为 PDF。",
  "Handwriting editor": "手写编辑器",
  "Start with your words": "从文字开始",
  "01 / WRITE": "01 / 输入",
  "02 / PREVIEW": "02 / 预览",
  "Input format": "输入格式",
  "Markdown + math": "Markdown + 公式",
  "LaTeX formula": "LaTeX 公式",
  "Plain text": "纯文本",
  "Load example": "载入示例",
  "Chinese example": "中文示例",
  "↑ PDF text": "↑ 导入 PDF 文本",
  "Document text": "文档文本",
  "Paste Markdown or write a few words…": "粘贴 Markdown，或写下几句话…",
  "Auto preview": "自动预览",
  "Syntax help · Markdown & LaTeX": "语法帮助 · Markdown 与 LaTeX",
  "· paragraphs ·": "· 段落 ·",
  "Inline math:": "行内公式：",
  or: "或",
  "Display math:": "独立公式：",
  "Formulas: fractions, superscripts/subscripts, square roots, sums, integrals, Greek letters, arrows, common operators and":
    "公式支持：分数、上下标、平方根、求和、积分、希腊字母、箭头、常用运算符以及",
  ". Use": "。使用",
  "for words in math.": "在公式中输入文字。",
  "LaTeX formula mode accepts one bare formula. This is a supported subset, not a full TeX compiler. Tables, images, HTML, custom macros and environments are not supported. Links keep their labels; code stays in the handwriting style. Chinese uses a gently varied WenKai-derived handwriting face, loaded only when needed.":
    "LaTeX 模式接受单个公式，仅支持部分语法，并非完整 TeX 编译器。不支持表格、图片、HTML、自定义宏和环境。链接保留显示文字，代码使用手写样式。中文采用温和变化的文楷衍生字体，按需加载。",
  Paper: "纸张",
  "US Letter": "美式 Letter",
  "Text size (pt)": "字号（pt）",
  Background: "背景",
  "Soft grid": "浅色网格",
  "Plain paper": "空白纸张",
  "Page layout · margins & spacing": "页面排版 · 边距与间距",
  "Density preset": "密度预设",
  Comfortable: "舒适",
  "Compact reference sheet": "紧凑速查表",
  Custom: "自定义",
  "All margins and column gaps below are in millimetres. Small settings pack more text; formula height is still reserved.":
    "以下边距和栏间距均以毫米计。缩小间距可容纳更多文字，公式仍会保留所需高度。",
  "Top (mm)": "上边距（mm）",
  "Right (mm)": "右边距（mm）",
  "Bottom (mm)": "下边距（mm）",
  "Left (mm)": "左边距（mm）",
  "Line height (×)": "行距（倍）",
  "Paragraph gap (pt)": "段间距（pt）",
  Columns: "分栏",
  "1 column": "单栏",
  "2 columns": "双栏",
  "3 columns": "三栏",
  "Column gap (mm)": "栏间距（mm）",
  "Body variation": "字形变化",
  Subtle: "轻微",
  Expressive: "明显",
  "Advanced · seed & positioned layout": "高级 · 随机种子与定位排版",
  Seed: "随机种子",
  "Choose a new random seed": "生成新的随机种子",
  "↻ New seed": "↻ 更换种子",
  "Same seed, same letterforms. Math keeps its own natural variation.":
    "相同种子生成相同字形，公式保留自身的自然变化。",
  "Positioned layout mode. Edit the text above to return to automatic layout.":
    "当前为定位排版模式，编辑上方文本可返回自动排版。",
  "↑ Import JSON": "↑ 导入 JSON",
  "Original demo": "原始示例",
  "Positioned layout JSON": "定位排版 JSON",
  "Apply layout": "应用排版",
  "↓ Layout JSON": "↓ 排版 JSON",
  "Everything is processed on this device": "所有内容均在本设备处理",
  "Previous preview page": "上一页预览",
  "Next preview page": "下一页预览",
  "Download all pages as PDF": "将所有页面下载为 PDF",
  "Preparing font outlines…": "正在准备字体轮廓…",
  "VECTOR PREVIEW": "矢量预览",
  "Made to keep.": "保存这一页灵感。",
  "Download every page as a crisp, vector PDF.":
    "将所有页面下载为清晰的矢量 PDF。",
  "↓ Page SVG": "↓ 当前页 SVG",
  "↓ Download PDF": "↓ 下载 PDF",
  "Preparing PDF…": "正在生成 PDF…",
  "Natural by design. Reproducible by seed.": "自然的字形，可复现的结果。",
  "SIL Open Font License": "SIL 开放字体许可",
  Attribution: "来源与致谢",
  "Web libraries": "网页依赖许可",
  "Chinese font license": "中文字体许可",
  "Chinese & English handwriting, adjustable page density, and local PDF text import. Scans and outline-only PDFs need OCR; images, tables and equation structure are not reconstructed. Goodnotes export remains experimental in the Python CLI.":
    "支持中英文手写、页面密度调整与本地 PDF 文本导入。扫描件和仅含轮廓的 PDF 需要 OCR；不还原图片、表格和公式结构。Goodnotes 导出仍为 Python CLI 的实验功能。",
  "LOCAL PDF IMPORT": "本地 PDF 导入",
  "Review extracted text": "审阅提取的文本",
  Cancel: "取消",
  "Reading PDF…": "正在读取 PDF…",
  "Reading order (rebuilds the text preview)": "阅读顺序（重新生成文本预览）",
  "Auto detect columns": "自动检测分栏",
  "Rows, top to bottom": "逐行，从上到下",
  "Two columns, left then right": "双栏，先左后右",
  "Extracted text · edit before importing": "提取文本 · 导入前可编辑",
  "Original document stays unchanged until you use this text":
    "点击使用前，原文保持不变",
  "Import only extracted text; skip the listed pages without a text layer.":
    "仅导入提取的文字，跳过列出的无文本层页面。",
  "Processed on this device. Text will be reflowed in Plain text mode.":
    "在本设备处理，导入后以纯文本模式重新排版。",
  "Use this text": "使用此文本",
  "Preview needs attention. Any visible page is from the last successful render.":
    "预览需要调整。当前显示的页面来自上一次成功渲染。",
  "Composing handwritten pages…": "正在排版手写页面…",
  "Your page starts here.": "从这里开始你的手写页。",
  "Paste Markdown, a formula, or a few plain words.":
    "粘贴 Markdown、公式或纯文本。",
  "Start writing to see your handwritten pages.":
    "输入文字，即可预览手写页面。",
  "No pages yet": "暂无页面",
  "Loading Chinese handwriting outlines…": "正在加载中文手写轮廓…",
  "Loading the local PDF reader…": "正在加载本地 PDF 阅读器…",
  "PDF could not be imported.": "无法导入 PDF。",
  "No selectable text found. Scans and outline-only PDFs need OCR, which is not included in this import.":
    "未找到可选文本。扫描件和仅含轮廓的 PDF 需要 OCR，当前导入功能尚不支持。",
  "Vertical or right-to-left text was found. Its reading order needs manual review.":
    "检测到竖排或从右向左的文本，请手动检查阅读顺序。",
  "Some PDF characters could not be decoded. Check the extracted text.":
    "部分 PDF 字符无法解码，请检查提取的文本。",
  "Column order is estimated. Review headings, tables and formulas before importing.":
    "分栏顺序为自动估计，导入前请检查标题、表格和公式。",
  "Text extraction reflows the content. It does not reconstruct images, tables, LaTeX or the original page design.":
    "提取后会重新排版，不还原图片、表格、LaTeX 或原页面设计。",
  "Seed must be a safe integer.": "随机种子必须是安全整数。",
  "Use a PDF smaller than 20 MB.": "请使用小于 20 MB 的 PDF。",
  "Use a JSON layout smaller than 2 MB.": "请使用小于 2 MB 的排版 JSON。",
  "The rendering worker stopped. Reload this page to retry.":
    "渲染进程已停止，请刷新页面重试。",
  "Use at most 12,000 source characters.": "源文本最多支持 12,000 个字符。",
};
export function translate(text: string, language: Language): string {
  if (language === "en") return text;
  const normalized = text.trim().replace(/\s+/g, " ");
  let result = zh[normalized];
  if (!result) {
    const patterns: [RegExp, (...parts: string[]) => string][] = [
      [
        /^Unsupported LaTeX command: (.+). Open Syntax help for the supported subset.$/,
        (_, a) => `不支持 LaTeX 命令：${a}。请查看语法帮助。`,
      ],
      [/^Unsupported LaTeX escape: (.+)$/, (_, a) => `不支持 LaTeX 转义：${a}`],
      [
        /^Unclosed display formula. Close it with (.+).$/,
        (_, a) => `独立公式未闭合，请用 ${a} 结束。`,
      ],
      [
        /^Unclosed LaTeX group: expected (.+).$/,
        (_, a) => `LaTeX 分组未闭合，缺少 ${a}。`,
      ],
      [/^Unexpected (.+) in formula.$/, (_, a) => `公式中出现意外字符：${a}。`],
      [
        /^The loaded fonts cannot render (.+). Try another character or supported math markup.$/,
        (_, a) => `当前字体无法显示 ${a}。请更换字符或使用支持的公式语法。`,
      ],
      [
        /^Markdown (.+) is not supported yet\..+$/,
        (_, a) =>
          `暂不支持 Markdown ${a}。请使用标题、段落、列表、引用、强调和公式；不支持图片、表格和 HTML。`,
      ],
      [/^Page (\d+) \/ (\d+)$/, (_, a, b) => `第 ${a} / ${b} 页`],
      [
        /^(\d+) pages? · (\d+) characters · Seed (.+)$/,
        (_, a, b, c) => `${a} 页 · ${b} 个字符 · 随机种子 ${c}`,
      ],
      [
        /^(\d+) pages? exported as vector PDF · Seed (.+)$/,
        (_, a, b) => `已导出 ${a} 页矢量 PDF · 随机种子 ${b}`,
      ],
      [
        /^Extracting page (\d+) \/ (\d+)…$/,
        (_, a, b) => `正在提取第 ${a} / ${b} 页…`,
      ],
      [
        /^(\d+) PDF pages · (\d+) detected as columns. Review the text below.$/,
        (_, a, b) => `${a} 页 PDF · ${b} 页检测到分栏，请审阅下方文本。`,
      ],
      [
        /^No text layer on page\(s\) (.+). Scans, images and outline-only PDFs need OCR and are not converted here.$/,
        (_, a) =>
          `第 ${a} 页没有文本层。扫描件、图片和仅含轮廓的 PDF 需要 OCR，当前无法转换。`,
      ],
    ];
    for (const [pattern, format] of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        result = format(...match);
        break;
      }
    }
  }
  const translated = result;
  return translated ? text.replace(text.trim(), () => translated) : text;
}
let language: Language = "en";
const originals = new WeakMap<Text, string>();
const attributes = new WeakMap<Element, Map<string, string>>();
export function uiText(node: HTMLElement, text: string): void {
  node.textContent = text;
  const child = node.firstChild;
  if (child instanceof Text) {
    originals.set(child, text);
    child.data = translate(text, language);
  }
}
/** Translate UI text nodes only, preserving controls, source text and SVG geometry. */
export function refreshTranslations(): void {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (
      node.parentElement?.closest(
        "textarea, script, style, svg, code, #language",
      )
    )
      continue;
    const original = originals.get(node) ?? node.data;
    originals.set(node, original);
    node.data = translate(original, language);
  }
  document.querySelectorAll("[aria-label], [placeholder]").forEach((node) => {
    let values = attributes.get(node);
    if (!values) {
      values = new Map();
      attributes.set(node, values);
    }
    for (const attribute of ["aria-label", "placeholder"]) {
      const value = values.get(attribute) ?? node.getAttribute(attribute);
      if (value !== null) {
        values.set(attribute, value);
        node.setAttribute(attribute, translate(value, language));
      }
    }
  });
  document.title =
    language === "en"
      ? "Natural Ink · Handwriting workbench"
      : "Natural Ink · 手写排版工作台";
}
function read(key: string): string | null {
  try {
    return localStorage.getItem(`natural-ink-${key}`);
  } catch {
    return null;
  }
}
function save(key: string, value: string): void {
  try {
    localStorage.setItem(`natural-ink-${key}`, value);
  } catch {
    /* Preferences also work without storage. */
  }
}
export function initPreferences(): void {
  language = preference(read("language"), "language");
  let theme = preference(read("theme"), "theme");
  const languageInput = document.getElementById(
    "language",
  ) as HTMLSelectElement;
  const themeButton = document.getElementById("theme") as HTMLButtonElement;
  function applyTheme(): void {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute("aria-pressed", String(theme === "dark"));
    uiText(themeButton, theme === "dark" ? "Light mode" : "Dark mode");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#17231f" : "#f5f5f0");
  }
  languageInput.value = language;
  languageInput.addEventListener("change", () => {
    language = preference(languageInput.value, "language");
    save("language", language);
    refreshTranslations();
  });
  themeButton.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    save("theme", theme);
    applyTheme();
  });
  applyTheme();
  refreshTranslations();
}
