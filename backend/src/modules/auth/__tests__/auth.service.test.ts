import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { authService } from '../auth.service';
import { userService } from '../../user/user.service';
import { prisma } from '../../../config';
import { UserRole, AccountStatus, IdDocumentType, Gender } from '@prisma/client';

describe('Auth & User Management Service Tests', () => {
  it('1. Admin mặc định được khởi tạo an toàn và không bị ghi đè', async () => {
    // Gọi seedDefaultAdmin
    await authService.seedDefaultAdmin();

    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      include: { profile: true },
    });

    expect(admin).not.toBeNull();
    expect(admin?.username).toBe('ADMIN');
    expect(admin?.role).toBe(UserRole.ADMIN);
    expect(admin?.status).toBe(AccountStatus.ACTIVE);
    expect(admin?.profile?.fullName).toBe('Quản trị hệ thống');

    // Kiểm tra mật khẩu băm đúng với mật khẩu khởi tạo
    const isPassValid = bcrypt.compareSync('0258963Tn', admin!.passwordHash);
    expect(isPassValid).toBe(true);

    // Gọi lại seed lần nữa để chứng minh không ghi đè
    await authService.seedDefaultAdmin();
    const countAdmins = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    expect(countAdmins).toBe(1);
  });

  it('2. Đăng nhập thành công với tài khoản ADMIN', async () => {
    const res = await authService.login({
      username: 'ADMIN',
      password: '0258963Tn',
    });

    expect(res.accessToken).toBeDefined();
    expect(res.user.username).toBe('ADMIN');
    expect(res.user.role).toBe(UserRole.ADMIN);
    expect(res.user.roles).toContain(UserRole.ADMIN);
    expect(res.user.permissions).toContain('user:manage');
  });

  it('3. Đăng nhập thất bại trả về thông báo chung, không tiết lộ tài khoản tồn tại', async () => {
    // Sai mật khẩu
    await expect(
      authService.login({
        username: 'ADMIN',
        password: 'WrongPassword123',
      })
    ).rejects.toThrow('Tên đăng nhập hoặc mật khẩu không chính xác');

    // Không tồn tại user
    await expect(
      authService.login({
        username: 'non_existent_user_9999',
        password: 'SomePassword123',
      })
    ).rejects.toThrow('Tên đăng nhập hoặc mật khẩu không chính xác');
  });

  it('4. Tạo tài khoản Cán bộ tín dụng và kiểm tra không cho phép tạo thêm Admin', async () => {
    const testUsername = `cbtd_test_${Date.now()}`;
    const newOfficer = await userService.createUser({
      username: testUsername,
      password: 'Password@123',
      fullName: 'Trần Văn Cán Bộ',
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084090001234',
      idIssueDate: '2022-01-15',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      yearOfBirth: 1990,
      gender: Gender.NAM,
    });

    expect(newOfficer.username).toBe(testUsername);
    expect(newOfficer.role).toBe(UserRole.CREDIT_OFFICER);
    expect(newOfficer.roles).toContain(UserRole.CREDIT_OFFICER);
    expect(newOfficer.profile?.fullName).toBe('Trần Văn Cán Bộ');
    expect(newOfficer.profile?.idNumber).toBe('084090001234');

    // Không cho phép trùng tên đăng nhập
    await expect(
      userService.createUser({
        username: testUsername,
        password: 'Password@123',
        fullName: 'Trùng Tên',
        idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      })
    ).rejects.toThrow('Tên đăng nhập đã tồn tại');

    // Khóa tài khoản
    await userService.updateStatus(newOfficer.id, AccountStatus.LOCKED);

    // Đăng nhập khi bị khóa phải bị từ chối
    await expect(
      authService.login({
        username: testUsername,
        password: 'Password@123',
      })
    ).rejects.toThrow('Tài khoản đã bị khóa');

    // Mở khóa lại
    await userService.updateStatus(newOfficer.id, AccountStatus.ACTIVE);
    const loginRes = await authService.login({
      username: testUsername,
      password: 'Password@123',
    });
    expect(loginRes.accessToken).toBeDefined();

    // Dọn dẹp tài khoản test
    await prisma.user.delete({ where: { id: newOfficer.id } });
  });

  it('5. Cán bộ cập nhật Profile của chính mình với 7 trường thông tin', async () => {
    const testUsername = `cbtd_profile_${Date.now()}`;
    const officer = await userService.createUser({
      username: testUsername,
      password: 'Password@123',
      fullName: 'Nguyễn Thị B',
      idType: IdDocumentType.CAN_CUOC,
      gender: Gender.NU,
    });

    const updatedProfile = await authService.updateProfile(officer.id, {
      fullName: 'Nguyễn Thị Hoa',
      idType: IdDocumentType.CAN_CUOC,
      idNumber: '084192005678',
      idIssueDate: '2023-05-20',
      idIssuePlace: 'Bộ Công An',
      yearOfBirth: 1992,
      gender: Gender.NU,
    });

    expect(updatedProfile.fullName).toBe('Nguyễn Thị Hoa');
    expect(updatedProfile.idType).toBe(IdDocumentType.CAN_CUOC);
    expect(updatedProfile.idNumber).toBe('084192005678');
    expect(updatedProfile.idIssueDate).toBe('2023-05-20');
    expect(updatedProfile.idIssuePlace).toBe('Bộ Công An');
    expect(updatedProfile.yearOfBirth).toBe(1992);
    expect(updatedProfile.gender).toBe(Gender.NU);

    // Dọn dẹp
    await prisma.user.delete({ where: { id: officer.id } });
  });

  it('6. Không thể khóa tài khoản Admin', async () => {
    const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    expect(admin).not.toBeNull();

    await expect(
      userService.updateStatus(admin!.id, AccountStatus.LOCKED)
    ).rejects.toThrow('Không thể thay đổi trạng thái khóa của tài khoản Quản trị hệ thống');
  });
});

