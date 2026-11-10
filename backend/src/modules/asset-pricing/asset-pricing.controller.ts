import { Request, Response } from 'express';
import { AssetPricingService, assetPricingService } from './asset-pricing.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { AssetPricingRule } from '@prisma/client';

export class AssetPricingController {
  constructor(private readonly service: AssetPricingService = assetPricingService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const rule = await this.service.create(req.body);
    const response: ApiResponse<AssetPricingRule> = {
      success: true,
      message: 'Tạo quy định bảng giá đất thành công',
      data: rule,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const rule = await this.service.getById(id);
    const response: ApiResponse<AssetPricingRule> = {
      success: true,
      message: 'Lấy thông tin quy định giá thành công',
      data: rule,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  findMany = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.findMany(req.query as any);
    const response: PaginatedResponse<AssetPricingRule> = {
      success: true,
      message: 'Lấy danh sách bảng giá đất thành công',
      data: result.rules,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.update(id, req.body);
    const response: ApiResponse<AssetPricingRule> = {
      success: true,
      message: 'Cập nhật bảng giá đất thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  calculateValuation = async (req: Request, res: Response): Promise<void> => {
    const { landCategory, area, actualArea } = req.query;
    const parsedActualArea =
      actualArea !== undefined && actualArea !== '' && Number(actualArea) > 0
        ? Number(actualArea)
        : null;
    const result = await this.service.calculateValuationByFundPricing(
      String(landCategory),
      Number(area),
      parsedActualArea
    );
    const response: ApiResponse<typeof result> = {
      success: true,
      message: 'Tính định giá tài sản thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
  reorder = async (req: Request, res: Response): Promise<void> => {
    const { ruleIds } = req.body;
    const result = await this.service.reorder(ruleIds);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const deleted = await this.service.delete(id);
    const response: ApiResponse<AssetPricingRule> = {
      success: true,
      message: 'Xóa đơn giá tài sản thành công',
      data: deleted,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const assetPricingController = new AssetPricingController();
