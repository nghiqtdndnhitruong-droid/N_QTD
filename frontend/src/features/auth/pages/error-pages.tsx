import { Link } from 'react-router';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-700">
        Mã lỗi 403
      </p>
      <h1 className="mt-1 text-lg font-bold text-slate-900">
        Bạn không có quyền truy cập chức năng này
      </h1>
      <p className="mt-1.5 max-w-md text-xs text-slate-600">
        Tài khoản hiện tại không được cấp quyền cho màn hình hoặc thao tác này. Vui lòng liên hệ
        Quản trị viên hệ thống nếu bạn cần được phân quyền bổ sung.
      </p>
      <Link to="/" className="mt-5">
        <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Quay về Tổng quan
        </Button>
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Mã lỗi 404</p>
      <h1 className="mt-1 text-lg font-bold text-slate-900">Không tìm thấy trang yêu cầu</h1>
      <p className="mt-1.5 max-w-md text-xs text-slate-600">
        Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển.
      </p>
      <Link to="/" className="mt-5">
        <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Về trang Tổng quan
        </Button>
      </Link>
    </div>
  );
}

