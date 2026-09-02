import {
  ArrowLeft,
  ChevronDown,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  View,
} from 'react-native';

import {
  isNCrudActionDisabled,
  isNCrudActionVisible,
} from '@/components/crud/n-crud-actions';
import type {
  NCrudAction,
  NCrudRow,
  NCrudToolbarConfig,
} from '@/components/crud/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface NCrudToolbarProps<T extends NCrudRow> {
  title: string;
  config?: NCrudToolbarConfig<T>;
  selectedRows: T[];
  isMobile: boolean;
  isFormActive?: boolean;
  isPending?: boolean;
  searchText: string;
  searchPlaceholder?: string;
  onSearch: (value: string) => void;
  onBack?: () => void;
  onAdd?: () => void | Promise<void>;
  onEdit?: (row: T) => void | Promise<void>;
  onDelete?: (rows: T[]) => void | Promise<void>;
  onExport?: (rows: T[]) => void | Promise<void>;
  onActionError?: (error: unknown, action: NCrudAction<T>) => void;
  tools?: React.ReactNode;
}

const iconFor = <T extends NCrudRow>(action: NCrudAction<T>) => {
  if (action.icon) return action.icon;
  if (action.kind === 'add') return Plus;
  if (action.kind === 'edit') return Pencil;
  if (action.kind === 'delete') return Trash2;
  if (action.kind === 'export') return Download;
  return MoreHorizontal;
};

const toneClass: Record<
  'default' | 'primary' | 'success' | 'destructive',
  string
> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  destructive: 'text-destructive',
};

