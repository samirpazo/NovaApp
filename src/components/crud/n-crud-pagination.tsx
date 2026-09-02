import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NCrudPaginationProps {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  pageSizes: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function NCrudPagination({
  page,
  pageSize,
  pageCount,
  total,
  pageSizes,
  onPageChange,
  onPageSizeChange,
}: NCrudPaginationProps) {
  const [open, setOpen] = React.useState(false);
  const from = total ? (pageSize === -1 ? 1 : (page - 1) * pageSize + 1) : 0;
  const to = pageSize === -1 ? total : Math.min(page * pageSize, total);

  return (
    <View className="h-10 flex-row items-center justify-between gap-2 border-t border-border bg-muted/50 px-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-[10px] text-muted-foreground">
          Filas por página
        </Text>
        <View className="relative z-50">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filas por página"
            onPress={() => setOpen((value) => !value)}
            className="h-7 min-w-16 flex-row items-center justify-between gap-2 rounded-md bg-background px-2"
          >
            <Text className="text-[10px] font-semibold">
              {pageSize === -1 ? 'Todos' : pageSize}
            </Text>
            <ChevronDown
              size={13}
              className="text-muted-foreground"
            />
          </Pressable>
          {open ? (
            <View className="absolute bottom-8 left-0 min-w-16 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
              {pageSizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => {
                    onPageSizeChange(size);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-7 justify-center px-2',
                    size === pageSize && 'bg-primary-selection',
                  )}
                >
                  <Text className="text-[10px] font-semibold">
                    {size === -1 ? 'Todos' : size}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View className="flex-row items-center gap-0.5">
        <Text className="mr-1 text-[10px] text-muted-foreground">
          {from}-{to}/{total}
        </Text>
        <Pressable
          disabled={page === 1}
          onPress={() => onPageChange(1)}
          accessibilityLabel="Primera página"
          className="h-7 w-7 items-center justify-center disabled:opacity-40"
        >
          <ChevronsLeft
            size={15}
            className="text-foreground"
          />
        </Pressable>
        <Pressable
          disabled={page === 1}
          onPress={() => onPageChange(Math.max(1, page - 1))}
          accessibilityLabel="Anterior"
          className="h-7 w-7 items-center justify-center disabled:opacity-40"
        >
          <ChevronLeft
            size={15}
            className="text-foreground"
          />
        </Pressable>
        <Text className="w-5 text-center text-[11px] font-semibold">
          {page}
        </Text>
        <Pressable
          disabled={page === pageCount}
          onPress={() => onPageChange(Math.min(pageCount, page + 1))}
          accessibilityLabel="Siguiente"
          className="h-7 w-7 items-center justify-center disabled:opacity-40"
        >
          <ChevronRight
            size={15}
            className="text-foreground"
          />
        </Pressable>
        <Pressable
          disabled={page === pageCount}
          onPress={() => onPageChange(pageCount)}
          accessibilityLabel="Última página"
          className="h-7 w-7 items-center justify-center disabled:opacity-40"
        >
          <ChevronsRight
            size={15}
            className="text-foreground"
          />
        </Pressable>
      </View>
    </View>
  );
}
