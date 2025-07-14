import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import MainMenu from './MainMenu';

function App() {
  const [currentForm, setCurrentForm] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kullanici, setKullanici] = useState(null);

  const toggleForm = (formName) => {
    setCurrentForm(formName);
  };

  const handleLoginSuccess = (kullaniciBilgisi) => {
    setIsLoggedIn(true);
    setKullanici(kullaniciBilgisi);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setKullanici(null);
    setCurrentForm('login');
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <MainMenu kullanici={kullanici} onLogout={handleLogout} />
      ) : (
        currentForm === 'login' ? (
          <Login toggleForm={toggleForm} onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Register toggleForm={toggleForm} />
        )
      )}
    </div>
  );
}

export default App;