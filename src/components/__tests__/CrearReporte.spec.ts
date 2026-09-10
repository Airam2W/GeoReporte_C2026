import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import CrearReporteComponent from '@/views/CrearReporte.vue'
import {supabase} from '@/lib/supabase'
import './setup'

describe('Pruebas Unitarias del Módulo CrearReporte', () => {
    let wrapper: VueWrapper<any>;
    let insertMock: any;
    const mockDepartamentos = [
        { id: 1, nombre: 'Alumbrado Público' },
        { id: 2, nombre: 'Parques y Jardines' },
    ];

    const mockProblemas = [
        { id: 1, nombre: 'Falla de iluminación', departamento_id: 1 },
    ]

    beforeEach(() => {
        vi.clearAllMocks();
        insertMock = vi.fn().mockResolvedValue({error: null});
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'departamentos') {
                return {
                    select: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockDepartamentos, error: null }),
                };
            }
            if (table === 'problemas') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockProblemas, error: null }),
                };
            }
            if (table === 'reportes') {
                return {
                    insert: insertMock,
                };
            }
            return{};
    });
    (supabase.storage.from as any).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/mock-image.jpg' }}),
    });

    vi.stubGlobal('alert', vi.fn());
    wrapper = mount(CrearReporteComponent);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('PU-01: Cargar el cátalogo de departamentos', async () => {
        expect(supabase.from).toHaveBeenCalledWith('departamentos');
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.departamentos).toEqual(mockDepartamentos);
    });

    it('PU-02: Lista de problemas inhabilitado hasta seleccionar un departamento', async () => {
        expect(wrapper.vm.problemas).toEqual([]);
        expect(wrapper.vm.form.problema_id).toBe('');
    });

    it('PU-03: Cargar el cátalogo de problemas al seleccionar un departamento', async () => {
        vi.clearAllMocks();
        wrapper.vm.form.departamento_id = 1;
        await wrapper.vm.onDepartamentoSeleccionado();
        expect(supabase.from).toHaveBeenCalledWith('problemas');
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
        expect(wrapper.vm.enviando).toBe(false);
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
        const textoLargo = 'a'.repeat(601);
        const textarea = wrapper.find('textarea[placeholder="Describe el problema..."]');
        await textarea.setValue(textoLargo);
        expect(wrapper.vm.form.descripcion.length).toBe(601);
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

    it('PU-10: Capturar foto de evidencia', () => {
        const file = new File(['foto-prueba'], 'evidencia.jpg', { type: 'image/png'});
        const event = { target: { files: [file] } } as unknown as Event;

        wrapper.vm.errores.foto = 'Debes adjuntar una foto de evidencia';
        wrapper.vm.seleccionarFoto(event);
        expect(wrapper.vm.form.foto).toBe(file);
        expect(wrapper.vm.errores.foto).toBe('');
    });

    it('PU-11: Enviar reporte exitosamente', async () => {
        wrapper.vm.form.departamento_id = 1;
        wrapper.vm.form.problema_id = 1;
        wrapper.vm.form.descripcion = 'Prueba de reporte';
        wrapper.vm.form.nombre = 'Angel';
        wrapper.vm.form.telefono = '6671234567';
        wrapper.vm.form.domicilio = 'Av. Álvaro Obregón 450';
        wrapper.vm.form.referencias = 'Frente al parque'
        wrapper.vm.form.latitud = 24.8091;
        wrapper.vm.form.longitud = -107.3940;
        const file = new File(['foto-prueba'], 'evidencia.jpg', { type: 'image/jpeg'});
        wrapper.vm.form.foto = file;

        await wrapper.vm.enviarReporte();
        expect(supabase.storage.from).toHaveBeenCalledWith('fotos');
        expect(supabase.from).toHaveBeenCalledWith('reportes');
        expect(window.alert).toHaveBeenCalledWith('¡Reporte enviado exitosamente!');
        expect(wrapper.vm.form.descripcion).toBe('');
    });

    it('PU-12: Asignar nombre como anónimo', async () =>{
        wrapper.vm.form.departamento_id = 1;
        wrapper.vm.form.problema_id = 1;
        wrapper.vm.form.descripcion = 'Prueba de reporte';
        wrapper.vm.form.nombre = '';
        wrapper.vm.form.telefono = '6671234567';
        wrapper.vm.form.domicilio = 'Av. Álvaro Obregón 450';
        wrapper.vm.form.referencias = 'Ferente al parque'
        wrapper.vm.form.latitud = 24.8091;
        wrapper.vm.form.longitud = -107.3940;
        const file = new File(['foto-prueba'], 'evidencia.jpg', { type: 'image/jpeg'});
        wrapper.vm.form.foto = file;
        await wrapper.vm.enviarReporte();
        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
            nombre: 'Anónimo'
        }))
    });

    it('PU-13: Mostrar la información de los folios existentes', async () =>{
        const mockReporte = {
            folio: 10,
            gestionnombre: 'Alumbrado Público',
            estadonombre: 'En Proceso',
            descripcion: 'Prueba de consulta de folio'
        };
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReporte
        })

        wrapper.vm.folioBusqueda = '10';
        await wrapper.vm.buscarReporte();

        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/reportes/10'));
        expect(wrapper.vm.reporteEncontrado).toEqual(mockReporte);
    })

    it('PU-14: Mostrar folio no existente o no encontrado', async () =>{
        (global.fetch as any).mockResolvedValueOnce({
                ok:false,
                status: 404
        });
        wrapper.vm.folioBusqueda = '99999';
        await wrapper.vm.buscarReporte();
        expect(wrapper.vm.reporteEncontrado).toBeNull();
    });
});