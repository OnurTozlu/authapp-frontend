import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(!!token); // Token varsa /me çağrısı bekleyecek

  // Sayfa yenilenince token doğrula
  useEffect(() => {
    if (token) {
      fetch('http://localhost:8080/authapp/api/kullanici/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token geçersiz veya kullanıcı bulunamadı');
          return res.json();
        })
        .then(data => setCurrentUser(data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const loginSuccess = (tokenValue, user) => {
    localStorage.setItem('token', tokenValue);
    setToken(tokenValue);
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, currentUser, loginSuccess, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
