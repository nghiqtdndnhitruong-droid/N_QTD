import { Request, Response } from 'express';
import { userService } from './user.service';

export class UserController {
  public async getUsers(req: Request, res: Response): Promise<void> {
    const { search, status, page, limit } = req.query;
    const result = await userService.getUsers({
      search: search as string,
      status: status as any,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  }

  public async getUserById(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserById(
      String(req.params.id),
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản cán bộ thành công',
      data: user,
    });
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    const user = await userService.updateUser(
      String(req.params.id),
      req.body,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      data: user,
    });
  }

  public async updateStatus(req: Request, res: Response): Promise<void> {
    const user = await userService.updateStatus(String(req.params.id), req.body.status);
    const statusMsg = req.body.status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';

    res.status(200).json({
      success: true,
      message: statusMsg,
      data: user,
    });
  }

  public async resetPassword(req: Request, res: Response): Promise<void> {
    const result = await userService.resetPassword(String(req.params.id), req.body);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}

export const userController = new UserController();
