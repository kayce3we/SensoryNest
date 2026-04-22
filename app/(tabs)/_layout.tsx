import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { HomeIcon, LibraryIcon, UploadIcon, GoalsIcon, HistoryIcon } from '@/components/icons/TabIcons';

function TabBarIcon({ Icon, focused, label }: { Icon: React.ComponentType<{ active: boolean }>; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Icon active={focused} />
      <Text style={[styles.tabLabel, { color: focused ? Colors.primary : Colors.textSoft }]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon Icon={HomeIcon} focused={focused} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon Icon={LibraryIcon} focused={focused} label="Library" />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon Icon={UploadIcon} focused={focused} label="Upload" />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon Icon={GoalsIcon} focused={focused} label="Goals" />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon Icon={HistoryIcon} focused={focused} label="History" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
