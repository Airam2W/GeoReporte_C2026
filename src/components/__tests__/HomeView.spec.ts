import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import HomeComponent from '@/views/HomeView.vue'
import ReporteDetalleModal from '@/components/ReporteDetalleModal.vue'
import { supabase } from '@/lib/supabase'
import './setup'

const {pushMock} = vi.hoisted(()=>{
    return { pushMock: vi.fn()};
})
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock('@/logic/home', async () => {
    const { ref } = await import('vue');
    return {
        menuAbierto: ref(false),
        menuRef: ref(null),
        iniciarSesionAdmin: vi.fn(),
    };
});

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        storage: {
            from: vi.fn(),
        },
    },
}));

describe('Pruebas Unitarias del Módulo Home', () => {
    let wrapper: VueWrapper<any>;
    let singleMock: any;
    let eqMock: any;
    let selectMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        singleMock = vi.fn();
        eqMock = vi.fn().mockReturnValue({ single: singleMock });
        selectMock = vi.fn().mockReturnValue({ eq: eqMock });
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'reportes') {
                return { select: selectMock };
            }
            return {};
        });

        vi.stubGlobal('alert', vi.fn());
        wrapper = mount(HomeComponent, {
            global: {
                stubs: {
                    ReporteDetalleModal: true,
                },
            },
        });
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('PU-1: Mostrar la información de un folio existente', async () => {
        const mockReporte = {
            folio: 'ALU-BAC-20260315-153000-AB3F9',
            descripcion: 'Prueba de consulta de folio',
            nombreReportante: 'Angel',
            telefono: '6671234567',
            domicilio: 'Av. Álvaro Obregón 450',
            referencias: null,
            foto_url: 'https://example.com/foto.jpg',
            fecha_creacion: '2026-03-15T00:00:00Z',
            problemas: { nombre: 'Bache' },
            reportesexistentes: [{ estado: 'En Proceso' }],
        };
        singleMock.mockResolvedValueOnce({ data: mockReporte, error: null });

        wrapper.vm.folioInput = mockReporte.folio;
        await wrapper.vm.ejecutarBusqueda();

        expect(supabase.from).toHaveBeenCalledWith('reportes');
        expect(eqMock).toHaveBeenCalledWith('folio', mockReporte.folio);
        expect(wrapper.vm.reporteEncontrado).toEqual(
            expect.objectContaining({
                folio: mockReporte.folio,
                estado: 'En Proceso',
            })
        );
        expect(wrapper.vm.modalVisible).toBe(true);
        expect(wrapper.vm.modalBusquedaVisible).toBe(false);
    });

    it('PU-2: Mostrar mensaje si el folio no existe', async () => {
        singleMock.mockResolvedValueOnce({ data: null, error: { message: 'Filas no encontradas' } });

        wrapper.vm.folioInput = 'FOLIO-INEXISTENTE';
        await wrapper.vm.ejecutarBusqueda();

        expect(wrapper.vm.errorBusqueda).toBe('No se encontró ningún reporte con ese folio.');
        expect(wrapper.vm.modalVisible).toBe(false);
    });

    it('PU-3: No consultar en la BD si el folio está vacío', async () => {
        wrapper.vm.folioInput = '   ';
        await wrapper.vm.ejecutarBusqueda();

        expect(supabase.from).not.toHaveBeenCalled();
        expect(wrapper.vm.errorBusqueda).toBe('Por favor, ingresa el folio de tu reporte.');
    });

    it('PU-4: Si no hay reporte con ese estado, usa "Llegado" por defecto', async () => {
        const mockReporte = {
            folio: 'ALU-BAC-20260315-153000-AB3F9',
            descripcion: 'Prueba de consulta de folio',
            nombre: 'Angel',
            telefono: '6671234567',
            domicilio: 'Av. Álvaro Obregón 450',
            referencias: null,
            foto_url: 'https://example.com/foto.jpg',
            fecha_creacion: '2026-03-15T00:00:00Z',
            problemas: { nombre: 'Bache' },
            reportesexistentes: [], 
        };
        singleMock.mockResolvedValueOnce({ data: mockReporte, error: null });

        wrapper.vm.folioInput = mockReporte.folio;
        await wrapper.vm.ejecutarBusqueda();

        expect(wrapper.vm.reporteEncontrado.estado).toBe('Llegado');
    });
    it('PU-05: Navegación a la ruta /reporte', async () => {
        await wrapper.vm.irAReporte();
        expect(pushMock).toHaveBeenCalledWith('/reporte');
    });
    it('PU-06: abrirModalBusqueda limpia el estado anterior y abre el modal', async () => {
        // Simulación de los datos en una búsqueda previa
        wrapper.vm.folioInput = 'ALGO-VIEJO';
        wrapper.vm.errorBusqueda = 'Un error anterior';
        wrapper.vm.modalBusquedaVisible = false;
 
        wrapper.vm.abrirModalBusqueda();
 
        expect(wrapper.vm.folioInput).toBe('');
        expect(wrapper.vm.errorBusqueda).toBe('');
        expect(wrapper.vm.modalBusquedaVisible).toBe(true);
    });
    it('PU-07: Los eventos del modal de detalle se manejan correctamente', async () => {
        // Forzamos a que el modal esté visible para poder interactuar con él
        wrapper.vm.modalVisible = true;
        await wrapper.vm.$nextTick();
 
        const modal = wrapper.findComponent(ReporteDetalleModal);
        expect(modal.exists()).toBe(true);
 
        await modal.vm.$emit('close');
        expect(wrapper.vm.modalVisible).toBe(false);
 
        // Emitir 'buscar' debe reabrir el modal de búsqueda de folio
        await modal.vm.$emit('buscar');
        expect(wrapper.vm.modalBusquedaVisible).toBe(true);
    });
    it('PU-08: Los eventos del modal de detalle se manejan correctamente', async () => {
        // Forzamos a que el modal esté visible para poder interactuar con él
        wrapper.vm.modalVisible = true;
        await wrapper.vm.$nextTick();
 
        const modal = wrapper.findComponent(ReporteDetalleModal);
        expect(modal.exists()).toBe(true);
 
        // Emitir 'close' debe cerrar el modal de detalle
        await modal.vm.$emit('close');
        expect(wrapper.vm.modalVisible).toBe(false);
 
        // Emitir 'buscar' debe reabrir el modal de búsqueda de folio
        await modal.vm.$emit('buscar');
        expect(wrapper.vm.modalBusquedaVisible).toBe(true);
    });
     it('PU-09: El menú desplegable llama a iniciarSesion al hacer clic', async () => {
        const { menuAbierto, iniciarSesionAdmin } = await import('@/logic/home');
 
        expect(menuAbierto.value).toBe(false);
 
        await wrapper.find('.menu-btn').trigger('click');
        expect(menuAbierto.value).toBe(true);
 
        const opcionLogin = wrapper.find('.menu-list li');
        expect(opcionLogin.exists()).toBe(true);
        await opcionLogin.trigger('click');
 
        expect(iniciarSesionAdmin).toHaveBeenCalled();
    });
});