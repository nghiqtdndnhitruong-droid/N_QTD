/**
 * XML Run Reconciler:
 * Hàn gắn các thẻ Word OpenXML <w:t> nằm trong các <w:r> bị Microsoft Word phân tách.
 * Đảm bảo các tag template {{...}} luôn nằm trọn vẹn trong một thẻ văn bản liên tục.
 * Đồng thời tự động chuẩn hóa các dấu ngoặc bị dư thừa (vd: {{{{...}}}} -> {{...}}).
 */

/**
 * Chuẩn hóa các dấu ngoặc nhọn template:
 * - Thu gọn dấu ngoặc bị gõ cách rời rạc: "{ {" -> "{{", "} }" -> "}}"
 * - Chuẩn hóa các thẻ bị dư dấu ngoặc nhọn (vd: "{{{{#IF...}}", "{{{{...}}}}", "{{{...}}}") về đúng dạng "{{...}}"
 */
export function normalizeTemplateBraces(rawText: string): string {
  if (!rawText || !rawText.includes('{') || !rawText.includes('}')) return rawText;

  // 1. Chuẩn hóa các dấu ngoặc nhọn bị gõ cách nhau bằng khoảng trắng:
  let res = rawText.replace(/\{[\s{]*\{/g, '{{').replace(/\}[\s}]*\}/g, '}}');

  // 2. Chuẩn hóa tất cả các tag có từ 2 dấu ngoặc trở lên thành đúng 2 dấu ngoặc {{...}}
  res = res.replace(/\{{2,}\s*([^{}]+?)\s*\}{2,}/g, (_match, content) => {
    const cleanContent = content.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanContent}}}`;
  });

  return res;
}

export class WordXmlReconciler {
  /**
   * Hàn gắn các đoạn run bị chia cắt trong nội dung XML DOCX
   * và làm sạch track changes / dư thừa ngoặc nhọn
   */
  public reconcile(xmlContent: string): string {
    // Xóa sạch các thẻ Track Changes / Revision deletion của Word (nơi lưu các ký tự đã bị xóa nhưng Word vẫn giữ)
    let cleaned = xmlContent
      .replace(/<w:del(?:\s[^>]*)?>[\s\S]*?<\/w:del>/g, '')
      .replace(/<w:delText(?:\s[^>]*)?>[\s\S]*?<\/w:delText>/g, '');

    // Regex tìm từng đoạn văn bản <w:p>...</w:p>
    return cleaned.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (pXml) => {
      // Nếu đoạn không chứa dấu mở tag '{', giữ nguyên
      if (!pXml.includes('{')) {
        return pXml;
      }
      return this.reconcileParagraph(pXml);
    });
  }

  /**
   * Xử lý nội bộ một thẻ <w:p>
   */
  private reconcileParagraph(pXml: string): string {
    // Trích xuất tất cả các đoạn <w:t>...</w:t> hoặc <w:t xml:space="preserve">...</w:t>
    const runTextRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
    const matches: { fullMatch: string; prefix: string; text: string; suffix: string; index: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = runTextRegex.exec(pXml)) !== null) {
      matches.push({
        fullMatch: match[0],
        prefix: match[1] || '<w:t>',
        text: match[2] || '',
        suffix: match[3] || '</w:t>',
        index: match.index,
      });
    }

    const normalizeRunsInXml = (xml: string): string => {
      return xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_m, prefix, text, suffix) => {
        if (text.includes('{') && text.includes('}')) {
          return `${prefix}${normalizeTemplateBraces(text)}${suffix}`;
        }
        return _m;
      });
    };

    if (matches.length <= 1) {
      return normalizeRunsInXml(pXml);
    }

    // Ghép toàn bộ chuỗi text lại để kiểm tra xem có tag nào bị vắt qua nhiều <w:t> hay không
    const combinedText = matches.map((m) => m.text).join('');
    if (!combinedText.includes('{') || !combinedText.includes('}')) {
      return pXml;
    }

    // Tìm tất cả các tag (chấp nhận 2 hoặc nhiều dấu ngoặc) trong combinedText
    const tagRegex = /\{{2,}[^}]*?\}{2,}/g;
    let tagMatch: RegExpExecArray | null;
    let hasCrossRunTag = false;

    // Bản đồ vị trí: ký tự thứ i trong combinedText tương ứng với match nào
    const charToMatchIndex: number[] = [];
    for (let mIdx = 0; mIdx < matches.length; mIdx++) {
      const curMatch = matches[mIdx];
      if (curMatch) {
        for (let c = 0; c < curMatch.text.length; c++) {
          charToMatchIndex.push(mIdx);
        }
      }
    }

    while ((tagMatch = tagRegex.exec(combinedText)) !== null) {
      const start = tagMatch.index;
      const end = start + tagMatch[0].length - 1;
      const startRun = charToMatchIndex[start];
      const endRun = charToMatchIndex[end];

      if (startRun !== undefined && endRun !== undefined && startRun !== endRun) {
        hasCrossRunTag = true;
        break;
      }
    }

    // Nếu không có tag nào bị phân cắt giữa các run, chuẩn hóa các run hiện tại
    if (!hasCrossRunTag) {
      return normalizeRunsInXml(pXml);
    }

    // Có tag bị phân cắt: Tiến hành gom text của các tag về run đầu tiên
    let newPXml = pXml;

    let currentPos = 0;
    const matchBoundaries: { start: number; end: number; matchIdx: number }[] = [];
    for (let mIdx = 0; mIdx < matches.length; mIdx++) {
      const curMatch = matches[mIdx];
      if (curMatch) {
        const start = currentPos;
        const end = currentPos + curMatch.text.length;
        matchBoundaries.push({ start, end, matchIdx: mIdx });
        currentPos = end;
      }
    }

    // Đánh dấu các ký tự thuộc về tag để tránh việc cắt lệch chỉ mục khi một đoạn chứa nhiều tag
    const isCoveredByTag = new Uint8Array(combinedText.length);
    const tagEmitMap = new Map<number, string>();

    tagRegex.lastIndex = 0;
    while ((tagMatch = tagRegex.exec(combinedText)) !== null) {
      const tagStart = tagMatch.index;
      const tagEnd = tagStart + tagMatch[0].length;
      const normalizedTag = normalizeTemplateBraces(tagMatch[0]);

      tagEmitMap.set(tagStart, normalizedTag);
      for (let k = tagStart; k < tagEnd; k++) {
        isCoveredByTag[k] = 1;
      }
    }

    // Tái tạo nội dung cho từng run dựa trên vị trí chính xác
    const replacements: { runIndex: number; newText: string }[] = [];
    for (const b of matchBoundaries) {
      let newText = '';
      for (let k = b.start; k < b.end; k++) {
        if (tagEmitMap.has(k)) {
          newText += tagEmitMap.get(k)!;
        } else if (isCoveredByTag[k]) {
          continue;
        } else {
          newText += combinedText[k];
        }
      }
      replacements.push({ runIndex: b.matchIdx, newText });
    }

    // Thay thế lại vào pXml
    // Thay từ cuối lên đầu để không làm lệch index
    for (let i = matches.length - 1; i >= 0; i--) {
      const original = matches[i];
      const repl = replacements[i];
      if (original && repl && original.text !== repl.newText) {
        const newRunXml = `${original.prefix}${this.escapeXml(repl.newText)}${original.suffix}`;
        newPXml =
          newPXml.slice(0, original.index) +
          newRunXml +
          newPXml.slice(original.index + original.fullMatch.length);
      }
    }

    return normalizeRunsInXml(newPXml);
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const wordXmlReconciler = new WordXmlReconciler();

