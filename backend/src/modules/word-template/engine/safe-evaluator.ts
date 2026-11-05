import { ExpressionNode } from './template-engine.types';

export class SafeExpressionParser {
  /**
   * Phân tích chuỗi điều kiện thành cây ExpressionNode
   * Hỗ trợ: ==, !=, >, <, >=, <=, AND, OR, &&, ||, NOT, !, ngoặc đơn ()
   * Literals: "string", 'string', 123, 123.45, true, false, null
   * Identifiers: GIOI_TINH, KHOAN_VAY.SO_TIEN, ts.MA_TAI_SAN
   */
  public parse(conditionStr: string): ExpressionNode {
    const tokens = this.tokenize(conditionStr.trim());
    if (tokens.length === 0) {
      return { type: 'LITERAL', value: false };
    }
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    // Recursive descent parser
    const parseOr = (): ExpressionNode => {
      let node = parseAnd();
      while (pos < tokens.length && (peek().toUpperCase() === 'OR' || peek() === '||')) {
        consume();
        const right = parseAnd();
        node = { type: 'BINARY', op: 'OR', left: node, right };
      }
      return node;
    };

    const parseAnd = (): ExpressionNode => {
      let node = parseNot();
      while (pos < tokens.length && (peek().toUpperCase() === 'AND' || peek() === '&&')) {
        consume();
        const right = parseNot();
        node = { type: 'BINARY', op: 'AND', left: node, right };
      }
      return node;
    };

    const parseNot = (): ExpressionNode => {
      if (pos < tokens.length && (peek().toUpperCase() === 'NOT' || peek() === '!')) {
        consume();
        const arg = parseNot();
        return { type: 'UNARY', op: 'NOT', argument: arg };
      }
      return parseComparison();
    };

    const parseComparison = (): ExpressionNode => {
      const left = parsePrimary();
      if (pos < tokens.length) {
        const next = peek();
        if (['==', '!=', '===', '!==', '>', '<', '>=', '<='].includes(next)) {
          consume();
          const op = next === '===' ? '==' : next === '!==' ? '!=' : (next as any);
          const right = parsePrimary();
          return { type: 'BINARY', op, left, right };
        }
      }
      return left;
    };

    const parsePrimary = (): ExpressionNode => {
      if (pos >= tokens.length) {
        return { type: 'LITERAL', value: null };
      }
      const token = consume();

      // Ngoặc đơn
      if (token === '(') {
        const inner = parseOr();
        if (pos < tokens.length && peek() === ')') {
          consume();
        }
        return inner;
      }

      // Chuỗi ký tự
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        return { type: 'LITERAL', value: token.slice(1, -1) };
      }

      // Boolean
      if (token.toLowerCase() === 'true') return { type: 'LITERAL', value: true };
      if (token.toLowerCase() === 'false') return { type: 'LITERAL', value: false };
      if (token.toLowerCase() === 'null') return { type: 'LITERAL', value: null };

      // Number
      if (!isNaN(Number(token)) && token.trim() !== '') {
        return { type: 'LITERAL', value: Number(token) };
      }

      // Identifier / Path
      return { type: 'IDENTIFIER', name: token };
    };

    return parseOr();
  }

  private tokenize(rawStr: string): string[] {
    // 1. Chuẩn hóa XML entities thường gặp khi người dùng gõ trong Microsoft Word
    let str = rawStr
      .replace(/&amp;lt;/gi, '<')
      .replace(/&lt;/gi, '<')
      .replace(/&amp;gt;/gi, '>')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;le;/gi, '<=')
      .replace(/&le;/gi, '<=')
      .replace(/&amp;ge;/gi, '>=')
      .replace(/&ge;/gi, '>=')
      .replace(/&amp;quot;/gi, '"')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;apos;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&amp;amp;/gi, '&')
      .replace(/&amp;/gi, '&');

    // 2. Chuẩn hóa smart quotes của Microsoft Word (dấu ngoặc kép cong và dấu nháy đơn cong)
    str = str
      .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

    const tokens: string[] = [];
    let i = 0;
    const len = str.length;

    while (i < len) {
      const char = str[i];

      // Bỏ qua khoảng trắng
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // String literal
      if (char === '"' || char === "'") {
        const quote = char;
        let s = quote;
        i++;
        while (i < len && str[i] !== quote) {
          if (str[i] === '\\' && i + 1 < len) {
            s += str[i + 1];
            i += 2;
          } else {
            s += str[i];
            i++;
          }
        }
        if (i < len) {
          s += quote;
          i++;
        }
        tokens.push(s);
        continue;
      }

      // Two/three-char operators
      const twoChar = str.slice(i, i + 2);
      const threeChar = str.slice(i, i + 3);
      if (['===', '!=='].includes(threeChar)) {
        tokens.push(threeChar);
        i += 3;
        continue;
      }
      if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
        tokens.push(twoChar);
        i += 2;
        continue;
      }

      // Người dùng gõ dấu gán đơn '=' -> coi như '=='
      if (char === '=' && str[i + 1] !== '=') {
        tokens.push('==');
        i++;
        continue;
      }

      // Dấu & hoặc | đơn lẻ -> chuẩn hóa thành && và ||
      if (char === '&' || char === '|') {
        tokens.push(char === '&' ? '&&' : '||');
        i++;
        continue;
      }

      // One-char operators and parens
      if (['>', '<', '!', '(', ')'].includes(char)) {
        tokens.push(char);
        i++;
        continue;
      }

      // Word / Identifier / Number
      let word = '';
      while (
        i < len &&
        !/\s/.test(str[i]) &&
        !['=', '!', '>', '<', '&', '|', '(', ')', '"', "'"].includes(str[i])
      ) {
        word += str[i];
        i++;
      }
      if (word) {
        tokens.push(word);
      } else {
        // Fallback an toàn tuyệt đối: nếu gặp ký tự lạ, luôn tiến i++ để không bao giờ bị lặp vô tận
        tokens.push(str[i]);
        i++;
      }
    }

    return tokens;
  }
}

