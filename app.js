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
const STORAGE_KEY_PEDIDOS = 'verduNica_pedidos';
const CATEGORIAS_PERMITIDAS = ['fruta', 'verdura', 'planta/hierba', 'raiz/tuberculo'];

/* Estados posibles de un pedido. */
const ESTADOS_PEDIDO = {
  PENDIENTE: 'pendiente',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado'
};

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

/* Pedido en construcción por el cliente: { tiendaId, items: [], total } */
let pedidoActual = null;

/* Conteo de pedidos pendientes ya vistos por el mandadero (para detectar
 * pedidos nuevos y avisar con una notificación). */
let notifConteoPrevio = -1;

/* Conteo de pedidos nuevos vistos por el vendedor para su tienda. */
let notifVendedorPrevio = -1;

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
    const lista = Array.isArray(data) ? data : [];
    return lista.map(function (m) {
      return Object.assign({}, m, {
        tiendasAfiliadas: Array.isArray(m.tiendasAfiliadas) ? m.tiendasAfiliadas : []
      });
    });
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
 * getPedidosDeBlackboard()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array de pedidos.
 * Efecto    : lectura pura. Inicializa `verduNica_pedidos` si no existe.
 * ========================================================================= */
function getPedidosDeBlackboard() {
  let raw = localStorage.getItem(STORAGE_KEY_PEDIDOS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify([]));
    raw = localStorage.getItem(STORAGE_KEY_PEDIDOS);
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================================
 * setPedidosOnBlackboard(lista)
 * -------------------------------------------------------------------------
 * Entrada   : lista (Array) de pedidos serializables.
 * Salida    : void.
 * Efecto    : serializa lista y la persiste en localStorage.
 * ========================================================================= */
function setPedidosOnBlackboard(lista) {
  localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(lista));
}

/* =========================================================================
 * buscarMandaderoPorId(id)
 * -------------------------------------------------------------------------
 * Entrada   : id (String) del mandadero.
 * Salida    : Object mandadero o null si no existe.
 * Efecto    : lectura pura desde la pizarra.
 * ========================================================================= */
function buscarMandaderoPorId(id) {
  return getMandaderosDeBlackboard().find(function (m) {
    return String(m.id) === String(id);
  }) || null;
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
      notifVendedorPrevio = -1;
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
        notifConteoPrevio = -1;
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
      clave: clave,
      tiendasAfiliadas: []
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

    /* El cliente puede pedir un producto de la tienda que está viendo. */
    if (getSessionRole() === ROLES.CLIENTE && tiendaVistaId) {
      const btnPedido = document.createElement('button');
      btnPedido.type = 'button';
      btnPedido.className = 'btn-pedido';
      btnPedido.textContent = 'Hacer pedido';
      btnPedido.addEventListener('click', function () {
        abrirModalPedido(p);
      });
      card.appendChild(btnPedido);
    }

    catalogGrid.appendChild(card);
  });
}

/* =========================================================================
 * abrirModalPedido(producto)
 * -------------------------------------------------------------------------
 * Entrada   : producto (Object) seleccionado por el cliente.
 * Salida    : void.
 * Efecto    : guarda el pedido en construcción (tienda actual + ítem) y
 *             muestra el modal de pedido con el resumen.
 * ========================================================================= */
function abrirModalPedido(producto) {
  pedidoActual = {
    tiendaId: tiendaVistaId,
    items: [{ nombre: producto.name, cantidad: 1, precio: producto.price }],
    total: Number(producto.price)
  };
  const modal = document.getElementById('pedido-modal');
  const error = document.getElementById('pedido-error');
  const cantidad = document.getElementById('input-pedido-cantidad');
  if (cantidad) {
    cantidad.value = '1';
  }
  if (modal) {
    modal.hidden = false;
  }
  if (error) {
    error.textContent = '';
  }
  actualizarResumenPedido();
  const nombre = document.getElementById('input-pedido-nombre');
  if (nombre) {
    nombre.focus();
  }
}

