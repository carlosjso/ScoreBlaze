import { Button, Modal } from "@/shared/components/ui";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  confirmVariant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  loadingText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  loading = false,
  confirmText = "Eliminar",
  confirmVariant = "danger",
  loadingText = "Procesando...",
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidthClassName="max-w-md">
      <p className="mb-6 text-sm text-slate-600 [overflow-wrap:anywhere]">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {loading ? loadingText : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
