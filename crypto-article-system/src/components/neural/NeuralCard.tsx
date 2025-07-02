import * as React from "react"
import { cn } from "@/lib/utils"

// shadcn/uiのCardコンポーネントをそのまま利用し、スタイルを適用
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// NeuralCardのベースとなるコンポーネント
const NeuralCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn(
      "neural-neumorphic bg-transparent border-none", // 基本スタイル
      className
    )}
    {...props}
  />
))
NeuralCard.displayName = "NeuralCard"

export { NeuralCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }