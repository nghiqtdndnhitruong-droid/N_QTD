import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  LogOut,
  Menu,
  Plus,
  User as UserIcon,
} from 'lucide-react';
import { env } from '@/config/env';
import { BREADCRUMB_NAME_MAP, NAVIGATION_SECTIONS } from '@/app/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore, type UserRole } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { usePermission } from '@/features/auth/hooks/use-permission';
import { logoutApi } from '@/features/auth/api/auth.api';
import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '../ui';

function SidebarNavigation({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { can } = usePermission();

  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-2.5 py-4">
      <div className="space-y-5">
        {NAVIGATION_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.permission || can(item.permission),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const linkNode = (
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'text-slate-300 hover:bg-primary-800 hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );

                  return (
                    <li key={item.to}>
                      {collapsed ? (
                        <Tooltip content={item.label} side="right">
                          {linkNode}
                        </Tooltip>
                      ) : (
                        linkNode
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs sm:flex">
      <Link to="/" className="font-medium text-slate-500 hover:text-slate-800">
        Trang chủ
      </Link>
      {segments.map((seg, idx) => {
        const path = `/${segments.slice(0, idx + 1).join('/')}`;
        const isLast = idx === segments.length - 1;
        const label =
          BREADCRUMB_NAME_MAP[seg] ?? (seg.length > 14 ? `Chi tiết #${seg.slice(-6)}` : seg);

        return (
          <span key={path} className="inline-flex items-center gap-1.5">
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="font-semibold text-slate-800">{label}</span>
            ) : (
              <Link to={path} className="font-medium text-slate-500 hover:text-slate-800">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const switchMockRole = useAuthStore((s) => s.switchMockRole);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const { can } = usePermission();

  const handleLogout = async () => {
    await logoutApi();
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FB] text-slate-900">
      {/* Sidebar cố định trên Desktop */}
      <aside
        aria-label="Thanh điều hướng chính"
        className={cn(
          'hidden flex-col bg-primary-900 text-white transition-[width] duration-200 lg:flex lg:shrink-0',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-60',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-primary-800 px-3.5">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
              <Landmark className="h-4 w-4" aria-hidden="true" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-bold tracking-wide text-white">
                  QUỸ TÍN DỤNG ND
                </div>
                <div className="truncate text-[10px] text-slate-400">Nghiệp vụ Tín dụng</div>
              </div>
            )}
          </Link>
        </div>

        <SidebarNavigation collapsed={sidebarCollapsed} />

        <div className="border-t border-primary-800 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs text-slate-300 hover:bg-primary-800 hover:text-white"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Thu gọn menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Drawer điều hướng trên Mobile / Tablet */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent side="left" size="md" className="bg-primary-900 text-white sm:max-w-xs">
          <DrawerHeader
            title={<span className="text-white">QUỸ TÍN DỤNG NHÂN DÂN</span>}
            description={<span className="text-slate-300">Điều hướng nghiệp vụ</span>}
            className="border-primary-800"
          />
          <DrawerBody className="p-0">
            <SidebarNavigation
              collapsed={false}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Khu vực nội dung chính */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header 56px */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Mở menu điều hướng"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>

          <div className="flex items-center gap-2.5">
            {env.enableMock && (
              <div className="hidden items-center gap-2 md:flex">
                <Badge tone="warning" dot title="Một số API chưa có trên Backend đang chạy qua Mock">
                  MOCK DATA (DEV)
                </Badge>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Vai trò:</span>
                  <select
                    aria-label="Chuyển đổi vai trò kiểm thử"
                    value={user?.roles[0] ?? 'CREDIT_OFFICER'}
                    onChange={(e) => switchMockRole(e.target.value as UserRole)}
                    className="h-7 rounded border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-primary-800 focus:border-primary-600 focus:outline-none"
                  >
                    <option value="CREDIT_OFFICER">Cán bộ tín dụng</option>
                    <option value="ADMIN">Quản trị (Admin)</option>
                  </select>
                </label>
              </div>
            )}

            {can('loan:create') && (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/loans/new')}
                className="hidden sm:inline-flex"
              >
                Lập hồ sơ vay
              </Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {user.fullName.charAt(0)}
                    </span>
                    <span className="hidden sm:block">
                      <span className="block text-xs font-semibold text-slate-900 leading-tight">
                        {user.fullName}
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-tight">
                        {user.title}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div>{user.fullName}</div>
                    <div className="font-normal text-slate-400">@{user.username}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    <UserIcon className="h-4 w-4" />
                    <span>Tài khoản & Đổi mật khẩu</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onSelect={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Nội dung từng trang */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

