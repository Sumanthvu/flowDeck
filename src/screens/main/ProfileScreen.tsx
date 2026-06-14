import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../styles/theme";
import { authService, User } from "../../services/authService";
import { llmService } from "../../services/llmService";

interface Props {
  onLogout: () => void;
}

// ── Heatmap helpers ────────────────────────────────────────────────────────
const HEATMAP_WEEKS = 15;
const HEATMAP_DAYS  = 7;
const buildUserHeatmap = (activeDays?: string[]): number[] => {
  const data: number[] = [];
  const daysList = activeDays || [];
  const counts: Record<string, number> = {};
  for (const day of daysList) {
    counts[day] = (counts[day] || 0) + 1;
  }
  const totalDays = HEATMAP_DAYS * HEATMAP_WEEKS;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (totalDays - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = counts[dateStr] || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
    data.push(level);
  }
  return data;
};
const HEAT_COLORS = ['#E5E7EB', '#FED7AA', '#FB923C', '#FF6B35'];
const HeatSquare = ({ level }: { level: number }) => (
  <View style={[profileStyles.heatSquare, { backgroundColor: HEAT_COLORS[level] }]} />
);

export const ProfileScreen: React.FC<Props> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [deckCount, setDeckCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Settings states
  const [npuAccelerated, setNpuAccelerated] = useState(true);
  const [socraticAudio, setSocraticAudio] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const u = await authService.getUser();
        setUser(u);
        const decks = await llmService.getDecks();
        setDeckCount(decks.length);
        const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
        setCardCount(totalCards);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
    loadProfileData();
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of FlowDeck?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await authService.signOut();
          onLogout();
        },
      },
    ]);
  };

  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "This will permanently delete all your decks and learning statistics. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await llmService.clearAllDecks();
              setDeckCount(0);
              setCardCount(0);
              Alert.alert("Success", "All learning data has been reset.");
            } catch (err) {
              Alert.alert("Error", "Failed to reset data.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getJoinedDate = () => {
    if (!user?.createdAt) return "";
    const date = new Date(user.createdAt);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <Text style={styles.screenTitle}>My Profile</Text>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </Text>
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.userName}>{user?.name ?? "Learner"}</Text>
            <Text style={styles.userEmail}>{user?.email ?? "learner@flowdeck.ai"}</Text>
            <Text style={styles.joinedText}>Joined {getJoinedDate()}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statVal}>{user?.streak ?? 1}</Text>
              <Text style={styles.statLbl}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={styles.statVal}>{user?.xp ?? 0}</Text>
              <Text style={styles.statLbl}>Total XP</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>📚</Text>
              <Text style={styles.statVal}>{deckCount}</Text>
              <Text style={styles.statLbl}>Decks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>📇</Text>
              <Text style={styles.statVal}>{cardCount}</Text>
              <Text style={styles.statLbl}>Cards</Text>
            </View>
          </View>

          {/* ── Study Activity Heatmap ─────────────────────────────────── */}
          <Text style={styles.sectionTitle}>STUDY ACTIVITY</Text>
          <View style={profileStyles.heatmapCard}>
            <View style={profileStyles.heatmapRow}>
              {buildUserHeatmap(user?.activeDays || []).map((v, i) => (
                <HeatSquare key={i} level={v} />
              ))}
            </View>
            <View style={profileStyles.heatmapLegend}>
              <Text style={profileStyles.legendTxt}>Less</Text>
              {[0, 1, 2, 3].map(l => <HeatSquare key={l} level={l} />)}
              <Text style={profileStyles.legendTxt}>More</Text>
            </View>
          </View>


          <Text style={styles.sectionTitle}>SYSTEM PREFERENCES</Text>
          <View style={styles.settingsGroup}>
            {/* Setting Item */}
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>⚡ On-Device NPU Acceleration</Text>
                <Text style={styles.settingSubtext}>Use device hardware for prompt compilation</Text>
              </View>
              <Switch
                value={npuAccelerated}
                onValueChange={setNpuAccelerated}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={npuAccelerated ? theme.colors.primary : '#9CA3AF'}
              />
            </View>

            {/* Setting Item */}
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>🔊 Socratic Audio Output</Text>
                <Text style={styles.settingSubtext}>Enable voice speech in Feynman feedback loop</Text>
              </View>
              <Switch
                value={socraticAudio}
                onValueChange={setSocraticAudio}
                trackColor={{ false: '#E5E7EB', true: theme.colors.accentLight }}
                thumbColor={socraticAudio ? theme.colors.accent : '#9CA3AF'}
              />
            </View>

            {/* Setting Item */}
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>📳 Haptic Feedback</Text>
                <Text style={styles.settingSubtext}>Tactile feel during gestures and clicks</Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primaryLight }}
                thumbColor={hapticFeedback ? theme.colors.primary : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Actions Section */}
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.actionRow} onPress={handleResetData}>
              <Text style={styles.actionTextDanger}>🗑️ Reset All Learning Data</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>FlowDeck v0.1.0 • iQOO Gen-Z Hackathon Edition</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    letterSpacing: theme.typography.h1.letterSpacing,
    marginTop: 10,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: theme.colors.glassBg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  userEmail: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  joinedText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    marginHorizontal: 6,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  statLbl: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  actionRow: {
    padding: theme.spacing.md,
  },
  actionTextDanger: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  versionText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
});

// ── Separate stylesheet for heatmap components ────────────────────────────────
const profileStyles = StyleSheet.create({
  heatmapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 4,
  },
  heatmapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    justifyContent: 'center',
    marginBottom: 10,
  },
  heatSquare: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 3,
  },
  legendTxt: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginHorizontal: 2,
  },
});

