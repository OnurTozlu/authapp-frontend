import React, { useEffect, useState, useRef } from 'react';
import styles from './MainMenu.module.css';

function MainMenu({ kullanici, onLogout }) {
  console.log("Kullanıcı adı:", kullanici?.kullaniciAdi);

  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [yeniArkadasAdi, setYeniArkadasAdi] = useState('');
  const messagesEndRef = useRef(null);

  // Arkadaş listesini çek (API) — token eklendi
  useEffect(() => {
  const token = localStorage.getItem('token');

  if (!kullanici || !kullanici.id) return;

  fetch(`http://localhost:8080/api/arkadas/liste?kullaniciId=${kullanici.id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("İstek başarısız");
      return res.json();
    })
    .then(data => setArkadaslar(data))
    .catch(err => console.error('Arkadaşlar alınamadı', err));
}, [kullanici]);


  // Aktif alıcı değiştiğinde o kişinin geçmiş mesajlarını çek (API) — token eklendi
  useEffect(() => {
    if (aktifAlici) {
      const token = localStorage.getItem('token');
      fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => setMesajlar(data))
        .catch(err => console.error('Mesajlar alınamadı', err));
    } else {
      setMesajlar([]);
    }
  }, [aktifAlici]);

  // Mesajlar güncellendiğinde otomatik scroll yap
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mesajlar]);

  // Mesaj gönderme (REST API ile)
  const handleMesajGonder = async () => {
    if (mesaj.trim() === '' || !aktifAlici) return;

    const yeniMesaj = {
      gondericiId: kullanici.id,
      aliciId: aktifAlici.id,
      icerik: mesaj,
      zaman: new Date().toISOString()
    };

    const token = localStorage.getItem('token');
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
        // Başarılıysa mesajı tekrar çek
        fetch(`http://localhost:8080/api/mesajlar?aliciId=${aktifAlici.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setMesajlar(data));
      } else {
        alert('Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Mesaj gönderilemedi', err);
    }

    setMesaj('');
  };

  // Yeni arkadaş ekleme (API) — token eklendi
  const handleYeniArkadasEkle = async () => {
    if (yeniArkadasAdi.trim() === '') return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:8080/api/arkadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kullaniciAdi: yeniArkadasAdi })
      });

      if (res.ok) {
        const yeniArkadas = await res.json();
        setArkadaslar((prev) => [...prev, yeniArkadas]);
        setYeniArkadasAdi('');
      } else {
        alert('Arkadaş eklenirken hata oluştu.');
      }
    } catch (err) {
      console.error('Arkadaş eklenemedi', err);
    }
  };

  // Zaman formatlama helper
  const formatZaman = (isoString) => {
    const tarih = new Date(isoString);
    return `${tarih.getHours().toString().padStart(2, '0')}:${tarih
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className={styles.mainContainer}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <input type="text" placeholder="Ara..." className={styles.searchInput1} />

        {/* Arkadaş ekleme */}
        <div className={styles.addFriendContainer}>
          <input
            type="text"
            placeholder="Yeni arkadaş adı..."
            value={yeniArkadasAdi}
            onChange={(e) => setYeniArkadasAdi(e.target.value)}
            className={styles.addFriendInput}
          />
          <button onClick={handleYeniArkadasEkle} className={styles.addFriendButton}>
            Ekle
          </button>
        </div>

        <div className={styles.userList}>
          {arkadaslar.map((arkadas) => (
            <button
              key={arkadas.id}
              className={`${styles.userButton} ${
                aktifAlici && aktifAlici.id === arkadas.id ? styles.selected : ''
              }`}
              onClick={() => setAktifAlici(arkadas)}
            >
              {arkadas.kullaniciAdi}
            </button>
          ))}
        </div>

<div className={styles.sidebarFooter}>
  <div className={styles.currentUser}>
    <div className={styles.profilePic}></div>
    <span className={styles.username}>
      {kullanici?.kullaniciAdi}
    </span>
  </div>

  <button
    className={styles.settingsButton}
    title="Ayarlar"
    onClick={() => setModalAcik(true)}
  >
    ⚙️
  </button>
</div>

      </div>

      {/* Chat Container */}
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <div className={styles.chatProfilePic}></div>
          <span className={styles.chatUsername}>
            {aktifAlici ? aktifAlici.kullaniciAdi : 'Kişi seçilmedi'}
          </span>

          {/* Çıkış butonu */}
          <button
            className={styles.logoutButton}
            title="Çıkış Yap"
            onClick={onLogout}
          >
            Çıkış Yap
          </button>
        </div>

        <div className={styles.messages}>
          {mesajlar.map((msg, index) => (
            <div
              key={index}
              className={`${styles.message} ${
                msg.gondericiId === kullanici.id ? styles.fromMe : styles.fromThem
              }`}
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
          <button className={styles.sendButton} onClick={handleMesajGonder}>
            ▶
          </button>
        </div>
      </div>

      {/* Modal Ayarlar */}
      {modalAcik && (
        <div className={styles.modalOverlay} onClick={() => setModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Ayarlar</h2>
            <p>Buraya ayar seçenekleri ekleyebilirsin.</p>
            <button onClick={() => setModalAcik(false)} className={styles.modalCloseButton}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;