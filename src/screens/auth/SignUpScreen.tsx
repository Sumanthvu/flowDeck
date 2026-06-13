import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { authService } from '../../services/authService';

interface Props {
  onSignedUp: () => void;
  onGoToSignIn: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  secure?: boolean;
  showPass?: boolean;
  onTogglePass?: () => void;
  keyboardType?: any;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChange, placeholder,
  secure = false, showPass = false, onTogglePass, keyboardType = 'default',
}) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure && !showPass}
        autoCapitalize={label === 'FULL NAME' ? 'words' : 'none'}
        keyboardType={keyboardType}
      />
      {label === 'PASSWORD' && onTogglePass && (
        <TouchableOpacity onPress={onTogglePass}>
          <Text style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export const SignUpScreen: React.FC<Props> = ({ onSignedUp, onGoToSignIn }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const getStrength = () => {
    if (password.length < 6) return 0;
    if (password.length < 8) return 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 3;
    return 2;
  };
  const strengthColors = ['#FF4560', '#FFB020', '#4F8EF7', '#00E676'];
  const strengthLabels = ['Too short', 'Weak', 'Good', 'Strong'];
  const strength = getStrength();

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authService.signUp(name, email, password);
      onSignedUp();
    } catch (e: any) {
      Alert.alert('Sign Up Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.glowBg} />

          <View style={styles.logoSection}>
            <Text style={styles.logo}>Flow<Text style={{ color: theme.colors.primary }}>Deck</Text></Text>
            <Text style={styles.tagline}>Join the AI learning revolution</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSub}>Start mastering concepts at lightning speed</Text>

            <Field label="FULL NAME" value={name} onChange={setName} placeholder="Your name" />
            <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <Field label="PASSWORD" value={password} onChange={setPassword} placeholder="Min. 6 characters" secure showPass={showPass} onTogglePass={() => setShowPass(!showPass)} />

            {/* Strength meter */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[0,1,2,3].map(i => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? strengthColors[strength] : theme.colors.cardBorder }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
              </View>
            )}

            <Field label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm} placeholder="Repeat password" secure />

            <TouchableOpacity style={styles.btn} onPress={handleSignUp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account →</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signinLink} onPress={onGoToSignIn}>
              <Text style={styles.signinLinkText}>
                Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Sign In</Text>
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
    position: 'absolute', top: -40, alignSelf: 'center',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: theme.colors.accentGlow,
  },
  logoSection: { alignItems: 'center', marginTop: 40, marginBottom: 28 },
  logo: { fontSize: 36, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -1.5 },
  tagline: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: theme.colors.glassBg, borderRadius: theme.borderRadius.xl,
    borderWidth: 1, borderColor: theme.colors.glassBorder, padding: theme.spacing.lg,
  },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 24 },
  label: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, paddingVertical: 14 },
  eyeBtn: { fontSize: 18, padding: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: -8 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2, marginRight: 4 },
  strengthLabel: { fontSize: 11, fontWeight: '700', marginLeft: 8 },
  btn: {
    backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 20,
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  signinLink: { alignItems: 'center' },
  signinLinkText: { color: theme.colors.textSecondary, fontSize: 14 },
});
