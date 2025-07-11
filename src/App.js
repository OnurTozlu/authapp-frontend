// App.js
import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import MainMenu from './MainMenu';

function App() {
  const [currentForm, setCurrentForm] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [kullanici, setKullanici] = useState(null); // Kullanıcı bilgilerini sakla

  const toggleForm = (formName) => {
    setCurrentForm(formName);
  };

  const handleLoginSuccess = (kullaniciBilgisi) => {
    setIsLoggedIn(true);
    setKullanici(kullaniciBilgisi);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <MainMenu kullanici={kullanici} />
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
