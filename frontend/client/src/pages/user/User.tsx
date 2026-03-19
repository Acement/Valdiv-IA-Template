import { useEffect, useState } from 'react';

interface UserInfo {
  userAgent: string;
  language: string;
  timezone: string;
  currentTime: string;
  screen: string;
  ip?: string;
}

const User: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    userAgent: '',
    language: '',
    timezone: '',
    currentTime: '',
    screen: ''
  });

  useEffect(() => {
    // Info del navegador
    const info: UserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentTime: new Date().toString(),
      screen: `${window.innerWidth} x ${window.innerHeight}`
    };

    // Obtener IP del backend y combinarla con la info
    fetch("http://localhost:3000/api/get-ip")
      .then(res => res.json())
      .then(data => {
        const infoCompleta = { ...info, ip: data.ip };
        setUserInfo(infoCompleta);
        console.log("Información completa del usuario:", infoCompleta);
      })
      .catch(err => {
        console.error("Error al obtener la IP:", err);
        setUserInfo(info); // si falla, al menos mostramos info del navegador
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Hola</h1>
      <h2>Información completa del usuario:</h2>
      <pre>{JSON.stringify(userInfo, null, 2)}</pre>
    </div>
  );
};

export default User;
