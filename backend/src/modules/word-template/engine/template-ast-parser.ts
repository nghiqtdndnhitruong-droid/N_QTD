import {
  ASTNode,
  ForBlockNode,
  IfBlockNode,
  KeywordNode,
  RootASTNode,
  SpecialVarNode,
  TemplateDiagnostic,
  TemplateValidationResult,
  TextNode,
} from './template-engine.types';
import { SafeExpressionParser } from './safe-evaluator';
import { normalizeTemplateBraces } from './xml-reconciler';

export class TemplateAstParser {
  private expressionParser = new SafeExpressionParser();

  /**
   * Phân tích văn bản chứa cú pháp template {{...}} thành cây AST hoàn chỉnh
   * và kiểm tra toàn diện lỗi cú pháp (đóng mở thẻ, điều kiện, cú pháp lặp).
   */
  public parseAndValidate(rawTemplateText: string): {
    ast: RootASTNode;
    validation: TemplateValidationResult;
  } {
    const diagnostics: TemplateDiagnostic[] = [];
    const detectedKeywords = new Set<string>();
    const detectedLoops: { iterator: string; collection: string }[] = [];
    const detectedConditions: string[] = [];

    // Chuẩn hóa văn bản đầu vào: loại bỏ dấu ngoặc bị gõ cách hoặc dư thừa dấu ngoặc
    const templateText = normalizeTemplateBraces(rawTemplateText);

    // Tách các token: text thông thường và các tag {{...}} (hỗ trợ cả trường hợp dư thừa ngoặc)
    const tagRegex = /\{{2,}\s*([\s\S]*?)\s*\}{2,}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    interface ScopeContext {
      type: 'ROOT' | 'IF' | 'FOR';
      node?: IfBlockNode | ForBlockNode | RootASTNode;
      tagRaw: string;
      startIndex: number;
    }

    const rootNode: RootASTNode = { type: 'ROOT', body: [] };
    const scopeStack: ScopeContext[] = [{ type: 'ROOT', node: rootNode, tagRaw: '', startIndex: 0 }];

    const getCurrentBody = (): ASTNode[] => {
      const top = scopeStack[scopeStack.length - 1];
      if (!top) return rootNode.body;
      if (top.type === 'ROOT') {
        return (top.node as RootASTNode).body;
      }
      if (top.type === 'FOR') {
        return (top.node as ForBlockNode).body;
      }
      if (top.type === 'IF') {
        const ifNode = top.node as IfBlockNode;
        if (ifNode.elseBody) {
          return ifNode.elseBody;
        }
        if (ifNode.elseIfBranches.length > 0) {
          const lastElif = ifNode.elseIfBranches[ifNode.elseIfBranches.length - 1];
          if (lastElif) return lastElif.body;
        }
        return ifNode.thenBody;
      }
      return rootNode.body;
    };

    while ((match = tagRegex.exec(templateText)) !== null) {
      const tagStartIndex = match.index;
      const rawContent = (match[1] || '').trim();
      const tagContent = rawContent.replace(/^\{+/, '').replace(/\}+$/, '').trim();
      const fullTag = `{{${tagContent}}}`;

      // Phần text trước tag
      if (tagStartIndex > lastIndex) {
        const textContent = templateText.slice(lastIndex, tagStartIndex);
        const textNode: TextNode = { type: 'TEXT', content: textContent, raw: textContent };
        getCurrentBody().push(textNode);
      }
      lastIndex = tagRegex.lastIndex;

      // 1. Tag #IF <condition>
      if (/^#IF\b/i.test(tagContent)) {
        const conditionStr = tagContent.replace(/^#IF\b/i, '').trim();
        if (!conditionStr) {
          diagnostics.push({
            code: 'EMPTY_IF_CONDITION',
            message: 'Thẻ {{#IF}} chưa có biểu thức điều kiện.',
            severity: 'ERROR',
            rawSnippet: fullTag,
            suggestion: 'Ví dụ: {{#IF CO_NGUOI_THUA_KE}} hoặc {{#IF LOAI_VAY == "THE_CHAP"}}',
          });
        }
        detectedConditions.push(conditionStr);

        let expr;
        try {
          expr = this.expressionParser.parse(conditionStr);
          this.extractIdentifiersFromExpr(expr, detectedKeywords);
        } catch {
          diagnostics.push({
            code: 'INVALID_EXPRESSION',
            message: `Cú pháp biểu thức điều kiện "${conditionStr}" không hợp lệ.`,
            severity: 'ERROR',
            rawSnippet: fullTag,
          });
          expr = { type: 'LITERAL', value: false } as const;
        }

        const ifNode: IfBlockNode = {
          type: 'IF_BLOCK',
          condition: expr,
          rawCondition: conditionStr,
          thenBody: [],
          elseIfBranches: [],
          raw: fullTag,
        };

        getCurrentBody().push(ifNode);
        scopeStack.push({ type: 'IF', node: ifNode, tagRaw: fullTag, startIndex: tagStartIndex });
        continue;
      }

      // 2. Tag #ELSE IF / #ELIF / ELSE IF <condition>
      if (/^#?(?:ELSE\s+IF|ELIF)\b/i.test(tagContent)) {
        const top = scopeStack[scopeStack.length - 1];
        if (!top || top.type !== 'IF') {
          diagnostics.push({
            code: 'UNEXPECTED_ELSE_IF',
            message: `Thẻ "${fullTag}" nằm ngoài khối {{#IF}} hợp lệ.`,
            severity: 'ERROR',
            rawSnippet: fullTag,
            suggestion: 'Đảm bảo thẻ {{#ELSE IF}} nằm sau một thẻ {{#IF}} chưa đóng.',
          });
          continue;
        }

        const ifNode = top.node as IfBlockNode;
        if (ifNode.elseBody) {
          diagnostics.push({
            code: 'ELSE_IF_AFTER_ELSE',
            message: `Không được đặt "${fullTag}" sau thẻ {{#ELSE}}.`,
            severity: 'ERROR',
            rawSnippet: fullTag,
          });
          continue;
        }

        const conditionStr = tagContent.replace(/^#?(?:ELSE\s+IF|ELIF)\b/i, '').trim();
        detectedConditions.push(conditionStr);

        let expr;
        try {
          expr = this.expressionParser.parse(conditionStr);
          this.extractIdentifiersFromExpr(expr, detectedKeywords);
        } catch {
          expr = { type: 'LITERAL', value: false } as const;
        }

        ifNode.elseIfBranches.push({
          condition: expr,
          rawCondition: conditionStr,
          body: [],
        });
        continue;
      }

      // 3. Tag #ELSE hoặc ELSE
      if (/^#?ELSE$/i.test(tagContent)) {
        const top = scopeStack[scopeStack.length - 1];
        if (!top || top.type !== 'IF') {
          diagnostics.push({
            code: 'UNEXPECTED_ELSE',
            message: `Thẻ "${fullTag}" nằm ngoài khối {{#IF}} hợp lệ.`,
            severity: 'ERROR',
            rawSnippet: fullTag,
            suggestion: 'Đảm bảo thẻ {{#ELSE}} nằm giữa {{#IF}} và {{/IF}}.',
          });
          continue;
        }

        const ifNode = top.node as IfBlockNode;
        if (ifNode.elseBody) {
          diagnostics.push({
            code: 'MULTIPLE_ELSE',
            message: 'Một khối {{#IF}} chỉ được phép có tối đa một thẻ {{#ELSE}} duy nhất.',
            severity: 'ERROR',
            rawSnippet: fullTag,
          });
          continue;
        }

        ifNode.elseBody = [];
        continue;
      }

      // 4. Tag /IF (Đóng IF)
      if (/^\/IF$/i.test(tagContent)) {
        const top = scopeStack[scopeStack.length - 1];
        if (!top || top.type !== 'IF') {
          diagnostics.push({
            code: 'UNMATCHED_END_IF',
            message: 'Thẻ đóng "{{/IF}}" không có thẻ mở {{#IF}} tương ứng.',
            severity: 'ERROR',
            rawSnippet: fullTag,
          });
          continue;
        }
        scopeStack.pop();
        continue;
      }

      // 5. Tag #FOR <item> IN <collection>
      if (/^#FOR\b/i.test(tagContent)) {
        const forMatch = /^#FOR\s+([a-zA-Z0-9_]+)\s+IN\s+([a-zA-Z0-9_.[\]]+)$/i.exec(tagContent);
        if (!forMatch) {
          diagnostics.push({
            code: 'INVALID_FOR_SYNTAX',
            message: `Cú pháp vòng lặp "${fullTag}" không đúng định dạng.`,
            severity: 'ERROR',
            rawSnippet: fullTag,
            suggestion: 'Cú pháp chuẩn: {{#FOR item IN DANH_SACH}} (ví dụ: {{#FOR ts IN DANH_SACH_TAI_SAN}})',
          });
          continue;
        }

        const iteratorName = (forMatch[1] || 'item').trim();
        const collectionPath = (forMatch[2] || '').trim();

        detectedLoops.push({ iterator: iteratorName, collection: collectionPath });
        detectedKeywords.add(collectionPath);

        const forNode: ForBlockNode = {
          type: 'FOR_BLOCK',
          iteratorName,
          collectionPath,
          body: [],
          raw: fullTag,
        };

        getCurrentBody().push(forNode);
        scopeStack.push({ type: 'FOR', node: forNode, tagRaw: fullTag, startIndex: tagStartIndex });
        continue;
      }

      // 6. Tag /FOR (Đóng FOR)
      if (/^\/FOR$/i.test(tagContent)) {
        const top = scopeStack[scopeStack.length - 1];
        if (!top || top.type !== 'FOR') {
          diagnostics.push({
            code: 'UNMATCHED_END_FOR',
            message: 'Thẻ đóng "{{/FOR}}" không có thẻ mở {{#FOR ...}} tương ứng.',
            severity: 'ERROR',
            rawSnippet: fullTag,
          });
          continue;
        }
        scopeStack.pop();
        continue;
      }

      // 7. Biến vòng lặp đặc biệt: @index, @number, @first, @last, @length
      if (/^@(index|number|first|last|length)$/i.test(tagContent)) {
        const varName = tagContent.toLowerCase() as '@index' | '@number' | '@first' | '@last' | '@length';

        // Kiểm tra xem có đang nằm trong vòng lặp FOR không
        const inForLoop = scopeStack.some((s) => s.type === 'FOR');
        if (!inForLoop) {
          diagnostics.push({
            code: 'LOOP_VAR_OUTSIDE_FOR',
            message: `Biến vị trí "${fullTag}" chỉ có thể được sử dụng bên trong vòng lặp {{#FOR ...}}.`,
            severity: 'WARNING',
            rawSnippet: fullTag,
          });
        }

        const specialNode: SpecialVarNode = {
          type: 'SPECIAL_VAR',
          name: varName,
          raw: fullTag,
        };
        getCurrentBody().push(specialNode);
        continue;
      }

      // 8. Keyword hoặc Array Access: HO_TEN, ts.MA_TAI_SAN, DANH_SACH_TAI_SAN[0].MA_TS
      const arrayAccessMatch = /^([a-zA-Z0-9_]+)\[(\d+)\](?:\.([a-zA-Z0-9_.]+))?$/.exec(tagContent);
      if (arrayAccessMatch) {
        const collectionName = (arrayAccessMatch[1] || '').trim();
        const arrayIdx = parseInt(arrayAccessMatch[2] || '0', 10);
        const subProperty = arrayAccessMatch[3] ? arrayAccessMatch[3].trim() : undefined;

        detectedKeywords.add(collectionName);
        const keywordNode: KeywordNode = {
          type: 'KEYWORD',
          path: tagContent,
          arrayIndex: arrayIdx,
          subPath: subProperty,
          raw: fullTag,
        };
        getCurrentBody().push(keywordNode);
        continue;
      }

      // Từ khóa thường (kèm dot notation hoặc biến lặp)
      if (/^[a-zA-Z0-9_.]+$/.test(tagContent)) {
        detectedKeywords.add(tagContent);

        // Kiểm tra xem có phải là biến của vòng lặp (vd: ts.MA_TAI_SAN)
        const dotIdx = tagContent.indexOf('.');
        let isLoopVar = false;
        let iterName: string | undefined;

        if (dotIdx > 0) {
          const prefix = tagContent.slice(0, dotIdx);
          const activeFor = scopeStack.slice().reverse().find((s) => s.type === 'FOR');
          if (activeFor && (activeFor.node as ForBlockNode).iteratorName === prefix) {
            isLoopVar = true;
            iterName = prefix;
          }
        }

        const keywordNode: KeywordNode = {
          type: 'KEYWORD',
          path: tagContent,
          isLoopVariable: isLoopVar,
          iteratorName: iterName,
          raw: fullTag,
        };
        getCurrentBody().push(keywordNode);
        continue;
      }

      // Cú pháp lạ không nhận diện được
      diagnostics.push({
        code: 'UNKNOWN_TAG_SYNTAX',
        message: `Thẻ "${fullTag}" không đúng cú pháp từ khóa hoặc lệnh điều khiển hệ thống.`,
        severity: 'WARNING',
        rawSnippet: fullTag,
        suggestion: 'Kiểm tra lại dấu ngoặc hoặc tên từ khóa không chứa ký tự đặc biệt.',
      });
    }

    // Phần text còn lại sau tag cuối cùng
    if (lastIndex < templateText.length) {
      const remainingText = templateText.slice(lastIndex);
      getCurrentBody().push({ type: 'TEXT', content: remainingText, raw: remainingText });
    }

    // Kiểm tra các thẻ mở mà chưa được đóng
    while (scopeStack.length > 1) {
      const unclosed = scopeStack.pop();
      if (unclosed) {
        if (unclosed.type === 'IF') {
          diagnostics.push({
            code: 'UNCLOSED_IF_BLOCK',
            message: `Khối điều kiện "${unclosed.tagRaw}" chưa được đóng bằng {{/IF}}.`,
            severity: 'ERROR',
            rawSnippet: unclosed.tagRaw,
            suggestion: 'Bổ sung thẻ {{/IF}} tại vị trí kết thúc khối điều kiện.',
          });
        } else if (unclosed.type === 'FOR') {
          diagnostics.push({
            code: 'UNCLOSED_FOR_BLOCK',
            message: `Vòng lặp "${unclosed.tagRaw}" chưa được đóng bằng {{/FOR}}.`,
            severity: 'ERROR',
            rawSnippet: unclosed.tagRaw,
            suggestion: 'Bổ sung thẻ {{/FOR}} tại vị trí kết thúc danh sách lặp.',
          });
        }
      }
    }

    const hasErrors = diagnostics.some((d) => d.severity === 'ERROR');

    return {
      ast: rootNode,
      validation: {
        isValid: !hasErrors,
        diagnostics,
        detectedKeywords: Array.from(detectedKeywords),
        detectedLoops,
        detectedConditions,
      },
    };
  }

  private extractIdentifiersFromExpr(expr: any, set: Set<string>): void {
    if (!expr) return;
    if (expr.type === 'IDENTIFIER' && expr.name) {
      set.add(expr.name);
    } else if (expr.type === 'BINARY') {
      this.extractIdentifiersFromExpr(expr.left, set);
      this.extractIdentifiersFromExpr(expr.right, set);
    } else if (expr.type === 'UNARY') {
      this.extractIdentifiersFromExpr(expr.argument, set);
    }
  }
}

export const templateAstParser = new TemplateAstParser();

