import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save token to profile so server can send push notifications
  await (supabase
    .from('profiles') as any)
    .update({ expo_push_token: token })
    .eq('id', userId);

  return token;
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
