import { useState } from 'react';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Building,
  AlertOctagon,
  Phone,
  ArrowRight,
  Search,
  Coins,
} from 'lucide-react';
import { formatVND } from '@/shared/format';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { DateInput, SelectInput } from '@/components/form';
import { notifyError, notifySuccess } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import {
  useDisbursedLoans,
  useMaturityLoans,
  useUnpaidInterestLoans,
} from '../hooks/use-reports';
import {
  downloadDisbursedLoansExcelApi,
  downloadMaturityLoansExcelApi,
  downloadUnpaidInterestExcelApi,
} from '../api/reports.api';

export function ReportsPage() {
  const navigate = useNavigate();

  // Tab chính: "disbursed" | "maturity" | "unpaid-interest"
  const [mainTab, setMainTab] = useState<'disbursed' | 'maturity' | 'unpaid-interest'>('disbursed');

  // --- State Tab 1: Khoản vay đã giải ngân ---
  const currentMonthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const [fromDate, setFromDate] = useState<string>(currentMonthStart);
  const [toDate, setToDate] = useState<string>(today);
  const [disbursedSubTab, setDisbursedSubTab] = useState<'theChap' | 'tinChap'>('theChap');
  const [isExportingDisbursed, setIsExportingDisbursed] = useState(false);

  // --- State Tab 2: Danh sách tới hạn ---
  const [selectedMonth, setSelectedMonth] = useState<string>(String(dayjs().month() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(dayjs().year()));
  const [isExportingMaturity, setIsExportingMaturity] = useState(false);

  // --- State Tab 3: Chậm đóng lãi ---
  const [unpaidMonthsFilter, setUnpaidMonthsFilter] = useState<string>('gte_3');
  const [unpaidSearch, setUnpaidSearch] = useState<string>('');
  const [isExportingUnpaid, setIsExportingUnpaid] = useState(false);

  // Queries
  const disbursedQuery = useDisbursedLoans(
    { fromDate, toDate },
    mainTab === 'disbursed',
  );

  const maturityQuery = useMaturityLoans(
    { month: selectedMonth, year: selectedYear },
    mainTab === 'maturity',
  );

  const unpaidQuery = useUnpaidInterestLoans(
    { months: unpaidMonthsFilter, search: unpaidSearch },
    mainTab === 'unpaid-interest',
  );

  // Export handlers
  const handleExportDisbursed = async () => {
    try {
      setIsExportingDisbursed(true);
      await downloadDisbursedLoansExcelApi({ fromDate, toDate });
      notifySuccess('Xuất file thành công', 'File Excel danh sách giải ngân đã được tải xuống.');
    } catch (err: any) {
      notifyError('Xuất file thất bại', err?.message || 'Không thể tạo file Excel.');
    } finally {
      setIsExportingDisbursed(false);
    }
  };

  const handleExportMaturity = async () => {
    try {
      setIsExportingMaturity(true);
      await downloadMaturityLoansExcelApi({ month: selectedMonth, year: selectedYear });
      notifySuccess('Xuất file thành công', 'File Excel danh sách tới hạn đã được tải xuống.');
    } catch (err: any) {
      notifyError('Xuất file thất bại', err?.message || 'Không thể tạo file Excel.');
    } finally {
      setIsExportingMaturity(false);
    }
  };

  const handleExportUnpaid = async () => {
    try {
      setIsExportingUnpaid(true);
      await downloadUnpaidInterestExcelApi({ months: unpaidMonthsFilter, search: unpaidSearch });
      notifySuccess('Xuất file thành công', 'File Excel danh sách chậm đóng lãi đã được tải xuống.');
    } catch (err: any) {
      notifyError('Xuất file thất bại', err?.message || 'Không thể tạo file Excel.');
    } finally {
      setIsExportingUnpaid(false);
    }
  };

  // Quick ranges for Disbursed Tab
  const setQuickRange = (type: 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    if (type === 'thisMonth') {
      setFromDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setToDate(dayjs().endOf('month').format('YYYY-MM-DD'));
    } else if (type === 'lastMonth') {
      setFromDate(dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'));
      setToDate(dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'));
    } else if (type === 'thisYear') {
      setFromDate(dayjs().startOf('year').format('YYYY-MM-DD'));
      setToDate(dayjs().endOf('year').format('YYYY-MM-DD'));
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Tháng ${i + 1}`,
  }));

  const currentYearNum = dayjs().year();
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const yr = String(currentYearNum - 2 + i);
    return { value: yr, label: `Năm ${yr}` };
  });

  const unpaidMonthsOptions = [
    { value: 'gte_3', label: 'Chậm từ 3 tháng trở lên (Mặc định)' },
    { value: '3', label: 'Chậm đúng 3 tháng' },
    { value: '4', label: 'Chậm đúng 4 tháng' },
    { value: 'gte_4', label: 'Chậm từ 4 tháng trở lên' },
    { value: 'all', label: 'Tất cả (từ 1 tháng trở lên)' },
  ];

  const disbursedData = disbursedQuery.data;
  const tinChapList = disbursedData?.tinChap?.items || [];
  const theChapList = disbursedData?.theChap?.items || [];
  const maturityList = maturityQuery.data?.items || [];
  const unpaidData = unpaidQuery.data;
  const unpaidList = unpaidData?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo & Thống kê Tín dụng"
        description="Xuất danh sách khoản vay đã giải ngân, danh sách tới hạn và theo dõi nợ chậm đóng lãi theo kỳ."
      />

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-2xl">
          <TabsTrigger value="disbursed" className="gap-2 text-xs md:text-sm">
            <FileSpreadsheet className="h-4 w-4" />
            Khoản vay đã giải ngân
          </TabsTrigger>
          <TabsTrigger value="maturity" className="gap-2 text-xs md:text-sm">
            <Clock className="h-4 w-4" />
            Danh sách tới hạn
          </TabsTrigger>
          <TabsTrigger value="unpaid-interest" className="gap-2 text-xs md:text-sm">
            <AlertOctagon className="h-4 w-4 text-amber-600" />
            Chậm đóng lãi
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KHOẢN VAY ĐÃ GIẢI NGÂN */}
        <TabsContent value="disbursed" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-600" />
                Bộ lọc thời gian giải ngân
              </CardTitle>
              <CardDescription>
                Nhập khoảng ngày để tra cứu và xuất file Excel có 2 sheet: <strong>Tín chấp</strong> và <strong>Thế chấp</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="w-full md:w-56">
                  <DateInput
                    label="Từ ngày (dd/mm/yyyy)"
                    value={fromDate}
                    onValueChange={(val) => setFromDate(val || '')}
                  />
                </div>
                <div className="w-full md:w-56">
                  <DateInput
                    label="Đến ngày (dd/mm/yyyy)"
                    value={toDate}
                    onValueChange={(val) => setToDate(val || '')}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickRange('thisMonth')}
                  >
                    Tháng này
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickRange('lastMonth')}
                  >
                    Tháng trước
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickRange('thisYear')}
                  >
                    Năm nay
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickRange('all')}
                  >
                    Tất cả
                  </Button>
                </div>
                <div className="md:ml-auto">
                  <Can perm="report:export">
                    <Button
                      variant="primary"
                      leftIcon={<Download className="h-4 w-4" />}
                      isLoading={isExportingDisbursed}
                      onClick={handleExportDisbursed}
                    >
                      Xuất file Excel (2 sheet)
                    </Button>
                  </Can>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thống kê nhanh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 ${
                disbursedSubTab === 'theChap'
                  ? 'border-primary-500 bg-primary-50/20'
                  : 'hover:border-slate-300'
              }`}
              onClick={() => setDisbursedSubTab('theChap')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary-600" />
                    Khoản vay Thế chấp
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {disbursedData?.theChap?.count || 0} hồ sơ
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Tổng dư nợ: <strong className="text-primary-700">{formatVND(disbursedData?.theChap?.totalAmount || 0)}</strong>
                  </div>
                  <div className="text-xs text-slate-500">
                    Tổng định giá: {formatVND(disbursedData?.theChap?.totalCollateralValue || 0)}
                  </div>
                </div>
                <div className="p-3 rounded-full bg-primary-100 text-primary-700 font-bold">
                  Sheet 2
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                disbursedSubTab === 'tinChap'
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'hover:border-slate-300'
              }`}
              onClick={() => setDisbursedSubTab('tinChap')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Khoản vay Tín chấp
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {disbursedData?.tinChap?.count || 0} hồ sơ
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Tổng dư nợ: <strong className="text-emerald-700">{formatVND(disbursedData?.tinChap?.totalAmount || 0)}</strong>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  Sheet 1
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bảng dữ liệu theo sheet đã chọn */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {disbursedSubTab === 'theChap'
                    ? 'Xem trước Sheet: THẾ CHẤP (12 cột)'
                    : 'Xem trước Sheet: TÍN CHẤP (11 cột)'}
                </CardTitle>
                <CardDescription>
                  {disbursedSubTab === 'theChap'
                    ? 'Cột Tổng giá trị tài sản nằm ngay trước cột Loại tài sản. Thời hạn trung hạn hiển thị mốc 1 năm.'
                    : 'Danh sách các khoản vay tín chấp đã giải ngân trong kỳ.'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={disbursedSubTab === 'theChap' ? 'primary' : 'outline'}
                  onClick={() => setDisbursedSubTab('theChap')}
                >
                  Thế chấp ({theChapList.length})
                </Button>
                <Button
                  size="sm"
                  variant={disbursedSubTab === 'tinChap' ? 'primary' : 'outline'}
                  onClick={() => setDisbursedSubTab('tinChap')}
                >
                  Tín chấp ({tinChapList.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {disbursedQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Đang tải danh sách khoản vay đã giải ngân...
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  {disbursedSubTab === 'theChap' ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                        <tr>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">STT</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Số HĐ</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Tên người vay</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Địa bàn</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Ngày vay</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Ngày tới hạn</th>
                          <th className="px-3 py-2.5 text-right border-r border-slate-200">Số tiền vay</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Số tờ</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Diện tích</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Mã tài sản</th>
                          <th className="px-3 py-2.5 text-right border-r border-slate-200 bg-amber-50 font-bold text-amber-900">
                            Tổng giá trị tài sản
                          </th>
                          <th className="px-3 py-2.5">Loại tài sản</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {theChapList.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="py-8 text-center text-slate-500">
                              Không có khoản vay thế chấp nào đã giải ngân trong khoảng thời gian này.
                            </td>
                          </tr>
                        ) : (
                          theChapList.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-primary-50/30 cursor-pointer"
                              onClick={() => navigate(`/loans/${item.id}`)}
                            >
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-mono">
                                {item.stt}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-mono font-semibold text-primary-700">
                                {item.contractNumber}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-semibold text-slate-900">
                                {item.borrowerName}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-slate-600">
                                {item.hamlet}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100">
                                {item.loanDate}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-medium text-amber-700">
                                {item.dueDate}
                              </td>
                              <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-900">
                                {formatVND(item.loanAmount)}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-mono">
                                {item.collateralCount > 0 ? item.collateralCount : '—'}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100">
                                {item.collateralArea || '—'}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-mono text-xs">
                                {item.collateralCodes || '—'}
                              </td>
                              <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold text-amber-800 bg-amber-50/40">
                                {formatVND(item.totalCollateralValue || 0)}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {item.collateralType || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {theChapList.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <tr>
                            <td colSpan={6} className="px-3 py-2.5 text-center uppercase">
                              Tổng cộng ({theChapList.length} hồ sơ)
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-primary-800">
                              {formatVND(disbursedData?.theChap?.totalAmount || 0)}
                            </td>
                            <td colSpan={3} className="px-3 py-2.5 border-r border-slate-200"></td>
                            <td className="px-3 py-2.5 text-right font-mono text-amber-900 bg-amber-100">
                              {formatVND(disbursedData?.theChap?.totalCollateralValue || 0)}
                            </td>
                            <td className="px-3 py-2.5"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                        <tr>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">STT</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Số HĐ</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Tên người vay</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Địa bàn</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Ngày vay</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Ngày tới hạn</th>
                          <th className="px-3 py-2.5 text-right border-r border-slate-200">Số tiền vay</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-200">Số tờ</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Diện tích</th>
                          <th className="px-3 py-2.5 border-r border-slate-200">Mã tài sản</th>
                          <th className="px-3 py-2.5">Loại tài sản</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {tinChapList.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-slate-500">
                              Không có khoản vay tín chấp nào đã giải ngân trong khoảng thời gian này.
                            </td>
                          </tr>
                        ) : (
                          tinChapList.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-primary-50/30 cursor-pointer"
                              onClick={() => navigate(`/loans/${item.id}`)}
                            >
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-mono">
                                {item.stt}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-mono font-semibold text-primary-700">
                                {item.contractNumber}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-semibold text-slate-900">
                                {item.borrowerName}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-slate-600">
                                {item.hamlet}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100">
                                {item.loanDate}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-medium text-amber-700">
                                {item.dueDate}
                              </td>
                              <td className="px-3 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-900">
                                {formatVND(item.loanAmount)}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-100 font-mono">
                                {item.collateralCount > 0 ? item.collateralCount : '—'}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100">
                                {item.collateralArea || '—'}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 font-mono text-xs">
                                {item.collateralCodes || '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {item.collateralType || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {tinChapList.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <tr>
                            <td colSpan={6} className="px-3 py-2.5 text-center uppercase">
                              Tổng cộng ({tinChapList.length} hồ sơ)
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-emerald-800">
                              {formatVND(disbursedData?.tinChap?.totalAmount || 0)}
                            </td>
                            <td colSpan={4} className="px-3 py-2.5"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DANH SÁCH TỚI HẠN */}
        <TabsContent value="maturity" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-600" />
                Chọn kỳ tới hạn (Tháng & Năm)
              </CardTitle>
              <CardDescription>
                Hệ thống tự động tính toán các khoản vay tới hạn trong tháng: bao gồm mốc 1 năm (trả 1/2 vốn cho vay trung hạn) và mốc đáo hạn toàn phần.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="w-full md:w-48">
                  <SelectInput
                    label="Chọn Tháng"
                    options={monthOptions}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <SelectInput
                    label="Chọn Năm"
                    options={yearOptions}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </div>
                <div className="md:ml-auto">
                  <Can perm="report:export">
                    <Button
                      variant="primary"
                      leftIcon={<Download className="h-4 w-4" />}
                      isLoading={isExportingMaturity}
                      onClick={handleExportMaturity}
                    >
                      Xuất file Excel tới hạn
                    </Button>
                  </Can>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tổng quan kỳ tới hạn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-amber-50/40 border-amber-200">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-amber-800">
                  Số khoản vay tới hạn trong Tháng {selectedMonth}/{selectedYear}
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-950">
                  {maturityQuery.data?.count || 0} hồ sơ
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary-50/40 border-primary-200">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-primary-800">
                  Tổng dư nợ tới hạn
                </div>
                <div className="mt-1 text-2xl font-bold text-primary-950">
                  {formatVND(maturityQuery.data?.totalAmount || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bảng Danh sách tới hạn */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Bảng danh sách khoản vay tới hạn Tháng {selectedMonth}/{selectedYear}
              </CardTitle>
              <CardDescription>
                Bao gồm các cột: STT, Họ tên, Số giấy tờ, Địa bàn (cấp Ấp), Số tiền vay, Ngày tới hạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maturityQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Đang tải danh sách khoản vay tới hạn...
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                      <tr>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200 w-12">STT</th>
                        <th className="px-3 py-2.5 border-r border-slate-200">Họ tên</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 font-mono">Số giấy tờ</th>
                        <th className="px-3 py-2.5 border-r border-slate-200">Địa bàn (Ấp)</th>
                        <th className="px-3 py-2.5 text-right border-r border-slate-200">Số tiền vay</th>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200">Ngày tới hạn</th>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200 font-mono">Số HĐ</th>
                        <th className="px-3 py-2.5 text-center">Hình thức / Kỳ hạn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {maturityList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Không có khoản vay nào tới hạn trong Tháng {selectedMonth}/{selectedYear}.
                          </td>
                        </tr>
                      ) : (
                        maturityList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-primary-50/30 cursor-pointer"
                            onClick={() => navigate(`/loans/${item.id}`)}
                          >
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-mono">
                              {item.stt}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-slate-900">
                              {item.borrowerName}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-700">
                              {item.idNumber || '—'}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-slate-700">
                              {item.hamlet}
                            </td>
                            <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono font-bold text-primary-800">
                              {formatVND(item.loanAmount)}
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-bold text-amber-700">
                              {item.dueDate}
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-mono text-slate-600">
                              {item.contractNumber}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                                {item.loanType} · {item.termType}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {maturityList.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={4} className="px-3 py-2.5 text-center uppercase">
                            Tổng cộng ({maturityList.length} hồ sơ)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-primary-800">
                            {formatVND(maturityQuery.data?.totalAmount || 0)}
                          </td>
                          <td colSpan={3} className="px-3 py-2.5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: KHOẢN VAY CHẬM ĐÓNG LÃI */}
        <TabsContent value="unpaid-interest" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-900">
                <AlertOctagon className="h-4 w-4 text-amber-600" />
                Bộ lọc khoản vay chậm đóng lãi
              </CardTitle>
              <CardDescription>
                Lọc các khoản vay 3 tháng, 4 tháng... chưa đóng lãi. Bấm vào bất kỳ khoản vay nào để <strong>chuyển ngay đến tab Thu lãi</strong> của khoản vay đó.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="w-full md:w-64">
                  <SelectInput
                    label="Số tháng chậm đóng lãi"
                    options={unpaidMonthsOptions}
                    value={unpaidMonthsFilter}
                    onChange={(e) => setUnpaidMonthsFilter(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-72">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tìm kiếm theo Tên / SĐT / Số HĐ
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nhập tên, số điện thoại, số HĐ..."
                      value={unpaidSearch}
                      onChange={(e) => setUnpaidSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="md:ml-auto">
                  <Can perm="report:export">
                    <Button
                      variant="primary"
                      leftIcon={<Download className="h-4 w-4" />}
                      isLoading={isExportingUnpaid}
                      onClick={handleExportUnpaid}
                    >
                      Xuất Excel chậm lãi
                    </Button>
                  </Can>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thống kê nợ lãi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5 text-amber-600" />
                  Số khoản vay chưa đóng lãi
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-950">
                  {unpaidData?.count || 0} hồ sơ
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  Tiêu chí: {unpaidMonthsOptions.find((o) => o.value === unpaidMonthsFilter)?.label}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary-50/50 border-primary-200">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-primary-800 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-primary-600" />
                  Tổng dư nợ gốc tồn đọng
                </div>
                <div className="mt-1 text-2xl font-bold text-primary-950">
                  {formatVND(unpaidData?.totalPrincipalBalance || 0)}
                </div>
                <div className="text-xs text-primary-700 mt-0.5">
                  Dư nợ gốc đang sinh lãi
                </div>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/50 border-rose-200">
              <CardContent className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-600" />
                  Tổng số tiền lãi chưa thu
                </div>
                <div className="mt-1 text-2xl font-bold text-rose-700">
                  {formatVND(unpaidData?.totalUnpaidInterest || 0)}
                </div>
                <div className="text-xs text-rose-600 mt-0.5">
                  Lãi ước tính tính đến ngày hôm nay
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bảng danh sách chậm đóng lãi */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Danh sách khoản vay chậm đóng lãi ({unpaidList.length} hồ sơ)
                </CardTitle>
                <CardDescription>
                  Bao gồm số điện thoại người vay để cán bộ liên lạc nhắc nợ, số ngày và số tiền lãi cần thu.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {unpaidQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Đang tải danh sách khoản vay chậm đóng lãi...
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                      <tr>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200 w-12">STT</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 font-mono">Số HĐ</th>
                        <th className="px-3 py-2.5 border-r border-slate-200">Người vay</th>
                        <th className="px-3 py-2.5 border-r border-slate-200 bg-amber-50 text-amber-900 font-bold">
                          Số điện thoại
                        </th>
                        <th className="px-3 py-2.5 border-r border-slate-200">Địa bàn</th>
                        <th className="px-3 py-2.5 text-right border-r border-slate-200">Dư nợ gốc</th>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200">Lãi suất</th>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200">Đóng lãi gần nhất</th>
                        <th className="px-3 py-2.5 text-center border-r border-slate-200 bg-rose-50 text-rose-900">
                          Chưa đóng
                        </th>
                        <th className="px-3 py-2.5 text-right border-r border-slate-200 bg-rose-50 text-rose-900 font-bold">
                          Số tiền lãi chưa đóng
                        </th>
                        <th className="px-3 py-2.5 text-center w-28">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {unpaidList.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-500">
                            Không có khoản vay nào chậm đóng lãi theo tiêu chí lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        unpaidList.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                            onClick={() => navigate(`/loans/${item.id}?tab=repayments`)}
                            title="Bấm để đến tab Thu lãi của khoản vay này"
                          >
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-mono">
                              {item.stt}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 font-mono font-semibold text-primary-700">
                              {item.contractNumber}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100">
                              <div className="font-bold text-slate-900">{item.borrowerName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{item.idNumber}</div>
                            </td>
                            <td
                              className="px-3 py-2.5 border-r border-slate-100 font-mono font-bold text-emerald-800 bg-amber-50/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.borrowerPhone && item.borrowerPhone !== '—' ? (
                                <a
                                  href={`tel:${item.borrowerPhone}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                >
                                  <Phone className="h-3 w-3" />
                                  {item.borrowerPhone}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Chưa có SĐT</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-slate-700">
                              {item.hamlet}
                            </td>
                            <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono font-bold text-slate-900">
                              {formatVND(item.principalBalance)}
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-mono text-slate-700">
                              {item.interestRate}%
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-mono text-slate-600">
                              {item.lastInterestDate}
                            </td>
                            <td className="px-3 py-2.5 text-center border-r border-slate-100 font-bold">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                                  item.unpaidMonths >= 4
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {item.unpaidMonths} tháng ({item.unpaidDays} ngày)
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right border-r border-slate-100 font-mono font-bold text-rose-700 bg-rose-50/30 text-sm">
                              {formatVND(item.unpaidInterest)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-primary-300 text-primary-700 hover:bg-primary-50 gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/loans/${item.id}?tab=repayments`);
                                }}
                              >
                                Thu lãi
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {unpaidList.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={5} className="px-3 py-2.5 text-center uppercase">
                            Tổng cộng ({unpaidList.length} hồ sơ)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-primary-800">
                            {formatVND(unpaidData?.totalPrincipalBalance || 0)}
                          </td>
                          <td colSpan={3} className="px-3 py-2.5 border-r border-slate-200"></td>
                          <td className="px-3 py-2.5 text-right font-mono text-rose-800 bg-rose-100 text-sm">
                            {formatVND(unpaidData?.totalUnpaidInterest || 0)}
                          </td>
                          <td className="px-3 py-2.5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
