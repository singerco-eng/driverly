import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useDriverAvailability, useSaveDriverAvailability } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Check } from 'lucide-react';

interface DayAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

function generateTimeOptions() {
  const options: string[] = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    const value = `${hour.toString().padStart(2, '0')}:00`;
    options.push(value);
  }
  return options;
}

function formatTimeLabel(value: string) {
  const [hour] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:00 ${suffix}`;
}

const DEFAULT_TIME_OPTIONS = generateTimeOptions();

export default function DriverAvailability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: driver } = useDriverByUserId(user?.id);
  const { data: availability } = useDriverAvailability(driver?.id);
  const saveMutation = useSaveDriverAvailability();
  const [hydrated, setHydrated] = useState(false);
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>([]);

  const defaultSchedule = useMemo(
    () =>
      DAYS.map((day) => ({
        day_of_week: day.value,
        start_time: '09:00',
        end_time: '17:00',
        is_active: false,
      })),
    []
  );

  useEffect(() => {
    if (!availability || hydrated) return;
    const mapped = defaultSchedule.map((day) => {
      const existing = availability.find((entry) => entry.day_of_week === day.day_of_week);
      if (!existing) return day;
      return {
        day_of_week: existing.day_of_week,
        start_time: existing.start_time,
        end_time: existing.end_time,
        is_active: existing.is_active,
      };
    });
    setWeekAvailability(mapped);
    setHydrated(true);
  }, [availability, defaultSchedule, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      setWeekAvailability(defaultSchedule);
    }
  }, [defaultSchedule, hydrated]);

  const handleToggleDay = (dayIndex: number, active: boolean) => {
    setWeekAvailability((prev) =>
      prev.map((day) =>
        day.day_of_week === dayIndex ? { ...day, is_active: active } : day
      )
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setWeekAvailability((prev) =>
      prev.map((day) =>
        day.day_of_week === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSave = () => {
    if (!driver) return;
    const payload = weekAvailability.filter((day) => day.is_active);
    saveMutation.mutate(
      { driverId: driver.id, availability: payload },
      {
        onSuccess: () => {
          toast({
            title: 'Availability saved',
            description: 'Your weekly schedule has been updated.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to save',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const activeDaysCount = weekAvailability.filter((d) => d.is_active).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Availability</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us when you are available to drive. Toggle each day and set your hours.
        </p>
      </div>

      {/* Summary Card */}
      <Card className={cn(cardVariants({ variant: 'stats' }), 'p-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly Summary</p>
              <p className="text-xs text-muted-foreground">
                {activeDaysCount === 0
                  ? 'No days selected'
                  : `${activeDaysCount} day${activeDaysCount > 1 ? 's' : ''} available`}
              </p>
            </div>
          </div>
          {activeDaysCount > 0 && (
            <div className="flex gap-1">
              {DAYS.map((day) => {
                const dayData = weekAvailability.find((d) => d.day_of_week === day.value);
                return (
                  <div
                    key={day.value}
                    className={cn(
                      'w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors',
                      dayData?.is_active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground'
                    )}
                    title={day.label}
                  >
                    {day.short.charAt(0)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Schedule Card */}
      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
          <CardDescription>Toggle days on/off and set your preferred hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const dayData = weekAvailability.find((item) => item.day_of_week === day.value);
            const isActive = dayData?.is_active || false;

            return (
              <div
                key={day.value}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-4 transition-all md:flex-row md:items-center md:justify-between',
                  isActive
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/60 bg-transparent'
                )}
              >
                <div className="flex items-center justify-between gap-4 md:w-48">
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <span className={cn('font-medium', isActive && 'text-primary')}>
                      {day.label}
                    </span>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => handleToggleDay(day.value, checked)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Start</span>
                    <Select
                      value={dayData?.start_time || '09:00'}
                      onValueChange={(value) => handleTimeChange(day.value, 'start_time', value)}
                      disabled={!isActive}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_TIME_OPTIONS.map((option) => (
                          <SelectItem key={`${day.value}-start-${option}`} value={option}>
                            {formatTimeLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">End</span>
                    <Select
                      value={dayData?.end_time || '17:00'}
                      onValueChange={(value) => handleTimeChange(day.value, 'end_time', value)}
                      disabled={!isActive}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_TIME_OPTIONS.map((option) => (
                          <SelectItem key={`${day.value}-end-${option}`} value={option}>
                            {formatTimeLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !driver}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Availability
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
