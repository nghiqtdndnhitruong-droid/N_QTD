import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  FilePenLine,
  FileText,
  Printer,
  Trash2,
} from 'lucide-react';
import { LoanStatus, LoanType } from '@/shared/types';
import {
  GENDER_LABELS,
  ID_DOCUMENT_TYPE_LABELS,
  LOAN_STATUS_META,
  LOAN_TERM_TYPE_LABELS,
  LOAN_TYPE_LABELS,
} from '@/shared/constants';
import { formatDateVN, formatInterestRate, formatVND } from '@/shared/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescriptionItem,
  DescriptionList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoanStatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  Alert,
  ConfirmDialog,
  DetailPageSkeleton,
  ErrorState,
  notifyApiError,
  notifyInfo,
  notifySuccess,
} from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Can } from '@/features/auth/components/can';
import { isLoanEligibleForRelatedPerson } from '@/shared/utils/identity-document';
import { buildInterestExpenseItemName } from '../utils/loan-plan-templates';
import { CollateralsSection } from '../components/collaterals-section';
import { HouseholdMembersSection } from '../components/household-members-section';
import { LoanValuationSection } from '../components/loan-valuation-section';
import { DisbursementsSection } from '../components/disbursements-section';
import { LoanSummaryStrip } from '../components/loan-summary-strip';
import { RelatedPersonsSection } from '../components/related-persons-section';
import { RepaymentsSection } from '../components/repayments-section';
import { TemplateExportDialog } from '@/features/word-templates/components/template-export-dialog';
import { CollateralOwnerType } from '../types/loan.types';
import { LoanContractModal } from '../components/loan-contract-modal';
import {
  useDeleteLoan,
  useLoanDetail,
  useLoanSummary,
  useLoanValuations,
  useUpdateLoanStatus,
} from '../hooks/use-loans';

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statusTarget, setStatusTarget] = useState<LoanStatus | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  const { data: loan, isLoading, error, refetch } = useLoanDetail(id);
  const { data: valuations = [] } = useLoanValuations(id);
  const { data: summary, isLoading: isSummaryLoading } = useLoanSummary(id);
  const statusMutation = useUpdateLoanStatus(id ?? '');
  const deleteLoanMutation = useDeleteLoan();

  const hasHouseholdCollateral = useMemo(() => {
    const collaterals = loan?.collaterals ?? [];
    return collaterals.some(
      (c) =>
        c.ownerType === CollateralOwnerType.NGUOI_VAY_HO ||
        c.ownerType === CollateralOwnerType.NGUOI_THUA_KE_HO,
    );
  }, [loan?.collaterals]);

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !loan) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const isEditable = loan.status === LoanStatus.DANG_TAO;
  const isRelatedPersonEligible = isLoanEligibleForRelatedPerson(loan.loanType, loan.loanAmount);
  const valuationsCount = loan.valuations?.length ?? valuations.length;
  const activeDisbursements = (loan.disbursements ?? []).filter((d) => !d.isDeleted);
  const activeRepayments = (loan.repayments ?? []).filter((r) => !r.isDeleted);
  const hasFinancialTransactions =
    activeDisbursements.length > 0 ||
    activeRepayments.length > 0 ||
    loan.status === LoanStatus.DA_GIAI_NGAN ||
    loan.status === LoanStatus.QUA_HAN ||
    loan.status === LoanStatus.DA_TAT_TOAN;

  const canSettle =
    (loan.status === LoanStatus.DA_GIAI_NGAN || loan.status === LoanStatus.QUA_HAN) &&
    summary?.currentPrincipalBalance === 0;

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    try {
      await statusMutation.mutateAsync(statusTarget);
      notifySuccess('Đã cập nhật trạng thái hồ sơ khoản vay');
      setStatusTarget(null);
    } catch (err) {
      setStatusTarget(null);
      notifyApiError(err);
    }
  };

  const handleDeleteLoan = async () => {
    try {
      const res = await deleteLoanMutation.mutateAsync({
        id: loan.id,
        reason: 'Xóa hồ sơ vay từ màn hình chi tiết',
      });
      notifySuccess(
        `Đã xóa hồ sơ khoản vay ${res.contractNumber || `#${res.id.slice(-6)}`}`,
        res.releasedCollateralsCount > 0
          ? `Đã giải phóng ${res.releasedCollateralsCount} tài sản thế chấp đính kèm.`
          : undefined,
      );
      setConfirmDeleteOpen(false);
      navigate('/loans');
    } catch (err) {
      setConfirmDeleteOpen(false);
      notifyApiError(err);
    }
  };

  const handlePrintDocument = (docLabel: string) => {
    notifyInfo(
      `Đang yêu cầu in biểu mẫu: ${docLabel}`,
      'Kết nối endpoint GET /api/v1/loans/:id/documents/:type để tải file DOCX/PDF chuẩn của Quỹ.',
    );
  };

  const isMissingRelatedPerson =
    loan?.loanType === LoanType.THE_CHAP &&
    (loan?.loanAmount ?? 0) >= 140_000_000 &&
    (loan?.relatedPersons?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={
          <Link
            to="/loans"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Danh sách khoản vay</span>
          </Link>
        }
        title={loan.contractNumber || `Hồ sơ vay #${loan.id.slice(-6)} (Chưa cấp số khế ước)`}
        badge={<LoanStatusBadge status={loan.status} />}
        description={`Thành viên: ${loan.member?.fullName ?? '—'}${loan.member?.memberCode ? ` (${loan.member.memberCode})` : ' (Chưa cấp mã)'} · ${LOAN_TYPE_LABELS[loan.loanType]} · ${LOAN_TERM_TYPE_LABELS[loan.termType]}`}
        actions={
          <>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => setExportDialogOpen(true)}
            >
              Xuất biểu mẫu Word
            </Button>

            <Can perm="loan:delete">
              <Button
                variant="outline"
                size="sm"
                className="border-danger-200 text-danger-600 hover:bg-danger-50"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Xóa hồ sơ vay
              </Button>
            </Can>

            <Can perm="document:print">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="h-4 w-4" />}
                  >
                    In biểu mẫu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handlePrintDocument('Hợp đồng tín dụng')}>
                    <FileText className="h-4 w-4" />
                    <span>Hợp đồng tín dụng (.docx / .pdf)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handlePrintDocument('Khế ước nhận nợ')}>
                    <FileText className="h-4 w-4" />
                    <span>Khế ước nhận nợ (.docx / .pdf)</span>
                  </DropdownMenuItem>
                  {loan.loanType === LoanType.THE_CHAP && (
                    <DropdownMenuItem onSelect={() => handlePrintDocument('Hợp đồng thế chấp QSDĐ')}>
                      <FileText className="h-4 w-4" />
                      <span>Hợp đồng thế chấp QSDĐ (.docx / .pdf)</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => handlePrintDocument('Phiếu thu / Phiếu chi')}>
                    <FileText className="h-4 w-4" />
                    <span>Phiếu giải ngân / Phiếu thu lãi</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>

            {isEditable && (
              <>
                <Can perm="loan:update">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FilePenLine className="h-4 w-4" />}
                    onClick={() => navigate(`/loans/new?draft=${loan.id}`)}
                  >
                    Tiếp tục bổ sung hồ sơ
                  </Button>
                </Can>
                <Can perm="loan:change-status">
                  <Button
                    size="sm"
                    disabled={isMissingRelatedPerson}
                    title={
                      isMissingRelatedPerson
                        ? 'Hồ sơ thế chấp từ 140.000.000đ trở lên cần nhập người liên quan trước khi hoàn thành hồ sơ (chỉ cho phép lưu nháp).'
                        : undefined
                    }
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setStatusTarget(LoanStatus.DA_HOAN_THANH_HO_SO)}
                  >
                    Hoàn thành hồ sơ
                  </Button>
                </Can>
              </>
            )}

            {canSettle && (
              <Can perm="loan:change-status">
                <Button
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => setStatusTarget(LoanStatus.DA_TAT_TOAN)}
                >
                  Xác nhận Tất toán
                </Button>
              </Can>
            )}
          </>
        }
      />

      {/* Dải thẻ tóm tắt tài chính thời gian thực */}
      <LoanSummaryStrip summary={summary} isLoading={isSummaryLoading} />

      {/* Cảnh báo thiếu Người liên quan nếu khoản vay thế chấp >= 140tr */}
      {isRelatedPersonEligible && (loan.relatedPersons?.length ?? 0) === 0 && (
        <Alert
          tone="warning"
          title="Hồ sơ chưa bổ sung thông tin người liên quan"
        >
          Khoản vay thế chấp từ 140.000.000 ₫ trở lên thuộc diện áp dụng khai báo Người liên quan.
          Bạn có thể bổ sung thông tin bất kỳ lúc nào tại tab <strong>&ldquo;Người liên quan&rdquo;</strong>.
        </Alert>
      )}

      {/* Các Tab chi tiết hồ sơ */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan & Phương án vay</TabsTrigger>
          {isRelatedPersonEligible && (
            <TabsTrigger value="related-persons" className="gap-2">
              <span>Người liên quan ({loan.relatedPersons?.length ?? 0})</span>
              {(loan.relatedPersons?.length ?? 0) === 0 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  Chưa bổ sung
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="collaterals">
            {loan.loanType === LoanType.TIN_CHAP ? 'Tài sản kê khai' : 'Tài sản thế chấp'} (
            {loan.collaterals?.length ?? 0})
          </TabsTrigger>
          {loan.loanType === LoanType.THE_CHAP && hasHouseholdCollateral && (
            <TabsTrigger value="household-members" className="gap-2">
              <span>Thành viên hộ ({loan.householdMembers?.length ?? 0})</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="valuations">
            Định giá ({valuationsCount})
          </TabsTrigger>
          <TabsTrigger value="disbursements">
            Giải ngân ({activeDisbursements.length})
          </TabsTrigger>
          <TabsTrigger value="repayments">
            Thu nợ gốc & lãi ({activeRepayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Thông tin khoản vay & Khế ước */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Thông tin Hợp đồng & Khế ước</CardTitle>
                <Can perm="loan:update">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FilePenLine className="h-3.5 w-3.5" />}
                    onClick={() => setContractModalOpen(true)}
                  >
                    Cập nhật Khế ước / Chứng thực
                  </Button>
                </Can>
              </CardHeader>
              <CardContent>
                <DescriptionList columns={2}>
                  <DescriptionItem
                    label="Số khế ước nhận nợ"
                    value={
                      loan.contractNumber ? (
                        <span>{loan.contractNumber}</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Chưa cấp số khế ước</span>
                      )
                    }
                    mono
                  />
                  <DescriptionItem
                    label="Ngày lập khế ước"
                    value={
                      loan.contractDate ? (
                        <span>{formatDateVN(loan.contractDate)}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cấp ngày khế ước</span>
                      )
                    }
                    mono
                  />
                  {loan.loanType === LoanType.THE_CHAP && (
                    <>
                      <DescriptionItem
                        label="Số hợp đồng thế chấp"
                        value={loan.mortgageContract?.contractNumber || 'Chưa lưu HĐTC'}
                        mono
                      />
                      <DescriptionItem
                        label="Ngày chứng thực ủy ban"
                        value={
                          loan.mortgageContract?.committeeAuthDate ? (
                            <span>{formatDateVN(loan.mortgageContract.committeeAuthDate)}</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Chưa chứng thực ủy ban</span>
                          )
                        }
                        mono
                      />
                    </>
                  )}
                  <DescriptionItem
                    label="Hình thức vay"
                    value={LOAN_TYPE_LABELS[loan.loanType]}
                  />
                  <DescriptionItem
                    label="Kỳ hạn vay"
                    value={LOAN_TERM_TYPE_LABELS[loan.termType]}
                  />
                  <DescriptionItem
                    label="Số tiền vay"
                    value={formatVND(loan.loanAmount)}
                    mono
                  />
                  <DescriptionItem
                    label="Lãi suất năm (đã khóa)"
                    value={formatInterestRate(loan.interestRate)}
                    mono
                  />
                  <DescriptionItem
                    label="Ngày đáo hạn"
                    value={
                      loan.maturityDate ? (
                        <div>
                          <span>{formatDateVN(loan.maturityDate)}</span>
                          {loan.expectedMaturityDate &&
                            loan.expectedMaturityDate.slice(0, 10) !==
                              loan.maturityDate.slice(0, 10) && (
                              <div className="text-[11px] font-normal text-amber-700">
                                (Rút ngắn theo HĐ thế chấp; kỳ hạn gốc: {formatDateVN(loan.expectedMaturityDate)})
                              </div>
                            )}
                        </div>
                      ) : (
                        'Tính từ ngày giải ngân đầu tiên'
                      )
                    }
                    mono
                  />
                  {loan.halfTermPaymentDate && (
                    <DescriptionItem
                      label="Mốc trả 50% gốc (12 tháng)"
                      value={
                        <div>
                          <span>{formatDateVN(loan.halfTermPaymentDate)}</span>
                          {summary?.halfTermPaymentStatus && (
                            <div className="mt-0.5">
                              {summary.halfTermPaymentStatus === 'DA_HOAN_THANH' && (
                                <Badge tone="success">Đã hoàn thành ({formatVND(summary.halfTermPrincipalPaid ?? 0)} / {formatVND(summary.halfTermRequiredAmount ?? 0)})</Badge>
                              )}
                              {summary.halfTermPaymentStatus === 'DEN_HAN' && (
                                <Badge tone="warning">Đến hạn ({formatVND(summary.halfTermPrincipalPaid ?? 0)} / {formatVND(summary.halfTermRequiredAmount ?? 0)})</Badge>
                              )}
                              {summary.halfTermPaymentStatus === 'QUA_HAN' && (
                                <Badge tone="danger">Quá hạn ({formatVND(summary.halfTermPrincipalPaid ?? 0)} / {formatVND(summary.halfTermRequiredAmount ?? 0)})</Badge>
                              )}
                              {summary.halfTermPaymentStatus === 'CHUA_DEN_HAN' && (
                                <Badge tone="neutral">Chưa đến hạn ({formatVND(summary.halfTermPrincipalPaid ?? 0)} / {formatVND(summary.halfTermRequiredAmount ?? 0)})</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      }
                      mono
                    />
                  )}
                  <DescriptionItem
                    label="Ngày tất toán"
                    value={formatDateVN(loan.settlementDate)}
                    mono
                  />
                </DescriptionList>
              </CardContent>
            </Card>

            {/* Thông tin thành viên & Người thừa kế */}
            <Card>
              <CardHeader>
                <CardTitle>Thành viên vay & Người thừa kế</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loan.member && (
                  <DescriptionList columns={2}>
                    <DescriptionItem
                      label="Thành viên vay"
                      value={
                        <Link
                          to={`/members/${loan.member.id}`}
                          className="font-semibold text-primary-700 hover:underline"
                        >
                          {loan.member.fullName}{loan.member.memberCode ? ` (${loan.member.memberCode})` : ' (Chưa cấp mã)'}
                        </Link>
                      }
                    />
                    <DescriptionItem
                      label={ID_DOCUMENT_TYPE_LABELS[loan.member.idType]}
                      value={loan.member.idNumber}
                      mono
                    />
                    <DescriptionItem
                      label="Địa bàn thường trú người vay"
                      value={loan.member.address}
                      span={2}
                    />
                  </DescriptionList>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Người thừa kế / Đồng trách nhiệm
                  </div>
                  {loan.heir ? (
                    <DescriptionList columns={2}>
                      <DescriptionItem
                        label="Họ tên & Quan hệ"
                        value={`${loan.heir.fullName} (${loan.heir.relationship})`}
                      />
                      <DescriptionItem
                        label="Năm sinh / Giới tính"
                        value={`${loan.heir.yearOfBirth ?? '—'} (${loan.heir.gender ? GENDER_LABELS[loan.heir.gender] : '—'})`}
                      />
                      <DescriptionItem
                        label="Số CCCD"
                        value={loan.heir.idNumber}
                        mono
                      />
                      <DescriptionItem
                        label="Số điện thoại"
                        value={loan.heir.phoneNumber || '—'}
                        mono
                      />
                      <DescriptionItem label="Địa chỉ" value={loan.heir.address} span={2} />
                    </DescriptionList>
                  ) : (
                    <p className="text-xs text-slate-500">Không khai báo người thừa kế.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phương án sử dụng vốn vay */}
          <Card>
            <CardHeader>
              <CardTitle>Phương án sử dụng vốn vay</CardTitle>
              {loan.loanPlan?.profit !== undefined && (
                <Badge tone={loan.loanPlan.profit >= 0 ? 'success' : 'danger'}>
                  Lợi nhuận dự kiến: {formatVND(loan.loanPlan.profit)}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {!loan.loanPlan ? (
                <p className="text-xs text-slate-500">Chưa cập nhật phương án sử dụng vốn.</p>
              ) : (
                <div className="space-y-4">
                  <DescriptionList columns={4}>
                    <DescriptionItem
                      label="Mục đích vay"
                      value={loan.loanPlan.purpose}
                      span={2}
                    />
                    <DescriptionItem
                      label="Vốn tự có"
                      value={formatVND(loan.loanPlan.ownCapital)}
                      mono
                    />
                    <DescriptionItem
                      label="Vốn vay"
                      value={formatVND(loan.loanPlan.borrowedCapital)}
                      mono
                    />
                  </DescriptionList>

                  <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Khoản mục Chi phí</span>
                        <span className="tabular-nums">
                          Tổng: {formatVND(loan.loanPlan.totalExpenses)}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100 text-xs">
                        {loan.loanPlan.expenses.map((ex, i) => {
                          const isInterest = /Chi phí trả lãi|Trả lãi tiền vay/i.test(ex.name);
                          const termFactor =
                            loan.termType === 'TRUNG_HAN' ||
                            (loan.termMonths && loan.termMonths > 12)
                              ? 2
                              : 1;
                          const displayName = isInterest
                            ? buildInterestExpenseItemName(
                                loan.loanAmount,
                                loan.interestRate,
                                termFactor,
                                ex.amount,
                              )
                            : ex.name;

                          return (
                            <li key={i} className="flex justify-between py-1.5">
                              <span>{displayName}</span>
                              <span className="font-medium tabular-nums">
                                {formatVND(ex.amount)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Khoản mục Nguồn thu</span>
                        <span className="text-primary-700 tabular-nums">
                          Tổng: {formatVND(loan.loanPlan.totalRevenues)}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100 text-xs">
                        {loan.loanPlan.revenues.map((rv, i) => (
                          <li key={i} className="flex justify-between py-1.5">
                            <span>{rv.name}</span>
                            <span className="font-medium text-primary-700 tabular-nums">
                              {formatVND(rv.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <CollateralsSection
            loanId={loan.id}
            loanType={loan.loanType}
            loanAmount={loan.loanAmount}
            collaterals={loan.collaterals ?? []}
            readOnly={!isEditable}
            hasHeir={Boolean(loan.heir?.fullName?.trim())}
          />
          {loan.loanType === LoanType.THE_CHAP && hasHouseholdCollateral && (
            <HouseholdMembersSection
              loanId={loan.id}
              householdMembers={loan.householdMembers ?? []}
              borrowerAddress={loan.member?.address || ''}
              readOnly={!isEditable}
            />
          )}
        </TabsContent>

        {loan.loanType === LoanType.THE_CHAP && hasHouseholdCollateral && (
          <TabsContent value="household-members">
            <HouseholdMembersSection
              loanId={loan.id}
              householdMembers={loan.householdMembers ?? []}
              borrowerAddress={loan.member?.address || ''}
              readOnly={!isEditable}
            />
          </TabsContent>
        )}

        <TabsContent value="valuations">
          <LoanValuationSection
            loanId={loan.id}
            collaterals={loan.collaterals ?? []}
            readOnly={!isEditable}
          />
        </TabsContent>

        <TabsContent value="disbursements">
          <DisbursementsSection
            loanId={loan.id}
            loanStatus={loan.status}
            remainingDisbursableAmount={
              summary?.remainingDisbursableAmount ?? loan.loanAmount
            }
            disbursements={loan.disbursements ?? []}
          />
        </TabsContent>

        <TabsContent value="repayments">
          <RepaymentsSection
            loanId={loan.id}
            loanStatus={loan.status}
            contractNumber={loan.contractNumber}
            currentPrincipalBalance={summary?.currentPrincipalBalance ?? 0}
            unpaidInterestDays={summary?.unpaidInterestDays ?? 90}
            repayments={loan.repayments ?? []}
          />
        </TabsContent>

        {isRelatedPersonEligible && (
          <TabsContent value="related-persons">
            <RelatedPersonsSection
              loanId={loan.id}
              loanType={loan.loanType}
              loanAmount={loan.loanAmount}
              readOnly={!isEditable}
              borrowerAddress={loan.member?.address}
            />
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget === LoanStatus.DA_TAT_TOAN
            ? 'Xác nhận Tất toán hồ sơ khoản vay?'
            : 'Xác nhận Hoàn thành hồ sơ khoản vay?'
        }
        description={
          statusTarget === LoanStatus.DA_TAT_TOAN
            ? 'Dư nợ gốc đã bằng 0 ₫. Hồ sơ sẽ được đóng và chuyển sang trạng thái Đã tất toán.'
            : 'Hệ thống sẽ kiểm tra điều kiện tài sản thế chấp (≥ tiền vay / 70%) và Hợp đồng thế chấp trước khi chuyển sang Đã hoàn thành hồ sơ.'
        }
        confirmText="Xác nhận chuyển trạng thái"
        isLoading={statusMutation.isPending}
        onConfirm={handleStatusChange}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Xác nhận xóa hồ sơ khoản vay ${loan.contractNumber || 'Chưa cấp số khế ước'}?`}
        description={
          hasFinancialTransactions
            ? `CẢNH BÁO NGHIỆP VỤ: Khoản vay này đang ở trạng thái "${LOAN_STATUS_META[loan.status].label}" (${loan.disbursements?.length ?? 0} đợt giải ngân, ${loan.repayments?.length ?? 0} đợt trả nợ). Hệ thống KHÔNG cho phép xóa khoản vay đã có lịch sử kế toán. Vui lòng thực hiện nghiệp vụ Thu nợ / Tất toán.`
            : 'Khoản vay này chưa phát sinh giao dịch giải ngân hay thu nợ. Khi xóa, hệ thống sẽ vô hiệu hóa (Soft Delete) hồ sơ, giải phóng các tài sản thế chấp đính kèm và lưu vết vào Audit Log.'
        }
        confirmText="Xác nhận xóa"
        tone="danger"
        isLoading={deleteLoanMutation.isPending}
        onConfirm={handleDeleteLoan}
      />

      <TemplateExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        loanId={loan.id}
        contractNumber={loan.contractNumber}
        loanType={loan.loanType}
      />

      <LoanContractModal
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        loan={loan}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
