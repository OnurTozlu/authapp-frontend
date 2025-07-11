// MainMenu.js
import React, { useEffect, useState } from 'react';
import styles from './MainMenu.module.css';

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

  // Aktif alıcı değiştiğinde mesajları getir
  useEffect(() => {
    if (aktifAlici) {
      fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.id}`)
        .then(res => res.json())
        .then(data => setMesajlar(data))
        .catch(err => console.error('Mesajlar alınamadı', err));
    } else {
      setMesajlar([]);
    }
  }, [aktifAlici]);

  // Mesaj gönderme fonksiyonu
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
        // Eğer backend mesajın id’sini dönerse burayı res.json() olarak değiştir
        setMesajlar(prev => [...prev, yeniMesaj]);
        setMesaj('');
      } else {
        console.error('Mesaj gönderilirken hata oluştu');
      }
    } catch (err) {
      console.error('Mesaj gönderilemedi', err);
    }
  };

  // Mesaj kutusundaki enter tuşu ile gönderme
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleMesajGonder();
    }
  };

  return (
    <div className={styles.mainContainer}>
      {/* Sol Panel */}
      <div className={styles.sidebar}>
        <input
          type="text"
          placeholder="Ara..."
          className={styles.searchInput}
        />
        <div className={styles.userList}>
          {arkadaslar.length > 0 ? (
            arkadaslar.map((arkadas) => (
              <button
                key={arkadas.id}
                className={`${styles.userButton} ${aktifAlici && aktifAlici.id === arkadas.id ? styles.selected : ''}`}
                onClick={() => setAktifAlici(arkadas)}
              >
                {arkadas.kullaniciAdi}
              </button>
            ))
          ) : (
            <p style={{ color: '#888' }}>Hiç arkadaş bulunamadı.</p>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.currentUser}>
            <div className={styles.profilePic}>
              {kullanici.kullaniciAdi ? kullanici.kullaniciAdi[0].toUpperCase() : ''}
            </div>
            <span className={styles.username}>{kullanici.kullaniciAdi}</span>
          </div>
          <button className={styles.settingsButton}>Ayarlar</button>
        </div>
      </div>

      {/* Sağ Panel */}
      <div className={styles.chatContainer}>
        {/* Chat header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatProfilePic}>
            {aktifAlici ? aktifAlici.kullaniciAdi[0].toUpperCase() : ''}
          </div>
          <span className={styles.chatUsername}>
            {aktifAlici ? aktifAlici.kullaniciAdi : 'Kişi seçilmedi'}
          </span>
        </div>

        {/* Mesajlar */}
        <div className={styles.messages}>
          {aktifAlici ? (
            mesajlar.length > 0 ? (
              mesajlar.map((msg, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${msg.gondericiId === kullanici.id ? styles.fromMe : styles.fromThem}`}
                >
                  {msg.icerik}
                </div>
              ))
            ) : (
              <p style={{ color: '#888' }}>Henüz mesaj yok.</p>
            )
          ) : (
            <p style={{ color: '#888' }}>Lütfen bir kişi seçin.</p>
          )}
        </div>

        {/* Mesaj yazma alanı */}
        <div className={styles.messageInputContainer}>
          <input
            type="text"
            className={styles.messageInput}
            placeholder="Mesaj yaz..."
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!aktifAlici}
          />
          <button
            className={styles.sendButton}
            onClick={handleMesajGonder}
            disabled={!aktifAlici || mesaj.trim() === ''}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
