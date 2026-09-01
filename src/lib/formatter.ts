import { DateTime } from 'luxon';

export type CurrencyDisplay = 'symbol' | 'code' | 'name' | 'narrowSymbol';
export type DateValue = DateTime | Date | string | null | undefined;
export type NumberValue = number | string | null | undefined;

const penFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
});
const decimalFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat('es-PE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  if (locale === 'es-PE') {
    if (
      options.style === 'currency' &&
      options.currency === 'PEN' &&
      !options.currencyDisplay
    ) {
      return penFormatter;
    }
    if (
      options.minimumFractionDigits === 2 &&
      options.maximumFractionDigits === 2
    ) {
      if (!options.style) return decimalFormatter;
      if (options.style === 'percent') return percentFormatter;
    }
  }

  const key = `${locale}-${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function normalizeUtc(value: string, fromUtc: boolean): string {
  const normalized =
    value.includes(' ') && !value.includes('T')
      ? value.replace(' ', 'T')
      : value;
  if (
    fromUtc &&
    !normalized.endsWith('Z') &&
    !normalized.includes('+') &&
    normalized.split('T').length === 2 &&
    !normalized.split('T')[1].includes('-')
  ) {
    return `${normalized}Z`;
  }
  return normalized;
}

function asDateTime(value: DateValue, fromUtc: boolean): DateTime | null {
  if (!value) return null;
  if (DateTime.isDateTime(value)) return value as DateTime;
  if (value instanceof Date) return DateTime.fromJSDate(value);
  if (typeof value !== 'string') return null;

  const result = DateTime.fromISO(normalizeUtc(value, fromUtc));
  return result.isValid ? result : null;
}

function asNumber(value: NumberValue): number | null {
  const number =
    typeof value === 'number'
      ? value
      : Number.parseFloat(value?.toString() || '0');
  return Number.isNaN(number) ? null : number;
}

export const formatters = {
  date(value: DateValue, format = 'dd/MM/yyyy', fromUtc = true): string {
    return asDateTime(value, fromUtc)?.toFormat(format) ?? '-';
  },

  datetime(
    value: DateValue,
    format = 'dd/MM/yyyy HH:mm',
    fromUtc = true,
  ): string {
    return asDateTime(value, fromUtc)?.toFormat(format) ?? '-';
  },

  time(value: DateValue, format = 'HH:mm', fromUtc = true): string {
    if (!value) return '-';
    return asDateTime(value, fromUtc)?.toFormat(format) ?? value.toString();
  },

  currency(
    value: NumberValue,
    currency = 'PEN',
    locale = 'es-PE',
    display: CurrencyDisplay = 'symbol',
  ): string {
    const number = asNumber(value);
    if (number === null) return '-';

    if (/^[A-Z]{3}$/.test(currency)) {
      try {
        const formatted = getFormatter(locale, {
          style: 'currency',
          currency,
          currencyDisplay: display,
        }).format(number);

        if (display === 'name') {
          return formatted.replace(
            /[a-záéíóúñ]+/gi,
            (word) =>
              `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
          );
        }
        return formatted;
      } catch {
        // Symbols configured by the company are formatted below.
      }
    }

    const formatted = getFormatter(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(number));
    return `${number < 0 ? '-' : ''}${currency} ${formatted}`;
  },

  number(value: NumberValue, locale = 'es-PE'): string {
    const number = asNumber(value);
    if (number === null) return '-';
    return getFormatter(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  },

  decimal(value: NumberValue, decimals = 2, locale = 'es-PE'): string {
    const number = asNumber(value);
    if (number === null) return '-';
    return getFormatter(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  },

  percentage(value: NumberValue, decimals = 2, locale = 'es-PE'): string {
    const number = asNumber(value);
    if (number === null) return '-';
    return getFormatter(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number / 100);
  },

  trim(value: string | null | undefined): string {
    return (value || '').trim();
  },
};

export default formatters;
