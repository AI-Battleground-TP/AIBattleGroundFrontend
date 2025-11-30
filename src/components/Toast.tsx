import React, { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

// Global map to track active toasts by message+type to prevent duplicates
const activeToasts = new Map<string, string>();

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onClose,
  duration = 4000,
}) => {
  const toastKey = `${message}-${type}`;
  const toastIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate toasts - check if this exact message+type is already shown
    if (mountedRef.current || activeToasts.has(toastKey)) {
      return;
    }

    mountedRef.current = true;
    const toastId = `toast-${toastKey}-${Date.now()}-${Math.random()}`;
    activeToasts.set(toastKey, toastId);
    toastIdRef.current = toastId;

    const toastOptions = {
      id: toastId, // Unique ID to prevent duplicates
      duration: duration,
      onDismiss: () => {
        activeToasts.delete(toastKey);
        mountedRef.current = false;
        toastIdRef.current = null;
        onClose();
      },
    };

    // Small delay to ensure we're not in StrictMode double render
    const timeoutId = setTimeout(() => {
      switch (type) {
        case "success":
          sonnerToast.success(message, toastOptions);
          break;
        case "error":
          sonnerToast.error(message, toastOptions);
          break;
        case "info":
          sonnerToast.info(message, toastOptions);
          break;
        default:
          sonnerToast(message, toastOptions);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup on unmount
      if (toastIdRef.current && activeToasts.has(toastKey)) {
        activeToasts.delete(toastKey);
        sonnerToast.dismiss(toastIdRef.current);
        mountedRef.current = false;
        toastIdRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  return null;
};
