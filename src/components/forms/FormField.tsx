import { NDate, type NDateProps } from '@/components/forms/NDate';
import { NSelect, type NSelectProps } from '@/components/forms/NSelect';
import { NText, type NTextProps } from '@/components/forms/NText';
import { Controller, type FieldPath, type FieldValues, type UseControllerProps } from 'react-hook-form';

type ControlledProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = UseControllerProps<TValues, TName>;

export function FormNText<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  ...props
}: ControlledProps<TValues, TName> & Omit<NTextProps, 'value' | 'defaultValue' | 'onChange' | 'errorMessage'>) {
  return <Controller control={control} name={name} rules={rules} render={({ field, fieldState }) => <NText {...props} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} errorMessage={fieldState.error?.message} />} />;
}

export function FormNDate<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  ...props
}: ControlledProps<TValues, TName> & Omit<NDateProps, 'value' | 'defaultValue' | 'onChange' | 'errorMessage'>) {
  return <Controller control={control} name={name} rules={rules} render={({ field, fieldState }) => <NDate {...props} value={field.value ?? null} onChange={field.onChange} errorMessage={fieldState.error?.message} />} />;
}

export function FormNSelect<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  rules,
  ...props
}: ControlledProps<TValues, TName> & Omit<NSelectProps, 'value' | 'defaultValue' | 'onChange' | 'errorMessage'>) {
  return <Controller control={control} name={name} rules={rules} render={({ field, fieldState }) => <NSelect {...props} value={field.value} onChange={field.onChange} errorMessage={fieldState.error?.message} />} />;
}
