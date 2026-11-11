import { useState, useRef, useEffect } from 'react';
import { FileUp, Upload, X, Files } from 'lucide-react';
import {
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
import { useUploadWordTemplate, useUploadMultipleWordTemplates } from '../hooks/use-word-templates';
import type { LoanTypeScope } from '../types/word-template.types';

export interface TemplateUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (createdId?: string) => void;
  defaultScope?: LoanTypeScope;
}

const CATEGORY_SUGGESTIONS = [
  'Hồ sơ thế chấp',
  'Hồ sơ tín chấp',
  'Hồ sơ chung',
  'Biên bản định giá',
  'Hợp đồng & Khế ước',
  'Giấy cam kết & Bảo lãnh',
  'Bàn giao giấy tờ',
];

export function TemplateUploadModal({
  open,
  onOpenChange,
  onSuccess,
  defaultScope = 'ALL',
}: TemplateUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hồ sơ thế chấp');
  const [loanTypeScope, setLoanTypeScope] = useState<LoanTypeScope>(defaultScope);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      const scope = defaultScope || 'ALL';
      setLoanTypeScope(scope);
      if (scope === 'THE_CHAP') {
        setCategory('Hồ sơ thế chấp');
      } else if (scope === 'TIN_CHAP') {
        setCategory('Hồ sơ tín chấp');
      } else {
        setCategory('Hồ sơ chung');
      }
    }
  }, [open, defaultScope]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSingleMutation = useUploadWordTemplate();
  const uploadMultipleMutation = useUploadMultipleWordTemplates();

  const handleFilesSelect = (files: FileList | File[]) => {
    const docxFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.docx'));
    if (docxFiles.length === 0) {
      alert('Vui lòng chỉ chọn file Microsoft Word định dạng .docx');
      return;
    }

    setSelectedFiles((prev) => {
      // Hợp nhất các file, lọc trùng tên
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = docxFiles.filter((f) => !existingNames.has(f.name));
      const combined = [...prev, ...newFiles];

      // Nếu chỉ có 1 file, tự động gợi ý tên và mã
      if (combined.length === 1 && combined[0]) {
        const file = combined[0];
        const cleanName = file.name.replace(/\.docx$/i, '').trim();
        setTitle(cleanName);
        const autoCode = cleanName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Za-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .toUpperCase()
          .slice(0, 30);
        setCode(autoCode);
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length === 1 && updated[0]) {
        const cleanName = updated[0].name.replace(/\.docx$/i, '').trim();
        setTitle(cleanName);
      }
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert('Vui lòng chọn ít nhất một file biểu mẫu .docx');
      return;
    }

    // Trường hợp 1 file: dùng API upload đơn lẻ kèm metadata chi tiết
    if (selectedFiles.length === 1) {
      if (!code.trim() || !title.trim() || !category.trim()) {
        alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
        return;
      }

      try {
        const created = await uploadSingleMutation.mutateAsync({
          code: code.trim(),
          title: title.trim(),
          category: category.trim(),
          loanTypeScope,
          description: description.trim() || undefined,
          file: selectedFiles[0]!,
        });

        notifySuccess(
          `Đã tải lên biểu mẫu "${created.title}"`,
          `Hệ thống đã tự động nhận diện ${created._count?.mappings ?? 0} từ khóa trong file.`,
        );

        onOpenChange(false);
        resetForm();
        if (onSuccess) {
          onSuccess(created?.id);
        }
      } catch (err) {
        notifyApiError(err);
      }
      return;
    }

    // Trường hợp nhiều file: dùng API upload hàng loạt
    try {
      const result = await uploadMultipleMutation.mutateAsync({
        files: selectedFiles,
        defaults: {
          loanTypeScope,
          category: category.trim() || 'Hồ sơ chung',
        },
      });

      notifySuccess(
        `Tải lên hàng loạt thành công`,
        `Đã tải lên thành công ${result.successCount}/${result.total} biểu mẫu Word.`,
      );

      onOpenChange(false);
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      notifyApiError(err);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setCode('');
    setTitle('');
    const scope = defaultScope || 'ALL';
    setLoanTypeScope(scope);
    setCategory(
      scope === 'THE_CHAP'
        ? 'Hồ sơ thế chấp'
        : scope === 'TIN_CHAP'
          ? 'Hồ sơ tín chấp'
          : 'Hồ sơ chung',
    );
    setDescription('');
  };

  const isPending = uploadSingleMutation.isPending || uploadMultipleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="sm:max-w-4xl min-h-[580px] md:min-h-[640px] flex flex-col justify-between">
        <div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Files className="h-5 w-5 text-primary-600" />
              Thêm biểu mẫu Word mới
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Tải lên một hoặc nhiều file Word (.docx) mẫu cùng lúc. Hệ thống sẽ tự động quét cấu trúc để trích xuất các từ khóa {'{{...}}'}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} id="upload-word-template-form">
            <DialogBody className="space-y-4 py-3">
              {/* Khu vực Drag & Drop Upload với chiều cao rộng rãi hơn */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50 shadow-inner'
                    : selectedFiles.length > 0
                      ? 'border-primary-400 bg-primary-50/20'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/90'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelect(e.target.files);
                    }
                  }}
                  className="hidden"
                />

                <div className="space-y-1.5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Kéo thả file .docx vào đây hoặc <span className="text-primary-600 underline">Chọn từ máy tính</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Hỗ trợ tải 1 file hoặc chọn nhiều file Word (.docx) cùng lúc để nạp hàng loạt vào hệ thống (tối đa 20MB/file)
                  </div>
                </div>
              </div>

              {/* Danh sách file đã chọn */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Đã chọn {selectedFiles.length} file biểu mẫu:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-rose-600 hover:underline text-xs"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2.5 bg-slate-50/70">
                    {selectedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileUp className="h-4 w-4 text-primary-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Bỏ file này"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form metadata: Nếu 1 file thì chi tiết, nếu nhiều file thì thiết lập nhóm chung */}
              {selectedFiles.length <= 1 ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Tên biểu mẫu <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Hợp đồng thế chấp quyền sử dụng đất"
                      required
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mã biểu mẫu (duy nhất) <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="VD: HDTC_2026"
                      required
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs uppercase focus:border-primary-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Nhóm biểu mẫu <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="VD: Hồ sơ thế chấp"
                      required
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    />
                    <datalist id="category-suggestions">
                      {CATEGORY_SUGGESTIONS.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Phạm vi áp dụng loại vay
                    </label>
                    <select
                      value={loanTypeScope}
                      onChange={(e) => setLoanTypeScope(e.target.value as LoanTypeScope)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    >
                      <option value="ALL">Tất cả hình thức vay</option>
                      <option value="THE_CHAP">Chỉ áp dụng vay thế chấp</option>
                      <option value="TIN_CHAP">Chỉ áp dụng vay tín chấp</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mô tả biểu mẫu (tùy chọn)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Ghi chú mục đích sử dụng, căn cứ pháp lý của biểu mẫu này..."
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-primary-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div className="sm:col-span-2 text-xs text-blue-900 font-semibold">
                    Cấu hình chung cho {selectedFiles.length} file tải lên (Tên và mã biểu mẫu sẽ được sinh tự động theo tên từng file):
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Nhóm biểu mẫu chung
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="VD: Hồ sơ thế chấp"
                      required
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    />
                    <datalist id="category-suggestions">
                      {CATEGORY_SUGGESTIONS.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Phạm vi áp dụng loại vay
                    </label>
                    <select
                      value={loanTypeScope}
                      onChange={(e) => setLoanTypeScope(e.target.value as LoanTypeScope)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                    >
                      <option value="ALL">Tất cả hình thức vay</option>
                      <option value="THE_CHAP">Chỉ áp dụng vay thế chấp</option>
                      <option value="TIN_CHAP">Chỉ áp dụng vay tín chấp</option>
                    </select>
                  </div>
                </div>
              )}
            </DialogBody>
          </form>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-9 px-4 text-xs"
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="upload-word-template-form"
            size="sm"
            isLoading={isPending}
            loadingText="Đang tải lên & quét từ khóa..."
            disabled={selectedFiles.length === 0}
            className="h-9 px-5 text-xs font-semibold"
          >
            {selectedFiles.length > 1
              ? `Tải lên ${selectedFiles.length} biểu mẫu cùng lúc`
              : 'Tải lên & Tự động quét từ khóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
