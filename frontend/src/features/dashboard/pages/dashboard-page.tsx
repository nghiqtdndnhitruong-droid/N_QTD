import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CreditCard,
  Plus,
  Users,
} from 'lucide-react';
import { LoanStatus, LoanTermType, LoanType } from '@/shared/types';
import { LOAN_TERM_TYPE_LABELS, LOAN_TYPE_LABELS } from '@/shared/constants';
import { formatDateVN, formatVND } from '@/shared/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoanStatusBadge,
  StatCard,
} from '@/components/ui';
import { CardGridSkeleton } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import { useMembersList } from '@/features/members/hooks/use-members';
import { useLoansList } from '@/features/loans/hooks/use-loans';

export function DashboardPage() {
  const navigate = useNavigate();
  const [maturingWindow, setMaturingWindow] = useState<7 | 30>(30);

  const { data: loansData, isLoading: isLoansLoading } = useLoansList({
    page: 1,
    limit: 100,
  });
  const { data: membersData } = useMembersList({ page: 1, limit: 1 });

  const allLoans = loansData?.items ?? [];
  const activeLoans = allLoans.filter(
    (l) => l.status === LoanStatus.DA_GIAI_NGAN || l.status === LoanStatus.QUA_HAN,
  );
  const overdueLoans = allLoans.filter((l) => l.status === LoanStatus.QUA_HAN);

  const totalApprovedActive = activeLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const totalOverdueAmount = overdueLoans.reduce((sum, l) => sum + l.loanAmount, 0);

  const unsecuredCount = allLoans.filter((l) => l.loanType === LoanType.TIN_CHAP).length;
  const mortgageCount = allLoans.filter((l) => l.loanType === LoanType.THE_CHAP).length;
  const shortTermCount = allLoans.filter((l) => l.termType === LoanTermType.NGAN_HAN).length;
  const mediumTermCount = allLoans.filter((l) => l.termType === LoanTermType.TRUNG_HAN).length;

  const now = Date.now();
  const maturingLoans = activeLoans.filter((l) => {
    if (!l.maturityDate) return false;
    const diffDays = Math.ceil((new Date(l.maturityDate).getTime() - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= maturingWindow;
  });

  const totalCount = Math.max(allLoans.length, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan Hoạt động Tín dụng"
        description="Theo dõi nhanh chỉ số dư nợ, cơ cấu khoản vay, hồ sơ sắp đến hạn và cảnh báo nợ quá hạn."
        actions={
          <Can perm="loan:create">
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/loans/new')}
            >
              Lập hồ sơ vay mới
            </Button>
          </Can>
        }
      />

      {isLoansLoading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng hạn mức đang dư nợ"
            value={formatVND(totalApprovedActive)}
            subtext={`${activeLoans.length} khoản vay đang hoạt động`}
            icon={<Banknote className="h-5 w-5" />}
            tone="primary"
          />
          <StatCard
            label="Tổng hồ sơ khoản vay"
            value={loansData?.pagination.total ?? allLoans.length}
            subtext={`Thế chấp: ${mortgageCount} · Tín chấp: ${unsecuredCount}`}
            icon={<CreditCard className="h-5 w-5" />}
            tone="default"
          />
          <StatCard
            label="Khoản vay quá hạn"
            value={`${overdueLoans.length} hồ sơ`}
            subtext={`Giá trị: ${formatVND(totalOverdueAmount)}`}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone={overdueLoans.length > 0 ? 'danger' : 'success'}
          />
          <StatCard
            label="Tổng số thành viên"
            value={membersData?.pagination.total ?? 0}
            subtext="Thành viên đang quản lý trên hệ thống"
            icon={<Users className="h-5 w-5" />}
            tone="success"
          />
        </div>
      )}

      {/* Cơ cấu khoản vay */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cơ cấu theo Hình thức vay</CardTitle>
              <CardDescription>Tỷ trọng giữa Vay thế chấp và Vay tín chấp</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{LOAN_TYPE_LABELS.THE_CHAP}</span>
                <span className="tabular-nums">
                  {mortgageCount} hồ sơ ({Math.round((mortgageCount / totalCount) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${Math.round((mortgageCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{LOAN_TYPE_LABELS.TIN_CHAP}</span>
                <span className="tabular-nums">
                  {unsecuredCount} hồ sơ ({Math.round((unsecuredCount / totalCount) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-info-600 transition-all"
                  style={{ width: `${Math.round((unsecuredCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cơ cấu theo Kỳ hạn vay</CardTitle>
              <CardDescription>Phân bổ Ngắn hạn (12 tháng) và Trung hạn (24 tháng)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{LOAN_TERM_TYPE_LABELS.NGAN_HAN}</span>
                <span className="tabular-nums">
                  {shortTermCount} hồ sơ ({Math.round((shortTermCount / totalCount) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-success-600 transition-all"
                  style={{ width: `${Math.round((shortTermCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>{LOAN_TERM_TYPE_LABELS.TRUNG_HAN}</span>
                <span className="tabular-nums">
                  {mediumTermCount} hồ sơ ({Math.round((mediumTermCount / totalCount) * 100)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-warning-600 transition-all"
                  style={{ width: `${Math.round((mediumTermCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Khoản vay sắp đáo hạn & Quá hạn */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Khoản vay sắp đáo hạn ({maturingLoans.length})</CardTitle>
              <CardDescription>
                Các khoản vay đến hạn tất toán trong {maturingWindow} ngày tới
              </CardDescription>
            </div>
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMaturingWindow(7)}
                className={`rounded px-2.5 py-1 font-medium ${
                  maturingWindow === 7 ? 'bg-primary-600 text-white' : 'text-slate-600'
                }`}
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setMaturingWindow(30)}
                className={`rounded px-2.5 py-1 font-medium ${
                  maturingWindow === 30 ? 'bg-primary-600 text-white' : 'text-slate-600'
                }`}
              >
                30 ngày
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {maturingLoans.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                <span>Không có khoản vay nào đáo hạn trong {maturingWindow} ngày tới.</span>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {maturingLoans.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/loans/${l.id}`)}
                      className="flex w-full items-center justify-between rounded px-2 py-2.5 text-left hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {l.member?.fullName ?? '—'}{' '}
                          <span className="font-mono text-primary-700">
                            ({l.contractNumber || 'Chưa cấp số khế ước'})
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Đáo hạn: <strong>{formatDateVN(l.maturityDate)}</strong>
                        </div>
                      </div>
                      <Badge tone="warning">{formatVND(l.loanAmount)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Khoản vay đang Quá hạn ({overdueLoans.length})</CardTitle>
              <CardDescription>
                Đã vượt quá 9 ngày kể từ ngày đáo hạn, cần ưu tiên đôn đốc thu hồi
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              onClick={() => navigate('/loans?status=QUA_HAN')}
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent>
            {overdueLoans.length === 0 ? (
              <div className="rounded-lg bg-success-50/70 p-4 text-xs font-medium text-success-700">
                Hiện tại không có khoản vay nào bị quá hạn.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {overdueLoans.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/loans/${l.id}`)}
                      className="flex w-full items-center justify-between rounded px-2 py-2.5 text-left hover:bg-danger-50/40"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {l.member?.fullName ?? '—'}{' '}
                          <span className="font-mono text-danger-700">
                            ({l.contractNumber || 'Chưa cấp số khế ước'})
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Đáo hạn: <strong>{formatDateVN(l.maturityDate)}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-danger-700 tabular-nums">
                          {formatVND(l.loanAmount)}
                        </span>
                        <LoanStatusBadge status={l.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
