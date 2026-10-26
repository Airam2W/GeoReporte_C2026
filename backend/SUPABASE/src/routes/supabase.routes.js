
import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'

const router = Router()

// ----------------------------------------- FUNCIONES AUXILIARES -----------------------------------------
async function validarAutenticacion(user) {
    // Validacion de Autenticacion del Usuario

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Validacion que el correo exista en la base de datos en la tabla "usuarios" columna 'correo'
    // Si existe retorna True, si no existe retorna False
    const correoExistente = async (correo) => {
        const { data, error } = await supabase.from('usuarios').select('correo').eq('correo', correo).maybeSingle();
        if (error) {
            console.log('Error al consultar la base de datos para validar el correo del usuario:', error);
            return false;
        }
        return data ? true : false;
    };
    // Validacion en la base de datos que el usuario este de 'Alta' en la tabla "usuarios" columna 'estadoadministrativo' text 'Alta'
    const altaExistente = async (correo) => {
        const { data, error } = await supabase.from('usuarios').select('estadoadministrativo').eq('correo', correo).maybeSingle();
        if (error) {
            console.log('Error al consultar la base de datos para validar el estado administrativo del usuario:', error);
            return false;
        }
        return data && data.estadoadministrativo === 'Alta' ? true : false;
    }

    if (!user || typeof user !== 'object' || !user.correo || typeof user.correo !== 'string' ||
        user.estado !== "Alta" || !regexCorreo.test(user.correo) ||
        !correoExistente(user.correo) || !altaExistente(user.correo)
    ) {
        console.log('Usuario no autenticado o estado inválido:', user, user ? user.estado : 'undefined');
        return false;
    }
    return true;
}

async function validarAutorizacion(user, rolesPermitidos) {
    // 1. Validar primero si el objeto user existe y es un objeto válido
    if (!user || typeof user !== 'object') {
        console.log('Acceso denegado: El usuario no está definido o no es válido.');
        return false;
    }

    // 2. Validar que tenga el tipo_id y esté dentro de los roles permitidos
    if (!user.tipo_id || !rolesPermitidos.includes(user.tipo_id)) {
        console.log('Acceso no autorizado para el usuario:', user, 'Tipo ID:', user.tipo_id);
        return false;
    }

    // 3. Validar que el usuario tenga el rol permitido en la base de datos
    // En la base de datos, en la tabla "usuarios", columna "tipousuario_id" debe coincidir con user.tipo_id
    const validarRolEnBaseDeDatos = async (correo, tipo_id) => {
        const { data, error } = await supabase.from('usuarios').select('tipousuario_id').eq('correo', correo).maybeSingle();
        if (error) {
            console.log('Error al consultar la base de datos para validar el rol del usuario:', error);
            return false;
        }
        return data && data.tipousuario_id === tipo_id ? true : false;
    };

    if (!await validarRolEnBaseDeDatos(user.correo, user.tipo_id)) {
        console.log('Acceso no autorizado para el usuario:', user);
        return false;
    }

    return true;
}

// ----------------------------------------- ENDPOINTS -----------------------------------------

// (obtenerDepartamentosinternosPorNombre)
router.post('/obtener/departamentos_internos/nombre', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string

    // Valor nulo o vacio
    if (!valor || valor.length === 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado. Por favor, ingresa un valor válido.'
        });
    }

    // Valor no es un string
    if (typeof valor !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no es un string:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Escribe un nombre de departamento válido.'
        });
    }

    // Valor ya existe en la base de datos
    const existingResult = await supabase.from('departamentos').select('id').ilike('nombre', valor)
    if (existingResult.data && existingResult.data.length > 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda ya existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El departamento que estás creando ya existe en la base de datos.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('departamentos').select(['id', 'nombre'].join(',')).ilike('nombre', valor)
    responder(res, result)
})



// (obtenerDepartamentosExternosPorNombre)
router.post('/obtener/departamentos_externos/nombre', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string
    if (!valor || valor.length === 0) {// Valor es nulo?
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado. Por favor, ingresa un valor válido.'
        });
    }

    if (typeof valor !== 'string') {// Valor es un string?
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no es un string:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Escribe un nombre de departamento válido.'
        });
    }

    // Valor ya existe en la base de datos
    const existingResult = await supabase.from('departamentos_externos').select('id').ilike('departamento', valor)
    if (existingResult.data && existingResult.data.length > 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda ya existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El departamento que estás creando ya existe en la base de datos.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('departamentos_externos').select(['id', 'departamento'].join(',')).ilike('departamento', valor)
    responder(res, result)
})



// (obtenerProblematicasInternasPorNombre)
router.post('/obtener/problematicas_internas/nombre', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string

    // Valor nulo o vacio
    if (!valor || valor.length === 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado. Por favor, ingresa un valor válido.'
        });
    }

    // Valor no es un string
    if (typeof valor !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no es un string:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Escribe un nombre de departamento válido.'
        });
    }

    // Valor ya existe en la base de datos
    const existingResult = await supabase.from('problemas').select('id').ilike('nombre', valor)
    if (existingResult.data && existingResult.data.length > 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda ya existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El departamento que estás creando ya existe en la base de datos.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('problemas').select(['id', 'nombre'].join(',')).ilike('nombre', valor)
    responder(res, result)
})



// (obtenerProblematicasExternasPorNombre)
router.post('/obtener/problematicas_externas/nombre', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string
    if (!valor || valor.length === 0) {// Valor es nulo?
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado. Por favor, ingresa un valor válido.'
        });
    }

    if (typeof valor !== 'string') {// Valor es un string?
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no es un string:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Escribe un nombre de departamento válido.'
        });
    }

    // Valor ya existe en la base de datos
    const existingResult = await supabase.from('problemas_externos').select('id').ilike('nombre', valor)
    if (existingResult.data && existingResult.data.length > 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda ya existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El departamento que estás creando ya existe en la base de datos.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('problemas_externos').select(['id', 'nombre'].join(',')).ilike('nombre', valor)
    responder(res, result)
})



// (obtenerProblematicasInternasPorID)
router.post('/obtener/problematicas_internas/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('problemas').select(['id', 'nombre', 'estado'].join(',')).eq('departamento_id', valor)
    responder(res, result)
})




