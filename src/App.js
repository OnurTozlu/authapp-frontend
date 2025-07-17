import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './Login';
import Register from './Register';
import MainMenu from './MainMenu';

function AppContent() {
  const { currentUser, logout, loading } = useAuth();
  const [currentForm, setCurrentForm] = React.useState('login');

  const toggleForm = (formName) => {
    setCurrentForm(formName);
  };

  if (loading) {
    // Token doğrulanıyor, bekle
    return <div>Yükleniyor...</div>;
  }

  if (currentUser) {
    // Giriş yapılmışsa main menü göster
    return <MainMenu kullanici={currentUser} onLogout={logout} />;
  }

  // Giriş yapılmamışsa login veya register formu göster
  return currentForm === 'login' ? (
    <Login toggleForm={toggleForm} />
  ) : (
    <Register toggleForm={toggleForm} />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
