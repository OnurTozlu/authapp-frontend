// MainMenu.js
import React, { useEffect, useState } from 'react';
import './MainMenu.css';

function MainMenu({ kullanici }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');

  // Arkadaş listesini çek
  useEffect(() => {
    fetch('http://localhost:8080/api/arkadaslar')
      .then(res => res.json())
      .then(data => setArkadaslar(data))
      .catch(err => console.error('Arkadaşlar alınamadı', err));
  }, []);

  // Aktif konuşulan kişiyi ve mesajlarını getir
  useEffect(() => {
    if (aktifAlici) {
      fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.id}`)
        .then(res => res.json())
        .then(data => setMesajlar(data))
        .catch(err => console.error('Mesajlar alınamadı', err));
    }
  }, [aktifAlici]);

  const handleMesajGonder = async () => {
    if (mesaj.trim() === '' || !aktifAlici) return;

    const yeniMesaj = {
      gondericiId: kullanici.id,
      aliciId: aktifAlici.id,
      icerik: mesaj,
      zaman: new Date().toISOString()
    };

    try {
      const res = await fetch('http://localhost:8080/api/mesaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yeniMesaj)
      });

      if (res.ok) {
        setMesajlar([...mesajlar, yeniMesaj]);
        setMesaj('');
      }
    } catch (err) {
      console.error('Mesaj gönderilemedi', err);
    }
  };

  return (
    <div className="main-container">
      {/* Sol Panel */}
      <div className="sidebar">
        <input type="text" placeholder="Ara..." className="search-input1" />
        <div className="user-list">
          {arkadaslar.map((arkadas) => (
            <button
              key={arkadas.id}
              className={`user-button ${aktifAlici && aktifAlici.id === arkadas.id ? 'selected' : ''}`}
              onClick={() => setAktifAlici(arkadas)}
            >
              {arkadas.kullaniciAdi}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="current-user">
            <div className="profile-pic"></div>
            <span className="username">{kullanici.kullaniciAdi}</span>
          </div>
          <button className="settings-button">Ayarlar</button>
        </div>
      </div>

      {/* Sağ Panel */}
      <div className="chat-container">
        {/* Sohbet edilen kişi */}
        <div className="chat-header">
          <div className="chat-profile-pic"></div>
          <span className="chat-username">
            {aktifAlici ? aktifAlici.kullaniciAdi : 'Kişi seçilmedi'}
          </span>
        </div>

        {/* Mesajlar */}
        <div className="messages">
          {mesajlar.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.gondericiId === kullanici.id ? 'from-me' : 'from-them'}`}
            >
              {msg.icerik}
            </div>
          ))}
        </div>

        {/* Mesaj Yaz */}
        <div className="message-input-container">
          <input
            type="text"
            className="message-input"
            placeholder="Mesaj yaz..."
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMesajGonder()}
          />
          <button className="send-button" onClick={handleMesajGonder}>▶</button>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
