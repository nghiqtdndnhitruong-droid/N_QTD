import { z } from 'zod';

/**
 * Schema kiểm tra định dạng MongoDB ObjectId (24 ký tự hex)
 */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'ID không đúng định dạng ObjectId hợp lệ');

