import * as React from "react"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"

/**
 * ToolbarButton – A standardized button for kanban/toolbar toolbars.
 *
 * Ensures consistent height (h-9 / 36px), padding, and hover behavior
 * across all toolbar instances (CSM, CRM Ops, etc.).
 *
 * Variants:
 *  - "text"  (default): text button with icon + label, px-3
 *  - "icon": square icon-only button, h-9 w-9
 */

interface ToolbarButtonProps extends Omit<ButtonProps, "size"> {
  /** "text" for label buttons, "icon" for icon-only */
  toolbarSize?: "text" | "icon"
}

const TOOLBAR_BASE = "h-9 min-h-0 py-0 transition-all duration-200 hover:scale-105"
const TOOLBAR_TEXT = "px-3 gap-2"
const TOOLBAR_ICON = "w-9 p-0"

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, toolbarSize = "text", variant = "outline", ...props }, ref) => {
    const isIcon = toolbarSize === "icon"

    return (
      <Button
        ref={ref}
        variant={variant}
        size={isIcon ? "icon" : "sm"}
        className={cn(
          TOOLBAR_BASE,
          isIcon ? TOOLBAR_ICON : TOOLBAR_TEXT,
          className,
        )}
        {...props}
      />
    )
  },
)
ToolbarButton.displayName = "ToolbarButton"

export { ToolbarButton, type ToolbarButtonProps }
