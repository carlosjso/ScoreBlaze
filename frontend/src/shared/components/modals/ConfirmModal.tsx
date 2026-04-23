import { Button, Modal } from "@/shared/components/ui";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  loading?: boolean;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  loading = false,
  confirmText = "Eliminar",
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidthClassName="max-w-md">
      <p className="mb-6 text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Procesando..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
