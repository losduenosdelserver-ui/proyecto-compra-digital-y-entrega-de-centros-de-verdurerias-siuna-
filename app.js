// VerduNica · Siuna
// Conformidad: Estructura de tres archivos. LocalStorage como Blackboard.
// Principio de Auditoría: cada función documenta su entrada, salida y efecto lateral.

'use strict';

/* =========================================================================
 * Constantes y Claves de Almacenamiento
 * ========================================================================= */
const STORAGE_KEY = 'verduNica_products';
const CATEGORIAS_PERMITIDAS = ['fruta', 'verdura', 'planta/hierba', 'raiz/tuberculo'];

/* Roles de acceso: cliente (usuario), auditor (jurado), admin (vendedor).
 * La seguridad se limita a rutas de acceso locales, sin OAuth ni MFA. */
const ROLES = {
  CLIENTE: 'cliente',
  AUDITOR: 'auditor',
  ADMIN: 'admin'
};

/* Credenciales locales de acceso (rutas de acceso local). */
const CLAVE_ADMIN = 'eddy2026';
const CLAVE_AUDITOR = 'invitado2026';

/* Estado lúdico de la sesión. Por defecto el rol es 'cliente'. */
let sesionActual = {
  rol: ROLES.CLIENTE,
  vendedorId: null,
  nombreTienda: ''
};

/* Datos de ejemplo iniciales para la "pizarra" (blackboard). */
const PRODUCTOS_EJEMPLO = [
  {
    id: Date.now() + 1,
    name: 'Tomate',
    price: 15,
    category: 'verdura',
    image: '',
    delivery: true,
    location: 'Salida a Waslala',
    phone: '+50500000001'
  },
  {
    id: Date.now() + 2,
    name: 'Plátano',
    price: 5,
    category: 'fruta',
    image: '',
    delivery: false,
    location: 'Salida a Waslala',
    phone: '+50500000001'
  },
  {
    id: Date.now() + 3,
    name: 'Cilantro',
    price: 10,
    category: 'planta/hierba',
    image: '',
    delivery: true,
    location: 'Salida a Waslala',
    phone: '+50500000001'
  }
];

/* IDs del DOM */
const catalogGrid = document.getElementById('catalog-grid');
const errorLog = document.getElementById('error-log');
const adminTableBody = document.getElementById('admin-table-body');
const productForm = document.getElementById('product-form');
const registroSection = document.getElementById('registro');
const thActions = document.getElementById('th-actions');
const searchInput = document.getElementById('search-input');
const storeName = document.getElementById('store-name');

/* Estado de búsqueda del catálogo. */
let busqueda = '';

/* =========================================================================
 * getSessionRole()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : String con el rol activo ('cliente', 'auditor' o 'admin').
 * Efecto    : devuelve el rol de sesionActual (default 'cliente').
 * ========================================================================= */
function getSessionRole() {
  return sesionActual.rol;
}

/* =========================================================================
 * setSessionRole(rol)
 * -------------------------------------------------------------------------
 * Entrada   : rol (String) válido dentro de ROLES.
 * Salida    : void.
 * Efecto    : asigna el rol activo en sesionActual.
 * ========================================================================= */
function setSessionRole(rol) {
  sesionActual.rol = rol;
}

/* =========================================================================
 * esAdmin()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Boolean. true si la sesión es de rol Admin.
 * Efecto    : ninguno (lectura pura).
 * ========================================================================= */
function esAdmin() {
  return getSessionRole() === ROLES.ADMIN;
}

/* =========================================================================
 * esAuditor()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Boolean. true si la sesión es de rol Auditor.
 * Efecto    : ninguno (lectura pura).
 * ========================================================================= */
function esAuditor() {
  return getSessionRole() === ROLES.AUDITOR;
}

/* =========================================================================
 * requiereEscritura()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Boolean. true solo si la sesión es Admin (permite escritura).
 * Efecto    : si el rol no es Admin, inyecta mensaje de acceso denegado
 *             en #error-log y retorna false bloqueando la mutación.
 * ========================================================================= */
function requiereEscritura() {
  if (sesionActual.rol !== ROLES.ADMIN) {
    if (errorLog) {
      errorLog.innerHTML = "⚠️ Acceso denegado: Tu rol actual no tiene permisos para modificar el catálogo del campo.";
    }
    return false;
  }
  return true;
}

/* =========================================================================
 * setRoleUI()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : ajusta el DOM según el rol activo.
 *             cliente: oculta formulario y panel de administración.
 *             auditor: muestra panel del vendedor pero oculta formulario
 *                     y acciones de mutación.
 *             admin  : muestra formulario completo y todas las acciones.
 * ========================================================================= */
function setRoleUI() {
  const admin = esAdmin();
  const auditor = esAuditor();

  const panelVendedores = document.getElementById('tab-vendedores');
  if (panelVendedores) {
    panelVendedores.style.display = admin || auditor ? '' : 'none';
  }

  if (registroSection) {
    registroSection.style.display = admin ? '' : 'none';
  }
  if (thActions) {
    thActions.style.display = admin ? '' : 'none';
  }

  aplicarNombreTienda();
  actualizarVistas();
}

