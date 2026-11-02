import { Request, Response } from 'express';
import { relatedPersonService } from './related-person.service';
import { ApiResponse } from '../../shared/types';
import { RelatedPerson } from '@prisma/client';

export class RelatedPersonController {
  create = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await relatedPersonService.create(loanId, req.body);
    const response: ApiResponse<RelatedPerson> = {
      success: true,
      message: 'Thêm thông tin người liên quan thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  };

  findByLoanId = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const result = await relatedPersonService.findByLoanId(loanId);
    const response: ApiResponse<RelatedPerson[]> = {
      success: true,
      message: 'Lấy danh sách người liên quan thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    const result = await relatedPersonService.getById(loanId, id);
    const response: ApiResponse<RelatedPerson> = {
      success: true,
      message: 'Lấy thông tin người liên quan thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    const result = await relatedPersonService.update(loanId, id, req.body);
    const response: ApiResponse<RelatedPerson> = {
      success: true,
      message: 'Cập nhật thông tin người liên quan thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const loanId = String(req.params.loanId);
    const id = String(req.params.id);
    const { reason } = req.body || {};
    const result = await relatedPersonService.delete(loanId, id, reason);
    const response: ApiResponse<RelatedPerson> = {
      success: true,
      message: 'Xóa người liên quan thành công',
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  };
}

export const relatedPersonController = new RelatedPersonController();
