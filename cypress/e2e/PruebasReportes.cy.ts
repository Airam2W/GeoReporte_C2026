// Comprueba que un mensaje de error sea visible. Se separan las acciones (scrollIntoView)
// de las aserciones para evitar la regla cypress/unsafe-to-chain-command.
const verError = (texto: string | RegExp) => {
  cy.contains('.msg-error', texto).scrollIntoView();
  cy.contains('.msg-error', texto).should('be.visible');
};

//PC-01 Pruebas para el envío de reportes
describe('PC-01 Pruebas para el envío de reportes', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Los campos obligatorios del formulario no estén vacíos al enviar', () => {
    cy.contains('Crear reporte').click();

    // Enviar el formulario sin llenar los campos obligatorios
    cy.get('.panel-form button[type="submit"]').click();
    verError('Selecciona el departamento');
    verError('Selecciona el problema');
    verError('La descripción es obligatoria');
    verError('El teléfono es obligatorio');
    verError('Por favor selecciona una ubicación en el mapa');
    verError('Debes adjuntar una foto de evidencia');

    // Teléfono con menos de 10 dígitos.
    // El input tiene minlength="10", así que el navegador puede bloquear el envío y el mensaje
    // visible es el del evento @input ("El teléfono debe tener exactamente 10 dígitos") o el del
    // submit ("Ingresa un número válido de 10 dígitos"). Ambos mencionan "10 dígitos".
    cy.get('input[name="telefono"]').type('66721455');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', /10 dígitos/).should('be.visible');

    // Teléfono con 10 dígitos pero sin ubicación ni evidencia
    cy.get('input[name="telefono"]').clear();
    cy.get('input[name="telefono"]').type('6672145512');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', /10 dígitos/).should('not.exist');
    verError('Por favor selecciona una ubicación en el mapa');
    verError('Debes adjuntar una foto de evidencia');
  });
});

//PC-02 Prueba para verificar que el campo teléfono solo acepte números
describe('PC-02 Prueba para verificar que el campo teléfono solo acepte números', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('El campo teléfono solo acepta números', () => {
    cy.contains('Crear reporte').click();
    cy.get('input[name="telefono"]').type('abcde12345');
    cy.get('input[name="telefono"]').should('have.value', '12345');
  });
});

//PC-03 Pruebas para seleccionar problemas por departamento
describe('PC-03 Pruebas para seleccionar problemas por departamento', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('No permitir seleccionar un problema sin un departamento seleccionado', () => {
    cy.contains('Crear reporte').click();

    // Esperar a que el select tenga opciones cargadas antes de validar
    cy.get('select[name="departamento"] option', { timeout: 10000 }).should('have.length.greaterThan', 1);

    // Verificar que está deshabilitada la lista de problemas
    cy.get('select[name="problema"]').should('be.disabled');

    // Seleccionar un departamento (el texto de la opción es el "nombre amigable" del departamento)
    cy.get('select[name="departamento"]').select('Alumbrado público');

    // Verificar que ahora está habilitada la lista de problemas
    cy.get('select[name="problema"]').should('not.be.disabled');
  });
});

//PC-04 Prueba para comprobación de inserciones en la base de datos
describe('PC-04 Prueba para comprobación de inserciones en la base de datos', () => {
  beforeEach(() => {
    // Al confirmar la dirección el componente consulta Nominatim; si esa llamada falla, la
    // latitud/longitud quedan en 0 y el envío se bloquea. Se simula para que la prueba no
    // dependa de un servicio externo.
    cy.intercept('GET', 'https://nominatim.openstreetmap.org/reverse*', {
      statusCode: 200,
      body: { display_name: 'Av. Álvaro Obregón 450, Centro, Culiacán, Sinaloa' },
    }).as('reverseGeocode');

    cy.visit('/');
  });

  it('Comprobar que se inserta un reporte en la base de datos al enviar', () => {
    cy.contains('Crear reporte').click();

    // Esperar a que el select tenga opciones cargadas
    cy.get('select[name="departamento"] option', { timeout: 10000 }).should('have.length.greaterThan', 1);

    // Llenar los campos obligatorios del formulario
    cy.get('select[name="departamento"]').select('Alumbrado público');

    // Asegurar que el select de problemas se habilite y cargue sus propias opciones
    cy.get('select[name="problema"]').should('not.be.disabled');
    cy.get('select[name="problema"] option', { timeout: 10000 }).should('have.length.greaterThan', 1);
    cy.get('select[name="problema"]').select(1);

    cy.get('textarea[name="descripcion"]').type('Iluminación de la calle no funciona correctamente');
    cy.get('input[name="nombre"]').type('Juan Pérez');
    cy.get('input[name="telefono"]').type('6672145512');
    cy.get('#inputFotoFile').selectFile('cypress/fixtures/evidencia.jpg', { force: true });

    // Al abrir el mapa el formulario se oculta; sus datos se conservan al confirmar la dirección
    cy.get('.btn-abrir-mapa').click();
    cy.get('.btn-confirmar-dir').click();
    cy.wait('@reverseGeocode');
    cy.get('input[name="domicilio"]').should('have.value', 'Av. Álvaro Obregón 450, Centro, Culiacán, Sinaloa');

    // Enviar el formulario
    cy.get('.panel-form button[type="submit"]').click();

    // El título del modal es "Reporte enviado con éxito" (sin signos de exclamación)
    cy.get('.modal-reporte-exitoso', { timeout: 15000 }).should('be.visible');
    cy.get('.modal-reporte-exitoso').should('contain', 'Reporte enviado con éxito');
  });
});

//PC-05 Prueba para validar límite de caracteres en el campo descripción
describe('PC-05 Prueba para validar límite de caracteres en el campo descripción', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Validar que el campo descripción no acepte más de 600 caracteres', () => {
    cy.contains('Crear reporte').click();

    // Llenar el campo descripción con más de 600 caracteres
    const descripcionLarga = 'a'.repeat(601);
    cy.get('textarea[name="descripcion"]').type(descripcionLarga, { delay: 0 });

    // Verificar que el valor del campo descripción no exceda los 600 caracteres
    cy.get('textarea[name="descripcion"]').invoke('val').should('have.length', 600);

    // Verificar que sean como máximo 600 caracteres
    cy.get('textarea[name="descripcion"]').should('have.attr', 'maxlength', '600');
  });
});