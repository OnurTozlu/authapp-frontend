import React, { useState } from 'react';
import './Register.css';

function Register({ toggleForm }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: '',
    isim: '',
    soyisim: '',
    numara: '',
    mail: ''
  });

  // Hangi alanlarda hata var, boolean tutarız
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;

    if (name === 'numara') {
      if (/^\d*$/.test(value) && value.length <= 10) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // Hata varsa, girerken temizleyelim
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const validate = () => {
    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim()) {
        newErrors[key] = true;
      }
    });

    // Örnek: telefon numarası 10 haneli olmalı
    if (formData.numara.length !== 10) {
      newErrors.numara = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // hata yoksa true
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validate()) {
      alert('Lütfen formdaki tüm alanları doğru doldurun.');
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
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

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
        <h2
          className="inactive underlineHover"
          onClick={() => toggleForm('login')}
          style={{ cursor: 'pointer' }}
        >
          Giriş Yap
        </h2>
        <h2 className="active">Kayıt Ol</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="kullaniciAdi"
            className={`fadeIn second ${errors.kullaniciAdi ? 'input-error' : ''}`}
            placeholder="Kullanıcı Adı"
            value={formData.kullaniciAdi}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="isim"
            className={`fadeIn second ${errors.isim ? 'input-error' : ''}`}
            placeholder="İsim"
            value={formData.isim}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="soyisim"
            className={`fadeIn second ${errors.soyisim ? 'input-error' : ''}`}
            placeholder="Soyisim"
            value={formData.soyisim}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="mail"
            className={`fadeIn second ${errors.mail ? 'input-error' : ''}`}
            placeholder="E-Posta"
            value={formData.mail}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="numara"
            className={`fadeIn second ${errors.numara ? 'input-error' : ''}`}
            placeholder="Telefon Numarası"
            value={formData.numara}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="sifre"
            className={`fadeIn third ${errors.sifre ? 'input-error' : ''}`}
            placeholder="Şifre"
            value={formData.sifre}
            onChange={handleChange}
            required
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
