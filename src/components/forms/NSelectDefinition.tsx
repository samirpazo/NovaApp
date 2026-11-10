import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import * as React from 'react';

import { NSelect, type NSelectProps } from '@/components/forms/NSelect';
import { getActiveDatabase } from '@/database';
import { GenDefinitionModel } from '@/database/models/GenDefinition';
import { GenDefinitionDetailModel } from '@/database/models/GenDefinitionDetail';
import { SYNC_RESOURCES } from '@/contracts/sync';

export type DefinitionOption = Pick<
  GenDefinitionDetailModel,
  | 'DedID'
  | 'DedCode'
  | 'DedDescription'
  | 'DedValue'
  | 'DedAbbreviation'
  | 'DedGroup'
> & {
  label: string;
  text: string;
  value: number;
} & Record<string, unknown>;

export interface NSelectDefinitionProps extends Omit<
  NSelectProps<DefinitionOption>,
  'items' | 'loading'
> {
  defCode: string;
  group?: string;
}

export function NSelectDefinition({
  defCode,
  group,
  itemText = 'DedDescription',
  itemValue = 'DedValue',
  placeholder = 'Selecciona una opción',
  ...props
}: NSelectDefinitionProps) {
  const [items, setItems] = React.useState<DefinitionOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const database = getActiveDatabase();

  React.useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    setLoading(true);

    async function subscribeToDefinitions() {
      try {
        let defId: number | null = null;
        try {
          const defs = await database
            .get<GenDefinitionModel>(SYNC_RESOURCES.GenDefinition)
            .query(Q.where('SecStatus', true), Q.where('DefCode', defCode))
            .fetch();
          if (defs.length > 0) {
            defId = defs[0].DefID;
          }
        } catch {
          // ignore error if GenDefinition is empty
        }

        const clauses: Clause[] = [Q.where('SecStatus', true)];
        if (defId != null) {
          clauses.push(
            Q.or(Q.where('DedCode', defCode), Q.where('DefID', defId)),
          );
        } else {
          clauses.push(Q.where('DedCode', defCode));
        }

        if (group) {
          clauses.push(Q.where('DedGroup', group));
        }

        const query = database
          .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
          .query(...clauses, Q.sortBy('DedValue', Q.asc));

        subscription = query.observe().subscribe({
          next: (rows) => {
            if (cancelled) return;
            setItems(
              rows.map((row) => ({
                DedID: row.DedID,
                DedCode: row.DedCode,
                DedDescription: row.DedDescription,
                DedValue: row.DedValue,
                DedAbbreviation: row.DedAbbreviation,
                DedGroup: row.DedGroup,
                label: row.DedDescription,
                text: row.DedDescription,
                value: row.DedValue,
              })),
            );
            setLoading(false);
          },
          error: () => {
            if (!cancelled) setLoading(false);
          },
        });
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void subscribeToDefinitions();

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [database, defCode, group]);

  return (
    <NSelect
      itemText={itemText}
      itemValue={itemValue}
      placeholder={placeholder}
      {...props}
      items={items}
      loading={loading}
    />
  );
}