/* =========================================================================
 * actualizarResumenPedido()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno (lee el input de cantidad del modal).
 * Salida    : void.
 * Efecto    : recalcula el total del pedido en construcción según la cantidad
 *             elegida y actualiza el texto de resumen del modal.
 * ========================================================================= */
function actualizarResumenPedido() {
  if (!pedidoActual) {
    return;
  }
  const cantidadInput = document.getElementById('input-pedido-cantidad');
  const resumen = document.getElementById('pedido-resumen');
  let cantidad = Number(cantidadInput ? cantidadInput.value : 1);
  if (!isFinite(cantidad) || cantidad <= 0) {
    cantidad = 1;
  }
  const producto = pedidoActual.items[0];
  const total = Number(producto.precio) * cantidad;
  pedidoActual.items[0].cantidad = cantidad;
  pedidoActual.total = total;
  if (resumen) {
    resumen.textContent = producto.nombre + ' × ' + cantidad + ' — C$ ' + total.toFixed(2);
  }
}

/* =========================================================================
 * confirmarPedido()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno (lee los inputs del modal de pedido).
 * Salida    : void.
 * Efecto    : valida los datos del cliente, crea el pedido en verduNica_pedidos
 *             con estado 'pendiente' y lo asigna a un mandadero afiliado a la
 *             tienda (si existe). Cierra el modal y refresca vistas.
 * ========================================================================= */
function confirmarPedido() {
  const modalError = document.getElementById('pedido-error');
  const nombre = document.getElementById('input-pedido-nombre').value.trim();
  const telefono = document.getElementById('input-pedido-telefono').value.trim();
  const direccion = document.getElementById('input-pedido-direccion').value.trim();

  if (!nombre || !telefono || !direccion) {
    if (modalError) {
      modalError.textContent = 'Completa tu nombre, teléfono y dirección.';
    }
    return;
  }
  if (!pedidoActual) {
    return;
  }
  actualizarResumenPedido();

  const pedidos = getPedidosDeBlackboard();
  let mandaderoId = null;
  const mandaderos = getMandaderosDeBlackboard();
  const afiliado = mandaderos.find(function (m) {
    return m.tiendasAfiliadas.indexOf(pedidoActual.tiendaId) !== -1;
  });
  if (afiliado) {
    mandaderoId = afiliado.id;
  }

  pedidos.push({
    id: 'ped_' + Date.now(),
    tiendaId: pedidoActual.tiendaId,
    cliente: {
      nombre: nombre,
      telefono: telefono,
      direccion: direccion
    },
    productos: pedidoActual.items,
    total: pedidoActual.total,
    estado: ESTADOS_PEDIDO.PENDIENTE,
    mandaderoId: mandaderoId
  });
  setPedidosOnBlackboard(pedidos);

  const modal = document.getElementById('pedido-modal');
  if (modal) {
    modal.hidden = true;
  }
  pedidoActual = null;
  document.getElementById('input-pedido-nombre').value = '';
  document.getElementById('input-pedido-telefono').value = '';
  document.getElementById('input-pedido-direccion').value = '';
  const cantInput = document.getElementById('input-pedido-cantidad');
  if (cantInput) {
    cantInput.value = '1';
  }
  inyectarError('✅ Pedido registrado. La tienda y el repartidor lo recibirán.');
  actualizarVistas();
}

/* =========================================================================
 * cancelarPedido()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : oculta el modal de pedido y descarta el pedido en construcción.
 * ========================================================================= */
function cancelarPedido() {
  const modal = document.getElementById('pedido-modal');
  if (modal) {
    modal.hidden = true;
  }
  pedidoActual = null;
}

/* =========================================================================
 * renderAfiliacion()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : lista las tiendas con checkboxes para que el mandadero afilie
 *             su servicio. Persiste tiendasAfiliadas del mandadero en sesión.
 * ========================================================================= */
