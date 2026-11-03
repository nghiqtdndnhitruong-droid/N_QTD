import { useMemo, useState } from 'react';
import { Archive, Download, FileText, Loader2 } from 'lucide-react';
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
import { notifyApiError, notifySuccess } from '@/components/feedback';
import { useWordTemplates, useExportLoanDocuments } from '../hooks/use-word-templates';

export interface TemplateExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  contractNumber?: string | null;
  loanType?: 'THE_CHAP' | 'TIN_CHAP';
}

export function TemplateExportDialog({
  open,
  onOpenChange,
  loanId,
  contractNumber,
  loanType = 'THE_CHAP',
}: TemplateExportDialogProps) {
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Lấy các biểu mẫu đang hoạt động
  const { data: templates = [], isLoading } = useWordTemplates({
    isActive: true,
  });

  const exportMutation = useExportLoanDocuments();

  // Lọc biểu mẫu phù hợp với loại hồ sơ vay
  const applicableTemplates = useMemo(() => {
    return templates.filter(
      (t) => t.loanTypeScope === 'ALL' || t.loanTypeScope === loanType,
    );
  }, [templates, loanType]);

  const handleToggleSelect = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplateIds.length === applicableTemplates.length) {
      setSelectedTemplateIds([]);
    } else {
      setSelectedTemplateIds(applicableTemplates.map((t) => t.id));
    }
  };

  const handleExport = async () => {
    if (selectedTemplateIds.length === 0) {
      alert('Vui lòng chọn ít nhất một biểu mẫu để xuất');
      return;
    }

    try {
      await exportMutation.mutateAsync({
        loanId,
        templateIds: selectedTemplateIds,
      });

      notifySuccess(
        'Xuất tài liệu Word thành công',
        selectedTemplateIds.length > 1
          ? `Đã tạo và tải xuống gói nén ZIP gồm ${selectedTemplateIds.length} biểu mẫu.`
          : 'Đã tạo và tải xuống file Word hoàn chỉnh.',
      );

      onOpenChange(false);
    } catch (err) {
      notifyApiError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <span>Xuất biểu mẫu Word cho hồ sơ: {contractNumber || `#${loanId.slice(-6)}`}</span>
          </DialogTitle>
          <DialogDescription>
            Chọn các biểu mẫu cần xuất. Hệ thống sẽ tự động lấy dữ liệu mới nhất của hồ sơ khoản vay
            và điền vào đúng vị trí các từ khóa.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-700">
              Danh sách biểu mẫu khả dụng ({applicableTemplates.length})
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-primary-600 hover:text-primary-800"
            >
              {selectedTemplateIds.length === applicableTemplates.length
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </button>
          </div>

          {isLoading ? (
            <div className="flex h-36 items-center justify-center text-xs text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-600" />
              Đang tải danh sách biểu mẫu...
            </div>
          ) : applicableTemplates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              Chưa có biểu mẫu nào đang hoạt động cho loại vay {loanType === 'THE_CHAP' ? 'Thế chấp' : 'Tín chấp'}.
              Vui lòng vào menu <strong>Quản lý biểu mẫu Word</strong> để tải lên mẫu mới.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {applicableTemplates.map((template) => {
                const isSelected = selectedTemplateIds.includes(template.id);
                return (
                  <label
                    key={template.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 p-3 text-xs transition-colors ${
                      isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(template.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {template.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-mono">{template.code}</span>
                          <span>·</span>
                          <span>{template.category}</span>
                          <span>·</span>
                          <span>v{template.currentVersion}</span>
                        </div>
                      </div>
                    </div>

                    <Badge tone="neutral" className="text-[10px]">
                      {template._count?.mappings ?? 0} từ khóa
                    </Badge>
                  </label>
                );
              })}
            </div>
          )}

          {/* Ghi chú hình thức tải về */}
          <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">
            {selectedTemplateIds.length > 1 ? (
              <>
                <Archive className="h-4 w-4 shrink-0 text-primary-600" />
                <span>
                  Đang chọn <strong>{selectedTemplateIds.length} biểu mẫu</strong>. Hệ thống sẽ tự động đóng gói thành một file nén <strong>.ZIP</strong> để tải về tiện lợi.
                </span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 shrink-0 text-primary-600" />
                <span>
                  Đang chọn <strong>{selectedTemplateIds.length} biểu mẫu</strong>. File Word <strong>.DOCX</strong> sẽ được tải về trực tiếp.
                </span>
              </>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={exportMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={selectedTemplateIds.length === 0}
            isLoading={exportMutation.isPending}
            loadingText="Đang xử lý & tải về..."
            leftIcon={<Download className="h-4 w-4" />}
          >
            {selectedTemplateIds.length > 1
              ? `Tải về file ZIP (${selectedTemplateIds.length} mẫu)`
              : 'Tải về file Word'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
