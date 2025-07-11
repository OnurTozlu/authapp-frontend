import React, { useEffect, useState } from "react";
import "./ChatApp.css";

export default function ChatApp() {
  const [users, setUsers] = useState([]); // Arkadaş listesi
  const [currentUser, setCurrentUser] = useState(null); // Aktif kullanıcı (örneğin login kullanıcısı)
  const [selectedUser, setSelectedUser] = useState(null); // Sohbet edilen kişi
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Örnek: Kullanıcı verisini backend'den çek (kendi api endpoint'ini kullan)
  useEffect(() => {
    fetch("/api/currentUser")
      .then((res) => res.json())
      .then((data) => {
        setCurrentUser(data);
      });

    fetch("/api/users") // Arkadaş listesi API çağrısı
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        if (data.length > 0) setSelectedUser(data[0]);
      });
  }, []);

  // Seçilen kullanıcı değişince mesajları çek
  useEffect(() => {
    if (selectedUser) {
      fetch(`/api/messages?withUserId=${selectedUser.id}`)
        .then((res) => res.json())
        .then((data) => setMessages(data));
    }
  }, [selectedUser]);

  function handleSendMessage() {
    if (!newMessage.trim()) return;

    // Backend'e POST ile gönderip onay alınca state'i güncelle
    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: selectedUser.id,
        text: newMessage.trim(),
      }),
    })
      .then((res) => res.json())
      .then((savedMessage) => {
        setMessages((prev) => [...prev, savedMessage]);
        setNewMessage("");
      });
  }

  function handleKeyPress(e) {
    if (e.key === "Enter") handleSendMessage();
  }

  if (!currentUser) return <div>Yükleniyor...</div>;

  return (
    <div className="chat-container">
      <div className="sidebar">
        <button className="search-button">ARAMA</button>

        <div className="user-list">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`user-btn ${selectedUser?.id === user.id ? "selected" : ""}`}
            >
              <img
                src={user.profilePic}
                alt={user.name}
                className="user-profile-pic"
              />
              {user.name}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <img
            className="sidebar-profile-pic"
            src={currentUser.profilePic}
            alt={currentUser.name}
          />
          <div className="sidebar-username">{currentUser.name}</div>
          <button className="settings-btn">Ayarlar</button>
        </div>
      </div>

      <div className="main-chat">
        {selectedUser && (
          <>
            <div className="chat-header">
              <img
                className="chat-user-pic"
                src={selectedUser.profilePic}
                alt={selectedUser.name}
              />
              <div className="chat-user-name">{selectedUser.name}</div>
            </div>

            <div className="messages-area">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-box ${
                    msg.fromUserId === currentUser.id ? "from-me" : "from-them"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                placeholder="Sohbet Yazı alanı"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button className="send-btn" onClick={handleSendMessage} aria-label="Gönder">
                &#9658;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
