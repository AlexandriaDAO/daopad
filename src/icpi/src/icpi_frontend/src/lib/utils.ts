import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const value = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(value)) return '0';

  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }

  return `$${value.toFixed(decimals)}`;
}

export function formatPercentage(value: number): string {
  const formatted = value.toFixed(2);
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatted}%`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}