export class SafeExpressionEvaluator {
  private parser = new SafeExpressionParser();

  /**
   * Tính toán giá trị của ExpressionNode hoặc condition string dựa trên context runtime
   */
  public evaluate(
    exprOrString: ExpressionNode | string,
    context: Record<string, any>,
    scopeStack: Record<string, any>[] = []
  ): boolean {
    const expr =
      typeof exprOrString === 'string'
        ? this.parser.parse(exprOrString)
        : exprOrString;

    const val = this.evaluateNode(expr, context, scopeStack);
    return this.isTruthy(val);
  }

  private evaluateNode(
    node: ExpressionNode,
    context: Record<string, any>,
    scopeStack: Record<string, any>[]
  ): any {
    switch (node.type) {
      case 'LITERAL':
        return node.value;

      case 'IDENTIFIER':
        return this.resolveIdentifier(node.name, context, scopeStack);

      case 'UNARY': {
        const argVal = this.evaluateNode(node.argument, context, scopeStack);
        if (node.op === 'NOT') {
          return !this.isTruthy(argVal);
        }
        return false;
      }

      case 'BINARY': {
        const leftVal = this.evaluateNode(node.left, context, scopeStack);

        // Short-circuit logical operators
        if (node.op === 'AND') {
          return this.isTruthy(leftVal) && this.isTruthy(this.evaluateNode(node.right, context, scopeStack));
        }
        if (node.op === 'OR') {
          return this.isTruthy(leftVal) || this.isTruthy(this.evaluateNode(node.right, context, scopeStack));
        }

        const rightVal = this.evaluateNode(node.right, context, scopeStack);

        switch (node.op) {
          case '==':
            return this.looseEquals(leftVal, rightVal);
          case '!=':
            return !this.looseEquals(leftVal, rightVal);
          case '>': {
            const leftNum = this.toNumber(leftVal);
            const rightNum = this.toNumber(rightVal);
            return !isNaN(leftNum) && !isNaN(rightNum)
              ? leftNum > rightNum
              : String(leftVal) > String(rightVal);
          }
          case '<': {
            const leftNum = this.toNumber(leftVal);
            const rightNum = this.toNumber(rightVal);
            return !isNaN(leftNum) && !isNaN(rightNum)
              ? leftNum < rightNum
              : String(leftVal) < String(rightVal);
          }
          case '>=': {
            const leftNum = this.toNumber(leftVal);
            const rightNum = this.toNumber(rightVal);
            return !isNaN(leftNum) && !isNaN(rightNum)
              ? leftNum >= rightNum
              : String(leftVal) >= String(rightVal);
          }
          case '<=': {
            const leftNum = this.toNumber(leftVal);
            const rightNum = this.toNumber(rightVal);
            return !isNaN(leftNum) && !isNaN(rightNum)
              ? leftNum <= rightNum
              : String(leftVal) <= String(rightVal);
          }
          default:
            return false;
        }
      }
    }
  }

  /**
   * Phân giải biến hoặc đường dẫn từ Scope Stack (vòng lặp) và Context gốc
   */
  public resolveIdentifier(
    path: string,
    context: Record<string, any>,
    scopeStack: Record<string, any>[] = []
  ): any {
    const cleanPath = path.trim();

    // 1. Kiểm tra trong Scope Stack (từ trong ra ngoài)
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const scope = scopeStack[i];
      if (scope) {
        if (cleanPath in scope) {
          return scope[cleanPath];
        }
        // Hỗ trợ dot notation: ts.MA_TAI_SAN
        const dotIndex = cleanPath.indexOf('.');
        if (dotIndex > 0) {
          const rootKey = cleanPath.slice(0, dotIndex);
          const rest = cleanPath.slice(dotIndex + 1);
          if (rootKey in scope && scope[rootKey] != null) {
            return this.getByPath(scope[rootKey], rest);
          }
        }
      }
    }

    // 2. Kiểm tra trong Context gốc
    if (cleanPath in context) {
      return context[cleanPath];
    }

