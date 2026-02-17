/**
 * Shared value formatting utility
 *
 * Used by all widgets that display formatted numbers.
 */

export type ValueFormat = 'number' | 'currency' | 'percentage' | 'duration';

export function formatValue(value: number, format?: ValueFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'duration':
      if (value >= 60) {
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      return `${value}m`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-NZ').format(value);
  }
}
