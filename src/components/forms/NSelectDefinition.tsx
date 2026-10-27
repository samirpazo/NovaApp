import { Q } from '@nozbe/watermelondb';
import * as React from 'react';

import { NSelect, type NSelectProps } from '@/components/forms/NSelect';
import { database } from '@/database';
import { GenDefinitionDetailModel } from '@/database/models/GenDefinitionDetail';
import { SYNC_RESOURCES } from '@/contracts/sync';

type DefinitionOption = Pick<
  GenDefinitionDetailModel,
  | 'DedID'
  | 'DedCode'
  | 'DedDescription'
  | 'DedValue'
  | 'DedAbbreviation'
  | 'DedGroup'
> &
  Record<string, unknown>;

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
  ...props
}: NSelectDefinitionProps) {
  const [items, setItems] = React.useState<DefinitionOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const query = React.useMemo(
    () =>
      database
        .get<GenDefinitionDetailModel>(SYNC_RESOURCES.GenDefinitionDetail)
        .query(
          Q.where('SecStatus', true),
          Q.where('DedCode', defCode),
          ...(group ? [Q.where('DedGroup', group)] : []),
          Q.sortBy('DedValue', Q.asc),
        ),
    [defCode, group],
  );

  React.useEffect(() => {
    setItems([]);
    setLoading(true);
    const subscription = query.observe().subscribe({
      next: (rows) => {
        setItems(
          rows.map((row) => ({
            DedID: row.DedID,
            DedCode: row.DedCode,
            DedDescription: row.DedDescription,
            DedValue: row.DedValue,
            DedAbbreviation: row.DedAbbreviation,
            DedGroup: row.DedGroup,
          })),
        );
        setLoading(false);
      },
      error: () => setLoading(false),
    });
    return () => subscription.unsubscribe();
  }, [query]);

  return (
    <NSelect
      {...props}
      items={items}
      loading={loading}
    />
  );
}
