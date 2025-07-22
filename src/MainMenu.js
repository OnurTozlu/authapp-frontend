import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import styles from './MainMenu.module.css';

/** **********************************************************************************************
 * MainMenu.jsx – Whispry Chat Ana Ekranı (FINAL)
 *
 * Güncellemeler:
 *  • Ayarlar (Settings) modalı: max-width / max-height, scroll, mobil uyum, görsel önizleme, güvenli kapatma.
 *  • Bildirimler (Arkadaşlık İstekleri) modalı: uzun listelerde scroll, dar ekranlarda kırılmayı önleme.
 *  • WS + REST fallback mantığı korunup sadeleştirildi.
 *  • Dupe-önleme cache'i korundu.
 *  • Görsel URL sağlamlaştırıldı.
 *
 * Backend varsayımları:
 *  ChatStompController -> @MessageMapping("/chat.sendMessage") publish dest '/app/chat.sendMessage'.
 *  convertAndSendToUser(..., "/queue/messages", ...) -> kullanıcıya özel abonelik '/user/queue/messages'.
 *************************************************************************************************/

/** API kök adresi (.env override) */
const API_BASE = process.env.REACT_APP_API_BASE ?? 'http://localhost:8080/authapp';
/** WS endpoint (.env override) */
const WS_BASE = process.env.REACT_APP_WS_BASE ?? `${API_BASE}/ws`;
/** Varsayılan avatar */
const DEFAULT_AVATAR = `${API_BASE}/uploads/Logo.png`;
/** STOMP destinasyonları */
const STOMP_DEST_SEND = '/app/chat.sendMessage';
const STOMP_SUB_USER = '/user/queue/messages';
const STOMP_SUB_PUBLIC = '/topic/public'; // opsiyonel genel kanal

/** Mesaj objesini normalize et (backend/legacy alan adları) */
function normalizeMsg(raw) {
  const id = raw?.id ?? raw?.mesajId ?? undefined;
  const sender = raw?.senderId ?? raw?.gondericiId ?? raw?.gonderenId ?? raw?.gonderenID ?? raw?.gonderen ?? null;
  const receiver = raw?.receiverId ?? raw?.aliciId ?? raw?.aliciID ?? raw?.alici ?? null;
  const content = raw?.content ?? raw?.icerik ?? '';
  const timestamp = raw?.timestamp ?? raw?.zaman ?? raw?.createdAt ?? null;
  return {
    id,
    senderId: sender != null ? String(sender) : null,
    receiverId: receiver != null ? String(receiver) : null,
    content,
    timestamp,
  };
}

/** Optimistic mesaj cache key */
function makeLocalKey(senderId, receiverId, content, timestamp) {
  return `${senderId || ''}|${receiverId || ''}|${content}|${timestamp || ''}`;
}

