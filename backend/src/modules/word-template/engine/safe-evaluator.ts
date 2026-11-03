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

  private tokenize(str: string): string[] {
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
          case '>':
            return Number(leftVal) > Number(rightVal);
          case '<':
            return Number(leftVal) < Number(rightVal);
          case '>=':
            return Number(leftVal) >= Number(rightVal);
          case '<=':
            return Number(leftVal) <= Number(rightVal);
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
   * - object không có key -> false
   * - mọi thứ khác -> true
   */
  public isTruthy(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0 && !isNaN(val);
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return Boolean(val);
  }

  private looseEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // So sánh chuỗi không phân biệt hoa thường nếu là enum
    if (typeof a === 'string' && typeof b === 'string') {
      return a.trim() === b.trim();
    }

    // So sánh số và chuỗi số
    if (!isNaN(Number(a)) && !isNaN(Number(b))) {
      return Number(a) === Number(b);
    }

    return String(a) === String(b);
  }
}

export const safeExpressionEvaluator = new SafeExpressionEvaluator();

