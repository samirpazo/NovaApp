import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { SecOption } from '@/contracts/security/SecOption';
import {
  getCachedMobileOptions,
  refreshMobileOptions,
} from '@/features/security/options';
import { useAuthStore } from '@/auth/store';
import { getApiErrorMessage } from '@/lib/api';
import { getRouteByCode } from '@/lib/routeMapping';
import { cn } from '@/lib/utils';
import { useFocusEffect, useRouter } from 'expo-router';
import Fuse from 'fuse.js';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Database,
  FileText,
  Folder,
  LayoutGrid,
  ListTree,
  RefreshCw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  TableProperties,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

const OPTION_ICONS: Record<string, LucideIcon> = {
  building: Building2,
  'building-2': Building2,
  calendar: CalendarDays,
  'calendar-days': CalendarDays,
  database: Database,
  file: FileText,
  'file-text': FileText,
  folder: Folder,
  grid: LayoutGrid,
  'layout-grid': LayoutGrid,
  list: ListTree,
  'list-tree': ListTree,
  settings: Settings,
  shield: Shield,
  sliders: SlidersHorizontal,
  'sliders-horizontal': SlidersHorizontal,
  table: TableProperties,
  users: Users,
  wrench: Wrench,
};

function normalizeIconName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function optionIcon(option: SecOption): LucideIcon {
  return (
    OPTION_ICONS[normalizeIconName(option.OptIcon)] ??
    (option.TypeOption === 1 ? Folder : FileText)
  );
}

function flattenTree(nodes: SecOption[]): SecOption[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.Children)]);
}

function filterTree(nodes: SecOption[], matchedIds: Set<number>): SecOption[] {
  return nodes.flatMap((node) => {
    if (matchedIds.has(node.OptID)) return [node];
    const children = filterTree(node.Children, matchedIds);
    return children.length ? [{ ...node, Children: children }] : [];
  });
}

function collectMenuIds(nodes: SecOption[]): number[] {
  return nodes.flatMap((node) => [
    ...(node.Children.length ? [node.OptID] : []),
    ...collectMenuIds(node.Children),
  ]);
}

interface OptionTreeRowProps {
  item: SecOption;
  depth: number;
  forceOpen: boolean;
  openIds: Set<number>;
  toggle: (id: number) => void;
}

function OptionTreeRow({
  item,
  depth,
  forceOpen,
  openIds,
  toggle,
}: OptionTreeRowProps) {
  const router = useRouter();
  const hasChildren = item.Children.length > 0;
  const isOpen = forceOpen || openIds.has(item.OptID);
  const route = getRouteByCode(item.OptCode);
  const Icon = optionIcon(item);

  const activate = () => {
    if (hasChildren || item.TypeOption === 1) {
      toggle(item.OptID);
      return;
    }
    if (route) router.push(route);
  };

  return (
    <View>
      <View className="flex-row">
        {depth > 0 ? (
          <View
            style={{ width: depth * 18 }}
            className="items-end"
          >
            <View className="h-full w-px bg-border" />
          </View>
        ) : null}
        <Pressable
          onPress={activate}
          disabled={!hasChildren && item.TypeOption === 2 && !route}
          className={cn(
            'min-h-9 flex-1 flex-row items-center gap-2 rounded-md px-2 active:bg-muted',
            !route && item.TypeOption === 2 && 'opacity-55',
          )}
        >
          <Icon
            size={depth > 0 ? 15 : 17}
            strokeWidth={2.25}
            className={
              item.TypeOption === 2
                ? 'text-muted-foreground'
                : 'text-foreground'
            }
          />
          <Text
            className={cn(
              'min-w-0 flex-1 text-[13px]',
              depth === 0 && 'font-poppins-semibold',
            )}
            numberOfLines={1}
          >
            {item.OptName}
          </Text>
          {hasChildren ? (
            <ChevronRight
              size={15}
              className="text-muted-foreground"
              style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
            />
          ) : route ? (
            <ChevronRight
              size={14}
              className="text-muted-foreground"
            />
          ) : null}
        </Pressable>
      </View>
      {hasChildren && isOpen
        ? item.Children.map((child) => (
            <OptionTreeRow
              key={child.OptID}
              item={child}
              depth={depth + 1}
              forceOpen={forceOpen}
              openIds={openIds}
              toggle={toggle}
            />
          ))
        : null}
    </View>
  );
}

export default function ModulesTab() {
  const userId = useAuthStore((state) => state.Session?.User.UsrID);
  const [options, setOptions] = React.useState<SecOption[]>([]);
  const [search, setSearch] = React.useState('');
  const [openIds, setOpenIds] = React.useState<Set<number>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const optionsRef = React.useRef<SecOption[]>([]);

  const applyOptions = React.useCallback((mobileOptions: SecOption[]) => {
    optionsRef.current = mobileOptions;
    setOptions(mobileOptions);
    setOpenIds((current) =>
      current.size ? current : new Set(collectMenuIds(mobileOptions)),
    );
  }, []);

  const load = React.useCallback(
    async (force = false) => {
      if (!userId) return;
      setError(null);

      let cached: SecOption[] = [];
      if (!force) {
        cached = await getCachedMobileOptions(userId);
        if (cached.length) {
          applyOptions(cached);
          setLoading(false);
        }
      }

      if (force || !cached.length) setLoading(true);
      try {
        applyOptions(await refreshMobileOptions(userId));
      } catch (cause) {
        if (!cached.length && !optionsRef.current.length)
          setError(getApiErrorMessage(cause));
      } finally {
        setLoading(false);
      }
    },
    [applyOptions, userId],
  );

  useFocusEffect(
    React.useCallback(() => {
      void load(false);
    }, [load]),
  );

  const searchIndex = React.useMemo(
    () =>
      new Fuse(flattenTree(options), {
        keys: ['OptName', 'OptCode'],
        threshold: 0.2,
        minMatchCharLength: 3,
        ignoreLocation: true,
      }),
    [options],
  );
  const visibleOptions = React.useMemo(() => {
    const term = search.trim();
    if (!term) return options;
    const matchedIds = new Set(
      searchIndex.search(term).map(({ item }) => item.OptID),
    );
    return filterTree(options, matchedIds);
  }, [options, search, searchIndex]);
  const toggle = React.useCallback((id: number) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <View className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-3xl gap-3 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-poppins-semibold text-lg">Módulos</Text>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => void load(true)}
            accessibilityLabel="Actualizar módulos"
          >
            <RefreshCw
              size={16}
              className="text-foreground"
            />
          </Button>
        </View>
        <View className="relative justify-center">
          <Search
            size={16}
            className="absolute left-3 z-10 text-muted-foreground"
          />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Filtrar menú..."
            className="h-9 pl-9 text-sm"
          />
        </View>
      </View>

      <ScrollView contentContainerClassName="mx-auto w-full max-w-3xl pb-20">
        {error ? (
          <Text className="px-2 py-3 text-xs text-destructive">{error}</Text>
        ) : null}
        {!loading && !error && !visibleOptions.length ? (
          <View className="items-center gap-2 border-y border-border py-8">
            <LayoutGrid
              size={20}
              className="text-muted-foreground"
            />
            <Text variant="small">Sin módulos habilitados</Text>
          </View>
        ) : null}
        <View className="gap-0.5">
          {visibleOptions.map((item) => (
            <OptionTreeRow
              key={item.OptID}
              item={item}
              depth={0}
              forceOpen={search.trim().length > 0}
              openIds={openIds}
              toggle={toggle}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
