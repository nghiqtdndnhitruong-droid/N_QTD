import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Code2,
  Copy,
  Database,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
} from '@/components/ui';
import { PageHeader } from '@/components/layout';
import { ConfirmDialog, notifyApiError, notifySuccess } from '@/components/feedback';
import {
  useWordTemplateCatalog,
  useCreateCatalogKeyword,
  useUpdateCatalogKeyword,
  useDeleteCatalogKeyword,
  useDataSources,
} from '../hooks/use-word-templates';
import { DataSourceTreeSelect } from '../components/data-source-tree-select';
import type { GlobalWordKeyword, MappingDataType } from '../types/word-template.types';

const CATEGORIES = [
  { value: 'ALL', label: 'Tất cả nhóm' },
  { value: 'NGUOI_VAY', label: 'Người vay / Thành viên' },
  { value: 'KHOAN_VAY', label: 'Khoản vay & Khế ước' },
  { value: 'TAI_SAN', label: 'Tài sản bảo đảm' },
  { value: 'NGUOI_LIEN_QUAN', label: 'Người liên quan' },
  { value: 'NGUOI_THUA_KE', label: 'Người thừa kế' },
  { value: 'QUY_TIN_DUNG', label: 'Quỹ tín dụng nhân dân' },
  { value: 'CHUNG', label: 'Khác / Chung' },
];

const DATA_TYPES: { value: MappingDataType; label: string }[] = [
  { value: 'TEXT', label: 'Văn bản thường' },
  { value: 'DATE', label: 'Ngày tháng (DD/MM/YYYY)' },
  { value: 'CURRENCY', label: 'Số tiền bằng số (VND)' },
  { value: 'CURRENCY_WORDS', label: 'Số tiền bằng chữ tiếng Việt' },
  { value: 'GENDER_TITLE', label: 'Danh xưng (Ông/Bà)' },
  { value: 'NUMBER', label: 'Số lượng / Phần trăm' },
  { value: 'BOOLEAN', label: 'Đúng / Sai (Logic)' },
  { value: 'LIST', label: 'Danh sách lặp bảng' },
];

