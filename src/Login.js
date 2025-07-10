import React from 'react';
import './Login.css';

function Login({ toggleForm }) {
  return (
    <div className="wrapper fadeInDown">
      <div id="formContent">
        <h2 className="active"> Giriş Yap </h2>
        <h2 className="inactive underlineHover" onClick={toggleForm} style={{cursor: 'pointer'}}>
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
            type="password"
            id="password"
            className="fadeIn third"
            name="password"
            placeholder="Şifre"
          />
          <input
            type="submit"
            className="fadeIn fourth"
            value="Giriş Yap"
          />
        </form>

        <div id="formFooter">
          <a className="underlineHover" href="#">Şifremi Unuttum?</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
