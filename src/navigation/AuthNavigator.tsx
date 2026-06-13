import React, { useState } from 'react';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';

type AuthPage = 'splash' | 'signin' | 'signup';

interface Props {
  onAuthenticated: () => void;
}

export const AuthNavigator: React.FC<Props> = ({ onAuthenticated }) => {
  const [page, setPage] = useState<AuthPage>('splash');

  if (page === 'splash') return <SplashScreen onDone={() => setPage('signin')} />;
  if (page === 'signup') return <SignUpScreen onSignedUp={onAuthenticated} onGoToSignIn={() => setPage('signin')} />;
  return <SignInScreen onSignedIn={onAuthenticated} onGoToSignUp={() => setPage('signup')} />;
};
