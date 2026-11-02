import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Download } from 'lucide-react';
import { LoanStatus } from '@/shared/types';
import { LOAN_TERM_TYPE_LABELS, LOAN_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND } from '@/shared/format';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoanStatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { notifyInfo } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import { useLoansList } from '@/features/loans/hooks/use-loans';

export function ReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'outstanding' | 'overdue' | 'settled'>('outstanding');

  const statusFilter =
    activeTab === 'outstanding'
      ? LoanStatus.DA_GIAI_NGAN
      : activeTab === 'overdue'
        ? LoanStatus.QUA_HAN
        : LoanStatus.DA_TAT_TOAN;

  const { data } = useLoansList({
    page: 1,
    limit: 50,
    status: statusFilter,
  });

  const rows = data?.items ?? [];
  const totalAmount = rows.reduce((sum, item) => sum + item.loanAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo & Thống kê Tín dụng"
        description="Tổng hợp danh sách dư nợ đang hoạt động, danh sách nợ quá hạn và các hồ sơ đã tất toán."
        actions={
          <Can perm="report:export">
            <Button
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() =>
                notifyInfo(
                  'Đang kết xuất báo cáo Excel',
                  `Xuất báo cáo (${activeTab}) từ máy chủ.`,
                )
              }
            >
              Xuất báo cáo Excel
            </Button>
          </Can>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="outstanding">Báo cáo Dư nợ đang hoạt động</TabsTrigger>
          <TabsTrigger value="overdue">Báo cáo Nợ quá hạn</TabsTrigger>
          <TabsTrigger value="settled">Hồ sơ Đã tất toán</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  {activeTab === 'outstanding'
                    ? 'Danh sách Khoản vay đang trong hạn'
                    : activeTab === 'overdue'
                      ? 'Danh sách Khoản vay Quá hạn cần thu hồi'
                      : 'Danh sách Khoản vay Đã tất toán'}
                </CardTitle>
                <CardDescription>
                  Tổng cộng {rows.length} hồ sơ · Tổng hạn mức:{' '}
                  <strong className="text-slate-900 tabular-nums">{formatVND(totalAmount)}</strong>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">Số khế ước</th>
                      <th className="px-4 py-2.5">Thành viên</th>
                      <th className="px-4 py-2.5">Hình thức</th>
                      <th className="px-4 py-2.5">Kỳ hạn</th>
                      <th className="px-4 py-2.5 text-right">Hạn mức vay</th>
                      <th className="px-4 py-2.5 text-right">Lãi suất</th>
                      <th className="px-4 py-2.5">Ngày đáo hạn</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                          Không có hồ sơ khoản vay nào trong nhóm báo cáo này.
                        </td>
                      </tr>
                    ) : (
                      rows.map((loan) => (
                        <tr
                          key={loan.id}
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          className="cursor-pointer hover:bg-primary-50/40"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-primary-700">
                            {loan.contractNumber || `#${loan.id.slice(-6)}`}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {loan.member?.fullName ?? '—'}
                          </td>
                          <td className="px-4 py-3">{LOAN_TYPE_LABELS[loan.loanType]}</td>
                          <td className="px-4 py-3">{LOAN_TERM_TYPE_LABELS[loan.termType]}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">
                            {formatVND(loan.loanAmount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatInterestRate(loan.interestRate)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateVN(loan.maturityDate)}
                          </td>
                          <td className="px-4 py-3">
                            <LoanStatusBadge status={loan.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

