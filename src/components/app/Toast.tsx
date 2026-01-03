import { toast as sonnerToast } from "sonner";
import { CheckCircle, AlertCircle, Info, Wifi, WifiOff } from "lucide-react";

type ToastType = "success" | "error" | "info" | "offline" | "online";

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  offline: WifiOff,
  online: Wifi,
};

export const showToast = (type: ToastType, options: ToastOptions) => {
  const Icon = icons[type];
  const { title, description, duration = 3000 } = options;
  
  sonnerToast(title, {
    description,
    duration,
    icon: <Icon className="w-5 h-5" />,
    className: "toast-custom",
  });
};

// Convenience methods
export const toast = {
  success: (title: string, description?: string) => 
    showToast("success", { title, description }),
  error: (title: string, description?: string) => 
    showToast("error", { title, description }),
  info: (title: string, description?: string) => 
    showToast("info", { title, description }),
  offline: () => 
    showToast("offline", { title: "Saved offline", description: "Changes will sync when online" }),
  online: () => 
    showToast("online", { title: "Back online", description: "All changes synced" }),
};
