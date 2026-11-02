import { useState, useMemo } from 'react';
import { Download, FileText, Loader2, CheckSquare, Square, Archive, FileCheck } from 'lucide-react';
import { LoanType } from '@/shared/types';
import { LOAN_TYPE_LABELS } from '@/shared/constants';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { Alert, notifyApiError, notifySuccess, notifyWarning } from '@/components/feedback';
import { useLoanTemplates } from '../hooks/use-loans';
import { loansApi } from '../api/loans.api';
import type { LoanDocumentTemplateItem } from '../types/loan.types';

export interface LoanDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  loanType: LoanType;
  contractNumber?: string | null;
}

export function LoanDocumentModal({
  open,
  onOpenChange,
  loanId,
  loanType,
  contractNumber,
}: LoanDocumentModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useLoanTemplates(loanId, open);

  const templates = useMemo(() => data?.templates ?? [], [data?.templates]);
  const warnings = data?.warnings ?? [];

  // Tự động chọn tất cả biểu mẫu khi danh sách được tải lần đầu
  const handleToggleSelectAll = () => {
    if (selectedKeys.size === templates.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(templates.map((t) => t.key)));
    }
  };

  const handleToggleItem = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  // Tải về 1 biểu mẫu đơn lẻ
  const handleDownloadSingle = async (template: LoanDocumentTemplateItem) => {
    if (isExporting || downloadingKey) return;
    try {
      setDownloadingKey(template.key);
      await loansApi.downloadLoanDocument(loanId, template.key, template.suggestedFileName);
      notifySuccess(`Đã tải xuống biểu mẫu "${template.title}" thành công!`);
    } catch (err: any) {
      notifyApiError(err, `Lỗi khi xuất biểu mẫu "${template.title}"`);
    } finally {
      setDownloadingKey(null);
    }
  };

  // Xuất các biểu mẫu đã chọn theo quy tắc:
  // - 0 file: Cảnh báo yêu cầu chọn ít nhất 1 file
  // - 1 file: Tải trực tiếp file .docx
  // - >= 2 file: Tải 1 file nén .zip đóng gói tất cả các file đã chọn
  const handleExportSelected = async () => {
    const selectedTemplates = templates.filter((t) => selectedKeys.has(t.key));
    if (selectedTemplates.length === 0) {
      notifyWarning('Vui lòng chọn ít nhất một biểu mẫu để xuất tài liệu.');
      return;
    }

    if (isExporting) return; // Ngăn chặn duplicate request liên tục

    setIsExporting(true);

    try {
      const keys = selectedTemplates.map((t) => t.key);

      const result = await loansApi.exportLoanDocuments(loanId, keys);

      if (result.isZip) {
        notifySuccess(
          `Đã đóng gói thành công ${selectedTemplates.length} biểu mẫu vào file ZIP: ${result.fileName}`
        );
      } else {
        notifySuccess(
          `Đã tải xuống biểu mẫu Word thành công: ${result.fileName}`
        );
      }
    } catch (err: any) {
      notifyApiError(err, 'Lỗi trong quá trình xuất tài liệu');
    } finally {
      setIsExporting(false);
    }
  };

  const isAllSelected = templates.length > 0 && selectedKeys.size === templates.length;
  const isIndeterminate = selectedKeys.size > 0 && selectedKeys.size < templates.length;
  const selectedCount = selectedKeys.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Hồ sơ & Biểu mẫu vay vốn</DialogTitle>
            <Badge tone={loanType === LoanType.THE_CHAP ? 'primary' : 'neutral'}>
              {LOAN_TYPE_LABELS[loanType]}
            </Badge>
          </div>
          <DialogDescription>
            Tự động điền dữ liệu hồ sơ vào các biểu mẫu Word chính thức của Quỹ tín dụng.{' '}
            {contractNumber ? (
              <span>
                Số khế ước: <strong className="font-mono text-slate-800">{contractNumber}</strong>
              </span>
            ) : (
              <span className="text-amber-600 font-medium">(Chưa cấp số khế ước nhận nợ)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {warnings.length > 0 && (
            <Alert tone="warning" title="Lưu ý thông tin trước khi xuất hồ sơ">
              <ul className="list-inside list-disc space-y-1 text-xs">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-primary-600 mb-2" />
              <p className="text-xs">Đang nhận diện danh mục biểu mẫu phù hợp với hồ sơ...</p>
            </div>
          ) : error ? (
            <Alert tone="danger" title="Không thể tải biểu mẫu">
              Đã có lỗi xảy ra khi đọc danh sách mẫu từ hệ thống. Vui lòng thử lại.
            </Alert>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Không có mẫu biểu phù hợp với hình thức vay này.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Thanh công cụ chọn nhiều & nút tải */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-primary-600 transition"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary-600" />
                    ) : isIndeterminate ? (
                      <CheckSquare className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                    <span>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                  </button>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">
                    Đã chọn <strong className="text-primary-700">{selectedCount}</strong>/{templates.length} biểu mẫu
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={
                    isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : selectedCount >= 2 ? (
                      <Archive className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )
                  }
                  disabled={selectedCount === 0 || isExporting || Boolean(downloadingKey)}
                  onClick={handleExportSelected}
                >
                  {isExporting
                    ? selectedCount >= 2
                      ? `Đang nén ${selectedCount} file ZIP...`
                      : 'Đang tạo file Word...'
                    : selectedCount === 0
                    ? 'Chọn biểu mẫu để xuất'
                    : selectedCount === 1
                    ? 'Tải xuống 1 file Word (.docx)'
                    : `Tải xuống ${selectedCount} file Word (.zip)`}
                </Button>
              </div>

              {/* Thông báo định dạng tải xuống */}
              {selectedCount >= 2 && !isExporting && (
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-800">
                  <Archive className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    Bạn đang chọn <strong>{selectedCount} biểu mẫu</strong>. Hệ thống sẽ tự động đóng gói toàn bộ thành một file nén <strong>.zip</strong> duy nhất để tải về thuận tiện.
                  </span>
                </div>
              )}

              {selectedCount === 1 && !isExporting && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
                  <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Bạn đang chọn <strong>1 biểu mẫu</strong>. Hệ thống sẽ tải trực tiếp file <strong>.docx</strong> về máy.
                  </span>
                </div>
              )}

              {/* Trạng thái đang xử lý tải hàng loạt */}
              {isExporting && (
                <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-xs text-primary-900 flex items-center gap-2 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600 shrink-0" />
                  <div>
                    {selectedCount >= 2 ? (
                      <span>
                        Đang tạo và đóng gói <strong>{selectedCount} file Word</strong> vào file ZIP. Quá trình có thể mất vài giây, vui lòng không tắt cửa sổ...
                      </span>
                    ) : (
                      <span>Đang tạo và tải file Word hoàn chỉnh...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Danh sách các biểu mẫu */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isSelected = selectedKeys.has(tpl.key);
                  const isDownloading = downloadingKey === tpl.key;

                  return (
                    <div
                      key={tpl.key}
                      onClick={() => !isExporting && handleToggleItem(tpl.key)}
                      className={`flex flex-col justify-between gap-3 rounded-lg border p-3 shadow-xs transition sm:flex-row sm:items-center cursor-pointer select-none ${
                        isSelected
                          ? 'border-primary-400 bg-primary-50/40 ring-1 ring-primary-300'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100/70 text-primary-700">
                          <FileText className="h-4 w-4" />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-semibold text-slate-900">{tpl.title}</h4>
                            <Badge
                              tone={
                                tpl.loanType === LoanType.THE_CHAP
                                  ? 'primary'
                                  : tpl.loanType === LoanType.TIN_CHAP
                                  ? 'info'
                                  : 'neutral'
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {tpl.loanType === 'ALL'
                                ? 'Dùng chung'
                                : tpl.loanType === LoanType.THE_CHAP
                                ? 'Thế chấp'
                                : 'Tín chấp'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-600">{tpl.description}</p>
                          <div className="font-mono text-[10px] text-slate-400">
                            Tệp nguồn: {tpl.fileName}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex shrink-0 items-center sm:self-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={
                            isDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )
                          }
                          disabled={isDownloading || isExporting || Boolean(downloadingKey)}
                          onClick={() => handleDownloadSingle(tpl)}
                        >
                          {isDownloading ? 'Đang tạo...' : 'Tải file'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-700 mb-1">Quy định xử lý biểu mẫu của Quỹ:</div>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Hệ thống bảo toàn nguyên vẹn 100% định dạng, font chữ, căn lề và bảng biểu của biểu mẫu Word gốc.</li>
              <li>Các trường dữ liệu không có thông tin sẽ tự động được điền dấu chấm (<code className="text-slate-800">...................</code>).</li>
              <li>Thông tin của nhiều tài sản bảo đảm (sổ đỏ) được tự động gộp theo đúng thứ tự và loại bỏ các giá trị trùng lặp.</li>
              <li>Khi chọn từ 2 file Word trở lên, hệ thống sẽ tự động đóng gói toàn bộ thành một file ZIP duy nhất để tải về.</li>
            </ul>
          </div>
        </DialogBody>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <span>
                Đang chọn: <strong className="text-slate-800">{selectedCount}</strong> biểu mẫu
                {selectedCount >= 2 ? ' (xuất file .zip)' : ' (xuất file .docx)'}
              </span>
            ) : (
              <span>Chưa chọn biểu mẫu</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Đóng
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="primary"
                leftIcon={
                  isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedCount >= 2 ? (
                    <Archive className="h-4 w-4" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )
                }
                disabled={isExporting}
                onClick={handleExportSelected}
              >
                {isExporting
                  ? 'Đang xử lý...'
                  : selectedCount >= 2
                  ? `Tải ${selectedCount} file (.zip)`
                  : 'Tải 1 file (.docx)'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
