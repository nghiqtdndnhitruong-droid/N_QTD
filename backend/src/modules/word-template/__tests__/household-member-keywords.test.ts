import { describe, expect, it } from 'vitest';
import { WordTemplateDataDictionaryService } from '../word-template-data-dictionary.service';
import { normalizeHouseholdMembers } from '../../collateral/collateral.service';
import { Gender, IdDocumentType, CollateralOwnerType, LoanType, CollateralAssetType } from '@prisma/client';

describe('Household Members (Thành viên hộ gia đình) Keywords & Service Tests', () => {
  const dictionaryService = new WordTemplateDataDictionaryService();

  it('nên chuẩn hóa và tự động nhận diện năm sinh, giới tính, nơi cấp từ số CCCD 12 số', () => {
    // 084: Trà Vinh, 0: Nam thế kỷ 20, 85: 1985
    const members = normalizeHouseholdMembers([
      {
        fullName: 'Nguyễn Văn Nam',
        idNumber: '084085001234',
        idType: IdDocumentType.CAN_CUOC_CONG_DAN,
        idIssueDate: '2021-05-15',
      },
      // 084: Trà Vinh, 1: Nữ thế kỷ 20, 90: 1990
      {
        fullName: 'Trần Thị Nữ',
        idNumber: '084190005678',
        idType: IdDocumentType.CAN_CUOC,
        idIssueDate: '2022-08-20',
      },
    ]);

    expect(members).toHaveLength(2);
    expect(members[0].gender).toBe(Gender.NAM);
    expect(members[0].yearOfBirth).toBe(1985);
    expect(members[0].idIssuePlace).toBe('Cục CSQLHC về TTXH');

    expect(members[1].gender).toBe(Gender.NU);
    expect(members[1].yearOfBirth).toBe(1990);
    expect(members[1].idIssuePlace).toBe('Bộ Công An');
  });

  it('nên trích xuất đầy đủ bộ từ khóa THANH_VIEN_HO.* và vòng lặp DANH_SACH_THANH_VIEN_HO khi có thành viên hộ', () => {
    const mockLoan = {
      id: 'loan-1',
      contractNumber: '15/HĐTD.NH-2026',
      contractDate: new Date('2026-05-15'),
      loanType: LoanType.THE_CHAP,
      termType: 'NGAN_HAN',
      loanAmount: 800_000_000,
      interestRate: 10.5,
      member: {
        fullName: 'Lê Văn Vay',
        gender: Gender.NAM,
        yearOfBirth: 1980,
        idNumber: '084080001111',
        idType: IdDocumentType.CAN_CUOC_CONG_DAN,
        address: 'Ấp Nô Lựa, Xã Nhị Trường',
      },
      collaterals: [
        {
          id: 'col-1',
          assetCode: 'TS-001',
          assetType: CollateralAssetType.QUYEN_SU_DUNG_DAT,
          ownerType: CollateralOwnerType.NGUOI_VAY_HO,
          sheetNumber: '05',
          plotNumber: '120',
          area: 1000,
          valuationAmount: 500_000_000,
          householdMembers: [
            {
              fullName: 'Nguyễn Văn Chồng',
              idNumber: '084082001234',
              gender: Gender.NAM,
              yearOfBirth: 1982,
              idType: IdDocumentType.CAN_CUOC_CONG_DAN,
              idIssueDate: new Date('2021-05-15'),
              idIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
              address: 'Ấp Nô Lựa, Xã Nhị Trường',
            },
            {
              fullName: 'Trần Thị Vợ',
              idNumber: '084185005678',
              gender: Gender.NU,
              yearOfBirth: 1985,
              idType: IdDocumentType.CAN_CUOC,
              idIssueDate: new Date('2022-06-20'),
              idIssuePlace: 'Bộ Công An',
              address: 'Ấp Nô Lựa, Xã Nhị Trường',
            },
          ],
        },
      ],
    };

    const { resolvedContext } = dictionaryService.resolveLoanData(mockLoan, []);

    // 1. Kiểm tra cờ logic
    expect(resolvedContext.CO_THANH_VIEN_HO).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_THANH_VIEN_HO']).toBe(true);
    expect(resolvedContext['TAI_SAN.CO_THANH_VIEN_HO']).toBe(true);

    // 2. Kiểm tra từ khóa đơn lẻ người đầu tiên
    expect(resolvedContext['THANH_VIEN_HO.HO_TEN']).toBe('Nguyễn Văn Chồng');
    expect(resolvedContext['THANH_VIEN_HO.DANH_XUNG']).toBe('Ông');
    expect(resolvedContext['THANH_VIEN_HO.GIOI_TINH']).toBe('Nam');
    expect(resolvedContext['THANH_VIEN_HO.NAM_SINH']).toBe('1982');
    expect(resolvedContext['THANH_VIEN_HO.SO_GIAY_TO']).toBe('084082001234');
    expect(resolvedContext['THANH_VIEN_HO.NGAY_CAP']).toBe('15/05/2021');
    expect(resolvedContext['THANH_VIEN_HO.NOI_CAP']).toBe('Cục Cảnh sát QLHC về TTXH');
    expect(resolvedContext['THANH_VIEN_HO.DIA_CHI']).toBe('Ấp Nô Lựa, Xã Nhị Trường');

    // 3. Kiểm tra các từ khóa gộp
    expect(resolvedContext['THANH_VIEN_HO.HO_TEN_GOP']).toBe('Nguyễn Văn Chồng; Trần Thị Vợ');
    expect(resolvedContext['THANH_VIEN_HO.SO_GIAY_TO_GOP']).toBe('084082001234; 084185005678');
    expect(resolvedContext['THANH_VIEN_HO.DANH_XUNG_HO_TEN_GOP']).toBe('Ông: Nguyễn Văn Chồng; Bà: Trần Thị Vợ');
    expect(resolvedContext['THANH_VIEN_HO.DIA_CHI_GOP']).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(resolvedContext['THANH_VIEN_HO.THONG_TIN_CHI_TIET_GOP']).toContain('Ông: Nguyễn Văn Chồng (sinh năm: 1982)');
    expect(resolvedContext['THANH_VIEN_HO.THONG_TIN_CHI_TIET_GOP']).toContain('Bà: Trần Thị Vợ (sinh năm: 1985)');
    expect(resolvedContext['THANH_VIEN_HO.THONG_TIN_CHI_TIET_GOP']).toContain('địa chỉ: Ấp Nô Lựa, Xã Nhị Trường');

    // 4. Kiểm tra vòng lặp DANH_SACH_THANH_VIEN_HO
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO).toHaveLength(2);
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[0].HO_TEN).toBe('Nguyễn Văn Chồng');
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[0].DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[0].STT).toBe(1);
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[1].HO_TEN).toBe('Trần Thị Vợ');
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[1].DIA_CHI).toBe('Ấp Nô Lựa, Xã Nhị Trường');
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[1].STT).toBe(2);
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[1].DANH_XUNG).toBe('Bà');
  });

  it('nên trích xuất từ khóa khi thành viên hộ được lưu trực tiếp ở cấp hồ sơ khoản vay (Loan level)', () => {
    const mockLoan = {
      id: 'loan-level-hm',
      contractNumber: '18/HĐTD.NH-2026',
      contractDate: new Date('2026-05-15'),
      loanType: LoanType.THE_CHAP,
      termType: 'NGAN_HAN',
      loanAmount: 500_000_000,
      member: {
        fullName: 'Trần Văn Chủ',
        gender: Gender.NAM,
      },
      householdMembers: [
        {
          fullName: 'Trần Thị Con',
          idNumber: '084198009999',
          gender: Gender.NU,
          yearOfBirth: 1998,
          idType: IdDocumentType.CAN_CUOC,
          idIssueDate: new Date('2023-01-10'),
          idIssuePlace: 'Bộ Công An',
        },
      ],
      collaterals: [
        {
          id: 'col-3',
          ownerType: CollateralOwnerType.NGUOI_VAY_HO,
        },
      ],
    };

    const { resolvedContext } = dictionaryService.resolveLoanData(mockLoan, []);

    expect(resolvedContext.CO_THANH_VIEN_HO).toBe(true);
    expect(resolvedContext['KHOAN_VAY.CO_THANH_VIEN_HO']).toBe(true);
    expect(resolvedContext['THANH_VIEN_HO.HO_TEN']).toBe('Trần Thị Con');
    expect(resolvedContext['THANH_VIEN_HO.DANH_XUNG']).toBe('Bà');
    expect(resolvedContext['THANH_VIEN_HO.NAM_SINH']).toBe('1998');
    expect(resolvedContext['THANH_VIEN_HO.GIOI_TINH']).toBe('Nữ');
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO).toHaveLength(1);
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO[0].HO_TEN).toBe('Trần Thị Con');
  });

  it('khi không có thành viên hộ, cờ CO_THANH_VIEN_HO phải bằng false và danh sách rỗng', () => {
    const mockLoan = {
      id: 'loan-2',
      contractNumber: '16/HĐTD.NH-2026',
      contractDate: new Date('2026-05-15'),
      loanType: LoanType.THE_CHAP,
      termType: 'NGAN_HAN',
      loanAmount: 100_000_000,
      member: {
        fullName: 'Lê Văn Vay',
      },
      collaterals: [
        {
          id: 'col-2',
          ownerType: CollateralOwnerType.NGUOI_VAY_CA_NHAN,
          householdMembers: [],
        },
      ],
    };

    const { resolvedContext } = dictionaryService.resolveLoanData(mockLoan, []);

    expect(resolvedContext.CO_THANH_VIEN_HO).toBe(false);
    expect(resolvedContext['KHOAN_VAY.CO_THANH_VIEN_HO']).toBe(false);
    expect(resolvedContext.DANH_SACH_THANH_VIEN_HO).toHaveLength(0);
    expect(resolvedContext['THANH_VIEN_HO.HO_TEN']).toBe('');
  });
});

