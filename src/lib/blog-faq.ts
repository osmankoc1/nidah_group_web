export interface FaqItem {
  question: string;
  answer: string;
}

// Matches FAQ section headings in TR / EN / AR / RU
const FAQ_HEADING_RE =
  /^#{1,3}\s+(s[ıi]kça?\s+sorulan\s+sorular|faq|الأسئلة\s+الشائعة|часто\s+задаваемые\s+вопросы)\s*$/im;

export function parseFaqFromMarkdown(content: string): FaqItem[] | null {
  const match = FAQ_HEADING_RE.exec(content);
  if (!match) return null;

  const lines = content.slice(match.index + match[0].length).split("\n");
  const items: FaqItem[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerParts: string[] = [];

  const flush = () => {
    if (currentQuestion && currentAnswerParts.length > 0) {
      items.push({ question: currentQuestion, answer: currentAnswerParts.join(" ").trim() });
    }
    currentAnswerParts = [];
  };

  for (const line of lines) {
    const stripped = line.trim();
    // Stop at next H2 section (non-FAQ heading at same or higher level)
    if (/^##\s/.test(stripped) && !/^###/.test(stripped)) break;
    if (/^###\s+/.test(stripped)) {
      flush();
      currentQuestion = stripped.replace(/^###\s+/, "").trim();
    } else if (currentQuestion && stripped) {
      const clean = stripped
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1");
      currentAnswerParts.push(clean);
    }
  }
  flush();

  return items.length > 0 ? items : null;
}
