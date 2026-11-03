import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
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
        label: 'Quản lý biểu mẫu Word',
        to: '/templates',
        icon: FileText,
        exact: true,
      },
      {
        label: 'Thư viện từ khóa Word',
        to: '/templates/catalog',
        icon: BookOpen,
        exact: true,
      },
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
  '/': 'Tổng quan',
  '/members': 'Danh sách thành viên',
  '/members/new': 'Thêm thành viên',
  '/loans': 'Hồ sơ khoản vay',
  '/loans/new': 'Lập hồ sơ vay',
  '/templates': 'Quản lý biểu mẫu Word',
  '/settings/areas': 'Quản lý địa bàn',
  '/settings/interest-rates': 'Cấu hình lãi suất',
  '/settings/asset-pricing': 'Bảng giá định giá tài sản',
  '/reports': 'Báo cáo & Thống kê',
  '/admin/users': 'Người dùng hệ thống',
  '/profile': 'Thông tin cá nhân',
  '/dev/ui': 'Design System',
};
