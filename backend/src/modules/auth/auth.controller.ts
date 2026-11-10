import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: result,
    });
  }

  public async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công',
    });
  }

  public async getMe(req: Request, res: Response): Promise<void> {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  }

  public async changePassword(req: Request, res: Response): Promise<void> {
    const result = await authService.changePassword(req.user!.id, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  public async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await authService.getProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  }

  public async updateProfile(req: Request, res: Response): Promise<void> {
    const profile = await authService.updateProfile(req.user!.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ cá nhân thành công',
      data: profile,
    });
  }
}

export const authController = new AuthController();

