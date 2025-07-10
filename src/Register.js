import React from 'react';
import './Register.css';

function Register({ toggleForm }) {
  return (
    <div className="wrapper fadeInDown">
      <div id="formContent">
        <h2 className="inactive underlineHover" onClick={toggleForm} style={{cursor: 'pointer'}}> Giriş Yap </h2>
        <h2 className="active">
          Kayıt Ol
        </h2>


        <form>
          <input
            type="text"
            id="login"
            className="fadeIn second"
            name="login"
            placeholder="Kullanıcı Adı"
          />
          <input
            type="text"
            id="login"
            className="fadeIn second"
            name="login"
            placeholder="İsim"
          />
          <input
            type="text"
            id="login"
            className="fadeIn second"
            name="login"
            placeholder="Soyisim"
          />
          <input
            type="password"
            id="password"
            className="fadeIn third"
            name="password"
            placeholder="Şifre"
          />
          <input
            type="submit"
            className="fadeIn fourth"
            value="Kayıt Ol"
          />
        </form>
      </div>
    </div>
  );
}

export default Register;