    // Hỗ trợ alias linh hoạt giữa CO_NGUOI_THUA_KE và lỗi chính tả CO_NGUO_THUA_KE
    if (cleanPath === 'CO_NGUO_THUA_KE' || cleanPath === 'CO_NGUOI_THUA_KE') {
      if ('CO_NGUOI_THUA_KE' in context) return context['CO_NGUOI_THUA_KE'];
      if ('CO_NGUO_THUA_KE' in context) return context['CO_NGUO_THUA_KE'];
      if ('hasHeir' in context) return context['hasHeir'];
    }
    if (cleanPath === 'KHOAN_VAY.CO_NGUO_THUA_KE' || cleanPath === 'KHOAN_VAY.CO_NGUOI_THUA_KE') {
      const kv = context['KHOAN_VAY'];
      if (kv && typeof kv === 'object') {
        if ('CO_NGUOI_THUA_KE' in kv) return kv['CO_NGUOI_THUA_KE'];
        if ('CO_NGUO_THUA_KE' in kv) return kv['CO_NGUO_THUA_KE'];
        if ('hasHeir' in kv) return kv['hasHeir'];
      }
      if ('CO_NGUOI_THUA_KE' in context) return context['CO_NGUOI_THUA_KE'];
      if ('CO_NGUO_THUA_KE' in context) return context['CO_NGUO_THUA_KE'];
    }
    if (cleanPath === 'TAI_SAN.CO_NGUO_THUA_KE' || cleanPath === 'TAI_SAN.CO_NGUOI_THUA_KE') {
      const ts = context['TAI_SAN'];
      if (ts && typeof ts === 'object') {
        if ('CO_NGUOI_THUA_KE' in ts) return ts['CO_NGUOI_THUA_KE'];
        if ('CO_NGUO_THUA_KE' in ts) return ts['CO_NGUO_THUA_KE'];
      }
      if ('TAI_SAN.CO_NGUOI_THUA_KE' in context) return context['TAI_SAN.CO_NGUOI_THUA_KE'];
      if ('TAI_SAN.CO_NGUO_THUA_KE' in context) return context['TAI_SAN.CO_NGUO_THUA_KE'];
    }

    // Hỗ trợ dot notation hoặc array access
    return this.getByPath(context, cleanPath);
  }

  /**
   * Lấy giá trị theo dot notation: "member.fullName" hoặc "collaterals.0.assetCode"
   */
  public getByPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    // Chuẩn hóa array index notation: "collaterals[0].name" -> "collaterals.0.name"
    const normalized = path.replace(/\[(\d+)\]/g, '.$1');
    const parts = normalized.split('.');

    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Kiểm tra tính đúng đắn (truthiness) theo chuẩn nghiệp vụ:
   * - null, undefined -> false
   * - boolean -> boolean
   * - string rỗng hoặc chỉ có khoảng trắng -> false
   * - number 0 -> false
   * - array rỗng ([]) -> false
   * - object rỗng hoặc chỉ chứa các giá trị rỗng -> false
   * - mọi thứ khác -> true
   */
  public isTruthy(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0 && !isNaN(val);
    if (typeof val === 'string') {
      const trimmed = val.trim().toLowerCase();
      if (
        trimmed === 'false' ||
        trimmed === '0' ||
        trimmed === 'null' ||
        trimmed === 'undefined' ||
        trimmed === 'no' ||
        trimmed === ''
      ) {
        return false;
      }
      return trimmed.length > 0;
    }
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') {
      const values = Object.values(val);
      if (values.length === 0) return false;
      return values.some((v) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0 && !isNaN(v);
        if (typeof v === 'string') {
          const t = v.trim().toLowerCase();
          if (
            t === 'false' ||
            t === '0' ||
            t === 'null' ||
            t === 'undefined' ||
            t === 'no' ||
            t === ''
          ) {
            return false;
          }
          return t.length > 0;
        }
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return this.isTruthy(v);
        return Boolean(v);
      });
    }
    return Boolean(val);
  }

  private toNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (val === null || val === undefined) return NaN;
    const str = String(val).trim().replace(/đ|VND|m²|m2|%|đồng/gi, '').trim();
    const normalized = str.replace(/\./g, '').replace(/,/g, '.');
    const num = Number(normalized);
    return isNaN(num) ? NaN : num;
  }

  private looseEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    if (typeof a === 'boolean' || typeof b === 'boolean') {
      const aBool = typeof a === 'boolean' ? a : this.isTruthy(a);
      const bBool = typeof b === 'boolean' ? b : this.isTruthy(b);
      return aBool === bBool;
    }

    // So sánh chuỗi không phân biệt hoa thường nếu là enum
    if (typeof a === 'string' && typeof b === 'string') {
      return a.trim() === b.trim();
    }

    // So sánh số và chuỗi số (có hỗ trợ format tiền tệ)
    const aNum = this.toNumber(a);
    const bNum = this.toNumber(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum === bNum;
    }

    return String(a) === String(b);
  }
}

export const safeExpressionEvaluator = new SafeExpressionEvaluator();

