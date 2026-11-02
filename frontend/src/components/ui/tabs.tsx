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
        'inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors whitespace-nowrap',
        'hover:text-slate-900',
        'data-[state=active]:border-primary-600 data-[state=active]:text-primary-700',
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

