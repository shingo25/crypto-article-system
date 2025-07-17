import { NeuralLayout } from '@/components/neural/NeuralLayout'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NeuralLayout>
      {children}
    </NeuralLayout>
  )
}