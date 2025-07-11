// MainMenu.js
import React from 'react';

function MainMenu({ kullanici }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Merhaba, {kullanici?.isim || kullanici?.kullaniciAdi}!</h1>
      <p>Web tabanlı chat uygulamasına hoş geldiniz.</p>

      <ul>
        <li><button>Sohbet Başlat</button></li>
        <li><button>Profilim</button></li>
        <li><button>Çıkış Yap</button></li>
      </ul>
    </div>
  );
}

export default MainMenu;
