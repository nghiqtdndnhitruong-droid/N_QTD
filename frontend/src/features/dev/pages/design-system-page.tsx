import { useState } from 'react';
import { LoanStatus } from '@/shared/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoanStatusBadge,
} from '@/components/ui';
import {
  CurrencyInput,
  DateInput,
  TextInput,
} from '@/components/form';
import {
  Alert,
  ConfirmDialog,
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from '@/components/feedback';
import { PageHeader } from '@/components/layout';

/**
 * Trang kiểm tra trực quan toàn bộ Design System (chỉ mở ở chế độ DEV: /dev/ui).
 */
export function DesignSystemPage() {
  const [amount, setAmount] = useState<number | null>(150_000_000);
  const [date, setDate] = useState<string>('2026-11-01');
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design System & UI Showcase (DEV)"
        badge={<Badge tone="primary">Giai đoạn 1</Badge>}
        description="Trang kiểm tra trực quan hệ màu Navy, các trạng thái trường nhập liệu, định dạng số tiền VNĐ bằng chữ và thông báo."
      />

      {/* 1. Các trạng thái của trường nhập liệu */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>1. Các trạng thái trường nhập liệu (Input States)</CardTitle>
            <CardDescription>
              Default · Hover · Focus · Error · Valid Indicator · Loading · Disabled · Read-only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextInput
            label="Trạng thái Mặc định & Bắt buộc"
            required
            placeholder="Nhấn vào để xem hiệu ứng Focus"
            hint="Viền đổi sang Navy kèm vòng sáng nhẹ"
          />
          <TextInput
            label="Trạng thái Nhập sai (Error)"
            required
            defaultValue="079205"
            error="Số CCCD phải gồm đúng 12 chữ số"
          />
          <TextInput
            label="Trạng thái Đang kiểm tra (Loading)"
            defaultValue="TV-2026-001"
            isLoading
            hint="Đang kiểm tra trùng mã trên máy chủ..."
          />
          <TextInput
            label="Trạng thái Hợp lệ (Valid Lookup)"
            defaultValue="TV-2026-001"
            isValidIndicator
            hint="Mã thành viên hợp lệ"
          />
          <TextInput
            label="Trạng thái Vô hiệu hóa (Disabled)"
            disabled
            defaultValue="Không cho phép chỉnh sửa"
          />
          <TextInput
            label="Trạng thái Chỉ đọc (Read-only)"
            readOnly
            defaultValue="9,6 %/năm (chốt tự động)"
          />
          <CurrencyInput
            label="Trường nhập Số tiền VNĐ"
            required
            value={amount}
            onValueChange={setAmount}
          />
          <DateInput
            label="Trường Ngày tháng (Gõ tay + Lịch)"
            required
            value={date}
            onValueChange={setDate}
          />
        </CardContent>
      </Card>

      {/* 2. Buttons & Badges */}
      <Card>
        <CardHeader>
          <CardTitle>2. Hệ thống Nút bấm & Huy hiệu Trạng thái Khoản vay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="primary" isLoading loadingText="Đang xử lý...">
              Loading
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <LoanStatusBadge status={LoanStatus.DANG_TAO} />
            <LoanStatusBadge status={LoanStatus.DA_HOAN_THANH_HO_SO} />
            <LoanStatusBadge status={LoanStatus.DA_GIAI_NGAN} />
            <LoanStatusBadge status={LoanStatus.QUA_HAN} />
            <LoanStatusBadge status={LoanStatus.DA_TAT_TOAN} />
          </div>
        </CardContent>
      </Card>

      {/* 3. Alerts, Toasts & ConfirmDialog */}
      <Card>
        <CardHeader>
          <CardTitle>3. Hệ thống Thông báo (Toast, Alert & Xác nhận thao tác)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => notifySuccess('Đã lưu hồ sơ thành công', 'Mã khế ước: KU-2026-001')}
            >
              Thử Toast Thành công
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                notifyError(
                  'Vượt hạn mức vay tín chấp tối đa (100.000.000 ₫)',
                  'Hướng xử lý: Giảm số tiền vay hoặc chuyển sang hình thức vay thế chấp.',
                )
              }
            >
              Thử Toast Thất bại
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                notifyWarning('Khoản vay sắp đáo hạn sau 5 ngày', 'Vui lòng thông báo cho thành viên')
              }
            >
              Thử Toast Cảnh báo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => notifyInfo('Đang đồng bộ bảng lãi suất mới nhất')}
            >
              Thử Toast Thông tin
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
              Mở Hộp thoại Xác nhận
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Alert tone="info" title="Thông tin hướng dẫn nghiệp vụ">
              Lãi suất khoản vay được tự động khóa tại thời điểm tạo hồ sơ.
            </Alert>
            <Alert tone="warning" title="Cảnh báo thao tác có rủi ro">
              Tỷ lệ cho vay hiện đạt 68% giá trị định giá tài sản thế chấp.
            </Alert>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận thực hiện thao tác quan trọng?"
        description="Hộp thoại này ngăn ngừa việc bấm nhầm vào các thao tác xóa hoặc ghi nhận giao dịch tài chính."
        confirmText="Đồng ý thực hiện"
        tone="danger"
        onConfirm={() => {
          setConfirmOpen(false);
          notifySuccess('Đã xác nhận thao tác');
        }}
      />
    </div>
  );
}

