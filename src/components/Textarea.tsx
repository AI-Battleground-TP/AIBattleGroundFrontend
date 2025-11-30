import React from "react";
import { Textarea as ShadcnTextarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface TextareaProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  required = false,
  disabled = false,
  className = "",
  error,
}) => {
  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <Label className="mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <ShadcnTextarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        disabled={disabled}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
};