export function NCrudToolbar<T extends NCrudRow>({
  title,
  config = {},
  selectedRows,
  isMobile,
  isFormActive = false,
  isPending = false,
  searchText,
  searchPlaceholder = 'Buscar...',
  onSearch,
  onBack,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onActionError,
  tools,
}: NCrudToolbarProps<T>) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [executingActionId, setExecutingActionId] = React.useState<
    string | null
  >(null);
  const executingRef = React.useRef(false);
  const busy = isPending || executingActionId !== null;
  const permissions = config.permissions ?? {};

  const builtIns: NCrudAction<T>[] = [
    ...(config.add && permissions.add !== false
      ? [
          {
            id: 'add',
            label: 'Agregar',
            kind: 'add' as const,
            tone: 'success' as const,
            onPress: () => onAdd?.(),
          },
        ]
      : []),
    ...(config.edit && permissions.edit !== false
      ? [
          {
            id: 'edit',
            label: 'Editar',
            kind: 'edit' as const,
            tone: 'primary' as const,
            minSelection: 1,
            maxSelection: 1,
            onPress: (rows: T[]) => {
              const row = rows[0];
              return row ? onEdit?.(row) : undefined;
            },
          },
        ]
      : []),
    ...(config.remove && permissions.remove !== false
      ? [
          {
            id: 'delete',
            label: 'Eliminar',
            kind: 'delete' as const,
            tone: 'destructive' as const,
            minSelection: 1,
            confirmation: (rows: T[]) => ({
              title: 'Eliminar registros',
              message: `¿Confirmas eliminar ${rows.length} registro${rows.length === 1 ? '' : 's'} localmente?`,
            }),
            onPress: (rows: T[]) => onDelete?.(rows),
          },
        ]
      : []),
    ...(config.export && permissions.export !== false
      ? [
          {
            id: 'export',
            label: 'Exportar',
            kind: 'export' as const,
            tone: 'success' as const,
            onPress: (rows: T[]) => onExport?.(rows),
          },
        ]
      : []),
  ];
  const actions = [...builtIns, ...(config.extraActions ?? [])].filter(
    (action) => isNCrudActionVisible(action, selectedRows),
  );

  const execute = async (action: NCrudAction<T>) => {
    if (
      executingRef.current ||
      isNCrudActionDisabled(action, selectedRows, busy)
    )
      return;
    executingRef.current = true;
    setMenuOpen(false);
    setExecutingActionId(action.id);
    try {
      await action.onPress(selectedRows);
    } catch (error) {
      if (onActionError) onActionError(error, action);
      else
        Alert.alert(
          'No se pudo completar la acción',
          error instanceof Error ? error.message : 'Inténtalo nuevamente.',
        );
    } finally {
      executingRef.current = false;
      setExecutingActionId(null);
    }
  };

  const run = (action: NCrudAction<T>) => {
    if (
      executingRef.current ||
      isNCrudActionDisabled(action, selectedRows, busy)
    )
      return;
    if (!action.confirmation) {
      void execute(action);
      return;
    }
    const confirmation =
      typeof action.confirmation === 'function'
        ? action.confirmation(selectedRows)
        : { title: 'Confirmar operación', message: action.confirmation };
    if (Platform.OS === 'web') {
      if (
        globalThis.confirm(`${confirmation.title}\n\n${confirmation.message}`)
      )
        void execute(action);
      return;
    }
    Alert.alert(confirmation.title, confirmation.message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: action.tone === 'destructive' ? 'destructive' : 'default',
        onPress: () => void execute(action),
      },
    ]);
  };

  const renderAction = (action: NCrudAction<T>, menu = false) => {
    const Icon = iconFor(action);
    const disabled = isNCrudActionDisabled(action, selectedRows, busy);
    const executing = executingActionId === action.id;
    return (
      <Pressable
        key={action.id}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled, busy: executing }}
        disabled={disabled}
        onPress={() => run(action)}
        className={cn(
          menu
            ? 'h-10 flex-row items-center gap-2 px-3'
            : 'h-8 w-8 items-center justify-center rounded-lg',
          !menu && 'hover:bg-accent',
          disabled && 'opacity-40',
        )}
      >
        {executing ? (
          <ActivityIndicator size="small" />
        ) : (
          <Icon
            size={15}
            className={toneClass[action.tone ?? 'default']}
          />
        )}
        {menu ? <Text className="text-xs">{action.label}</Text> : null}
      </Pressable>
    );
  };

  const showSearch = config.search !== false && config.searchInput !== false;

  return (
    <View
      className={cn(
        'gap-3 border-b border-border/60 bg-muted/60 px-3',
        isMobile ? 'py-3' : 'h-11 flex-row items-center py-1',
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {isFormActive && !busy && onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <ArrowLeft size={16} />
          </Button>
        ) : null}
        <Text className="font-poppins-bold text-[11px] uppercase tracking-[2px]">
          {title}
        </Text>
      </View>

      {!isFormActive ? (
        <View
          className={cn('flex-row items-center gap-2', isMobile && 'w-full')}
        >
          {config.showSelectionInfo && selectedRows.length > 0 ? (
            <Text className="text-xs text-muted-foreground">
              {selectedRows.length} seleccionada
              {selectedRows.length === 1 ? '' : 's'}
            </Text>
          ) : null}

          {isMobile && actions.length > 0 ? (
            <View className="relative z-50">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Acciones"
                disabled={busy}
                onPress={() => setMenuOpen((value) => !value)}
                className="h-8 flex-row items-center gap-2 rounded-lg border border-border/20 bg-background/40 px-3"
              >
                <Text className="font-poppins-bold text-[9px] uppercase tracking-[1.5px] text-muted-foreground">
                  Acciones
                </Text>
                <ChevronDown size={14} />
              </Pressable>
              {menuOpen ? (
                <View className="absolute left-0 top-10 z-50 w-52 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
                  {actions.map((action) => renderAction(action, true))}
                </View>
              ) : null}
            </View>
          ) : null}

          {!isMobile ? (
            <View className="flex-row items-center gap-1">
              {actions.map((action) => renderAction(action))}
            </View>
          ) : null}

          {tools}

          {showSearch ? (
            <View className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <Search
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                value={searchText}
                editable={!busy}
                onChangeText={onSearch}
                placeholder={searchPlaceholder}
                className="h-8 pl-9 text-xs"
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
