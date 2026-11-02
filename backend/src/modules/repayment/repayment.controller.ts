import { Request, Response } from 'express';
import { RepaymentService, repaymentService } from './repayment.service';
import { ApiResponse } from '../../shared/types';
import { Repayment } from '@prisma/client';

export class RepaymentController {
  constructor(private readonly service: RepaymentService = repaymentService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await this.service.create(loanId, req.body);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: result.isFullySettled
        ? 'Ghi nhận trả nợ thành công. Khoản vay đã tất toán!'
        : 'Ghi nhận trả nợ thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  estimateInterest = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await this.service.estimateInterest(loanId, req.query as any);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Ước tính số tiền lãi cần đóng thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getNextInterestPeriod = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await this.service.getNextInterestPeriod(loanId);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Lấy thông tin kỳ tính lãi tiếp theo thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getByLoanId = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const repayments = await this.service.getByLoanId(loanId);
    const response: ApiResponse<Repayment[]> = {
      success: true,
      message: 'Lấy lịch sử trả nợ thành công',
      data: repayments,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const repayment = await this.service.getById(id);
    const response: ApiResponse<Repayment> = {
      success: true,
      message: 'Lấy thông tin giao dịch trả nợ thành công',
      data: repayment,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const result = await this.service.update(id, req.body);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Cập nhật giao dịch trả nợ thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const reason = req.body?.reason ?? (req.query?.reason as string | undefined);
    const result = await this.service.delete(id, reason);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Đã hủy / vô hiệu hóa giao dịch trả nợ và cập nhật lại dư nợ khoản vay',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const repaymentController = new RepaymentController();

