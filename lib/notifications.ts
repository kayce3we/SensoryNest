import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Activity Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await (supabase.from('profiles') as any)
      .update({ expo_push_token: token })
      .eq('id', userId);
    return token;
  } catch {
    // Push token unavailable in dev without projectId — local notifications still work
    return null;
  }
}

export async function scheduleActivityReminder(
  activityName: string,
  scheduledTime: Date,
  minutesBefore: number
): Promise<string> {
  const triggerDate = new Date(scheduledTime.getTime() - minutesBefore * 60 * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌿 Time for sensory activity',
      body: `${activityName} starts in ${minutesBefore} min`,
      sound: true,
      data: { activityName },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekBoundsFrom(d: Date): { start: Date; end: Date } {
  const day = d.getDay();
  const diffToMon = (day + 6) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export async function syncEmptyReminders(userId: string): Promise<void> {
  if (!userId) return;

  const dailyKey = `daily_empty_reminder_${userId}`;
  const weeklyKey = `weekly_empty_reminder_${userId}`;
  const idsKey = `empty_reminder_ids_${userId}`;

  const [dailyRaw, weeklyRaw, idsRaw] = await Promise.all([
    AsyncStorage.getItem(dailyKey),
    AsyncStorage.getItem(weeklyKey),
    AsyncStorage.getItem(idsKey),
  ]);
  const dailyOn = dailyRaw === 'true';
  const weeklyOn = weeklyRaw === 'true';

  // Cancel previously-scheduled empty reminders
  if (idsRaw) {
    try {
      const prior: string[] = JSON.parse(idsRaw);
      for (const id of prior) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    } catch {}
  }
  await AsyncStorage.removeItem(idsKey);

  if (!dailyOn && !weeklyOn) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Fetch next 14 days of scheduled activities so we can cover today→next Sunday
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + 14);

  const { data: rows } = await supabase
    .from('scheduled_activities')
    .select('scheduled_date')
    .eq('user_id', userId)
    .gte('scheduled_date', toDateStr(today))
    .lte('scheduled_date', toDateStr(horizon));

  const datesWithActivities = new Set<string>((rows ?? []).map((r: any) => r.scheduled_date));
  const newIds: string[] = [];

  if (dailyOn) {
    // Schedule for each of the next 7 days that has no activities, at 8 AM
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toDateStr(d);
      if (datesWithActivities.has(dateStr)) continue;
      const triggerAt = new Date(d);
      triggerAt.setHours(8, 0, 0, 0);
      if (triggerAt <= now) continue;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌿 No activities scheduled today',
          body: "Take a moment to plan today's sensory diet.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
        },
      });
      newIds.push(id);
    }
  }

  if (weeklyOn) {
    // Find upcoming Sunday at 8 AM
    const sunday = new Date(today);
    const dow = sunday.getDay();
    const addDays = dow === 0 ? 7 : 7 - dow;
    sunday.setDate(today.getDate() + addDays);
    sunday.setHours(8, 0, 0, 0);

    // Check if the week starting the Monday AFTER that Sunday is empty
    const nextWeekStart = new Date(sunday);
    nextWeekStart.setDate(sunday.getDate() + 1);
    const { start, end } = getWeekBoundsFrom(nextWeekStart);
    let weekHasActivity = false;
    const startStr = toDateStr(start);
    const endStr = toDateStr(end);
    for (const ds of datesWithActivities) {
      if (ds >= startStr && ds <= endStr) { weekHasActivity = true; break; }
    }
    if (!weekHasActivity && sunday > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌿 No activities scheduled this week',
          body: "Plan the upcoming week's sensory diet.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: sunday,
        },
      });
      newIds.push(id);
    }
  }

  if (newIds.length > 0) {
    await AsyncStorage.setItem(idsKey, JSON.stringify(newIds));
  }
}
