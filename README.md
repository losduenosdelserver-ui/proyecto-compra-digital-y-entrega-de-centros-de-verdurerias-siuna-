# Categoría Aficionado y Temática Agropecuario.

Equipo: Esling Edduar Montenegro Rodríguez (desarrollador principal líder de equipo y comunicador)

arquitectura de datos: 

input( El flujo comienza en el archivo index.html. Cada producto en el catálogo tiene atributos especiales llamados data-id, data-nombre y data-precio)

Acción( Cuando el cliente selecciona una verdura y hace clic en el botón)

"Agregar al Carrito"( se genera el evento de entrada.)
 
Process( El script escucha todos los clics en los botones de agregar)

Extracción:( Mediante el método getAttribute, el código "lee" la información del producto directamente desde el HTML)

Estado:(Estos datos se convierten en un objeto JavaScript que se guarda dentro de un (Array) llamado carrito, actualizando el estado de la aplicación en la memoria del navegador sin necesidad de una base de datos externa por ahora)

Output(Finalmente, el procesamiento se traduce en cambios visuales inmediatos para el usuario)

Renderizado( Dinámico La función actualizarInterfaz() toma la lista de productos guardados en el arreglo carrito y, mediante la manipulación del DOM, crea nuevos elementos de lista ( en el HTML.)

Cálculo en Tiempo Real (El script recorre el arreglo, suma los precios y actualiza el elemento #total-monto en pantalla)

Resultado (El cliente ve su carrito actualizado y el monto total sin que la página se refresque, lo que proporciona una experiencia de usuario fluida y profesional)




