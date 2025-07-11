import React, { useState } from 'react';
import styles from './Register.module.css';

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
    <div className={styles.container}>
      <div className={styles.box}>
        <img src="./assets/Logo.png" alt="Whispry Logo" className={styles.logo} />
        <h2 className={styles.heading}>Kayıt Ol</h2>

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
            type="text"
            name="isim"
            placeholder="İsim"
            value={formData.isim}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="text"
            name="soyisim"
            placeholder="Soyisim"
            value={formData.soyisim}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="email"
            name="mail"
            placeholder="E-Posta"
            value={formData.mail}
            onChange={handleChange}
            className={styles.input}
            autoComplete="off"
          />
          <input
            type="tel"
            name="numara"
            placeholder="Telefon Numarası"
            value={formData.numara}
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
            value="Kayıt Ol"
            className={styles.button}
          />
        </form>

        <div className={styles.toggle}>
          Hesabın var mı?{' '}
          <span onClick={() => toggleForm('login')}>Giriş Yap</span>
        </div>
      </div>
    </div>
  );
}

export default Register;
