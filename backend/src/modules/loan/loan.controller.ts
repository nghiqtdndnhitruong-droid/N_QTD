import { Request, Response } from 'express';
import { LoanService, loanService } from './loan.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { Loan } from '@prisma/client';
import { DeleteLoanResult, LoanSummary } from './loan.types';

export class LoanController {
  constructor(private readonly service: LoanService = loanService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const createdById = req.user?.id;
    const loan = await this.service.create({
      ...req.body,
      createdById: req.body.createdById || createdById,
    });
    const response: ApiResponse<Loan> = {
      success: true,
      message: 'Tạo khoản vay mới thành công',
      data: loan,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const loan = await this.service.getById(id, req.user);
    const response: ApiResponse<Loan> = {
      success: true,
      message: 'Lấy thông tin chi tiết khoản vay thành công',
      data: loan,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  findMany = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.findMany(req.query as any, req.user);
    const response: PaginatedResponse<Loan> = {
      success: true,
      message: 'Lấy danh sách khoản vay thành công',
      data: result.loans as any,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.update(id, req.body, req.user);
    const response: ApiResponse<Loan> = {
      success: true,
      message: 'Cập nhật khoản vay thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { status } = req.body;
    const updated = await this.service.updateStatus(id, status, req.user);
    const response: ApiResponse<Loan> = {
      success: true,
      message: `Cập nhật trạng thái khoản vay sang ${status} thành công`,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const reason = req.body?.reason ? String(req.body.reason) : undefined;
    const result = await this.service.delete(id, reason, req.user);
    const response: ApiResponse<DeleteLoanResult> = {
      success: true,
      message: `Đã xóa/hủy hồ sơ khoản vay ${result.contractNumber || `#${result.id.slice(-6)}`} thành công`,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const summary = await this.service.getSummary(id, req.user);
    const response: ApiResponse<LoanSummary> = {
      success: true,
      message: 'Lấy tóm tắt tài chính và dư nợ khoản vay thành công',
      data: summary,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  calculatePlanTemplate = async (req: Request, res: Response): Promise<void> => {
    const result = this.service.calculatePlanTemplate(req.query as any);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Tính toán phương án vay theo mẫu thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  clone = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const targetMemberId = req.body?.targetMemberId ? String(req.body.targetMemberId) : undefined;
    const cloned = await this.service.clone(id, { targetMemberId }, req.user);
    const response: ApiResponse<Loan> = {
      success: true,
      message: 'Đã sao chép hồ sơ khoản vay thành công',
      data: cloned,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };
}

export const loanController = new LoanController();
