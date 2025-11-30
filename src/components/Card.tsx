import React from "react";
import {
  Card as ShadcnCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = "",
}) => {
  return (
    <ShadcnCard className={cn(className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "p-6"}>{children}</CardContent>
    </ShadcnCard>
  );
};
