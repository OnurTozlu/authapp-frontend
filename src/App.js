import React, { useState } from 'react';
import Register from './Register';
import Login from './Login';

function App() {
  const [currentForm, setCurrentForm] = useState('login');

  const toggleForm = () => {
    setCurrentForm(currentForm === 'login' ? 'register' : 'login');
  };

  return (
    <div className="App">
      {currentForm === 'login' ? (
        <Login toggleForm={toggleForm} />
      ) : (
        <Register toggleForm={toggleForm} />
      )}
    </div>
  );
}

export default App;
