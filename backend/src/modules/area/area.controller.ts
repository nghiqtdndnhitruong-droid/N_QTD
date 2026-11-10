import { Request, Response } from 'express';
import { AreaService, areaService } from './area.service';
import { ApiResponse } from '../../shared/types';

export class AreaController {
  constructor(private readonly service: AreaService = areaService) {}

  getTree = async (req: Request, res: Response): Promise<void> => {
    const includeInactive = req.query.includeInactive === 'true';
    const tree = await this.service.getTree(includeInactive);
    const response: ApiResponse<typeof tree> = {
      success: true,
      message: 'Lấy cây danh mục địa bàn (Tỉnh -> Xã -> Ấp) thành công',
      data: tree,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getProvinces = async (req: Request, res: Response): Promise<void> => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const provinces = await this.service.getProvinces(search, includeInactive);
    const response: ApiResponse<typeof provinces> = {
      success: true,
      message: 'Lấy danh sách Tỉnh/Thành phố thành công',
      data: provinces,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getCommunesByProvince = async (req: Request, res: Response): Promise<void> => {
    const provinceId = String(req.params.provinceId);
    const search = req.query.search ? String(req.query.search) : undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const communes = await this.service.getCommunesByProvince(
      provinceId,
      search,
      includeInactive
    );
    const response: ApiResponse<typeof communes> = {
      success: true,
      message: 'Lấy danh sách Xã/Phường theo Tỉnh thành công',
      data: communes,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getHamletsByCommune = async (req: Request, res: Response): Promise<void> => {
    const communeId = String(req.params.communeId);
    const search = req.query.search ? String(req.query.search) : undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const hamlets = await this.service.getHamletsByCommune(communeId, search, includeInactive);
    const response: ApiResponse<typeof hamlets> = {
      success: true,
      message: 'Lấy danh sách Ấp theo Xã thành công',
      data: hamlets,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  searchHamlets = async (req: Request, res: Response): Promise<void> => {
    const hamlets = await this.service.searchHamlets({
      provinceId: req.query.provinceId ? String(req.query.provinceId) : undefined,
      communeId: req.query.communeId ? String(req.query.communeId) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      includeInactive: req.query.includeInactive === 'true',
    });
    const response: ApiResponse<typeof hamlets> = {
      success: true,
      message: 'Tìm kiếm danh sách Ấp thành công',
      data: hamlets,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  createCommune = async (req: Request, res: Response): Promise<void> => {
    const commune = await this.service.createCommune(req.body);
    const response: ApiResponse<typeof commune> = {
      success: true,
      message: `Thêm ${commune.name} thành công`,
      data: commune,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  createHamlet = async (req: Request, res: Response): Promise<void> => {
    const hamlet = await this.service.createHamlet(req.body);
    const response: ApiResponse<typeof hamlet> = {
      success: true,
      message: `Đã thêm "${hamlet.name}" vào danh mục địa bàn`,
      data: hamlet,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  updateHamlet = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.updateHamlet(id, req.body);
    const response: ApiResponse<typeof updated> = {
      success: true,
      message: `Cập nhật "${updated.name}" thành công`,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  deleteHamlet = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const result = await this.service.deleteHamlet(id);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: `Đã xóa "${result.deletedName}" khỏi danh mục địa bàn`,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  deleteCommune = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const result = await this.service.deleteCommune(id);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: `Đã xóa "${result.deletedName}" khỏi danh mục địa bàn`,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  // ==========================================
  // AREA GROUP CONTROLLER
  // ==========================================
  getAreaGroups = async (req: Request, res: Response): Promise<void> => {
    const groups = await this.service.getAreaGroups();
    const response: ApiResponse<typeof groups> = {
      success: true,
      message: 'Lấy danh sách nhóm địa bàn thành công',
      data: groups,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  createAreaGroup = async (req: Request, res: Response): Promise<void> => {
    const group = await this.service.createAreaGroup(req.body);
    const response: ApiResponse<typeof group> = {
      success: true,
      message: `Tạo nhóm "${group.name}" thành công`,
      data: group,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  updateAreaGroup = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.updateAreaGroup(id, req.body);
    const response: ApiResponse<typeof updated> = {
      success: true,
      message: `Cập nhật nhóm "${updated.name}" thành công`,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  deleteAreaGroup = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const result = await this.service.deleteAreaGroup(id);
    const response: ApiResponse<typeof result> = {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const areaController = new AreaController();

