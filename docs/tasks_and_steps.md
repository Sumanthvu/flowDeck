# FlowDeck Developer Steps & Tasks List

This document lists the developer tasks divided by tracks so our team can collaborate and build FlowDeck in parallel.

---

## 🎨 Track 1: UI/UX & Gestures (Developer 1)
* **Screen Layouts**:
  - [ ] Create `src/styles/theme.ts` for styling variables (colors, fonts, sizes).
  - [ ] Design `DashboardScreen.tsx` with a concept grid showing mastered vs shaky nodes.
  - [ ] Design `SwipeScreen.tsx` for displaying active concept cards.
  - [ ] Design `VoiceScreen.tsx` with Socratic visual voice waves and feedback.
* **Animations**:
  - [ ] Build swipe gestures (left/right) on `SwipeCard.tsx` using `react-native-gesture-handler` and `react-native-reanimated`.
  - [ ] Add 3D card flip animation to reveal the mini concept map on the back.
* **Data Visualization**:
  - [ ] Draw an SVG-based 3-Axis Radar Chart showing Recall, Retention, and Transfer scores.

---

## 🧠 Track 2: On-Device LLM & Prompts (Developer 2)
* **Model Configuration**:
  - [ ] Quantize and place a 1.5B GGUF model (e.g. Qwen2.5-1.5B-Instruct) in `android/app/src/main/assets/`.
  - [ ] Initialize `llama.rn` context and handle loading/unloading routines in `src/services/llmService.ts`.
* **Prompt Engineering & Output Parsing**:
  - [ ] Implement **Atomization Prompt** to chunk text blocks into card attributes (Concept, Explanation, Quiz Question, Answer).
  - [ ] Implement **Simplification Prompt** to rewrite explanations with simple real-world analogies.
  - [ ] Implement **Grading Prompt** to compare student voice transcriptions against core concepts.
  - [ ] Implement **Validation Prompt** to check true/false quiz answers.
* **Optimization**:
  - [ ] Implement background pre-generation of the next card so the user experiences zero load delay.

---

## 💾 Track 3: Database, Speech & Sync (Developer 3)
* **Local Storage**:
  - [ ] Design AsyncStorage / SQLite tables to save loaded files, deck lists, card states, and user score logs.
  - [ ] Build functions to save and fetch student progress for the mastery dashboard.
* **Offline Speech**:
  - [ ] Set up `whisper.rn` with a tiny Whisper model in assets for local speech-to-text.
  - [ ] Set up `react-native-tts` to read explanations aloud for "SOS mode."
* **File Sync Pipeline**:
  - [ ] Build a text extractor to parse PDFs/txt files imported from the laptop.
  - [ ] Create drag-and-drop listener to read files synced via the Office Kit folder.