/* =========================================================================
 * iniciarSesion()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : lee la credencial ingresada. 'eddy2026' -> admin,
 *             'invitado2026' -> auditor, otra -> mensaje y rol cliente.
 * ========================================================================= */
function iniciarSesion() {
  const clave = prompt('Ingrese la clave de acceso (vendedor o invitado):');
  if (clave === CLAVE_ADMIN) {
    setSessionRole(ROLES.ADMIN);
    const inputStore = document.getElementById('input-store');
    if (inputStore && inputStore.value.trim()) {
      sesionActual.nombreTienda = inputStore.value.trim();
    }
  } else if (clave === CLAVE_AUDITOR) {
    setSessionRole(ROLES.AUDITOR);
    limpiarError();
  } else {
    inyectarError('Clave incorrecta');
    setSessionRole(ROLES.CLIENTE);
  }
  setRoleUI();
}

/* =========================================================================
 * cerrarSesion()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : revierte la sesión a rol de solo lectura (cliente).
 * ========================================================================= */
function cerrarSesion() {
  setSessionRole(ROLES.CLIENTE);
  sesionActual.nombreTienda = '';
  setRoleUI();
}

/* =========================================================================
 * aplicarNombreTienda()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra el nombre de la tienda del vendedor en #store-name,
 *             o el nombre genérico del mercado si no hay sesión admin.
 * ========================================================================= */
function aplicarNombreTienda() {
  if (!storeName) {
    return;
  }
  if (esAdmin() && sesionActual.nombreTienda) {
    storeName.textContent = sesionActual.nombreTienda;
  } else {
    storeName.textContent = 'Mercado de Siuna';
  }
}

/* =========================================================================
 * getProductsFromBlackboard()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array de productos (Array<Object>).
 * Efecto    : método puro de lectura central. Si la llave no existe o está
 *             vacía, inicializa la pizarra con PRODUCTOS_EJEMPLO, la persiste
 *             con JSON.stringify() y la devuelve. Evita lecturas repetitivas.
 * ========================================================================= */
function getProductsFromBlackboard() {
  let raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const iniciales = JSON.parse(JSON.stringify(PRODUCTOS_EJEMPLO));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
    raw = localStorage.getItem(STORAGE_KEY);
  }

  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================================
 * setProductsOnBlackboard(lista)
 * -------------------------------------------------------------------------
 * Entrada   : lista (Array) de productos serializables.
 * Salida    : void.
 * Efecto    : serializa lista y la persiste en localStorage bajo la llave
 *             verduNica_products.
 * ========================================================================= */
function setProductsOnBlackboard(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

/* =========================================================================
 * inyectarError(mensaje)
 * -------------------------------------------------------------------------
 * Entrada   : mensaje (String) de error a mostrar.
 * Salida    : void.
 * Efecto    : escribe mensaje en el elemento #error-log del DOM.
 * ========================================================================= */
function inyectarError(mensaje) {
  errorLog.textContent = mensaje;
}

/* =========================================================================
 * limpiarError()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : vacía el contenido de #error-log asignando innerHTML = "".
 * ========================================================================= */
function limpiarError() {
  errorLog.innerHTML = '';
}

/* =========================================================================
 * renderCatalog(products)
 * -------------------------------------------------------------------------
 * Entrada   : products (Array) de productos (catálogo del cliente).
 * Salida    : void.
 * Efecto    : re-render las tarjetas del catálogo en #catalog-grid.
 * ========================================================================= */
function renderCatalog(products) {
  catalogGrid.innerHTML = '';

  if (products.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No hay productos aún.';
    catalogGrid.appendChild(note);
    return;
  }

  products.forEach(function (p) {
    const card = document.createElement('article');
    card.className = 'card';

    const img = document.createElement('img');
    img.className = 'product-image';
    img.alt = p.name || 'producto';
    img.src = p.image
      ? p.image
      : 'data:image/svg+xml;base64,' +
        btoa('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="#f4f9f4"/></svg>');

    const name = document.createElement('p');
    name.className = 'card-name';
    name.textContent = p.name || 'Sin nombre';

    const price = document.createElement('p');
    price.className = 'card-price';
    price.textContent = 'C$ ' + Number(p.price).toFixed(2);

    const category = document.createElement('span');
    category.className = 'card-category';
    category.textContent = p.category || '';

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(price);
    card.appendChild(category);

    if (p.location) {
      const seller = document.createElement('span');
      seller.className = 'card-seller';
      seller.textContent = p.location;
      card.appendChild(seller);
    }

    if (p.delivery) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Envío disponible';
      card.appendChild(badge);
    }

    catalogGrid.appendChild(card);
  });
}

/* =========================================================================
 * renderSellerTable(products)
 * -------------------------------------------------------------------------
 * Entrada   : products (Array) de productos (tabla del vendedor).
 * Salida    : void.
 * Efecto    : re-render la tabla de administración en #admin-table-body.
 * ========================================================================= */
