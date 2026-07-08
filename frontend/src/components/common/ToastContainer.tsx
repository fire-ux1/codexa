// Toast notification container — receives toasts array from App state

interface ToastItem {
  id: string | number;
  type?: "success" | "error" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4.5 rounded-2xl border shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto max-w-sm ${
            toast.type === "success"
              ? "bg-success-bg/25 border-success/30 text-success"
              : toast.type === "error"
              ? "bg-danger-bg/25 border-danger/30 text-danger"
              : "bg-accent-dim/25 border-accent/30 text-accent"
          }`}
        >
          <span className="text-xs font-medium leading-relaxed font-mono">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
