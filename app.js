/* ============================================================
   VerduNica — lógica del catálogo, canasta y pedido
   JavaScript puro, sin dependencias.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Datos: catálogo del día ---------- */
  var DELIVERY_FEE = 60; // córdobas (delivery estándar de VerduNica)

  var PRODUCTS = [
    { id: "tomate",   name: "Tomate de cocina", price: 22, cat: "verdura", origin: "Finca La Esperanza, Siuna", img: "img/tomate.png",   badge: "Del día" },
    { id: "platano",  name: "Plátano verde",    price: 15, cat: "fruta",   origin: "Comunidad El Guayabo",      img: "img/platano.png",  badge: "" },
    { id: "yuca",     name: "Yuca fresca",      price: 12, cat: "raiz",    origin: "Comunidad Wasakín",         img: "img/yuca.png",     badge: "" },
    { id: "aguacate", name: "Aguacate criollo", price: 45, cat: "fruta",   origin: "Finca Los Cocos",           img: "img/aguacate.png", badge: "Poco stock" },
    { id: "chiltoma", name: "Chiltoma",         price: 30, cat: "verdura", origin: "Huerta doña Chepa",         img: "img/chiltoma.png", badge: "" },
    { id: "naranja",  name: "Naranja dulce",    price: 18, cat: "fruta",   origin: "Salida a Rosita",           img: "img/naranja.png",  badge: "Del día" },
    { id: "cebolla",  name: "Cebolla blanca",   price: 28, cat: "verdura", origin: "Mercado municipal",         img: "img/cebolla.png",  badge: "" },
    { id: "papaya",   name: "Papaya madura",    price: 20, cat: "fruta",   origin: "Comunidad El Hormiguero",   img: "img/papaya.png",   badge: "" }
  ];

  /* ---------- Estado ---------- */
  var cart = []; // { id, qty }
  var activeFilter = "todo";

  /* ---------- Roles y permisos (simulación de control de acceso) ----------
     VerduNica es un marketplace: conecta vendedores (productores/verdulerías)
     con clientes (hogares). Por eso el rol "usuario" puede VENDER y COMPRAR.

     - admin:   gestiona toda la plataforma y modera ofertas de cualquiera
     - usuario: publica sus propias ofertas (vendedor) y compra (cliente)
     - auditor: solo lectura para revisar el sistema, no puede vender ni comprar
  */
  var currentRole = "usuario";

  // Rol -> lista de permisos que puede ejecutar.
  var ROLE_PERMISSIONS = {
    admin:   ["ver", "comprar", "gestionar", "moderar"],
    usuario: ["ver", "comprar", "gestionar"],
    auditor: ["ver"]
  };

  var ROLE_LABELS = {
    admin:   "Admin",
    usuario: "Usuario",
    auditor: "Auditor"
  };

  // Devuelve true si el rol actual puede ejecutar el permiso indicado.
  function can(permiso) {
    return (ROLE_PERMISSIONS[currentRole] || []).indexOf(permiso) !== -1;
  }

  /* ---------- Productos de vendedores locales ---------- */
  var STORE_KEY = "verdunica_vendedores";

  // Categorías permitidas: VerduNica solo acepta productos frescos del campo.
  // Incluye "raiz" para que coincida con el filtro "Raíces" del catálogo.
  var ALLOWED_CATS = ["fruta", "verdura", "planta", "raiz"];

  // Palabras que delatan productos de otras categorías (hogar, tecnología, etc.).
  var BANNED_WORDS = [
    "celular", "telefono movil", "smartphone", "laptop", "computadora", "tablet",
    "televisor", "pantalla", "audifono", "cargador", "consola", "control remoto",
    "ropa", "camisa", "camiseta", "pantalon", "blusa", "vestido", "zapato", "tenis", "sandalia",
    "detergente", "jabon", "cloro", "shampoo", "desinfectante", "escoba", "trapeador",
    "perfume", "maquillaje", "crema facial",
    "herramienta", "taladro", "martillo", "clavo", "tornillo", "pintura",
    "juguete", "peluche", "mueble", "silla", "mesa", "colchon",
    "llanta", "bateria de carro", "aceite de motor", "repuesto",
    "cerveza", "licor", "ron", "cigarro", "tabaco"
  ];

  var CAT_LABELS = {
    fruta: "Fruta",
    verdura: "Verdura",
    planta: "Planta / hierba",
    raiz: "Raíz"
  };

  // Imagen de reserva cuando el vendedor no aporta foto ni URL.
  var FALLBACK_IMG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23dff0e6'/%3E%3Cpath d='M30 66c0-18 14-32 32-32 0 18-14 32-32 32z' fill='%2352b788'/%3E%3Cpath d='M62 34c-6 4-11 10-14 17' stroke='%231b4332' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

  var sellerProducts = loadSellerProducts();
  var pendingImage = ""; // dataURL de una foto subida, en espera de guardar

  function loadSellerProducts() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveSellerProducts() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(sellerProducts));
    } catch (err) {
      /* almacenamiento no disponible: seguimos en memoria */
    }
  }

  function allProducts() {
    return PRODUCTS.concat(sellerProducts);
  }

  /* ---------- Utilidades ---------- */
  function money(n) {
    return "C$" + n.toFixed(2);
  }

  function findProduct(id) {
    var list = allProducts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findLine(id) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) return cart[i];
    }
    return null;
  }

  function totalUnits() {
    return cart.reduce(function (acc, line) { return acc + line.qty; }, 0);
  }

  function productsSubtotal() {
    return cart.reduce(function (acc, line) {
      var p = findProduct(line.id);
      return acc + (p ? p.price * line.qty : 0);
    }, 0);
  }

  /* Delivery por producto:
     - Producto de vendedor con delivery propio -> se cobra su costo.
     - Los demás -> delivery estándar de VerduNica (DELIVERY_FEE).
     Se cuenta UNA vez por línea, no por libra. */
  function deliveryFor(p) {
    if (p && p.seller && p.delivery != null && p.delivery >= 0) {
      return p.delivery;
    }
    return DELIVERY_FEE;
  }

  function itemsDeliveryTotal() {
    return cart.reduce(function (acc, line) {
      var p = findProduct(line.id);
      if (!p) return acc;
      return acc + deliveryFor(p);
    }, 0);
  }

  /* ---------- Referencias del DOM ---------- */
  var grid = document.getElementById("productGrid");
  var gridEmpty = document.getElementById("gridEmpty");
  var cartPanel = document.getElementById("cartPanel");
  var cartToggle = document.getElementById("cartToggle");
  var cartClose = document.getElementById("cartClose");
  var cartCount = document.getElementById("cartCount");
  var cartCountSr = document.getElementById("cartCountSr");
  var cartList = document.getElementById("cartList");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartTotals = document.getElementById("cartTotals");
  var sumProducts = document.getElementById("sumProducts");
  var sumDelivery = document.getElementById("sumDelivery");
  var sumTotal = document.getElementById("sumTotal");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var modal = document.getElementById("checkoutModal");
  var checkoutStep = document.getElementById("checkoutStep");
  var successStep = document.getElementById("successStep");
  var successText = document.getElementById("successText");
  var form = document.getElementById("deliveryForm");
  var toast = document.getElementById("toast");

  /* Fondo oscuro del carrito en móvil */
  var backdrop = document.createElement("div");
  backdrop.className = "cart-backdrop";
  document.body.appendChild(backdrop);

  /* ---------- Render del catálogo ---------- */
  function renderCatalog() {
    grid.innerHTML = "";
    var shown = 0;

    allProducts().forEach(function (p) {
      if (activeFilter !== "todo" && p.cat !== activeFilter) return;
      shown++;

      var li = document.createElement("li");
      li.className = "card";

      var media = document.createElement("div");
      media.className = "card__media";

      var img = document.createElement("img");
      img.src = p.img;
      img.alt = p.name + " fresco de Siuna";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);

      if (p.badge) {
        var badge = document.createElement("span");
        badge.className = "card__badge";
        badge.textContent = p.badge;
        media.appendChild(badge);
      }

      var body = document.createElement("div");
      body.className = "card__body";

      var name = document.createElement("h3");
      name.className = "card__name";
      name.textContent = p.name;

      var origin = document.createElement("p");
      origin.className = "card__origin";
      origin.textContent = p.origin;

      body.appendChild(name);
      body.appendChild(origin);

      if (p.seller) {
        var sMeta = document.createElement("p");
        sMeta.className = "card__seller-meta";
        sMeta.textContent = (p.delivery != null && p.delivery >= 0)
          ? "Delivery propio: " + money(p.delivery)
          : "Delivery coordinado por VerduNica (" + money(DELIVERY_FEE) + ")";
        body.appendChild(sMeta);
      }

      var priceWrap = document.createElement("p");
      priceWrap.className = "card__price";
      var amount = document.createElement("span");
      amount.className = "card__amount";
      amount.textContent = money(p.price);
      var unit = document.createElement("span");
      unit.className = "card__unit";
      unit.textContent = "/ libra";
      priceWrap.appendChild(amount);
      priceWrap.appendChild(unit);

      var add = document.createElement("button");
      add.className = "card__add";
      add.type = "button";
      add.setAttribute("data-add", p.id);
      add.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
        "<span>Agregar al carrito</span>";

      body.appendChild(priceWrap);
      body.appendChild(add);

      li.appendChild(media);
      li.appendChild(body);
      grid.appendChild(li);
    });

    gridEmpty.hidden = shown > 0;
  }

  /* ---------- Render de la canasta ---------- */
  function renderCart() {
    var units = totalUnits();

    cartCount.textContent = String(units);
    cartCountSr.textContent = units === 0
      ? "Canasta vacía"
      : units + (units === 1 ? " libra en la canasta" : " libras en la canasta");

    cartList.innerHTML = "";

    if (cart.length === 0) {
      cartEmpty.hidden = false;
      cartTotals.hidden = true;
      return;
    }

    cartEmpty.hidden = true;
    cartTotals.hidden = false;

    cart.forEach(function (line) {
      var p = findProduct(line.id);
      if (!p) return;

      var li = document.createElement("li");
      li.className = "cart-item";

      var img = document.createElement("img");
      img.className = "cart-item__img";
      img.src = p.img;
      img.alt = "";
      img.loading = "lazy";

      var info = document.createElement("div");
      var name = document.createElement("p");
      name.className = "cart-item__name";
      name.textContent = p.name;
      var meta = document.createElement("p");
      meta.className = "cart-item__meta";
      meta.textContent = money(p.price) + " x libra";
      info.appendChild(name);
      info.appendChild(meta);

      var right = document.createElement("div");
      right.className = "cart-item__right";

      var qty = document.createElement("div");
      qty.className = "qty";
      qty.innerHTML =
        '<button type="button" data-dec="' + p.id + '" aria-label="Quitar una libra de ' + escapeHtml(p.name) + '">&minus;</button>' +
        "<span>" + line.qty + " lb</span>" +
        '<button type="button" data-inc="' + p.id + '" aria-label="Agregar una libra de ' + escapeHtml(p.name) + '">+</button>';

      var sub = document.createElement("p");
      sub.className = "cart-item__sub";
      sub.textContent = money(p.price * line.qty);

      var remove = document.createElement("button");
      remove.className = "cart__remove";
      remove.type = "button";
      remove.setAttribute("data-remove", p.id);
      remove.textContent = "Quitar";

      right.appendChild(qty);
      right.appendChild(sub);
      right.appendChild(remove);

      li.appendChild(img);
      li.appendChild(info);
      li.appendChild(right);
      cartList.appendChild(li);
    });

    var subtotal = productsSubtotal();
    var delivery = itemsDeliveryTotal();
    sumProducts.textContent = money(subtotal);
    sumDelivery.textContent = money(delivery);
    sumTotal.textContent = money(subtotal + delivery);
  }

  /* ---------- Acciones de la canasta ---------- */
  function addToCart(id) {
    var line = findLine(id);
    if (line) {
      line.qty += 1;
    } else {
      cart.push({ id: id, qty: 1 });
    }
    renderCart();

    cartToggle.classList.add("is-bump");
    setTimeout(function () { cartToggle.classList.remove("is-bump"); }, 360);

    var p = findProduct(id);
    showToast(p.name + " agregado a tu canasta");
  }

  function changeQty(id, delta) {
    var line = findLine(id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      cart = cart.filter(function (l) { return l.id !== id; });
    }
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(function (l) { return l.id !== id; });
    renderCart();
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  /* ---------- Panel del carrito (móvil) ---------- */
  function isDesktop() {
    return window.matchMedia("(min-width: 1024px)").matches;
  }

  function openCart() {
    if (isDesktop()) {
      cartPanel.scrollIntoView({ block: "start" });
      return;
    }
    cartPanel.classList.add("is-open");
    backdrop.classList.add("is-visible");
    cartToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
  }

  function closeCart() {
    cartPanel.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    cartToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }

  /* ---------- Modal de entrega ---------- */
  var lastFocused = null;

  function openModal() {
    if (cart.length === 0) {
      showToast("Tu canasta está vacía");
      return;
    }
    lastFocused = document.activeElement;
    var subtotal = productsSubtotal();
    var delivery = itemsDeliveryTotal();
    document.getElementById("mProducts").textContent = money(subtotal);
    document.getElementById("mDelivery").textContent = money(delivery);
    document.getElementById("mTotal").textContent = money(subtotal + delivery);

    checkoutStep.hidden = false;
    successStep.hidden = true;
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    closeCart();
    setTimeout(function () { document.getElementById("fName").focus(); }, 60);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("no-scroll");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  /* ---------- Validación del formulario ---------- */
  function setError(input, msg) {
    var field = input.closest(".field");
    var slot = document.querySelector('[data-error-for="' + input.id + '"]');
    if (msg) {
      field.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = msg;
    } else {
      field.classList.remove("has-error");
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  }

  function validateForm() {
    var ok = true;
    var name = document.getElementById("fName");
    var phone = document.getElementById("fPhone");
    var zone = document.getElementById("fZone");
    var address = document.getElementById("fAddress");

    if (name.value.trim().length < 3) {
      setError(name, "Escribí tu nombre completo.");
      ok = false;
    } else { setError(name, ""); }

    var digits = phone.value.replace(/\D/g, "");
    if (digits.length < 8) {
      setError(phone, "Necesitamos un número de 8 dígitos.");
      ok = false;
    } else { setError(phone, ""); }

    if (!zone.value) {
      setError(zone, "Elegí tu zona de Siuna.");
      ok = false;
    } else { setError(zone, ""); }

    if (address.value.trim().length < 8) {
      setError(address, "Danos una referencia para encontrarte.");
      ok = false;
    } else { setError(address, ""); }

    return ok;
  }

  /* ---------- Eventos ---------- */
  grid.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    if (!can("comprar")) {
      showToast("El rol " + ROLE_LABELS[currentRole] + " solo puede ver el catálogo");
      return;
    }
    addToCart(btn.getAttribute("data-add"));
    btn.classList.add("is-added");
    btn.querySelector("span").textContent = "Agregado";
    setTimeout(function () {
      btn.classList.remove("is-added");
      btn.querySelector("span").textContent = "Agregar al carrito";
    }, 1100);
  });

  cartList.addEventListener("click", function (e) {
    var inc = e.target.closest("[data-inc]");
    var dec = e.target.closest("[data-dec]");
    var rm = e.target.closest("[data-remove]");
    if (inc) changeQty(inc.getAttribute("data-inc"), 1);
    else if (dec) changeQty(dec.getAttribute("data-dec"), -1);
    else if (rm) removeFromCart(rm.getAttribute("data-remove"));
  });

  document.querySelector(".filters").addEventListener("click", function (e) {
    var chip = e.target.closest("[data-filter]");
    if (!chip) return;
    activeFilter = chip.getAttribute("data-filter");
    Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (c) {
      var on = c === chip;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    renderCatalog();
  });

  cartToggle.addEventListener("click", function () {
    if (cartPanel.classList.contains("is-open")) closeCart();
    else openCart();
  });
  cartClose.addEventListener("click", closeCart);
  backdrop.addEventListener("click", closeCart);

  checkoutBtn.addEventListener("click", openModal);

  Array.prototype.forEach.call(document.querySelectorAll("[data-close-modal]"), function (el) {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) closeModal();
    else if (cartPanel.classList.contains("is-open")) closeCart();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    var name = document.getElementById("fName").value.trim().split(" ")[0];
    var zone = document.getElementById("fZone").value;
    var total = productsSubtotal() + itemsDeliveryTotal();

    successText.textContent =
      name + ", tu pedido de " + money(total) + " va camino a " + zone +
      ". Te escribimos al WhatsApp en los próximos minutos para confirmar la hora.";

    checkoutStep.hidden = true;
    successStep.hidden = false;

    cart = [];
    renderCart();
    form.reset();
  });

  window.addEventListener("resize", function () {
    if (isDesktop()) closeCart();
  });

  document.getElementById("year").textContent = String(new Date().getFullYear());

  /* ============================================================
     Panel de vendedores locales
     ============================================================ */
  var sellerForm = document.getElementById("sellerForm");
  var sEditId = document.getElementById("sEditId");
  var sName = document.getElementById("sName");
  var sCat = document.getElementById("sCat");
  var sPrice = document.getElementById("sPrice");
  var sImgUrl = document.getElementById("sImgUrl");
  var sImgFile = document.getElementById("sImgFile");
  var sImgPreview = document.getElementById("sImgPreview");
  var sImgPreviewImg = document.getElementById("sImgPreviewImg");
  var sImgClear = document.getElementById("sImgClear");
  var sDelivery = document.getElementById("sDelivery");
  var sNoDelivery = document.getElementById("sNoDelivery");
  var sLocation = document.getElementById("sLocation");
  var sPhone = document.getElementById("sPhone");
  var sellerWarning = document.getElementById("sellerWarning");
  var sellerSubmit = document.getElementById("sellerSubmit");
  var sellerCancel = document.getElementById("sellerCancel");
  var sellerFormTitle = document.getElementById("sellerFormTitle");
  var sellerList = document.getElementById("sellerList");
  var sellerEmpty = document.getElementById("sellerEmpty");
  var sellerCount = document.getElementById("sellerCount");

  // Selector de roles (simulación de inicio de sesión)
  var roleSelect = document.getElementById("roleSelect");
  var roleBadge = document.getElementById("roleBadge");

  // Cambio de rol: actualiza la interfaz según los permisos.
  function applyRole() {
    var label = ROLE_LABELS[currentRole] || currentRole;
    if (roleBadge) {
      roleBadge.textContent = label;
      roleBadge.setAttribute("data-role", currentRole);
    }
    // El panel de vendedores solo lo ve quien tiene permiso "gestionar".
    var sellerSection = document.getElementById("vendedores");
    if (sellerSection) {
      sellerSection.hidden = !can("gestionar");
    }
    renderCatalog();
    renderSellerList();
    showToast("Rol actual: " + label);
  }

  if (roleSelect) {
    roleSelect.value = currentRole;
    roleSelect.addEventListener("change", function () {
      currentRole = roleSelect.value;
      applyRole();
    });
  }

  // Quita tildes y baja a minúsculas para comparar de forma robusta.
  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function showSellerWarning(show) {
    sellerWarning.hidden = !show;
    if (show) {
      sellerWarning.scrollIntoView({ block: "nearest" });
    }
  }

  function findSellerIndex(id) {
    for (var i = 0; i < sellerProducts.length; i++) {
      if (sellerProducts[i].id === id) return i;
    }
    return -1;
  }

  function clearSellerImage() {
    pendingImage = "";
    sImgFile.value = "";
    sImgPreviewImg.removeAttribute("src");
    sImgPreview.hidden = true;
  }

  function resetSellerForm() {
    sellerForm.reset();
    sEditId.value = "";
    clearSellerImage();
    showSellerWarning(false);
    ["sName", "sCat", "sPrice", "sImgUrl", "sDelivery", "sLocation", "sPhone"].forEach(function (id) {
      setError(document.getElementById(id), "");
    });
    sDelivery.disabled = false;
    sellerSubmit.textContent = "Publicar producto";
    sellerCancel.hidden = true;
    sellerFormTitle.textContent = "Publicar un producto";
  }

  function fillSellerForm(p) {
    sEditId.value = p.id;
    sName.value = p.name;
    sCat.value = p.cat;
    sPrice.value = p.price;
    sLocation.value = p.location || "";
    sPhone.value = p.phone || "";

    if (p.delivery == null) {
      sNoDelivery.checked = true;
      sDelivery.value = "";
      sDelivery.disabled = true;
    } else {
      sNoDelivery.checked = false;
      sDelivery.value = p.delivery;
      sDelivery.disabled = false;
    }

    // La imagen guardada se conserva como pendiente para no perderla al editar.
    pendingImage = p.img || "";
    if (/^data:/.test(p.img || "")) {
      sImgUrl.value = "";
      sImgPreviewImg.src = p.img;
      sImgPreview.hidden = false;
    } else {
      sImgUrl.value = p.img && p.img !== FALLBACK_IMG ? p.img : "";
      sImgPreview.hidden = true;
    }

    sellerSubmit.textContent = "Guardar cambios";
    sellerCancel.hidden = false;
    sellerFormTitle.textContent = "Editar producto";
    showSellerWarning(false);
    document.getElementById("vendedores").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { sName.focus(); }, 200);
  }

  /* ---------- Validación de seguridad ---------- */
  function validateSeller() {
    var ok = true;
    showSellerWarning(false);

    if (sName.value.trim().length < 2) {
      setError(sName, "Escribí el nombre del producto.");
      ok = false;
    } else { setError(sName, ""); }

    // 1) La categoría DEBE ser una de las permitidas.
    var cat = sCat.value;
    var catAllowed = ALLOWED_CATS.indexOf(cat) !== -1;
    if (!cat) {
      setError(sCat, "Elegí una categoría.");
      ok = false;
    } else if (!catAllowed) {
      setError(sCat, "Categoría no permitida.");
      showSellerWarning(true);
      ok = false;
    } else { setError(sCat, ""); }

    // 2) El nombre no puede delatar un producto de otra categoría.
    var normName = normalize(sName.value);
    var offending = null;
    for (var i = 0; i < BANNED_WORDS.length; i++) {
      var w = BANNED_WORDS[i];
      var re = new RegExp("(^|\\s)" + w.replace(/\s+/g, "\\s+") + "(\\s|$|es|s)", "i");
      if (re.test(normName)) { offending = w; break; }
    }
    if (offending) {
      setError(sName, "Este producto no parece ser del campo.");
      showSellerWarning(true);
      ok = false;
    }

    var price = parseFloat(sPrice.value);
    if (isNaN(price) || price <= 0) {
      setError(sPrice, "Poné un precio válido en córdobas.");
      ok = false;
    } else { setError(sPrice, ""); }

    if (sImgUrl.value.trim() && !/^https?:\/\//i.test(sImgUrl.value.trim()) && !pendingImage) {
      setError(sImgUrl, "La URL debe empezar con http:// o https://");
      ok = false;
    } else { setError(sImgUrl, ""); }

    if (!sNoDelivery.checked) {
      var del = parseFloat(sDelivery.value);
      if (sDelivery.value.trim() === "" || isNaN(del) || del < 0) {
        setError(sDelivery, "Indicá el costo o marcá que no ofrecés delivery.");
        ok = false;
      } else { setError(sDelivery, ""); }
    } else { setError(sDelivery, ""); }

    if (sLocation.value.trim().length < 4) {
      setError(sLocation, "Decinos dónde está tu establecimiento.");
      ok = false;
    } else { setError(sLocation, ""); }

    if (sPhone.value.replace(/\D/g, "").length < 8) {
      setError(sPhone, "Necesitamos un teléfono de 8 dígitos.");
      ok = false;
    } else { setError(sPhone, ""); }

    return ok;
  }

  /* ---------- Render de la lista del vendedor ---------- */
  function renderSellerList() {
    sellerList.innerHTML = "";
    sellerCount.textContent = String(sellerProducts.length);
    sellerEmpty.hidden = sellerProducts.length > 0;

    sellerProducts.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "seller-list__item";

      var img = document.createElement("img");
      img.className = "seller-list__img";
      img.src = p.img || FALLBACK_IMG;
      img.alt = "";
      img.loading = "lazy";

      var info = document.createElement("div");

      var name = document.createElement("p");
      name.className = "seller-list__name";
      name.textContent = p.name;
      var tag = document.createElement("span");
      tag.className = "seller-list__tag";
      tag.textContent = CAT_LABELS[p.cat] || p.cat;
      name.appendChild(tag);

      var meta = document.createElement("p");
      meta.className = "seller-list__meta";
      var deliveryTxt = p.delivery == null ? "Sin delivery propio" : "Delivery " + money(p.delivery);
      meta.innerHTML =
        '<span class="seller-list__price">' + money(p.price) + " / lb</span> · " +
        deliveryTxt + "<br />" +
        escapeHtml(p.location) + " · Tel. " + escapeHtml(p.phone);

      var actions = document.createElement("div");
      actions.className = "seller-list__actions";

      // Permisos sobre esta oferta:
      // - Admin modera TODAS las ofertas.
      // - Usuario solo gestiona sus propias ofertas (campo owner).
      // - Auditor no tiene permiso "gestionar", no ve botones.
      var canManage = can("gestionar") && (
        currentRole === "admin" || p.owner === currentRole
      );
      if (canManage) {
        actions.innerHTML =
          '<button type="button" class="seller-list__edit" data-edit="' + p.id + '">Editar</button>' +
          '<button type="button" class="seller-list__delete" data-delete="' + p.id + '">Eliminar</button>';
      } else if (can("ver")) {
        // Solo lectura: no se muestran acciones, se indica el rol.
        var infoTag = document.createElement("span");
        infoTag.className = "seller-list__ro";
        infoTag.textContent = "Solo lectura";
        actions.appendChild(infoTag);
      }

      info.appendChild(name);
      info.appendChild(meta);
      info.appendChild(actions);

      li.appendChild(img);
      li.appendChild(info);
      sellerList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Eventos del panel de vendedores ---------- */
  sNoDelivery.addEventListener("change", function () {
    sDelivery.disabled = sNoDelivery.checked;
    if (sNoDelivery.checked) { sDelivery.value = ""; setError(sDelivery, ""); }
  });

  sImgFile.addEventListener("change", function () {
    var file = sImgFile.files && sImgFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      pendingImage = e.target.result;
      sImgPreviewImg.src = pendingImage;
      sImgPreview.hidden = false;
      sImgUrl.value = "";
      setError(sImgUrl, "");
    };
    reader.readAsDataURL(file);
  });

  sImgClear.addEventListener("click", clearSellerImage);
  sellerCancel.addEventListener("click", resetSellerForm);

  // Ocultar la advertencia en cuanto el vendedor corrige la categoría.
  sCat.addEventListener("change", function () {
    if (ALLOWED_CATS.indexOf(sCat.value) !== -1) {
      showSellerWarning(false);
      setError(sCat, "");
    }
  });

  sellerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateSeller()) return;

    var img = pendingImage || sImgUrl.value.trim() || FALLBACK_IMG;
    var delivery = sNoDelivery.checked ? null : parseFloat(sDelivery.value);

    var data = {
      name: sName.value.trim(),
      cat: sCat.value,
      price: parseFloat(sPrice.value),
      img: img,
      delivery: delivery,
      location: sLocation.value.trim(),
      phone: sPhone.value.trim(),
      origin: sLocation.value.trim(),
      badge: "De un vecino",
      seller: true,
      owner: currentRole
    };

    var editing = sEditId.value;
    if (editing) {
      var idx = findSellerIndex(editing);
      if (idx !== -1) {
        data.id = editing;
        sellerProducts[idx] = data;
      }
    } else {
      data.id = "s_" + Date.now();
      sellerProducts.push(data);
    }

    saveSellerProducts();
    renderSellerList();
    renderCatalog();
    renderCart();
    resetSellerForm();
    showToast(editing ? "Producto actualizado" : "¡" + data.name + " ya está en el catálogo!");
  });

  sellerList.addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit]");
    var delBtn = e.target.closest("[data-delete]");

    if (editBtn) {
      var p = findProduct(editBtn.getAttribute("data-edit"));
      // Defensa extra: solo quien puede gestionar esta oferta la edita.
      var okEdit = can("gestionar") && (currentRole === "admin" || p.owner === currentRole);
      if (!p) return;
      if (!okEdit) {
        showToast("No tenés permiso para editar esta oferta");
        return;
      }
      fillSellerForm(p);
      return;
    }

    if (delBtn) {
      var id = delBtn.getAttribute("data-delete");
      var prod = findProduct(id);
      var okDel = can("gestionar") && (currentRole === "admin" || prod.owner === currentRole);
      if (!okDel) {
        showToast("No tenés permiso para eliminar esta oferta");
        return;
      }
      var name = prod ? prod.name : "este producto";
      if (window.confirm("¿Eliminar \u201c" + name + "\u201d del catálogo?")) {
        // Si estabas editando justo ese producto, limpiamos el formulario.
        if (sEditId.value === id) resetSellerForm();
        sellerProducts = sellerProducts.filter(function (x) { return x.id !== id; });
        // También lo quitamos de la canasta si estaba agregado.
        cart = cart.filter(function (l) { return l.id !== id; });
        saveSellerProducts();
        renderSellerList();
        renderCatalog();
        renderCart();
        showToast("Producto eliminado");
      }
    }
  });

  /* ---------- Arranque ---------- */
  applyRole();
  renderCatalog();
  renderCart();
  renderSellerList();
})();
