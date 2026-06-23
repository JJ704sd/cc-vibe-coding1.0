import { useToastContext, type ToastTone } from './ToastProvider';

export interface ToastApi {
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  warning: (message: string) => string;
  show: (tone: ToastTone, message: string) => string;
  dismiss: (id: string) => void;
}

export function useToast(): ToastApi {
  const ctx = useToastContext();
  return {
    success: (message) => ctx.show('success', message),
    error: (message) => ctx.show('error', message),
    info: (message) => ctx.show('info', message),
    warning: (message) => ctx.show('warning', message),
    show: (tone, message) => ctx.show(tone, message),
    dismiss: ctx.dismiss,
  };
}