import { useMemo, useState } from 'react';
import { Archive, Download, FileText, Loader2, Shield, UserCheck, Layers, CheckSquare } from 'lucide-react';
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
import type { WordTemplate } from '../types/word-template.types';

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

  // Tách riêng biểu mẫu chuyên biệt cho loại khoản vay (Thế chấp / Tín chấp) và biểu mẫu Chung
  // Ưu tiên biểu mẫu chuyên biệt lên trên, biểu mẫu dùng chung xuống dưới
  const specificTemplates = useMemo(
    () => templates.filter((t) => t.loanTypeScope === loanType),
    [templates, loanType],
  );

  const commonTemplates = useMemo(
    () => templates.filter((t) => t.loanTypeScope === 'ALL'),
    [templates],
  );

  const applicableTemplates = useMemo(
    () => [...specificTemplates, ...commonTemplates],
    [specificTemplates, commonTemplates],
  );

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

  const handleSelectGroup = (groupTemplates: WordTemplate[]) => {
    const groupIds = groupTemplates.map((t) => t.id);
    const allSelected = groupIds.every((id) => selectedTemplateIds.includes(id));
    if (allSelected) {
      // Bỏ chọn tất cả trong nhóm
      setSelectedTemplateIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      // Chọn tất cả trong nhóm
      setSelectedTemplateIds((prev) => Array.from(new Set([...prev, ...groupIds])));
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

  const isSpecificLoanTheChap = loanType === 'THE_CHAP';
  const specificTitle = isSpecificLoanTheChap ? 'Biểu mẫu Thế chấp' : 'Biểu mẫu Tín chấp';
  const SpecificIcon = isSpecificLoanTheChap ? Shield : UserCheck;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <span>Xuất biểu mẫu Word cho hồ sơ: {contractNumber || `#${loanId.slice(-6)}`}</span>
          </DialogTitle>
          <DialogDescription>
            Chọn các biểu mẫu cần xuất. Hệ thống đã ưu tiên hiển thị nhóm biểu mẫu {specificTitle.toLowerCase()} ở trên và biểu mẫu chung ở dưới để cán bộ dễ dàng lựa chọn.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-semibold text-slate-700">
              Tổng số biểu mẫu khả dụng: <strong className="text-primary-700">{applicableTemplates.length}</strong>
              {selectedTemplateIds.length > 0 && (
                <span className="text-emerald-700 ml-2 font-medium">
                  (Đã chọn {selectedTemplateIds.length})
                </span>
              )}
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
            <div className="flex h-44 items-center justify-center text-xs text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-600" />
              Đang tải danh sách biểu mẫu...
            </div>
          ) : applicableTemplates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              Chưa có biểu mẫu nào đang hoạt động cho loại vay {isSpecificLoanTheChap ? 'Thế chấp' : 'Tín chấp'}.
              Vui lòng vào menu <strong>Quản lý biểu mẫu Word</strong> để tải lên mẫu mới.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
              {/* NHÓM 1 (ƯU TIÊN Ở TRÊN): BIỂU MẪU THẾ CHẤP / TÍN CHẤP THEO HỒ SƠ */}
              {specificTemplates.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-200/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-100 text-amber-800">
                        <SpecificIcon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                        1. {specificTitle} (Ưu tiên theo hồ sơ)
                      </span>
                      <Badge tone="warning" className="text-[10px] px-1.5 py-0 font-bold">
                        {specificTemplates.length}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectGroup(specificTemplates)}
                      className="text-[11px] font-medium text-amber-900 hover:underline flex items-center gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      {specificTemplates.every((t) => selectedTemplateIds.includes(t.id))
                        ? 'Bỏ chọn nhóm này'
                        : 'Chọn cả nhóm này'}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {specificTemplates.map((template) => {
                      const isSelected = selectedTemplateIds.includes(template.id);
                      return (
                        <label
                          key={template.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 p-2.5 text-xs transition-colors ${
                            isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(template.id)}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600 cursor-pointer"
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

                          <Badge tone="neutral" className="text-[10px] shrink-0">
                            {template._count?.mappings ?? 0} từ khóa
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NHÓM 2 (DỜI XUỐNG DƯỚI): BIỂU MẪU DÙNG CHUNG */}
              {commonTemplates.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-200/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-100 text-indigo-800">
                        <Layers className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs text-indigo-950 uppercase tracking-wide">
                        2. Biểu mẫu dùng chung (Áp dụng cho mọi hình thức vay)
                      </span>
                      <Badge tone="info" className="text-[10px] px-1.5 py-0 font-bold">
                        {commonTemplates.length}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectGroup(commonTemplates)}
                      className="text-[11px] font-medium text-indigo-900 hover:underline flex items-center gap-1"
                    >
                      <CheckSquare className="h-3 w-3" />
                      {commonTemplates.every((t) => selectedTemplateIds.includes(t.id))
                        ? 'Bỏ chọn nhóm này'
                        : 'Chọn cả nhóm này'}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {commonTemplates.map((template) => {
                      const isSelected = selectedTemplateIds.includes(template.id);
                      return (
                        <label
                          key={template.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 p-2.5 text-xs transition-colors ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(template.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
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

                          <Badge tone="neutral" className="text-[10px] shrink-0">
                            {template._count?.mappings ?? 0} từ khóa
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
