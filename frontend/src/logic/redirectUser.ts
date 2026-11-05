import router from '../router'

// Función auxiliar para decodificar el payload de un JWT de forma segura
const decodificarToken = (token: string): any => {
  try {
    // El payload es la segunda parte del token (separada por puntos)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null;
  }
}

export const redireccionarUsuario = () => {
  // 1. Ahora leemos únicamente el token
  const userToken = localStorage.getItem('userToken');
  
  if (userToken) {
    // 2. Decodificamos el payload para obtener los datos del usuario
    const datosUsuario = decodificarToken(userToken);
    
    // Asegúrate de que tu backend guarde 'tipo_id' dentro del token (ej: req.user.tipo_id)
    if (!datosUsuario || !datosUsuario.tipo_id) {
      router.push('/');
      return;
    }

    let openSession: string;
    
    // 3. Evaluamos el tipo_id extraído del token
    switch (datosUsuario.tipo_id) {
      case 1:
        openSession = '/management';
        break;
      case 2:
        openSession = '/dashboard';
        break;
      case 3:
        openSession = '/supervisor';
        break;
      case 4:
        openSession = '/jefe';
        break;
      case 6:
        openSession = '/external';
        break;
      default:
        openSession = '/';
        break;
    }
    
    router.push(openSession);
  }
}
