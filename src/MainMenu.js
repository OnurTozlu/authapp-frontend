import React, { useEffect, useState, useRef } from 'react';
import styles from './MainMenu.module.css';

const DEFAULT_AVATAR = '/assets/Logo.png'; // public/assets içinde olmalı

function MainMenu({ kullanici, onLogout }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [yeniArkadasAdi, setYeniArkadasAdi] = useState('');
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [bekleyenIstekler, setBekleyenIstekler] = useState([]);
  const API_BASE = process.env.REACT_APP_API_BASE ?? "http://localhost:8080/authapp";

  const [profilFotoFile, setProfilFotoFile] = useState(null);
  const [profilFotoUrl, setProfilFotoUrl] = useState(kullanici?.profilFotoUrl || DEFAULT_AVATAR);
  const [isim, setIsim] = useState(kullanici?.isim || '');
  const [soyisim, setSoyisim] = useState(kullanici?.soyisim || '');
  const [kullaniciAdi, setKullaniciAdi] = useState(kullanici?.kullaniciAdi || '');
  const [sifre, setSifre] = useState('');
  const [mail, setMail] = useState(kullanici?.mail || '');

  const messagesEndRef = useRef(null);
  const bildirimSayisi = bekleyenIstekler.length;

  // Authorization header helper
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  // Arkadaş listesi yükle
  const loadArkadaslar = async () => {
    if (!kullanici?.id) return;
    try {
      const res = await fetch(`http://localhost:8080/authapp/api/arkadas/liste?kullaniciId=${kullanici.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setArkadaslar(data);
      } else {
        console.error('Arkadaş listesi alınamadı.');
      }
    } catch (error) {
      console.error('Arkadaş listesi hatası:', error);
    }
  };

  // Bekleyen arkadaşlık isteklerini yükle
  const loadBekleyenIstekler = async () => {
    if (!kullanici?.id) return;
    try {
      const res = await fetch(`http://localhost:8080/authapp/api/arkadas/istekler?alanId=${kullanici.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBekleyenIstekler(data);
      } else {
        console.error('Bekleyen istekler alınamadı.');
      }
    } catch (error) {
      console.error('Bekleyen istekler hatası:', error);
    }
  };

  // Mesajları yükle
  const loadMesajlar = async (aliciId) => {
    if (!aliciId) {
      setMesajlar([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/authapp/api/mesajlar?aliciId=${aliciId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMesajlar(data);
      } else {
        console.error('Mesajlar alınamadı.');
        setMesajlar([]);
      }
    } catch (error) {
      console.error('Mesajlar yükleme hatası:', error);
      setMesajlar([]);
    }
  };

  // Component mount ve kullanici değişince arkadaşlar & istekler yükle
  useEffect(() => {
    loadArkadaslar();
    loadBekleyenIstekler();
  }, [kullanici]);

  // Aktif alıcı değişince mesajları yükle
  useEffect(() => {
    if (aktifAlici) {
      loadMesajlar(aktifAlici.kullaniciId);
    } else {
      setMesajlar([]);
    }
  }, [aktifAlici]);

  // Mesajlar değişince scroll en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  // Mesaj gönder
  const handleMesajGonder = async () => {
    if (!mesaj.trim() || !aktifAlici) return;
    const yeniMesaj = {
      gondericiId: kullanici.id,
      aliciId: aktifAlici.kullaniciId,
      icerik: mesaj.trim(),
      zaman: new Date().toISOString(),
    };
    try {
      const res = await fetch('http://localhost:8080/authapp/api/mesajlar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(yeniMesaj),
      });
      if (res.ok) {
        await loadMesajlar(aktifAlici.kullaniciId);
        setMesaj('');
      } else {
        alert('Mesaj gönderilemedi.');
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      alert('Mesaj gönderilemedi, hata oluştu.');
    }
  };

  // Yeni arkadaş ekle
  const handleYeniArkadasEkle = async () => {
    if (!yeniArkadasAdi.trim()) return;
    try {
      const res = await fetch('http://localhost:8080/authapp/api/arkadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ kullaniciAdi: yeniArkadasAdi.trim() }),
      });
      if (res.ok) {
        alert('Arkadaşlık isteği gönderildi.');
        setYeniArkadasAdi('');
        loadBekleyenIstekler();
      } else {
        const hata = await res.json();
        alert(hata.mesaj || 'Arkadaş eklenirken hata oluştu.');
      }
    } catch (error) {
      console.error('Arkadaş ekleme hatası:', error);
      alert('Sunucuya bağlanırken hata oluştu.');
    }
  };

  // Arkadaşlık isteği durumunu güncelle
  const handleIstegiGuncelle = async (istekId, yeniDurum) => {
    if (!istekId) return;
    try {
      const res = await fetch(`http://localhost:8080/authapp/api/arkadas/${istekId}/durum?durum=${yeniDurum}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      if (res.ok) {
        setBekleyenIstekler((prev) => prev.filter((i) => i.istekId !== istekId));
        if (yeniDurum === 1) loadArkadaslar();
      } else {
        alert('İstek güncellenemedi.');
      }
    } catch (error) {
      console.error('İstek güncelleme hatası:', error);
      alert('İstek güncellenirken hata oluştu.');
    }
  };

  // Zaman formatla (HH:mm)
  const formatZaman = (iso) => {
    const dt = new Date(iso);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Arkadaş listesi filtreleme
  const filteredArkadaslar = arkadaslar.filter((a) =>
    `${a.isim ?? ''} ${a.soyisim ?? ''}`.toLowerCase().includes(aramaTerimi.toLowerCase()) ||
    a.kullaniciAdi.toLowerCase().includes(aramaTerimi.toLowerCase())
  );

  // Profil foto seçimi
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilFotoUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // Ayarları kaydet
  const handleAyarKaydet = async (e) => {
    e.preventDefault();
    let profilFotoUploadUrl = kullanici.profilFotoUrl;

    try {
      if (profilFotoFile) {
        const formData = new FormData();
        formData.append('profilFoto', profilFotoFile);

        const resFoto = await fetch(`http://localhost:8080/authapp/api/kullanici/${kullanici.id}/uploadProfilFoto`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            // Content-Type asla formdata ile manuel setlenmez!
          },
          body: formData,
        });

        if (resFoto.ok) {
          const data = await resFoto.json();
          profilFotoUploadUrl = data.url;
          setProfilFotoUrl(profilFotoUploadUrl);
        } else {
          alert('Profil fotoğrafı yüklenemedi.');
          return;
        }
      }

      const guncelKullanici = {
        isim,
        soyisim,
        kullaniciAdi,
        ...(sifre.trim() !== '' && { sifre }),
        mail,
        profilFotoUrl: profilFotoUploadUrl,
      };


      const res = await fetch(`http://localhost:8080/authapp/api/kullanici/${kullanici.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(guncelKullanici),
      });

      if (res.ok) {
        alert('Profil güncellendi.');
        setModalAcik(false);
        setSifre('');
      } else {
        const hata = await res.text();
        console.error('Profil güncelleme hatası:', hata);
        alert('Profil güncellenemedi.');
      }
    } catch (error) {
      console.error('Profil güncelleme sırasında hata:', error);
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
          onChange={(e) => setAramaTerimi(e.target.value)}
        />

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
          {filteredArkadaslar.map((arkadas) => (
            <button
              key={arkadas.kullaniciId}
              className={`${styles.userButton} ${aktifAlici?.kullaniciId === arkadas.kullaniciId ? styles.selected : ''}`}
              onClick={() => setAktifAlici(arkadas)}
            >
              <img src={arkadas.profilFotoUrl || DEFAULT_AVATAR} alt="Profil" className={styles.userAvatar} />
              {arkadas.isim && arkadas.soyisim
                ? `${arkadas.isim} ${arkadas.soyisim}`
                : arkadas.kullaniciAdi}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.currentUser}>
            <img
              src={profilFotoUrl ? `${API_BASE}${profilFotoUrl}` : DEFAULT_AVATAR}
              alt="Profil"
              className={styles.profilePic}
            />
            <span className={styles.username}>
              {isim && soyisim ? `${isim} ${soyisim}` : kullaniciAdi}
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
            <button className={styles.settingsButton} title="Ayarlar" onClick={() => setModalAcik(true)}>
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          {aktifAlici && (
            <img src={aktifAlici.profilFotoUrl || DEFAULT_AVATAR} alt="Profil" className={styles.chatProfilePic} />
          )}
          <span className={styles.chatUsername}>
            {aktifAlici
              ? aktifAlici.isim && aktifAlici.soyisim
                ? `${aktifAlici.isim} ${aktifAlici.soyisim}`
                : aktifAlici.kullaniciAdi
              : "Whispry'ye Hoşgeldiniz!"}
          </span>
          <button className={styles.logoutButton} onClick={onLogout}>
            Çıkış Yap
          </button>
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
          <div className={styles.welcomeContainer}>Whispry ile arkadaşlarınla güvenle sohbet et!</div>
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
            <button className={styles.sendButton} onClick={handleMesajGonder}>
              ▶
            </button>
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
                  src={profilFotoUrl ? `${API_BASE}${profilFotoUrl}` : DEFAULT_AVATAR}
                  alt="Profil"
                  className={styles.profilePhotoPreview}
                />
                <label htmlFor="fileInput" className={styles.customFileUpload}>
                  Fotoğraf Yükle
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.profilePhotoInput}
                />
              </div>

              <label>İsim</label>
              <input type="text" value={isim} onChange={(e) => setIsim(e.target.value)} />

              <label>Soyisim</label>
              <input type="text" value={soyisim} onChange={(e) => setSoyisim(e.target.value)} />

              <label>Kullanıcı Adı</label>
              <input type="text" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} />

              <label>Şifre (boş bırakılırsa değişmez)</label>
              <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} />

              <label>Mail</label>
              <input type="email" value={mail} onChange={(e) => setMail(e.target.value)} />

              <button type="submit" className={styles.saveSettingsButton}>
                Kaydet
              </button>
            </form>

            <button onClick={() => setModalAcik(false)} className={styles.modalCloseButton}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Bildirimler modal */}
      {bildirimModalAcik && (
        <div className={styles.modalOverlay} onClick={() => setBildirimModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Bekleyen Arkadaşlık İstekleri</h2>
            {bekleyenIstekler.length === 0 ? (
              <p>Bekleyen isteğiniz yok.</p>
            ) : (
              bekleyenIstekler.map((istek) => (
                <div key={istek.istekId} className={styles.notificationItem}>
                  <span className={styles.notificationText}>
                    {istek.gonderenIsimSoyisim} ({istek.gonderenKullaniciAdi})
                  </span>
                  <button
                    onClick={() => handleIstegiGuncelle(istek.istekId, 1)}
                    className={styles.acceptButton}
                  >
                    Kabul Et
                  </button>
                  <button
                    onClick={() => handleIstegiGuncelle(istek.istekId, 2)}
                    className={styles.rejectButton}
                  >
                    Reddet
                  </button>
                </div>
              ))
            )}
            <button onClick={() => setBildirimModalAcik(false)} className={styles.modalCloseButton}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
