
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AudioLevelMeter } from '@/components/ui/audio-level-meter';
import { useAudioLevelDetector } from '@/hooks/useAudioLevelDetector';

import { AudioRecorder } from '@/utils/audioRecorder';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, CheckCircle, XCircle, Volume2, Activity, Play, Square } from 'lucide-react';

interface MicrophoneTestProps {
  className?: string;
}

export const MicrophoneTest: React.FC<MicrophoneTestProps> = ({ className }) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<MediaDeviceInfo | null>(null);
  const [audioDataLog, setAudioDataLog] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const { startDetection, stopDetection } = useAudioLevelDetector({
    onLevelChange: setAudioLevel,
    smoothingFactor: 0.7,
  });

  const addAudioLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAudioDataLog(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission for test...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Get device info
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevice = devices.find(device => device.kind === 'audioinput' && device.deviceId !== 'default');
      setDeviceInfo(audioDevice || null);
      
      setHasPermission(true);
      console.log('✅ Microphone permission granted for test');
      
      return stream;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setHasPermission(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to test audio input",
        variant: "destructive"
      });
      throw error;
    }
  };

  const startAudioRecording = async () => {
    if (!streamRef.current) return;
    
    console.log('🎤 Starting audio recording for microphone test...');
    addAudioLog('Starting audio recording...');
    
    const recorder = new AudioRecorder({
      onAudioData: (audioData: string) => {
        console.log('🎵 Audio data received:', {
          length: audioData.length,
          first20Chars: audioData.substring(0, 20),
          timestamp: new Date().toISOString()
        });
        addAudioLog(`Audio chunk: ${audioData.length} bytes`);
      },
      onLevelChange: (level: number) => {
        // Level handled by main detection
      },
      onError: (error: Error) => {
        console.error('❌ Audio recording error:', error);
        addAudioLog(`Recording error: ${error.message}`);
        toast({
          title: "Recording Error",
          description: error.message,
          variant: "destructive"
        });
      },
      minChunkSize: 50, // Lower threshold for testing
      audioThreshold: 2.0 // Only send audio above 2% level
    });

    try {
      await recorder.start();
      audioRecorderRef.current = recorder;
      addAudioLog('Audio recording started successfully');
      console.log('✅ Audio recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      addAudioLog(`Failed to start recording: ${error}`);
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      addAudioLog('Audio recording stopped');
      console.log('🛑 Audio recording stopped');
    }
  };

  const startTest = async () => {
    try {
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;
      
      await startDetection(stream);
      await startAudioRecording();
      addAudioLog('Audio level detection started');
      toast({
        title: "Microphone Test Started",
        description: "Recording audio continuously with level detection",
      });
      
      setIsRecording(true);
      console.log('🎤 Microphone test started successfully');
    } catch (error) {
      console.error('❌ Failed to start microphone test:', error);
    }
  };

  const stopTest = () => {
    setIsRecording(false);
    
    stopDetection();
    stopAudioRecording();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setAudioLevel(0);
    addAudioLog('Test stopped');
    
    toast({
      title: "Microphone Test Stopped",
      description: "Test completed successfully",
    });
    
    console.log('🛑 Microphone test stopped');
  };

  const clearLog = () => {
    setAudioDataLog([]);
  };

  const getPermissionStatus = () => {
    if (hasPermission === null) return { icon: Mic, color: 'secondary', text: 'Unknown' };
    if (hasPermission) return { icon: CheckCircle, color: 'default', text: 'Granted' };
    return { icon: XCircle, color: 'destructive', text: 'Denied' };
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-foreground">Microphone Test</h3>
        </div>
        <Badge variant={permissionStatus.color as any}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {permissionStatus.text}
        </Badge>
      </div>


      {/* Device Info */}
      {deviceInfo && (
        <div className="text-sm text-muted-foreground">
          <strong>Device:</strong> {deviceInfo.label || 'Default Microphone'}
        </div>
      )}

      {/* Audio Level Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Audio Level</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isRecording ? 'Recording' : 'Ready'}
            </span>
          </div>
        </div>
        <AudioLevelMeter 
          level={audioLevel} 
          size="lg"
          className="w-full"
        />
      </div>

      {/* Test Controls */}
      <div className="flex gap-2">
        <Button
          onClick={isRecording ? stopTest : startTest}
          variant={isRecording ? "destructive" : "default"}
          className="flex-1"
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop Test
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Microphone Test
            </>
          )}
        </Button>
        {audioDataLog.length > 0 && (
          <Button onClick={clearLog} variant="outline" size="default">
            Clear Log
          </Button>
        )}
      </div>

      {/* Audio Data Log */}
      {audioDataLog.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Audio Data Log</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 p-3 bg-background/30 rounded-lg border border-border/50">
            {audioDataLog.map((log, index) => (
              <div key={index} className="text-xs text-muted-foreground font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Records continuously with audio level detection</p>
        <p>• Watch the Audio Data Log to see what data is being generated</p>
        <p>• Green levels (0-30%) are quiet, yellow (30-70%) are good, red (70%+) may be too loud</p>
        <p>• <strong>Smart Detection:</strong> Audio chunks only sent when level {'>'}  5%</p>
      </div>
    </Card>
  );
};
