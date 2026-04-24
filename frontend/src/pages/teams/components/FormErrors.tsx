type FormErrorsProps = {
  message?: string | null;
};

export function FormErrors({ message }: FormErrorsProps) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