function renderSellerTable(products) {
  adminTableBody.innerHTML = '';
  const admin = esAdmin();
  const numCols = admin ? 5 : 4;

  if (products.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = numCols;
    cell.className = 'empty-note';
    cell.textContent = 'No hay productos registrados.';
    row.appendChild(cell);
    adminTableBody.appendChild(row);
    return;
  }

  products.forEach(function (p) {
    const row = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = p.name || '';

    const tdPrice = document.createElement('td');
    tdPrice.textContent = 'C$ ' + Number(p.price).toFixed(2);

    const tdCategory = document.createElement('td');
    tdCategory.textContent = p.category || '';

    const tdDelivery = document.createElement('td');
    tdDelivery.textContent = p.delivery ? 'Sí' : 'No';

    row.appendChild(tdName);
    row.appendChild(tdPrice);
    row.appendChild(tdCategory);
    row.appendChild(tdDelivery);

    if (admin) {
      const tdActions = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'btn-delete';
      btn.textContent = 'Eliminar';
      btn.dataset.id = p.id;
      btn.addEventListener('click', function () {
        deleteProduct(p.id);
      });
      tdActions.appendChild(btn);
      row.appendChild(tdActions);
    }

    adminTableBody.appendChild(row);
  });
}

/* =========================================================================
 * actualizarVistas()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : refresca catálogo del cliente y tabla del vendedor leyendo
 *             siempre desde la pizarra (blackboard).
 * ========================================================================= */
function actualizarVistas() {
  const products = getProductsFromBlackboard();
  renderSellerTable(products);

  const filtrados = products.filter(function (p) {
    const nombre = (p.name || '').toLowerCase();
    return nombre.indexOf(busqueda) !== -1;
  });
  renderCatalog(filtrados);
}

/* =========================================================================
 * deleteProduct(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (Number) del producto a eliminar (generado con Date.now()).
 * Salida    : void.
 * Efecto    : filtra el array en memoria excluyendo el id, escribe el nuevo
 *             array en la pizarra y ejecuta actualizarVistas(). Atómico.
 * ========================================================================= */
function deleteProduct(id) {
  if (!requiereEscritura()) {
    return;
  }
  let products = getProductsFromBlackboard();
  products = products.filter(function (p) {
    return p.id !== id;
  });
  setProductsOnBlackboard(products);
  actualizarVistas();
}

/* =========================================================================
 * validarRegistro(datos)
 * -------------------------------------------------------------------------
 * Entrada   : datos (Object) pendiente de registro.
 * Salida    : true si es válido; false si la categoría no es permitida.
 * Efecto    : sobre #error-log inyecta "Categoría no permitida" en caso inválido.
 * ========================================================================= */
function validarRegistro(datos) {
  if (!CATEGORIAS_PERMITIDAS.includes(datos.category.toLowerCase())) {
    inyectarError('Categoría no permitida');
    return false;
  }
  limpiarError();
  return true;
}

/* =========================================================================
 * manejarSubmit(evento)
 * -------------------------------------------------------------------------
 * Entrada   : evento (Event) de submit del formulario.
 * Salida    : void.
 * Efecto    : captura inputs, valida, crea objeto con id Date.now(),
 *             lo agrega a 'products', persiste y re-render. Previene recarga.
 * ========================================================================= */
function manejarSubmit(evento) {
  evento.preventDefault();

  /* Limpiar el #error-log en cada reintento para evitar advertencia pegada. */
  limpiarError();

  if (!requiereEscritura()) {
    return;
  }

  const name = document.getElementById('input-name').value.trim();
  const price = Number(document.getElementById('input-price').value);
  const category = document.getElementById('input-category').value;
  const image = document.getElementById('input-image').value.trim();
  const delivery = document.getElementById('input-delivery').checked;
  const location = document.getElementById('input-location').value.trim();
  const phone = document.getElementById('input-phone').value.trim();

  const datos = {
    name: name,
    price: price,
    category: category,
    image: image,
    delivery: delivery,
    location: location,
    phone: phone
  };

  if (!validarRegistro(datos)) {
    return;
  }

  const products = getProductsFromBlackboard();
  const nuevo = { id: Date.now() };
  Object.assign(nuevo, datos);
  products.push(nuevo);
  setProductsOnBlackboard(products);
  actualizarVistas();
  productForm.reset();
}

/* =========================================================================
 * Inicialización
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : vincula handlers y render inicial al cargar la página.
 * ========================================================================= */
productForm.addEventListener('submit', manejarSubmit);

/* Botones de acceso (login/cierre de sesión del vendedor). */
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
if (btnLogin) {
  btnLogin.addEventListener('click', iniciarSesion);
}
if (btnLogout) {
  btnLogout.addEventListener('click', cerrarSesion);
}

/* Buscador del catálogo. */
if (searchInput) {
  searchInput.addEventListener('input', function () {
    busqueda = searchInput.value.trim().toLowerCase();
    actualizarVistas();
  });
}

setRoleUI();
actualizarVistas();