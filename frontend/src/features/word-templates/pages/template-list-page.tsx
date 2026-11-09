import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Download,
  FileCode,
  FileText,
  Play,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
} from '@/components/ui';
import { PageHeader } from '@/components/layout';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import {
  useWordTemplates,
  useDeleteWordTemplate,
  useUpdateWordTemplate,
  useReorderWordTemplates,
  useDownloadOriginalTemplate,
} from '../hooks/use-word-templates';
import { TemplateUploadModal } from '../components/template-upload-modal';
import { TemplatePreviewModal } from '../components/template-preview-modal';
import type { WordTemplate } from '../types/word-template.types';

export function TemplateListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WordTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WordTemplate | null>(null);

  const { data: templates = [], isLoading } = useWordTemplates({
    search: search || undefined,
    category: selectedCategory || undefined,
  });

  const deleteMutation = useDeleteWordTemplate();
  const updateMutation = useUpdateWordTemplate();
  const downloadMutation = useDownloadOriginalTemplate();
  const reorderMutation = useReorderWordTemplates();

  const handleMove = async (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= templates.length) return;

    const currentItem = templates[index];
    const targetItem = templates[targetIndex];
    if (!currentItem || !targetItem) return;

    const newTemplates = [...templates];
    newTemplates[index] = targetItem;
    newTemplates[targetIndex] = currentItem;

    const reorderedItems = newTemplates.map((t, idx) => ({
      id: t.id,
      sortOrder: idx,
    }));

    try {
      await reorderMutation.mutateAsync(reorderedItems);
      notifySuccess(`Đã di chuyển biểu mẫu "${currentItem.title}" ${direction === 'UP' ? 'lên trên' : 'xuống dưới'}`);
    } catch (err) {
      notifyApiError(err);
    }
  };

  // Danh sách các nhóm biểu mẫu duy nhất
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  // Thống kê
  const activeCount = templates.filter((t) => t.isActive).length;

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteMutation.mutateAsync(deletingTemplate.id);
      notifySuccess(`Đã xóa biểu mẫu "${deletingTemplate.title}"`);
      setDeletingTemplate(null);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleToggleActive = async (template: WordTemplate) => {
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: { isActive: !template.isActive },
      });
      notifySuccess(
        `Đã ${!template.isActive ? 'kích hoạt' : 'ngừng sử dụng'} biểu mẫu "${template.title}"`,
      );
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleDownloadOriginal = (template: WordTemplate) => {
    downloadMutation.mutate({
      id: template.id,
      fileName: template.originalFileName || `${template.code}.docx`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý biểu mẫu Word"
        description="Quản lý các file mẫu Word (.docx), cấu hình từ khóa và quy tắc ánh xạ tự động điền dữ liệu cho hồ sơ vay vốn."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/templates/catalog">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<BookOpen className="h-4 w-4 text-slate-600" />}
              >
                Thư viện từ khóa & Cú pháp
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-sm"
            >
              Thêm mẫu Word mới
            </Button>
          </div>
        }
      />

      {/* Thẻ thống kê & Bộ lọc */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Tổng số biểu mẫu</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{templates.length}</div>
            </div>
            <FileText className="h-8 w-8 text-primary-500 opacity-80" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Đang sử dụng</div>
              <div className="mt-1 text-2xl font-bold text-success-600">{activeCount}</div>
            </div>
            <Badge tone="success" className="text-xs">
              Sẵn sàng xuất
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Số nhóm hồ sơ</div>
              <div className="mt-1 text-2xl font-bold text-info-600">{categories.length}</div>
            </div>
            <Badge tone="info" className="text-xs">
              Phân loại
            </Badge>
          </div>
        </Card>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên biểu mẫu, mã hoặc nhóm..."
            className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-xs focus:border-primary-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-primary-600 focus:outline-none"
          >
            <option value="">Tất cả nhóm biểu mẫu</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách biểu mẫu */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Đang tải danh sách biểu mẫu Word...
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCode className="mx-auto h-12 w-12 text-slate-300" />
          <div className="mt-3 text-sm font-semibold text-slate-800">
            Chưa có biểu mẫu Word nào
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Tải lên file Word mẫu đầu tiên để cấu hình ánh xạ dữ liệu tự động.
          </div>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setUploadModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Tải lên mẫu Word ngay
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, index) => (
            <Card
              key={template.id}
              className={`flex flex-col justify-between transition-shadow hover:shadow-md ${
                !template.isActive ? 'opacity-70 bg-slate-50' : 'bg-white'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(template)}
                    className="cursor-pointer text-left"
                    title={template.isActive ? 'Nhấp để tạm dừng mẫu' : 'Nhấp để kích hoạt mẫu'}
                  >
                    <Badge tone={template.isActive ? 'success' : 'neutral'}>
                      {template.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded border border-slate-200 bg-white">
                      <button
                        type="button"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 'UP')}
                        className="p-1 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Di chuyển lên trên"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-3 w-[1px] bg-slate-200" />
                      <button
                        type="button"
                        disabled={index === templates.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 'DOWN')}
                        className="p-1 text-slate-500 hover:text-primary-700 disabled:opacity-25 disabled:cursor-not-allowed"
                        title="Di chuyển xuống dưới"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      v{template.currentVersion}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h3
                    onClick={() => navigate(`/templates/${template.id}`)}
                    className="cursor-pointer font-bold text-slate-900 hover:text-primary-700 text-sm"
                  >
                    {template.title}
                  </h3>
                  <div className="mt-1 font-mono text-xs text-slate-500">{template.code}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <Badge tone="info">{template.category}</Badge>
                  <Badge tone="neutral">
                    {template.loanTypeScope === 'ALL'
                      ? 'Tất cả loại vay'
                      : template.loanTypeScope === 'THE_CHAP'
                        ? 'Chỉ thế chấp'
                        : 'Chỉ tín chấp'}
                  </Badge>
                  <Badge tone="primary">{template._count?.mappings ?? 0} từ khóa</Badge>
                </div>

                {template.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {template.description}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Tải file mẫu gốc"
                      onClick={() => handleDownloadOriginal(template)}
                      className="px-2"
                    >
                      <Download className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Kiểm tra & chạy thử"
                      onClick={() => setPreviewTemplate(template)}
                      className="px-2 text-primary-600"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Xóa mẫu"
                      onClick={() => setDeletingTemplate(template)}
                      className="px-2 text-danger-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/templates/${template.id}`)}
                    leftIcon={<Settings className="h-3.5 w-3.5" />}
                  >
                    Cấu hình
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Upload */}
      <TemplateUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={(createdId) => navigate(`/templates/${createdId}`)}
      />

      {/* Modal Preview */}
      {previewTemplate && (
        <TemplatePreviewModal
          open={Boolean(previewTemplate)}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          template={previewTemplate}
        />
      )}

      {/* Modal Xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        title={`Xác nhận xóa biểu mẫu "${deletingTemplate?.title}"?`}
        description="Thao tác này sẽ xóa biểu mẫu và toàn bộ cấu hình từ khóa đã thiết lập. Biểu mẫu đã xóa không thể khôi phục."
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