function renderAfiliacion() {
  const cont = document.getElementById('afiliacion-list');
  if (!cont || !esMandadero()) {
    return;
  }
  cont.innerHTML = '';
  const tiendas = getTiendasDeBlackboard();
  const mandadero = buscarMandaderoPorId(sesionActual.mandaderoId);

  /* Pista: sin tiendas afiliadas el mandadero no recibe pedidos. */
  const pista = document.getElementById('afiliacion-pista');
  const afiliadaAlguna = mandadero && Array.isArray(mandadero.tiendasAfiliadas) && mandadero.tiendasAfiliadas.length > 0;
  if (pista) {
    pista.hidden = afiliadaAlguna;
  }

  if (tiendas.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No hay tiendas registradas.';
    cont.appendChild(note);
    return;
  }

  tiendas.forEach(function (t) {
    const label = document.createElement('label');
    label.className = 'afiliacion-item';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = mandadero ? mandadero.tiendasAfiliadas.indexOf(t.id) !== -1 : false;
    check.addEventListener('change', function () {
      toggleAfiliacion(t.id, check.checked);
    });

    const span = document.createElement('span');
    span.textContent = t.nombre;

    label.appendChild(check);
    label.appendChild(span);
    cont.appendChild(label);
  });
}

/* =========================================================================
 * toggleAfiliacion(tiendaId, activo)
 * -------------------------------------------------------------------------
 * Entrada   : tiendaId (String) y activo (Boolean).
 * Salida    : void.
 * Efecto    : agrega o quita la tienda del array tiendasAfiliadas del
 *             mandadero en sesión y refresca la ruta activa.
 * ========================================================================= */
function toggleAfiliacion(tiendaId, activo) {
  if (!esMandadero() || !sesionActual.mandaderoId) {
    return;
  }
  const mandaderos = getMandaderosDeBlackboard();
  const idx = mandaderos.findIndex(function (m) {
    return m.id === sesionActual.mandaderoId;
  });
  if (idx === -1) {
    return;
  }
  const lista = mandaderos[idx].tiendasAfiliadas.slice();
  const pos = lista.indexOf(tiendaId);
  if (activo && pos === -1) {
    lista.push(tiendaId);
  } else if (!activo && pos !== -1) {
    lista.splice(pos, 1);
  }
  mandaderos[idx].tiendasAfiliadas = lista;
  setMandaderosOnBlackboard(mandaderos);
  renderAfiliacion();
  renderRutaActiva();
}

/* =========================================================================
 * pedidosDelMandadero()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : Array de pedidos de las tiendas afiliadas al mandadero en sesión,
 *             más los pedidos que le fueron asignados explícitamente.
 * ========================================================================= */
function pedidosDelMandadero() {
  if (!esMandadero() || !sesionActual.mandaderoId) {
    return [];
  }
  const mandadero = buscarMandaderoPorId(sesionActual.mandaderoId);
  const afiliadas = mandadero ? mandadero.tiendasAfiliadas : [];
  return getPedidosDeBlackboard().filter(function (p) {
    const porAfiliacion = afiliadas.indexOf(p.tiendaId) !== -1;
    const asignado = String(p.mandaderoId) === String(sesionActual.mandaderoId);
    return porAfiliacion || asignado;
  });
}

/* =========================================================================
 * renderNotificaciones()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra/oculta el aviso de pedidos nuevos en el panel del
 *             mandadero y dispara un toast cuando llega un pedido que no se
 *             había visto antes.
 * ========================================================================= */
function renderNotificaciones() {
  const banner = document.getElementById('mandadero-notif');
  const cont = document.getElementById('mandadero-notif-cont');
  if (!banner || !cont) {
    return;
  }
  if (!esMandadero()) {
    return;
  }
  const pendientes = pedidosDelMandadero().filter(function (p) {
    return p.estado === ESTADOS_PEDIDO.PENDIENTE;
  });
  const n = pendientes.length;

  if (n > 0) {
    banner.hidden = false;
    cont.textContent = String(n);
  } else {
    banner.hidden = true;
  }

  /* En la primera pasada no avisamos (solo se cuentan pedidos ya existentes). */
  if (notifConteoPrevio === -1) {
    notifConteoPrevio = n;
    return;
  }
  if (n > notifConteoPrevio) {
    const ultimo = pendientes[pendientes.length - 1];
    const tienda = ultimo ? buscarTiendaPorId(ultimo.tiendaId) : null;
    const origen = tienda ? tienda.nombre : 'una tienda';
    mostrarToast('🔔 Nuevo pedido de ' + origen + '! Revisa tu ruta.');
  }
  notifConteoPrevio = n;
}

