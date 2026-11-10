import bcrypt from 'bcryptjs';
import { UserRole, AccountStatus } from '@prisma/client';
import { AppError } from '../../shared/errors';
import { userRepository } from './user.repository';
import { CreateUserInput, UpdateUserInput, ResetPasswordInput } from './user.validator';
import { authService } from '../auth/auth.service';
import { AuthUserResponse } from '../auth/auth.types';

export class UserService {
  public async getUsers(params: {
    search?: string;
    status?: AccountStatus;
    page?: number;
    limit?: number;
  }): Promise<{ users: AuthUserResponse[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));

    const { users, total } = await userRepository.findMany({
      search: params.search,
      status: params.status,
      page,
      limit,
    });

    return {
      users: users.map((u) => authService.formatAuthUser(u)),
      total,
      page,
      limit,
    };
  }

  public async getUserById(
    id: string,
    currentUserId: string,
    currentRole: UserRole
  ): Promise<AuthUserResponse> {
    // Chống ID Tampering: Nếu không phải ADMIN, chỉ được xem ID của chính mình
    if (currentRole !== UserRole.ADMIN && id !== currentUserId) {
      throw AppError.forbidden('Bạn không có quyền truy cập hồ sơ của người dùng khác');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('Không tìm thấy tài khoản người dùng');
    }

    return authService.formatAuthUser(user);
  }

  public async createUser(input: CreateUserInput): Promise<AuthUserResponse> {
    const existing = await userRepository.findByUsername(input.username);
    if (existing) {
      throw AppError.conflict('Tên đăng nhập đã tồn tại trên hệ thống. Vui lòng chọn tên khác.');
    }

    const passwordHash = bcrypt.hashSync(input.password, 10);

    // Mọi tài khoản tạo mới đều là CREDIT_OFFICER, không cho phép tạo thêm ADMIN
    const newUser = await userRepository.create({
      username: input.username,
      passwordHash,
      role: UserRole.CREDIT_OFFICER,
      profile: input,
    });

    return authService.formatAuthUser(newUser);
  }

  public async updateUser(
    id: string,
    input: UpdateUserInput,
    currentUserId: string,
    currentRole: UserRole
  ): Promise<AuthUserResponse> {
    if (currentRole !== UserRole.ADMIN && id !== currentUserId) {
      throw AppError.forbidden('Bạn không có quyền cập nhật hồ sơ của người dùng khác');
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('Không tìm thấy tài khoản người dùng');
    }

    // Không cho phép cán bộ thường thay đổi trạng thái (khóa/mở khóa)
    if (currentRole !== UserRole.ADMIN && input.status !== undefined) {
      delete input.status;
    }

    // Không cho phép khóa tài khoản Admin
    if (user.role === UserRole.ADMIN && input.status === AccountStatus.LOCKED) {
      throw AppError.badRequest('Không thể khóa tài khoản Quản trị hệ thống');
    }

    const updated = await userRepository.update(id, input);
    return authService.formatAuthUser(updated);
  }

  public async updateStatus(id: string, status: AccountStatus): Promise<AuthUserResponse> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('Không tìm thấy tài khoản người dùng');
    }

    if (user.role === UserRole.ADMIN) {
      throw AppError.badRequest('Không thể thay đổi trạng thái khóa của tài khoản Quản trị hệ thống');
    }

    await userRepository.updateStatus(id, status);
    const updated = await userRepository.findById(id);
    return authService.formatAuthUser(updated!);
  }

  public async resetPassword(id: string, input: ResetPasswordInput): Promise<{ message: string }> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('Không tìm thấy tài khoản người dùng');
    }

    const passwordHash = bcrypt.hashSync(input.newPassword, 10);
    await userRepository.updatePassword(id, passwordHash);

    return { message: `Đã đặt lại mật khẩu thành công cho tài khoản ${user.username}` };
  }
}

export const userService = new UserService();

