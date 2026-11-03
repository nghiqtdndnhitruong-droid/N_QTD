/**
 * XML Run Reconciler:
 * Hàn gắn các thẻ Word OpenXML <w:t> nằm trong các <w:r> bị Microsoft Word phân tách.
 * Đảm bảo các tag template {{...}} luôn nằm trọn vẹn trong một thẻ văn bản liên tục.
 */
export class WordXmlReconciler {
  /**
   * Hàn gắn các đoạn run bị chia cắt trong nội dung XML DOCX
   */
  public reconcile(xmlContent: string): string {
    // Regex tìm từng đoạn văn bản <w:p>...</w:p>
    return xmlContent.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (pXml) => {
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

    if (matches.length <= 1) {
      return pXml;
    }

    // Ghép toàn bộ chuỗi text lại để kiểm tra xem có tag nào bị vắt qua nhiều <w:t> hay không
    const combinedText = matches.map((m) => m.text).join('');
    if (!combinedText.includes('{{') || !combinedText.includes('}}')) {
      return pXml;
    }

    // Tìm tất cả các tag {{...}} trong combinedText
    const tagRegex = /\{\{[^}]*?\}\}/g;
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

    // Nếu không có tag nào bị phân cắt giữa các run, không cần gộp
    if (!hasCrossRunTag) {
      return pXml;
    }

    // Có tag bị phân cắt: Tiến hành gom text của các tag về run đầu tiên
    let newPXml = pXml;

    // Tìm các cụm <w:r> có chứa tag bị xé lẻ và dồn text vào run đầu tiên
    // Cách an toàn nhất: dồn text của paragraph về một run chuẩn nhưng giữ lại các thuộc tính <w:pPr>
    // Để không làm xáo trộn format các từ ngoài tag, ta chỉ dồn chuỗi tag {{...}} vào run bắt đầu
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

    // Thực hiện gom từng tag
    tagRegex.lastIndex = 0;
    const replacements: { runIndex: number; newText: string }[] = matches.map((m) => ({
      runIndex: 0,
      newText: m.text,
    }));

    while ((tagMatch = tagRegex.exec(combinedText)) !== null) {
      const tagStart = tagMatch.index;
      const tagEnd = tagStart + tagMatch[0].length;
      const tagContent = tagMatch[0];

      // Tìm run bắt đầu và các run tiếp theo chứa tag
      let firstRunIdx = -1;
      for (const b of matchBoundaries) {
        if (tagStart >= b.start && tagStart < b.end) {
          firstRunIdx = b.matchIdx;
          break;
        }
      }

      if (firstRunIdx === -1) continue;

      // Xóa các phần bị cắt ở các run sau và đặt toàn bộ tag vào run đầu
      for (const b of matchBoundaries) {
        if (b.matchIdx < firstRunIdx) continue;
        const overlapStart = Math.max(tagStart, b.start);
        const overlapEnd = Math.min(tagEnd, b.end);

        if (overlapStart < overlapEnd) {
          const runOffsetStart = overlapStart - b.start;
          const runOffsetEnd = overlapEnd - b.start;

          const repl = replacements[b.matchIdx];
          if (repl) {
            if (b.matchIdx === firstRunIdx) {
              // Thay thế phần đầu bằng toàn bộ tag
              const before = repl.newText.slice(0, runOffsetStart);
              const after = repl.newText.slice(runOffsetEnd);
              repl.newText = before + tagContent + after;
            } else {
              // Xóa phần thừa ở run sau
              const before = repl.newText.slice(0, runOffsetStart);
              const after = repl.newText.slice(runOffsetEnd);
              repl.newText = before + after;
            }
          }
        }
      }
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

    return newPXml;
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

