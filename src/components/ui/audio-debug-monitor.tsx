import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AudioChunk {
  eventId: number;
  chunkId: string;
  receivedAt: number;
  processedAt?: number;
  playedAt?: number;
  audioDataSize: number;
  queuePosition?: number;
  status: 'received' | 'processing' | 'played' | 'skipped';
}

interface AudioDebugMonitorProps {
  conversationId?: string;
  isActive: boolean;
  onChunkUpdate?: (chunk: AudioChunk) => void;
}

export const AudioDebugMonitor: React.FC<AudioDebugMonitorProps> = ({
  conversationId,
  isActive,
  onChunkUpdate
}) => {
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isActive && !audioContextRef.current) {
      initializeAudioMonitoring();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  const initializeAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      console.log('🎧 Audio monitoring initialized for debug');
      startAudioLevelMonitoring();
    } catch (error) {
      console.error('❌ Failed to initialize audio monitoring:', error);
    }
  };

  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    const updateAudioLevel = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
        const normalizedLevel = (average / 255) * 100;
        
        setAudioLevel(normalizedLevel);
        setIsPlayingAudio(normalizedLevel > 2);
      }
      
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  };

  const addChunk = (chunk: AudioChunk) => {
    setChunks(prev => {
      const updated = [...prev, chunk].slice(-20); // Keep last 20 chunks
      return updated.sort((a, b) => a.eventId - b.eventId);
    });
    onChunkUpdate?.(chunk);
  };

  const updateChunkStatus = (chunkId: string, status: AudioChunk['status'], timestamp?: number) => {
    setChunks(prev => prev.map(chunk => 
      chunk.chunkId === chunkId 
        ? { 
            ...chunk, 
            status,
            ...(status === 'processing' && { processedAt: timestamp || Date.now() }),
            ...(status === 'played' && { playedAt: timestamp || Date.now() })
          }
        : chunk
    ));
  };

  // Expose methods for external use
  useEffect(() => {
    (window as any).audioDebugMonitor = {
      addChunk,
      updateChunkStatus
    };
  }, []);

  const getStatusColor = (status: AudioChunk['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'played': return 'bg-green-500';
      case 'skipped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: AudioChunk['status']) => {
    switch (status) {
      case 'received': return 'Received';
      case 'processing': return 'Processing';
      case 'played': return 'Played';
      case 'skipped': return 'Skipped';
      default: return 'Unknown';
    }
  };

  const calculateTiming = (chunk: AudioChunk) => {
    if (!chunk.receivedAt) return null;
    
    const processTime = chunk.processedAt ? chunk.processedAt - chunk.receivedAt : null;
    const playTime = chunk.playedAt ? chunk.playedAt - chunk.receivedAt : null;
    
    return { processTime, playTime };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Audio Debug Monitor</span>
          <div className="flex items-center space-x-2">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {isPlayingAudio && (
              <Badge variant="outline" className="animate-pulse">
                Playing Audio
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Level Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Audio Level</span>
            <span>{audioLevel.toFixed(1)}%</span>
          </div>
          <Progress value={audioLevel} className="h-2" />
        </div>

        {/* Conversation Info */}
        {conversationId && (
          <div className="text-sm text-muted-foreground">
            <strong>Conversation ID:</strong> {conversationId}
          </div>
        )}

        {/* Chunk Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Audio Chunk Timeline</h4>
          {chunks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No audio chunks received yet
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {chunks.map((chunk) => {
                const timing = calculateTiming(chunk);
                return (
                  <div 
                    key={chunk.chunkId}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(chunk.status)}>
                        {chunk.eventId}
                      </Badge>
                      <span className="font-mono">{chunk.chunkId}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {chunk.audioDataSize} bytes
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getStatusText(chunk.status)}
                      </Badge>
                      {timing?.playTime && (
                        <span className="text-xs text-muted-foreground">
                          {timing.playTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Queue Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Chunks:</span>
            <span className="ml-2 font-semibold">{chunks.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Played:</span>
            <span className="ml-2 font-semibold text-green-600">
              {chunks.filter(c => c.status === 'played').length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Processing:</span>
            <span className="ml-2 font-semibold text-yellow-600">
              {chunks.filter(c => c.status === 'processing').length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Skipped:</span>
            <span className="ml-2 font-semibold text-red-600">
              {chunks.filter(c => c.status === 'skipped').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};