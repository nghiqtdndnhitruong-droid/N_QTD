import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex w-full items-center gap-1 border-b border-slate-200 overflow-x-auto',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors whitespace-nowrap cursor-pointer',
        'hover:text-slate-900 hover:bg-slate-100/70 dark:text-[#a2b3c9] dark:hover:text-white dark:hover:bg-[#2b3b54]',
        'data-[state=active]:border-primary-600 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:font-semibold',
        'dark:data-[state=active]:border-[#60a5fa] dark:data-[state=active]:bg-[#2563eb] dark:data-[state=active]:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/25 rounded-t-md',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 focus:outline-none', className)}
      {...props}
    />
  );
}

