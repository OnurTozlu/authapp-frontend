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
      const response = await fetch('http://localhost:8080/api/kullanici/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();

      alert('Giriş başarılı! Hoşgeldiniz, ' + result.isim);

      // Ana menüye geçiş için callback
      onLoginSuccess(result); // Burada result objesi kullanıcının bilgilerini içermeli

    } catch (err) {
      alert('Giriş başarısız: ' + err.message);
    }
  };

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
