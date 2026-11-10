import { Request, Response } from 'express';
import { InterestRateService, interestRateService } from './interest-rate.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { InterestRateConfig, LoanTermType, LoanType } from '@prisma/client';

export class InterestRateController {
  constructor(private readonly service: InterestRateService = interestRateService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const config = await this.service.create(req.body);
    const response: ApiResponse<InterestRateConfig> = {
      success: true,
      message: 'Tạo cấu hình bảng lãi suất thành công',
      data: config,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const config = await this.service.update(id, req.body);
    const response: ApiResponse<InterestRateConfig> = {
      success: true,
      message: 'Cập nhật cấu hình bảng lãi suất thành công',
      data: config,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.service.delete(id);
    const response: ApiResponse<{ id: string }> = {
      success: true,
      message: 'Đã xóa cấu hình bảng lãi suất thành công',
      data: { id },
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const config = await this.service.getById(id);
    const response: ApiResponse<InterestRateConfig> = {
      success: true,
      message: 'Lấy thông tin bảng lãi suất thành công',
      data: config,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  findMany = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.findMany(req.query as any);
    const response: PaginatedResponse<InterestRateConfig> = {
      success: true,
      message: 'Lấy danh sách bảng lãi suất thành công',
      data: result.configs,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getCurrentEffective = async (req: Request, res: Response): Promise<void> => {
    const loanType = req.query.loanType as LoanType | undefined;
    const termType = req.query.termType as LoanTermType | undefined;
    const config = await this.service.getCurrentEffectiveConfig({ loanType, termType });
    const response: ApiResponse<InterestRateConfig> = {
      success: true,
      message: 'Lấy bảng lãi suất hiện hành thành công',
      data: config,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const interestRateController = new InterestRateController();
