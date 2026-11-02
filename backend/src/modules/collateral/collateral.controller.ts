import { Request, Response } from 'express';
import { CollateralService, collateralService } from './collateral.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { Collateral } from '@prisma/client';

export class CollateralController {
  constructor(private readonly service: CollateralService = collateralService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId || req.body.loanId);
    const collateral = await this.service.create(loanId, req.body);
    const response: ApiResponse<Collateral> = {
      success: true,
      message: 'Thêm tài sản thế chấp thành công',
      data: collateral,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  getByLoanIdOrList = async (req: Request, res: Response): Promise<void> => {
    if (req.params.loanId) {
      const loanId = String(req.params.loanId);
      const collaterals = await this.service.getByLoanId(loanId);
      const response: ApiResponse<Collateral[]> = {
        success: true,
        message: 'Lấy danh sách tài sản của khoản vay thành công',
        data: collaterals,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
      return;
    }

    const result = await this.service.findMany(req.query as any);
    const response: PaginatedResponse<Collateral> = {
      success: true,
      message: 'Lấy danh sách tài sản thế chấp thành công',
      data: result.collaterals,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const collateral = await this.service.getById(id);
    const response: ApiResponse<Collateral> = {
      success: true,
      message: 'Lấy thông tin tài sản thành công',
      data: collateral,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.update(id, req.body);
    const response: ApiResponse<Collateral> = {
      success: true,
      message: 'Cập nhật tài sản thế chấp thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    await this.service.delete(id);
    const response: ApiResponse<null> = {
      success: true,
      message: 'Xóa tài sản thế chấp thành công',
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const collateralController = new CollateralController();
