# FlowDeck: Gen-Z Active Mastery AI Tutor

## 💡 The Problem
In India, over 5.1 million students prepare for hyper-competitive exams (JEE, NEET, UPSC, etc.) using massive 500-page PDF textbooks and study materials. However, studies show that **80% of passively read information is lost within 24 hours**. Gen-Z students are accustomed to short-form, scrollable feeds and struggle with continuous long-form reading.

## 🚀 The Solution
**FlowDeck** turns static textbooks, lecture notes, URLs, and YouTube videos into a TikTok-style swipeable AI lesson feed. Every card represents one "Atomic Concept" masterable in 30 seconds. Learning is gamified, active, and runs 100% on-device (offline) on the iQOO phone's NPU for zero latency and absolute privacy.

## 🔑 Core Features

### 1. Atomic Content Chunking
* The local AI model chunk-parses PDFs or texts into independent "Atomic Concepts" (under 30-50 words per card).

### 2. Gesture-Based Active Feed
* **Swipe Right**: Concepts marked as "Understood" and factored into mastery score.
* **Swipe Left**: Triggers the local LLM to instantly simplify the explanation using a different real-world analogy.

### 3. Friction Gradient Gating (Quizzes)
* A quiz card appears every 5 cards. You cannot proceed until you answer correctly.
* **Failure Route**: Wrong answers automatically trigger the local LLM to regenerate and simplify the previous cards.

### 4. "Teach Me Back" (Feynman Voice Loop)
* Tap the mic to explain a concept in your own voice.
* The local Whisper STT transcribes the speech.
* The local LLM matches your transcript with the concept card, spots semantic gaps, and asks targeted Socratic follow-up questions.

### 5. Office Kit Integration
* Drag-and-drop syllabus PDFs from your laptop to the phone.
* The laptop screen displays a live, interactive knowledge graph of the entire syllabus (green = mastered, yellow = shaky, red = not seen).
