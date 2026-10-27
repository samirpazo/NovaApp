import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface CalendarProps {
  value: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  onSelect: (value: string) => void;
}

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function Calendar({ value, minDate, maxDate, onSelect }: CalendarProps) {
  const selected = value ? DateTime.fromISO(value).startOf('day') : null;
  const today = DateTime.now().startOf('day');
  const [month, setMonth] = React.useState(() =>
    (selected?.isValid ? selected : DateTime.now()).startOf('month'),
  );
  const firstDay = month.startOf('week');
  const min = minDate ? DateTime.fromISO(minDate).startOf('day') : null;
  const max = maxDate ? DateTime.fromISO(maxDate).startOf('day') : null;
  const days = Array.from({ length: 42 }, (_, index) =>
    firstDay.plus({ days: index }),
  );

  return (
    <View className="w-[280px] rounded-lg border border-border bg-card p-3 shadow-xl">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="px-1 text-sm font-poppins-semibold capitalize">
          {month.setLocale('es-PE').toFormat('LLLL yyyy')}
        </Text>
        <View className="flex-row">
          <Button
            accessibilityLabel="Mes anterior"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => setMonth((current) => current.minus({ months: 1 }))}
          >
            <ChevronLeft
              size={16}
              className="text-muted-foreground"
            />
          </Button>
          <Button
            accessibilityLabel="Mes siguiente"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => setMonth((current) => current.plus({ months: 1 }))}
          >
            <ChevronRight
              size={16}
              className="text-muted-foreground"
            />
          </Button>
        </View>
      </View>
      <View className="mb-1 flex-row">
        {weekDays.map((day, index) => (
          <Text
            key={`${day}-${index}`}
            className="w-[14.2857%] py-1 text-center text-[10px] font-poppins-semibold text-muted-foreground"
          >
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const isoDate = day.toISODate() ?? '';
          const isSelected = selected?.hasSame(day, 'day') ?? false;
          const isToday = today.hasSame(day, 'day');
          const isDisabled =
            (min?.isValid && day < min) || (max?.isValid && day > max);
          return (
            <View
              key={isoDate}
              className="w-[14.2857%] items-center py-0.5"
            >
              <Pressable
                accessibilityLabel={`${day.setLocale('es-PE').toFormat('d LLLL yyyy')}${isToday ? ', hoy' : ''}`}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: Boolean(isDisabled),
                  selected: isSelected,
                }}
                disabled={Boolean(isDisabled)}
                onPress={() => onSelect(isoDate)}
                className={`h-8 w-8 items-center justify-center rounded-md ${isSelected ? 'bg-primary' : isToday ? 'border border-primary active:bg-accent' : 'active:bg-accent'}`}
              >
                <Text
                  className={`text-xs ${isSelected ? 'font-poppins-semibold text-primary-foreground' : isToday ? 'font-poppins-semibold text-primary' : day.month === month.month ? 'text-foreground' : 'text-muted-foreground'} ${isDisabled ? 'opacity-30' : ''}`}
                >
                  {day.day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
