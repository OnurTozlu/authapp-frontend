import React, { useState } from 'react';
import './Login.css';

function Login({ toggleForm }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.kullaniciAdi.trim()) newErrors.kullaniciAdi = true;
    if (!formData.sifre.trim()) newErrors.sifre = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate()) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

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
      // İstersen yönlendirme ya da state güncellemesi yapılabilir

    } catch (err) {
      alert('Giriş başarısız: ' + err.message);
    }
  };

  return (
    <div className="wrapper fadeInDown">
      <div id="formContent">
        <h2 className="active">Giriş Yap</h2>
        <h2
          className="inactive underlineHover"
          onClick={() => toggleForm('register')}
          style={{ cursor: 'pointer' }}
        >
          Kayıt Ol
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="kullaniciAdi"
            className={`fadeIn second ${errors.kullaniciAdi ? 'input-error' : ''}`}
            placeholder="Kullanıcı Adı"
            value={formData.kullaniciAdi}
            onChange={handleChange}
          />
          <input
            type="password"
            name="sifre"
            className={`fadeIn third ${errors.sifre ? 'input-error' : ''}`}
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
