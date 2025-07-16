import React, { useEffect, useState, useRef } from 'react';
import styles from './MainMenu.module.css';

const DEFAULT_AVATAR = '/assets/Logo.png'; // public/assets klasöründe olmalı

function MainMenu({ kullanici, onLogout }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [yeniArkadasAdi, setYeniArkadasAdi] = useState('');
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [bildirimSayisi, setBildirimSayisi] = useState(99);

  // Profil ayarları stateleri
  const [profilFotoFile, setProfilFotoFile] = useState(null);
  const [profilFotoUrl, setProfilFotoUrl] = useState(kullanici?.profilFotoUrl || DEFAULT_AVATAR);
  const [isim, setIsim] = useState(kullanici?.isim || '');
  const [soyisim, setSoyisim] = useState(kullanici?.soyisim || '');
  const [kullaniciAdi, setKullaniciAdi] = useState(kullanici?.kullaniciAdi || '');
  const [sifre, setSifre] = useState('');
  const [mail, setMail] = useState(kullanici?.mail || '');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!kullanici?.id) return;
    const token = localStorage.getItem('token');
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

  const filteredArkadaslar = arkadaslar.filter(a =>
    (a.isim + ' ' + a.soyisim).toLowerCase().includes(aramaTerimi.toLowerCase()) ||
    a.kullaniciAdi.toLowerCase().includes(aramaTerimi.toLowerCase())
  );

  // Profil foto değişimi input handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProfilFotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Ayarları kaydet
  const handleAyarKaydet = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      let profilFotoUploadUrl = kullanici.profilFotoUrl;

      // Eğer yeni foto yüklendiyse backend'e gönder (örneğin base64 veya FormData)
      if (profilFotoFile) {
        // Burada backend'e dosya upload yapman gerekir.
        // Örnek FormData ile upload:
        const formData = new FormData();
        formData.append('profilFoto', profilFotoFile);
        const resFoto = await fetch(`http://localhost:8080/api/kullanici/${kullanici.id}/uploadProfilFoto`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        if (resFoto.ok) {
          const data = await resFoto.json();
          profilFotoUploadUrl = data.url; // backend dönen yeni url
          setProfilFotoUrl(profilFotoUploadUrl);
        } else {
          alert('Profil fotoğrafı yüklenemedi.');
          return;
        }
      }

      // Diğer kullanıcı bilgilerini güncelle
      const guncelKullanici = {
        isim,
        soyisim,
        kullaniciAdi,
        sifre: sifre.trim() === '' ? undefined : sifre,
        mail,
        profilFotoUrl: profilFotoUploadUrl
      };

      const res = await fetch(`http://localhost:8080/api/kullanici/${kullanici.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(guncelKullanici)
      });

      if (res.ok) {
        alert('Profil güncellendi.');
        setModalAcik(false);
        setSifre(''); // şifreyi temizle
      } else {
        alert('Profil güncellenemedi.');
      }
    } catch (err) {
      console.error('Profil güncellenirken hata:', err);
      alert('Bir hata oluştu.');
    }
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.sidebar}>
        <input
          type="text"
          placeholder="Ara..."
          className={styles.searchInput1}
          value={aramaTerimi}
          onChange={e => setAramaTerimi(e.target.value)}
        />
        <div className={styles.addFriendContainer}>
          <input
            type="text"
            placeholder="Yeni arkadaş adı..."
            value={yeniArkadasAdi}
            onChange={e => setYeniArkadasAdi(e.target.value)}
            className={styles.addFriendInput}
          />
          <button onClick={handleYeniArkadasEkle} className={styles.addFriendButton}>Ekle</button>
        </div>

        <div className={styles.userList}>
          {filteredArkadaslar.map((arkadas) => (
            <button
              key={arkadas.kullaniciId}
              className={`${styles.userButton} ${aktifAlici?.kullaniciId === arkadas.kullaniciId ? styles.selected : ''}`}
              onClick={() => setAktifAlici(arkadas)}
            >
              <img
                src={arkadas.profilFotoUrl || DEFAULT_AVATAR}
                alt="Profil"
                className={styles.userAvatar}
              />
              {arkadas.isim && arkadas.soyisim
                ? `${arkadas.isim} ${arkadas.soyisim}`
                : arkadas.kullaniciAdi}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.currentUser}>
            <img
              src={profilFotoUrl}
              alt="Profil"
              className={styles.profilePic}
            />
            <span className={styles.username}>
              {(isim && soyisim) ? `${isim} ${soyisim}` : kullaniciAdi}
            </span>
          </div>

          <div className={styles.footerButtons}>
            <button
              className={styles.notificationButton}
              title="Bildirimler"
              onClick={() => setBildirimModalAcik(true)}
            >
              🔔
              {bildirimSayisi > 0 && <span className={styles.notificationBadge}>{bildirimSayisi}</span>}
            </button>
            <button
              className={styles.settingsButton}
              title="Ayarlar"
              onClick={() => setModalAcik(true)}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          {aktifAlici && (
            <img
              src={aktifAlici.profilFotoUrl || DEFAULT_AVATAR}
              alt="Profil"
              className={styles.chatProfilePic}
            />
          )}
          <span className={styles.chatUsername}>
            {aktifAlici
              ? (aktifAlici.isim && aktifAlici.soyisim
                  ? `${aktifAlici.isim} ${aktifAlici.soyisim}`
                  : aktifAlici.kullaniciAdi)
              : "Whispry'ye Hoşgeldiniz!"}
          </span>
          <button className={styles.logoutButton} onClick={onLogout}>Çıkış Yap</button>
        </div>

        {aktifAlici ? (
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
        ) : (
          <div className={styles.welcomeContainer}>
            Whispry ile arkadaşlarınla güvenle sohbet et!
          </div>
        )}

        {aktifAlici && (
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
        )}
      </div>

      {/* Ayarlar modal */}
      {modalAcik && (
        <div className={styles.modalOverlay} onClick={() => setModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Ayarlar</h2>
            <form className={styles.settingsForm} onSubmit={handleAyarKaydet}>
              <div className={styles.profilePhotoContainer}>
                <img
                  src={profilFotoUrl}
                  alt="Profil"
                  className={styles.profilePhotoPreview}
                />
                <label htmlFor="fileInput" className={styles.customFileUpload}>Fotoğraf Yükle</label>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.profilePhotoInput}
                />
              </div>

              <label>İsim</label>
              <input
                type="text"
                value={isim}
                onChange={e => setIsim(e.target.value)}
              />

              <label>Soyisim</label>
              <input
                type="text"
                value={soyisim}
                onChange={e => setSoyisim(e.target.value)}
              />

              <label>Kullanıcı Adı</label>
              <input
                type="text"
                value={kullaniciAdi}
                onChange={e => setKullaniciAdi(e.target.value)}
              />

              <label>Şifre (boş bırakılırsa değişmez)</label>
              <input
                type="password"
                value={sifre}
                onChange={e => setSifre(e.target.value)}
              />

              <label>Mail</label>
              <input
                type="email"
                value={mail}
                onChange={e => setMail(e.target.value)}
              />

              <button type="submit" className={styles.saveSettingsButton}>Kaydet</button>
            </form>

            <button onClick={() => setModalAcik(false)} className={styles.modalCloseButton}>Kapat</button>
          </div>
        </div>
      )}

      {/* Bildirimler modal */}
      {bildirimModalAcik && (
        <div className={styles.modalOverlay} onClick={() => setBildirimModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Bildirimler</h2>
            <p>Burada bildirimlerin gösterilebilir.</p>
            <button onClick={() => setBildirimModalAcik(false)} className={styles.modalCloseButton}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
