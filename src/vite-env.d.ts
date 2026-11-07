/// <reference types="vite/client" />

interface TelegramBackButton {
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
}

type TelegramInvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

interface TelegramWebApp {
  ready(): void;
  expand(): void;
  initData?: string;
  BackButton: TelegramBackButton;
  openInvoice?(url: string, callback?: (status: TelegramInvoiceStatus) => void): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  };
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
