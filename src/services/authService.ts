import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  streak: number;
  xp: number;
}

const USER_KEY = '@flowdeck_user';

export const authService = {
  async signUp(name: string, email: string, _password: string): Promise<User> {
    const existing = await AsyncStorage.getItem(USER_KEY);
    if (existing) {
      const u = JSON.parse(existing) as User;
      if (u.email === email) throw new Error('Email already registered');
    }
    const user: User = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      streak: 1,
      xp: 0,
    };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  async signIn(email: string, _password: string): Promise<User> {
    const stored = await AsyncStorage.getItem(USER_KEY);
    if (!stored) throw new Error('No account found. Please sign up.');
    const user = JSON.parse(stored) as User;
    if (user.email !== email.trim().toLowerCase()) throw new Error('Invalid email or password');
    return user;
  },

  async getUser(): Promise<User | null> {
    const stored = await AsyncStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  },

  async updateUser(updates: Partial<User>): Promise<User> {
    const stored = await AsyncStorage.getItem(USER_KEY);
    if (!stored) throw new Error('Not logged in');
    const user = { ...JSON.parse(stored), ...updates } as User;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async isLoggedIn(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(USER_KEY);
    return !!stored;
  },
};
