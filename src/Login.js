import React, { useState } from 'react';
import styles from './Login.module.css';

function Login({ toggleForm, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: ''
  });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
  e.preventDefault();
  try {
    const response = await fetch('http://localhost:8080/authapp/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kullaniciAdi: formData.kullaniciAdi,
        sifre: formData.sifre
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    console.log("Login sonucu:", result); // result.token ve result.kullanici gelmeli

    const token = result.token;
    const kullanici = result.kullanici;

    if (!token || !kullanici) {
      throw new Error("Token veya kullanıcı bilgisi alınamadı");
    }

    // LocalStorage'a her ikisini de kaydet
    localStorage.setItem("token", token);
    localStorage.setItem("kullanici", JSON.stringify(kullanici));

    // App.js ya da üst bileşene state olarak aktar
    //onLoginSuccess({ token, kullanici });
    onLoginSuccess(kullanici);


  } catch (err) {
    alert('Giriş başarısız: ' + err.message);
  }
}

  

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <img src="./assets/Logo.png" alt="Whispry Logo" className={styles.logo} />
        <h2 className={styles.heading}>Giriş Yap</h2>

        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            type="text"
            name="kullaniciAdi"
            placeholder="Kullanıcı Adı"
            value={formData.kullaniciAdi}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="password"
            name="sifre"
            placeholder="Şifre"
            value={formData.sifre}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="submit"
            value="Giriş Yap"
            className={styles.button}
          />
        </form>

        <div className={styles.forgotPassword}>
          <a href="#">Şifremi Unuttum?</a>
        </div>

        <div className={styles.toggle}>
          Hesabın yok mu?{' '}
          <span onClick={() => toggleForm('register')}>Kayıt Ol</span>
        </div>
      </div>
    </div>
  );
}

export default Login;