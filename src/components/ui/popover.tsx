import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import * as Primitive from "@radix-ui/react-popover";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;

/** Portal keeps menus outside scrollable cards; restore the shared theme scope. */
export const PopoverContent = forwardRef<
  ElementRef<typeof Primitive.Content>,
  ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className = "", align = "end", sideOffset = 8, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={`flight-ui ui-popover ${className}`}
      {...props}
    />
  </Primitive.Portal>
));
PopoverContent.displayName = "PopoverContent";
