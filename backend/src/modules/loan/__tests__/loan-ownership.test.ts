import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoanService } from '../loan.service';
import { MemberService } from '../../member/member.service';
import { UserRole } from '@prisma/client';
import { AuthUserResponse } from '../../auth/auth.types';
import { AppError } from '../../../shared/errors/app-error';

describe('Officer Data Ownership & Permission Isolation', () => {
  const adminUser: AuthUserResponse = {
    id: 'admin_id_01',
    username: 'admin',
    role: UserRole.ADMIN,
    fullName: 'Quản trị viên',
    status: 'ACTIVE' as any,
    permissions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const officerA: AuthUserResponse = {
    id: 'officer_a_01',
    username: 'canbo_a',
    role: UserRole.CREDIT_OFFICER,
    fullName: 'Cán bộ A',
    status: 'ACTIVE' as any,
    permissions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const officerB: AuthUserResponse = {
    id: 'officer_b_02',
    username: 'canbo_b',
    role: UserRole.CREDIT_OFFICER,
    fullName: 'Cán bộ B',
    status: 'ACTIVE' as any,
    permissions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('LoanService ownership', () => {
    let mockLoanRepo: any;
    let mockMemberRepo: any;
    let service: LoanService;

    beforeEach(() => {
      mockLoanRepo = {
        findById: vi.fn(),
        findMany: vi.fn().mockResolvedValue({ loans: [], total: 0 }),
        update: vi.fn(),
        updateStatus: vi.fn(),
        softDelete: vi.fn(),
      };
      mockMemberRepo = {
        findById: vi.fn(),
      };
      service = new LoanService(mockLoanRepo as any, mockMemberRepo as any);
    });

    it('Cán bộ A có thể truy cập hồ sơ vay do chính mình tạo', async () => {
      mockLoanRepo.findById.mockResolvedValue({
        id: 'loan_1',
        createdById: 'officer_a_01',
        loanStartDate: new Date(),
        status: 'DA_GIAI_NGAN',
      });

      const result = await service.getById('loan_1', officerA);
      expect(result.id).toBe('loan_1');
    });

    it('Admin có thể truy cập hồ sơ vay của bất kỳ cán bộ nào', async () => {
      mockLoanRepo.findById.mockResolvedValue({
        id: 'loan_1',
        createdById: 'officer_a_01',
        loanStartDate: new Date(),
        status: 'DA_GIAI_NGAN',
      });

      const result = await service.getById('loan_1', adminUser);
      expect(result.id).toBe('loan_1');
    });

    it('Cán bộ B bị từ chối truy cập (403 Forbidden) vào hồ sơ vay do Cán bộ A tạo', async () => {
      mockLoanRepo.findById.mockResolvedValue({
        id: 'loan_1',
        createdById: 'officer_a_01',
        loanStartDate: new Date(),
        status: 'DA_GIAI_NGAN',
      });

      await expect(service.getById('loan_1', officerB)).rejects.toThrow(
        'Bạn không có quyền truy cập hồ sơ vay này (hồ sơ do cán bộ khác tạo)'
      );
    });

    it('Khi Cán bộ A lấy danh sách khoản vay, bộ lọc createdById tự động ép theo ID của Cán bộ A', async () => {
      await service.findMany({ page: 1, limit: 10 }, officerA);

      expect(mockLoanRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: 'officer_a_01',
        })
      );
    });

    it('Khi Admin lấy danh sách khoản vay, không bị ép createdById', async () => {
      await service.findMany({ page: 1, limit: 10 }, adminUser);

      expect(mockLoanRepo.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          createdById: expect.anything(),
        })
      );
    });
  });

  describe('MemberService ownership', () => {
    let mockMemberRepo: any;
    let service: MemberService;

    beforeEach(() => {
      mockMemberRepo = {
        findById: vi.fn(),
        findByMemberCode: vi.fn(),
        findMany: vi.fn().mockResolvedValue({ members: [], total: 0 }),
      };
      service = new MemberService(mockMemberRepo as any);
    });

    it('Cán bộ A có thể truy cập thành viên do chính mình tạo', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 'member_1',
        createdById: 'officer_a_01',
        fullName: 'Nguyễn Văn A',
      });

      const result = await service.getById('member_1', officerA);
      expect(result.id).toBe('member_1');
    });

    it('Cán bộ B bị chặn 403 Forbidden khi xem thành viên do Cán bộ A tạo', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 'member_1',
        createdById: 'officer_a_01',
        fullName: 'Nguyễn Văn A',
      });

      await expect(service.getById('member_1', officerB)).rejects.toThrow(
        'Bạn không có quyền truy cập hồ sơ thành viên này'
      );
    });

    it('Admin có thể truy cập thành viên của bất kỳ ai', async () => {
      mockMemberRepo.findById.mockResolvedValue({
        id: 'member_1',
        createdById: 'officer_a_01',
        fullName: 'Nguyễn Văn A',
      });

      const result = await service.getById('member_1', adminUser);
      expect(result.id).toBe('member_1');
    });

    it('Khi Cán bộ A xem danh sách thành viên, tự động lọc theo createdById của Cán bộ A', async () => {
      await service.findMany({ page: 1, limit: 10 }, officerA);

      expect(mockMemberRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: 'officer_a_01',
        })
      );
    });
  });
});

