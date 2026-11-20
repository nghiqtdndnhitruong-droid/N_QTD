import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { Gender, IdDocumentType, UserRole } from '@prisma/client';
import { memberRepository } from './member.repository';
import { MemberFilterQuery } from './member.types';
import { AuthUserResponse } from '../auth/auth.types';

const GENDER_TEXT: Record<Gender, string> = {
  NAM: 'Nam',
  NU: 'Nữ',
};

const ID_TYPE_TEXT: Record<IdDocumentType, string> = {
  CAN_CUOC_CONG_DAN: 'Căn cước công dân',
  CAN_CUOC: 'Thẻ Căn cước',
};

export async function exportMembersExcel(
  query: MemberFilterQuery,
  currentUser?: AuthUserResponse,
): Promise<{ buffer: Buffer; fileName: string }> {
  const effectiveQuery: MemberFilterQuery = {
    ...query,
    page: 1,
    limit: 5000,
  };

  if (currentUser && currentUser.role === UserRole.CREDIT_OFFICER) {
    effectiveQuery.createdById = currentUser.id;
  }

  const members = [];
  let page = 1;
  while (true) {
    const { members: batch, total } = await memberRepository.findMany({
      ...effectiveQuery,
      page,
      limit: 100,
    });
    members.push(...batch);
    if (members.length >= total || batch.length === 0) break;
    page++;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quỹ Tín Dụng Nhân Dân';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Danh sách thành viên', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // Tiêu đề
  sheet.mergeCells('A1:P1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DANH SÁCH THÀNH VIÊN QUỸ TÍN DỤNG NHÂN DÂN';
  titleCell.font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF0B1F3A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:P2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')} · Tổng số thành viên: ${members.length}`;
  subCell.font = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 8;

  const headers = [
    'STT',
    'Mã thành viên',
    'Họ và tên',
    'Năm sinh',
    'Giới tính',
    'Số điện thoại',
    'Loại giấy tờ',
    'Số CCCD',
    'Ngày cấp',
    'Nơi cấp',
    'Ngày hết hạn',
    'Ấp / Khu phố',
    'Xã quản lý',
    'Tỉnh / Thành phố',
    'Địa chỉ thường trú đầy đủ',
    'Xếp hạng tín nhiệm',
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4E89' },
    };
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  members.forEach((m, idx) => {
    const rating = (m as any).creditRating as
      | { rank: string; totalScore: number; riskLevel: string }
      | null
      | undefined;
    const ratingText = rating
      ? `Hạng ${rating.rank} (${rating.totalScore}đ - ${rating.riskLevel})`
      : 'Chưa chấm';

    const row = sheet.addRow([
      idx + 1,
      m.memberCode || 'Chưa cấp mã',
      m.fullName,
      m.yearOfBirth,
      GENDER_TEXT[m.gender] ?? m.gender,
      m.phoneNumber || '',
      ID_TYPE_TEXT[m.idType] ?? m.idType,
      m.idNumber,
      m.idIssueDate ? dayjs(m.idIssueDate).format('DD/MM/YYYY') : '',
      m.idIssuePlace || '',
      m.idExpiry ? dayjs(m.idExpiry).format('DD/MM/YYYY') : 'Không thời hạn',
      m.hamletName || '',
      m.communeName || '',
      m.provinceName || '',
      m.address || '',
      ratingText,
    ]);

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Times New Roman', size: 11 };
      cell.border = thinBorder;

      if ([1, 2, 4, 5, 6, 8, 9, 11].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });
  });

  const colWidths = [6, 15, 24, 11, 10, 15, 20, 16, 13, 28, 15, 18, 18, 18, 36, 28];
  colWidths.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `Danh_sach_thanh_vien_${dayjs().format('YYYYMMDD')}.xlsx`;
  return { buffer, fileName };
}
