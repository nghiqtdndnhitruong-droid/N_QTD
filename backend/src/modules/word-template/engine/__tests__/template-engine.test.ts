import { safeExpressionEvaluator } from '../safe-evaluator';
import { templateAstParser } from '../template-ast-parser';
import { wordTemplateCompiler } from '../word-template-compiler';

export function runTemplateEngineTests() {
  console.log('=== RUNNING TEMPLATE ENGINE TESTS ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. SafeExpressionEvaluator Tests
  console.log('\n1. Testing SafeExpressionEvaluator:');
  const context = {
    member: { fullName: 'Nguyễn Văn An', gender: 'NAM', yearOfBirth: 1985 },
    loan: { loanType: 'THE_CHAP', loanAmount: 150000000 },
    hasHeir: true,
    emptyList: [],
    nonEmptyList: [{ id: 1 }],
  };

  assert(safeExpressionEvaluator.evaluate('loan.loanType == "THE_CHAP"', context), 'loan.loanType == "THE_CHAP" should be true');
  assert(!safeExpressionEvaluator.evaluate('loan.loanType == "TIN_CHAP"', context), 'loan.loanType == "TIN_CHAP" should be false');
  assert(safeExpressionEvaluator.evaluate('loan.loanAmount > 100000000', context), 'loan.loanAmount > 100000000 should be true');
  assert(safeExpressionEvaluator.evaluate('loan.loanAmount <= 150000000', context), 'loan.loanAmount <= 150000000 should be true');
  assert(safeExpressionEvaluator.evaluate('hasHeir', context), 'hasHeir should be truthy');
  assert(!safeExpressionEvaluator.evaluate('NOT hasHeir', context), 'NOT hasHeir should be false');
  assert(!safeExpressionEvaluator.evaluate('emptyList', context), 'emptyList should be falsy');
  assert(safeExpressionEvaluator.evaluate('nonEmptyList', context), 'nonEmptyList should be truthy');
  assert(safeExpressionEvaluator.evaluate('member.gender == "NAM" AND loan.loanAmount >= 100000000', context), 'AND condition should be true');
  assert(safeExpressionEvaluator.evaluate('member.gender == "NU" OR loan.loanAmount >= 100000000', context), 'OR condition should be true');

  // Scope Stack resolution (e.g. inside loop)
  const loopScope = [{ ts: { assetCode: 'TS-01', valuation: 500000000 } }];
  assert(safeExpressionEvaluator.resolveIdentifier('ts.assetCode', context, loopScope) === 'TS-01', 'Loop variable ts.assetCode resolves correctly');
  assert(safeExpressionEvaluator.evaluate('ts.valuation > 400000000', context, loopScope), 'ts.valuation > 400000000 should evaluate inside loop scope');

  // 2. TemplateAstParser Tests
  console.log('\n2. Testing TemplateAstParser:');
  const validTemplate = `
    Kính gửi: {{NGUOI_VAY.HO_TEN}}
    {{#IF CO_NGUOI_THUA_KE}}
      {{#FOR ntk IN DANH_SACH_NGUOI_THUA_KE}}
        {{@number}}. {{ntk.HO_TEN}} ({{ntk.QUAN_HE}})
      {{/FOR}}
    {{#ELSE}}
      Không có người thừa kế.
    {{/IF}}

    {{#FOR ts IN DANH_SACH_TAI_SAN}}
      Mã: {{ts.MA_TAI_SAN}}
      {{#IF ts.SO_GCN}}
        Số GCN: {{ts.SO_GCN}}
      {{#ELSE}}
        Chưa cấp GCN
      {{/IF}}
    {{/FOR}}
  `;

  const { validation } = templateAstParser.parseAndValidate(validTemplate);
  assert(validation.isValid, 'Valid template with nested IF, FOR, and @number should be valid');
  assert(validation.detectedKeywords.includes('NGUOI_VAY.HO_TEN'), 'Detects NGUOI_VAY.HO_TEN');
  assert(validation.detectedKeywords.includes('DANH_SACH_TAI_SAN'), 'Detects DANH_SACH_TAI_SAN');
  assert(validation.detectedLoops.length === 2, 'Detects 2 loops (ntk and ts)');

  // Test error detection: unclosed IF
  const unclosedIfTemplate = '{{#IF CO_NGUOI_THUA_KE}} Có người thừa kế';
  const unclosedIfRes = templateAstParser.parseAndValidate(unclosedIfTemplate);
  assert(!unclosedIfRes.validation.isValid, 'Unclosed IF should be invalid');
  assert(unclosedIfRes.validation.diagnostics.some((d) => d.code === 'UNCLOSED_IF_BLOCK'), 'Detects UNCLOSED_IF_BLOCK');

  // Test error detection: unclosed FOR
  const unclosedForTemplate = '{{#FOR ts IN DANH_SACH_TAI_SAN}} Mã: {{ts.MA_TAI_SAN}}';
  const unclosedForRes = templateAstParser.parseAndValidate(unclosedForTemplate);
  assert(!unclosedForRes.validation.isValid, 'Unclosed FOR should be invalid');
  assert(unclosedForRes.validation.diagnostics.some((d) => d.code === 'UNCLOSED_FOR_BLOCK'), 'Detects UNCLOSED_FOR_BLOCK');

  // Test error detection: unexpected ELSE
  const unexpectedElseTemplate = '{{#ELSE}} Nội dung sai';
  const unexpectedElseRes = templateAstParser.parseAndValidate(unexpectedElseTemplate);
  assert(!unexpectedElseRes.validation.isValid, 'Unexpected ELSE should be invalid');
  assert(unexpectedElseRes.validation.diagnostics.some((d) => d.code === 'UNEXPECTED_ELSE'), 'Detects UNEXPECTED_ELSE');

  // 3. WordTemplateCompiler Tests
  console.log('\n3. Testing WordTemplateCompiler:');
  const rawXmlSample = `
    <w:p><w:t>Người vay: {{NGUOI_VAY.HO_TEN}}</w:t></w:p>
    <w:p><w:t>{{#IF CO_NGUOI_THUA_KE}}Có thừa kế{{#ELSE}}Không thừa kế{{/IF}}</w:t></w:p>
    <w:p><w:t>{{#FOR ts IN DANH_SACH_TAI_SAN}}</w:t></w:p>
    <w:p><w:t>{{@number}}. Mã: {{ts.MA_TAI_SAN}} - Chủ: {{ts.CHU_SO_HUU}}</w:t></w:p>
    <w:p><w:t>{{/FOR}}</w:t></w:p>
    <w:p><w:t>Tài sản đầu: {{DANH_SACH_TAI_SAN[0].MA_TAI_SAN}}</w:t></w:p>
  `;

  const sampleData = {
    NGUOI_VAY: { HO_TEN: 'Trần Văn Bình' },
    CO_NGUOI_THUA_KE: true,
    DANH_SACH_TAI_SAN: [
      { MA_TAI_SAN: 'TS-01', CHU_SO_HUU: 'Trần Văn Bình' },
      { MA_TAI_SAN: 'TS-02', CHU_SO_HUU: 'Lê Thị Cúc' },
    ],
  };

  const compiledResult = wordTemplateCompiler.compile(rawXmlSample, sampleData);
  assert(compiledResult.compiledXml.includes('{{#DANH_SACH_TAI_SAN}}'), 'Transforms #FOR into #DANH_SACH_TAI_SAN');
  assert(compiledResult.compiledXml.includes('{{/DANH_SACH_TAI_SAN}}'), 'Transforms /FOR into /DANH_SACH_TAI_SAN');
  assert(compiledResult.compiledXml.includes('{{_number}}'), 'Transforms @number into _number');
  assert(compiledResult.compiledXml.includes('{{MA_TAI_SAN}}'), 'Transforms ts.MA_TAI_SAN into MA_TAI_SAN');

  // Verify enriched array items have _number, _index, _first, _last, _length
  const enrichedColl = compiledResult.enrichedData['DANH_SACH_TAI_SAN'];
  assert(enrichedColl[0]._number === 1 && enrichedColl[0]._first === true, 'First element has _number=1 and _first=true');
  assert(enrichedColl[1]._number === 2 && enrichedColl[1]._last === true, 'Second element has _number=2 and _last=true');
  assert(enrichedColl[0]._length === 2, 'Array items have _length=2');

  // Verify array direct index access
  assert(
    compiledResult.compiledXml.includes('__arr_DANH_SACH_TAI_SAN_0_MA_TAI_SAN'),
    'Handles DANH_SACH_TAI_SAN[0].MA_TAI_SAN'
  );
  assert(
    compiledResult.enrichedData['__arr_DANH_SACH_TAI_SAN_0_MA_TAI_SAN'] === 'TS-01',
    'DANH_SACH_TAI_SAN[0].MA_TAI_SAN resolves to TS-01'
  );

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

// Chạy test nếu gọi trực tiếp
if (require.main === module) {
  runTemplateEngineTests();
}

