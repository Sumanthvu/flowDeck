import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { MainNavigator, MainTab } from "./src/navigation/MainNavigator";
import { HomeScreen } from "./src/screens/HomeScreen";
import { DeckListScreen } from "./src/screens/DeckListScreen";
import { ImportScreen } from "./src/screens/main/ImportScreen";
import { ProfileScreen } from "./src/screens/main/ProfileScreen";
import { SwipeScreen } from "./src/screens/SwipeScreen";
import { VoiceScreen } from "./src/screens/VoiceScreen";
import { authService } from "./src/services/authService";
import { llmService, Deck } from "./src/services/llmService";
import { theme } from "./src/styles/theme";

type AppView =
  | { type: "auth" }
  | { type: "main"; tab: MainTab }
  | { type: "swipe"; deck: Deck; initialIndex?: number }
  | { type: "voice"; deck: Deck; cardIndex: number };

export default function App() {
  const [view, setView] = useState<AppView>({ type: "auth" });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>("home");

  useEffect(() => {
    authService.isLoggedIn().then(loggedIn => {
      if (loggedIn) setView({ type: "main", tab: "home" });
      setCheckingAuth(false);
    });
  }, []);

  const handleAuth = () => setView({ type: "main", tab: "home" });
  const handleLogout = () => { setActiveTab("home"); setView({ type: "auth" }); };

  const handleSelectDeck = (deck: Deck) => setView({ type: "swipe", deck, initialIndex: 0 });
  const handleDeckCreated = (deck: Deck) => {
    llmService.getDecks().then(() => setView({ type: "swipe", deck, initialIndex: 0 }));
  };
  const handleVoiceChallenge = (deck: Deck, cardIndex: number) => setView({ type: "voice", deck, cardIndex });
  const handleBackToMain = () => { setView({ type: "main", tab: activeTab }); };

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setView({ type: "main", tab });
  };

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
        onBack={handleBackToMain}
        onVoiceChallenge={(cardIndex) => handleVoiceChallenge(view.deck, cardIndex)}
      />
    );
  }

  if (view.type === "voice") {
    const activeCard = view.deck.cards[view.cardIndex];
    return (
      <VoiceScreen
        card={activeCard}
        onGoBack={() => setView({ type: "swipe", deck: view.deck, initialIndex: view.cardIndex })}
        onFeedbackComplete={(score) => {
          activeCard.scoreTransfer = score;
          if (score >= 80) activeCard.isMastered = true;
          setView({ type: "swipe", deck: view.deck, initialIndex: view.cardIndex });
        }}
      />
    );
  }

  return (
    <MainNavigator currentTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "home" && (
        <HomeScreen
          onSelectDeck={handleSelectDeck}
          onGoToImport={() => handleTabChange("import")}
          onGoToLearn={() => handleTabChange("learn")}
        />
      )}
      {activeTab === "learn" && (
        <DeckListScreen
          onSelectDeck={handleSelectDeck}
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
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});