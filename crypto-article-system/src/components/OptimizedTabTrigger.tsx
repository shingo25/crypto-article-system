import React from 'react'
import { TabsTrigger } from '@/components/ui/tabs'
import { LucideIcon } from 'lucide-react'

interface OptimizedTabTriggerProps {
  value: string
  icon: LucideIcon
  label: string
  isDarkMode: boolean
  gradientColors: {
    from: string
    to: string
  }
}

const getTabStyles = (isDarkMode: boolean, gradientColors: { from: string; to: string }) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-2xl px-3 sm:px-4 py-2.5 font-semibold transition-all duration-300 h-11"
  
  const themeClasses = isDarkMode 
    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' 
    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/70'
  
  const activeClasses = `data-[state=active]:bg-gradient-to-r data-[state=active]:from-${gradientColors.from} data-[state=active]:to-${gradientColors.to} data-[state=active]:text-white data-[state=active]:shadow-lg`
  
  return `${baseClasses} ${themeClasses} ${activeClasses}`
}

export const OptimizedTabTrigger = React.memo<OptimizedTabTriggerProps>(({ 
  value, 
  icon: Icon, 
  label, 
  isDarkMode, 
  gradientColors 
}) => {
  const className = React.useMemo(
    () => getTabStyles(isDarkMode, gradientColors),
    [isDarkMode, gradientColors]
  )

  return (
    <TabsTrigger value={value} className={className}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline text-sm leading-none">{label}</span>
    </TabsTrigger>
  )
})

OptimizedTabTrigger.displayName = 'OptimizedTabTrigger'