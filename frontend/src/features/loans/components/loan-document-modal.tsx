import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
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
import { Alert, notifyApiError, notifySuccess } from '@/components/feedback';
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
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const { data, isLoading, error } = useLoanTemplates(loanId, open);

  const handleDownload = async (template: LoanDocumentTemplateItem) => {
    try {
      setDownloadingKey(template.key);
      await loansApi.downloadLoanDocument(loanId, template.key, template.suggestedFileName);
      notifySuccess(`Đã tải xuống biểu mẫu "${template.title}" thành công!`);
    } catch (err) {
      notifyApiError(err, 'Lỗi khi tạo và tải biểu mẫu Word');
    } finally {
      setDownloadingKey(null);
    }
  };

  const templates = data?.templates ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Hồ sơ & Biểu mẫu vay vốn</DialogTitle>
            <Badge tone={loanType === LoanType.THE_CHAP ? 'primary' : 'neutral'}>
              {LOAN_TYPE_LABELS[loanType]}
            </Badge>
          </div>
          <DialogDescription>
            Tự động điền thông tin khoản vay vào các biểu mẫu Word chính thức của Quỹ tín dụng.{' '}
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
              <p className="text-xs">Đang tải danh sách biểu mẫu phù hợp...</p>
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
              {templates.map((tpl) => {
                const isDownloading = downloadingKey === tpl.key;
                return (
                  <div
                    key={tpl.key}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition hover:border-primary-300 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-slate-900">{tpl.title}</h4>
                        <p className="text-xs text-slate-600">{tpl.description}</p>
                        <div className="font-mono text-[11px] text-slate-400">
                          Tệp nguồn: {tpl.fileName}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center sm:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={
                          isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )
                        }
                        disabled={isDownloading || Boolean(downloadingKey)}
                        onClick={() => handleDownload(tpl)}
                      >
                        {isDownloading ? 'Đang tạo Word...' : 'Tải file Word'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-700 mb-1">Quy định xử lý biểu mẫu của Quỹ:</div>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Hệ thống bảo toàn nguyên vẹn 100% định dạng, font chữ, bảng biểu của biểu mẫu Word gốc.</li>
              <li>Thông tin của nhiều tài sản bảo đảm (sổ đỏ) được tự động gộp theo đúng thứ tự và loại bỏ các giá trị trùng lặp.</li>
              <li>Bạn có thể tải về từng biểu mẫu độc lập bất kỳ lúc nào hoặc tạo lại sau khi điều chỉnh thông tin khoản vay.</li>
            </ul>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
