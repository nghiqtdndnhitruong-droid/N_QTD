import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, logger } from '../../config';
import { AppError } from '../../shared/errors';
import { authRepository } from './auth.repository';
import {
  AuthUserResponse,
  LoginResult,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  TokenPayload,
  UserProfileData,
} from './auth.types';
import { ChangePasswordInput, LoginInput, UpdateProfileInput } from './auth.validator';
import { User, UserProfile, UserRole } from '@prisma/client';

export class AuthService {
  /**
   * Khởi tạo tài khoản Quản trị viên (Admin) mặc định nếu chưa tồn tại.
   * Tuyệt đối không ghi đè nếu tài khoản đã tồn tại.
   */
  public async seedDefaultAdmin(): Promise<void> {
    const existingAdminCount = await authRepository.countAdmins();
    if (existingAdminCount > 0) {
      logger.info('Tài khoản Admin đã tồn tại trong hệ thống. Bỏ qua khởi tạo.');
      return;
    }

    const defaultAdminUsername = 'ADMIN';
    const defaultAdminPassword = '0258963Tn';
    const passwordHash = bcrypt.hashSync(defaultAdminPassword, 10);

    await authRepository.createAdmin({
      username: defaultAdminUsername,
      passwordHash,
      fullName: 'Quản trị hệ thống',
    });

    logger.info(`Đã khởi tạo tài khoản Admin mặc định thành công: [${defaultAdminUsername}]`);
  }

  /**
   * Đăng nhập hệ thống.
   * Bảo mật: Không tiết lộ username có tồn tại hay không khi sai thông tin.
   */
  public async login(input: LoginInput): Promise<LoginResult> {
    const user = await authRepository.findByUsername(input.username);

    if (!user) {
      throw AppError.badRequest('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const isMatch = bcrypt.compareSync(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.badRequest('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    if (user.status === 'LOCKED') {
      throw AppError.forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.');
    }

    // Cập nhật mốc thời gian đăng nhập gần nhất
    await authRepository.updateLastLogin(user.id);

    // Cấp phát JWT Access Token
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.jwtSecret, {
      expiresIn: (env.jwtExpiresIn || '24h') as any,
    });

    return {
      accessToken,
      expiresIn: 86400,
      user: this.formatAuthUser(user),
    };
  }

  /**
   * Lấy thông tin tài khoản và quyền hạn hiện tại
   */
  public async getMe(userId: string): Promise<AuthUserResponse> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Phiên đăng nhập không hợp lệ hoặc người dùng không tồn tại');
    }

    if (user.status === 'LOCKED') {
      throw AppError.forbidden('Tài khoản của bạn đã bị khóa');
    }

    return this.formatAuthUser(user);
  }

  /**
   * Đổi mật khẩu cá nhân
   */
  public async changePassword(userId: string, input: ChangePasswordInput): Promise<{ message: string }> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Người dùng không tồn tại');
    }

    const isCurrentValid = bcrypt.compareSync(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw AppError.badRequest('Mật khẩu hiện tại không chính xác');
    }

    const newPasswordHash = bcrypt.hashSync(input.newPassword, 10);
    await authRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Lấy hồ sơ cá nhân của chính cán bộ đang đăng nhập
   */
  public async getProfile(userId: string): Promise<UserProfileData> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Người dùng không tồn tại');
    }

    return this.formatProfileData(user.profile, user.role);
  }

  /**
   * Cập nhật hồ sơ cá nhân của chính cán bộ đang đăng nhập
   */
  public async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileData> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Người dùng không tồn tại');
    }

    const updatedProfile = await authRepository.updateProfile(userId, input);
    return this.formatProfileData(updatedProfile, user.role);
  }

  /**
   * Chuẩn hóa dữ liệu trả về cho Client (loại bỏ passwordHash)
   */
  public formatAuthUser(user: User & { profile: UserProfile | null }): AuthUserResponse {
    const role = user.role;
    const permissions = [...ROLE_PERMISSIONS[role]];
    const title = ROLE_LABELS[role];
    const fullName = user.profile?.fullName || (role === UserRole.ADMIN ? 'Quản trị hệ thống' : user.username);

    return {
      id: user.id,
      username: user.username,
      fullName,
      title,
      roles: [role],
      role,
      status: user.status,
      permissions,
      profile: this.formatProfileData(user.profile, role),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }

  private formatProfileData(profile: UserProfile | null, role: UserRole): UserProfileData {
    return {
      fullName: profile?.fullName || (role === UserRole.ADMIN ? 'Quản trị hệ thống' : ''),
      idType: profile?.idType || 'CAN_CUOC_CONG_DAN',
      idNumber: profile?.idNumber || null,
      idIssueDate: profile?.idIssueDate ? profile.idIssueDate.toISOString().slice(0, 10) : null,
      idIssuePlace: profile?.idIssuePlace || null,
      yearOfBirth: profile?.yearOfBirth || null,
      gender: profile?.gender || 'NAM',
    };
  }
}

export const authService = new AuthService();
