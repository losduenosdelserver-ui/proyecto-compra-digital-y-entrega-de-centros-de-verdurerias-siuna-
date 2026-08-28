// VerduNica · Siuna
// Conformidad: Estructura de tres archivos. LocalStorage como Blackboard.
// Principio de Auditoría: cada función documenta su entrada, salida y efecto lateral.
// Modelo multi-tienda: cada vendedor posee su propia tienda y su propio catálogo.

'use strict';

/* =========================================================================
 * Constantes y Claves de Almacenamiento
 * ========================================================================= */
const STORAGE_KEY = 'verduNica_tiendas';
const STORAGE_KEY_MANDADEROS = 'verduNica_mandaderos';
const CATEGORIAS_PERMITIDAS = ['fruta', 'verdura', 'planta/hierba', 'raiz/tuberculo'];

/* Roles de acceso: cliente (usuario), auditor (jurado), admin (vendedor).
 * La seguridad se limita a rutas de acceso locales, sin OAuth ni MFA. */
const ROLES = {
  CLIENTE: 'cliente',
  AUDITOR: 'auditor',
  ADMIN: 'admin',
  MANDADERO: 'mandadero'
};

/* Credenciales locales de acceso (rutas de acceso local). */
const CLAVE_AUDITOR = 'invitado2026';

/* Estado lúdico de la sesión. Por defecto el rol es 'cliente'. */
let sesionActual = {
  rol: ROLES.CLIENTE,
  tiendaId: null,     // tienda activa para el admin (su tienda) o la tienda que ve el cliente
  tiendaNombre: '',
  mandaderoId: null,  // mandadero en sesión (rol mandadero)
  mandaderoNombre: ''
};

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
  const rolesValidos = Object.keys(ROLES).map(function (k) {
    return ROLES[k];
  });
  if (rolesValidos.indexOf(rol) === -1) {
    rol = ROLES.CLIENTE;
  }
  sesionActual.rol = rol;
}

/* Estado de búsqueda de tiendas (pantalla inicial del cliente). */
let busquedaTienda = '';

/* Detalle de la tienda elegida por el cliente para poder ver su catálogo. */
let tiendaVistaId = null;

/* =========================================================================
 * TIENDAS_INICIALES()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array con las tiendas de ejemplo.
 * Efecto    : devuelve dos tiendas: "Tramo Zeledón" (clave eddy2026) con
 *             catálogo de ejemplo y "Esling" (clave ok) con catálogo vacío.
 * ========================================================================= */
function tiendasIniciales() {
  const t = Date.now();
  return [
    {
      id: 'tz',
      nombre: 'Tramo Zeledón',
      clave: 'eddy2026',
      rol: ROLES.ADMIN,
      productos: [
        {
          id: t + 1,
          name: 'Tomate',
          price: 15,
          category: 'verdura',
          image: '',
          delivery: true,
          location: 'Tramo Zeledón',
          phone: '+50500000001'
        },
        {
          id: t + 2,
          name: 'Plátano',
          price: 5,
          category: 'fruta',
          image: '',
          delivery: false,
          location: 'Tramo Zeledón',
          phone: '+50500000001'
        },
        {
          id: t + 3,
          name: 'Cilantro',
          price: 10,
          category: 'planta/hierba',
          image: '',
          delivery: true,
          location: 'Tramo Zeledón',
          phone: '+50500000001'
        }
      ]
    },
    {
      id: 'esling',
      nombre: 'Esling',
      clave: 'ok',
      rol: ROLES.ADMIN,
      productos: []
    }
  ];
}

/* IDs del DOM */
const catalogGrid = document.getElementById('catalog-grid');
const tiendaGrid = document.getElementById('tienda-grid');
const errorLog = document.getElementById('error-log');
const adminTableBody = document.getElementById('admin-table-body');
const productForm = document.getElementById('product-form');
const registroSection = document.getElementById('registro');
const thActions = document.getElementById('th-actions');
const searchInput = document.getElementById('search-input');
const storeName = document.getElementById('store-name');
const searchTienda = document.getElementById('search-tienda');
const catalogoSection = document.getElementById('catalogo');
const vistasSection = document.getElementById('vista-tiendas');

