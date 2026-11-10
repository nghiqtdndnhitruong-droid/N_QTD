import { useState, useRef, useEffect } from 'react';
import { FileUp, Upload } from 'lucide-react';
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
import { useUploadWordTemplate } from '../hooks/use-word-templates';
import type { LoanTypeScope } from '../types/word-template.types';

export interface TemplateUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (createdId: string) => void;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const uploadMutation = useUploadWordTemplate();

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Vui lòng chỉ chọn file Microsoft Word định dạng .docx');
      return;
    }
    setSelectedFile(file);

    // Tự động gợi ý tên và mã từ tên file
    if (!title) {
      const cleanName = file.name.replace(/\.docx$/i, '').trim();
      setTitle(cleanName);
    }
    if (!code) {
      const autoCode = file.name
        .replace(/\.docx$/i, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase()
        .slice(0, 30);
      setCode(autoCode);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Vui lòng chọn file biểu mẫu .docx');
      return;
    }
    if (!code.trim() || !title.trim() || !category.trim()) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    try {
      const created = await uploadMutation.mutateAsync({
        code: code.trim(),
        title: title.trim(),
        category: category.trim(),
        loanTypeScope,
        description: description.trim() || undefined,
        file: selectedFile,
      });

      notifySuccess(
        `Đã tải lên biểu mẫu "${created.title}"`,
        `Hệ thống đã tự động nhận diện ${created._count?.mappings ?? 0} từ khóa trong file.`,
      );

      onOpenChange(false);
      resetForm();
      if (onSuccess && created?.id) {
        onSuccess(created.id);
      }
    } catch (err) {
      notifyApiError(err);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Thêm biểu mẫu Word mới</DialogTitle>
          <DialogDescription>
            Tải lên file Word (.docx) mẫu. Hệ thống sẽ tự động quét cấu trúc để trích xuất các từ
            khóa `{'{{...}}'}` có trong tài liệu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Khu vực Drag & Drop Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : selectedFile
                  ? 'border-success-400 bg-success-50/30'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-success-600" />
                <div className="text-left">
                  <div className="font-semibold text-slate-800">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Bấm vào đây để chọn file khác
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <div className="text-xs font-semibold text-slate-700">
                  Kéo thả file .docx vào đây hoặc <span className="text-primary-600 underline">Chọn file</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Hỗ trợ định dạng .docx (Microsoft Word 2007 trở lên), tối đa 20MB
                </div>
              </div>
            )}
          </div>

          {/* Thông tin metadata */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tên biểu mẫu <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Hợp đồng thế chấp quyền sử dụng đất"
                required
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Mã biểu mẫu (duy nhất) <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: HDTC_2026"
                required
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs uppercase focus:border-primary-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nhóm biểu mẫu <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="VD: Hồ sơ thế chấp"
                required
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Phạm vi áp dụng loại vay
              </label>
              <select
                value={loanTypeScope}
                onChange={(e) => setLoanTypeScope(e.target.value as LoanTypeScope)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
              >
                <option value="ALL">Tất cả hình thức vay</option>
                <option value="THE_CHAP">Chỉ áp dụng vay thế chấp</option>
                <option value="TIN_CHAP">Chỉ áp dụng vay tín chấp</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Mô tả biểu mẫu (tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ghi chú mục đích sử dụng, căn cứ pháp lý của biểu mẫu này..."
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-primary-600 focus:outline-none"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={uploadMutation.isPending}
              loadingText="Đang phân tích & tải lên..."
            >
              Tải lên & Tự động quét từ khóa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
