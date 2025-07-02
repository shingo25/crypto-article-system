import * as React from "react"
import { cn } from "@/lib/utils"

export interface NeuralInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const NeuralInput = React.forwardRef<HTMLInputElement, NeuralInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "neural-neumorphic-inset", // 内側の影を適用
          "flex h-10 w-full rounded-md border-none bg-transparent px-3 py-2 text-sm",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-neural-text-muted",
          "text-neural-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neural-void", // フォーカス時のスタイル
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
NeuralInput.displayName = "NeuralInput"

export { NeuralInput }