/* =========================================================================
 * getTiendasDeBlackboard()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array de tiendas (Array<Object>).
 * Efecto    : método puro de lectura central. Si la llave no existe o está
 *             vacía, inicializa la pizarra con TIENDAS_INICIALES() y la
 *             persiste en localStorage.
 * ========================================================================= */
function getTiendasDeBlackboard() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    raw = JSON.stringify(tiendasIniciales());
    localStorage.setItem(STORAGE_KEY, raw);
  }
  try {
    const data = JSON.parse(raw);
    const lista = Array.isArray(data) ? data : [];
    return lista.map(function (t) {
      return Object.assign({}, t, {
        productos: Array.isArray(t.productos) ? t.productos : []
      });
    });
  } catch (e) {
    const iniciales = tiendasIniciales();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
    return iniciales;
  }
}

/* =========================================================================
 * setTiendasOnBlackboard(lista)
 * -------------------------------------------------------------------------
 * Entrada   : lista (Array) de tiendas serializables.
 * Salida    : void.
 * Efecto    : serializa lista y la persiste en localStorage.
 * ========================================================================= */
function setTiendasOnBlackboard(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

/* =========================================================================
 * getMandaderosDeBlackboard()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array de mandaderos (repartidores) registrados.
 * Efecto    : lectura pura. Inicializa `verduNica_mandaderos` si no existe.
 * ========================================================================= */
function getMandaderosDeBlackboard() {
  let raw = localStorage.getItem(STORAGE_KEY_MANDADEROS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_MANDADEROS, JSON.stringify([]));
    raw = localStorage.getItem(STORAGE_KEY_MANDADEROS);
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================================
 * setMandaderosOnBlackboard(lista)
 * -------------------------------------------------------------------------
 * Entrada   : lista (Array) de mandaderos serializables.
 * Salida    : void.
 * Efecto    : serializa lista y la persiste en localStorage.
 * ========================================================================= */
function setMandaderosOnBlackboard(lista) {
  localStorage.setItem(STORAGE_KEY_MANDADEROS, JSON.stringify(lista));
}

/* =========================================================================
 * buscarTiendaPorId(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (String) de la tienda.
 * Salida    : Object tienda o null si no existe.
 * Efecto    : lectura pura desde la pizarra.
 * ========================================================================= */
function buscarTiendaPorId(id) {
  return getTiendasDeBlackboard().find(function (t) {
    return String(t.id) === String(id);
  }) || null;
}

/* =========================================================================
 * getSessionRole()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : String con el rol activo.
 * ========================================================================= */
function getSessionRole() {
  return sesionActual.rol;
}

/* =========================================================================
 * esAdmin() / esAuditor()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Boolean según el rol de la sesión.
 * ========================================================================= */
function esAdmin() {
  return getSessionRole() === ROLES.ADMIN;
}
function esAuditor() {
  return getSessionRole() === ROLES.AUDITOR;
}
function esMandadero() {
  return getSessionRole() === ROLES.MANDADERO;
}

/* =========================================================================
 * requiereEscritura()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Boolean. true solo si la sesión es Admin.
 * Efecto    : si el rol no es Admin, inyecta mensaje de acceso denegado y
 *             retorna false bloqueando la mutación.
 * ========================================================================= */
function requiereEscritura() {
  if (!esAdmin()) {
    if (errorLog) {
      errorLog.innerHTML = "⚠️ Acceso denegado: Tu rol actual no tiene permisos para modificar el catálogo.";
    }
    return false;
  }
  return true;
}

/* =========================================================================
 * inyectarError(mensaje) / limpiarError()
 * -------------------------------------------------------------------------
 * Entrada   : mensaje (String).
 * Salida    : void.
 * Efecto    : escribe / vacía el elemento #error-log.
 * ========================================================================= */
function inyectarError(mensaje) {
  errorLog.textContent = mensaje;
}
function limpiarError() {
  errorLog.innerHTML = '';
}

/* =========================================================================
 * setRoleUI()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : ajusta el DOM según el rol activo.
 *             cliente: oculta formulario y panel de administración, y
 *                     muestra la búsqueda de tiendas.
 *             auditor: muestra panel del vendedor pero sin mutación.
 *             admin  : muestra formulario y panel de SU tienda.
 * ========================================================================= */
function setRoleUI() {
  const admin = esAdmin();
  const auditor = esAuditor();
  const mandadero = esMandadero();

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

  /* Pantalla del mandadero: su propio panel (aún sin reparto de pedidos). */
  const panelMandadero = document.getElementById('panel-mandadero');
  if (panelMandadero) {
    panelMandadero.style.display = mandadero ? '' : 'none';
  }

  /* Pantalla inicial del cliente: solo buscador de tiendas. */
  if (vistasSection) {
    vistasSection.style.display = (!admin && !auditor && !mandadero && !tiendaVistaId) ? '' : 'none';
  }
  /* La sección del catálogo se muestra solo cuando hay una tienda elegida
   * (cliente) o en sesión de vendedor/auditor. En la pantalla inicial queda
   * completamente oculta para mantener la interfaz limpia. */
  if (catalogoSection) {
    catalogoSection.style.display = (admin || auditor || tiendaVistaId) ? '' : 'none';
  }

  aplicarNombreTienda();
  actualizarPanelMandadero();
  actualizarVistas();
}

/* =========================================================================
 * aplicarNombreTienda()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra en #store-name el nombre de la tienda activa (la del
 *             vendedor en sesión o la que el cliente haya elegido), o el
 *             texto genérico del mercado si no hay tienda activa.
 * ========================================================================= */
function aplicarNombreTienda() {
  if (!storeName) {
    return;
  }
  if (esAdmin() && sesionActual.tiendaNombre) {
    storeName.textContent = sesionActual.tiendaNombre;
  } else if (esMandadero() && sesionActual.mandaderoNombre) {
    storeName.textContent = sesionActual.mandaderoNombre;
  } else if (tiendaVistaId) {
    const t = buscarTiendaPorId(tiendaVistaId);
    storeName.textContent = t ? t.nombre : 'Mercado de Siuna';
  } else {
    storeName.textContent = 'Mercado de Siuna';
  }
}

/* =========================================================================
 * actualizarPanelMandadero()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra el nombre del mandadero en su panel de bienvenida.
 * ========================================================================= */
function actualizarPanelMandadero() {
  const bienvenida = document.getElementById('mandadero-bienvenida');
  if (bienvenida && sesionActual.mandaderoNombre) {
    bienvenida.textContent = 'Bienvenido/a, ' + sesionActual.mandaderoNombre + '.';
  }
}

/* =========================================================================
 * iniciarSesion()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : abre el modal de acceso HTML (en pantalla) para capturar la
 *             clave sin depender del prompt() nativo del navegador.
 * ========================================================================= */
function iniciarSesion() {
  const modal = document.getElementById('login-modal');
  const inputClave = document.getElementById('input-clave');
  const modalError = document.getElementById('modal-error');
  if (modal && inputClave) {
    modal.hidden = false;
    inputClave.value = '';
    if (modalError) {
      modalError.textContent = '';
    }
    inputClave.focus();
  }
}

/* =========================================================================
 * cerrarModalAcceso()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : oculta el modal de acceso y limpia el campo de clave.
 * ========================================================================= */
function cerrarModalAcceso() {
  const modal = document.getElementById('login-modal');
  const inputClave = document.getElementById('input-clave');
  if (modal) {
    modal.hidden = true;
  }
  if (inputClave) {
    inputClave.value = '';
  }
}

/* =========================================================================
 * confirmarAcceso()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : lee la clave del modal. Si coincide con 'invitado2026' ->
 *             auditor; si coincide con la clave de una tienda -> admin de esa
 *             tienda; si no -> muestra "Clave incorrecta" en el modal.
 * ========================================================================= */
function confirmarAcceso() {
  const inputClave = document.getElementById('input-clave');
  const modalError = document.getElementById('modal-error');
  const clave = inputClave ? inputClave.value.trim() : '';

  if (!clave) {
    if (modalError) {
      modalError.textContent = 'Escribe una clave para continuar.';
    }
    return;
  }

  if (clave === CLAVE_AUDITOR) {
    setSessionRole(ROLES.AUDITOR);
    sesionActual.tiendaId = null;
    sesionActual.tiendaNombre = '';
    sesionActual.mandaderoId = null;
    sesionActual.mandaderoNombre = '';
    tiendaVistaId = null;
    cerrarModalAcceso();
    limpiarError();
  } else {
    const tiendas = getTiendasDeBlackboard();
    const matchVendedor = tiendas.find(function (t) {
      return t.clave === clave;
    });
    if (matchVendedor) {
      setSessionRole(ROLES.ADMIN);
      sesionActual.tiendaId = matchVendedor.id;
      sesionActual.tiendaNombre = matchVendedor.nombre;
      sesionActual.mandaderoId = null;
      sesionActual.mandaderoNombre = '';
      tiendaVistaId = null;
      cerrarModalAcceso();
      limpiarError();
    } else {
      /* No es vendedor: probar credencial de mandadero (repartidor). */
      const mandaderos = getMandaderosDeBlackboard();
      const matchMandadero = mandaderos.find(function (m) {
        return m.clave === clave;
      });
      if (matchMandadero) {
        setSessionRole(ROLES.MANDADERO);
        sesionActual.tiendaId = null;
        sesionActual.tiendaNombre = '';
        sesionActual.mandaderoId = matchMandadero.id;
        sesionActual.mandaderoNombre = matchMandadero.nombre;
        tiendaVistaId = null;
        cerrarModalAcceso();
        limpiarError();
      } else {
        if (modalError) {
          modalError.textContent = 'Clave incorrecta';
        }
        setSessionRole(ROLES.CLIENTE);
        sesionActual.tiendaId = null;
        sesionActual.tiendaNombre = '';
        sesionActual.mandaderoId = null;
        sesionActual.mandaderoNombre = '';
      }
    }
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
  sesionActual.tiendaId = null;
  sesionActual.tiendaNombre = '';
  sesionActual.mandaderoId = null;
  sesionActual.mandaderoNombre = '';
  tiendaVistaId = null;
  busquedaTienda = '';
  if (searchTienda) {
    searchTienda.value = '';
  }
  setRoleUI();
}

/* =========================================================================
 * registrarCuenta()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno (lee los inputs del modal de registro).
 * Salida    : void.
 * Efecto    : crea una cuenta según el tipo elegido:
 *             - 'vendedor'  : agrega una nueva tienda a verduNica_tiendas.
 *             - 'mandadero' : agrega un nuevo mandadero a verduNica_mandaderos.
 *             Muestra mensajes de resultado en #modal-error.
 * ========================================================================= */
function registrarCuenta() {
  const modalError = document.getElementById('modal-error');
  const nombre = document.getElementById('input-reg-nombre').value.trim();
  const tipo = document.getElementById('input-reg-tipo').value;
  const clave = document.getElementById('input-reg-clave').value.trim();

  if (!nombre || !clave) {
    if (modalError) {
      modalError.textContent = 'Completa el nombre y la clave para registrarte.';
    }
    return;
  }

  /* Evitar claves duplicadas: una misma clave no puede existir en otra tienda
   * (vendedor) ni en otro mandadero, pues el login autentica por clave. */
  const tiendasExistentes = getTiendasDeBlackboard();
  const mandaderosExistentes = getMandaderosDeBlackboard();
  const claveEnUso = tiendasExistentes.some(function (t) {
    return t.clave === clave;
  }) || mandaderosExistentes.some(function (m) {
    return m.clave === clave;
  });
  if (claveEnUso) {
    if (modalError) {
      modalError.textContent = 'Esa clave ya está en uso. Elige otra.';
    }
    return;
  }

  if (tipo === 'vendedor') {
    const duplicado = tiendasExistentes.some(function (t) {
      return t.nombre.toLowerCase() === nombre.toLowerCase();
    });
    if (duplicado) {
      if (modalError) {
        modalError.textContent = 'Ya existe una tienda con ese nombre.';
      }
      return;
    }
    tiendasExistentes.push({
      id: 't' + Date.now(),
      nombre: nombre,
      clave: clave,
      rol: ROLES.ADMIN,
      productos: []
    });
    setTiendasOnBlackboard(tiendasExistentes);
    if (modalError) {
      modalError.textContent = '✅ Tienda "' + nombre + '" registrada. Ahora ingresa con tu clave.';
    }
  } else if (tipo === 'mandadero') {
    const duplicado = mandaderosExistentes.some(function (m) {
      return m.nombre.toLowerCase() === nombre.toLowerCase();
    });
    if (duplicado) {
      if (modalError) {
        modalError.textContent = 'Ya existe un mandadero con ese nombre.';
      }
      return;
    }
    mandaderosExistentes.push({
      id: 'm' + Date.now(),
      nombre: nombre,
      clave: clave
    });
    setMandaderosOnBlackboard(mandaderosExistentes);
    if (modalError) {
      modalError.textContent = '✅ Mandadero "' + nombre + '" registrado.';
    }
  } else {
    if (modalError) {
      modalError.textContent = 'Tipo de cuenta no válido.';
    }
    return;
  }

  document.getElementById('input-reg-nombre').value = '';
  document.getElementById('input-reg-clave').value = '';
}

/* =========================================================================
 * renderMandaderos()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : re-render la lista de mandaderos registrados con su botón
 *             de eliminar. Solo se llama en sesión de vendedor (admin).
 * ========================================================================= */
function renderMandaderos() {
  const cont = document.getElementById('mandadero-list');
  if (!cont) {
    return;
  }
  cont.innerHTML = '';
  const mandaderos = getMandaderosDeBlackboard();

  if (mandaderos.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No hay mandaderos registrados.';
    cont.appendChild(note);
    return;
  }

  mandaderos.forEach(function (m) {
    const item = document.createElement('div');
    item.className = 'mandadero-item';

    const nombre = document.createElement('span');
    nombre.className = 'mandadero-nombre';
    nombre.textContent = m.nombre || 'Sin nombre';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-delete';
    btn.textContent = 'Eliminar';
    btn.addEventListener('click', function () {
      eliminarMandadero(m.id);
    });

    item.appendChild(nombre);
    item.appendChild(btn);
    cont.appendChild(item);
  });
}

/* =========================================================================
 * eliminarMandadero(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (String) del mandadero a eliminar.
 * Salida    : void.
 * Efecto    : pide confirmación y, si se acepta, elimina el mandadero de
 *             verduNica_mandaderos y refresca la lista.
 * ========================================================================= */
function eliminarMandadero(id) {
  if (!confirm('¿Estás seguro/a de eliminar este mandadero?')) {
    return;
  }
  const mandaderos = getMandaderosDeBlackboard();
  const restantes = mandaderos.filter(function (m) {
    return m.id !== id;
  });
  setMandaderosOnBlackboard(restantes);
  renderMandaderos();
}

/* =========================================================================
 * eliminarCuentaVendedor()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : pide confirmación; si se acepta, elimina la tienda del vendedor
 *             en sesión de verduNica_tiendas y cierra la sesión.
 * ========================================================================= */
function eliminarCuentaVendedor() {
  if (!esAdmin() || !sesionActual.tiendaId) {
    return;
  }
  if (!confirm('¿Estás seguro/a de eliminar tu usuario y tu tienda?')) {
    return;
  }
  const tiendas = getTiendasDeBlackboard();
  const restantes = tiendas.filter(function (t) {
    return t.id !== sesionActual.tiendaId;
  });
  setTiendasOnBlackboard(restantes);
  cerrarSesion();
}

/* =========================================================================
 * renderTiendas(lista)
 * -------------------------------------------------------------------------
 * Entrada   : lista (Array) de tiendas filtradas por la búsqueda.
 * Salida    : void.
 * Efecto    : re-render las tarjetas de tiendas en #tienda-grid.
 * ========================================================================= */
function renderTiendas(lista) {
  if (!tiendaGrid) {
    return;
  }
  tiendaGrid.innerHTML = '';

  /* En la pantalla inicial solo se muestra el buscador; las tiendas NO se
   * listan de antemano. Solo aparecen resultados cuando el usuario busca. */
  if (!busquedaTienda) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Escribe el nombre de una tienda para buscar.';
    tiendaGrid.appendChild(note);
    return;
  }

  if (lista.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No se encontró ninguna tienda.';
    tiendaGrid.appendChild(note);
    return;
  }

  lista.forEach(function (t) {
    const card = document.createElement('article');
    card.className = 'card tienda-card';

    const nombre = document.createElement('p');
    nombre.className = 'card-name';
    nombre.textContent = t.nombre || 'Sin nombre';

    const count = document.createElement('p');
    count.className = 'card-seller';
    count.textContent = (t.productos ? t.productos.length : 0) + ' producto(s)';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-secondary';
    btn.textContent = 'Ver tienda';
    btn.addEventListener('click', function () {
      elegirTienda(t.id);
    });

    card.appendChild(nombre);
    card.appendChild(count);
    card.appendChild(btn);
    tiendaGrid.appendChild(card);
  });
}

/* =========================================================================
 * renderCatalog(products)
 * -------------------------------------------------------------------------
 * Entrada   : products (Array) de productos (catálogo de la tienda elegida).
 * Salida    : void.
 * Efecto    : re-render las tarjetas de productos en #catalog-grid.
 * ========================================================================= */
function renderCatalog(products) {
  if (!Array.isArray(products)) {
    products = [];
  }
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
 * Entrada   : products (Array) de productos de la tienda del admin.
 * Salida    : void.
 * Efecto    : re-render la tabla de administración en #admin-table-body.
 * ========================================================================= */
function renderSellerTable(products) {
  if (!Array.isArray(products)) {
    products = [];
  }
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
 * tiendaActivaAdmin()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Object tienda del admin, o null si no hay sesión admin con tienda.
 * ========================================================================= */
function tiendaActivaAdmin() {
  if (!esAdmin() || !sesionActual.tiendaId) {
    return null;
  }
  return buscarTiendaPorId(sesionActual.tiendaId);
}

/* =========================================================================
 * elegirTienda(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (String) de la tienda elegida por el cliente.
 * Salida    : void.
 * Efecto    : establece tiendaVistaId, actualiza el nombre en el header y
 *             renderiza el catálogo de esa tienda.
 * ========================================================================= */
function elegirTienda(id) {
  tiendaVistaId = id;
  aplicarNombreTienda();
  setRoleUI();
  actualizarVistas();
}

/* =========================================================================
 * actualizarVistas()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : refresca la búsqueda de tiendas, el catálogo y la tabla del
 *             vendedor leyendo siempre desde la pizarra (blackboard).
 * ========================================================================= */
function actualizarVistas() {
  /* Pantalla inicial del cliente: lista de tiendas. */
  const tiendas = getTiendasDeBlackboard();
  const filtradas = tiendas.filter(function (t) {
    const nombre = (t.nombre || '').toLowerCase();
    return nombre.indexOf(busquedaTienda) !== -1;
  });
  renderTiendas(filtradas);

  /* Catálogo: la tienda elegida por el cliente o, si es admin, su tienda. */
  let productosVista = [];
  if (esAdmin()) {
    const tAdmin = tiendaActivaAdmin();
    productosVista = tAdmin ? tAdmin.productos : [];
    renderSellerTable(productosVista);
    renderMandaderos();
    tiendaVistaId = null;
  } else if (tiendaVistaId) {
    const t = buscarTiendaPorId(tiendaVistaId);
    productosVista = t ? t.productos : [];
    renderSellerTable([]);
  } else {
    renderSellerTable([]);
  }

  /* Interfaz limpia: ocultar el buscador de productos y el título cuando la
   * tienda no tiene productos (no hay nada que filtrar). */
  const hayProductos = Array.isArray(productosVista) && productosVista.length > 0;
  if (searchInput && searchInput.parentNode) {
    searchInput.style.display = hayProductos ? '' : 'none';
  }
  const catalogoTitle = document.getElementById('catalogo-title');
  if (catalogoTitle) {
    catalogoTitle.style.display = hayProductos || esAdmin() ? '' : 'none';
  }

  renderCatalog(productosVista);
}

/* =========================================================================
 * deleteProduct(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (Number) del producto a eliminar.
 * Salida    : void.
 * Efecto    : elimina el producto de la tienda del admin y persiste. Atómico.
 * ========================================================================= */
function deleteProduct(id) {
  if (!requiereEscritura()) {
    return;
  }
  const tiendas = getTiendasDeBlackboard();
  const idx = tiendas.findIndex(function (t) {
    return t.id === sesionActual.tiendaId;
  });
  if (idx === -1) {
    return;
  }
  tiendas[idx].productos = tiendas[idx].productos.filter(function (p) {
    return p.id !== id;
  });
  setTiendasOnBlackboard(tiendas);
  actualizarVistas();
}

/* =========================================================================
 * validarRegistro(datos)
 * -------------------------------------------------------------------------
 * Entrada   : datos (Object) pendiente de registro.
 * Salida    : true si es válido; false si la categoría no es permitida.
 * Efecto    : sobre #error-log inyecta "Categoría no permitida" si inválido.
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
 * Efecto    : captura inputs, valida, crea el producto y lo agrega a la
 *             tienda del admin en sesión. Persiste y re-render. Previene recarga.
 * ========================================================================= */
function manejarSubmit(evento) {
  evento.preventDefault();
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

  const tiendas = getTiendasDeBlackboard();
  const idx = tiendas.findIndex(function (t) {
    return t.id === sesionActual.tiendaId;
  });
  if (idx === -1) {
    inyectarError('No se encontró tu tienda.');
    return;
  }

  const nuevo = { id: Date.now() };
  Object.assign(nuevo, datos);
  tiendas[idx].productos.push(nuevo);
  setTiendasOnBlackboard(tiendas);
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

const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
if (btnLogin) {
  btnLogin.addEventListener('click', iniciarSesion);
}
if (btnLogout) {
  btnLogout.addEventListener('click', cerrarSesion);
}

/* Modal de acceso. */
const btnConfirmar = document.getElementById('btn-confirmar-acceso');
const btnCancelar = document.getElementById('btn-cancelar-acceso');
const inputClave = document.getElementById('input-clave');
if (btnConfirmar) {
  btnConfirmar.addEventListener('click', confirmarAcceso);
}
if (btnCancelar) {
  btnCancelar.addEventListener('click', cerrarModalAcceso);
}
if (inputClave) {
  inputClave.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmarAcceso();
    }
  });
}

/* Registro de cuenta (vendedor / mandadero). */
const btnRegistrar = document.getElementById('btn-registrar');
if (btnRegistrar) {
  btnRegistrar.addEventListener('click', registrarCuenta);
}
const inputRegClave = document.getElementById('input-reg-clave');
if (inputRegClave) {
  inputRegClave.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      registrarCuenta();
    }
  });
}

/* Eliminar cuenta del vendedor en sesión. */
const btnEliminarCuenta = document.getElementById('btn-eliminar-cuenta');
if (btnEliminarCuenta) {
  btnEliminarCuenta.addEventListener('click', eliminarCuentaVendedor);
}

/* Buscador de tiendas (pantalla inicial del cliente). */
if (searchTienda) {
  searchTienda.addEventListener('input', function () {
    busquedaTienda = searchTienda.value.trim().toLowerCase();
    actualizarVistas();
  });
}

/* Buscador del catálogo de la tienda elegida. */
if (searchInput) {
  searchInput.addEventListener('input', function () {
    actualizarVistas();
  });
}

/* Botón para volver a la búsqueda de tiendas (cliente). */
const btnVolver = document.getElementById('btn-volver');
if (btnVolver) {
  btnVolver.addEventListener('click', function () {
    tiendaVistaId = null;
    aplicarNombreTienda();
    setRoleUI();
    actualizarVistas();
  });
}

setRoleUI();
actualizarVistas();