export function TemplateCatalogPage() {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'SYNTAX'>('CATALOG');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal thêm / sửa từ khóa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<GlobalWordKeyword | null>(null);
  const [deletingKeyword, setDeletingKeyword] = useState<GlobalWordKeyword | null>(null);

  // Form state
  const [formKeyword, setFormKeyword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formCategory, setFormCategory] = useState('NGUOI_VAY');
  const [formDataPath, setFormDataPath] = useState('');
  const [formDataType, setFormDataType] = useState<MappingDataType>('TEXT');
  const [formDefaultValue, setFormDefaultValue] = useState('...................');

  const { data: keywords = [], isLoading } = useWordTemplateCatalog({
    category: category !== 'ALL' ? category : undefined,
    search: search || undefined,
  });

  const { data: dataSources = [] } = useDataSources();

  const createMutation = useCreateCatalogKeyword();
  const updateMutation = useUpdateCatalogKeyword();
  const deleteMutation = useDeleteCatalogKeyword();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    notifySuccess(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openCreateModal = () => {
    setEditingKeyword(null);
    setFormKeyword('');
    setFormDisplayName('');
    setFormCategory('NGUOI_VAY');
    setFormDataPath('');
    setFormDataType('TEXT');
    setFormDefaultValue('...................');
    setModalOpen(true);
  };

  const openEditModal = (kw: GlobalWordKeyword) => {
    setEditingKeyword(kw);
    setFormKeyword(kw.keyword);
    setFormDisplayName(kw.displayName);
    setFormCategory(kw.category);
    setFormDataPath(kw.dataPath);
    setFormDataType(kw.dataType);
    setFormDefaultValue(kw.defaultValue || '...................');
    setModalOpen(true);
  };

  const handleSaveKeyword = async () => {
    if (!formKeyword.trim()) {
      notifyApiError(new Error('Vui lòng nhập mã từ khóa'));
      return;
    }
    if (!formDataPath.trim()) {
      notifyApiError(new Error('Vui lòng chọn nguồn dữ liệu hệ thống'));
      return;
    }

    try {
      if (editingKeyword) {
        const res = await updateMutation.mutateAsync({
          id: editingKeyword.id,
          data: {
            displayName: formDisplayName || formKeyword,
            category: formCategory,
            dataPath: formDataPath,
            dataType: formDataType,
            defaultValue: formDefaultValue,
          },
        });
        if (res.affectedTemplates && res.affectedTemplates.length > 0) {
          notifySuccess(
            `Đã cập nhật từ khóa "${formKeyword}". Đã đồng bộ sang ${res.affectedTemplates.length} mẫu Word đang sử dụng.`,
          );
        } else {
          notifySuccess(`Đã cập nhật từ khóa "${formKeyword}"`);
        }
      } else {
        await createMutation.mutateAsync({
          keyword: formKeyword,
          displayName: formDisplayName || formKeyword,
          category: formCategory,
          dataPath: formDataPath,
          dataType: formDataType,
          defaultValue: formDefaultValue,
        });
        notifySuccess(`Đã thêm từ khóa "${formKeyword}" vào Thư viện`);
      }
      setModalOpen(false);
    } catch (err) {
      notifyApiError(err);
    }
  };

  const handleDeleteKeyword = async () => {
    if (!deletingKeyword) return;
    try {
      await deleteMutation.mutateAsync(deletingKeyword.id);
      notifySuccess(`Đã xóa từ khóa "${deletingKeyword.keyword}"`);
      setDeletingKeyword(null);
    } catch (err) {
      notifyApiError(err);
    }
  };

  // Thống kê
  const stats = useMemo(() => {
    return {
      total: keywords.length,
      system: keywords.filter((k) => k.isSystem).length,
      inUse: keywords.filter((k) => (k.usageCount || 0) > 0).length,
    };
  }, [keywords]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thư viện từ khóa & Cú pháp template"
        description="Quản lý danh mục từ khóa toàn cục dùng chung cho mọi file Word, tra cứu cú pháp IF–ELSE, vòng lặp FOR, chỉ mục và quy tắc định dạng."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/templates">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Danh sách mẫu Word
              </Button>
            </Link>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateModal}
            >
              Thêm từ khóa mới
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('CATALOG')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'CATALOG'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="h-4 w-4" />
          Thư viện từ khóa dùng chung ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SYNTAX')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'SYNTAX'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="h-4 w-4" />
          Bảng tra cứu cú pháp & Hướng dẫn (Docs)
        </button>
      </div>

      {activeTab === 'CATALOG' ? (
        <div className="space-y-4">
          {/* Bộ lọc & Tìm kiếm */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm từ khóa, tên mô tả hoặc đường dẫn dữ liệu..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs focus:border-primary-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none w-56"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bảng danh sách từ khóa */}
          <Card className="overflow-hidden border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Mã từ khóa Word</th>
                    <th className="px-4 py-3">Tên hiển thị</th>
                    <th className="px-4 py-3">Nhóm dữ liệu</th>
                    <th className="px-4 py-3">Nguồn hệ thống</th>
                    <th className="px-4 py-3">Kiểu dữ liệu</th>
                    <th className="px-4 py-3 text-center">Đang dùng</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Đang tải danh mục từ khóa...
                      </td>
                    </tr>
                  ) : keywords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không tìm thấy từ khóa nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    keywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{`{{${kw.keyword}}}`}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`{{${kw.keyword}}}`)}
                              className="text-slate-400 hover:text-primary-600 p-0.5"
                              title="Sao chép từ khóa vào clipboard"
                            >
                              {copiedKey === `{{${kw.keyword}}}` ? (
                                <Check className="h-3.5 w-3.5 text-success-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {kw.displayName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="info">
                            {CATEGORIES.find((c) => c.value === kw.category)?.label || kw.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-primary-700">
                          {kw.dataPath}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">
                            {kw.dataType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(kw.usageCount || 0) > 0 ? (
                            <Badge tone="success">
                              {kw.usageCount} mẫu Word
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa dùng</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary-600 text-xs px-2"
                              onClick={() => openEditModal(kw)}
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger-600 text-xs px-2 hover:bg-danger-50"
                              title="Xóa từ khóa"
                              onClick={() => setDeletingKeyword(kw)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* TAB 2: HƯỚNG DẪN CÚ PHÁP CHUẨN (DOCS & CHEAT SHEET) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: IF - ELSE IF - ELSE */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>1. Điều kiện rẽ nhánh (IF – ELSE IF – ELSE)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dùng để quyết định đoạn văn hoặc nội dung nào được hiển thị trong tài liệu Word theo dữ liệu thực tế của hồ sơ vay.
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-700">Cú pháp chuẩn:</span>
                <div className="relative mt-1 rounded bg-slate-900 p-3 font-mono text-xs text-emerald-400">
                  {`{{#IF DIEU_KIEN}}
  Nội dung khi đúng
{{#ELSE IF DIEU_KIEN_2}}
  Nội dung khi điều kiện 2 đúng
{{#ELSE}}
  Nội dung mặc định
{{/IF}}`}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(`{{#IF DIEU_KIEN}}\n  ...\n{{#ELSE}}\n  ...\n{{/IF}}`)
                    }
                    className="absolute right-2 top-2 rounded bg-slate-800 p-1 text-slate-400 hover:text-white"
                    title="Sao chép"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700">Các toán tử an toàn được hỗ trợ:</span>
                <ul className="mt-1 list-disc pl-5 text-xs text-slate-600 space-y-1">
                  <li>So sánh bằng: <code>==</code>, khác: <code>!=</code></li>
                  <li>So sánh số: <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code></li>
                  <li>Kết hợp logic: <code>AND</code> (hoặc <code>&&</code>), <code>OR</code> (hoặc <code>||</code>), <code>NOT</code> (hoặc <code>!</code>)</li>
                  <li>Kiểm tra có dữ liệu / danh sách có phần tử: <code>CO_NGUOI_THUA_KE</code></li>
                </ul>
              </div>

              <div className="rounded bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                <strong>Ví dụ thực tế:</strong>
                <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap">
{`{{#IF KHOAN_VAY.LOAI_VAY == "THE_CHAP"}}
Cho vay có bảo đảm bằng tài sản
{{#ELSE}}
Cho vay tín chấp
{{/IF}}`}
                </pre>
              </div>
            </div>
          </Card>

          {/* Card 2: VÒNG LẶP FOR & LẶP BẢNG */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
              <Database className="h-5 w-5 text-primary-600" />
              <span>2. Vòng lặp danh sách (FOR Loop)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dùng để lặp danh sách bản ghi thực tế (Tài sản thế chấp, Người liên quan, Người thừa kế). Khi đặt trong bảng Word, hệ thống sẽ tự động nhân bản dòng bảng tương ứng.
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-700">Cú pháp lặp đoạn văn hoặc bảng:</span>
                <div className="relative mt-1 rounded bg-slate-900 p-3 font-mono text-xs text-emerald-400">
                  {`{{#FOR ts IN DANH_SACH_TAI_SAN}}
  Mã: {{ts.MA_TAI_SAN}} - Chủ: {{ts.CHU_SO_HUU}}
{{/FOR}}`}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(`{{#FOR ts IN DANH_SACH_TAI_SAN}}\n  {{ts.MA_TAI_SAN}}\n{{/FOR}}`)
                    }
                    className="absolute right-2 top-2 rounded bg-slate-800 p-1 text-slate-400 hover:text-white"
                    title="Sao chép"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700">Biến điều khiển vị trí trong vòng lặp:</span>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <code>{`{{@number}}`}</code>: Số thứ tự bắt đầu từ <strong>1</strong> (1, 2, 3...)
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <code>{`{{@index}}`}</code>: Chỉ số vị trí bắt đầu từ <strong>0</strong> (0, 1, 2...)
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <code>{`{{@first}}`}</code>: <code>true</code> nếu là phần tử đầu tiên
                  </div>
                  <div className="rounded border border-slate-100 bg-slate-50 p-2">
                    <code>{`{{@last}}`}</code>: <code>true</code> nếu là phần tử cuối cùng
                  </div>
                </div>
              </div>

              <div className="rounded bg-sky-50 p-3 text-xs text-sky-900 border border-sky-200">
                <strong>Cách lặp hàng trong bảng Word:</strong>
                <p className="mt-1 text-[11px]">
                  Đặt <code>{`{{#FOR ts IN DANH_SACH_TAI_SAN}}{{@number}}`}</code> ở cột STT đầu tiên, và đặt <code>{`{{ts.TEN_TAI_SAN}}{{/FOR}}`}</code> ở cột cuối cùng của dòng đó. Hệ thống sẽ tự động nhân bản dòng bảng giữ nguyên viền và font chữ.
                </p>
              </div>
            </div>
          </Card>

          {/* Card 3: TRUY CẬP PHẦN TỬ BẰNG INDEX */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
              <Code2 className="h-5 w-5 text-indigo-600" />
              <span>3. Truy cập phần tử bằng Index ngoài vòng lặp</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi biểu mẫu chỉ muốn lấy thông tin của một tài sản cụ thể hoặc người liên quan đầu tiên:
            </p>

            <div className="space-y-2">
              <div className="rounded bg-slate-900 p-3 font-mono text-xs text-emerald-400">
                {`Tài sản số 1: {{DANH_SACH_TAI_SAN[0].MA_TAI_SAN}}
Tài sản số 2: {{DANH_SACH_TAI_SAN[1].MA_TAI_SAN}}
Người liên quan đầu tiên: {{DANH_SACH_NGUOI_LIEN_QUAN[0].HO_TEN}}`}
              </div>
              <p className="text-xs text-slate-500">
                Nếu hồ sơ không có phần tử tại vị trí yêu cầu (ví dụ chỉ có 1 tài sản mà gọi vị trí <code>[1]</code>), hệ thống sẽ tự động điền dấu chấm <code>...................</code> mà không báo lỗi.
              </p>
            </div>
          </Card>

          {/* Card 4: VÒNG LẶP LỒNG NHAU & KẾT HỢP IF-ELSE */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span>4. Kết hợp IF trong FOR và Vòng lặp lồng nhau</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hỗ trợ kiểm tra điều kiện từng phần tử bên trong vòng lặp hoặc lặp qua danh sách con:
            </p>

            <div className="rounded bg-slate-900 p-3 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
{`{{#FOR ts IN DANH_SACH_TAI_SAN}}
  Tài sản {{@number}}: {{ts.MA_TAI_SAN}}
  {{#IF ts.SO_GCN}}
    Số GCN: {{ts.SO_GCN}}
  {{#ELSE}}
    Chưa cấp GCN
  {{/IF}}
{{/FOR}}`}
            </div>
          </Card>

          {/* Card 5: TỪ KHÓA GỘP TÀI SẢN (TAI_SAN.*_GOP) */}
          <Card className="p-5 border border-slate-200 bg-white space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-3">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <span>5. Từ khóa gộp tài sản (TAI_SAN.TÊN_CỤ_THỂ_GOP)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống tự động tổng hợp thông tin khi hồ sơ có nhiều tài sản và nối bằng dấu chấm phẩy <code>; </code>. 
              <strong>Lưu ý nguyên tắc gộp:</strong> Chỉ phân cách bởi dấu chấm phẩy khi các tài sản có giá trị khác nhau. Nếu giá trị giống nhau thì chỉ hiển thị 1 giá trị duy nhất.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded bg-slate-900 p-3 font-mono text-emerald-400">
                {`Mã tài sản gộp: {{TAI_SAN.MA_TAI_SAN_GOP}}
Số GCN gộp: {{TAI_SAN.SO_GCN_GOP}}
Số vào sổ gộp: {{TAI_SAN.SO_VAO_SO_GOP}}
Số thửa gộp: {{TAI_SAN.SO_THUA_GOP}}
Số tờ bản đồ gộp: {{TAI_SAN.SO_TO_GOP}}`}
              </div>
              <div className="rounded bg-slate-900 p-3 font-mono text-emerald-400">
                {`Diện tích gộp: {{TAI_SAN.DIEN_TICH_GOP}}
Tổng diện tích: {{TONG_DIEN_TICH}}
Địa chỉ gộp: {{TAI_SAN.DIA_CHI_GOP}}
Chủ sở hữu gộp: {{TAI_SAN.CHU_SO_HUU_GOP}}
Ngày cấp GCN gộp: {{TAI_SAN.NGAY_CAP_GOP}}
Mục đích sử dụng gộp: {{TAI_SAN.MUC_DICH_SU_DUNG_GOP}}`}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa từ khóa trong Catalog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingKeyword ? 'Chỉnh sửa từ khóa toàn cục' : 'Thêm từ khóa mới vào Thư viện'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {editingKeyword && (editingKeyword.usageCount || 0) > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Cảnh báo sử dụng:</strong> Từ khóa này đang được{' '}
                  <span className="font-bold">{editingKeyword.usageCount}</span> mẫu Word sử dụng. Khi bạn thay đổi nguồn dữ liệu, tất cả các mẫu Word đó sẽ tự động được cập nhật.
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Mã từ khóa Word</label>
                <input
                  type="text"
                  placeholder="VD: HO_TEN_NGUOI_VAY, NGUOI_VAY.HO_TEN..."
                  value={formKeyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormKeyword(e.target.value.toUpperCase())}
                  disabled={Boolean(editingKeyword)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tên hiển thị dễ hiểu</label>
                <input
                  type="text"
                  placeholder="VD: Họ và tên người vay..."
                  value={formDisplayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDisplayName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nhóm dữ liệu</label>
                  <select
                    value={formCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormCategory(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Kiểu dữ liệu</label>
                  <select
                    value={formDataType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormDataType(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                  >
                    {DATA_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Nguồn dữ liệu hệ thống (Data Path)
                </label>
                <div className="mt-1">
                  <DataSourceTreeSelect
                    groups={dataSources}
                    value={formDataPath}
                    onChange={(newPath) => {
                      setFormDataPath(newPath);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Giá trị mặc định khi trống
                </label>
                <input
                  type="text"
                  placeholder="..................."
                  value={formDefaultValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDefaultValue(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleSaveKeyword}
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                Lưu từ khóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm xóa từ khóa */}
      <ConfirmDialog
        open={Boolean(deletingKeyword)}
        onOpenChange={(open) => !open && setDeletingKeyword(null)}
        title="Xóa từ khóa khỏi Thư viện"
        description={
          (deletingKeyword?.usageCount || 0) > 0
            ? `Từ khóa "${deletingKeyword?.keyword}" đang được sử dụng trong ${deletingKeyword?.usageCount} mẫu Word. Khi xóa, cấu hình từ khóa này sẽ bị xóa khỏi các mẫu Word liên quan. Bạn có chắc chắn muốn xóa?`
            : `Bạn có chắc chắn muốn xóa từ khóa "${deletingKeyword?.keyword}"? Thao tác này không thể hoàn tác.`
        }
        confirmText="Xóa vĩnh viễn"
        tone="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteKeyword}
      />
    </div>
  );
}
