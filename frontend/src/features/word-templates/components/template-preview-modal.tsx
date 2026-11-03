import { useState } from 'react';
import { AlertCircle, Download, Play } from 'lucide-react';
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
import { notifyApiError } from '@/components/feedback';
import { useLoansList } from '@/features/loans/hooks/use-loans';
import { usePreviewTemplate, useExportLoanDocuments } from '../hooks/use-word-templates';
import type { WordTemplate, TemplatePreviewResult } from '../types/word-template.types';

export interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WordTemplate;
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  template,
}: TemplatePreviewModalProps) {
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<TemplatePreviewResult | null>(null);

  // Lấy danh sách hồ sơ vay gần đây để test
  const { data: loansData } = useLoansList({
    page: 1,
    limit: 10,
  });

  const previewMutation = usePreviewTemplate();
  const exportMutation = useExportLoanDocuments();

  const loans = loansData?.items ?? [];

  const handleRunTest = async () => {
    if (!selectedLoanId) {
      alert('Vui lòng chọn một hồ sơ khoản vay để chạy thử nghiệm');
      return;
    }

    try {
      const res = await previewMutation.mutateAsync({
        templateId: template.id,
        loanId: selectedLoanId,
      });
      setPreviewResult(res);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleDownloadSample = async () => {
    if (!selectedLoanId) return;
    try {
      await exportMutation.mutateAsync({
        loanId: selectedLoanId,
        templateIds: [template.id],
      });
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Kiểm tra & Chạy thử nghiệm biểu mẫu: {template.title}</DialogTitle>
          <DialogDescription>
            Chọn một hồ sơ khoản vay có sẵn trong hệ thống để đối soát việc ánh xạ dữ liệu và tải
            file Word sinh thử nghiệm.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Khu vực chọn hồ sơ vay */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Chọn hồ sơ khoản vay dùng để kiểm tra:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
              >
                <option value="">-- Chọn hồ sơ khoản vay --</option>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    Khế ước: {l.contractNumber || l.id.slice(-6)} · {l.member?.fullName} ·{' '}
                    {l.loanType === 'THE_CHAP' ? 'Thế chấp' : 'Tín chấp'} ·{' '}
                    {Number(l.loanAmount).toLocaleString('vi-VN')} đ
                  </option>
                ))}
              </select>

              <Button
                type="button"
                size="sm"
                onClick={handleRunTest}
                disabled={!selectedLoanId}
                isLoading={previewMutation.isPending}
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                Chạy thử nghiệm
              </Button>
            </div>
          </div>

          {/* Cảnh báo nếu có */}
          {previewResult && previewResult.warnings.length > 0 && (
            <div className="rounded-lg border border-warning-200 bg-warning-50/70 p-3 text-xs text-warning-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 text-warning-600" />
                <span>
                  Phát hiện {previewResult.warnings.length} cảnh báo về trường dữ liệu bắt buộc:
                </span>
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 text-warning-800">
                {previewResult.warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Bảng kết quả giá trị điền */}
          {previewResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase text-slate-600">
                  Kết quả ánh xạ dữ liệu ({Object.keys(previewResult.resolvedData).length} từ khóa)
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  isLoading={exportMutation.isPending}
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                >
                  Tải file Word đã điền thử
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Từ khóa trong Word</th>
                      <th className="px-3 py-2">Giá trị được điền vào</th>
                      <th className="px-3 py-2">Kiểu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {Object.entries(previewResult.resolvedData).map(([key, val]) => {
                      const isArray = Array.isArray(val);
                      return (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-semibold text-primary-700">
                            {`{{${key}}}`}
                          </td>
                          <td className="px-3 py-1.5 text-slate-800">
                            {isArray ? (
                              <Badge tone="primary">
                                Danh sách {val.length} phần tử (Lặp bảng)
                              </Badge>
                            ) : typeof val === 'object' && val !== null ? (
                              JSON.stringify(val)
                            ) : (
                              String(val || '')
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-sans">
                            {isArray ? (
                              <Badge tone="info">Array Loop</Badge>
                            ) : (
                              <Badge tone="neutral">Single</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
