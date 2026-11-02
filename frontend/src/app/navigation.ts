import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CreditCard,
  LandPlot,
  LayoutDashboard,
  MapPin,
  Percent,
  Shield,
  SwatchBook,
  Users,
} from 'lucide-react';
import { env } from '@/config/env';
import type { Permission } from '@/stores/auth.store';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  exact?: boolean;
  devOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Nghiệp vụ chính',
    items: [
      {
        label: 'Tổng quan',
        to: '/',
        icon: LayoutDashboard,
        permission: 'dashboard:view',
        exact: true,
      },
      {
        label: 'Thành viên',
        to: '/members',
        icon: Users,
        permission: 'member:view',
      },
      {
        label: 'Hồ sơ khoản vay',
        to: '/loans',
        icon: CreditCard,
        permission: 'loan:view',
      },
      {
        label: 'Báo cáo & Thống kê',
        to: '/reports',
        icon: BarChart3,
        permission: 'report:view',
      },
    ],
  },
  {
    title: 'Danh mục cấu hình',
    items: [
      {
        label: 'Địa bàn Ấp / Xã',
        to: '/settings/areas',
        icon: MapPin,
        permission: 'area:view',
      },
      {
        label: 'Bảng lãi suất',
        to: '/settings/interest-rates',
        icon: Percent,
        permission: 'interest-rate:view',
      },
      {
        label: 'Bảng giá tài sản',
        to: '/settings/asset-pricing',
        icon: LandPlot,
        permission: 'asset-pricing:view',
      },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    items: [
      {
        label: 'Người dùng & Phân quyền',
        to: '/admin/users',
        icon: Shield,
        permission: 'user:view',
      },
      ...(env.isDev
        ? [
            {
              label: 'Design System (DEV)',
              to: '/dev/ui',
              icon: SwatchBook,
              devOnly: true,
            } satisfies NavItem,
          ]
        : []),
    ],
  },
];

export const BREADCRUMB_NAME_MAP: Record<string, string> = {
  members: 'Thành viên',
  new: 'Tạo mới',
  edit: 'Chỉnh sửa',
  loans: 'Hồ sơ khoản vay',
  reports: 'Báo cáo & Thống kê',
  settings: 'Danh mục',
  areas: 'Địa bàn Ấp / Xã',
  'interest-rates': 'Bảng lãi suất',
  'asset-pricing': 'Bảng giá tài sản',
  admin: 'Quản trị',
  users: 'Người dùng & Phân quyền',
  profile: 'Tài khoản cá nhân',
  dev: 'Kỹ thuật',
  ui: 'Design System',
};

