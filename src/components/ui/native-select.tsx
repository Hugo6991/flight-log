import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export const NativeSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className = "", ...props }, ref) => (
  <span className={`ui-select ${className}`}>
    <select ref={ref} {...props} />
    <ChevronDown size={16} aria-hidden="true" />
  </span>
));
NativeSelect.displayName = "NativeSelect";
