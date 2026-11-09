// Comprueba que un mensaje de error sea visible. Acepta texto o expresión regular.
const verError = (texto: string | RegExp) => {
  cy.contains('.msg-error', texto).scrollIntoView();
  cy.contains('.msg-error', texto).should('be.visible');
};

// Marca la casilla de términos (requerida por enviarReporte antes de subir la foto)
const aceptarTerminos = () => {
  cy.get('#aceptaTerminos').check({ force: true });
};

// ─────────────────────────────────────────────────────────────
// PC-01 Pruebas para el envío de reportes
// ─────────────────────────────────────────────────────────────
describe('PC-01 Pruebas para el envío de reportes', () => {
  beforeEach(() => {
    cy.intercept({ method: 'POST', url: '**/reporte' }).as('insertReporte');
    cy.visit('/');
    cy.contains('Crear reporte').click();
  });

  it('Muestra errores en los campos obligatorios vacíos y no envía nada', () => {
    cy.get('.panel-form button[type="submit"]').click();

    verError('Selecciona el departamento');
    verError('Selecciona el problema');
    verError('La descripción es obligatoria');
    verError('El teléfono es obligatorio');
    verError('Por favor selecciona una ubicación en el mapa');
    verError('Debes adjuntar una foto de evidencia');

    cy.get('@insertReporte.all').should('have.length', 0);
  });

  it('Muestra error si el teléfono tiene menos de 10 dígitos', () => {
    cy.get('input[name="telefono"]').type('66721455');

    // submit() evita que la validación nativa (minlength) bloquee el envío
    // y deja que actúe la validación del componente
    cy.get('.panel-form').submit();

    verError(/10 dígitos/);
    cy.get('@insertReporte.all').should('have.length', 0);
  });

  it('Con 10 dígitos desaparece el error de teléfono', () => {
    cy.get('input[name="telefono"]').type('6672145512');
    cy.get('.panel-form button[type="submit"]').click();

    cy.contains('.msg-error', /10 dígitos/).should('not.exist');
    verError('Por favor selecciona una ubicación en el mapa');
    verError('Debes adjuntar una foto de evidencia');

    cy.get('@insertReporte.all').should('have.length', 0);
  });
});

// ─────────────────────────────────────────────────────────────
// PC-02 Prueba para verificar que el campo teléfono solo acepte números
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// PC-03 Pruebas para seleccionar problemas por departamento
// ─────────────────────────────────────────────────────────────
describe('PC-03 Pruebas para seleccionar problemas por departamento', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('No permitir seleccionar un problema sin un departamento seleccionado', () => {
    cy.contains('Crear reporte').click();

    cy.get('select[name="departamento"] option', { timeout: 10000 }).should('have.length.greaterThan', 1);
    cy.get('select[name="problema"]').should('be.disabled');

    cy.get('select[name="departamento"]').select('Alumbrado público');
    cy.get('select[name="problema"]').should('not.be.disabled');
  });
});
// ─────────────────────────────────────────────────────────────
// PC-04 Prueba para validar límite de caracteres en el campo descripción
// ─────────────────────────────────────────────────────────────
describe('PC-04 Prueba para validar límite de caracteres en el campo descripción', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Validar que el campo descripción no acepte más de 600 caracteres', () => {
    cy.contains('Crear reporte').click();

    const descripcionLarga = 'a'.repeat(601);
    cy.get('textarea[name="descripcion"]').type(descripcionLarga, { delay: 0 });

    cy.get('textarea[name="descripcion"]').invoke('val').should('have.length', 600);
    cy.get('textarea[name="descripcion"]').should('have.attr', 'maxlength', '600');
  });
});