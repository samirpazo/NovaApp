import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Paperclip } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { useAuthStore } from '@/auth';
import { NCrud, type NCrudColumn } from '@/components/crud';
import { NSelect, NSwitch, NText } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SYNC_RESOURCES } from '@/contracts/sync';
import {
  genDefinitionDetailQueries,
  genDefinitionDetailDataSource,
  genDefinitionDetailService,
  type GenDefinitionDetailListItem,
  type GenDefinitionOption,
} from '@/features/general/definition-details';
import { uploadManagedFile } from '@/lib/fileService';

interface DetailDraft {
  DedValue: string;
  DedDescription: string;
  DedAbbreviation: string;
  DedFormat: string;
  DedGroup: string;
  DedHelper: string;
  DedHelper2: string;
  DedIcon: string;
  DedColor: string;
  active: boolean;
  DedImageFilID: number | null;
  attachmentName: string | null;
}

const emptyDraft = (): DetailDraft => ({
  DedValue: '',
  DedDescription: '',
  DedAbbreviation: '',
  DedFormat: '',
  DedGroup: '',
  DedHelper: '',
  DedHelper2: '',
  DedIcon: '',
  DedColor: '',
  active: true,
  DedImageFilID: null,
  attachmentName: null,
});

const columns: NCrudColumn<GenDefinitionDetailListItem>[] = [
  { key: 'DedValue', title: 'Valor', width: 85, align: 'right' },
  {
    key: 'DedDescription',
    title: 'Descripción',
    width: 280,
    searchable: true,
  },
  {
    key: 'DedAbbreviation',
    title: 'Abreviatura',
    width: 130,
    searchable: true,
  },
  { key: 'DedHelper', title: 'Aux. 1', width: 170, searchable: true },
  { key: 'DedHelper2', title: 'Aux. 2', width: 170, searchable: true },
  {
    key: 'DedStated',
    title: 'Estado',
    width: 100,
    format: (row) => (row.DedStated === 1 ? 'Activo' : 'Inactivo'),
  },
];

