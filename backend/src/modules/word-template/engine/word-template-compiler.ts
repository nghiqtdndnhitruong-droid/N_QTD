import { safeExpressionEvaluator } from './safe-evaluator';
import { wordXmlReconciler } from './xml-reconciler';

export interface CompiledTemplateResult {
  compiledXml: string;
  enrichedData: Record<string, any>;
  evaluatedConditions: Record<string, boolean>;
}

export class WordTemplateCompiler {
  /**
   * Biên dịch nội dung XML Word và chuẩn bị dữ liệu enriched cho docxtemplater
   */
  public compile(
    rawXml: string,
    resolvedData: Record<string, any>
  ): CompiledTemplateResult {
    // 1. Hàn gắn các thẻ run <w:r> bị Microsoft Word phân mảnh
    const reconciledXml = wordXmlReconciler.reconcile(rawXml);

    const enrichedData: Record<string, any> = { ...resolvedData };
    const evaluatedConditions: Record<string, boolean> = {};

    let condCounter = 0;

    // 2. Tiền xử lý các vòng lặp {{#FOR item IN DANH_SACH}} ... {{/FOR}}
    // Cần làm giàu dữ liệu danh sách trước: thêm @index, @number, @first, @last, @length, và alias `item`
    const forRegex = /\{\{#FOR\s+([a-zA-Z0-9_]+)\s+IN\s+([a-zA-Z0-9_.[\]]+)\}\}/gi;
    let forMatch: RegExpExecArray | null;

    const loopConfigs: { iterator: string; collectionPath: string }[] = [];
    while ((forMatch = forRegex.exec(reconciledXml)) !== null) {
      loopConfigs.push({
        iterator: forMatch[1] || 'item',
        collectionPath: forMatch[2] || '',
      });
    }

    for (const loop of loopConfigs) {
      this.enrichCollectionData(enrichedData, loop.collectionPath, loop.iterator);
    }

    // 3. Biến đổi cấu trúc XML:
    // a. Chuyển đổi {{#FOR item IN DANH_SACH}} -> {{#DANH_SACH}}
    // b. Chuyển đổi {{/FOR}} -> {{/DANH_SACH}}
    // c. Chuyển đổi {{item.TRUONG}} -> {{TRUONG}}
    // d. Chuyển đổi {{@index}} -> {{_index}}, {{@number}} -> {{_number}}, {{@first}} -> {{_first}}, {{@last}} -> {{_last}}, {{@length}} -> {{_length}}
    let compiled = reconciledXml;

    // Thay thế FOR tags
    compiled = compiled.replace(
      /\{\{#FOR\s+([a-zA-Z0-9_]+)\s+IN\s+([a-zA-Z0-9_.[\]]+)\}\}/gi,
      (_match, _iterator, collection) => {
        const cleanColl = collection.trim();
        return `{{#${cleanColl}}}`;
      }
    );

    // Cần khớp đóng /FOR với collection tương ứng nếu lồng nhau
    // Để docxtemplater không nhầm lẫn, dùng stack tên collection
    const forCollStack: string[] = [];
    const forCollRegex = /\{\{#([a-zA-Z0-9_.[\]]+)\}\}|\{\{\/FOR\}\}/gi;

    compiled = compiled.replace(forCollRegex, (match, collName) => {
      if (collName) {
        forCollStack.push(collName);
        return match;
      }
      if (match.toUpperCase() === '{{/FOR}}') {
        const closingColl = forCollStack.pop() || 'DANH_SACH';
        return `{{/${closingColl}}}`;
      }
      return match;
    });

    // Thay thế các biến vị trí trong vòng lặp
    compiled = compiled.replace(/\{\{@index\}\}/gi, '{{_index}}');
    compiled = compiled.replace(/\{\{@number\}\}/gi, '{{_number}}');
    compiled = compiled.replace(/\{\{@first\}\}/gi, '{{_first}}');
    compiled = compiled.replace(/\{\{@last\}\}/gi, '{{_last}}');
    compiled = compiled.replace(/\{\{@length\}\}/gi, '{{_length}}');

    // Thay thế biến lặp: {{ts.MA_TAI_SAN}} -> {{MA_TAI_SAN}} khi nằm trong loop
    for (const loop of loopConfigs) {
      const iterPrefixRegex = new RegExp(`\\{\\{${loop.iterator}\\.([a-zA-Z0-9_]+)\\}\\}`, 'gi');
      compiled = compiled.replace(iterPrefixRegex, '{{$1}}');
    }

    // 4. Xử lý truy cập mảng ngoài vòng lặp: {{DANH_SACH_TAI_SAN[0].MA_TAI_SAN}}
    compiled = compiled.replace(
      /\{\{([a-zA-Z0-9_]+)\[(\d+)\](?:\.([a-zA-Z0-9_.]+))?\}\}/gi,
      (_match, collName, indexStr, prop) => {
        const idx = parseInt(indexStr, 10);
        const uniqueKey = `__arr_${collName}_${idx}_${prop || 'val'}`;

        const coll = enrichedData[collName];
        let val: any = undefined;
        if (Array.isArray(coll) && coll[idx]) {
          val = prop ? safeExpressionEvaluator.getByPath(coll[idx], prop) : coll[idx];
        }

        enrichedData[uniqueKey] = val !== undefined && val !== null ? val : '...................';
        return `{{${uniqueKey}}}`;
      }
    );

    // 5. Xử lý IF – ELSE IF – ELSE
    // Thuật toán: Quét các khối IF, tính toán giá trị logic của từng nhánh và gắn thẻ boolean cho docxtemplater
    compiled = this.compileIfBlocks(compiled, enrichedData, evaluatedConditions, condCounter, loopConfigs);

    return {
      compiledXml: compiled,
      enrichedData,
      evaluatedConditions,
    };
  }

  /**
   * Làm giàu dữ liệu mảng với các trường _index, _number, _first, _last, _length và alias
   */
  private enrichCollectionData(
    context: Record<string, any>,
    collectionPath: string,
    iterator: string
  ): void {
    const coll = safeExpressionEvaluator.getByPath(context, collectionPath);
    if (!Array.isArray(coll)) return;

    const total = coll.length;
    for (let i = 0; i < total; i++) {
      const item = coll[i];
      if (item && typeof item === 'object') {
        item._index = i;
        item._number = i + 1;
        item._first = i === 0;
        item._last = i === total - 1;
        item._length = total;

        // Alias iterator: item['ts'] = item
        item[iterator] = item;
      }
    }
  }

  /**
   * Biên dịch các khối IF - ELSE IF - ELSE thành các section docxtemplater {{#tag}}...{{/tag}}
   */
  private compileIfBlocks(
    xml: string,
    context: Record<string, any>,
    evaluatedConditions: Record<string, boolean>,
    counterRef: number,
    loopConfigs: { iterator: string; collectionPath: string }[] = []
  ): string {
    const iterators = new Set(loopConfigs.map((l) => l.iterator));
    // Regex tìm cấu trúc IF/ELSE
    const ifTokenRegex = /\{\{#IF\s+([\s\S]*?)\}\}|\{\{#(?:ELSE\s+IF|ELIF)\s+([\s\S]*?)\}\}|\{\{#ELSE\}\}|\{\{\/IF\}\}/gi;

    interface ActiveIfScope {
      condId: string;
      satisfied: boolean;
      activeBranchKey: string;
    }

    const ifStack: ActiveIfScope[] = [];

    return xml.replace(ifTokenRegex, (match, ifCond, elifCond) => {
      // 1. Gặp #IF <condition>
      if (ifCond !== undefined) {
        const trimmed = ifCond.trim();
        // Kiểm tra xem condition có phải là thuộc tính boolean của biến lặp không:
        // ví dụ: "dg.LA_NGHI_DINH_QUY" hoặc "!dg.LA_NGHI_DINH_QUY" hoặc "NOT dg.LA_NGHI_DINH_QUY"
        const loopPropMatch = /^(NOT\s+|!\s*)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/i.exec(trimmed);
        if (loopPropMatch && iterators.has(loopPropMatch[2])) {
          const isNegated = Boolean(loopPropMatch[1]);
          const propName = loopPropMatch[3];
          const branchTag = isNegated ? `^${propName}` : `#${propName}`;
          ifStack.push({
            condId: propName,
            satisfied: true,
            activeBranchKey: propName,
          });
          return `{{${branchTag}}}`;
        }

        counterRef++;
        const condId = `__c_${counterRef}`;
        const isTrue = safeExpressionEvaluator.evaluate(trimmed, context);

        evaluatedConditions[`${condId}_then`] = isTrue;
        context[`${condId}_then`] = isTrue;

        ifStack.push({
          condId,
          satisfied: isTrue,
          activeBranchKey: `${condId}_then`,
        });

        return `{{#${condId}_then}}`;
      }

      // 2. Gặp #ELSE IF / #ELIF <condition>
      if (elifCond !== undefined) {
        const top = ifStack[ifStack.length - 1];
        if (!top) return match;

        const closePrev = `{{/${top.activeBranchKey}}}`;
        counterRef++;
        const branchKey = `${top.condId}_elif_${counterRef}`;

        let isTrue = false;
        if (!top.satisfied) {
          isTrue = safeExpressionEvaluator.evaluate(elifCond.trim(), context);
          if (isTrue) {
            top.satisfied = true;
          }
        }

        evaluatedConditions[branchKey] = isTrue;
        context[branchKey] = isTrue;
        top.activeBranchKey = branchKey;

        return `${closePrev}{{#${branchKey}}}`;
      }

      // 3. Gặp #ELSE
      if (/^\{\{#ELSE\}\}$/i.test(match)) {
        const top = ifStack[ifStack.length - 1];
        if (!top) return match;

        const closePrev = `{{/${top.activeBranchKey}}}`;
        const elseKey = `${top.condId}_else`;
        const isTrue = !top.satisfied;

        evaluatedConditions[elseKey] = isTrue;
        context[elseKey] = isTrue;
        top.activeBranchKey = elseKey;

        return `${closePrev}{{#${elseKey}}}`;
      }

      // 4. Gặp /IF
      if (/^\{\{\/IF\}\}$/i.test(match)) {
        const top = ifStack.pop();
        if (!top) return match;
        return `{{/${top.activeBranchKey}}}`;
      }

      return match;
    });
  }
}

export const wordTemplateCompiler = new WordTemplateCompiler();

