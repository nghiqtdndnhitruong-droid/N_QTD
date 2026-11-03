export type TokenType =
  | 'TEXT'
  | 'TAG_OPEN'         // {{
  | 'TAG_CLOSE'        // }}
  | 'KW_IF'            // #IF
  | 'KW_ELSE_IF'       // #ELSE IF
  | 'KW_ELSE'          // #ELSE
  | 'KW_END_IF'        // /IF
  | 'KW_FOR'           // #FOR
  | 'KW_END_FOR'       // /FOR
  | 'KW_IN'            // IN
  | 'SPECIAL_VAR'      // @index, @number, @first, @last, @length
  | 'IDENTIFIER'       // HO_TEN, NGUOI_VAY.HO_TEN, ts.MA_TAI_SAN
  | 'ARRAY_ACCESS'     // DANH_SACH_TAI_SAN[0].MA_TAI_SAN
  | 'STRING_LITERAL'   // "NAM", 'TIN_CHAP'
  | 'NUMBER_LITERAL'   // 100, 150000000
  | 'BOOLEAN_LITERAL'  // true, false
  | 'NULL_LITERAL'     // null
  | 'OPERATOR';        // ==, !=, >, <, >=, <=, &&, AND, ||, OR, !, NOT

export interface Token {
  type: TokenType;
  value: string;
  raw: string;
  start: number;
  end: number;
}

// -------------------------------------------------------------
// AST NODES
// -------------------------------------------------------------

export type ASTNodeType =
  | 'ROOT'
  | 'TEXT'
  | 'KEYWORD'
  | 'SPECIAL_VAR'
  | 'IF_BLOCK'
  | 'FOR_BLOCK';

export interface BaseASTNode {
  type: ASTNodeType;
  raw?: string;
}

export interface TextNode extends BaseASTNode {
  type: 'TEXT';
  content: string;
}

export interface KeywordNode extends BaseASTNode {
  type: 'KEYWORD';
  path: string;                // "NGUOI_VAY.HO_TEN" or "ts.MA_TAI_SAN" or "DANH_SACH_TAI_SAN"
  arrayIndex?: number;         // For DANH_SACH_TAI_SAN[0].MA_TAI_SAN -> 0
  subPath?: string;            // For DANH_SACH_TAI_SAN[0].MA_TAI_SAN -> "MA_TAI_SAN"
  isLoopVariable?: boolean;    // true if starts with iterator (e.g. ts.MA_TAI_SAN)
  iteratorName?: string;       // "ts"
}

export interface SpecialVarNode extends BaseASTNode {
  type: 'SPECIAL_VAR';
  name: '@index' | '@number' | '@first' | '@last' | '@length';
}

export interface ElseIfBranch {
  condition: ExpressionNode;
  body: ASTNode[];
  rawCondition: string;
}

export interface IfBlockNode extends BaseASTNode {
  type: 'IF_BLOCK';
  condition: ExpressionNode;
  rawCondition: string;
  thenBody: ASTNode[];
  elseIfBranches: ElseIfBranch[];
  elseBody?: ASTNode[];
}

export interface ForBlockNode extends BaseASTNode {
  type: 'FOR_BLOCK';
  iteratorName: string;         // "ts"
  collectionPath: string;       // "DANH_SACH_TAI_SAN"
  body: ASTNode[];
}

export type ASTNode =
  | TextNode
  | KeywordNode
  | SpecialVarNode
  | IfBlockNode
  | ForBlockNode;

export interface RootASTNode extends BaseASTNode {
  type: 'ROOT';
  body: ASTNode[];
}

// -------------------------------------------------------------
// EXPRESSIONS (For IF conditions)
// -------------------------------------------------------------

export type BinaryOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'AND'
  | 'OR';

export type UnaryOperator = 'NOT';

export type ExpressionNode =
  | { type: 'BINARY'; op: BinaryOperator; left: ExpressionNode; right: ExpressionNode }
  | { type: 'UNARY'; op: UnaryOperator; argument: ExpressionNode }
  | { type: 'LITERAL'; value: string | number | boolean | null }
  | { type: 'IDENTIFIER'; name: string };

// -------------------------------------------------------------
// DIAGNOSTICS & VALIDATION
// -------------------------------------------------------------

export type DiagnosticSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface TemplateDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  rawSnippet?: string;
  suggestion?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  diagnostics: TemplateDiagnostic[];
  detectedKeywords: string[];
  detectedLoops: { iterator: string; collection: string }[];
  detectedConditions: string[];
}

