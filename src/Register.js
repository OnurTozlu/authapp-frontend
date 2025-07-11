import React, { useState } from 'react';
import './Register.css';
import logo from './assets/Logo.png'; // logo dosyasının yolu

function Register({ toggleForm }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: '',
    isim: '',
    soyisim: '',
    numara: '',
    mail: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Numara sadece rakam ve en fazla 10 karakter
    if (name === 'numara') {
      if (/^\d*$/.test(value) && value.length <= 10) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const validate = () => {
    const newErrors = {};
    for (const field in formData) {
      if (!formData[field].trim()) newErrors[field] = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    const payload = {
      ...formData,
      numara: parseInt(formData.numara, 10) || 0
    };

    try {
      const response = await fetch('http://localhost:8080/api/kullanici/kayit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', // çerez gönderme
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());

      const result = await response.json();
      alert('Kayıt başarılı: ' + result.kullaniciAdi);
      toggleForm('login');

    } catch (err) {
      alert('Hata: ' + err.message);
    }
  };

  return (
    <div className="wrapper fadeInDown">
      <div id="formContent">
        <img src={logo} alt="Whispry Logo" style={{ width: '120px', marginTop: '20px' }} />
        <br />
        <h2
          className="inactive underlineHover"
          onClick={() => toggleForm('login')}
          style={{ cursor: 'pointer' }}
        >
          Giriş Yap
        </h2>
        <h2 className="active">Kayıt Ol</h2>

        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            type="text"
            name="kullaniciAdi"
            className={`fadeIn second ${errors.kullaniciAdi ? 'input-error' : ''}`}
            placeholder="Kullanıcı Adı"
            value={formData.kullaniciAdi}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="text"
            name="isim"
            className={`fadeIn second ${errors.isim ? 'input-error' : ''}`}
            placeholder="İsim"
            value={formData.isim}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="text"
            name="soyisim"
            className={`fadeIn second ${errors.soyisim ? 'input-error' : ''}`}
            placeholder="Soyisim"
            value={formData.soyisim}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="email"
            name="mail"
            className={`fadeIn second ${errors.mail ? 'input-error' : ''}`}
            placeholder="E-Posta"
            value={formData.mail}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="tel"
            name="numara"
            className={`fadeIn second ${errors.numara ? 'input-error' : ''}`}
            placeholder="Telefon Numarası"
            value={formData.numara}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="password"
            name="sifre"
            className={`fadeIn third ${errors.sifre ? 'input-error' : ''}`}
            placeholder="Şifre"
            value={formData.sifre}
            onChange={handleChange}
            autoComplete="off"
          />
          <input
            type="submit"
            className="fadeIn fourth"
            value="Kayıt Ol"
          />
        </form>
      </div>
    </div>
  );
}

export default Register;
