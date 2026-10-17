import router from '../router'

export const redireccionarUsuario = () => {
  const userSession = localStorage.getItem('userSession')
  if (userSession) {
    const session = JSON.parse(userSession)
    let openSession: string;
    switch (session.tipo_id) {
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
        openSession = '/'
        break;
    }
    router.push(openSession)
  }
}
