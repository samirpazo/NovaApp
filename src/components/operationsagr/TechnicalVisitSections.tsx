import { Image } from 'expo-image';
import { DateTime } from 'luxon';
import {
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Leaf,
  Pencil,
  Plus,
  ShieldAlert,
  Sprout,
  Trash2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { NSwitch } from '@/components/forms/NSwitch';
import { NText } from '@/components/forms/NText';
import { NButton } from '@/components/forms/NButton';
import { Text } from '@/components/ui/text';
import { managedFilePreviewUrl } from '@/lib/fileService';
import { formatters } from '@/lib/formatter';
import type {
  TechnicalVisitSectionKey,
  TechnicalVisitSnapshot,
  TechnicalVisitSnapshotRow,
} from '@/lib/technical-visit-validation';

type Row = TechnicalVisitSnapshotRow;
type Option = { label: string; value: number };
type Options = Record<string, Option[]>;

type TechnicalVisitSectionsProps = {
  snapshot: TechnicalVisitSnapshot;
  options: Options;
  onAdd: (key: TechnicalVisitSectionKey, parent?: Row) => void;
  onEdit: (key: TechnicalVisitSectionKey, row: Row) => void;
  onRemove: (key: TechnicalVisitSectionKey, row: Row) => void;
  onPhenology: (option: Option, value: string) => void;
  onInstallation: (option: Option, value: boolean) => void;
  onEvidence: () => void;
};

type TableColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render: (row: Row) => React.ReactNode;
};

const textOf = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const numberValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const boolValue = (value: unknown) => value === true;

const activeRows = (rows: Row[]) =>
  rows.filter((row) => row.SecStatus !== false);

const optionText = (
  options: Options,
  code: string,
  value: unknown,
  joined?: unknown,
) => {
  const joinedText = textOf(joined);
  if (joinedText) return joinedText;
  const numeric = numberValue(value);
  if (numeric == null) return '—';
  return options[code]?.find((item) => item.value === numeric)?.label ?? '—';
};

const unitText = (
  options: Options,
  code: string,
  value: unknown,
  joined?: unknown,
) => {
  const joinedText = textOf(joined);
  if (joinedText) return joinedText;
  const numeric = numberValue(value);
  if (numeric == null) return '';
  return options[code]?.find((item) => item.value === numeric)?.label ?? '';
};

const dateText = (value: unknown) => {
  const text = textOf(value);
  return text ? formatters.date(DateTime.fromISO(text, { setZone: true })) : '—';
};

const dateTimeText = (value: unknown) => {
  const text = textOf(value);
  return text ? formatters.datetime(text) : '—';
};

const measureText = (
  options: Options,
  value: unknown,
  unitCode: string,
  unitValue: unknown,
  joinedUnit?: unknown,
) => {
  const numeric = numberValue(value);
  if (numeric == null) return '—';
  const unit = unitText(options, unitCode, unitValue, joinedUnit);
  return `${formatters.decimal(numeric, 2)}${unit ? ` ${unit}` : ''}`;
};

const pendingFileUri = (row: Row) => {
  const file = row.PendingFile;
  if (!file || typeof file !== 'object') return null;
  const uri = (file as { uri?: unknown }).uri;
  return typeof uri === 'string' ? uri : null;
};

