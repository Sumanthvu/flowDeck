import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import { authService } from '../../services/authService';

interface Props {
  onSignedIn: () => void;
  onGoToSignUp: () => void;
}

export const SignInScreen: React.FC<Props> = ({ onSignedIn, onGoToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const emailAnim = useRef(new Animated.Value(0)).current;
  const passAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (anim: Animated.Value, val: number) =>
    Animated.timing(anim, { toValue: val, duration: 200, useNativeDriver: false }).start();

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.signIn(email, password);
      onSignedIn();
    } catch (e: any) {
      Alert.alert('Sign In Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const emailBorderColor = emailAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.cardBorder, theme.colors.primary] });
  const passBorderColor = passAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.cardBorder, theme.colors.primary] });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Glow bg */}
          <View style={styles.glowBg} />

          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>Flow<Text style={{ color: theme.colors.primary }}>Deck</Text></Text>
            <Text style={styles.tagline}>Welcome back</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSub}>Continue your learning journey</Text>

            {/* Email */}
            <Text style={styles.label}>EMAIL</Text>
            <Animated.View style={[styles.inputWrap, { borderColor: emailBorderColor }]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => animateFocus(emailAnim, 1)}
                onBlur={() => animateFocus(emailAnim, 0)}
              />
            </Animated.View>

            {/* Password */}
            <Text style={styles.label}>PASSWORD</Text>
            <Animated.View style={[styles.inputWrap, { borderColor: passBorderColor }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                onFocus={() => animateFocus(passAnim, 1)}
                onBlur={() => animateFocus(passAnim, 0)}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Button */}
            <TouchableOpacity style={styles.btn} onPress={handleSignIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In →</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Signup link */}
            <TouchableOpacity style={styles.signupLink} onPress={onGoToSignUp}>
              <Text style={styles.signupLinkText}>
                New here? <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Create Account →</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, padding: theme.spacing.md },
  glowBg: {
    position: 'absolute', top: -60, alignSelf: 'center',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: theme.colors.primaryGlow,
  },
  logoSection: { alignItems: 'center', marginTop: 60, marginBottom: 32 },
  logo: { fontSize: 40, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -1.5 },
  tagline: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 6, fontWeight: '500' },
  card: {
    backgroundColor: theme.colors.glassBg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1, borderColor: theme.colors.glassBorder,
    padding: theme.spacing.lg,
  },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 24 },
  label: {
    color: theme.colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface, paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, paddingVertical: 14, fontWeight: '500' },
  eyeBtn: { fontSize: 18, padding: 4 },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 20,
    shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.cardBorder },
  dividerText: { color: theme.colors.textMuted, fontSize: 12, marginHorizontal: 12, fontWeight: '600' },
  signupLink: { alignItems: 'center' },
  signupLinkText: { color: theme.colors.textSecondary, fontSize: 14 },
});
