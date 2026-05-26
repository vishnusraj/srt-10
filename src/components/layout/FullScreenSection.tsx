import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface FullScreenSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  as?: React.ElementType;
}

const FullScreenSection = forwardRef<HTMLElement, FullScreenSectionProps>(
  ({ children, className, id, as: Tag = "section" }, ref) => {
    return (
      <Tag
        ref={ref}
        id={id}
        className={cn(
          "relative w-full min-h-screen flex flex-col",
          className
        )}
      >
        {children}
      </Tag>
    );
  }
);

FullScreenSection.displayName = "FullScreenSection";

export { FullScreenSection };
