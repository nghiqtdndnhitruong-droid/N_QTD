import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Key,
  FileCode,
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
  restoreKeywordsDefaultApi,
  uploadKeywordsSqlApi,
} from '@/features/reports/api/reports.api';

export function BackupPage() {
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isRestoringKeywords, setIsRestoringKeywords] = useState(false);
  const [isUploadingSql, setIsUploadingSql] = useState(false);
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const [confirmRestoreDefaultKeywordsOpen, setConfirmRestoreDefaultKeywordsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
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

  const handleSqlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.sql')) {
        notifyError('Tệp không hợp lệ', 'Vui lòng chọn tệp script có đuôi định dạng .sql');
        return;
      }
      setSqlFile(file);
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
      // Xóa bộ nhớ cache client và nạp lại toàn bộ dữ liệu ngay lập tức, không cần F5
      queryClient.clear();
      await queryClient.invalidateQueries();
      await dbStatsQuery.refetch();
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
        res.message || 'Hệ thống đã làm sạch cơ sở dữ liệu (đã xóa hồ sơ nghiệp vụ và đơn giá; bảo toàn Admin, từ khóa, mẫu Word và địa bàn).',
      );
      // Xóa bộ nhớ cache client và nạp lại dữ liệu ngay lập tức
      queryClient.clear();
      await queryClient.invalidateQueries();
      await dbStatsQuery.refetch();
    } catch (err: any) {
      notifyError('Làm sạch CSDL thất bại', err?.message || 'Có lỗi xảy ra khi làm sạch cơ sở dữ liệu.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleRestoreKeywordsDefault = async () => {
    try {
      setIsRestoringKeywords(true);
      const res = await restoreKeywordsDefaultApi();
      setConfirmRestoreDefaultKeywordsOpen(false);
      notifySuccess(
        'Nạp từ khóa thành công',
        res.message || `Đã khôi phục thành công ${res.count} từ khóa Word chuẩn.`,
      );
      // Xóa bộ nhớ cache và nạp lại ngay lập tức
      queryClient.clear();
      await queryClient.invalidateQueries();
      await dbStatsQuery.refetch();
    } catch (err: any) {
      notifyError('Nạp từ khóa thất bại', err?.message || 'Có lỗi xảy ra khi nạp từ khóa.');
    } finally {
      setIsRestoringKeywords(false);
    }
  };

  const handleUploadSqlKeywords = async () => {
    if (!sqlFile) return;
    try {
      setIsUploadingSql(true);
      const res = await uploadKeywordsSqlApi(sqlFile);
      setSqlFile(null);
      if (sqlFileInputRef.current) sqlFileInputRef.current.value = '';
      notifySuccess(
        'Tải lên file SQL thành công',
        res.message || `Đã nạp thành công ${res.count} từ khóa từ file SQL.`,
      );
      // Xóa bộ nhớ cache và nạp lại ngay lập tức
      queryClient.clear();
      await queryClient.invalidateQueries();
      await dbStatsQuery.refetch();
    } catch (err: any) {
      notifyError('Nạp SQL thất bại', err?.message || 'Có lỗi xảy ra khi xử lý file SQL.');
    } finally {
      setIsUploadingSql(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sao lưu & Phục hồi Cơ sở Dữ liệu"
        description="Xuất toàn bộ dữ liệu hệ thống ra tệp tin JSON an toàn, nạp lại khi cần khôi phục, quản lý từ khóa Word chuẩn từ SQL. Dành riêng cho Quản trị viên (ADMIN)."
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
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
                  Tài sản
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.collaterals || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Coins className="h-3 w-3 text-indigo-600" />
                  Lượt thu nợ
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.repayments || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3 text-purple-600" />
                  Mẫu Word
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{dbStats?.wordTemplates || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40">
                <div className="text-[11px] text-blue-700 font-medium uppercase flex items-center gap-1">
                  <Key className="h-3 w-3 text-blue-600" />
                  Từ khóa Word
                </div>
                <div className="mt-1 text-lg font-bold text-blue-900">{(dbStats as any)?.globalWordKeywords || 0}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-600" />
                  Địa bàn
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {(dbStats?.hamlets || 0) + (dbStats?.communes || 0)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Các khối hành động */}
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
                <li>Tất cả hồ sơ thành viên và người liên quan</li>
                <li>Hồ sơ khoản vay, hợp đồng và lịch sử thẩm định</li>
                <li>Tài sản thế chấp và bảng định giá</li>
                <li>Đơn giá đất, cấu hình lãi suất và địa bàn</li>
                <li>Biểu mẫu Word, ánh xạ và từ khóa toàn cục</li>
              </ul>
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold gap-2"
              onClick={handleExportBackup}
              disabled={isExportingBackup}
            >
              <Download className="h-4 w-4" />
              {isExportingBackup ? 'Đang đóng gói dữ liệu...' : 'Tải về file sao lưu (.json)'}
            </Button>
          </CardContent>
        </Card>

        {/* THẺ PHỤC HỒI */}
        <Card className="border-emerald-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">2. Phục hồi dữ liệu (Restore)</CardTitle>
                <CardDescription>
                  Nạp lại CSDL từ tệp sao lưu JSON đã xuất.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800 mb-1">Lưu ý khi phục hồi:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Chỉ chấp nhận tệp có định dạng <span className="font-mono text-emerald-700">.json</span> hợp lệ.</li>
                <li>Dữ liệu hiện tại sẽ được cập nhật/đồng bộ theo tệp sao lưu.</li>
                <li>Khuyến nghị tải bản sao lưu mới nhất trước khi thực hiện.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                id="restore-upload-input"
                onChange={handleFileChange}
              />
              <label
                htmlFor="restore-upload-input"
                className="flex items-center justify-center gap-2 w-full h-11 px-4 border-2 border-dashed border-emerald-300 rounded-lg text-xs font-medium text-emerald-800 hover:bg-emerald-50/50 cursor-pointer transition-colors"
              >
                <Upload className="h-4 w-4 text-emerald-600" />
                {restoreFile ? (
                  <span className="font-semibold truncate max-w-[220px]">{restoreFile.name}</span>
                ) : (
                  'Chọn tệp sao lưu (.json)'
                )}
              </label>

              <Button
                variant="primary"
                className="w-full h-11 text-sm font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!restoreFile || isRestoring}
                onClick={() => setConfirmRestoreOpen(true)}
              >
                <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                {isRestoring ? 'Đang phục hồi dữ liệu...' : 'Bắt đầu phục hồi CSDL'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* THẺ LÀM SẠCH CSDL */}
        <Card className="border-rose-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-rose-900">3. Làm sạch CSDL (Reset)</CardTitle>
                <CardDescription>
                  Xóa sạch nghiệp vụ & từ khóa, chỉ giữ Admin & Mẫu Word.
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
                    Thao tác này sẽ xóa sạch toàn bộ hồ sơ vay, thành viên, tài sản, định giá, đơn giá đất, lãi suất, địa bàn, lịch sử thu nợ và <strong>toàn bộ từ khóa Word</strong>.
                  </p>
                  <p className="mt-1 font-semibold text-emerald-800">
                    ✓ Chỉ giữ lại: Tài khoản Admin và Mẫu biểu Word.
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    (Bạn có thể nạp lại Thư viện từ khóa chuẩn bất kỳ lúc nào từ ô bên dưới).
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

      {/* THẺ QUẢN LÝ TỪ KHÓA TỪ SQL */}
      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-blue-950">
                4. Quản lý Thư viện Từ khóa Word (keywords.sql)
              </CardTitle>
              <CardDescription>
                Nạp lại toàn bộ từ khóa biểu mẫu Word đang sử dụng từ file SQL của dự án hoặc tải lên file SQL tùy chỉnh.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột 1: Nạp từ keywords.sql mặc định */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-blue-900 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-blue-600" />
                  Nạp từ file chuẩn dự án (keywords.sql)
                </h4>
                <p className="text-xs text-blue-800/80 mt-1.5 leading-relaxed">
                  Hệ thống sẽ tự động đọc file <span className="font-mono font-medium">backend/prisma/keywords.sql</span> chứa 161 từ khóa chuẩn đang được sử dụng trong các biểu mẫu Word và đồng bộ vào CSDL.
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full h-10 text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white mt-2"
                onClick={() => setConfirmRestoreDefaultKeywordsOpen(true)}
                disabled={isRestoringKeywords}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRestoringKeywords ? 'animate-spin' : ''}`} />
                {isRestoringKeywords ? 'Đang nạp từ khóa...' : 'Nạp lại từ khóa chuẩn (keywords.sql)'}
              </Button>
            </div>

            {/* Cột 2: Tải lên file SQL tùy chỉnh */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-slate-600" />
                  Tải lên file SQL từ khóa từ máy tính
                </h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Tải lên file script <span className="font-mono font-medium text-slate-800">.sql</span> chứa các câu lệnh <span className="font-mono text-[11px]">INSERT INTO global_word_keywords</span> để cập nhật hoặc bổ sung danh mục từ khóa mới.
                </p>
              </div>

              <div className="space-y-2 mt-2">
                <input
                  ref={sqlFileInputRef}
                  type="file"
                  accept=".sql,text/plain"
                  className="hidden"
                  id="sql-keywords-upload-input"
                  onChange={handleSqlFileChange}
                />
                <label
                  htmlFor="sql-keywords-upload-input"
                  className="flex items-center justify-center gap-2 w-full h-10 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100/80 cursor-pointer transition-colors"
                >
                  <FileCode className="h-4 w-4 text-slate-500" />
                  {sqlFile ? (
                    <span className="font-semibold truncate max-w-[200px] text-primary-700">{sqlFile.name}</span>
                  ) : (
                    'Chọn tệp SQL từ máy (.sql)'
                  )}
                </label>

                <Button
                  variant="outline"
                  className="w-full h-10 text-xs font-semibold gap-2"
                  disabled={!sqlFile || isUploadingSql}
                  onClick={handleUploadSqlKeywords}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploadingSql ? 'Đang xử lý nạp SQL...' : 'Nạp dữ liệu từ file SQL đã chọn'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              Hệ thống sẽ <strong>xóa sạch</strong>: Danh sách thành viên, Hồ sơ khoản vay, Tài sản thế chấp, Bảng định giá, <strong>Toàn bộ Đơn giá đất / Bảng giá tài sản</strong>, Cấu hình lãi suất, Lịch sử giải ngân, Các đợt thu nợ gốc/thu lãi và các tài khoản Cán bộ tín dụng.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded text-[11px] leading-relaxed">
              <strong>DỮ LIỆU ĐƯỢC BẢO TOÀN (KHÔNG BỊ XÓA):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Tài khoản quản trị <strong>ADMIN</strong> và hồ sơ cá nhân của Admin</li>
                <li>Toàn bộ <strong>Thư viện từ khóa Word</strong> chuẩn và mở rộng</li>
                <li>Toàn bộ <strong>Mẫu biểu Word</strong> đã tải lên cùng cấu hình ánh xạ</li>
                <li>Danh mục <strong>Địa bàn Ấp / Xã / Tỉnh</strong></li>
              </ul>
            </div>
            <p className="text-blue-700 text-[11px]">
              ℹ Lưu ý: Sau khi làm sạch, bạn có thể nạp lại Thư viện từ khóa chuẩn bất kỳ lúc nào từ mục &ldquo;Quản lý Thư viện Từ khóa Word (keywords.sql)&rdquo;.
            </p>
            <p className="font-semibold text-slate-900 pt-1">
              Bạn có chắc chắn muốn làm sạch toàn bộ cơ sở dữ liệu ngay bây giờ?
            </p>
          </div>
        }
      />

      {/* Dialog xác nhận nạp lại từ khóa chuẩn từ keywords.sql */}
      <ConfirmDialog
        open={confirmRestoreDefaultKeywordsOpen}
        onOpenChange={setConfirmRestoreDefaultKeywordsOpen}
        title="Nạp lại Thư viện từ khóa Word chuẩn?"
        tone="primary"
        confirmText="Xác nhận nạp lại"
        cancelText="Hủy bỏ"
        isLoading={isRestoringKeywords}
        onConfirm={handleRestoreKeywordsDefault}
        description={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Hệ thống sẽ đồng bộ lại 161 từ khóa biểu mẫu Word chuẩn từ file <span className="font-mono text-primary-700">backend/prisma/keywords.sql</span>.
            </p>
            <p>
              Các từ khóa cũ sẽ được làm mới để đảm bảo tính đồng bộ hoàn hảo với các mẫu biểu Word đang có.
            </p>
          </div>
        }
      />
    </div>
  );
}