export function VisitSectionHeading({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-col items-start gap-3 border-b border-border/60 pb-2 md:flex-row md:items-center md:justify-between">
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="rounded-lg bg-primary/10 p-2">
          <Icon
            size={16}
            className="text-primary"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-poppins text-foreground/90">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs text-muted-foreground">{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {action ? <View className="self-end md:self-auto">{action}</View> : null}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <NButton
      className="h-8 px-3"
      onPress={onPress}
    >
      <Plus
        size={14}
        className="text-primary-foreground"
      />
      <Text>{label}</Text>
    </NButton>
  );
}

function IconAction({
  label,
  onPress,
  icon: Icon,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <NButton
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      accessibilityLabel={label}
      onPress={onPress}
    >
      <Icon
        size={14}
        className={danger ? 'text-destructive' : 'text-primary'}
      />
    </NButton>
  );
}

function RowActions({
  editLabel,
  removeLabel,
  onEdit,
  onRemove,
}: {
  editLabel: string;
  removeLabel: string;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-end gap-1">
      {onEdit ? (
        <IconAction
          label={editLabel}
          onPress={onEdit}
          icon={Pencil}
        />
      ) : null}
      {onRemove ? (
        <IconAction
          label={removeLabel}
          onPress={onRemove}
          icon={Trash2}
          danger
        />
      ) : null}
    </View>
  );
}

function TwoLine({ title, detail }: { title: string; detail?: string }) {
  return (
    <View className="gap-0.5">
      <Text
        className="text-xs font-poppins-semibold text-foreground"
      >
        {title || '—'}
      </Text>
      {detail ? (
        <Text
          className="text-[10px] text-muted-foreground"
          >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function EmptyState({
  title,
  subtitle,
  icon: Icon = ClipboardList,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <View className="items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-6">
      <Icon
        size={18}
        className="text-muted-foreground"
      />
      <Text className="text-center text-sm font-poppins-semibold text-muted-foreground">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-center text-xs text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function ResponsiveTable({
  columns,
  rows,
  rowKey,
  empty,
  onEdit,
  onRemove,
  editLabel,
  removeLabel,
  renderDetails,
}: {
  columns: TableColumn[];
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: React.ReactNode;
  renderDetails?: (row: Row) => React.ReactNode;
  onEdit?: (row: Row) => void;
  onRemove?: (row: Row) => void;
  editLabel: string;
  removeLabel: string;
}) {
  if (rows.length === 0) return empty;
  const hasActions = Boolean(onEdit || onRemove);
  return (
    <View>
      <View className="hidden overflow-hidden rounded-xl border border-border md:flex">
        <View className="flex-row items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
          {columns.map((column) => (
            <View
              key={column.key}
              className={`min-w-0 flex-1 ${column.className ?? ''}`}
            >
              <Text
                className={`text-[10px] font-poppins-semibold uppercase tracking-wide text-muted-foreground ${
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                      ? 'text-center'
                      : ''
                }`}
                numberOfLines={1}
              >
                {column.label}
              </Text>
            </View>
          ))}
          {hasActions ? <View className="w-16" /> : null}
        </View>
        {rows.map((row, index) => (
          <View key={rowKey(row) || String(index)} className="border-b border-border bg-card last:border-b-0">
          <View className="flex-row items-center gap-2 px-3 py-2">
            {columns.map((column) => (
              <View
                key={column.key}
                className={`min-w-0 flex-1 ${column.className ?? ''}`}
              >
                {column.render(row)}
              </View>
            ))}
            {hasActions ? (
              <View className="w-16">
                <RowActions
                  editLabel={editLabel}
                  removeLabel={removeLabel}
                  onEdit={onEdit ? () => onEdit(row) : undefined}
                  onRemove={onRemove ? () => onRemove(row) : undefined}
                />
              </View>
            ) : null}
          </View>
          {renderDetails?.(row)}
          </View>
        ))}
      </View>

      <View className="gap-2 md:hidden">
        {rows.map((row, index) => (
          <View
            key={rowKey(row) || String(index)}
            className="gap-2 rounded-lg border border-border bg-card p-3"
          >
            <View className="gap-1.5">
              {columns.map((column, index) => (
                <View
                  key={column.key}
                  className={index === 0 ? "gap-1" : "flex-row items-start justify-between gap-3"}
                >
                  <Text className="shrink-0 text-[10px] font-poppins-semibold uppercase tracking-wide text-muted-foreground">
                    {column.label}
                  </Text>
                  <View className={index === 0 ? "min-w-0" : "min-w-0 flex-1 items-end"}>
                    {column.render(row)}
                  </View>
                </View>
              ))}
            </View>
            {hasActions ? (
              <View className="border-t border-border/60 pt-1">
                <RowActions
                  editLabel={editLabel}
                  removeLabel={removeLabel}
                  onEdit={onEdit ? () => onEdit(row) : undefined}
                  onRemove={onRemove ? () => onRemove(row) : undefined}
                />
              </View>
            ) : null}
            {renderDetails?.(row)}
          </View>
        ))}
      </View>
    </View>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-primary/10 px-2.5 py-1">
      <Text className="text-[10px] font-poppins-semibold text-primary">
        {label}
      </Text>
    </View>
  );
}

export function TechnicalVisitSections({
  snapshot,
  options,
  onAdd,
  onEdit,
  onRemove,
  onPhenology,
  onInstallation,
  onEvidence,
}: TechnicalVisitSectionsProps) {
  const [showAllApplications, setShowAllApplications] = React.useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = React.useState<number | null>(null);
  const applications = activeRows(snapshot.Applications);
  const applicationDetails = activeRows(snapshot.ApplicationDetails);
  const hasProducts = (application: Row) => applicationDetails.some(
    (detail) => Number(detail.TapID) === Number(application.TapID),
  );
  const emptyApplications = applications.filter((application) => !hasProducts(application));
  const visibleApplications = showAllApplications
    ? applications
    : applications.filter(hasProducts);

  const stages = options.OAG_PHENOLOGICAL_STAGE ?? [];
  const phenology = activeRows(snapshot.Phenology);
  const totalPhenology = stages.reduce((total, stage) => {
    const row = phenology.find(
      (item) => numberValue(item.TphStage) === stage.value,
    );
    return total + (numberValue(row?.TphPercentage) ?? 0);
  }, 0);

  const diagnoses = activeRows(snapshot.Diagnoses);
  const activities = activeRows(snapshot.Activities);
  const installations = activeRows(snapshot.Installations);
  const recommendations = activeRows(snapshot.Recommendations);
  const previousRecommendations = activeRows(snapshot.PreviousRecommendations);
  const recommendationFollowUps = activeRows(snapshot.RecommendationFollowUps);
  const culturalActivities = activeRows(snapshot.CulturalActivities);
  const previousCulturalActivities = activeRows(
    snapshot.PreviousCulturalActivities,
  );
  const culturalFollowUps = activeRows(snapshot.CulturalActivityFollowUps);
  const evidences = activeRows(snapshot.Evidences);

  const installationBase =
    options.OAG_INSTALLATION_TYPE ??
    options.OAG_VISIT_INSTALLATION_TYPE ??
    options.OAG_TECHNICAL_VISIT_INSTALLATION_TYPE ??
    [];
  const installationOptions = [...installationBase];
  for (const row of installations) {
    const value = numberValue(row.TinInstallationType);
    if (
      value == null ||
      installationOptions.some((item) => item.value === value)
    )
      continue;
    installationOptions.push({
      label: textOf(row.TinInstallationTypeDescription) || 'Instalación',
      value,
    });
  }

  const applicationColumns: TableColumn[] = [
    {
      key: 'product',
      label: 'Producto / observación',
      render: (row) => (
        <TwoLine
          title={textOf(row.TadProductDescription) || 'Sin producto'}
          detail={
            [
              textOf(row.TadObservation),
              boolValue(row.TadIsObservation) ? 'Observación' : '',
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (row) => (
        <Text className="text-xs">
          {optionText(
            options,
            'OAG_APPLICATION_TYPE',
            row.TadApplicationType,
            row.TadApplicationTypeDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'dose',
      label: 'Dosis',
      align: 'right',
      render: (row) => (
        <Text className="text-right text-xs">
          {measureText(
            options,
            row.TadDose,
            'OAG_DOSE_UNIT',
            row.TadDoseUnit,
            row.TadDoseUnitDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'quantity',
      label: 'Cantidad',
      align: 'right',
      render: (row) => (
        <Text className="text-right text-xs">
          {measureText(
            options,
            row.TadQuantity,
            'OAG_APPLICATION_QUANTITY_UNIT',
            row.TadQuantityUnit,
            row.TadQuantityUnitDescription,
          )}
        </Text>
      ),
    },
  ];

  const detailsFor = (application: Row) => applicationDetails.filter(
    (detail) => Number(detail.TapID) === Number(application.TapID),
  );
  const applicationSummaryColumns: TableColumn[] = [
    {
      key: 'products', label: 'Producto / observación', className: 'flex-[2]',
      render: (application) => <View className="gap-1">
        <TwoLine
          title={detailsFor(application).map((detail) => textOf(detail.TadProductDescription) || textOf(detail.TadObservation) || 'Sin producto').join(', ') || 'Sin productos'}
          detail={`${dateTimeText(application.TapStartDateTime)} · ${optionText(options, 'OAG_FIELD_APPLICATION_MODE', application.TapApplicationMode, application.TapApplicationModeDescription)}`}
        />
        <NButton variant="ghost" className="h-6 self-start px-0" accessibilityLabel={`Ver productos de aplicación ${String(application.TapID)}`} onPress={() => setExpandedApplicationId((current) => current === Number(application.TapID) ? null : Number(application.TapID))}>
          <Text className="text-[10px] text-primary">{expandedApplicationId === Number(application.TapID) ? 'Ocultar productos' : `Ver productos (${detailsFor(application).length})`}</Text>
        </NButton>
      </View>,
    },
    {
      key: 'types', label: 'Tipo aplicación',
      render: (application) => <Text className="text-xs">{detailsFor(application).map((detail) => optionText(options, 'OAG_APPLICATION_TYPE', detail.TadApplicationType, detail.TadApplicationTypeDescription)).join(', ') || '—'}</Text>,
    },
    {
      key: 'doses', label: 'Dosis', align: 'right',
      render: (application) => <Text className="text-right text-xs">{detailsFor(application).map((detail) => measureText(options, detail.TadDose, 'OAG_DOSE_UNIT', detail.TadDoseUnit, detail.TadDoseUnitDescription)).join(', ') || '—'}</Text>,
    },
    {
      key: 'quantities', label: 'Cantidad', align: 'right',
      render: (application) => <Text className="text-right text-xs">{detailsFor(application).map((detail) => measureText(options, detail.TadQuantity, 'OAG_APPLICATION_QUANTITY_UNIT', detail.TadQuantityUnit, detail.TadQuantityUnitDescription)).join(', ') || '—'}</Text>,
    },
  ];

  const diagnosisColumns: TableColumn[] = [
    {
      key: 'item',
      label: 'Enfermedad / plaga / maleza',
      render: (row) => (
        <TwoLine
          title={textOf(row.TvdItemDescription) || 'Sin descripción'}
          detail={
            optionText(
              options,
              'OAG_TECHNICAL_DIAGNOSIS_CATEGORY',
              row.TvdCategory,
            ) || undefined
          }
        />
      ),
    },
    {
      key: 'organ',
      label: 'Órgano',
      render: (row) => (
        <Text className="text-xs">
          {optionText(
            options,
            'OAG_PLANT_ORGAN',
            row.TvdPlantOrgan,
            row.TvdPlantOrganDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'incidence',
      label: 'Incidencia',
      align: 'right',
      render: (row) => {
        const incidence = numberValue(row.TvdIncidencePercentage);
        return (
          <Text className="text-right text-xs">
            {incidence == null ? '—' : `${formatters.decimal(incidence, 2)} %`}
          </Text>
        );
      },
    },
    {
      key: 'observation',
      label: 'Observación',
      render: (row) => (
        <Text
          className="text-xs"
          >
          {textOf(row.TvdObservation) || '—'}
        </Text>
      ),
    },
  ];

  const activityColumns: TableColumn[] = [
    {
      key: 'activity',
      label: 'Actividad',
      render: (row) => (
        <TwoLine
          title={optionText(
            options,
            'OAG_VISIT_CULTURAL_ACTIVITY',
            row.TvaActivityType,
            row.TvaActivityTypeDescription,
          )}
          detail={textOf(row.OwsName) || undefined}
        />
      ),
    },
    {
      key: 'start',
      label: 'Inicio',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TvaStartDate)}</Text>
      ),
    },
    {
      key: 'end',
      label: 'Fin',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TvaEndDate)}</Text>
      ),
    },
    {
      key: 'observation',
      label: 'Observación',
      render: (row) => (
        <Text
          className="text-xs"
          >
          {textOf(row.TvaObservation) || '—'}
        </Text>
      ),
    },
  ];

  const recommendationColumns: TableColumn[] = [
    {
      key: 'product',
      label: 'Insumo / objetivo',
      render: (row) => (
        <TwoLine
          title={
            textOf(row.FrsDescription) ||
            textOf(row.TvrProductDescription) ||
            'Sin insumo'
          }
          detail={textOf(row.TvrObjective) || 'Sin objetivo'}
        />
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (row) => (
        <Text className="text-xs">
          {optionText(
            options,
            'OAG_RECOMMENDATION_TYPE',
            row.TvrRecommendationType,
            row.TvrRecommendationTypeDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'dose',
      label: 'Dosis',
      align: 'right',
      render: (row) => (
        <Text className="text-right text-xs">
          {measureText(
            options,
            row.TvrDose,
            'OAG_DOSE_UNIT',
            row.TvrDoseUnit,
            row.TvrDoseUnitDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'order',
      label: 'Orden',
      align: 'center',
      render: (row) => {
        const order = numberValue(row.TvrSortOrder);
        return (
          <Text className="text-center text-xs">
            {order && order > 0 ? `P${order}` : '—'}
          </Text>
        );
      },
    },
    {
      key: 'instruction',
      label: 'Indicaciones',
      render: (row) => (
        <Text
          className="text-xs"
          >
          {textOf(row.TvrInstruction) || '—'}
        </Text>
      ),
    },
  ];

  const culturalColumns: TableColumn[] = [
    {
      key: 'activity',
      label: 'Actividad cultural',
      render: (row) => (
        <TwoLine
          title={optionText(
            options,
            'OAG_VISIT_CULTURAL_ACTIVITY',
            row.TcaActivityType,
            row.TcaActivityTypeDescription,
          )}
          detail={textOf(row.TcaObservation) || undefined}
        />
      ),
    },
    {
      key: 'completed',
      label: 'Completada',
      render: (row) => (
        <Text className="text-xs">
          {boolValue(row.TcaIsCompleted) ? 'Sí' : 'No'}
        </Text>
      ),
    },
    {
      key: 'start',
      label: 'Inicio',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TcaStartDate)}</Text>
      ),
    },
    {
      key: 'end',
      label: 'Fin',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TcaEndDate)}</Text>
      ),
    },
  ];

  const evidenceColumns: TableColumn[] = [
    {
      key: 'file',
      label: 'Archivo',
      render: (row) => {
        const fileId = numberValue(row.TveFilID);
        const pendingUri = pendingFileUri(row);
        const uri =
          pendingUri ??
          (fileId != null && fileId > 0 ? managedFilePreviewUrl(fileId) : null);
        if (!uri) {
          return (
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <ClipboardCheck
                size={18}
                className="text-muted-foreground"
              />
            </View>
          );
        }
        return (
          <Image
            source={{
              uri,
              ...(pendingUri
                ? {}
                : { headers: { 'X-Nova-Client': 'nova-app' } }),
            }}
            style={{ width: 48, height: 48, borderRadius: 8 }}
            contentFit="cover"
            accessibilityLabel="Archivo de evidencia"
          />
        );
      },
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (row) => (
        <Text
          className="text-xs"
          >
          {textOf(row.TveDescription) || 'Sin descripción'}
        </Text>
      ),
    },
  ];

  return (
    <View className="gap-4 md:gap-5">
      <View className="gap-3">
        <VisitSectionHeading
          title="Aplicaciones"
          subtitle="Productos, dosis y modo de aplicación registrados en la visita."
          icon={FlaskConical}
          action={
            <AddButton
              label="Agregar aplicación"
              onPress={() => { setShowAllApplications(true); onAdd('Applications'); }}
            />
          }
        />
        <ResponsiveTable
          columns={applicationSummaryColumns}
          rows={visibleApplications}
          rowKey={(application) => String(application.TapID)}
          empty={<EmptyState title="No hay aplicaciones registradas" subtitle="Agrega la primera aplicación de la visita." icon={FlaskConical} />}
          onEdit={(application) => onEdit('Applications', application)}
          onRemove={(application) => onRemove('Applications', application)}
          editLabel="Editar aplicación"
          removeLabel="Eliminar aplicación"
            renderDetails={(application) => expandedApplicationId === Number(application.TapID) ? <View className="gap-3 border-t border-border bg-muted/40 p-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-xs font-poppins-semibold">Productos de la aplicación</Text>
              <AddButton label="Producto" onPress={() => onAdd('ApplicationDetails', application)} />
            </View>
            <ResponsiveTable
              columns={applicationColumns}
              rows={detailsFor(application)}
              rowKey={(detail) => String(detail.TadID)}
              empty={<EmptyState title="Sin productos en esta aplicación" subtitle="Agrega un producto u observación." icon={FlaskConical} />}
              onEdit={(detail) => onEdit('ApplicationDetails', detail)}
              onRemove={(detail) => onRemove('ApplicationDetails', detail)}
              editLabel="Editar producto"
              removeLabel="Eliminar producto"
            />
          </View> : null}
        />
        {emptyApplications.length > 0 ? (
          <NButton
            variant="outline"
            className="h-8 self-start px-3"
            onPress={() => setShowAllApplications((current) => !current)}
          >
            <Text>
              {showAllApplications
                ? 'Ocultar aplicaciones sin productos'
                : `Ver ${emptyApplications.length} aplicaciones sin productos`}
            </Text>
          </NButton>
        ) : null}
      </View>

      <View className="gap-4 md:flex-row md:items-start md:gap-5">
        <View className="gap-3 md:w-1/3">
          <VisitSectionHeading
            title="Estado fenológico"
            subtitle="Porcentaje por etapa del cultivo."
            icon={Leaf}
          />
          {stages.length === 0 ? (
            <EmptyState
              title="Sin etapas disponibles"
              subtitle="Descarga las definiciones para registrar la fenología."
              icon={Leaf}
            />
          ) : (
            <>
              <View className="gap-2">
                {stages.map((stage) => {
                  const row = phenology.find(
                    (item) => numberValue(item.TphStage) === stage.value,
                  );
                  return (
                    <View
                      key={stage.value}
                      className="flex-row items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
                    >
                      <Text className="min-w-0 flex-1 text-xs font-poppins-semibold">
                        {stage.label}
                      </Text>
                      <NText
                        aria-label={`Porcentaje ${stage.label}`}
                        value={String(row?.TphPercentage ?? 0)}
                        onChange={(value) => onPhenology(stage, value)}
                        decimal
                        suffix={
                          <Text className="text-[10px] text-muted-foreground">
                            %
                          </Text>
                        }
                        containerClassName="w-24"
                      />
                    </View>
                  );
                })}
              </View>
              <View className="gap-2 rounded-lg border border-border bg-card p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-poppins-semibold">Total</Text>
                  <Text
                    className={`text-xs font-poppins-semibold ${
                      totalPhenology === 100
                        ? 'text-emerald-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatters.decimal(totalPhenology, 2)} %
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <View
                    className={`h-full ${
                      totalPhenology === 100 ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{
                      width:
                        `${Math.min(totalPhenology, 100)}%` as `${number}%`,
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        <View className="min-w-0 gap-3 md:flex-1">
          <VisitSectionHeading
            title="Evaluación fitosanitaria"
            subtitle="Plagas, órganos afectados e incidencia observada."
            icon={ShieldAlert}
            action={
              <AddButton
                label="Agregar"
                onPress={() => onAdd('Diagnoses')}
              />
            }
          />
          <ResponsiveTable
            columns={diagnosisColumns}
            rows={diagnoses}
            rowKey={(row) => String(row.TvdID ?? '')}
            empty={
              <EmptyState
                title="No hay evaluaciones fitosanitarias"
                subtitle="Agrega los hallazgos observados en el lote."
                icon={ShieldAlert}
              />
            }
            onEdit={(row) => onEdit('Diagnoses', row)}
            onRemove={(row) => onRemove('Diagnoses', row)}
            editLabel="Editar evaluación"
            removeLabel="Eliminar evaluación"
          />
        </View>
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Actividades culturales realizadas"
          subtitle="Labores ejecutadas durante la visita."
          icon={ClipboardList}
          action={
            <AddButton
              label="Agregar actividad"
              onPress={() => onAdd('Activities')}
            />
          }
        />
        <ResponsiveTable
          columns={activityColumns}
          rows={activities}
          rowKey={(row) => String(row.TvaID ?? '')}
          empty={
            <EmptyState
              title="No hay actividades registradas"
              subtitle="Registra las labores realizadas en el lote."
              icon={ClipboardList}
            />
          }
          onEdit={(row) => onEdit('Activities', row)}
          onRemove={(row) => onRemove('Activities', row)}
          editLabel="Editar actividad"
          removeLabel="Eliminar actividad"
        />
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Evaluación de instalaciones"
          subtitle="Disponibilidad de instalaciones asociadas al lote."
          icon={ClipboardCheck}
        />
        {installationOptions.length === 0 ? (
          <EmptyState
            title="Sin instalaciones disponibles"
            subtitle="Descarga las definiciones para revisar las instalaciones."
            icon={ClipboardCheck}
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {installationOptions.map((option) => {
              const row = installations.find(
                (item) =>
                  numberValue(item.TinInstallationType) === option.value,
              );
              return (
                <View
                  key={option.value}
                  className="w-full flex-row items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 md:w-[32%]"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-poppins-semibold">
                      {option.label}
                    </Text>
                    {textOf(row?.TinObservation) ? (
                      <Text className="text-[10px] text-muted-foreground">
                        {textOf(row?.TinObservation)}
                      </Text>
                    ) : null}
                  </View>
                  {row ? (
                    <IconAction
                      label={`Editar ${option.label}`}
                      icon={Pencil}
                      onPress={() => onEdit('Installations', row)}
                    />
                  ) : null}
                  <NSwitch
                    value={boolValue(row?.TinIsAvailable)}
                    onValueChange={(value) => onInstallation(option, value)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Recomendaciones"
          subtitle="Insumos, dosis y objetivos recomendados al productor."
          icon={ClipboardList}
          action={
            <AddButton
              label="Agregar recomendación"
              onPress={() => onAdd('Recommendations')}
            />
          }
        />
        <ResponsiveTable
          columns={recommendationColumns}
          rows={recommendations}
          rowKey={(row) => String(row.TvrID ?? '')}
          empty={
            <EmptyState
              title="No hay recomendaciones registradas"
              subtitle="Agrega los insumos y objetivos indicados al productor."
              icon={ClipboardList}
            />
          }
          onEdit={(row) => onEdit('Recommendations', row)}
          onRemove={(row) => onRemove('Recommendations', row)}
          editLabel="Editar recomendación"
          removeLabel="Eliminar recomendación"
        />
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Seguimiento de recomendaciones anteriores"
          subtitle="Revisa el cumplimiento de las recomendaciones de visitas previas."
          icon={ClipboardList}
        />
        {previousRecommendations.length === 0 ? (
          <EmptyState
            title="Sin recomendaciones anteriores"
            subtitle="No hay recomendaciones de visitas previas para revisar."
            icon={ClipboardList}
          />
        ) : (
          previousRecommendations.map((recommendation, index) => {
            const existing = recommendationFollowUps.find(
              (followUp) =>
                numberValue(followUp.TvrID) ===
                numberValue(recommendation.TvrID),
            );
            return (
              <View
                key={String(recommendation.TvrID ?? index)}
                className="gap-2 rounded-lg border border-border bg-card p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <TwoLine
                      title={
                        textOf(recommendation.FrsDescription) ||
                        textOf(recommendation.TvrProductDescription) ||
                        'Recomendación'
                      }
                      detail={`Visita del ${dateText(recommendation.TviPerformedDate)}`}
                    />
                  </View>
                  {existing ? (
                    <StatusBadge
                      label={optionText(
                        options,
                        'OAG_RECOMMENDATION_FOLLOW_UP_STATUS',
                        existing.TrfStatus,
                        existing.TrfStatusDescription,
                      )}
                    />
                  ) : null}
                </View>
                {textOf(recommendation.TvrObjective) ? (
                  <Text className="text-xs text-muted-foreground">
                    {textOf(recommendation.TvrObjective)}
                  </Text>
                ) : null}
                {textOf(recommendation.TvrInstruction) ? (
                  <Text className="text-xs">
                    {textOf(recommendation.TvrInstruction)}
                  </Text>
                ) : null}
                {existing && textOf(existing.TrfObservation) ? (
                  <Text className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
                    {textOf(existing.TrfObservation)}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2">
                  {existing ? (
                    <>
                      <NButton
                        variant="outline"
                        className="h-8 px-3"
                        onPress={() =>
                          onEdit('RecommendationFollowUps', existing)
                        }
                      >
                        <Pencil
                          size={14}
                          className="text-foreground"
                        />
                        <Text>Editar seguimiento</Text>
                      </NButton>
                      <IconAction
                        label="Eliminar seguimiento"
                        icon={Trash2}
                        danger
                        onPress={() =>
                          onRemove('RecommendationFollowUps', existing)
                        }
                      />
                    </>
                  ) : (
                    <NButton
                      className="h-8 px-3"
                      onPress={() =>
                        onAdd('RecommendationFollowUps', recommendation)
                      }
                    >
                      <Plus
                        size={14}
                        className="text-primary-foreground"
                      />
                      <Text>Agregar seguimiento</Text>
                    </NButton>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Actividades culturales"
          subtitle="Labores sugeridas al productor para la próxima visita."
          icon={Sprout}
          action={
            <AddButton
              label="Agregar actividad"
              onPress={() => onAdd('CulturalActivities')}
            />
          }
        />
        <ResponsiveTable
          columns={culturalColumns}
          rows={culturalActivities}
          rowKey={(row) => String(row.TcaID ?? '')}
          empty={
            <EmptyState
              title="No hay actividades culturales sugeridas"
              subtitle="Agrega las labores recomendadas al productor."
              icon={Sprout}
            />
          }
          onEdit={(row) => onEdit('CulturalActivities', row)}
          onRemove={(row) => onRemove('CulturalActivities', row)}
          editLabel="Editar actividad cultural"
          removeLabel="Eliminar actividad cultural"
        />
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Seguimiento de actividades culturales anteriores"
          subtitle="Revisa el cumplimiento de las labores sugeridas en visitas previas."
          icon={Sprout}
        />
        {previousCulturalActivities.length === 0 ? (
          <EmptyState
            title="Sin actividades culturales anteriores"
            subtitle="No hay actividades de visitas previas para revisar."
            icon={Sprout}
          />
        ) : (
          previousCulturalActivities.map((activity, index) => {
            const existing = culturalFollowUps.find(
              (followUp) =>
                numberValue(followUp.TcaID) === numberValue(activity.TcaID),
            );
            return (
              <View
                key={String(activity.TcaID ?? index)}
                className="gap-2 rounded-lg border border-border bg-card p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <TwoLine
                      title={
                        optionText(
                          options,
                          'OAG_VISIT_CULTURAL_ACTIVITY',
                          activity.TcaActivityType,
                          activity.TcaActivityTypeDescription,
                        ) || 'Actividad cultural'
                      }
                      detail={`Visita del ${dateText(activity.TviPerformedDate)} · ${dateText(activity.TcaStartDate)} al ${dateText(activity.TcaEndDate)}`}
                    />
                  </View>
                  {existing ? (
                    <StatusBadge
                      label={optionText(
                        options,
                        'OAG_RECOMMENDATION_FOLLOW_UP_STATUS',
                        existing.TcfStatus,
                        existing.TcfStatusDescription,
                      )}
                    />
                  ) : null}
                </View>
                {textOf(activity.TcaObservation) ? (
                  <Text className="text-xs text-muted-foreground">
                    {textOf(activity.TcaObservation)}
                  </Text>
                ) : null}
                {existing && textOf(existing.TcfObservation) ? (
                  <Text className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
                    {textOf(existing.TcfObservation)}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2">
                  {existing ? (
                    <>
                      <NButton
                        variant="outline"
                        className="h-8 px-3"
                        onPress={() =>
                          onEdit('CulturalActivityFollowUps', existing)
                        }
                      >
                        <Pencil
                          size={14}
                          className="text-foreground"
                        />
                        <Text>Editar seguimiento</Text>
                      </NButton>
                      <IconAction
                        label="Eliminar seguimiento"
                        icon={Trash2}
                        danger
                        onPress={() =>
                          onRemove('CulturalActivityFollowUps', existing)
                        }
                      />
                    </>
                  ) : (
                    <NButton
                      className="h-8 px-3"
                      onPress={() =>
                        onAdd('CulturalActivityFollowUps', activity)
                      }
                    >
                      <Plus
                        size={14}
                        className="text-primary-foreground"
                      />
                      <Text>Agregar seguimiento</Text>
                    </NButton>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View className="gap-3">
        <VisitSectionHeading
          title="Evidencias"
          subtitle="Fotos y documentos que respaldan la visita."
          icon={ClipboardCheck}
          action={
            <AddButton
              label="Agregar evidencia"
              onPress={onEvidence}
            />
          }
        />
        <ResponsiveTable
          columns={evidenceColumns}
          rows={evidences}
          rowKey={(row) => String(row.TveID ?? '')}
          empty={
            <EmptyState
              title="No hay evidencias adjuntas"
              subtitle="Agrega fotos o documentos de respaldo."
              icon={ClipboardCheck}
            />
          }
          onEdit={(row) => onEdit('Evidences', row)}
          onRemove={(row) => onRemove('Evidences', row)}
          editLabel="Editar evidencia"
          removeLabel="Eliminar evidencia"
        />
      </View>
    </View>
  );
}
