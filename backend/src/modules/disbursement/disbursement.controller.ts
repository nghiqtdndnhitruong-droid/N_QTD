import { Request, Response } from 'express';
import { DisbursementService, disbursementService } from './disbursement.service';
import { ApiResponse } from '../../shared/types';
import { Disbursement } from '@prisma/client';

export class DisbursementController {
  constructor(private readonly service: DisbursementService = disbursementService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const disbursement = await this.service.create(loanId, req.body);
    const response: ApiResponse<Disbursement> = {
      success: true,
      message: 'Ghi nhận giải ngân thành công',
      data: disbursement,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  getByLoanId = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const disbursements = await this.service.getByLoanId(loanId);
    const response: ApiResponse<Disbursement[]> = {
      success: true,
      message: 'Lấy lịch sử giải ngân thành công',
      data: disbursements,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const disbursement = await this.service.getById(id);
    const response: ApiResponse<Disbursement> = {
      success: true,
      message: 'Lấy thông tin giải ngân thành công',
      data: disbursement,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const disbursement = await this.service.update(id, req.body);
    const response: ApiResponse<Disbursement> = {
      success: true,
      message: 'Cập nhật giao dịch giải ngân thành công',
      data: disbursement,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const reason = req.body?.reason ?? (req.query?.reason as string | undefined);
    const disbursement = await this.service.delete(id, reason);
    const response: ApiResponse<Disbursement> = {
      success: true,
      message: 'Đã hủy / vô hiệu hóa giao dịch giải ngân và cập nhật lại dư nợ khoản vay',
      data: disbursement,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const disbursementController = new DisbursementController();

