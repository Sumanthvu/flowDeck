/**
 * FlowDeck: Gen-Z Active Mastery AI Tutor
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SwipeScreen } from './src/screens/SwipeScreen';
import { VoiceScreen } from './src/screens/VoiceScreen';
import { Deck, ConceptCard } from './src/services/llmService';

type ScreenState = 'dashboard' | 'swipe' | 'voice';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('dashboard');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [selectedCard, setSelectedCard] = useState<ConceptCard | null>(null);
  const [voiceCallback, setVoiceCallback] = useState<((score: number) => void) | null>(null);

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    setCurrentScreen('swipe');
  };

  const handleGoBackToDashboard = () => {
    setSelectedDeck(null);
    setCurrentScreen('dashboard');
  };

  const handleLaunchVoice = (card: ConceptCard, callback: (score: number) => void) => {
    setSelectedCard(card);
    setVoiceCallback(() => callback);
    setCurrentScreen('voice');
  };

  const handleVoiceComplete = (score: number) => {
    if (voiceCallback) {
      voiceCallback(score);
    }
    setCurrentScreen('swipe');
  };

  const handleGoBackToSwipe = () => {
    setCurrentScreen('swipe');
  };

  return (
    <SafeAreaProvider style={styles.container}>
      {currentScreen === 'dashboard' && (
        <DashboardScreen onSelectDeck={handleSelectDeck} />
      )}
      {currentScreen === 'swipe' && selectedDeck && (
        <SwipeScreen
          deck={selectedDeck}
          onGoBack={handleGoBackToDashboard}
          onVoiceLaunch={handleLaunchVoice}
        />
      )}
      {currentScreen === 'voice' && selectedCard && (
        <VoiceScreen
          card={selectedCard}
          onGoBack={handleGoBackToSwipe}
          onFeedbackComplete={handleVoiceComplete}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});

export default App;
