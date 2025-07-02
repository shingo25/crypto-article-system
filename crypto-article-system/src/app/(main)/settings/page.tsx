'use client'

import React, { useState } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Brain, Globe, Palette, Shield } from 'lucide-react'
import AIModelSettings from '@/components/AIModelSettings'
import WordPressSettings from '@/components/WordPressSettings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai-models')

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          Settings
        </h1>
        <p className="text-neural-text-secondary">
          System configuration and preferences
        </p>
      </div>
      
      <NeuralCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-neural-cyan" />
            Configuration Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 neural-neumorphic">
              <TabsTrigger 
                value="ai-models" 
                className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
              >
                <Brain className="h-4 w-4" />
                AI Models
              </TabsTrigger>
              <TabsTrigger 
                value="wordpress" 
                className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
              >
                <Globe className="h-4 w-4" />
                WordPress
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
              >
                <Palette className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
              >
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai-models" className="mt-6">
              <div className="neural-neumorphic-inset rounded-lg p-6">
                <AIModelSettings />
              </div>
            </TabsContent>

            <TabsContent value="wordpress" className="mt-6">
              <div className="neural-neumorphic-inset rounded-lg p-6">
                <WordPressSettings />
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <div className="neural-neumorphic-inset rounded-lg p-6">
                <div className="text-center py-12">
                  <Palette className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                  <h3 className="neural-title text-lg mb-2">Appearance Settings</h3>
                  <p className="text-neural-text-secondary">
                    テーマとUIカスタマイズオプション（今後実装予定）
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <div className="neural-neumorphic-inset rounded-lg p-6">
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                  <h3 className="neural-title text-lg mb-2">Security Settings</h3>
                  <p className="text-neural-text-secondary">
                    認証とセキュリティ設定（今後実装予定）
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </NeuralCard>
    </div>
  )
}