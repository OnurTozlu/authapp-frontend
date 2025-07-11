import React, { useState, useEffect, useRef } from 'react';
import styles from './MainMenu.module.css';

function MainMenu({ kullanici }) {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [aktifAlici, setAktifAlici] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [mesaj, setMesaj] = useState('');

  const messagesEndRef = useRef(null);

  // Örnek arkadaş verisi
  useEffect(() => {
    setArkadaslar([
      { id: 1, kullaniciAdi: 'ozan', isim: 'Ozan K.' },
      { id: 2, kullaniciAdi: 'ayse', isim: 'Ayşe G.' },
      { id: 3, kullaniciAdi: 'mehmet', isim: 'Mehmet T.' }
    ]);
  }, []);

  // Scroll son mesaja otomatik inme
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajlar]);

  // Mesaj gönderme fonksiyonu
  const handleMesajGonder = () => {
    if (!mesaj.trim() || !aktifAlici) return;

    const yeniMesaj = {
      id: Date.now(),
      gonderen: kullanici.kullaniciAdi,
      alici: aktifAlici.kullaniciAdi,
      icerik: mesaj,
      zaman: new Date().toLocaleTimeString(),
      avatar: kullanici.avatar || null
    };

    setMesajlar(prev => [...prev, yeniMesaj]);
    setMesaj('');
  };

  return (
    <div className={styles.container}>
      {/* Sol Menü - Arkadaş Listesi */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>Arkadaşlar</div>
        <ul className={styles.friendList}>
          {arkadaslar.map(a => (
            <li
              key={a.id}
              className={`${styles.friendItem} ${aktifAlici?.id === a.id ? styles.activeFriend : ''}`}
              onClick={() => setAktifAlici(a)}
              title={a.isim}
            >
              <div className={styles.friendAvatar}>
                {a.kullaniciAdi.charAt(0).toUpperCase()}
              </div>
              <span className={styles.friendName}>{a.kullaniciAdi}</span>
            </li>
          ))}
        </ul>
      </nav>

      {/* Ana Chat Alanı */}
      <main className={styles.chatArea}>
        {/* Chat Header */}
        <header className={styles.chatHeader}>
          {aktifAlici ? (
            <>
              <div className={styles.chatUserAvatar}>
                {aktifAlici.kullaniciAdi.charAt(0).toUpperCase()}
              </div>
              <div className={styles.chatUserName}>{aktifAlici.kullaniciAdi}</div>
            </>
          ) : (
            <div className={styles.noChatSelected}>Bir arkadaş seçin</div>
          )}
        </header>

        {/* Mesajlar */}
        <section className={styles.chatMessages}>
          {aktifAlici ? (
            mesajlar
              .filter(m => m.alici === aktifAlici.kullaniciAdi || m.gonderen === aktifAlici.kullaniciAdi)
              .map(m => {
                const sent = m.gonderen === kullanici.kullaniciAdi;
                return (
                  <div
                    key={m.id}
                    className={`${styles.message} ${sent ? styles.messageSent : styles.messageReceived}`}
                  >
                    {!sent && (
                      <div className={styles.msgAvatar}>
                        {m.gonderen.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles.msgContent}>
                      <div className={styles.msgText}>{m.icerik}</div>
                      <div className={styles.msgTime}>{m.zaman}</div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className={styles.noMessages}>Mesajlaşmak için bir arkadaş seçin.</div>
          )}
          <div ref={messagesEndRef} />
        </section>

        {/* Mesaj Gönderme Kutusu */}
        {aktifAlici && (
          <footer className={styles.chatInputArea}>
            <input
              type="text"
              placeholder="Mesaj yaz..."
              value={mesaj}
              onChange={e => setMesaj(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMesajGonder()}
              className={styles.chatInput}
              autoFocus
            />
            <button onClick={handleMesajGonder} className={styles.sendButton}>Gönder</button>
          </footer>
        )}
      </main>
    </div>
  );
}

export default MainMenu;
