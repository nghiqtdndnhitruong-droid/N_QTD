import { Request, Response } from 'express';
import { loanValuationService } from './loan-valuation.service';
import { ApiResponse } from '../../shared/types';
import { LoanValuation } from '@prisma/client';

export class LoanValuationController {
  create = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await loanValuationService.create(loanId, req.body);
    const response: ApiResponse<LoanValuation> = {
      success: true,
      message: 'Thêm dòng định giá thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  findByLoanId = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await loanValuationService.findByLoanId(loanId);
    const response: ApiResponse<LoanValuation[]> = {
      success: true,
      message: 'Lấy danh sách định giá thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    const result = await loanValuationService.getById(loanId, id);
    const response: ApiResponse<LoanValuation> = {
      success: true,
      message: 'Lấy thông tin định giá thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    const result = await loanValuationService.update(loanId, id, req.body);
    const response: ApiResponse<LoanValuation> = {
      success: true,
      message: 'Cập nhật dòng định giá thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    await loanValuationService.delete(loanId, id);
    const response: ApiResponse<null> = {
      success: true,
      message: 'Xóa dòng định giá thành công',
      data: null,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  updateCommonSettings = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await loanValuationService.updateCommonSettings(loanId, req.body);
    const response: ApiResponse<{ count: number }> = {
      success: true,
      message: 'Cập nhật thông tin chung định giá thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const loanValuationController = new LoanValuationController();

