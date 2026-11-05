import { describe, it, expect } from 'vitest';
import { formatContractNumber, generateDefaultContractNumber } from '../contract-number';

describe('formatContractNumber', () => {
  it('should return empty string for empty input', () => {
    expect(formatContractNumber('')).toBe('');
  });

  it('should keep single digit without dot', () => {
    expect(formatContractNumber('2')).toBe('2');
  });

  it('should auto-append dot when 2 digits of year are entered', () => {
    expect(formatContractNumber('26')).toBe('26.');
  });

  it('should allow typing first digit of month', () => {
    expect(formatContractNumber('26.1')).toBe('26.1');
  });

  it('should auto-append dot when 2 digits of month are entered', () => {
    expect(formatContractNumber('26.11')).toBe('26.11.');
  });

  it('should allow free-form input after second dot', () => {
    expect(formatContractNumber('26.11.020')).toBe('26.11.020');
    expect(formatContractNumber('26.11.1')).toBe('26.11.1');
    expect(formatContractNumber('26.11.0019')).toBe('26.11.0019');
    expect(formatContractNumber('26.11.A123')).toBe('26.11.A123');
  });

  it('should handle pasting continuous digits without dots', () => {
    expect(formatContractNumber('2611020')).toBe('26.11.020');
    expect(formatContractNumber('26111')).toBe('26.11.1');
    expect(formatContractNumber('261')).toBe('26.1');
  });

  it('should handle natural backspace deletion when removing trailing dot', () => {
    // When deleting from '26.' to '26'
    expect(formatContractNumber('26', '26.')).toBe('2');
    // When deleting from '26.11.' to '26.11'
    expect(formatContractNumber('26.11', '26.11.')).toBe('26.1');
  });

  it('should generate valid default contract number format YY.MM.XXX', () => {
    const defaultVal = generateDefaultContractNumber();
    expect(defaultVal).toMatch(/^\d{2}\.\d{2}\.\d{3}$/);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    expect(defaultVal.startsWith(`${yy}.${mm}.`)).toBe(true);
  });
});

