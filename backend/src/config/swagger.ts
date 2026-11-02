import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quỹ Tín Dụng Nhân Dân - API Documentation',
      version: '1.0.0',
      description: `
Hệ thống Quản lý Hoạt động & Nghiệp vụ Quỹ Tín Dụng Nhân Dân
- **Phân hệ**: Tín dụng & Quản lý Khoản vay (Loan Management)
- **Kiến trúc**: Clean Architecture, Domain-Driven Design (DDD)
- **Quy tắc cốt lõi**:
  - Hạn mức tín chấp tối đa: **100.000.000 VNĐ** / thành viên.
  - Tỷ lệ vay thế chấp: Tối đa **70%** tổng giá trị định giá tài sản (sổ đỏ).
  - Công thức tính lãi: Lãi = Dư nợ gốc giảm dần × Lãi suất năm × Số ngày / 365.
  - Quá hạn: Khi vượt quá **9 ngày** kể từ ngày đáo hạn mà chưa trả hết gốc.
      `,
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: 'Development Server (Localhost)',
      },
    ],
    tags: [
      { name: '1. Thành Viên (Members)', description: 'Quản lý hồ sơ thành viên Quỹ tín dụng' },
      { name: '2. Bảng Lãi Suất (Interest Rates)', description: 'Bảng lãi suất công bố theo bậc tiền vay & kỳ hạn' },
      { name: '3. Bảng Giá Đất (Asset Pricing)', description: 'Định mức đơn giá đất theo quy định của Quỹ' },
      { name: '4. Khoản Vay (Loans)', description: 'Nghiệp vụ lập, thẩm định và quản lý khoản vay' },
      { name: '5. Tài Sản Thế Chấp (Collaterals)', description: 'Quản lý giấy chứng nhận quyền sử dụng đất (sổ đỏ)' },
      { name: '6. Giải Ngân (Disbursements)', description: 'Giao dịch giải ngân vốn vay tiền mặt' },
      { name: '7. Trả Nợ & Thu Lãi (Repayments)', description: 'Thu nợ gốc, thu lãi định kỳ và tất toán' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