export default function DefinitionDetailsScreen() {
  const router = useRouter();
  const { definitionId: routeDefinitionId } = useLocalSearchParams<{
    definitionId?: string | string[];
  }>();
  const requestedDefinitionId = React.useMemo(() => {
    const rawValue = Array.isArray(routeDefinitionId)
      ? routeDefinitionId[0]
      : routeDefinitionId;
    const value = Number(rawValue);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [routeDefinitionId]);
  const userId = useAuthStore((state) => state.Session?.User.UsrID ?? 0);
  const [definitions, setDefinitions] = React.useState<GenDefinitionOption[]>(
    [],
  );
  const [definitionId, setDefinitionId] = React.useState<number | null>(
    requestedDefinitionId,
  );
  const [editing, setEditing] =
    React.useState<GenDefinitionDetailListItem | null>(null);
  const [draft, setDraft] = React.useState<DetailDraft>(emptyDraft);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onError = (reason: unknown) => {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron leer los detalles locales.',
      );
    };
    const definitionSubscription =
      genDefinitionDetailQueries.observeDefinitions((records) => {
        setDefinitions(records);
        setDefinitionId((current) =>
          current && records.some((record) => record.DefID === current)
            ? current
            : requestedDefinitionId &&
                records.some((record) => record.DefID === requestedDefinitionId)
              ? requestedDefinitionId
              : (records[0]?.DefID ?? null),
        );
      }, onError);
    return () => {
      definitionSubscription.unsubscribe();
    };
  }, [requestedDefinitionId]);

  const selectedDefinition =
    definitions.find((definition) => definition.DefID === definitionId) ?? null;
  const definitionItems = React.useMemo(
    () =>
      definitions.map((definition) => ({
        value: definition.DefID,
        text: `${definition.DefCode} · ${definition.DefDescription}`,
      })),
    [definitions],
  );

  const closeForm = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setError(null);
  };

  const beginAdd = async () => {
    if (!selectedDefinition) return;
    const nextValue = await genDefinitionDetailQueries.nextValue(
      selectedDefinition.DefID,
    );
    setEditing(null);
    setDraft({ ...emptyDraft(), DedValue: String(nextValue) });
    setError(null);
  };

  const beginEdit = (model: GenDefinitionDetailListItem) => {
    setEditing(model);
    setDraft({
      DedValue: String(model.DedValue),
      DedDescription: model.DedDescription,
      DedAbbreviation: model.DedAbbreviation ?? '',
      DedFormat: model.DedFormat ?? '',
      DedGroup: model.DedGroup ?? '',
      DedHelper: model.DedHelper ?? '',
      DedHelper2: model.DedHelper2 ?? '',
      DedIcon: model.DedIcon ?? '',
      DedColor: model.DedColor ?? '',
      active: model.DedStated === 1,
      DedImageFilID: model.DedImageFilID,
      attachmentName: model.DedImageFilID
        ? `Archivo #${model.DedImageFilID}`
        : null,
    });
    setError(null);
  };

  const selectAttachment = async () => {
    setUploading(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const file = await uploadManagedFile(
        {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          file: asset.file,
        },
        'ROUTE_DEFINITION_IMGS',
      );
      setDraft((state) => ({
        ...state,
        DedImageFilID: file.FileId,
        attachmentName: file.OriginalName,
      }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo cargar el archivo.',
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const value = Number(draft.DedValue);
    const description = draft.DedDescription.trim();
    if (
      !selectedDefinition ||
      !Number.isInteger(value) ||
      value < 0 ||
      !description
    ) {
      setError('Definición, valor y descripción son obligatorios.');
      return false;
    }
    setError(null);
    try {
      await genDefinitionDetailService.save({
        LocalId: editing?.id,
        Definition: selectedDefinition,
        DedValue: value,
        DedDescription: description,
        DedAbbreviation: draft.DedAbbreviation,
        DedFormat: draft.DedFormat,
        DedGroup: draft.DedGroup,
        DedHelper: draft.DedHelper,
        DedHelper2: draft.DedHelper2,
        DedIcon: draft.DedIcon,
        DedColor: draft.DedColor,
        DedStated: draft.active ? 1 : 0,
        DedImageFilID: draft.DedImageFilID,
        UserId: userId,
      });
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo guardar el detalle local.',
      );
      return false;
    }
  };

  const remove = async (row: GenDefinitionDetailListItem) => {
    try {
      await genDefinitionDetailService.remove(row.id, userId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo eliminar el detalle local.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-6xl gap-4 pb-24 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.replace('/definitions')}
            accessibilityLabel="Volver a definiciones"
          >
            <ArrowLeft size={20} />
          </Button>
          <View className="min-w-0 flex-1">
            <Text variant="title">Valores de definición</Text>
            <Text variant="caption">GenDefinitionDetail · datos locales</Text>
          </View>
        </View>

        <NSelect
          label="Definición"
          items={definitionItems}
          itemText="text"
          itemValue="value"
          value={definitionId}
          onChange={(value) => {
            setDefinitionId(Number(value));
            closeForm();
          }}
          searchable
          required
        />

        {error ? (
          <Text
            className="text-sm text-destructive"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
        <NCrud
          authorization={{ optCode: 'GEN_DEFINITIONS' }}
          offline={{ resource: SYNC_RESOURCES.GenDefinitionDetail }}
          title={
            selectedDefinition
              ? `Valores: ${selectedDefinition.DefDescription}`
              : 'GenDefinitionDetail'
          }
          persistenceKey={`gen-definition-details-${definitionId ?? 'none'}`}
          filter={{ DefID: definitionId }}
          form={{
            addTitle: 'Nuevo valor',
            editTitle: 'Editar valor',
            description: selectedDefinition?.DefCode,
            onSubmit: save,
            onClose: closeForm,
            footer: () => (
              <NSwitch
                value={draft.active}
                onValueChange={(active) =>
                  setDraft((state) => ({ ...state, active }))
                }
                label="Activo"
              />
            ),
            render: () => (
              <>
                <View className="gap-3 md:flex-row">
                  <NText
                    label="Descripción"
                    required
                    value={draft.DedDescription}
                    onChange={(DedDescription) =>
                      setDraft((state) => ({ ...state, DedDescription }))
                    }
                    containerClassName="flex-[2]"
                  />
                  <NText
                    label="Valor"
                    required
                    number
                    value={draft.DedValue}
                    editable={editing === null}
                    onChange={(DedValue) =>
                      setDraft((state) => ({ ...state, DedValue }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Abreviatura"
                    uppercase
                    value={draft.DedAbbreviation}
                    onChange={(DedAbbreviation) =>
                      setDraft((state) => ({ ...state, DedAbbreviation }))
                    }
                    containerClassName="flex-1"
                  />
                </View>
                <View className="flex-row items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-8 px-3"
                    disabled={uploading}
                    onPress={selectAttachment}
                  >
                    <Paperclip size={14} />
                    <Text className="text-xs">Adjuntar imagen</Text>
                  </Button>
                  <Text className="text-xs text-muted-foreground">
                    {draft.attachmentName ?? 'Sin archivo adjunto'}
                  </Text>
                </View>
                <View className="gap-3 md:flex-row">
                  <NText
                    label="Formato"
                    value={draft.DedFormat}
                    onChange={(DedFormat) =>
                      setDraft((state) => ({ ...state, DedFormat }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Grupo"
                    value={draft.DedGroup}
                    onChange={(DedGroup) =>
                      setDraft((state) => ({ ...state, DedGroup }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Icono"
                    value={draft.DedIcon}
                    onChange={(DedIcon) =>
                      setDraft((state) => ({ ...state, DedIcon }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Color"
                    value={draft.DedColor}
                    onChange={(DedColor) =>
                      setDraft((state) => ({ ...state, DedColor }))
                    }
                    containerClassName="flex-1"
                  />
                </View>
                <View className="gap-3 md:flex-row">
                  <NText
                    label="Auxiliar 1"
                    value={draft.DedHelper}
                    onChange={(DedHelper) =>
                      setDraft((state) => ({ ...state, DedHelper }))
                    }
                    containerClassName="flex-1"
                  />
                  <NText
                    label="Auxiliar 2"
                    value={draft.DedHelper2}
                    onChange={(DedHelper2) =>
                      setDraft((state) => ({ ...state, DedHelper2 }))
                    }
                    containerClassName="flex-1"
                  />
                </View>
              </>
            ),
          }}
          dataSource={genDefinitionDetailDataSource}
          columns={columns}
          searchPlaceholder="Descripción, abreviatura o auxiliar"
          selectionMode="single"
          toolbar={{
            add: Boolean(selectedDefinition),
            edit: true,
            remove: true,
            export: true,
          }}
          onAdd={selectedDefinition ? beginAdd : undefined}
          onEdit={beginEdit}
          onDelete={remove}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
