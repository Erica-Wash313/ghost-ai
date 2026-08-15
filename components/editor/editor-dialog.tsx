import type { ComponentProps, ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EditorDialogProps extends ComponentProps<typeof Dialog> {
  title: string
  description?: string
  footer?: ReactNode
  children?: ReactNode
}

export function EditorDialog({
  title,
  description,
  footer,
  children,
  ...props
}: EditorDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="rounded-3xl">
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
