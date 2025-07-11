// Login.js
import React, { useState } from 'react';
import './Login.css';

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
    <div className="wrapper fadeInDown">
      <div id="formContent">
        <img src="./assets/Logo.png" alt="Whispry Logo" style={{ width: '120px', marginTop: '20px' }} />
        <br />
        <h2 className="active">Giriş Yap</h2>
        <h2 className="inactive underlineHover" onClick={() => toggleForm('register')} style={{ cursor: 'pointer' }}>
          Kayıt Ol
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="kullaniciAdi"
            className="fadeIn second"
            placeholder="Kullanıcı Adı"
            value={formData.kullaniciAdi}
            onChange={handleChange}
          />
          <input
            type="password"
            name="sifre"
            className="fadeIn third"
            placeholder="Şifre"
            value={formData.sifre}
            onChange={handleChange}
          />
          <input
            type="submit"
            className="fadeIn fourth"
            value="Giriş Yap"
          />
        </form>

        <div id="formFooter">
          <a className="underlineHover" href="#">Şifremi Unuttum?</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
