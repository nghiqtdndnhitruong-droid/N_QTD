import { Request, Response } from 'express';
import { MemberService, memberService } from './member.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { DeleteMemberResult, MemberEntity, MemberFilterQuery } from './member.types';

export class MemberController {
  constructor(private readonly service: MemberService = memberService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.create(req.body);
    const response: ApiResponse<MemberEntity> = {
      success: true,
      message: 'Tạo hồ sơ thành viên thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const result = await this.service.getById(id);
    const response: ApiResponse<MemberEntity> = {
      success: true,
      message: 'Lấy thông tin thành viên thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  findMany = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as MemberFilterQuery;
    const { members, pagination } = await this.service.findMany(query);
    const response: PaginatedResponse<MemberEntity> = {
      success: true,
      message: 'Lấy danh sách thành viên thành công',
      data: members,
      pagination,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.update(id, req.body);
    const response: ApiResponse<MemberEntity> = {
      success: true,
      message: 'Cập nhật hồ sơ thành viên thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const reason = req.body?.reason ? String(req.body.reason) : undefined;
    const result = await this.service.delete(id, reason);
    const codeDisplay = result.memberCode ? ` (${result.memberCode})` : '';
    const response: ApiResponse<DeleteMemberResult> = {
      success: true,
      message:
        result.deleteMode === 'SOFT_DELETE'
          ? `Đã vô hiệu hóa (xóa mềm) thành viên ${result.fullName} để bảo toàn lịch sử tín dụng`
          : `Đã xóa thành viên ${result.fullName}${codeDisplay} thành công`,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const memberController = new MemberController();
