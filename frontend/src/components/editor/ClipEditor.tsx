'use client';

import { useState } from 'react';
import { Wand2, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Clip } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViralScoreRing } from './ViralScoreRing';
import { processingApi } from '@/lib/api';

interface ClipEditorProps {
  clip: Clip;
  projectId: string;
  onUpdate?: (clip: Clip) => void;
}

export function ClipEditor({ clip, projectId, onUpdate }: ClipEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hookText, setHookText] = useState(clip.hookText || '');
  const [titles, setTitles] = useState<string[]>(clip.titles || ['', '', '']);
  const [abTestEnabled, setAbTestEnabled] = useState(clip.abTestEnabled);
  const [hookVariantA, setHookVariantA] = useState(clip.hookVariantA || '');
  const [hookVariantB, setHookVariantB] = useState(clip.hookVariantB || '');

  const handleRegenerateHook = async () => {
    setIsLoading(true);
    try {
      await processingApi.regenerateHook(clip.id);
      // In a real app, you'd poll for the result or use WebSockets
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateABTest = async () => {
    setIsLoading(true);
    try {
      await processingApi.generateABTest(clip.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await processingApi.updateHook(clip.id, hookText);
      await processingApi.updateTitles(clip.id, titles.filter(Boolean));
      onUpdate?.({ ...clip, hookText, titles: titles.filter(Boolean) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-[1fr,400px] gap-6">
      {/* Video Preview */}
      <div className="flex flex-col gap-4">
        <div className="aspect-[9/16] max-h-[600px] bg-black rounded-lg overflow-hidden">
          <video
            src={`/api/video/${projectId}/stream?clipId=${clip.id}`}
            controls
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <h4 className="text-sm font-medium mb-2">Transcript</h4>
          <p className="text-sm text-muted-foreground">{clip.transcript}</p>
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex flex-col gap-6 overflow-y-auto">
        {/* Viral Score */}
        <div className="rounded-lg border bg-card p-6">
          <ViralScoreRing 
            score={clip.viralScore} 
            breakdown={clip.viralScoreBreakdown}
          />
        </div>

        {/* Hook Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Hook
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateHook}
                disabled={isLoading}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>

          <Textarea
            value={hookText}
            onChange={(e) => setHookText(e.target.value)}
            placeholder="Enter hook text..."
            className="min-h-[80px]"
          />

          {/* A/B Test Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="ab-test" className="font-medium">A/B Test Hooks</Label>
              <p className="text-sm text-muted-foreground">
                Generate two variants and test performance
              </p>
            </div>
            <Switch
              id="ab-test"
              checked={abTestEnabled}
              onCheckedChange={(checked) => {
                setAbTestEnabled(checked);
                if (checked && !hookVariantA) {
                  handleGenerateABTest();
                }
              }}
            />
          </div>

          {abTestEnabled && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Variant A (Safe)</Label>
                <Textarea
                  value={hookVariantA}
                  onChange={(e) => setHookVariantA(e.target.value)}
                  placeholder="Clarity-first hook..."
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Variant B (Curiosity)</Label>
                <Textarea
                  value={hookVariantB}
                  onChange={(e) => setHookVariantB(e.target.value)}
                  placeholder="Emotion-first hook..."
                  className="min-h-[60px]"
                />
              </div>
              {clip.abTestWinner && (
                <div className="rounded bg-primary/10 p-3 text-sm">
                  <span className="font-medium">Winner: </span>
                  Variant {clip.abTestWinner}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Titles */}
        <div className="space-y-4">
          <h3 className="font-semibold">Titles</h3>
          <div className="space-y-2">
            {titles.map((title, index) => (
              <Input
                key={index}
                value={title}
                onChange={(e) => {
                  const newTitles = [...titles];
                  newTitles[index] = e.target.value;
                  setTitles(newTitles);
                }}
                placeholder={`Title ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
