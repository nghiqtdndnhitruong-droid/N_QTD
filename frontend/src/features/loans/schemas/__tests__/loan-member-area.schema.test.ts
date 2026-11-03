import { describe, expect, it } from 'vitest';
import {
  CollateralAssetType,
  CollateralOwnerType,
  Gender,
  IdDocumentType,
  ValuationMethod,
} from '@/shared/types';
import { memberFormSchema } from '@/features/members/schemas/member.schema';
import { collateralFormSchema } from '../loan.schema';

describe('Schema kiểm tra Địa bàn (Tỉnh -> Xã -> Ấp) và Mã tài sản thế chấp', () => {
  it('chấp nhận hồ sơ thành viên có đầy đủ Tỉnh -> Xã -> Ấp hợp lệ', () => {
    const parsed = memberFormSchema.safeParse({
      memberCode: 'TV-2026-099',
      fullName: 'Thạch Thị Sóc',
      yearOfBirth: 1985,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084185001234',
      idIssueDate: '2022-05-10',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: '2045-05-10',
      gender: Gender.NU,
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      hamletId: '65f000000000000000000003',
      addressDetail: 'Tổ 4',
      address: 'Tổ 4, Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
    });
    expect(parsed.success).toBe(true);
  });

  it('chấp nhận hồ sơ thành viên khi bỏ trống Ấp (hamletId) theo nghiệp vụ mới (Mục 3.6)', () => {
    const parsed = memberFormSchema.safeParse({
      memberCode: 'TV-2026-099',
      fullName: 'Thạch Thị Sóc',
      yearOfBirth: 1985,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084185001234',
      idIssueDate: '2022-05-10',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: '',
      gender: Gender.NU,
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      hamletId: '',
      addressDetail: '',
      address: '',
    });
    expect(parsed.success).toBe(true);
  });

  it('cho phép để trống Mã thành viên (tự động là thành viên mới)', () => {
    const parsed = memberFormSchema.safeParse({
      memberCode: '',
      fullName: 'Nguyễn Văn Mới',
      yearOfBirth: 1990,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084190001234',
      idIssueDate: '2022-05-10',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: '',
      gender: Gender.NAM,
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      address: 'Xã Nhị Trường, Tỉnh Vĩnh Long',
    });
    expect(parsed.success).toBe(true);
  });

  it('cho phép nhập Mã thành viên hợp lệ (từ 2 ký tự trở lên)', () => {
    const parsed = memberFormSchema.safeParse({
      memberCode: 'TV-2026-001',
      fullName: 'Nguyễn Văn Cũ',
      yearOfBirth: 1990,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084190001234',
      idIssueDate: '2022-05-10',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: '',
      gender: Gender.NAM,
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      address: 'Xã Nhị Trường, Tỉnh Vĩnh Long',
    });
    expect(parsed.success).toBe(true);
  });

  it('từ chối khi nhập Mã thành viên có độ dài dưới 2 ký tự', () => {
    const parsed = memberFormSchema.safeParse({
      memberCode: 'A',
      fullName: 'Nguyễn Văn Test',
      yearOfBirth: 1990,
      idType: IdDocumentType.CAN_CUOC_CONG_DAN,
      idNumber: '084190001234',
      idIssueDate: '2022-05-10',
      idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
      idExpiry: '',
      gender: Gender.NAM,
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      address: 'Xã Nhị Trường, Tỉnh Vĩnh Long',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain('Mã thành viên tối thiểu 2 ký tự');
    }
  });

  it('bắt buộc nhập Mã tài sản (assetCode) và Địa bàn tài sản (Tỉnh -> Xã -> Ấp) độc lập', () => {
    const parsed = collateralFormSchema.safeParse({
      assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
      assetCode: 'TS-2026-0001',
      certificateNumber: 'CS 098123',
      sheetNumber: '12',
      plotNumber: '405',
      area: 1200,
      origin: 'Nhà nước công nhận QSDĐ',
      usagePurpose: 'Đất chuyên trồng lúa nước',
      usageDuration: 'Đến năm 2070',
      useRestrictions: 'Không',
      issuePlace: 'Sở TN&MT Tỉnh Vĩnh Long',
      issueDate: '2021-04-15',
      provinceId: '65f000000000000000000001',
      communeId: '65f000000000000000000002',
      hamletId: '65f000000000000000000003',
      addressDetail: 'Cánh đồng ấp Nô Lựa',
      address: 'Cánh đồng ấp Nô Lựa, Ấp Nô Lựa, Xã Nhị Trường, Tỉnh Vĩnh Long',
      valuationAmount: 300_000_000,
      valuationMethod: ValuationMethod.BANG_GIA_QUY,
      ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
      thirdPartyInfo: null,
    });
    expect(parsed.success).toBe(true);
  });
});
