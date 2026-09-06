"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisualViewport } from "@/lib/hooks/use-visual-viewport";

const DialogContext = React.createContext<boolean>(false);

/**
 * Wrapper around Radix's Root that also exposes the `open` state via context
 * so `DialogContent` can drive framer-motion's enter/exit animations while
 * Radix still owns focus trap / keyboard behaviour.
 */
function Dialog({
  open,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogContext.Provider value={open === true}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}
Dialog.displayName = "Dialog";

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// Overlay: gentle fade only — keep it subtle so it never steals focus.
const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

// Content: fade + tiny rise + scale. A light spring on enter gives a
// "settling in" feel; exit is a quick, snappy contract.
const contentMotion = {
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 26, stiffness: 320, mass: 0.9 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.97,
    transition: { duration: 0.15, ease: "easeIn" },
  },
} as const;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-xs", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const open = React.useContext(DialogContext);
  const vv = useVisualViewport();

  // On Android the on-screen keyboard does NOT resize the layout/dynamic
  // viewport, so `position: fixed` content centered via `top: 50%` ends up
  // behind the keyboard. When the keyboard is up, constrain the dialog to
  // the *visual viewport* (the area that is actually visible on screen) —
  // the web equivalent of Compose's `imePadding()` — and center within it.
  // No positional math: a full-viewport flex wrapper simply gets resized to
  // the visual viewport's box and the dialog is centered by flexbox.
  const keyboardVisible =
    vv !== null &&
    typeof window !== "undefined" &&
    window.innerHeight - vv.height > 100;

  const wrapperStyle: React.CSSProperties =
    keyboardVisible && vv
      ? { top: vv.offsetTop, height: vv.height }
      : {};

  return (
    <AnimatePresence>
      {open && (
        <DialogPortal forceMount>
          <DialogOverlay forceMount asChild>
            <motion.div {...overlayMotion} />
          </DialogOverlay>
          {/* The actual visual viewport box, on top of the document */}
          <div
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
            style={wrapperStyle}
          >
            <DialogPrimitive.Content
              ref={ref}
              forceMount
              asChild
              {...props}
            >
              <motion.div
                className={cn(
                  "pointer-events-auto relative grid w-full max-w-lg max-h-full gap-4 overflow-y-auto overscroll-contain border bg-background p-6 shadow-xl rounded-xl",
                  className
                )}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={contentMotion.enter}
                exit={contentMotion.exit}
              >
                {children}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </div>
        </DialogPortal>
      )}
    </AnimatePresence>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};