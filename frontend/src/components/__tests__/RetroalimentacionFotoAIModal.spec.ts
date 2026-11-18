import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RetroalimentacionFotoAIModal from '@/components/RetroalimentacionFotoAIModal.vue'

const montarModal = () =>
	mount(RetroalimentacionFotoAIModal, {
		props: {
			visible: true,
			folio: 'SUP-BAC-20260915-001-ABC123',
			fotoUrl: 'https://example.com/foto.jpg',
			departamentoNombre: 'Servicios Públicos',
			departamentos: [{ id: 2, nombre: 'Obras Públicas' }],
		},
	})

describe('RetroalimentacionFotoAIModal', () => {
	it('valida que se respondan todas las preguntas requeridas', async () => {
		const wrapper = montarModal()
		const enviar = () => wrapper.find('.btn-primario').trigger('click')

		await enviar()
		expect(wrapper.find('.pregunta-error .msg-error').text()).toBe('Selecciona una opción')

		await wrapper.find('input[name="foto-buena"][value="no"]').setValue()
		await enviar()
		expect(wrapper.find('.pregunta-error .msg-error').text()).toBe('Selecciona una opción')

		await wrapper.find('input[name="foto-buena"][value="si"]').setValue()
		await enviar()
		expect(wrapper.find('.pregunta-error .msg-error').text()).toBe('Selecciona una opción')

		await wrapper.find('input[name="foto-dep"][value="no"]').setValue()
		await enviar()
		expect(wrapper.find('.msg-error').text()).toBe('Selecciona un departamento')
		expect(wrapper.emitted('confirm')).toBeUndefined()

		wrapper.unmount()
	})

	it.each([
		{
			escenario: 'foto de mala calidad pero relacionada',
			buena: 'no',
			relacion: 'si',
			respuesta: null,
			departamento: null,
			resultado: -3,
		},
		{
			escenario: 'foto sin relación con una problemática',
			buena: 'no',
			relacion: 'no',
			respuesta: null,
			departamento: null,
			resultado: -2,
		},
		{
			escenario: 'foto adecuada del departamento del supervisor',
			buena: 'si',
			relacion: null,
			respuesta: 'si',
			departamento: null,
			resultado: null,
		},
		{
			escenario: 'foto adecuada de otro departamento',
			buena: 'si',
			relacion: null,
			respuesta: 'no',
			departamento: '2',
			resultado: 2,
		},
		{
			escenario: 'foto adecuada de un departamento externo',
			buena: 'si',
			relacion: null,
			respuesta: 'no',
			departamento: '-1',
			resultado: -1,
		},
	])('envía la clasificación correcta: $escenario', async ({
		buena,
		relacion,
		respuesta,
		departamento,
		resultado,
	}) => {
		const wrapper = montarModal()

		await wrapper.find(`input[name="foto-buena"][value="${buena}"]`).setValue()
		if (relacion) {
			await wrapper.find(`input[name="foto-relacion"][value="${relacion}"]`).setValue()
		}
		if (respuesta) {
			await wrapper.find(`input[name="foto-dep"][value="${respuesta}"]`).setValue()
		}
		if (departamento) {
			await wrapper.find('select').setValue(departamento)
		}

		await wrapper.find('.btn-primario').trigger('click')

		expect(wrapper.emitted('confirm')).toEqual([[resultado]])
		wrapper.unmount()
	})
})