function MainMenu({ kullanici, onLogout }) {
  /* ------------------------------------------------------------------
   * State
   * ---------------------------------------------------------------- */
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null); // {kullaniciId, ...}
  const [mesajlar, setMesajlar] = useState([]);       // aktif sohbet mesajları
  const [mesaj, setMesaj] = useState('');
  const [modalAcik, setModalAcik] = useState(false);  // Ayarlar modalı
  const [bildirimModalAcik, setBildirimModalAcik] = useState(false); // Bekleyen istekler modalı
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

  // WS durumu
  const [wsConnected, setWsConnected] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const stompClientRef = useRef(null);
  const aktifAliciIdRef = useRef(null); // STOMP callback'lerinde aktif alıcıyı yakalamak için
  const localMsgCacheRef = useRef(new Set()); // dupe önleme

  // Aktif alıcı ref eşitle
  useEffect(() => {
    aktifAliciIdRef.current = aktifAlici?.kullaniciId ?? null;
  }, [aktifAlici]);

  const bildirimSayisi = bekleyenIstekler.length;

  /* ------------------------------------------------------------------
   * Auth Header + Fetch helper
   * ---------------------------------------------------------------- */
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...(options.headers || {}), ...getAuthHeaders() };
      return fetch(url, { ...options, headers });
    },
    [getAuthHeaders]
  );

  /* ------------------------------------------------------------------
   * Yardımcılar
   * ---------------------------------------------------------------- */
  function buildImageUrl(path) {
    if (!path || typeof path !== 'string') return DEFAULT_AVATAR;
    const p = path.trim();
    if (!p) return DEFAULT_AVATAR;
    if (p.startsWith('data:')) return p;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    const rel = p.startsWith('/') ? p : `/${p}`;
    return `${API_BASE}${rel}`;
  }

  const formatZaman = (iso) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const myIdStr = String(kullanici?.id ?? '');

  /* ------------------------------------------------------------------
   * Data yükleyiciler
   * ---------------------------------------------------------------- */
  const loadArkadaslar = useCallback(async () => {
    if (!kullanici?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/api/arkadas/liste?kullaniciId=${kullanici.id}`);
      if (res.ok) {
        const data = await res.json();
        setArkadaslar(data);
      } else {
        console.error('Arkadaş listesi alınamadı. Status:', res.status);
      }
    } catch (err) {
      console.error('Arkadaş listesi hatası:', err);
    }
  }, [kullanici, authFetch]);

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

  const loadMesajlar = useCallback(async (aliciId) => {
    if (!aliciId) {
      setMesajlar([]);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/api/mesajlar?aliciId=${aliciId}`);
      if (res.ok) {
        const data = await res.json();
        const norm = Array.isArray(data) ? data.map(normalizeMsg) : [];
        setMesajlar(norm);
        const cache = new Set();
        norm.forEach((m) => cache.add(makeLocalKey(m.senderId, m.receiverId, m.content, m.timestamp)));
        localMsgCacheRef.current = cache;
      } else {
        console.error('Mesajlar alınamadı. Status:', res.status);
        setMesajlar([]);
      }
    } catch (err) {
      console.error('Mesajlar çekilirken hata:', err);
      setMesajlar([]);
    }
  }, [authFetch]);

  /* İlk yükleme */
  useEffect(() => {
    loadArkadaslar();
    loadBekleyenIstekler();
  }, [kullanici, loadArkadaslar, loadBekleyenIstekler]);

  /* Aktif alıcı değişince mesajlar */
  useEffect(() => {
    if (aktifAlici) {
      loadMesajlar(aktifAlici.kullaniciId);
    } else {
      setMesajlar([]);
      localMsgCacheRef.current = new Set();
    }
  }, [aktifAlici, loadMesajlar]);

  /* Mesajlar değişince otomatik scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  /* ------------------------------------------------------------------
   * WebSocket / STOMP
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!kullanici?.id) return; // login yoksa bağlanma

    const token = localStorage.getItem('token');

    // Önce eski client'ı kapat
    if (stompClientRef.current) {
      try { stompClientRef.current.deactivate(); } catch (_) {}
      stompClientRef.current = null;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      debug: (str) => console.log('[STOMP]', str),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    client.onConnect = () => {
      console.log('WebSocket bağlantısı kuruldu');
      setWsConnected(true);

      // Kullanıcıya özel mesajlar
      client.subscribe(STOMP_SUB_USER, (frame) => {
        try {
          const body = JSON.parse(frame.body);
          const msg = normalizeMsg(body);
          const aktifId = aktifAliciIdRef.current ? String(aktifAliciIdRef.current) : null;
          const myIdStr = String(kullanici.id);

          const isForActive =
            aktifId && (
              msg.senderId === aktifId ||
              msg.receiverId === aktifId ||
              (msg.senderId === myIdStr && msg.receiverId === aktifId) ||
              (msg.senderId === aktifId && msg.receiverId === myIdStr)
            );

          const key = makeLocalKey(msg.senderId, msg.receiverId, msg.content, msg.timestamp);
          if (!localMsgCacheRef.current.has(key)) {
            localMsgCacheRef.current.add(key);
            if (isForActive) {
              setMesajlar((prev) => [...prev, msg]);
            }
          }
        } catch (e) {
          console.error('WS mesaj parse hatası:', e);
        }
      });

      // (Opsiyonel) Genel kanal
      client.subscribe(STOMP_SUB_PUBLIC, (frame) => {
        try {
          const body = JSON.parse(frame.body);
          const msg = normalizeMsg(body);
          console.log('Genel kanal mesajı:', msg);
        } catch (e) {
          console.error('Public WS parse hatası:', e);
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
      try { client.deactivate(); } catch (_) {}
      stompClientRef.current = null;
      setWsConnected(false);
    };
  }, [kullanici?.id]);

  /* ------------------------------------------------------------------
   * Mesaj Gönderme
   * ---------------------------------------------------------------- */
  const sendMessageWS = useCallback((payload) => {
    const client = stompClientRef.current;
    if (!client || !wsConnected) return false;
    try {
      client.publish({ destination: STOMP_DEST_SEND, body: JSON.stringify(payload) });
      return true;
    } catch (err) {
      console.error('WS publish hatası:', err);
      return false;
    }
  }, [wsConnected]);

  const handleMesajGonder = useCallback(async () => {
    if (!mesaj.trim() || !aktifAlici || !kullanici?.id) return;

    const nowIso = new Date().toISOString();
    const payload = {
      senderId: Number(kullanici.id), // server principal doğrulayacak
      receiverId: Number(aktifAlici.kullaniciId),
      content: mesaj.trim(),
      timestamp: nowIso,
    };

    // Optimistic local msg
    const localMsg = {
      ...payload,
      senderId: String(payload.senderId),
      receiverId: String(payload.receiverId),
      id: `tmp-${Date.now()}`,
    };

    const key = makeLocalKey(localMsg.senderId, localMsg.receiverId, localMsg.content, localMsg.timestamp);

    // WS dene
    const wsOk = sendMessageWS(payload);

    // Optimistic UI
    setMesajlar((prev) => [...prev, localMsg]);
    localMsgCacheRef.current.add(key);
    setMesaj('');

    if (wsOk) return; // Sunucudan gerçek mesaj gelirse dupe filtre yakalar

    // REST fallback
    try {
      const res = await authFetch(`${API_BASE}/api/mesajlar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = normalizeMsg(await res.json());
        const savedKey = makeLocalKey(saved.senderId, saved.receiverId, saved.content, saved.timestamp);
        if (!localMsgCacheRef.current.has(savedKey)) {
          localMsgCacheRef.current.add(savedKey);
          setMesajlar((prev) => [...prev, saved]);
        }
      } else {
        console.error('Mesaj gönderilemedi. Status:', res.status);
        alert('Mesaj gönderilemedi.');
      }
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
      alert('Mesaj gönderilemedi, hata oluştu.');
    }
  }, [mesaj, aktifAlici, kullanici, sendMessageWS, authFetch]);

  /* ------------------------------------------------------------------
   * Arkadaşlık İşlemleri
   * ---------------------------------------------------------------- */
  const handleYeniArkadasEkle = useCallback(async () => {
    if (!yeniArkadasAdi.trim()) return;
    try {
      const res = await authFetch(`${API_BASE}/api/arkadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleIstegiGuncelle = useCallback(async (istekId, yeniDurum) => {
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
  }, [authFetch, loadArkadaslar]);

  /* ------------------------------------------------------------------
   * Arkadaş listesi filtreleme
   * ---------------------------------------------------------------- */
  const filteredArkadaslar = useMemo(() => {
    const term = aramaTerimi.toLowerCase();
    return arkadaslar.filter((a) =>
      `${a.isim ?? ''} ${a.soyisim ?? ''}`.toLowerCase().includes(term) || a.kullaniciAdi.toLowerCase().includes(term)
    );
  }, [arkadaslar, aramaTerimi]);

  /* ------------------------------------------------------------------
   * Profil Foto Dosya Seçimi
   * ---------------------------------------------------------------- */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilFotoUrl(reader.result);
    reader.readAsDataURL(file);
  };

  /* ------------------------------------------------------------------
   * Profil / Ayar Kaydet
   * ---------------------------------------------------------------- */
  const handleAyarKaydet = useCallback(async (e) => {
    e.preventDefault();
    if (!kullanici?.id) return;

    let profilFotoUploadUrl = kullanici.profilFotoUrl;

    try {
      // Fotoğraf yükle
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

          // Sidebar'daki arkadaş listesinde kendi kaydını güncelle (isteğe bağlı)
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
  }, [profilFotoFile, kullanici, isim, soyisim, kullaniciAdi, sifre, mail, authFetch]);

  /* ------------------------------------------------------------------
   * Image fallback
   * ---------------------------------------------------------------- */
  const handleImageError = (e) => {
    if (e.currentTarget.src !== DEFAULT_AVATAR) {
      e.currentTarget.src = DEFAULT_AVATAR;
    }
  };

  /* ------------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */
  return (
    <div className={styles.mainContainer}>
      {/* -------------------------------------------------------------- */}
      {/* SOL SİDEBAR */}
      {/* -------------------------------------------------------------- */}
      <div className={styles.sidebar}>
        <input
          type="text"
          placeholder="  Ara..."
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
              <img
                src={buildImageUrl(arkadas.profilFotoUrl)}
                alt="Profil"
                className={styles.userAvatar}
                onError={handleImageError}
              />
              {arkadas.isim && arkadas.soyisim ? `${arkadas.isim} ${arkadas.soyisim}` : arkadas.kullaniciAdi}
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

      {/* -------------------------------------------------------------- */}
      {/* SAĞ CHAT ALANI */}
      {/* -------------------------------------------------------------- */}
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
              return (
                <div
                  key={msg.id ?? index}
                  className={`${styles.message} ${fromMe ? styles.fromMe : styles.fromThem}`}
                >
                  <div>{msg.content}</div>
                  <div className={styles.messageTime}>{formatZaman(msg.timestamp)}</div>
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

      {/* -------------------------------------------------------------- */}
      {/* Ayarlar Modal */}
      {/* -------------------------------------------------------------- */}
      {modalAcik && (
        <div className={styles.modalOverlay} onClick={() => setModalAcik(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            /* Inline fallback: CSS override edilmezse bile taşma olmasın */
            style={{ maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}
          >
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

              <label htmlFor="ayar-isim">İsim</label>
              <input id="ayar-isim" value={isim} onChange={(e) => setIsim(e.target.value)} />

              <label htmlFor="ayar-soyisim">Soyisim</label>
              <input id="ayar-soyisim" value={soyisim} onChange={(e) => setSoyisim(e.target.value)} />

              <label htmlFor="ayar-kadi">Kullanıcı Adı</label>
              <input id="ayar-kadi" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} />

              <label htmlFor="ayar-sifre">Şifre (boş bırakılırsa değişmez)</label>
              <input id="ayar-sifre" type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} />

              <label htmlFor="ayar-mail">Mail</label>
              <input id="ayar-mail" value={mail} onChange={(e) => setMail(e.target.value)} />

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

      {/* -------------------------------------------------------------- */}
      {/* Bildirim Modal */}
      {/* -------------------------------------------------------------- */}
      {bildirimModalAcik && (
        <div className={styles.modalOverlay} onClick={() => setBildirimModalAcik(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h2>Bekleyen Arkadaşlık İstekleri</h2>
            {bekleyenIstekler.length === 0 && <p>Yeni arkadaşlık isteğiniz yok.</p>}
            <ul className={styles.requestList}>
              {bekleyenIstekler.map((istek) => (
                <li key={istek.istekId} className={styles.requestItem}>
                  <span>
                    {istek.gonderenAdi ?? istek.kullaniciAdi ?? istek.gonderenKullaniciAdi ?? 'Bilinmiyor'}
                  </span>
                  <div>
                    <button
                      type="button"
                      className={styles.acceptButton}
                      onClick={() => handleIstegiGuncelle(istek.istekId, 1)}
                    >
                      Kabul Et
                    </button>
                    <button
                      type="button"
                      className={styles.rejectButton}
                      onClick={() => handleIstegiGuncelle(istek.istekId, 2)}
                    >
                      Reddet
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
