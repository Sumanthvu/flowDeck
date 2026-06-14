import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { MainNavigator, MainTab } from "./src/navigation/MainNavigator";
import { HomeScreen } from "./src/screens/HomeScreen";
import { DeckListScreen } from "./src/screens/DeckListScreen";
import { ImportScreen } from "./src/screens/main/ImportScreen";
import { ProfileScreen } from "./src/screens/main/ProfileScreen";
import { SwipeScreen } from "./src/screens/SwipeScreen";
import { VoiceScreen } from "./src/screens/VoiceScreen";
import { RevisionScreen } from "./src/screens/RevisionScreen";
import { authService } from "./src/services/authService";
import { llmService, Deck } from "./src/services/llmService";
import { theme } from "./src/styles/theme";

type AppView =
  | { type: "auth" }
  | { type: "main"; tab: MainTab }
  // sourceTab lets SwipeScreen / RevisionScreen know which tab to return to
  | { type: "swipe"; deck: Deck; initialIndex?: number; sourceTab: MainTab }
  | { type: "voice"; deck: Deck; cardIndex: number; sourceTab: MainTab }
  | { type: "revision"; deck: Deck; sourceTab: MainTab };

export default function App() {
  const [view, setView] = useState<AppView>({ type: "auth" });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>("home");

  useEffect(() => {
    authService.isLoggedIn().then(loggedIn => {
      if (loggedIn) {
        setView({ type: "main", tab: "home" });
        authService.recordActivity().catch(console.error);
      }
      setCheckingAuth(false);
    });
  }, []);

  const handleAuth    = () => {
    setView({ type: "main", tab: "home" });
    authService.recordActivity().catch(console.error);
  };
  const handleLogout  = () => { setActiveTab("home"); setView({ type: "auth" }); };

  // ── Select a deck to study ────────────────────────────────────────────────
  const handleSelectDeck = (deck: Deck, sourceTab?: MainTab) => {
    const firstUnmastered = deck.cards.findIndex(c => !c.isMastered);
    const startIdx = firstUnmastered !== -1 ? firstUnmastered : 0;
    setView({ type: "swipe", deck, initialIndex: startIdx, sourceTab: sourceTab ?? activeTab });
  };

  // ── After deck is created, always go to swipe from import ────────────────
  const handleDeckCreated = (deck: Deck) => {
    llmService.getDecks().then(() =>
      setView({ type: "swipe", deck, initialIndex: 0, sourceTab: "import" })
    );
  };

  // ── Voice challenge ──────────────────────────────────────────────────────
  const handleVoiceChallenge = (deck: Deck, cardIndex: number, sourceTab: MainTab) =>
    setView({ type: "voice", deck, cardIndex, sourceTab });

  // ── Back to the tab the user came from ──────────────────────────────────
  const handleBackToSource = (sourceTab: MainTab) => {
    setActiveTab(sourceTab);
    setView({ type: "main", tab: sourceTab });
  };

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setView({ type: "main", tab });
  };

  const renderContent = () => {
    if (checkingAuth) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (view.type === "auth") {
      return <AuthNavigator onAuthenticated={handleAuth} />;
    }

    if (view.type === "swipe") {
      return (
        <SwipeScreen
          deck={view.deck}
          initialIndex={view.initialIndex || 0}
          onBack={() => handleBackToSource(view.sourceTab)}
          onVoiceChallenge={(cardIndex) =>
            handleVoiceChallenge(view.deck, cardIndex, view.sourceTab)
          }
        />
      );
    }

    if (view.type === "voice") {
      const activeCard = view.deck.cards[view.cardIndex];
      return (
        <VoiceScreen
          card={activeCard}
          onGoBack={() =>
            setView({ type: "swipe", deck: view.deck, initialIndex: view.cardIndex, sourceTab: view.sourceTab })
          }
          onFeedbackComplete={(score) => {
            activeCard.scoreTransfer = score;
            if (score >= 80) activeCard.isMastered = true;
            authService.recordActivity().catch(console.error);
            setView({ type: "swipe", deck: view.deck, initialIndex: view.cardIndex, sourceTab: view.sourceTab });
          }}
        />
      );
    }

    if (view.type === "revision") {
      return (
        <RevisionScreen
          deck={view.deck}
          onBack={() => handleBackToSource(view.sourceTab)}
        />
      );
    }

    return (
      <MainNavigator currentTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === "home" && (
          <HomeScreen
            onSelectDeck={(deck) => handleSelectDeck(deck, "home")}
            onGoToImport={() => handleTabChange("import")}
            onGoToLearn={() => handleTabChange("learn")}
          />
        )}
        {activeTab === "learn" && (
          <DeckListScreen
            onSelectDeck={(deck) => handleSelectDeck(deck, "learn")}
            onReviseDeck={(deck) => setView({ type: "revision", deck, sourceTab: "learn" })}
            onGoToImport={() => handleTabChange("import")}
          />
        )}
        {activeTab === "import" && (
          <ImportScreen onDeckCreated={handleDeckCreated} />
        )}
        {activeTab === "profile" && (
          <ProfileScreen onLogout={handleLogout} />
        )}
      </MainNavigator>
    );
  };

  return (
    <SafeAreaProvider>
      {renderContent()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});