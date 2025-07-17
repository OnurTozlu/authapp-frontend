import React, { useState } from 'react';
import styles from './Login.module.css';
import { useAuth } from './context/AuthContext';  // Yolu kendi proje yapına göre ayarla

function Login({ toggleForm }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: ''
  });
  const [hata, setHata] = useState('');
  const { loginSuccess } = useAuth();

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setHata('');

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
      console.log("Login sonucu:", result);

      const token = result.token;
      const kullanici = result.kullanici;

      if (!token || !kullanici) {
        throw new Error("Token veya kullanıcı bilgisi alınamadı");
      }

      // Giriş başarılıysa AuthContext fonksiyonunu çağır
      loginSuccess(token, kullanici);

    } catch (err) {
      setHata('Giriş başarısız: ' + err.message);
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
            required
          />
          <input
            type="password"
            name="sifre"
            placeholder="Şifre"
            value={formData.sifre}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
            required
          />
          {hata && <p style={{ color: 'red' }}>{hata}</p>}
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
          <span
            onClick={() => toggleForm('register')}
            className={styles.registerLink}
          >
            Kayıt Ol
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;
