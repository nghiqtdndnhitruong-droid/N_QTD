import { describe, expect, it } from 'vitest';
import { computeLoanInspectionSchedule, normalizeInspectionChecks } from '../loan-inspection';

describe('computeLoanInspectionSchedule', () => {
  it('1. Giải ngân tháng 02/2026 -> 4 đợt là Tháng 03/2026, 06/2026, 09/2026, 11/2026', () => {
    const schedule = computeLoanInspectionSchedule('2026-02-15', [true, false, true, false]);
    expect(schedule).toHaveLength(4);
    expect(schedule.map((s) => s.periodLabel)).toEqual([
      'Tháng 03/2026',
      'Tháng 06/2026',
      'Tháng 09/2026',
      'Tháng 11/2026',
    ]);
    expect(schedule.map((s) => s.quarterEndDate)).toEqual([
      '31/03/2026',
      '30/06/2026',
      '30/09/2026',
      '30/11/2026',
    ]);
    expect(schedule.map((s) => s.completed)).toEqual([true, false, true, false]);
  });

  it('2. Giải ngân tháng 05/2026 -> 4 đợt là Tháng 06/2026, 09/2026, 11/2026, 03/2027', () => {
    const schedule = computeLoanInspectionSchedule('2026-05-10');
    expect(schedule.map((s) => s.periodLabel)).toEqual([
      'Tháng 06/2026',
      'Tháng 09/2026',
      'Tháng 11/2026',
      'Tháng 03/2027',
    ]);
  });

  it('3. Giải ngân tháng 11/2026 -> 4 đợt là Tháng 11/2026, 03/2027, 06/2027, 09/2027', () => {
    const schedule = computeLoanInspectionSchedule('2026-11-13');
    expect(schedule.map((s) => s.periodLabel)).toEqual([
      'Tháng 11/2026',
      'Tháng 03/2027',
      'Tháng 06/2027',
      'Tháng 09/2027',
    ]);
  });

  it('4. Giải ngân tháng 12/2026 -> 4 đợt bắt đầu từ Tháng 03/2027', () => {
    const schedule = computeLoanInspectionSchedule('2026-12-05');
    expect(schedule.map((s) => s.periodLabel)).toEqual([
      'Tháng 03/2027',
      'Tháng 06/2027',
      'Tháng 09/2027',
      'Tháng 11/2027',
    ]);
  });

  it('5. normalizeInspectionChecks chuẩn hóa về mảng 4 phần tử boolean', () => {
    expect(normalizeInspectionChecks(undefined)).toEqual([false, false, false, false]);
    expect(normalizeInspectionChecks([true])).toEqual([true, false, false, false]);
    expect(normalizeInspectionChecks([true, true, false, true])).toEqual([true, true, false, true]);
  });
});

