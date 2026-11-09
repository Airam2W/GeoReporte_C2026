import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import CrearReporteComponent from '@/views/CrearReporte.vue'
import {
    obtenerDepartamentosOrdenadosPorId,
    obtenerProblemasPorDepartamentoID,
    uploadFoto,
    getPublicUrl,
    crearReporte,
    crearDetalleReporte,
} from '@/services/supabaseController'
import { validarAI } from '@/services/geoAIController'
import './setup'

vi.mock('@/services/gmailController', () => ({
    enviarCorreoCreacionReporte: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('Pruebas Unitarias del Módulo CrearReporte', () => {
    let wrapper: VueWrapper<any>;
    let turnstileCallback: ((token: string) => void) | undefined;

    const mockDepartamentos = [
        { id: 1, nombre: 'Alumbrado Público', nombreamigable: 'Alumbrado Público', estado: 'Alta' },
        { id: 2, nombre: 'Parques y Jardines', nombreamigable: 'Parques y Jardines', estado: 'Alta' },
    ];

    const mockProblemas = [
        { id: 1, nombre: 'Falla de iluminación', nombreamigable: 'Falla de iluminación', departamento_id: 1, estado: 'Alta' },
    ]

    beforeEach(async () => {
        vi.clearAllMocks();

        vi.mocked(obtenerDepartamentosOrdenadosPorId).mockResolvedValue({ data: mockDepartamentos, error: null });
        vi.mocked(obtenerProblemasPorDepartamentoID).mockResolvedValue({ data: mockProblemas, error: null });
        vi.mocked(uploadFoto).mockResolvedValue({ data: {}, error: null });
        vi.mocked(getPublicUrl).mockResolvedValue({
            data: { publicUrl: 'https://example.com/mock-image.jpg' },
            error: null,
        });
        vi.mocked(crearReporte).mockResolvedValue({ data: {}, error: null });
        vi.mocked(crearDetalleReporte).mockResolvedValue({ data: {}, error: null });
        vi.mocked(validarAI).mockResolvedValue({ type: 0, success: true, error: null, data: { message: 'Imagen válida' } });

        vi.stubGlobal('alert', vi.fn());

        // Simulación de Cloudflare Turnstile (en jsdom no existe)
        vi.stubGlobal('turnstile', {
            render: vi.fn((_el: HTMLElement, opts: any) => {
                turnstileCallback = opts.callback
                return 'widget-id'
            }),
            reset: vi.fn(),
            execute: vi.fn(() => turnstileCallback?.('token-prueba')),
            remove: vi.fn(),
        });

        // attachTo: seleccionarFoto usa document.getElementsByName('enviar'),
        // así que el componente tiene que estar dentro del document.
        wrapper = mount(CrearReporteComponent, { attachTo: document.body });
        await flushPromises(); // deja que onMounted termine de renderizar el widget
    });

    afterEach(() => {
        wrapper.unmount();
        document.querySelector('.modal-reporte-exitoso')?.remove();
    });

    // Llena el formulario con datos válidos para poder enviar el reporte
    const llenarFormularioValido = (nombre: string, correo: string) => {
        wrapper.vm.form.departamento_id = 1;
        wrapper.vm.form.problema_id = 1;
        wrapper.vm.form.descripcion = 'Prueba de reporte';
        wrapper.vm.form.nombre = nombre;
        wrapper.vm.form.telefono = '6671234567';
        wrapper.vm.form.domicilio = 'Av. Álvaro Obregón 450';
        wrapper.vm.form.referencias = 'Frente al parque';
        wrapper.vm.form.correo = correo;
        wrapper.vm.form.latitud = 24.8091;
        wrapper.vm.form.longitud = -107.3940;
        wrapper.vm.form.foto = new File(['foto-prueba'], 'evidencia.jpg', { type: 'image/jpeg' });
        // Resultado de la validación con IA (0 = la imagen pasa)
        wrapper.vm.form.fotoTipoID = 0;
        wrapper.vm.form.mensajeAI = 'Imagen válida';
        wrapper.vm.aceptaTerminos = true;
    };

    it('PU-01: Cargar el cátalogo de departamentos', async () => {
        expect(obtenerDepartamentosOrdenadosPorId).toHaveBeenCalled();
        await flushPromises();
        expect(wrapper.vm.departamentos).toEqual(mockDepartamentos);
    });

    it('PU-02: Lista de problemas inhabilitado hasta seleccionar un departamento', async () => {
        expect(wrapper.vm.problemas).toEqual([]);
        expect(wrapper.vm.form.problema_id).toBe('');
    });

    it('PU-03: Cargar el cátalogo de problemas al seleccionar un departamento', async () => {
        vi.mocked(obtenerProblemasPorDepartamentoID).mockClear();
        wrapper.vm.form.departamento_id = 1;
        await wrapper.vm.onDepartamentoSeleccionado();
        expect(obtenerProblemasPorDepartamentoID).toHaveBeenCalledWith(1);
        expect(wrapper.vm.problemas).toEqual(mockProblemas);
        expect(wrapper.vm.form.problema_id).toBe('');
    });

    it('PU-04: Validar que el formulario no se envíe si faltan campos requeridos', async () => {
        await wrapper.vm.enviarReporte();
        expect(wrapper.vm.errores.departamento_id).toBe('Selecciona el departamento');
        expect(wrapper.vm.errores.problema_id).toBe('Selecciona el problema');
        expect(wrapper.vm.errores.descripcion).toBe('La descripción es obligatoria');
        expect(wrapper.vm.errores.telefono).toBe('El teléfono es obligatorio');
        expect(wrapper.vm.errores.domicilio).toBe('Por favor selecciona una ubicación en el mapa');
        expect(wrapper.vm.errores.foto).toBe('Debes adjuntar una foto de evidencia');
        expect(wrapper.vm.errores.terminos).toBe('Debes aceptar los Términos y Condiciones para enviar tu reporte');
        expect(wrapper.vm.enviando).toBe(false);
        expect(crearReporte).not.toHaveBeenCalled();
    });

    it('PU-05: Validar que el teléfono tenga exactamente 10 dígitos', async () => {
        wrapper.vm.form.telefono = '667123'
        await wrapper.vm.enviarReporte();
        expect(wrapper.vm.errores.telefono).toBe('Ingresa un número válido de 10 dígitos');

        wrapper.vm.form.telefono = 'abc6671234'
        await wrapper.vm.enviarReporte();
        expect(wrapper.vm.errores.telefono).toBe('Ingresa un número válido de 10 dígitos');
    });

    it('PU-06: Restringir la longitud de la descripción a un máximo de 600 caracteres', async () => {
        wrapper.vm.panelAbierto = true;
        await wrapper.vm.$nextTick();
        const textarea = wrapper.find('textarea[placeholder="Describe el problema..."]');
        // El atributo maxlength limita a 600 en el navegador
        expect(textarea.attributes('maxlength')).toBe('600');

        // Programáticamente jsdom no recorta, pero el contador debe mostrar el límite de 600
        await textarea.setValue('a'.repeat(601));
        expect(wrapper.find('.contador').text()).toContain('600');
    });

    it('PU-07: Validar coordenadas dentro de Culiacán', () => {
        const latCuliacan = 24.8091;
        const lngCuliacan = -107.3940;

        expect(wrapper.vm.dentroDeculiacan(latCuliacan, lngCuliacan)).toBe(true);
    });

    it('PU-08: Validar coordenadas fuera de Culiacán', () => {
        const latMazatlan = 23.2494;
        const lngMazatlan = -106.4111;

        expect(wrapper.vm.dentroDeculiacan(latMazatlan, lngMazatlan)).toBe(false);
    });

    it('PU-09: Bloquear que no se pueda seleccionar una ubicación fuera de Culiacán', async () => {
        wrapper.vm.map = {
            getCenter: () => ({ lat: 20.0000, lng: -100.0000 }),
        };
        await wrapper.vm.confirmarDireccion();
        expect(window.alert).toHaveBeenCalledWith(
            'La ubicación seleccionada está fuera de Culiacán. Por favor selecciona un punto dentro del municipio.');
        expect(wrapper.vm.modoMapa).toBe(false);
    });

    it('PU-10: Capturar foto de evidencia y validarla con IA', async () => {
        const file = new File(['foto-prueba'], 'evidencia.jpg', { type: 'image/jpeg' });
        const event = { target: { files: [file] } } as unknown as Event;

        // El departamento 3 corresponde al slug 'alumbrado'
        wrapper.vm.form.departamento_id = 3;
        wrapper.vm.errores.foto = 'Debes adjuntar una foto de evidencia';
        wrapper.vm.seleccionarFoto(event);
        await flushPromises();

        expect(wrapper.vm.form.foto).toBe(file);
        expect(wrapper.vm.errores.foto).toBe('');
        expect(validarAI).toHaveBeenCalledWith(file, 'alumbrado');
        expect(wrapper.vm.form.fotoTipoID).toBe(0);
        expect(wrapper.vm.form.mensajeAI).toBe('Imagen válida');
    });

    it('PU-11: Enviar reporte exitosamente', async () => {
        llenarFormularioValido('Angel', 'angel@correo.com');

        await wrapper.vm.enviarReporte();

        expect(uploadFoto).toHaveBeenCalled();
        expect(getPublicUrl).toHaveBeenCalled();
        expect(crearReporte).toHaveBeenCalledWith(expect.objectContaining({
            nombre: 'Angel',
            departamento_id: 1,
            problema_id: 1,
            telefono: '6671234567',
            foto_url: 'https://example.com/mock-image.jpg',
        }));
        expect(crearDetalleReporte).toHaveBeenCalledWith(expect.objectContaining({ estado_id: 1 }));
        expect(document.querySelector('.modal-reporte-exitoso')).not.toBeNull();
        expect(wrapper.vm.form.descripcion).toBe('');
        expect(wrapper.vm.panelAbierto).toBe(false);
    });

    it('PU-12: Asignar nombre como "Ciudadano Honorable"', async () => {
        llenarFormularioValido('', '');

        await wrapper.vm.enviarReporte();

        expect(crearReporte).toHaveBeenCalledWith(expect.objectContaining({
            nombre: 'Ciudadano Honorable'
        }))
    });

});
