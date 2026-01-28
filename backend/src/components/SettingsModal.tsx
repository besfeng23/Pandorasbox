'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Settings2,
  Database,
  Zap,
  Shield,
  Moon,
  Sun,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [notifications, setNotifications] = useState(true);
  const [temperature, setTemperature] = useState([0.7]);
  const [dataRetention, setDataRetention] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel-strong border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-primary">
            <Settings2 className="h-5 w-5" strokeWidth={2} />
            System Configuration
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Configure your PandorasBox experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* Model Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" strokeWidth={2} />
              <h3 className="text-sm font-semibold text-white/90">Model Temperature</h3>
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label className="text-white/80">Creativity Level</Label>
                <span className="text-xs text-primary font-mono">
                  {temperature[0].toFixed(1)}
                </span>
              </div>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/50">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Data Retention Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" strokeWidth={2} />
              <h3 className="text-sm font-semibold text-white/90">Data Retention</h3>
            </div>
            <div className="flex items-center justify-between pl-6">
              <div className="space-y-1">
                <Label htmlFor="data-retention" className="text-white/80 cursor-pointer">
                  Persistent Memory Storage
                </Label>
                <p className="text-xs text-white/50">
                  Keep conversation history across sessions
                </p>
              </div>
              <Switch
                id="data-retention"
                checked={dataRetention}
                onCheckedChange={setDataRetention}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Appearance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="h-4 w-4 text-primary" strokeWidth={2} />
              ) : (
                <Sun className="h-4 w-4 text-primary" strokeWidth={2} />
              )}
              <h3 className="text-sm font-semibold text-white/90">Appearance</h3>
            </div>
            <div className="flex items-center justify-between pl-6">
              <div className="space-y-1">
                <Label htmlFor="dark-mode" className="text-white/80 cursor-pointer">
                  {darkMode ? 'Dark Theme' : 'Light Theme'}
                </Label>
                <p className="text-xs text-white/50">
                  {darkMode ? 'Dark mode interface' : 'Clean light mode interface'}
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" strokeWidth={2} />
              <h3 className="text-sm font-semibold text-white/90">Security</h3>
            </div>
            <div className="pl-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-white/80">Data Encryption</Label>
                  <p className="text-xs text-white/50">All data is encrypted at rest</p>
                </div>
                <Check className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass-panel border-white/20 text-white/80 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground hover:opacity-90 border-0 shadow-sm"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

