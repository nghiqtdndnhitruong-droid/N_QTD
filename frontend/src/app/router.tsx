import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { env } from '@/config/env';
import { AppShell } from '@/components/layout';
import { DetailPageSkeleton } from '@/components/feedback';
import { ProtectedRoute, RequirePermission } from '@/features/auth/components/can';
import { LoginPage } from '@/features/auth/pages/login-page';
import { ForbiddenPage, NotFoundPage } from '@/features/auth/pages/error-pages';

// Lazy-load các trang nghiệp vụ để tối ưu kích thước Bundle ban đầu
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const MemberListPage = lazy(() =>
  import('@/features/members/pages/member-list-page').then((m) => ({ default: m.MemberListPage })),
);
const MemberFormPage = lazy(() =>
  import('@/features/members/pages/member-form-page').then((m) => ({ default: m.MemberFormPage })),
);
const MemberDetailPage = lazy(() =>
  import('@/features/members/pages/member-detail-page').then((m) => ({
    default: m.MemberDetailPage,
  })),
);
const LoanListPage = lazy(() =>
  import('@/features/loans/pages/loan-list-page').then((m) => ({ default: m.LoanListPage })),
);
const LoanCreatePage = lazy(() =>
  import('@/features/loans/pages/loan-create-page').then((m) => ({ default: m.LoanCreatePage })),
);
const LoanDetailPage = lazy(() =>
  import('@/features/loans/pages/loan-detail-page').then((m) => ({ default: m.LoanDetailPage })),
);
const InterestRatePage = lazy(() =>
  import('@/features/interest-rates/pages/interest-rate-page').then((m) => ({
    default: m.InterestRatePage,
  })),
);
const AssetPricingPage = lazy(() =>
  import('@/features/asset-pricing/pages/asset-pricing-page').then((m) => ({
    default: m.AssetPricingPage,
  })),
);
const AreaManagementPage = lazy(() =>
  import('@/features/areas/pages/area-management-page').then((m) => ({
    default: m.AreaManagementPage,
  })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/reports-page').then((m) => ({ default: m.ReportsPage })),
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/users-page').then((m) => ({ default: m.UsersPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/auth/pages/profile-page').then((m) => ({ default: m.ProfilePage })),
);
const DesignSystemPage = lazy(() =>
  import('@/features/dev/pages/design-system-page').then((m) => ({
    default: m.DesignSystemPage,
  })),
);

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<DetailPageSkeleton />}>{children}</Suspense>;
}

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            ),
          },
          {
            path: 'members',
            element: (
              <RequirePermission perm="member:view">
                <LazyPage>
                  <MemberListPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'members/new',
            element: (
              <RequirePermission perm="member:create">
                <LazyPage>
                  <MemberFormPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'members/:id',
            element: (
              <RequirePermission perm="member:view">
                <LazyPage>
                  <MemberDetailPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'members/:id/edit',
            element: (
              <RequirePermission perm="member:update">
                <LazyPage>
                  <MemberFormPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'loans',
            element: (
              <RequirePermission perm="loan:view">
                <LazyPage>
                  <LoanListPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'loans/new',
            element: (
              <RequirePermission perm="loan:create">
                <LazyPage>
                  <LoanCreatePage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'loans/:id',
            element: (
              <RequirePermission perm="loan:view">
                <LazyPage>
                  <LoanDetailPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'reports',
            element: (
              <RequirePermission perm="report:view">
                <LazyPage>
                  <ReportsPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'settings/areas',
            element: (
              <RequirePermission perm="area:view">
                <LazyPage>
                  <AreaManagementPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'settings/interest-rates',
            element: (
              <RequirePermission perm="interest-rate:view">
                <LazyPage>
                  <InterestRatePage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'settings/asset-pricing',
            element: (
              <RequirePermission perm="asset-pricing:view">
                <LazyPage>
                  <AssetPricingPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'admin/users',
            element: (
              <RequirePermission perm="user:view">
                <LazyPage>
                  <UsersPage />
                </LazyPage>
              </RequirePermission>
            ),
          },
          {
            path: 'profile',
            element: (
              <LazyPage>
                <ProfilePage />
              </LazyPage>
            ),
          },
          ...(env.isDev
            ? [
                {
                  path: 'dev/ui',
                  element: (
                    <LazyPage>
                      <DesignSystemPage />
                    </LazyPage>
                  ),
                },
              ]
            : []),
          {
            path: '403',
            element: <ForbiddenPage />,
          },
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);

