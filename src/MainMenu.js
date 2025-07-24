import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import styles from './MainMenu.module.css';

/**
 * API kök adresi: .env varsa onu kullan, yoksa fallback.
 * (.env: REACT_APP_API_BASE=http://localhost:8080/authapp)
 */
const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:8080/authapp';

/**
 * WebSocket endpoint'i: ayrı bir env (REACT_APP_WS_BASE) varsa onu kullan; yoksa API_BASE + /ws.
 * Backend WebSocketConfig.registerStompEndpoints -> "/ws".
 */
const WS_BASE = process.env.REACT_APP_WS_BASE ?? `${API_BASE}/ws`;

/** Backend uploads klasöründeki varsayılan avatar */
const DEFAULT_AVATAR = `${API_BASE}/uploads/Logo.png`;

/** Görsel URL inşa helper'ı. */
function buildImageUrl(path) {
  if (!path || typeof path !== 'string') return DEFAULT_AVATAR;
  const p = path.trim();
  if (p === '') return DEFAULT_AVATAR;
  if (p.startsWith('data:')) return p;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const rel = p.startsWith('/') ? p : `/${p}`;
  return `${API_BASE}${rel}`;
}

/** Mesaj objesini backend/legacy alan adlarına göre normalize et. */
function normalizeMsg(raw) {
  // console.log('normalizeMsg input:', raw);
  return {
    id: raw.id ?? raw.mesajId ?? 'no-id',
    senderId: String(
      raw.senderId ?? raw.gondericiId ?? raw.gonderenId ?? raw.gonderenID ?? raw.gonderen ?? 'no-sender'
    ),
    receiverId: String(
      raw.receiverId ?? raw.aliciId ?? raw.aliciID ?? raw.alici ?? 'no-receiver'
    ),
    content: raw.content ?? raw.icerik ?? '',
    timestamp: raw.timestamp ?? raw.zaman ?? raw.createdAt ?? null,
  };
}

/** Yardımcı: friend ID'lerini karşılaştırırken string'e çevir. */
const toStrId = (v) => String(v ?? '');

