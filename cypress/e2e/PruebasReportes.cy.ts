// https://on.cypress.io/api
/*
VA A SER NECESARIO QUE LOS CAMPOS QUE ESTÁN SE LE AGREGUE UN NAME PARA PODER REALIZAR MEJOR LAS PRUEBAS
DEBIDO A QUE LOS SELECTORES DE LOS CAMPOS ESTÁN HECHOS POR CLASES Y ESTO PUEDE CAMBIAR EN CUALQUIER MOMENTO.
*/



//P-01 pruebas de campos obligatorios
//En el campo del teléfono, cambiar el tipo de "tel" a "number" u otro tipo de dato para que solo acepte números (O validar que solo sean números)

describe('Pruebas para el envío de reportes', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/departamentos*', { fixture: 'departamentos.json' }).as('getDepartamentos');
    cy.visit('/')
    cy.contains('Crear reporte').click();
  });
  it('Los campos obligatorios del formulario no estén vacíos al enviar', () => {
    //Abrir el formulario de reportes
    cy.get('.btn-agregar').should('be.visible').click();
    cy.wait('@getDepartamentos');



    //Enviar el formulario sin llenar los campos obligatorios
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Selecciona el departamento').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Selecciona el problema').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'La descripción es obligatoria').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'El teléfono es obligatorio').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Por favor selecciona una ubicación en el mapa').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Debes adjuntar una foto de evidencia').scrollIntoView().should('be.visible');



    //Llenar el campo teléfono con menos de 10 dígitos y enviar el formulario
    //cy.get('input[name="telefono"]').type('66721455');
    cy.get('input[type="tel"]').type('66721455');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Ingresa un número válido de 10 dígitos').should('be.visible');



    //Llenar el campo teléfono con 10 dígitos pero sin seleccionar ubicación ni adjuntar evidencia y enviar el formulario
    //cy.get('input[name="telefono"]').clear().type('6672145512');
    cy.get('input[type="tel"]').clear().type('6672145512');
    cy.get('.panel-form button[type="submit"]').click();
    cy.contains('.msg-error', 'Ingresa un número válido de 10 dígitos').should('not.exist');
    cy.contains('.msg-error', 'Por favor selecciona una ubicación en el mapa').scrollIntoView().should('be.visible');
    cy.contains('.msg-error', 'Debes adjuntar una foto de evidencia').scrollIntoView().should('be.visible');
  });
})

//P-02 prueba de datos validos en el campo 
//Cambiar la leyenda del campo del teléfono para que sea más clara
describe('Prueba para verificar que el campo teléfono solo acepte números', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Crear reporte').click();
  });
  it('El campo teléfono solo acepta números', () => {
    //Abrir el formulario de reportes
    cy.get('.btn-agregar').should('be.visible').click();

    //cy.get('input[name="telefono"]').type('abcde12345').should('have.value', '12345');
    cy.get('input[type="tel"]').type('abcde12345').should('have.value', '12345');
    
  });
})

//P-03 prueba en selección
describe('Pruebas para seleccionar problemas por departamento', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/departamentos*', { fixture: 'departamentos.json' }).as('getDepartamentos');
    cy.intercept('GET', '**/rest/v1/problemas*', { fixture: 'problemas.json' }).as('getProblemas');
    cy.visit('/')
    cy.contains('Crear reporte').click();
  });
  it('No permitir seleccionar un problema sin un departamento seleccionado', () => {
    //Abrir el formulario de reportes
    cy.get('.btn-agregar').should('be.visible').click();
    cy.wait('@getDepartamentos');

    //Verificar que está deshabilitado la lista de problemas
    //cy.get('select[name="problema"]').should('be.disabled');
    cy.get('.panel-form select').eq(1).should('be.disabled');

    //Seleccionar un departamento
    //cy.get('select[name="departamento"]').select('Alumbrado Público y Eficiencia Energética');
    cy.get('.panel-form select').eq(0).select('Alumbrado Público y Eficiencia Energética');
    cy.wait('@getProblemas');

    //Verificar que ahora está habilitado la lista de problemas
    //cy.get('select[name="problema"]').should('not.be.disabled');
    cy.get('.panel-form select').eq(1).should('not.be.disabled');

  });
})

//P-04 prueba en la BD
describe('Prueba para comprobación de inserciones en la base de datos', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/departamentos*', { fixture: 'departamentos.json' }).as('getDepartamentos');
    cy.intercept('GET', '**/rest/v1/problemas*', { fixture: 'problemas.json' }).as('getProblemas');
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'alert').as('alertaExito');
      },
    })
    cy.contains('Crear reporte').click();
  })
  it('Comprobar que se inserta un reporte en la base de datos al enviar', () => {
    //Abrir el formulario de reportes
    cy.get('.btn-agregar').should('be.visible').click();
    cy.wait('@getDepartamentos');
    
    //Llenar los campos obligatorios del formulario
    //cy.get('select[name="departamento"]').select('Alumbrado Público y Eficiencia Energética');
    cy.get('.panel-form select').eq(0).select('Alumbrado Público y Eficiencia Energética');
    cy.wait('@getProblemas');
    //cy.get('select[name="problema"]').select(1);
    cy.get('.panel-form select').eq(1).select(1);

    //cy.get('textarea[name="descripcion"]').type('Iluminación de la calle no funciona correctamente');
    cy.get('textarea[placeholder="Describe el problema..."]').type('Iluminación de la calle no funciona correctamente');
    //cy.get('input[name="nombre"]').type('Juan Pérez');
    cy.get('input[placeholder="Si se deja vacío, será Anónimo"]').type('Juan Pérez');
    //cy.get('input[name="telefono"]').type('6672145512');
    cy.get('input[type="tel"]').type('6672145512');
    cy.get('#inputFotoFile').selectFile('cypress/fixtures/evidencia.jpg', { force: true });
    cy.get('.btn-abrir-mapa').click();
    cy.get('.btn-confirmar-dir').click();

    //Enviar el formulario
    cy.get('.panel-form button[type="submit"]').click();
    cy.get('@alertaExito').should('have.been.calledWith', '¡Reporte enviado exitosamente!');
  })
})

//P-05 prueba de validar límite de caracteres en el campo descripción
describe('Prueba para validar límite de caracteres en el campo descripción', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/departamentos*', { fixture: 'departamentos.json' }).as('getDepartamentos');
    cy.intercept('GET', '**/rest/v1/problemas*', { fixture: 'problemas.json' }).as('getProblemas');
    cy.visit('/')
    cy.contains('Crear reporte').click();
  })
  it('Validar que el campo descripción no acepte más de 600 caracteres', () => {
    //Abrir el formulario de reportes
    cy.get('.btn-agregar').should('be.visible').click();
    cy.wait('@getDepartamentos');

    //Llenar el campo descripción con más de 600 caracteres
    const descripcionLarga = 'a'.repeat(601);
    //cy.get('textarea[name="descripcion"]').type(descripcionLarga);
    cy.get('textarea[placeholder="Describe el problema..."]').type(descripcionLarga);

    //Verificar que el valor del campo descripción no exceda los 600 caracteres
    //cy.get('textarea[name="descripcion"]').invoke('val').should('have.length', 600);
    cy.get('textarea[placeholder="Describe el problema..."]').invoke('val').should('have.length', 600);


    //Verificar que sean como máximo 600 caracteres
    //cy.get('textarea[name="descripcion"]').should('have.attr', 'maxlength', '600');
    cy.get('textarea[placeholder="Describe el problema..."]').should('have.attr', 'maxlength', '600');
  })
})


