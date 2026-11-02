import { Request, Response } from 'express';
import { InterestRateService, interestRateService } from './interest-rate.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { InterestRateConfig, LoanTermType } from '@prisma/client';

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
    const termType = req.query.termType as LoanTermType;
    const config = await this.service.getCurrentEffectiveConfig(termType);
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
