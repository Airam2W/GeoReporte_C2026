import router from '../router'

export const redireccionarUsuario = () => {
  const adminSession = localStorage.getItem('adminSession')
  if (adminSession) {
    const session = JSON.parse(adminSession)
    let openSession: string;
    switch (session.tipo_id) {
      case 1:
        openSession = '/management';
        break;
      case 2:
        openSession = '/dashboard';
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
