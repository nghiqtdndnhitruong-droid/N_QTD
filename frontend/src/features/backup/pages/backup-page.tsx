import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  AlertOctagon,
  RefreshCw,
  Users,
  FileText,
  Building,
  Coins,
  FileSpreadsheet,
  Layers,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { ConfirmDialog, notifyError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { useDatabaseStats } from '@/features/reports/hooks/use-reports';
import {
  cleanDatabaseApi,
  downloadDatabaseBackupApi,
  uploadDatabaseRestoreApi,
} from '@/features/reports/api/reports.api';

export function BackupPage() {
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dbStatsQuery = useDatabaseStats();
  const dbStats = dbStatsQuery.data;

  const handleExportBackup = async () => {
    try {
      setIsExportingBackup(true);
      await downloadDatabaseBackupApi();
      notifySuccess(
        'Sao lưu thành công',
        'Toàn bộ cơ sở dữ liệu đã được xuất thành file JSON an toàn.',
      );
    } catch (err: any) {
      notifyError('Sao lưu thất bại', err?.message || 'Không thể xuất dữ liệu sao lưu.');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        notifyError('Tệp không hợp lệ', 'Vui lòng chọn tệp sao lưu có đuôi định dạng .json');
        return;
      }
      setRestoreFile(file);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreFile) return;
    try {
      setIsRestoring(true);
      const res = await uploadDatabaseRestoreApi(restoreFile);
      setConfirmRestoreOpen(false);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      notifySuccess(
        'Phục hồi dữ liệu thành công',
        res.message || 'Hệ thống đã nạp lại toàn bộ dữ liệu.',
      );
      dbStatsQuery.refetch();
    } catch (err: any) {
      notifyError('Phục hồi thất bại', err?.message || 'Có lỗi xảy ra khi đọc tệp sao lưu.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmClean = async () => {
    try {
      setIsCleaning(true);
      const res = await cleanDatabaseApi();
      setConfirmCleanOpen(false);
      notifySuccess(
        'Làm sạch CSDL thành công',
        res.message || 'Hệ thống đã làm sạch cơ sở dữ liệu, chỉ giữ lại Admin, Keyword và Mẫu Word.',
      );
      dbStatsQuery.refetch();
    } catch (err: any) {
      notifyError('Làm sạch CSDL thất bại', err?.message || 'Có lỗi xảy ra khi làm sạch cơ sở dữ liệu.');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sao lưu & Phục hồi Cơ sở Dữ liệu"
        description="Xuất toàn bộ dữ liệu hệ thống ra tệp tin JSON an toàn và nạp lại khi cần khôi phục. Chức năng bảo mật dành riêng cho Quản trị viên (ADMIN)."
      />

      {/* Thống kê hệ thống */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary-600" />
            Hiện trạng Cơ sở dữ liệu hệ thống
          </CardTitle>
          <CardDescription>
            Tổng hợp số lượng bản ghi của tất cả các danh mục và phân hệ nghiệp vụ đang được lưu trữ trong hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbStatsQuery.isLoading ? (
            <div className="py-6 text-center text-sm text-slate-500">Đang đọc dữ liệu hệ thống...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Users className="h-3 w-3 text-primary-600" />
                  Thành viên
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.members || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <FileText className="h-3 w-3 text-emerald-600" />
                  Khoản vay
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.loans || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Building className="h-3 w-3 text-amber-600" />
                  Tài sản thế chấp
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.collaterals || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Coins className="h-3 w-3 text-indigo-600" />
                  Lượt thu nợ / lãi
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.repayments || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3 text-purple-600" />
                  Biểu mẫu Word
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.wordTemplates || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-600" />
                  Ấp / Xã địa bàn
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {(dbStats?.hamlets || 0) + (dbStats?.communes || 0)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3 Cột hành động: Sao lưu (Export), Tải lên (Restore), Làm sạch CSDL (Clean) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* THẺ SAO LƯU */}
        <Card className="border-primary-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary-100 text-primary-700">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">1. Sao lưu dữ liệu (Backup)</CardTitle>
                <CardDescription>
                  Xuất toàn bộ CSDL ra file JSON an toàn.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800 mb-1">Dữ liệu được sao lưu:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Danh mục thành viên, CCCD, địa chỉ.</li>
                <li>Hồ sơ khoản vay, phương án vay, HĐ thế chấp.</li>
                <li>Tài sản, định giá, người liên quan.</li>
                <li>Lịch sử giải ngân, thu nợ gốc và thu lãi.</li>
                <li>Lãi suất, bảng giá đất, địa bàn.</li>
                <li>Mẫu biểu Word và tài khoản người dùng.</li>
              </ul>
            </div>
            <div>
              <Button
                variant="primary"
                className="w-full h-11 text-sm font-semibold gap-2"
                isLoading={isExportingBackup}
                onClick={handleExportBackup}
              >
                <Download className="h-4 w-4" />
                Sao lưu dữ liệu ngay (.json)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* THẺ TẢI LÊN DỮ LIỆU */}
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">2. Tải lên dữ liệu (Restore)</CardTitle>
                <CardDescription>
                  Nạp lại CSDL từ file sao lưu đã lưu.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-amber-900 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">LƯU Ý PHỤC HỒI:</strong>
                  <p className="mt-0.5">
                    Thao tác này sẽ đồng bộ toàn bộ dữ liệu hệ thống theo file sao lưu bạn chọn.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer border border-slate-300 rounded-md p-1"
              />
              {restoreFile && (
                <div className="text-xs text-emerald-700 font-medium flex items-center justify-between bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                  <span className="truncate mr-2">
                    Đã chọn: <strong>{restoreFile.name}</strong> ({(restoreFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs shrink-0"
                  >
                    ✕ Hủy
                  </button>
                </div>
              )}
            </div>

            <div>
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-semibold border-amber-300 text-amber-900 hover:bg-amber-50 gap-2"
                disabled={!restoreFile}
                onClick={() => setConfirmRestoreOpen(true)}
              >
                <RefreshCw className="h-4 w-4" />
                Tải lên & Phục hồi dữ liệu
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* THẺ LÀM SẠCH CSDL */}
        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-rose-900">3. Làm sạch CSDL (Reset)</CardTitle>
                <CardDescription>
                  Xóa tất cả, chỉ giữ Admin, Keyword & Mẫu Word.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-rose-900 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-200">
              <div className="flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-rose-800">CẢNH BÁO NGUY HIỂM:</strong>
                  <p className="mt-0.5">
                    Thao tác này sẽ xóa sạch toàn bộ hồ sơ vay, thành viên, tài sản, định giá, toàn bộ đơn giá đất (bảng giá tài sản), lãi suất, địa bàn, lịch sử thu nợ và tài khoản cán bộ.
                  </p>
                  <p className="mt-1 font-semibold text-emerald-800">
                    ✓ Chỉ giữ lại: Tài khoản Admin, Thư viện từ khóa và Mẫu Word.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="danger"
                className="w-full h-11 text-sm font-semibold gap-2"
                onClick={() => setConfirmCleanOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Làm sạch CSDL ngay
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog xác nhận phục hồi dữ liệu */}
      <ConfirmDialog
        open={confirmRestoreOpen}
        onOpenChange={setConfirmRestoreOpen}
        title="Xác nhận phục hồi toàn bộ cơ sở dữ liệu?"
        tone="danger"
        confirmText="Xác nhận phục hồi ngay"
        cancelText="Hủy bỏ"
        isLoading={isRestoring}
        onConfirm={handleConfirmRestore}
        description={
          <div className="space-y-2 text-xs text-slate-600">
            <p className="text-rose-700 font-semibold">
              CẢNH BÁO: Hành động này sẽ nạp lại toàn bộ dữ liệu từ tệp tin &ldquo;{restoreFile?.name}&rdquo;.
            </p>
            <p>
              Toàn bộ danh mục thành viên, hồ sơ vay, tài sản, hợp đồng thế chấp và lịch sử thu nợ sẽ được đồng bộ theo bản sao lưu này.
            </p>
            <p className="font-semibold text-slate-800">Bạn có hoàn toàn chắc chắn muốn tiếp tục?</p>
          </div>
        }
      />

      {/* Dialog xác nhận làm sạch toàn bộ CSDL */}
      <ConfirmDialog
        open={confirmCleanOpen}
        onOpenChange={setConfirmCleanOpen}
        title="Xác nhận LÀM SẠCH toàn bộ cơ sở dữ liệu?"
        tone="danger"
        confirmText="Tôi chắc chắn, Xóa sạch CSDL"
        cancelText="Hủy bỏ"
        isLoading={isCleaning}
        onConfirm={handleConfirmClean}
        description={
          <div className="space-y-2.5 text-xs text-slate-600">
            <p className="text-rose-700 font-bold uppercase tracking-wide">
              CẢNH BÁO TỐI CAO: Hành động này KHÔNG THỂ HOÀN TÁC!
            </p>
            <p>
              Hệ thống sẽ <strong>xóa toàn bộ</strong>: Danh sách thành viên, Hồ sơ khoản vay, Tài sản thế chấp, Bảng định giá, <strong>Toàn bộ Đơn giá đất / Bảng giá tài sản</strong>, Cấu hình lãi suất, Danh mục địa bàn, Lịch sử giải ngân, Các đợt thu nợ gốc/thu lãi và các tài khoản Cán bộ tín dụng.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded text-[11px] leading-relaxed">
              <strong>DỮ LIỆU ĐƯỢC BẢO TOÀN (KHÔNG BỊ XÓA):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Tài khoản quản trị <strong>ADMIN</strong> và hồ sơ cá nhân của Admin</li>
                <li>Toàn bộ <strong>Thư viện từ khóa biểu mẫu Word</strong> (GlobalWordKeyword)</li>
                <li>Toàn bộ các <strong>Mẫu biểu Word</strong> đã tải lên cùng cấu hình ánh xạ</li>
              </ul>
            </div>
            <p className="font-semibold text-slate-900 pt-1">
              Bạn có chắc chắn muốn làm sạch toàn bộ cơ sở dữ liệu ngay bây giờ?
            </p>
          </div>
        }
      />
    </div>
  );
}

