import { Request, Response } from 'express';
import { MemberService, memberService } from './member.service';
import { ApiResponse, PaginatedResponse } from '../../shared/types';
import { DeleteMemberResult, MemberEntity, MemberFilterQuery } from './member.types';

export class MemberController {
  constructor(private readonly service: MemberService = memberService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const createdById = req.user?.id;
    const result = await this.service.create({
      ...req.body,
      createdById: req.body.createdById || createdById,
    });
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
    const result = await this.service.getById(id, req.user);
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
    const { members, pagination } = await this.service.findMany(query, req.user);
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
    const updated = await this.service.update(id, req.body, req.user);
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
    const result = await this.service.delete(id, reason, req.user);
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

  saveCreditRating = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const selections = (req.body?.selections ?? {}) as Record<string, string>;
    const updated = await this.service.saveCreditRating(id, selections, req.user);
    const response: ApiResponse<MemberEntity> = {
      success: true,
      message: 'Đã lưu kết quả chấm điểm xếp hạng tín dụng thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  exportCreditRatingDocx = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const selections = req.body?.selections as Record<string, string> | undefined;
    const { buffer, fileName } = await this.service.exportCreditRatingDocx(
      id,
      selections,
      req.user,
    );

    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bang_cham_diem.docx"; filename*=UTF-8''${encodedFileName}`,
    );
    res.send(buffer);
  };

  deleteCreditRating = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const updated = await this.service.deleteCreditRating(id, req.user);
    const response: ApiResponse<MemberEntity> = {
      success: true,
      message: 'Đã xóa kết quả chấm điểm xếp hạng tín dụng thành công',
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  batchSaveCreditRating = async (req: Request, res: Response): Promise<void> => {
    const memberIds = (req.body?.memberIds ?? []) as string[];
    const selections = (req.body?.selections ?? {}) as Record<string, string>;
    const updated = await this.service.batchSaveCreditRating(
      memberIds,
      selections,
      req.user,
    );
    const response: ApiResponse<MemberEntity[]> = {
      success: true,
      message: `Đã chấm điểm và lưu kết quả cho ${updated.length} khách hàng thành công`,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  batchExportCreditRatingZip = async (req: Request, res: Response): Promise<void> => {
    const memberIds = (req.body?.memberIds ?? []) as string[];
    const selections = (req.body?.selections ?? {}) as Record<string, string>;
    const { buffer, fileName } = await this.service.batchExportCreditRatingZip(
      memberIds,
      selections,
      req.user,
    );

    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bang_cham_diem_nhom.zip"; filename*=UTF-8''${encodedFileName}`,
    );
    res.send(buffer);
  };
}

export const memberController = new MemberController();