function MainMenu({ kullanici, onLogout }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null); // {kullaniciId, ...}
  const [mesajlar, setMesajlar] = useState([]); // aktif sohbet mesajları
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false);
  const [yeniArkadasAdi, setYeniArkadasAdi] = useState('');
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [bekleyenIstekler, setBekleyenIstekler] = useState([]);

  // Profil bilgileri
  const [profilFotoFile, setProfilFotoFile] = useState(null);
  const [profilFotoUrl, setProfilFotoUrl] = useState(kullanici?.profilFotoUrl ?? null);
  const [isim, setIsim] = useState(kullanici?.isim || '');
  const [soyisim, setSoyisim] = useState(kullanici?.soyisim || '');
  const [kullaniciAdi, setKullaniciAdi] = useState(kullanici?.kullaniciAdi || '');
  const [sifre, setSifre] = useState('');
  const [mail, setMail] = useState(kullanici?.mail || '');

  const messagesEndRef = useRef(null);

  /** WebSocket / STOMP client state */
  const stompClientRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const bildirimSayisi = bekleyenIstekler.length;

  /**
   * --- YENİ: aktif alıcıyı seçince unreadCount sıfırlamak için helper ---
   */
  const clearUnreadFor = useCallback((friendId) => {
    setArkadaslar((prev) =>
      prev.map((a) =>
        toStrId(a.kullaniciId) === toStrId(friendId)
          ? { ...a, unreadCount: 0 }
          : a
      )
    );
  }, []);

  /**
   * --- YENİ: Bir arkadaş için unread sayısını artır ve liste başına taşı ---
   * incrementUnread = true -> unreadCount++
   * incrementUnread = false -> unreadCount değişmez (örn. aktif görüşmede iken gönderdiğimiz mesajlar)
   */
  const bumpFriendToTop = useCallback((friendId, { incrementUnread = true, timestamp = Date.now() } = {}) => {
    setArkadaslar((prev) => {
      const idx = prev.findIndex((a) => toStrId(a.kullaniciId) === toStrId(friendId));
      if (idx === -1) return prev; // bilinmiyor
      const friend = { ...prev[idx] };
      friend.lastActivity = timestamp;
      if (incrementUnread) {
        friend.unreadCount = (friend.unreadCount || 0) + 1;
      }
      // Listeden çıkarıp başa ekle
      const newArr = [...prev];
      newArr.splice(idx, 1);
      newArr.unshift(friend);
      return newArr;
    });
  }, []);

  /** JWT header helper */
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /** Ortak fetch helper (auth header otomatik ekler) */
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...getAuthHeaders(),
      };
      return fetch(url, { ...options, headers });
    },
    [getAuthHeaders]
  );

  /** Arkadaş listesi yükle */
  const loadArkadaslar = useCallback(async () => {
    if (!kullanici?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/api/arkadas/liste?kullaniciId=${kullanici.id}`);
      if (res.ok) {
        const data = await res.json();
        // Önceki unread ve lastActivity değerlerini koru
        setArkadaslar((prev) => {
          const prevMap = new Map(prev.map((p) => [toStrId(p.kullaniciId), p]));
          return data.map((a) => {
            const old = prevMap.get(toStrId(a.kullaniciId));
            return {
              ...a,
              unreadCount: old?.unreadCount ?? 0,
              lastActivity: old?.lastActivity ?? 0,
            };
          });
        });
      } else {
        console.error('Arkadaş listesi alınamadı. Status:', res.status);
      }
    } catch (err) {
      console.error('Arkadaş listesi hatası:', err);
    }
  }, [kullanici, authFetch]);

  /** Bekleyen arkadaşlık istekleri */
  const loadBekleyenIstekler = useCallback(async () => {
    if (!kullanici?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/api/arkadas/istekler?alanId=${kullanici.id}`);
      if (res.ok) {
        const data = await res.json();
        setBekleyenIstekler(data);
      } else {
        console.error('Bekleyen istekler alınamadı. Status:', res.status);
      }
    } catch (err) {
      console.error('Bekleyen istekler hatası:', err);
    }
  }, [kullanici, authFetch]);

  /** Mesajları yükle (aktif alıcıya göre) - REST fallback */
  const loadMesajlar = useCallback(
    async (aliciId) => {
      if (!aliciId) {
        setMesajlar([]);
        return;
      }
      try {
        const res = await authFetch(`${API_BASE}/api/mesajlar?aliciId=${aliciId}`);
        if (res.ok) {
          const data = await res.json();
          setMesajlar(Array.isArray(data) ? data.map(normalizeMsg) : []);
        } else {
          setMesajlar([]);
        }
      } catch (err) {
        setMesajlar([]);
      }
    },
    [authFetch]
  );

  // Component mount & kullanıcı değişince
  useEffect(() => {
    loadArkadaslar();
    loadBekleyenIstekler();
  }, [kullanici, loadArkadaslar, loadBekleyenIstekler]);

  // Aktif alıcı değişince mesajlar yükle ve unread sıfırla
  useEffect(() => {
    if (aktifAlici) {
      loadMesajlar(aktifAlici.kullaniciId);
      clearUnreadFor(aktifAlici.kullaniciId);
    } else {
      setMesajlar([]);
    }
  }, [aktifAlici, loadMesajlar, clearUnreadFor]);

  // Mesajlar değişince scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  /** WebSocket bağlantısı kur */
  useEffect(() => {
    if (!kullanici?.id) return; // login yoksa bağlanma

    const token = localStorage.getItem('token');
    const myIdStr = toStrId(kullanici.id);

    const client = new Client({
      // SockJS factory
      webSocketFactory: () => new SockJS(WS_BASE),
      debug: (str) => console.log('[STOMP]', str),
      reconnectDelay: 5000, // ms
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    client.onConnect = () => {
      console.log('WebSocket bağlantısı kuruldu');
      setWsConnected(true);

      // Kullanıcıya özel mesajlar
      client.subscribe('/user/queue/mesajlar', (frame) => {
        try {
          const body = JSON.parse(frame.body);
          const msg = normalizeMsg(body);

          // Mesajı aktif sohbete ekleyelim mi?
          setMesajlar((prev) => {
            const aliciIdStr = aktifAlici ? toStrId(aktifAlici.kullaniciId) : null;
            const isForActive =
              aliciIdStr &&
              (msg.senderId === aliciIdStr ||
                msg.receiverId === aliciIdStr ||
                // bazı backendler receiver/gonderen swap yapabilir; kontrol geniş
                (msg.senderId === myIdStr && msg.receiverId === aliciIdStr));
            if (isForActive) {
              return [...prev, msg];
            }
            return prev;
          });

          // --- Arkadaş sıralama & unread güncelleme ---
          const otherPartyId = msg.senderId === myIdStr ? msg.receiverId : msg.senderId;
          const isActive = aktifAlici && toStrId(aktifAlici.kullaniciId) === toStrId(otherPartyId);
          bumpFriendToTop(otherPartyId, { incrementUnread: !isActive, timestamp: Date.now() });
          if (isActive) {
            // aktif görüşmede ise unread sıfırlandığı için emin olmak adına:
            clearUnreadFor(otherPartyId);
          }
        } catch (e) {
          console.error('WS mesaj parse hatası:', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker STOMP Hatası:', frame.headers['message'], frame.body);
    };

    client.onWebSocketClose = () => {
      console.warn('WebSocket kapandı');
      setWsConnected(false);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      try {
        client.deactivate();
      } catch (_) {
        /* ignore */
      }
      stompClientRef.current = null;
      setWsConnected(false);
    };
    // aktifAlici bağımlılığı: farklı user context'te abonelik filtresini güncel tutmak için state set'te kontrol ediyoruz
  }, [kullanici?.id, aktifAlici, bumpFriendToTop, clearUnreadFor]);

  /** WebSocket üzerinden mesaj gönder (varsa), yoksa REST fallback */
  const sendMessageWS = useCallback(
    (payload) => {
      const client = stompClientRef.current;
      if (!client || !wsConnected) return false;
      try {
        client.publish({ destination: '/app/mesaj-gonder', body: JSON.stringify(payload) });
        return true;
      } catch (err) {
        console.error('WS publish hatası:', err);
        return false;
      }
    },
    [wsConnected]
  );

  /** Mesaj gönder */
  const handleMesajGonder = useCallback(async () => {
    if (!mesaj.trim() || !aktifAlici || !kullanici?.id) return;

    console.log('Gönderici ID:', kullanici.id, 'Alıcı ID:', aktifAlici?.kullaniciId);

    const nowIso = new Date().toISOString();
    const gonderilecekMesaj = {
      senderId: String(kullanici.id),
      receiverId: String(aktifAlici.kullaniciId),
      content: mesaj.trim(),
      timestamp: nowIso,
    };

    console.log('Gönderilen mesaj payload:', gonderilecekMesaj);

    // Önce WebSocket dene
    const wsOk = sendMessageWS(gonderilecekMesaj);

    // Optimistic UI: kullanıcı mesajı hemen görsün
    if (wsOk) {
      setMesajlar((prev) => [
        ...prev,
        {
          ...gonderilecekMesaj,
          id: `tmp-${Date.now()}`,
        },
      ]);
      setMesaj('');
      // Gönderdiğimiz kişi liste başına gelsin; unread artmasın.
      bumpFriendToTop(aktifAlici.kullaniciId, { incrementUnread: false, timestamp: Date.now() });
      return;
    }

    // WS yoksa REST fallback
    try {
      const res = await authFetch(`${API_BASE}/api/mesajlar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gonderilecekMesaj),
      });
      if (res.ok) {
        const saved = normalizeMsg(await res.json());
        setMesajlar((prev) => [...prev, saved]);
        setMesaj('');
        bumpFriendToTop(aktifAlici.kullaniciId, { incrementUnread: false, timestamp: Date.now() });
      } else {
        console.error('Mesaj gönderilemedi. Status:', res.status);
        alert('Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
      alert('Mesaj gönderilemedi, hata oluştu.');
    }
  }, [mesaj, aktifAlici, kullanici, sendMessageWS, authFetch, bumpFriendToTop]);

  /** Yeni arkadaş ekle */
  const handleYeniArkadasEkle = useCallback(async () => {
    if (!yeniArkadasAdi.trim()) return;
    try {
      const res = await authFetch(`${API_BASE}/api/arkadas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kullaniciAdi: yeniArkadasAdi.trim() }),
      });
      if (res.ok) {
        alert('Arkadaşlık isteği gönderildi.');
        setYeniArkadasAdi('');
        loadBekleyenIstekler();
      } else {
        const hata = await res.json().catch(() => ({}));
        alert(hata.mesaj || 'Arkadaş eklenirken hata oluştu.');
      }
    } catch (err) {
      console.error('Arkadaş ekleme hatası:', err);
      alert('Sunucuya bağlanırken hata oluştu.');
    }
  }, [yeniArkadasAdi, authFetch, loadBekleyenIstekler]);

  /** Arkadaşlık isteği durumunu güncelle */
  const handleIstegiGuncelle = useCallback(
    async (istekId, yeniDurum) => {
      if (!istekId) return;
      try {
        const res = await authFetch(`${API_BASE}/api/arkadas/${istekId}/durum?durum=${yeniDurum}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          setBekleyenIstekler((prev) => prev.filter((i) => i.istekId !== istekId));
          if (yeniDurum === 1) loadArkadaslar();
        } else {
          alert('İstek güncellenemedi.');
        }
      } catch (err) {
        console.error('İstek güncelleme hatası:', err);
        alert('İstek güncellenirken hata oluştu.');
      }
    },
    [authFetch, loadArkadaslar]
  );

  // Arkadaş listesi filtreleme (sıra korunur)
  const filteredArkadaslar = useMemo(() => {
    const term = aramaTerimi.toLowerCase();
    return arkadaslar.filter((a) =>
      `${a.isim ?? ''} ${a.soyisim ?? ''}`.toLowerCase().includes(term) || a.kullaniciAdi.toLowerCase().includes(term)
    );
  }, [arkadaslar, aramaTerimi]);

  // Profil foto seçimi (ayarlar modal) — preview için dataURL
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilFotoUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // Ayarları kaydet
  const handleAyarKaydet = useCallback(
    async (e) => {
      e.preventDefault();
      if (!kullanici?.id) return;

      let profilFotoUploadUrl = kullanici.profilFotoUrl;

      try {
        // Fotoğraf yükleme
        if (profilFotoFile) {
          const formData = new FormData();
          formData.append('profilFoto', profilFotoFile);

          const resFoto = await authFetch(`${API_BASE}/api/kullanici/${kullanici.id}/uploadProfilFoto`, {
            method: 'POST',
            body: formData,
          });

          if (resFoto.ok) {
            const data = await resFoto.json(); // { url: "/uploads/..." }
            profilFotoUploadUrl = data.url;
            setProfilFotoUrl(`${profilFotoUploadUrl}?v=${Date.now()}`); // cache-bust

            setArkadaslar((prev) =>
              prev.map((a) => (a.kullaniciId === kullanici.id ? { ...a, profilFotoUrl: profilFotoUploadUrl } : a))
            );
          } else {
            alert('Profil fotoğrafı yüklenemedi.');
            return;
          }
        }

        // Kullanıcı bilgileri güncelle
        const guncelKullanici = {
          isim,
          soyisim,
          kullaniciAdi,
          ...(sifre.trim() !== '' && { sifre }),
          mail,
          profilFotoUrl: profilFotoUploadUrl,
        };

        const res = await authFetch(`${API_BASE}/api/kullanici/${kullanici.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
      } catch (err) {
        console.error('Profil güncelleme sırasında hata:', err);
        alert('Bir hata oluştu.');
      }
    },
    [profilFotoFile, kullanici, isim, soyisim, kullaniciAdi, sifre, mail, authFetch]
  );

  /** Resim hata fallback */
  const handleImageError = (e) => {
    if (e.currentTarget.src !== DEFAULT_AVATAR) {
      e.currentTarget.src = DEFAULT_AVATAR;
    }
  };

  /** Zaman formatla (HH:mm) */
  const formatZaman = (iso) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const myIdStr = toStrId(kullanici?.id ?? '');

  /** Arkadaş seçimi: unread sıfırla */
const handleSelectAlici = (arkadas) => {
  setAktifAlici({
    ...arkadas,
    isim: arkadas.isim ?? '',
    soyisim: arkadas.soyisim ?? '',
  });
  clearUnreadFor(arkadas.kullaniciId);
};


  /** Küçük badge formatlayıcı (99+ gibi) */
  const formatBadge = (n) => {
    if (!n) return null;
    return n > 99 ? '99+' : n;
  };

  return (
    <div className={styles.mainContainer}>
      {/* SOL SİDEBAR */}
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
              onClick={() => handleSelectAlici(arkadas)}
            >
              <img
                src={buildImageUrl(arkadas.profilFotoUrl)}
                alt="Profil"
                className={styles.userAvatar}
                onError={handleImageError}
              />
              <span className={styles.userLabel}>
                {arkadas.isim && arkadas.soyisim ? `${arkadas.isim} ${arkadas.soyisim}` : arkadas.kullaniciAdi}
              </span>
              {arkadas.unreadCount > 0 && (
                <span className={styles.userBadge}>{formatBadge(arkadas.unreadCount)}</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.currentUser}>
            <img
              src={buildImageUrl(profilFotoUrl)}
              alt="Profil"
              className={styles.profilePic}
              onError={handleImageError}
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
          {/* WS durum göstergesi (isteğe bağlı) */}
          <div className={styles.wsStatus} title={wsConnected ? 'Canlı bağlandı' : 'Bağlı değil'}>
            {wsConnected ? '● Online' : '○ Offline'}
          </div>
        </div>
      </div>

      {/* SAĞ CHAT ALANI */}
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          {aktifAlici && (
            <img
              src={buildImageUrl(aktifAlici.profilFotoUrl)}
              alt="Profil"
              className={styles.chatProfilePic}
              onError={handleImageError}
            />
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
            {mesajlar.map((msg, index) => {
        const fromMe = msg.senderId === myIdStr;
        const fromThem = msg.receiverId === myIdStr;
        console.log("Mesaj objesi:", msg);
        console.log('aktifAlici:', aktifAlici);
console.log('msg.senderId:', msg.senderId, 'msg.receiverId:', msg.receiverId);


        return (
          <div key={msg.id ?? index} className={styles.messageRow}>
            <img
              src={buildImageUrl(
                String(msg.senderId) === String(myIdStr)
                  ? kullanici?.profilFotoUrl    // Senin profil fotoğrafın
                  : aktifAlici?.profilFotoUrl   // Karşı tarafın profil fotoğrafı
              )}
              alt="Profil"
              className={styles.messageAvatar}
              onError={handleImageError}
            />

            <div className={styles.messageBubble}>
              <div className={styles.senderName}>
                {String(msg.senderId) === myIdStr
                  ? `${kullanici?.kullaniciAdi || "Ben"}`
                  : `${aktifAlici?.kullaniciAdi || "Karşı"}`}
              </div>


              <div className={styles.messageText}>{msg.content}</div>
              <div className={styles.messageTime}>{formatZaman(msg.timestamp)}</div>
            </div>
          </div>
        );





            })}
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
                  src={buildImageUrl(profilFotoUrl)}
                  alt="Profil"
                  className={styles.profilePhotoPreview}
                  onError={handleImageError}
                />
                <label htmlFor="fileInput" className={styles.uploadLabel}>
                  Fotoğraf Değiştir
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              <label>İsim</label>
              <input value={isim} onChange={(e) => setIsim(e.target.value)} />

              <label>Soyisim</label>
              <input value={soyisim} onChange={(e) => setSoyisim(e.target.value)} />

              <label>Kullanıcı Adı</label>
              <input value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} />

              <label>Şifre (boş bırakılırsa değişmez)</label>
              <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} />

              <label>Mail</label>
              <input value={mail} onChange={(e) => setMail(e.target.value)} />

              <div className={styles.modalButtons}>
                <button type="submit" className={styles.saveButton}>
                  Kaydet
                </button>
                <button type="button" onClick={() => setModalAcik(false)} className={styles.cancelButton}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bildirim modal */}
      {bildirimModalAcik && (
        <div className={styles.modalOverlay} onClick={() => setBildirimModalAcik(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Bekleyen Arkadaşlık İstekleri</h2>

            {bekleyenIstekler.length === 0 ? (
              <p>Yeni arkadaşlık isteğiniz yok.</p>
            ) : (
              <ul className={styles.requestList}>
                {bekleyenIstekler.map((istek) => (
                  <li key={istek.istekId} className={styles.requestItem}>
                    <span>{istek.gonderenIsimSoyisim ?? istek.gonderenKullaniciAdi}</span>
                    <div>
                      <button
                        className={styles.acceptButton}
                        onClick={() => handleIstegiGuncelle(istek.istekId, 1)}
                      >
                        Kabul Et
                      </button>
                      <button
                        className={styles.rejectButton}
                        onClick={() => handleIstegiGuncelle(istek.istekId, 2)}
                      >
                        Reddet
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.closeButton} onClick={() => setBildirimModalAcik(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;