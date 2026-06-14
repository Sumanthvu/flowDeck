// src/navigation/MainNavigator.tsx
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
  { key: 'home',    icon: '🏠', label: 'Home'    },
  { key: 'learn',   icon: '📚', label: 'Learn'   },
  { key: 'import',  icon: '📤', label: 'Upload'  },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

export const MainNavigator: React.FC<Props> = ({ currentTab, onTabChange, children }) => (
  <View style={styles.root}>
    <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
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
            {/* Active pill indicator at top */}
            {active && <View style={styles.activePill} />}

            <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
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
    paddingBottom: 10,
    paddingTop: 4,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },

  activePill: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },

  tabIcon: { fontSize: 22, marginBottom: 2, opacity: 0.45 },
  tabIconActive: { opacity: 1 },

  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.tabInactive,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: theme.colors.tabActive,
    fontWeight: '800',
  },
});
