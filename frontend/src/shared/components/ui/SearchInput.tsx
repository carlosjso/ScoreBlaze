import { Search, X } from "lucide-react";

import { Input } from "@/shared/components/ui/Input";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchInput({ value, onChange, placeholder = "Buscar", className }: SearchInputProps) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      placeholder={placeholder}
      className={className}
      leftIcon={<Search size={14} />}
      rightIcon={value ? <X size={14} /> : undefined}
      onRightIconClick={value ? () => onChange("") : undefined}
      onBlur={(event) => {
        if (!event.target.value.trim()) onChange("");
      }}
    />
  );
}
