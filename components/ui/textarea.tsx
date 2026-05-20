import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-64 w-full resize-y rounded-lg border border-stone-300 bg-white p-4 text-sm leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900",
        className,
      )}
      {...props}
    />
  );
}
