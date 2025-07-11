import './Register.css';
import React, { useState } from 'react';

function Register({ toggleForm }) {
  const [formData, setFormData] = useState({
    kullaniciAdi: '',
    sifre: '',
    isim: '',
    soyisim: '',
    numara: '',
    mail: ''
  });

  const handleChange = e => {
    const { name, value } = e.target;

    // Sadece numara alanı için rakam kontrolü
    if (name === 'numara') {
      if (/^\d*$/.test(value) && value.length <= 10) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8080/api/kullanici/kayit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
        <h2 className="inactive underlineHover" onClick={() => toggleForm('login')} style={{ cursor: 'pointer' }}> Giriş Yap </h2>
        <h2 className="active">Kayıt Ol</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="kullaniciAdi"
            className="fadeIn second"
            placeholder="Kullanıcı Adıaaa"
            value={formData.kullaniciAdi}
            onChange={handleChange}
          />
          <input
            type="text"
            name="isim"
            className="fadeIn second"
            placeholder="İsim"
            value={formData.isim}
            onChange={handleChange}
          />
          <input
            type="text"
            name="soyisim"
            className="fadeIn second"
            placeholder="Soyisim"
            value={formData.soyisim}
            onChange={handleChange}
          />
          <input
            type="text"
            name="mail"
            className="fadeIn second"
            placeholder="E-Posta"
            value={formData.mail}
            onChange={handleChange}
          />
          <input
            type="tel"
            name="numara"
            className="fadeIn second"
            placeholder="Telefon Numarası"
            value={formData.Integer.parseInt(numara)}
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
            value="Kayıt Ol"
          />
        </form>
      </div>
    </div>
  );
}

export default Register;
