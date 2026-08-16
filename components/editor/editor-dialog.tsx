import type { ComponentProps, ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface EditorDialogProps extends ComponentProps<typeof Dialog> {
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  contentClassName?: string
}

export function EditorDialog({
  title,
  description,
  footer,
  children,
  contentClassName,
  ...props
}: EditorDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn("rounded-3xl", contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
