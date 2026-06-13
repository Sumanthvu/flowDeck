import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { theme } from '../../styles/theme';

export const SplashScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const pulse = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Animated.View style={[styles.glow, { opacity: pulse }]} />
      <Animated.View style={[styles.logoWrapper, { transform: [{ scale }], opacity }]}>
        <Text style={styles.logo}>
          Flow<Text style={styles.logoAccent}>Deck</Text>
        </Text>
        <Text style={styles.tagline}>GEN-Z ACTIVE MASTERY AI TUTOR</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ Powered by On-Device NPU</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.colors.primaryGlow,
  },
  logoWrapper: { alignItems: 'center' },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -2,
  },
  logoAccent: { color: theme.colors.primary },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: theme.colors.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  badge: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: theme.colors.glassBg,
  },
  badgeText: {
    color: theme.colors.neon,
    fontSize: 12,
    fontWeight: '600',
  },
});
