//PC-01 Pruebas para el envío de reportes
describe('PC-01 Pruebas para el envío de reportes', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Los campos obligatorios del formulario no estén vacíos al enviar', () => {
    cy.contains('Crear reporte').click();

    // Enviar el formulario sin llenar los campos obligatorios
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Selecciona el departamento').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Selecciona el problema').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'La descripción es obligatoria').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'El teléfono es obligatorio').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Por favor selecciona una ubicación en el mapa').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Debes adjuntar una foto de evidencia').scrollIntoView().should('be.visible');

    // Llenar el campo teléfono con menos de 10 dígitos y enviar el formulario
    cy.get('input[name="telefono"]').type('66721455');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Ingresa un número válido de 10 dígitos').should('be.visible');

    // Llenar el campo teléfono con 10 dígitos pero sin seleccionar ubicación ni adjuntar evidencia y enviar el formulario
    cy.get('input[name="telefono"]').clear().type('6672145512');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Ingresa un número válido de 10 dígitos').should('not.exist');
    cy.contains('.msg-error', 'Por favor selecciona una ubicación en el mapa').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Debes adjuntar una foto de evidencia').scrollIntoView().should('be.visible');
  });
});

//PC-02 Prueba para verificar que el campo teléfono solo acepte números
describe('PC-02 Prueba para verificar que el campo teléfono solo acepte números', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('El campo teléfono solo acepta números', () => {
    cy.contains('Crear reporte').click();
    cy.get('input[name="telefono"]').type('abcde12345').should('have.value', '12345');
  });
});

//PC-03 Pruebas para seleccionar problemas por departamento
describe('PC-03 Pruebas para seleccionar problemas por departamento', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('No permitir seleccionar un problema sin un departamento seleccionado', () => {
    cy.contains('Crear reporte').click();

    // Verificar que está deshabilitada la lista de problemas
    cy.get('select[name="problema"]').should('be.disabled');

    // Seleccionar un departamento
    cy.get('select[name="departamento"] option').should('have.length.greaterThan', 1);
    cy.get('select[name="departamento"]').select('Alumbrado público');

    // Verificar que ahora está habilitada la lista de problemas
    cy.get('select[name="problema"]').should('not.be.disabled');
  });
});

//PC-04 Prueba para comprobación de inserciones en la base de datos
describe('PC-04 Prueba para comprobación de inserciones en la base de datos', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Comprobar que se inserta un reporte en la base de datos al enviar', () => {
    cy.contains('Crear reporte').click();

    // Llenar los campos obligatorios del formulario
    cy.get('select[name="departamento"] option').should('have.length.greaterThan', 1);
    cy.get('select[name="departamento"]').select('Alumbrado público');
    cy.get('select[name="problema"]').should('not.be.disabled');
    cy.get('select[name="problema"]').select(1);

    cy.get('textarea[name="descripcion"]').type('Iluminación de la calle no funciona correctamente');
    cy.get('input[name="nombre"]').type('Juan Pérez');
    cy.get('input[name="telefono"]').type('6672145512');
    cy.get('#inputFotoFile').selectFile('cypress/fixtures/evidencia.jpg', { force: true });
    cy.get('.btn-abrir-mapa').click();
    cy.get('.btn-confirmar-dir').click();

    // Enviar el formulario
    cy.get('.panel-form button[type="submit"]').click();

    cy.get('.modal-reporte-exitoso').should('be.visible').and('contain', '¡Reporte enviado con éxito!');
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
    cy.get('textarea[name="descripcion"]').type(descripcionLarga);

    // Verificar que el valor del campo descripción no exceda los 600 caracteres
    cy.get('textarea[name="descripcion"]').invoke('val').should('have.length', 600);

    // Verificar que sean como máximo 600 caracteres
    cy.get('textarea[name="descripcion"]').should('have.attr', 'maxlength', '600');
  });
});