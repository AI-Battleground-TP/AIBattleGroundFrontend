import React from "react";
import { Button as ShadcnButton, type ButtonProps as ShadcnButtonProps } from "./ui/button";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
}

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, ShadcnButtonProps["variant"]> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  danger: "destructive",
  ghost: "ghost",
};

const sizeMap: Record<ButtonSize, ShadcnButtonProps["size"]> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  asChild = false,
}) => {
  return (
    <ShadcnButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      className={cn(className)}
      asChild={asChild}
    >
      {children}
    </ShadcnButton>
  );
};
