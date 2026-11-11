import { Image } from 'expo-image';
import { DateTime } from 'luxon';
import {
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Leaf,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Sprout,
  Trash2,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, View } from 'react-native';

import { NButton } from '@/components/forms/NButton';
import { NSelect } from '@/components/forms/NSelect';
import { NSwitch } from '@/components/forms/NSwitch';
import { NText } from '@/components/forms/NText';
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
type ObjectiveOption = { label: string; value: number; ObjType?: number };
type Options = Record<string, Option[]>;

type TechnicalVisitSectionsProps = {
  snapshot: TechnicalVisitSnapshot;
  options: Options;
  objectives?: ObjectiveOption[];
  onAdd: (key: TechnicalVisitSectionKey, parent?: Row) => void;
  onEdit: (key: TechnicalVisitSectionKey, row: Row) => void;
  onRemove: (key: TechnicalVisitSectionKey, row: Row) => void;
  onSaveDiagnosis?: (payload: {
    TvdID: number;
    ObjID: number;
    TvdCategory: number;
    TvdPlantOrgan: number | null;
    TvdIncidencePercentage: number;
    TvdItemDescription: string;
  }) => void;
  onRecommendationFollowUpChange?: (
    recommendationId: number,
    status: number,
    observation: string,
  ) => void;
  onCulturalFollowUpChange?: (
    activityId: number,
    status: number,
    observation: string,
  ) => void;
  onPhenology: (option: Option, value: string) => void;
  onInstallation: (option: Option, value: boolean) => void;
  onInstallationObservation?: (
    option: Option,
    currentObservation: string,
  ) => void;
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
    const parsed = Number(value.replace(',', '.'));
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
  highlighted = false,
}: {
  label: string;
  onPress: () => void;
  icon: LucideIcon;
  danger?: boolean;
  highlighted?: boolean;
}) {
  return (
    <NButton
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${highlighted ? 'bg-primary/15' : ''}`}
      accessibilityLabel={label}
      onPress={onPress}
    >
      <Icon
        size={14}
        className={
          danger
            ? 'text-destructive'
            : highlighted
              ? 'text-primary'
              : 'text-primary'
        }
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
      <Text className="text-xs font-poppins-semibold text-foreground">
        {title || '—'}
      </Text>
      {detail ? (
        <Text className="text-[10px] text-muted-foreground">{detail}</Text>
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
          {hasActions ? (
            <View className="w-20">
              <Text className="text-center text-[10px] font-poppins-semibold uppercase tracking-wide text-muted-foreground">
                Acciones
              </Text>
            </View>
          ) : null}
        </View>
        {rows.map((row, index) => (
          <View
            key={rowKey(row) || String(index)}
            className="border-b border-border bg-card last:border-b-0"
          >
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
                <View className="w-20">
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
              {columns.map((column, colIndex) => (
                <View
                  key={column.key}
                  className={
                    colIndex === 0
                      ? 'gap-1'
                      : 'flex-row items-start justify-between gap-3'
                  }
                >
                  <Text className="shrink-0 text-[10px] font-poppins-semibold uppercase tracking-wide text-muted-foreground">
                    {column.label}
                  </Text>
                  <View
                    className={
                      colIndex === 0
                        ? 'min-w-0'
                        : 'min-w-0 flex-1 items-end'
                    }
                  >
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

function FollowUpEditorRow({
  title,
  subtitle,
  statusOptions,
  initialStatus,
  initialObservation,
  onChange,
}: {
  title: string;
  subtitle?: string;
  statusOptions: Option[];
  initialStatus: number;
  initialObservation: string;
  onChange?: (status: number, observation: string) => void;
}) {
  const [status, setStatus] = React.useState(initialStatus);
  const [observation, setObservation] = React.useState(initialObservation);

  React.useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  React.useEffect(() => {
    setObservation(initialObservation);
  }, [initialObservation]);

  return (
    <View className="flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 px-3.5 py-2.5 md:flex-row md:items-center">
      <View className="min-w-0 gap-0.5 md:w-1/3">
        <Text
          className="text-xs font-poppins-medium text-foreground"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-[11px] text-muted-foreground"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="md:w-1/4">
        <NSelect
          label="Cumplimiento"
          items={statusOptions}
          itemText="label"
          itemValue="value"
          value={status || null}
          onChange={(val) => {
            const nextStatus = Number(val) || 0;
            setStatus(nextStatus);
            onChange?.(nextStatus, observation);
          }}
          placeholder="Seleccionar..."
          required
        />
      </View>
      <View className="md:flex-1">
        <NText
          label="Observación"
          placeholder="Comentario opcional de seguimiento…"
          value={observation}
          onChange={(val) => {
            setObservation(val);
            onChange?.(status, val);
          }}
        />
      </View>
    </View>
  );
}

export function TechnicalVisitSections({
  snapshot,
  options,
  objectives = [],
  onAdd,
  onEdit,
  onRemove,
  onSaveDiagnosis,
  onRecommendationFollowUpChange,
  onCulturalFollowUpChange,
  onPhenology,
  onInstallation,
  onInstallationObservation,
  onEvidence,
}: TechnicalVisitSectionsProps) {
  const applications = activeRows(snapshot.Applications);
  const applicationDetails = activeRows(snapshot.ApplicationDetails);

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

  // Inline state for Evaluación agronómica (Diagnoses), matching nova-web
  const [diagnosisDraft, setDiagnosisDraft] = React.useState<{
    TvdID: number;
    ObjID: number | null;
    TvdPlantOrgan: number | null;
    TvdIncidencePercentage: string;
  }>({
    TvdID: 0,
    ObjID: null,
    TvdPlantOrgan: null,
    TvdIncidencePercentage: '0',
  });
  const [editingDiagnosis, setEditingDiagnosis] = React.useState(false);

  const resetDiagnosis = () => {
    setDiagnosisDraft({
      TvdID: 0,
      ObjID: null,
      TvdPlantOrgan: null,
      TvdIncidencePercentage: '0',
    });
    setEditingDiagnosis(false);
  };

  const handleSaveDiagnosis = () => {
    if (!diagnosisDraft.ObjID) {
      Alert.alert(
        'Revisa la evaluación',
        'Selecciona un objetivo agronómico.',
      );
      return;
    }
    const incidence = numberValue(diagnosisDraft.TvdIncidencePercentage);
    if (incidence == null || incidence < 0 || incidence > 100) {
      Alert.alert(
        'Revisa la evaluación',
        'La incidencia debe estar entre 0 y 100 %.',
      );
      return;
    }
    const objective = objectives.find(
      (item) => item.value === diagnosisDraft.ObjID,
    );
    if (!objective) {
      Alert.alert(
        'Revisa la evaluación',
        'El elemento seleccionado ya no está disponible.',
      );
      return;
    }
    if (onSaveDiagnosis) {
      onSaveDiagnosis({
        TvdID: diagnosisDraft.TvdID,
        ObjID: objective.value,
        TvdCategory: objective.ObjType ?? 1,
        TvdPlantOrgan: diagnosisDraft.TvdPlantOrgan,
        TvdIncidencePercentage: incidence,
        TvdItemDescription: objective.label,
      });
      resetDiagnosis();
    } else {
      onAdd('Diagnoses');
    }
  };

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

  const detailsFor = (application: Row) =>
    applicationDetails.filter(
      (detail) => Number(detail.TapID) === Number(application.TapID),
    );

  const applicationSummaryColumns: TableColumn[] = [
    {
      key: 'products',
      label: 'Producto / observación',
      className: 'flex-[2]',
      render: (application) => (
        <TwoLine
          title={
            detailsFor(application)
              .map(
                (detail) =>
                  textOf(detail.TadProductDescription) ||
                  textOf(detail.TadObservation) ||
                  'Sin producto',
              )
              .join(', ') || 'Sin productos'
          }
          detail={`${dateTimeText(application.TapStartDateTime)} · ${optionText(options, 'OAG_FIELD_APPLICATION_MODE', application.TapApplicationMode, application.TapApplicationModeDescription)}`}
        />
      ),
    },
    {
      key: 'types',
      label: 'Tipo aplicación',
      render: (application) => (
        <Text className="text-xs">
          {detailsFor(application)
            .map((detail) =>
              optionText(
                options,
                'OAG_APPLICATION_TYPE',
                detail.TadApplicationType,
                detail.TadApplicationTypeDescription,
              ),
            )
            .join(', ') || '—'}
        </Text>
      ),
    },
    {
      key: 'doses',
      label: 'Dosis',
      align: 'right',
      render: (application) => (
        <Text className="text-right text-xs">
          {detailsFor(application)
            .map((detail) =>
              measureText(
                options,
                detail.TadDose,
                'OAG_DOSE_UNIT',
                detail.TadDoseUnit,
                detail.TadDoseUnitDescription,
              ),
            )
            .join(', ') || '—'}
        </Text>
      ),
    },
    {
      key: 'quantities',
      label: 'Cantidad',
      align: 'right',
      render: (application) => (
        <Text className="text-right text-xs">
          {detailsFor(application)
            .map((detail) =>
              measureText(
                options,
                detail.TadQuantity,
                'OAG_APPLICATION_QUANTITY_UNIT',
                detail.TadQuantityUnit,
                detail.TadQuantityUnitDescription,
              ),
            )
            .join(', ') || '—'}
        </Text>
      ),
    },
  ];

  // Matches nova-web TechnicalVisitAssessments table columns:
  // 1. Objetivo agronómico, 2. Órgano, 3. Incidencia (no Observación column)
  const diagnosisColumns: TableColumn[] = [
    {
      key: 'item',
      label: 'Objetivo agronómico',
      className: 'flex-[2]',
      render: (row) => {
        const matchedObj = objectives.find(
          (item) => item.value === numberValue(row.ObjID),
        );
        return (
          <Text className="text-xs text-foreground">
            {matchedObj?.label || textOf(row.TvdItemDescription) || '—'}
          </Text>
        );
      },
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
            {incidence == null ? '0%' : `${incidence}%`}
          </Text>
        );
      },
    },
  ];

  // Matches nova-web TechnicalVisitFieldWork table columns:
  // Actividad, Fecha inicio, Fecha fin, Observación
  const activityColumns: TableColumn[] = [
    {
      key: 'activity',
      label: 'Actividad',
      render: (row) => (
        <Text className="text-xs">
          {optionText(
            options,
            'OAG_VISIT_CULTURAL_ACTIVITY',
            row.TvaActivityType,
            row.TvaActivityTypeDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'start',
      label: 'Fecha inicio',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TvaStartDate)}</Text>
      ),
    },
    {
      key: 'end',
      label: 'Fecha fin',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TvaEndDate)}</Text>
      ),
    },
    {
      key: 'observation',
      label: 'Observación',
      render: (row) => (
        <Text className="text-xs">{textOf(row.TvaObservation) || '—'}</Text>
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
        <Text className="text-xs">{textOf(row.TvrInstruction) || '—'}</Text>
      ),
    },
  ];

  // Matches nova-web TechnicalVisitCulturalActivities table columns:
  // Actividad cultural, Fecha inicio, Fecha fin, Observación
  const culturalColumns: TableColumn[] = [
    {
      key: 'activity',
      label: 'Actividad cultural',
      render: (row) => (
        <Text className="text-xs">
          {optionText(
            options,
            'OAG_VISIT_CULTURAL_ACTIVITY',
            row.TcaActivityType,
            row.TcaActivityTypeDescription,
          )}
        </Text>
      ),
    },
    {
      key: 'start',
      label: 'Fecha inicio',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TcaStartDate)}</Text>
      ),
    },
    {
      key: 'end',
      label: 'Fecha fin',
      render: (row) => (
        <Text className="text-xs">{dateText(row.TcaEndDate)}</Text>
      ),
    },
    {
      key: 'observation',
      label: 'Observación',
      render: (row) => (
        <Text className="text-xs">{textOf(row.TcaObservation) || '—'}</Text>
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
        const pendingName =
          row.PendingFile && typeof row.PendingFile === 'object'
            ? textOf((row.PendingFile as { name?: unknown }).name)
            : '';
        const uri =
          pendingUri ??
          (fileId != null && fileId > 0 ? managedFilePreviewUrl(fileId) : null);
        if (!uri) {
          return (
            <Text className="text-xs">
              {pendingName ||
                (fileId != null && fileId > 0 ? `Archivo ${fileId}` : '—')}
            </Text>
          );
        }
        return (
          <View className="flex-row items-center gap-2">
            <Image
              source={{
                uri,
                ...(pendingUri
                  ? {}
                  : { headers: { 'X-Nova-Client': 'nova-app' } }),
              }}
              style={{ width: 40, height: 40, borderRadius: 6 }}
              contentFit="cover"
              accessibilityLabel="Archivo de evidencia"
            />
            {pendingName ? (
              <Text
                className="text-xs text-muted-foreground"
                numberOfLines={1}
              >
                {pendingName}
              </Text>
            ) : null}
          </View>
        );
      },
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (row) => (
        <Text className="text-xs">
          {textOf(row.TveDescription) || '—'}
        </Text>
      ),
    },
  ];

  const followUpStatusOptions =
    options.OAG_RECOMMENDATION_FOLLOW_UP_STATUS ?? [];

  return (
    <View className="gap-4 md:gap-5">
      {/* 1. Aplicaciones */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Aplicaciones"
          subtitle="Productos, dosis y modo de aplicación registrados en la visita."
          icon={FlaskConical}
          action={
            <AddButton
              label="Agregar aplicación"
              onPress={() => onAdd('Applications')}
            />
          }
        />
        <ResponsiveTable
          columns={applicationSummaryColumns}
          rows={applications}
          rowKey={(application) => String(application.TapID)}
          empty={
            <EmptyState
              title="No hay aplicaciones registradas"
              subtitle="Agrega la primera aplicación de la visita."
              icon={FlaskConical}
            />
          }
          onEdit={(application) => onEdit('Applications', application)}
          onRemove={(application) => onRemove('Applications', application)}
          editLabel="Editar aplicación"
          removeLabel="Eliminar aplicación"
        />
      </View>

      {/* 2. Estado fenológico & Evaluación agronómica */}
      <View className="gap-4 md:flex-row md:items-start md:gap-5">
        <View className="gap-3 md:w-1/3">
          <VisitSectionHeading
            title="Estado fenológico"
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
                    {formatters.decimal(totalPhenology, 2)}%
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
            title="Evaluación agronómica"
            icon={ShieldAlert}
            action={
              <View className="flex-row items-center gap-2">
                {editingDiagnosis ? (
                  <NButton
                    variant="outline"
                    className="h-8 px-3"
                    onPress={resetDiagnosis}
                  >
                    <X
                      size={14}
                      className="text-foreground"
                    />
                    <Text>Cancelar</Text>
                  </NButton>
                ) : null}
                <NButton
                  className="h-8 px-3"
                  onPress={handleSaveDiagnosis}
                >
                  {editingDiagnosis ? (
                    <Save
                      size={14}
                      className="text-primary-foreground"
                    />
                  ) : (
                    <Plus
                      size={14}
                      className="text-primary-foreground"
                    />
                  )}
                  <Text>{editingDiagnosis ? 'Actualizar' : 'Agregar'}</Text>
                </NButton>
              </View>
            }
          />

          {/* Inline form matching nova-web TechnicalVisitAssessments */}
          <View className="flex-col gap-3 md:flex-row md:items-start">
            <NSelect
              label="Objetivo agronómico"
              items={objectives}
              itemText="label"
              itemValue="value"
              value={diagnosisDraft.ObjID}
              onChange={(value) =>
                setDiagnosisDraft((current) => ({
                  ...current,
                  ObjID: value != null ? Number(value) : null,
                }))
              }
              placeholder="Selecciona un objetivo"
              searchPlaceholder="Buscar objetivo…"
              searchable
              clearable
              required
              containerClassName="md:flex-[2]"
            />
            <NSelect
              label="Órgano"
              items={options.OAG_PLANT_ORGAN ?? []}
              itemText="label"
              itemValue="value"
              value={diagnosisDraft.TvdPlantOrgan}
              onChange={(value) =>
                setDiagnosisDraft((current) => ({
                  ...current,
                  TvdPlantOrgan: value != null ? Number(value) : null,
                }))
              }
              placeholder="Seleccionar..."
              clearable
              containerClassName="md:flex-1"
            />
            <NText
              label="Incidencia (%)"
              decimal
              value={diagnosisDraft.TvdIncidencePercentage}
              onChange={(value) =>
                setDiagnosisDraft((current) => ({
                  ...current,
                  TvdIncidencePercentage: value,
                }))
              }
              required
              containerClassName="md:flex-1"
            />
          </View>

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
            onEdit={(row) => {
              setDiagnosisDraft({
                TvdID: Number(row.TvdID) || 0,
                ObjID: row.ObjID != null ? Number(row.ObjID) : null,
                TvdPlantOrgan:
                  row.TvdPlantOrgan != null ? Number(row.TvdPlantOrgan) : null,
                TvdIncidencePercentage: String(
                  row.TvdIncidencePercentage ?? '0',
                ),
              });
              setEditingDiagnosis(true);
            }}
            onRemove={(row) => {
              if (Number(row.TvdID) === diagnosisDraft.TvdID) {
                resetDiagnosis();
              }
              onRemove('Diagnoses', row);
            }}
            editLabel="Editar evaluación fitosanitaria"
            removeLabel="Eliminar evaluación fitosanitaria"
          />
        </View>
      </View>

      {/* 3. Actividades culturales realizadas */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Actividades culturales realizadas"
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
              title="No hay actividades culturales realizadas"
              icon={ClipboardList}
            />
          }
          onEdit={(row) => onEdit('Activities', row)}
          onRemove={(row) => onRemove('Activities', row)}
          editLabel="Editar actividad realizada"
          removeLabel="Eliminar actividad realizada"
        />
      </View>

      {/* 4. Evaluación de instalaciones */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Evaluación de instalaciones"
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
              const hasObservation = Boolean(textOf(row?.TinObservation));
              return (
                <View
                  key={option.value}
                  className="w-full flex-row items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 md:w-[32%]"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-poppins-semibold">
                      {option.label}
                    </Text>
                    {hasObservation ? (
                      <Text className="text-[10px] text-muted-foreground">
                        {textOf(row?.TinObservation)}
                      </Text>
                    ) : null}
                  </View>
                  <IconAction
                    label={
                      hasObservation
                        ? `Editar comentario de ${option.label}`
                        : `Agregar comentario de ${option.label}`
                    }
                    icon={MessageSquare}
                    highlighted={hasObservation}
                    onPress={() =>
                      onInstallationObservation?.(
                        option,
                        textOf(row?.TinObservation),
                      )
                    }
                  />
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

      {/* 5. Recomendaciones */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Recomendaciones"
          icon={ClipboardList}
        />
        <View className="flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <View className="min-w-0 flex-row items-center gap-2.5 border-b border-border/40 pb-2">
            <View className="rounded-lg bg-primary/10 p-2">
              <FlaskConical
                size={16}
                className="text-primary"
              />
            </View>
            <View className="min-w-0">
              <Text className="text-base font-poppins text-foreground/90">
                Aplicaciones
              </Text>
              <Text className="text-xs text-muted-foreground">
                Insumos, dosis y objetivos recomendados al productor.
              </Text>
            </View>
          </View>
          <View className="self-end md:self-auto">
            <AddButton
              label="Agregar recomendación"
              onPress={() => onAdd('Recommendations')}
            />
          </View>
        </View>
        <ResponsiveTable
          columns={recommendationColumns}
          rows={recommendations}
          rowKey={(row) => String(row.TvrID ?? '')}
          empty={
            <EmptyState
              title="No hay recomendaciones registradas"
              subtitle="Agrega los insumos y objetivos indicados al productor."
              icon={Sprout}
            />
          }
          onEdit={(row) => onEdit('Recommendations', row)}
          onRemove={(row) => onRemove('Recommendations', row)}
          editLabel="Editar recomendación"
          removeLabel="Eliminar recomendación"
        />
      </View>

      {/* 6. Seguimiento de recomendaciones anteriores */}
      <View className="gap-2.5">
        <VisitSectionHeading
          title="Seguimiento de recomendaciones anteriores"
          icon={ClipboardList}
        />
        {previousRecommendations.length === 0 ? (
          <View className="rounded-lg border border-dashed border-border/60 px-4 py-3.5">
            <Text className="text-center text-xs text-muted-foreground">
              No hay recomendaciones de visitas anteriores para revisar.
            </Text>
          </View>
        ) : (
          previousRecommendations.map((recommendation, index) => {
            const recId = numberValue(recommendation.TvrID) ?? 0;
            const existing = recommendationFollowUps.find(
              (followUp) => numberValue(followUp.TvrID) === recId,
            );
            const itemTitle =
              textOf(recommendation.FrsDescription) ||
              textOf(recommendation.TvrProductDescription) ||
              'Recomendación';
            const itemSubtitle = [
              textOf(recommendation.TvrObjective),
              textOf(recommendation.TvrInstruction),
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <FollowUpEditorRow
                key={String(recommendation.TvrID ?? index)}
                title={itemTitle}
                subtitle={itemSubtitle || undefined}
                statusOptions={followUpStatusOptions}
                initialStatus={numberValue(existing?.TrfStatus) ?? 0}
                initialObservation={textOf(existing?.TrfObservation)}
                onChange={(status, observation) =>
                  onRecommendationFollowUpChange?.(recId, status, observation)
                }
              />
            );
          })
        )}
      </View>

      {/* 7. Actividades culturales sugeridas */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Actividades culturales"
          subtitle="Registra las labores sugeridas al productor para revisarlas en la próxima visita."
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
              icon={ClipboardList}
            />
          }
          onEdit={(row) => onEdit('CulturalActivities', row)}
          onRemove={(row) => onRemove('CulturalActivities', row)}
          editLabel="Editar actividad cultural"
          removeLabel="Eliminar actividad cultural"
        />
      </View>

      {/* 8. Seguimiento de actividades anteriores */}
      <View className="gap-2.5">
        <VisitSectionHeading
          title="Seguimiento de actividades anteriores"
          icon={Sprout}
        />
        {previousCulturalActivities.length === 0 ? (
          <View className="rounded-lg border border-dashed border-border/60 px-4 py-3.5">
            <Text className="text-center text-xs text-muted-foreground">
              No hay actividades de visitas anteriores para revisar.
            </Text>
          </View>
        ) : (
          previousCulturalActivities.map((activity, index) => {
            const actId = numberValue(activity.TcaID) ?? 0;
            const existing = culturalFollowUps.find(
              (followUp) => numberValue(followUp.TcaID) === actId,
            );
            const dateRange = [
              textOf(activity.TcaStartDate)
                ? dateText(activity.TcaStartDate)
                : null,
              textOf(activity.TcaEndDate)
                ? dateText(activity.TcaEndDate)
                : null,
            ]
              .filter(Boolean)
              .join(' – ');
            const subtitle = [dateRange, textOf(activity.TcaObservation)]
              .filter(Boolean)
              .join(' · ');
            return (
              <FollowUpEditorRow
                key={String(activity.TcaID ?? index)}
                title={
                  optionText(
                    options,
                    'OAG_VISIT_CULTURAL_ACTIVITY',
                    activity.TcaActivityType,
                    activity.TcaActivityTypeDescription,
                  ) || 'Actividad cultural'
                }
                subtitle={subtitle || undefined}
                statusOptions={followUpStatusOptions}
                initialStatus={numberValue(existing?.TcfStatus) ?? 0}
                initialObservation={textOf(existing?.TcfObservation)}
                onChange={(status, observation) =>
                  onCulturalFollowUpChange?.(actId, status, observation)
                }
              />
            );
          })
        )}
      </View>

      {/* 9. Evidencias */}
      <View className="gap-3">
        <VisitSectionHeading
          title="Evidencias"
          subtitle="Fotos y documentos que respaldan la visita"
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
