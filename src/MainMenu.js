import React, { useEffect, useState, useRef } from 'react';
import styles from './MainMenu.module.css';

function MainMenu({ kullanici, onLogout }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [yeniArkadasAdi, setYeniArkadasAdi] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!kullanici?.id) return;

    fetch(`http://localhost:8080/authapp/api/arkadas/liste?kullaniciId=${kullanici.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setArkadaslar(data))
      .catch(err => console.error('Arkadaşlar alınamadı', err));
  }, [kullanici]);

  useEffect(() => {
    if (aktifAlici) {
      const token = localStorage.getItem('token');
      fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.kullaniciId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMesajlar(data))
        .catch(err => console.error('Mesajlar alınamadı', err));
    } else {
      setMesajlar([]);
    }
  }, [aktifAlici]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  const handleMesajGonder = async () => {
    if (mesaj.trim() === '' || !aktifAlici) return;

    const token = localStorage.getItem('token');
    const yeniMesaj = {
      gondericiId: kullanici.id,
      aliciId: aktifAlici.kullaniciId,
      icerik: mesaj,
      zaman: new Date().toISOString()
    };

    try {
      const res = await fetch('http://localhost:8080/api/mesajlar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(yeniMesaj)
      });

      if (res.ok) {
        const updated = await fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.kullaniciId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());
        setMesajlar(updated);
      } else {
        alert('Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Mesaj gönderilemedi', err);
    }

    setMesaj('');
  };

  const handleYeniArkadasEkle = async () => {
    if (yeniArkadasAdi.trim() === '') return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:8080/authapp/api/arkadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kullaniciAdi: yeniArkadasAdi })
      });

      if (res.ok) {
        const yeni = await res.json();
        setArkadaslar(prev => [...prev, yeni]);
        setYeniArkadasAdi('');
      } else {
        const hata = await res.json();
        alert(hata.mesaj || 'Arkadaş eklenirken hata oluştu.');
      }
    } catch (err) {
      console.error('Arkadaş eklenemedi', err);
      alert('Sunucuya bağlanırken bir hata oluştu.');
    }
  };

  const formatZaman = (isoString) => {
    const tarih = new Date(isoString);
    return `${tarih.getHours().toString().padStart(2, '0')}:${tarih.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.sidebar}>
        <input type="text" placeholder="Ara..." className={styles.searchInput1} />
        <div className={styles.addFriendContainer}>
          <input
            type="text"
            placeholder="Yeni arkadaş adı..."
            value={yeniArkadasAdi}
            onChange={(e) => setYeniArkadasAdi(e.target.value)}
            className={styles.addFriendInput}
          />
          <button onClick={handleYeniArkadasEkle} className={styles.addFriendButton}>Ekle</button>
        </div>

        <div className={styles.userList}>
          {arkadaslar.map((arkadas) => (
            <button
              key={arkadas.kullaniciId}
              className={`${styles.userButton} ${aktifAlici?.kullaniciId === arkadas.kullaniciId ? styles.selected : ''}`}
              onClick={() => setAktifAlici(arkadas)}
            >
              {arkadas.kullaniciAdi}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.currentUser}>
            <div className={styles.profilePic}></div>
            <span className={styles.username}>{kullanici?.kullaniciAdi}</span>
          </div>
          <button className={styles.settingsButton} title="Ayarlar" onClick={() => setModalAcik(true)}>⚙️</button>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <div className={styles.chatProfilePic}></div>
          <span className={styles.chatUsername}>
            {aktifAlici ? aktifAlici.kullaniciAdi : 'Kişi seçilmedi'}
          </span>
          <button className={styles.logoutButton} onClick={onLogout}>Çıkış Yap</button>
        </div>

        <div className={styles.messages}>
          {mesajlar.map((msg, index) => (
            <div
              key={index}
              className={`${styles.message} ${msg.gondericiId === kullanici.id ? styles.fromMe : styles.fromThem}`}
            >
              <div>{msg.icerik}</div>
              <div className={styles.messageTime}>{formatZaman(msg.zaman)}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.messageInputContainer}>
          <input
            type="text"
            className={styles.messageInput}
            placeholder="Mesaj yaz..."
            value={mesaj}
            onChange={(e) => setMesaj(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMesajGonder()}
          />
          <button className={styles.sendButton} onClick={handleMesajGonder}>▶</button>
        </div>
      </div>

      {modalAcik && (
        <div className={styles.modalOverlay} onClick={() => setModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Ayarlar</h2>
            <p>Buraya ayar seçenekleri ekleyebilirsin.</p>
            <button onClick={() => setModalAcik(false)} className={styles.modalCloseButton}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