// (obtenerProblematicasExternasPorID)
router.post('/obtener/problematicas_externas/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('problemas_externos').select(['id', 'nombre', 'estado', 'nombreamigable', 'departamento_externo_id'].join(',')).eq('departamento_externo_id', valor)
    responder(res, result)
})

// (obtenerDepartamentosExternosPorID)
router.post('/obtener/departamentos_externos/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('departamentos_externos').select(['id', 'departamento'].join(',')).eq('id', valor)
    responder(res, result)
})

// (obtenerDepartamentosInternosPorID)
router.post('/obtener/departamentos_internos/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('departamentos').select(['id', 'nombre'].join(',')).eq('id', valor)
    responder(res, result)
})



// (obtenerAdministradoresInternosPorID)
router.post('/obtener/administradores_internos/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('administradores').select(['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'].join(',')).eq('departamento_id', valor)
    responder(res, result)
})



// (obtenerAdministradoresExternosPorID)
router.post('/obtener/administradores_externos/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('personal_externo').select(['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'].join(',')).eq('dep_externo_id', valor)
    responder(res, result)
})



// (obtenerCorreoUnico)
router.post('/obtener/usuarios/correoUnico', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string
    if (!valor || typeof valor !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Correo ya existe en la base de datos
    const existingResult = await supabase.from('usuarios').select('id').eq('correo', valor)
    if (existingResult.data && existingResult.data.length > 0) {
        // Error para depuracion en el log del servidor
        console.log('Correo ya existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El correo que estás ingresando ya existe.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('usuarios').select(['id','nombre','apellido_p','apellido_m','correo', 'estadoadministrativo', 'tipousuario_id','fechaalta','fechabaja'].join(',')).eq('correo', valor).maybeSingle()
    responder(res, result)
})



// (obtenerUsuarioPorCorreoYContrasena)
router.post('/obtener/usuarios/CorreoContrasena', async (req, res) => {
    const valor = req.body;

    // Validacion de datos
    // valor = { correo: string, contrasena: string }
    if (!valor || typeof valor !== 'object' || !valor.p_correo || !valor.p_contrasena) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Validacion de formato de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(valor.p_correo)) {
        // Error para depuracion en el log del servidor
        console.log('Formato de correo inválido:', valor.p_correo);
        return res.status(400).json({
            // Error para el usuario
            error: 'El formato del correo es inválido. Por favor, ingresa un correo válido.'
        });
    }

    // Valor.contrasena debe tener al menos 6 caracteres
    if (valor.p_contrasena.length < 6) {
        // Error para depuracion en el log del servidor
        console.log('La contraseña debe tener al menos 6 caracteres:', valor.p_contrasena);
        return res.status(400).json({
            // Error para el usuario
            error: 'La contraseña debe tener al menos 6 caracteres. Por favor, ingresa una contraseña válida.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.rpc('login_usuario', valor)
    responder(res, result)
})

// (guardarUsuario)
router.post('/guardar/usuario', async (req, res) => {
    const { data, user } = req.body;
    const { p_id, p_nombre, p_apellido_p, p_apellido_m, p_correo, p_contrasena, p_tipousuario_id, p_departamento_id, p_estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    {
      p_id: esEdicion ? formData.id : null, <-- es (number || null)
      p_nombre: formData.nombre, <-- es (string)
      p_apellido_p: formData.apellido_p, <-- es (string)
      p_apellido_m: formData.apellido_m || null, <-- es (string || null)
      p_correo: formData.correo, <-- es (string y correo valido)
      p_contrasena: formData.contrasena || null, <-- es (string || null)
      p_tipousuario_id: parseInt(formData.tipousuario_id), <-- es (number)
      p_departamento_id: formData.departamento_id ? parseInt(formData.departamento_id) : null, <-- es (number || null)
      p_estado: formData.estadoadministrativo || 'Alta', <-- es (string && ('Alta' || 'Baja'))
    }
      */

    // Validacion de cada campo
    if (p_id !== null && typeof p_id !== 'number') {
        console.log('ID inválido:', p_id);
        return res.status(400).json({ error: 'ID inválido. Debe ser un número o null.' });
    }
    // Validacion de nombre
    if (!p_nombre || typeof p_nombre !== 'string') {
        console.log('Nombre inválido:', p_nombre);
        return res.status(400).json({ error: 'Nombre inválido. Debe ser un string.' });
    }
    // Validacion de apellido_p
    if (!p_apellido_p || typeof p_apellido_p !== 'string') {
        console.log('Apellido Paterno inválido:', p_apellido_p);
        return res.status(400).json({ error: 'Apellido Paterno inválido. Debe ser un string.' });
    }
    // Validacion de apellido_m
    if (p_apellido_m !== null && typeof p_apellido_m !== 'string') {
        console.log('Apellido Materno inválido:', p_apellido_m);
        return res.status(400).json({ error: 'Apellido Materno inválido. Debe ser un string o null.' });
    }
    // Validacion de correo
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!p_correo || typeof p_correo !== 'string' || !correoRegex.test(p_correo)) {
        console.log('Correo inválido:', p_correo);
        return res.status(400).json({ error: 'Correo inválido. Debe ser un string con formato de correo válido.' });
    }
    // Validacion de contrasena
    if (p_contrasena !== null && (typeof p_contrasena !== 'string' || p_contrasena.length < 6)) {
        console.log('Contraseña inválida:', p_contrasena);
        return res.status(400).json({ error: 'Contraseña inválida. Debe ser un string con al menos 6 caracteres o null.' });
    }
    // Validacion de tipousuario_id
    if (typeof p_tipousuario_id !== 'number') {
        console.log('Tipo de usuario ID inválido:', p_tipousuario_id);
        return res.status(400).json({ error: 'Tipo de usuario ID inválido. Debe ser un número.' });
    }
    // Validacion de departamento_id
    if (p_departamento_id !== null && typeof p_departamento_id !== 'number') {
        console.log('Departamento ID inválido:', p_departamento_id);
        return res.status(400).json({ error: 'Departamento ID inválido. Debe ser un número o null.' });
    }
    // Validacion de estado
    if (!p_estado || (p_estado !== 'Alta' && p_estado !== 'Baja')) {
        console.log('Estado inválido:', p_estado);
        return res.status(400).json({ error: 'Estado inválido. Debe ser "Alta" o "Baja".' });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.rpc('guardar_usuario', data)
    responder(res, result)
})

// (obtenerSupervisorIDPorUsuarioID)
router.post('/obtener/supervisores/usuarioID', async (req, res) => {
    const { valor } = req.body;

    // Validacion de datos
    // valor = string | number

    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('supervisores').select(['id', 'departamento_id'].join(',')).eq('usuario_id', valor)
    responder(res, result)
})

// (obtenerJefeIDPorUsuarioID)
router.post('/obtener/jefes/usuarioID', async (req, res) => {
    const { valor = ['*'] } = req.body;

    // Validacion de datos
    // valor = string | number

    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase.from('jefes').select(['id', 'supervisor_id', 'supervisores(departamento_id)'].join(',')).eq('usuario_id', valor)
    responder(res, result)
})



// (obtenerDepartamentosOrdenadosPorId)
router.get('/obtener/departamentos/ordenadosPorId', async (req, res) => {
    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos')
        .select(['id', 'nombre', 'nombreamigable','estado'].join(','))
        .order('id', { ascending: true })
    responder(res, result)
})



// (obtenerProblemasPorDepartamentoID)
router.post('/obtener/problemas/departamentoId', async (req, res) => {
    const { valor = ['*'] } = req.body;

    // Validacion de datos
    // valor = string | number

    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Si existe el valor = departamento_id en departamentos en columna id
    const existingResult = await supabase.from('departamentos').select('id').eq('id', valor)
    if (!existingResult.data || existingResult.data.length === 0) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El departamento que estás buscando no existe en la base de datos.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas')
        .select(['id', 'nombre', 'nombreamigable', 'departamento_id', 'estado'].join(','))
        .eq('departamento_id', valor)
        .order('id', { ascending: true })
    responder(res, result)
})

// (crearReporte)
router.post('/crear/reporte', async (req, res) => {
    const data = req.body;

    // Validacion de datos
    if (!data || typeof data !== 'object') {
        // Error para depuracion en el log del servidor
        console.log('Datos de reporte no proporcionados o tipo inválido:', data, 'Tipo:', typeof data);
        return res.status(400).json({
            // Error para el usuario
            error: 'Datos de reporte no proporcionados o tipo inválido. Por favor, ingresa datos válidos.'
        });
    }

    /*
    Validaciones por campo del objeto data
    folio: folioGenerado, <---- Sea un string
      departamento_id: form.value.departamento_id, <--- ID existente en la DB
      problema_id: form.value.problema_id, <--- ID existente en la DB
      descripcion: form.value.descripcion.trim(), <--- Sea un string
      nombre: form.value.nombre ? form.value.nombre.trim() : 'Ciudadano Honorable', <--- Sea un string
      telefono: form.value.telefono, <--- Sea un numero, SOLO 10 digitos
      correo: form.value.correo.trim(), <--- Sea un string con formato de correo
      domicilio: form.value.domicilio.trim(), <--- Sea un string
      referencias: form.value.referencias ? form.value.referencias.trim() : null, <--- Sea un string o null
      foto_url: fotoUrlFinal, <--- Sin validacion
    */

    // Validaciones adicionales
    // Folio
    if (!data.folio || typeof data.folio !== 'string') {
        console.log('Folio no proporcionado o tipo inválido:', data.folio, 'Tipo:', typeof data.folio);
        return res.status(400).json({
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Departamento ID
    if (!data.departamento_id || typeof data.departamento_id !== 'number') {
        console.log('Departamento ID no proporcionado o tipo inválido:', data.departamento_id, 'Tipo:', typeof data.departamento_id);
        return res.status(400).json({
            error: 'Departamento ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Problema ID
    if (!data.problema_id || typeof data.problema_id !== 'number') {
        console.log('Problema ID no proporcionado o tipo inválido:', data.problema_id, 'Tipo:', typeof data.problema_id);
        return res.status(400).json({
            error: 'Problema ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Descripcion
    if (!data.descripcion || typeof data.descripcion !== 'string') {
        console.log('Descripcion no proporcionada o tipo inválido:', data.descripcion, 'Tipo:', typeof data.descripcion);
        return res.status(400).json({
            error: 'Descripcion no proporcionada o tipo inválido. Por favor, ingresa una descripcion válida.'
        });
    }
    // Nombre
    if (!data.nombre || typeof data.nombre !== 'string') {
        console.log('Nombre no proporcionado o tipo inválido:', data.nombre, 'Tipo:', typeof data.nombre);
        return res.status(400).json({
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Telefono
    if (!data.telefono || typeof data.telefono !== 'string' || !/^\d{10}$/.test(data.telefono)) {
        console.log('Telefono no proporcionado, tipo inválido o formato incorrecto:', data.telefono, 'Tipo:', typeof data.telefono);
        return res.status(400).json({
            error: 'Telefono no proporcionado, tipo inválido o formato incorrecto. Por favor, ingresa un telefono válido de 10 dígitos.'
        });
    }
    // Correo (Opcional, pero si se proporciona, debe ser un string con formato de correo)
    if (data.correo && (typeof data.correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo))) {
        console.log('Correo tipo inválido o formato incorrecto:', data.correo, 'Tipo:', typeof data.correo);
        return res.status(400).json({
            error: 'Correo tipo inválido o formato incorrecto. Por favor, ingresa un correo válido o déjalo vacío.'
        });
    }
    // Domicilio
    if (!data.domicilio || typeof data.domicilio !== 'string') {
        console.log('Domicilio no proporcionado o tipo inválido:', data.domicilio, 'Tipo:', typeof data.domicilio);
        return res.status(400).json({
            error: 'Domicilio no proporcionado o tipo inválido. Por favor, ingresa un domicilio válido.'
        });
    }
    // Referencias (Opcional, pero si se proporciona, debe ser un string)
    if (data.referencias && typeof data.referencias !== 'string') {
        console.log('Referencias tipo inválido:', data.referencias, 'Tipo:', typeof data.referencias);
        return res.status(400).json({
            error: 'Referencias tipo inválido. Por favor, ingresa referencias válidas o déjalo vacío.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('reportes').insert(data)
    responder(res, result)
})

// (crearDetalleReporte)
router.post('/crear/detalleReporte', async (req, res) => {
    const data = req.body;

    // Validacion de datos
    if (!data || typeof data !== 'object') {
        // Error para depuracion en el log del servidor
        console.log('Datos de detalle de reporte no proporcionados o tipo inválido:', data, 'Tipo:', typeof data);
        return res.status(400).json({
            // Error para el usuario
            error: 'Datos de detalle de reporte no proporcionados o tipo inválido. Por favor, ingresa datos válidos.'
        });
    }

    /*
    Validaciones por campo del objeto data
    {
      folio: folioGenerado, <---- Sea un string
      estado_id: 1, <--- ID existente en la DB
    }
    */

    // Validaciones adicionales
    // Folio
    if (!data.folio || typeof data.folio !== 'string') {
        console.log('Folio no proporcionado o tipo inválido:', data.folio, 'Tipo:', typeof data.folio);
        return res.status(400).json({
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Estado ID
    if (!data.estado_id || typeof data.estado_id !== 'number') {
        console.log('Estado ID no proporcionado o tipo inválido:', data.estado_id, 'Tipo:', typeof data.estado_id);
        return res.status(400).json({
            error: 'Estado ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('detalle_reporte').insert(data)
    responder(res, result)
})

// (crearHistorialReporte)
router.post('/crear/historialReporte', async (req, res) => {
    const { folio, data, user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    Validaciones por campo del objeto data
    {
      categoria_historial_id: 2, // 2 = Rechazo <--- ID existente en la DB & number
      titulo_id: datos.titulo_id, <--- ID existente en la DB & number
      notas: datos.notas, <--- Sea un string
    }
    */
    // Validaciones adicionales
    // Categoria Historial ID
    if (!data.categoria_historial_id || typeof data.categoria_historial_id !== 'number') {
        console.log('Categoria Historial ID no proporcionado o tipo inválido:', data.categoria_historial_id, 'Tipo:', typeof data.categoria_historial_id);
        return res.status(400).json({
            error: 'Categoria Historial ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Titulo ID
    if (!data.titulo_id || typeof data.titulo_id !== 'number') {
        console.log('Titulo ID no proporcionado o tipo inválido:', data.titulo_id, 'Tipo:', typeof data.titulo_id);
        return res.status(400).json({
            error: 'Titulo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Notas
    if (!data.notas || typeof data.notas !== 'string') {
        console.log('Notas no proporcionadas o tipo inválido:', data.notas, 'Tipo:', typeof data.notas);
        return res.status(400).json({
            error: 'Notas no proporcionadas o tipo inválido. Por favor, ingresa notas válidas.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('historial_reporte').insert({ folio, ...data })
    responder(res, result)
})

// (crearHistorialReporteConFoto)
router.post('/crear/historialReporteConFoto', async (req, res) => {
    const { folio, data, user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    Validaciones por campo del objeto data
    {
      folio,
      categoria_historial_id: esFinal ? 3 : 4,
      titulo_id: datos.titulo_id,
      notas: datos.notas,
      foto_url: fotoUrl,
    }
    */
    // Validaciones adicionales
    // Categoria Historial ID
    if (!data.categoria_historial_id || typeof data.categoria_historial_id !== 'number') {
        console.log('Categoria Historial ID no proporcionado o tipo inválido:', data.categoria_historial_id, 'Tipo:', typeof data.categoria_historial_id);
        return res.status(400).json({
            error: 'Categoria Historial ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Titulo ID
    if (!data.titulo_id || typeof data.titulo_id !== 'number') {
        console.log('Titulo ID no proporcionado o tipo inválido:', data.titulo_id, 'Tipo:', typeof data.titulo_id);
        return res.status(400).json({
            error: 'Titulo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Notas
    if (!data.notas || typeof data.notas !== 'string') {
        console.log('Notas no proporcionadas o tipo inválido:', data.notas, 'Tipo:', typeof data.notas);
        return res.status(400).json({
            error: 'Notas no proporcionadas o tipo inválido. Por favor, ingresa notas válidas.'
        });
    }
    // Foto URL
    if (!data.foto_url || typeof data.foto_url !== 'string') {
        console.log('Foto URL no proporcionada o tipo inválido:', data.foto_url, 'Tipo:', typeof data.foto_url);
        return res.status(400).json({
            error: 'Foto URL no proporcionada o tipo inválido. Por favor, ingresa una URL válida.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('historial_reporte').insert({ folio, ...data })
    responder(res, result)
})

// (crearProblemaInterno)
router.post('/crear/problema_interno', async (req, res) => {
    const { data, user } = req.body;
    const { nombre, nombreamigable, departamento_id, estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    {
          nombre: formData.nombre, <--- Sea un string
          nombreamigable: formData.nombreamigable, <--- Sea un string
          departamento_id: formData.departamento_id, <--- ID existente en la DB & number
          estado: 'Alta', <--- Sea un string y debe ser 'Alta'
        }
    */
    // Validaciones adicionales
    // Nombre
    if (!nombre || typeof nombre !== 'string') {
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Nombre Amigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        console.log('Nombre Amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            error: 'Nombre Amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }
    // Departamento ID
    if (!departamento_id || typeof departamento_id !== 'number') {
        console.log('Departamento ID no proporcionado o tipo inválido:', departamento_id, 'Tipo:', typeof departamento_id);
        return res.status(400).json({
            error: 'Departamento ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Estado
    if (!estado || typeof estado !== 'string' || estado !== 'Alta') {
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('problemas').insert(data)
    responder(res, result)
})

// (crearProblemaExterno)
router.post('/crear/problema_externo', async (req, res) => {
    const { data, user } = req.body;
    const { nombre, nombreamigable, departamento_externo_id, estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    {
          nombre: formData.nombre, <--- Sea un string
          nombreamigable: formData.nombreamigable, <--- Sea un string
          departamento_externo_id: formData.departamento_id, <--- ID existente en la DB & number
          estado: 'Alta', <--- Sea un string y debe ser 'Alta'
        }
    */
    // Validaciones adicionales
    // Nombre
    if (!nombre || typeof nombre !== 'string') {
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Nombre Amigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        console.log('Nombre Amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            error: 'Nombre Amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }
    // Departamento Externo ID
    if (!departamento_externo_id || typeof departamento_externo_id !== 'number') {
        console.log('Departamento Externo ID no proporcionado o tipo inválido:', departamento_externo_id, 'Tipo:', typeof departamento_externo_id);
        return res.status(400).json({
            error: 'Departamento Externo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Estado
    if (!estado || typeof estado !== 'string' || estado !== 'Alta') {
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('problemas_externos').insert(data)
    responder(res, result)
})

// (crearDepartamentoInterno)
router.post('/crear/departamento_interno', async (req, res) => {
    const { data, user } = req.body;
    const { nombre, nombreamigable, estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    {
          nombre: formData.nombre, <--- Sea un string
          nombreamigable: formData.nombreamigable, <--- Sea un string
          estado: 'Alta',   <--- Sea un string y debe ser 'Alta'
        }
    */
    // Validaciones adicionales
    // Nombre
    if (!nombre || typeof nombre !== 'string') {
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Nombre Amigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        console.log('Nombre Amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            error: 'Nombre Amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }
    // Estado
    if (!estado || typeof estado !== 'string' || estado !== 'Alta') {
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('departamentos').insert(data)
    responder(res, result)
})

// (crearDepartamentoExterno)
router.post('/crear/departamento_externo', async (req, res) => {
    const { data, user } = req.body;
    const { departamento, estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    /*
    {
          departamento: formData.nombre, <--- Sea un string
          estado: 'Alta',  <--- Sea un string y debe ser 'Alta'
        }
    */
    // Validaciones adicionales
    // Departamento
    if (!departamento || typeof departamento !== 'string') {
        console.log('Departamento no proporcionado o tipo inválido:', departamento, 'Tipo:', typeof departamento);
        return res.status(400).json({
            error: 'Departamento no proporcionado o tipo inválido. Por favor, ingresa un departamento válido.'
        });
    }
    // Estado
    if (!estado || typeof estado !== 'string' || estado !== 'Alta') {
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la insercion a la base de datos
    const result = await supabase.from('departamentos_externos').insert(data)
    responder(res, result)
})

// (eliminarProblemaInterno)
router.delete('/eliminar/problema_interno', async (req, res) => {
    const { id, user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID de problema interno no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID de problema interno no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la eliminacion a la base de datos
    const result = await supabase.from('problemas').delete().eq('id', id)
    responder(res, result)
})

// (eliminarProblemaExterno)
router.delete('/eliminar/problema_externo', async (req, res) => {
    const { id, user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID de problema externo no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID de problema externo no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la eliminacion a la base de datos
    const result = await supabase.from('problemas_externos').delete().eq('id', id)
    responder(res, result)
})

// (eliminarDepartamentoInterno)
router.delete('/eliminar/departamento_interno', async (req, res) => {
    const { id, user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID de departamento interno no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID de departamento interno no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la eliminacion a la base de datos
    const result = await supabase.from('departamentos').delete().eq('id', id)
    responder(res, result)
})

// (eliminarDepartamentoExterno)
router.delete('/eliminar/departamento_externo', async (req, res) => {
    const { id, user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID de departamento externo no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID de departamento externo no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la eliminacion a la base de datos
    const result = await supabase.from('departamentos_externos').delete().eq('id', id)
    responder(res, result)
})



// (obtenerReportePorFolio)
router.post('/obtener/reportes/folio', async (req, res) => {
    const { valor = ['*'] } = req.body;

    // Validacion de datos
    // valor = string
    if (!valor || typeof valor !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Validacion de existencia del folio en la base de datos
    const existingResult = await supabase.from('reportes').select('folio').eq('folio', valor)
    if (!existingResult.data || existingResult.data.length === 0) {
        // Error para depuracion en el log del servidor
        console.log('Folio no existe en la base de datos:', valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'El reporte que estás buscando no existe.'
        });
    }

    // Realización de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'nombre',
            'telefono',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas (nombreamigable)',
            'detalle_reporte ( estado_id, estadoreporte (estado) )',
        ].join(','))
        .eq('folio', valor)
        .single()
    responder(res, result);
});

// (obtenerReportesPorDepartamentoExternoID)
router.post('/obtener/reportes/departamento_externo_Id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'nombre',
            'telefono',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas_externos (id, nombre, nombreamigable)',
            'detalle_reporte (estado_id, estadoreporte (estado), updated_at)',
        ].join(','))
        .eq('departamento_externo_id', valor).order('created_at', { ascending: false })
    responder(res, result)
})

// (obtenerReportesPorDepartamentoInternoID)
router.post('/obtener/reportes/departamento_interno_Id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'nombre',
            'telefono',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas (id, nombre)',
            'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)),jefes(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
            'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))',
        ].join(','))
        .eq('departamento_id', valor).order('created_at', { ascending: false })
    responder(res, result)
})

// (obtenerReportesJefe)
router.post('/obtener/reportes/jefe', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas(id,nombre)',
            'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
            'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))',
        ].join(','))
        .eq('departamento_id', valor).order('created_at', { ascending: false })
    responder(res, result)
})

// (obtenerReportesSupervisor)
router.post('/obtener/reportes/supervisor', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas(id,nombre)',
            'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)), jefes(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
            'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))',
        ].join(','))
        .eq('departamento_id', valor).order('created_at', { ascending: false })
    responder(res, result)
})

// (actualizarEstadoReporte)
router.put('/actualizar/reporte/estadoId', async (req, res) => {
    const { folio, data, user } = req.body;
    const { estado_id } = data || {};
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            4, //Jefe
            //5, //Trabajador
            6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // estado_id = number
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }

    if (!estado_id || typeof estado_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado_id, 'Tipo:', typeof estado_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('detalle_reporte')
        .update({ estado_id })
        .eq('folio', folio)
    responder(res, result)
})

// (actualizarEstadoReporteConJefeFechaInicio)
router.put('/actualizar/reporte/estadoIdJefeFechaInicio', async (req, res) => {
    const { folio, data, user } = req.body;
    const { jefe_id, estado_id, fecha_inicio } = data || {};
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // jefe_id = number
    // estado_id = number
    // fecha_inicio = string (fecha en formato ISO)
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de jefe_id
    if (!jefe_id || typeof jefe_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Jefe no proporcionado o tipo inválido:', jefe_id, 'Tipo:', typeof jefe_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Jefe no proporcionado o tipo inválido. Por favor, ingresa un jefe válido.'
        });
    }
    // Validacion de estado_id
    if (!estado_id || typeof estado_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado_id, 'Tipo:', typeof estado_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
        });
    }
    // Validacion de fecha_inicio
    if (!fecha_inicio || typeof fecha_inicio !== 'string' || isNaN(Date.parse(fecha_inicio))) {
        // Error para depuracion en el log del servidor
        console.log('Fecha de inicio no proporcionada, tipo inválido o formato incorrecto:', fecha_inicio, 'Tipo:', typeof fecha_inicio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Fecha de inicio no proporcionada, tipo inválido o formato incorrecto. Por favor, ingresa una fecha válida en formato ISO.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('detalle_reporte')
        .update({ jefe_id, estado_id, fecha_inicio })
        .eq('folio', folio)
    responder(res, result)
})

// (actualizarEstadoReporteConFechaCierre)
router.put('/actualizar/reporte/estadoIdFechaCierre', async (req, res) => {
    const { folio, data, user } = req.body;
    const { estado_id, fecha_cierre } = data || {};
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // estado_id = number
    // fecha_cierre = string (fecha en formato ISO)
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de estado_id
    if (!estado_id || typeof estado_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado_id, 'Tipo:', typeof estado_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
        });
    }
    // Validacion de fecha_cierre
    if (!fecha_cierre || typeof fecha_cierre !== 'string' || isNaN(Date.parse(fecha_cierre))) {
        // Error para depuracion en el log del servidor
        console.log('Fecha de cierre no proporcionada, tipo inválido o formato incorrecto:', fecha_cierre, 'Tipo:', typeof fecha_cierre);
        return res.status(400).json({
            // Error para el usuario
            error: 'Fecha de cierre no proporcionada, tipo inválido o formato incorrecto. Por favor, ingresa una fecha válida en formato ISO.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('detalle_reporte')
        .update({ estado_id, fecha_cierre })
        .eq('folio', folio)
    responder(res, result)
})

// (actualizarEstadoReporteQuitarSupervisor)
router.put('/actualizar/reporte/estadoIdSupervisorNull', async (req, res) => {
    const { folio, data, user } = req.body;
    const { estado_id } = data || {};
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // estado_id = number
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de estado_id
    if (!estado_id || typeof estado_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado_id, 'Tipo:', typeof estado_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('detalle_reporte')
        .update({ estado_id, supervisor_id: null })
        .eq('folio', folio)
    responder(res, result)
})

// (actualizarEstadoProblemaInterno)
router.put('/actualizar/problema_interno/estado', async (req, res) => {
    const { data, user } = req.body;
    const { estado, id } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // estado = string & 'Alta' o 'Baja'
    if (!estado || typeof estado !== 'string' || (estado !== 'Alta' && estado !== 'Baja')) {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido (Alta o Baja).'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas')
        .update({ estado })
        .eq('id', id)
    responder(res, result)
})

// (actualizarEstadoProblemaExterno)
router.put('/actualizar/problema_externo/estado', async (req, res) => {
    const { data, user } = req.body;
    const { estado, id } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // estado = string & 'Alta' o 'Baja'
    if (!estado || typeof estado !== 'string' || (estado !== 'Alta' && estado !== 'Baja')) {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado, tipo inválido o valor incorrecto:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado, tipo inválido o valor incorrecto. Por favor, ingresa un estado válido (Alta o Baja).'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas_externos')
        .update({ estado })
        .eq('id', id)
    responder(res, result)
})

// (actualizarSupervisorEstadoReporte)
router.put('/actualizar/reporteEstado/supervisor', async (req, res) => {
    const { folio, data, user } = req.body;
    const { estado_id, supervisor_id } = data || {};
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // estado_id = number
    // supervisor_id = number
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de estado_id
    if (!estado_id || typeof estado_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado_id, 'Tipo:', typeof estado_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
        });
    }
    // Validacion de supervisor_id
    if (!supervisor_id || typeof supervisor_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Supervisor ID no proporcionado o tipo inválido:', supervisor_id, 'Tipo:', typeof supervisor_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Supervisor ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('detalle_reporte')
        .update({ estado_id, supervisor_id })
        .eq('folio', folio)
    responder(res, result)
})

// (obtenerSupervisoresPorDepartamentoID)
router.post('/obtener/supervisores/departamentoId', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('supervisores')
        .select(['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'].join(','))
        .eq('departamento_id', valor)
    responder(res, result)
})

// (obtenerTitulos)
router.post('/obtener/titulos/categoria_historial_id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('titulo')
        .select(['id', 'nombre'].join(','))
        .eq('categoria_historial_id', valor)
    responder(res, result)
})

// (obtenerCategoriaHistorial)
router.post('/obtener/categoria_historial/id', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('categoria_historial')
        .select(['id', 'nombre'].join(','))
        .eq('id', valor)
    responder(res, result)
})

// (actualizarReporteADepartamentoInterno)
router.put('/actualizar/reporte/departamento_interno', async (req, res) => {
    const { folio, departamento_id, problema_id, user } = req.body;
    const departamento_externo_id = null; // Se establece a null ya que se está actualizando a un departamento interno
    const problema_externo_id = null; // Se establece a null ya que se está actualizando a un problema interno
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // departamento_id = number
    // problema_id = number
    // Validacion de folio
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de departamento_id
    if (!departamento_id || typeof departamento_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Departamento ID no proporcionado o tipo inválido:', departamento_id, 'Tipo:', typeof departamento_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Departamento ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de problema_id
    if (!problema_id || typeof problema_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Problema ID no proporcionado o tipo inválido:', problema_id, 'Tipo:', typeof problema_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Problema ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .update({ departamento_id, problema_id, departamento_externo_id, problema_externo_id })
        .eq('folio', folio)
    responder(res, result)
})

// (actualizarReporteADepartamentoExterno)
router.put('/actualizar/reporte/departamento_externo', async (req, res) => {
    const { folio, departamento_id: departamento_externo_id, problema_id: problema_externo_id, user } = req.body;
    const departamento_id = null;
    const problema_id = null;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // folio = string
    // departamento_externo_id = number
    // problema_externo_id = number
    // Validacion de folio
    if (!folio || typeof folio !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Folio no proporcionado o tipo inválido:', folio, 'Tipo:', typeof folio);
        return res.status(400).json({
            // Error para el usuario
            error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
        });
    }
    // Validacion de departamento_externo_id
    if (!departamento_externo_id || typeof departamento_externo_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Departamento Externo ID no proporcionado o tipo inválido:', departamento_externo_id, 'Tipo:', typeof departamento_externo_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Departamento Externo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de problema_externo_id
    if (!problema_externo_id || typeof problema_externo_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Problema Externo ID no proporcionado o tipo inválido:', problema_externo_id, 'Tipo:', typeof problema_externo_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Problema Externo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('reportes')
        .update({ departamento_externo_id, problema_externo_id, departamento_id, problema_id })
        .eq('folio', folio)
    responder(res, result)
})

// (obtenerEstadoIDPorNombre)
router.post('/obtener/estadoId/nombre', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string
    if (!valor || typeof valor !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('estadoreporte')
        .select(['id'].join(','))
        .eq('estado', valor)
        .single()
    responder(res, result)
})

// (obtenerTodosDepartamentosInternos)
router.post('/obtener/departamentos_internos', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }


    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos')
        .select(['id', 'nombre', 'nombreamigable', 'estado'].join(',')).order('nombre', { ascending: true })
    responder(res, result)
})

// (obtenerTodosDepartamentosExternos)
router.post('/obtener/departamentos_externos', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]
    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos_externos')
        .select(['id', 'departamento', 'estado'].join(',')).order('departamento', { ascending: true })
    responder(res, result)
})

// (obtenerTodosProblemasInternos)
router.post('/obtener/problemas_internos', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas')
        .select(['id', 'nombre', 'nombreamigable', 'departamento_id', 'departamentos (id, nombre)', 'estado'].join(',')).order('nombre', { ascending: true })
    responder(res, result)
})

// (obtenerTodosProblemasExternos)
router.post('/obtener/problemas_externos', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas_externos')
        .select([
            'id',
            'nombre',
            'nombreamigable',
            'departamento_externo_id',
            'departamentos_externos (id, departamento)',
            'estado',
        ].join(',')).order('nombre', { ascending: true })
    responder(res, result)
})

// (obtenerTodosSupervisores)
router.post('/obtener/supervisores', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('supervisores')
        .select(['id', 'usuario_id', 'usuarios(id,nombre,apellido_p,apellido_m)'].join(','))
    responder(res, result)
})

// (obtenerTodosJefes)
router.post('/obtener/jefes', async (req, res) => {
    const { user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('jefes')
        .select([
            'id',
            'supervisor_id',
            'usuario_id',
            'usuarios(id,nombre,apellido_p,apellido_m)',
        ].join(','))
    responder(res, result)
})

// (obtenerTodosUsuariosExcepto)
router.post('/obtener/usuariosTodos/excepto', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('usuarios')
        .select([
            'id',
            'correo',
            'nombre',
            'apellido_p',
            'apellido_m',
            'estadoadministrativo',
            'tipousuario_id',
            'fechaalta',
            'fechabaja',
            'tipousuario:tipousuario_id (nombre)',
            'administradores (created_at, departamentos(id, nombre))',
            'supervisores (created_at, departamentos(id, nombre), usuarios(id, nombre, apellido_p, apellido_m), jefes(id, usuarios(id, nombre, apellido_p, apellido_m)))',
            'jefes (created_at, supervisores(id, usuarios(id, nombre, apellido_p, apellido_m)), trabajadores(id, usuarios(id, nombre, apellido_p, apellido_m)))',
            'trabajadores (created_at, jefes(id, usuarios(id, nombre, apellido_p, apellido_m), supervisores(id, usuarios(id, nombre, apellido_p, apellido_m))) )',
            'personal_externo (created_at, departamentos_externos(id, departamento))',
        ].join(','))
        .neq('tipousuario_id', valor)
        .order('nombre', { ascending: true })
    responder(res, result)
})

// (obtenerJefesPorSupervisor)
router.post('/obtener/jefes/supervisorId', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [//1, //Director General
            //2, //Administrador Interno
            3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('jefes')
        .select(['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'].join(','))
        .eq('supervisor_id', valor)
    responder(res, result)
})

// (obtenerUsuarioExcepto)
router.post('/obtener/usuarios/excepto', async (req, res) => {
    const { valor = ['*'], user } = req.body;
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // valor = string | number
    if (!valor || (typeof valor !== 'string' && typeof valor !== 'number')) {
        // Error para depuracion en el log del servidor
        console.log('Valor de búsqueda no proporcionado o tipo inválido:', valor, 'Tipo:', typeof valor);
        return res.status(400).json({
            // Error para el usuario
            error: 'Valor de búsqueda no proporcionado o tipo inválido. Por favor, ingresa un valor válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('tipousuario')
        .select(['id', 'nombre'].join(','))
        .neq('id', valor)
    responder(res, result)
})

// (actualizarProblemaInterno)
router.put('/actualizar/problema_interno', async (req, res) => {
    const { id, data, user } = req.body;
    const { nombre, nombreamigable, departamento_id } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // nombre = string
    // nombreamigable = string
    // departamento_id = number
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de nombre
    if (!nombre || typeof nombre !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Validacion de nombreamigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }
    // Validacion de departamento_id
    if (!departamento_id || typeof departamento_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Departamento ID no proporcionado o tipo inválido:', departamento_id, 'Tipo:', typeof departamento_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Departamento ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas')
        .update({ nombre, nombreamigable, departamento_id })
        .eq('id', id)
    responder(res, result)
})

// (actualizarProblemaExterno)
router.put('/actualizar/problema_externo', async (req, res) => {
    const { id, data, user } = req.body;
    const { nombre, nombreamigable, departamento_externo_id } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // nombre = string
    // nombreamigable = string
    // departamento_externo_id = number
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de nombre
    if (!nombre || typeof nombre !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Validacion de nombreamigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }
    // Validacion de departamento_externo_id
    if (!departamento_externo_id || typeof departamento_externo_id !== 'number') {
        // Error para depuracion en el log del servidor
        console.log('Departamento Externo ID no proporcionado o tipo inválido:', departamento_externo_id, 'Tipo:', typeof departamento_externo_id);
        return res.status(400).json({
            // Error para el usuario
            error: 'Departamento Externo ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('problemas_externos')
        .update({ nombre, nombreamigable, departamento_externo_id })
        .eq('id', id)
    responder(res, result)
})

// (actualizarDepartamentoInterno)
router.put('/actualizar/departamento_interno', async (req, res) => {
    const { id, data, user } = req.body;
    const { nombre, nombreamigable } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // nombre = string
    // nombreamigable = string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de nombre
    if (!nombre || typeof nombre !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre no proporcionado o tipo inválido:', nombre, 'Tipo:', typeof nombre);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre no proporcionado o tipo inválido. Por favor, ingresa un nombre válido.'
        });
    }
    // Validacion de nombreamigable
    if (!nombreamigable || typeof nombreamigable !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Nombre amigable no proporcionado o tipo inválido:', nombreamigable, 'Tipo:', typeof nombreamigable);
        return res.status(400).json({
            // Error para el usuario
            error: 'Nombre amigable no proporcionado o tipo inválido. Por favor, ingresa un nombre amigable válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos')
        .update({ nombre, nombreamigable })
        .eq('id', id)
    responder(res, result)
})

// (actualizarDepartamentoExterno)
router.put('/actualizar/departamento_externo', async (req, res) => {
    const { id, data, user } = req.body;
    const { departamento } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // departamento = string
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de departamento
    if (!departamento || typeof departamento !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('Departamento no proporcionado o tipo inválido:', departamento, 'Tipo:', typeof departamento);
        return res.status(400).json({
            // Error para el usuario
            error: 'Departamento no proporcionado o tipo inválido. Por favor, ingresa un departamento válido.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos_externos')
        .update({ departamento })
        .eq('id', id)
    responder(res, result)
})

// (actualizarEstadoDepartamentoInterno)
router.put('/actualizar/departamento_interno/estado', async (req, res) => {
    const { id, data, user } = req.body;
    const { estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // estado = string && ('Alta' || 'Baja')
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de estado
    if (!estado || typeof estado !== 'string' || (estado !== 'Alta' && estado !== 'Baja')) {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido (Alta o Baja).'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos')
        .update({ estado })
        .eq('id', id);
    responder(res, result)
})

// (actualizarEstadoDepartamentoExterno)
router.put('/actualizar/departamento_externo/estado', async (req, res) => {
    const { id, data, user } = req.body;
    const { estado } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // estado = string && ('Alta' || 'Baja')
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de estado
    if (!estado || typeof estado !== 'string' || (estado !== 'Alta' && estado !== 'Baja')) {
        // Error para depuracion en el log del servidor
        console.log('Estado no proporcionado o tipo inválido:', estado, 'Tipo:', typeof estado);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido (Alta o Baja).'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('departamentos_externos')
        .update({ estado })
        .eq('id', id);
    responder(res, result)
})

// (actualizarEstadoUsuario)
router.put('/actualizar/usuario/estado', async (req, res) => {
    const { id, data, user } = req.body;
    const { estadoadministrativo } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // estadoadministrativo = string && ('Alta' || 'Baja')
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    // Validacion de estadoadministrativo
    if (!estadoadministrativo || typeof estadoadministrativo !== 'string' || (estadoadministrativo !== 'Alta' && estadoadministrativo !== 'Baja')) {
        // Error para depuracion en el log del servidor
        console.log('Estado administrativo no proporcionado o tipo inválido:', estadoadministrativo, 'Tipo:', typeof estadoadministrativo);
        return res.status(400).json({
            // Error para el usuario
            error: 'Estado administrativo no proporcionado o tipo inválido. Por favor, ingresa un estado válido (Alta o Baja).'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('usuarios')
        .update({ estadoadministrativo })
        .eq('id', id);
    responder(res, result)
})

// (actualizarFechaBajaUsuario)
router.put('/actualizar/usuario/fechaBaja', async (req, res) => {
    const { id, data, user } = req.body;
    const { fechabaja } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // fechabaja = string (fecha en formato ISO 8601)
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    if (!fechabaja || typeof fechabaja !== 'string' || isNaN(Date.parse(fechabaja))) {
        // Error para depuracion en el log del servidor
        console.log('Fecha de baja no proporcionada o tipo inválido:', fechabaja, 'Tipo:', typeof fechabaja);
        return res.status(400).json({
            // Error para el usuario
            error: 'Fecha de baja no proporcionada o tipo inválido. Por favor, ingresa una fecha válida.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('usuarios')
        .update({ fechabaja })
        .eq('id', id);
    responder(res, result)
})

// (actualizarFechaAltaUsuario)
router.put('/actualizar/usuario/fechaAlta', async (req, res) => {
    const { id, data, user } = req.body;
    const { fechaalta } = data || {};
    const rolesPermitidos =
        [1, //Director General
            //2, //Administrador Interno
            //3, //Supervisor
            //4, //Jefe
            //5, //Trabajador
            //6, //Administrador Externo
        ]

    // Validacion de Autenticacion del Usuario
    if (!await validarAutenticacion(user)) {
        return res.status(401).json({
            // Error para el usuario
            error: 'No estas autenticado o no estas de alta, por favor inicia sesión nuevamente.'
        });
    }

    // Validacion de Autorizacion del Usuario
    if (!await validarAutorizacion(user, rolesPermitidos)) {
        return res.status(403).json({
            // Error para el usuario
            error: 'No tienes permisos para realizar esta acción.'
        });
    }

    // Validacion de datos
    // id = number || string
    // fechaalta = string (fecha en formato ISO 8601)
    if (!id || typeof id !== 'number' && typeof id !== 'string') {
        // Error para depuracion en el log del servidor
        console.log('ID no proporcionado o tipo inválido:', id, 'Tipo:', typeof id);
        return res.status(400).json({
            // Error para el usuario
            error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
        });
    }
    if (!fechaalta || typeof fechaalta !== 'string' || isNaN(Date.parse(fechaalta))) {
        // Error para depuracion en el log del servidor
        console.log('Fecha de alta no proporcionada o tipo inválido:', fechaalta, 'Tipo:', typeof fechaalta);
        return res.status(400).json({
            // Error para el usuario
            error: 'Fecha de alta no proporcionada o tipo inválido. Por favor, ingresa una fecha válida.'
        });
    }

    // Realizacion de la consulta a la base de datos
    const result = await supabase
        .from('usuarios')
        .update({ fechaalta })
        .eq('id', id);
    responder(res, result)
})



export default router