/* =========================================================================
 * mostrarToast(mensaje)
 * -------------------------------------------------------------------------
 * Entrada   : mensaje (String).
 * Salida    : void.
 * Efecto    : muestra una notificación flotante temporal en #toast-zona.
 * ========================================================================= */
function mostrarToast(mensaje) {
  const zona = document.getElementById('toast-zona');
  if (!zona) {
    return;
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensaje;
  zona.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

/* =========================================================================
 * renderNotificacionesVendedor()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra/oculta el aviso de pedidos nuevos para la tienda del
 *             vendedor en sesión y lanza un toast cuando llega un pedido
 *             que no se había visto antes.
 * ========================================================================= */
function renderNotificacionesVendedor() {
  const banner = document.getElementById('vendedor-notif');
  const cont = document.getElementById('vendedor-notif-cont');
  if (!banner || !cont) {
    return;
  }
  if (!esAdmin()) {
    return;
  }
  const pedidos = getPedidosDeBlackboard().filter(function (p) {
    return p.tiendaId === sesionActual.tiendaId;
  });
  const nuevos = pedidos.filter(function (p) {
    return p.estado !== ESTADOS_PEDIDO.ENTREGADO;
  });
  const n = nuevos.length;

  if (n > 0) {
    banner.hidden = false;
    cont.textContent = String(n);
  } else {
    banner.hidden = true;
  }

  if (notifVendedorPrevio === -1) {
    notifVendedorPrevio = n;
    return;
  }
  if (n > notifVendedorPrevio) {
    mostrarToast('🔔 Te llegó un pedido nuevo a tu tienda! Revisa abajo.');
  }
  notifVendedorPrevio = n;
}

/* =========================================================================
 * renderRutaActiva()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : muestra los pedidos pendientes/en camino del mandadero.
 * ========================================================================= */
function renderRutaActiva() {
  const cont = document.getElementById('ruta-activa');
  if (!cont) {
    return;
  }
  cont.innerHTML = '';
  const pedidos = pedidosDelMandadero().filter(function (p) {
    return p.estado !== ESTADOS_PEDIDO.ENTREGADO;
  });

  if (pedidos.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Sin pedidos en ruta.';
    cont.appendChild(note);
    return;
  }

  pedidos.forEach(function (p) {
    cont.appendChild(crearFichaPedido(p));
  });
}

/* =========================================================================
 * renderHistorial()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : lista los pedidos entregados del mandadero y actualiza KPIs.
 * ========================================================================= */
function renderHistorial() {
  const cont = document.getElementById('historial-entregas');
  if (!cont) {
    return;
  }
  cont.innerHTML = '';
  const completados = pedidosDelMandadero().filter(function (p) {
    return p.estado === ESTADOS_PEDIDO.ENTREGADO;
  });
  renderKPIs(completados.length);

  if (completados.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Todavía no hay entregas completadas.';
    cont.appendChild(note);
    return;
  }

  completados.forEach(function (p) {
    const item = document.createElement('div');
    item.className = 'historial-item';
    const txt = document.createElement('span');
    txt.textContent = '✔ Pedido #' + (p.numero || p.id) + ' — Entregado';
    item.appendChild(txt);
    cont.appendChild(item);
  });
}

/* =========================================================================
 * renderKPIs(completadosHoy)
 * -------------------------------------------------------------------------
 * Entrada   : completadosHoy (Number).
 * Salida    : void.
 * Efecto    : actualiza los indicadores de la parte superior del panel del
 *             mandadero (tarifa del día = completados × C$ 40).
 * ========================================================================= */
function renderKPIs(completadosHoy) {
  const tarifaElemento = document.getElementById('kpi-tarifa');
  const completadosElemento = document.getElementById('kpi-completados');
  if (tarifaElemento) {
    tarifaElemento.textContent = 'C$ ' + (completadosHoy * 40).toFixed(2);
  }
  if (completadosElemento) {
    completadosElemento.textContent = String(completadosHoy);
  }
}

/* =========================================================================
 * crearFichaPedido(p)
 * -------------------------------------------------------------------------
 * Entrada   : p (Object) pedido.
 * Salida    : Node con la ficha del pedido (delegación de DOM).
 * Efecto    : genera una tarjeta con datos del pedido y un botón de acción
 *             según su estado (iniciar entrega o confirmar entrega).
 * ========================================================================= */
function crearFichaPedido(p) {
  const article = document.createElement('article');
  article.className = 'ficha-pedido estado-' + p.estado;

  const tienda = buscarTiendaPorId(p.tiendaId);
  const encabezado = document.createElement('p');
  encabezado.className = 'ficha-titulo';
  encabezado.textContent = 'PEDIDO #' + (p.numero || p.id) + ' — ' + (tienda ? tienda.nombre : 'Tienda');
  article.appendChild(encabezado);

  const etiqueta = document.createElement('span');
  etiqueta.className = 'estado-etiqueta';
  etiqueta.textContent = p.estado === ESTADOS_PEDIDO.PENDIENTE ? 'PENDIENTE' : 'EN CAMINO';
  article.appendChild(etiqueta);

  const cliente = document.createElement('p');
  cliente.className = 'ficha-cliente';
  cliente.textContent = 'Cliente: ' + p.cliente.nombre + '  |  Telf: ' + p.cliente.telefono;
  article.appendChild(cliente);

  const dir = document.createElement('p');
  dir.className = 'ficha-dir';
  dir.textContent = 'Dir: ' + p.cliente.direccion;
  article.appendChild(dir);

  const detalle = document.createElement('p');
  detalle.className = 'ficha-detalle';
  detalle.textContent = p.productos.map(function (i) {
    return i.cantidad + ' ' + i.nombre;
  }).join(', ');
  article.appendChild(detalle);

  if (p.estado === ESTADOS_PEDIDO.PENDIENTE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-iniciar';
    btn.textContent = 'INICIAR ENTREGA (C$ 40)';
    btn.addEventListener('click', function () {
      iniciarEntrega(p.id);
    });
    article.appendChild(btn);
  } else if (p.estado === ESTADOS_PEDIDO.EN_CAMINO) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-confirmar';
    btn.textContent = '✔ CONFIRMAR ENTREGA';
    btn.addEventListener('click', function () {
      confirmarEntrega(p.id);
    });
    article.appendChild(btn);
  }

  return article;
}

/* =========================================================================
 * iniciarEntrega(pedidoId)
 * -------------------------------------------------------------------------
 * Entrada   : pedidoId (String).
 * Salida    : void.
 * Efecto    : cambia el estado del pedido a 'en_camino', lo asigna al mandadero
 *             en sesión y refresca la vista (el vendedor lo verá en ruta).
 * ========================================================================= */
function iniciarEntrega(pedidoId) {
  const pedidos = getPedidosDeBlackboard();
  const idx = pedidos.findIndex(function (p) {
    return p.id === pedidoId && p.estado === ESTADOS_PEDIDO.PENDIENTE;
  });
  if (idx === -1) {
    return;
  }
  pedidos[idx].estado = ESTADOS_PEDIDO.EN_CAMINO;
  pedidos[idx].mandaderoId = sesionActual.mandaderoId;
  setPedidosOnBlackboard(pedidos);
  renderRutaActiva();
  renderHistorial();
}

/* =========================================================================
 * confirmarEntrega(pedidoId)
 * -------------------------------------------------------------------------
 * Entrada   : pedidoId (String).
 * Salida    : void.
 * Efecto    : cambia el estado del pedido a 'entregado' y refresca la vista.
 * ========================================================================= */
function confirmarEntrega(pedidoId) {
  const pedidos = getPedidosDeBlackboard();
  const idx = pedidos.findIndex(function (p) {
    return p.id === pedidoId && p.estado === ESTADOS_PEDIDO.EN_CAMINO;
  });
  if (idx === -1) {
    return;
  }
  pedidos[idx].estado = ESTADOS_PEDIDO.ENTREGADO;
  setPedidosOnBlackboard(pedidos);
  renderRutaActiva();
  renderHistorial();
}

/* =========================================================================
 * renderPedidosVendedor()
 * -------------------------------------------------------------------------
 * Entrada   : ninguno.
 * Salida    : void.
 * Efecto    : lista los pedidos de la tienda del vendedor en sesión con su
 *             estado actualizado.
 * ========================================================================= */
function renderPedidosVendedor() {
  const cont = document.getElementById('pedidos-vendedor');
  if (!cont) {
    return;
  }
  cont.innerHTML = '';
  if (!esAdmin()) {
    return;
  }
  const pedidos = getPedidosDeBlackboard().filter(function (p) {
    return p.tiendaId === sesionActual.tiendaId;
  });

  if (pedidos.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No hay pedidos para tu tienda.';
    cont.appendChild(note);
    return;
  }

  pedidos.forEach(function (p) {
    const item = document.createElement('div');
    item.className = 'pedido-vendedor-item';
    const txt = document.createElement('span');
    const estadoTexto = p.estado === ESTADOS_PEDIDO.ENTREGADO ? 'entregado' : (p.estado === ESTADOS_PEDIDO.EN_CAMINO ? 'en camino' : 'pendiente');
    txt.textContent = '#' + (p.numero || p.id) + ' · ' + p.cliente.nombre + ' · C$ ' + Number(p.total).toFixed(2) + ' · ' + estadoTexto;
    const etiqueta = document.createElement('span');
    etiqueta.className = 'estado-etiqueta';
    etiqueta.textContent = p.estado;
    item.appendChild(txt);
    item.appendChild(etiqueta);
    cont.appendChild(item);
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
    renderPedidosVendedor();
    renderNotificacionesVendedor();
    tiendaVistaId = null;
  } else if (tiendaVistaId) {
    const t = buscarTiendaPorId(tiendaVistaId);
    productosVista = t ? t.productos : [];
    renderSellerTable([]);
  } else {
    renderSellerTable([]);
  }

  /* Panel del mandadero: afiliación, ruta activa, historial y notificaciones. */
  if (esMandadero()) {
    renderAfiliacion();
    renderRutaActiva();
    renderHistorial();
    renderNotificaciones();
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

/* Modal de pedido del cliente. */
const btnConfirmarPedido = document.getElementById('btn-confirmar-pedido');
const btnCancelarPedido = document.getElementById('btn-cancelar-pedido');
if (btnConfirmarPedido) {
  btnConfirmarPedido.addEventListener('click', confirmarPedido);
}
if (btnCancelarPedido) {
  btnCancelarPedido.addEventListener('click', cancelarPedido);
}
const inputPedidoCantidad = document.getElementById('input-pedido-cantidad');
if (inputPedidoCantidad) {
  inputPedidoCantidad.addEventListener('input', actualizarResumenPedido);
}

/* Botón de notificación del mandadero: baja a la ruta activa. */
const btnNotif = document.getElementById('mandadero-notif');
if (btnNotif) {
  btnNotif.addEventListener('click', function () {
    const ruta = document.getElementById('ruta-activa');
    if (ruta && ruta.scrollIntoView) {
      ruta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* Botón de notificación del vendedor: baja a sus pedidos. */
const btnNotifVendedor = document.getElementById('vendedor-notif');
if (btnNotifVendedor) {
  btnNotifVendedor.addEventListener('click', function () {
    const pedidos = document.getElementById('pedidos-vendedor');
    if (pedidos && pedidos.scrollIntoView) {
      pedidos.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* Refresco automático: cuando otra pestaña/equipo modifica la pizarra
 * (nuevo pedido del cliente) o por cortesía cada 4 segundos. */
window.addEventListener('storage', function () {
  actualizarVistas();
});
setInterval(function () {
  actualizarVistas();
}, 4000);

setRoleUI();
actualizarVistas();
