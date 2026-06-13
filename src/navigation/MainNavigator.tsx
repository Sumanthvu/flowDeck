import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, StatusBar } from 'react-native';
import { theme } from '../styles/theme';

export type MainTab = 'home' | 'learn' | 'import' | 'profile';

interface Props {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  children: React.ReactNode;
}

const TABS: { key: MainTab; icon: string; label: string }[] = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'learn', icon: '📚', label: 'Learn' },
  { key: 'import', icon: '📥', label: 'Import' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

export const MainNavigator: React.FC<Props> = ({ currentTab, onTabChange, children }) => (
  <View style={styles.root}>
    <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
    <View style={styles.content}>{children}</View>
    <View style={styles.tabBar}>
      {TABS.map(tab => {
        const active = currentTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.activeGlow} />}
            <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            {active && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.tabBorder,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, position: 'relative' },
  activeGlow: {
    position: 'absolute', top: -2, width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primaryGlow,
  },
  tabIcon: { fontSize: 20, marginBottom: 2, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.tabInactive, letterSpacing: 0.5 },
  tabLabelActive: { color: theme.colors.tabActive, fontWeight: '800' },
  activeIndicator: {
    position: 'absolute', bottom: -6, width: 20, height: 3,
    borderRadius: 2, backgroundColor: theme.colors.primary,
  },
});
