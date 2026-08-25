# Verdulería Digital

Propósito del Proyecto:

El propósito central de Verdulería Digital es conectar de manera directa y eficiente a las verdulerías locales con los hogares de la comunidad. Esta solución tecnológica busca dinamizar la economía local, facilitar el acceso a productos frescos y saludables, y reducir la brecha digital de los pequeños comerciantes agrícolas de nuestro país.

Estructura del Código Fuente:

El proyecto sigue estrictamente una arquitectura limpia, modular y ligera (sin dependencias complejas de frameworks pesados)

verduleria-digital/
├── index.html         # Estructura semántica principal y catálogo de productos
├── README.md          # Documentación técnica, propósitos y arquitectura de datos
├── package.json       # Configuración del entorno de desarrollo con Vite
├── css/
│   └── estilos.css    # Hojas de estilo responsivas con diseño Mobile-First
└── js/
    └── app.js         # Lógica interactiva de Vanilla JS (Carrito de compras)

Arquitectura del Flujo de Datos (IPO - Input-Process-Output)

La aplicación opera en el lado del cliente utilizando JavaScript puro bajo un flujo controlado de datos en tiempo real

Entrada (Input): El usuario interactúa con la interfaz del catálogo. Al hacer clic en el botón "Agregar" de una tarjeta de producto, el sistema captura los atributos personalizados del HTML5 semántico (data-id, data-nombre, data-precio)

Procesamiento (Process): La aplicación procesa esta información capturada y almacena el producto de manera lógica en una estructura de datos interna tipo arreglo(Array).

Salida (Output): La lógica del programa lee el estado del arreglo y actualiza dinámicamente el contenido del Carrito de Compras en el DOM, recalculando el precio total e insertando un botón para eliminar productos específicos, todo ello de manera fluida y sin recargar la página
