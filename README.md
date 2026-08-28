# VerduNica Siuna 🥑

### Del campo de Siuna a tu mesa, sin comisiones ni intermediarios

VerduNica es un marketplace y agenda digital web, de diseño mobile-first, enfocado en el comercio justo de productos agrícolas frescos en Siuna, Nicaragua. El sistema permite a los clientes realizar proformas y agendar pedidos de forma rápida, mientras que ofrece a los pequeños agricultores y vendedores del mercado (como Don Eddy Zeledón) una agenda digital simplificada para gestionar sus ventas del día sin interrumpir su trabajo físico en el tramo.

## 🚀 Tecnologías Utilizadas
Para garantizar un rendimiento óptimo en dispositivos móviles de gama baja y asegurar que la aplicación funcione con un consumo mínimo de datos de internet, el proyecto se ha construido con tecnología web pura:
*   **HTML5:** Estructuración semántica de la aplicación y formularios de captura de datos.
*   **CSS3:** Estilos responsivos bajo un enfoque de diseño Mobile-First y variables CSS para el control de la identidad visual.
*   **JavaScript (Vanilla JS):** Lógica del negocio en el cliente, validación estricta de invariantes de dominio y sincronización en tiempo real.

## 🗃️ Arquitectura de Datos: Patrón Pizarra (Blackboard Pattern)
El sistema implementa el **Patrón Arquitectónico de Pizarra (Blackboard)**, un esquema estructurado de organización donde múltiples componentes (el Catálogo del Cliente y el Panel del Vendedor) cooperan y leen/escriben de manera exclusiva sobre un espacio de datos compartidos unificado. En este proyecto, la "Pizarra" está representada por el almacenamiento persistente del navegador (`LocalStorage`), garantizando consistencia local inmediata en el estado de la aplicación sin recargas de página.

## 🔧 Instalación y Ejecución Local
Al ser un desarrollo monolítico nativo de tres archivos, el sistema no requiere servidores de aplicación ni compiladores complejos:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/verdunica.git
    cd verdunica
    ```
2.  **Ejecutar la aplicación:**
    Al no requerir backend, simplemente abre el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge o Firefox) haciendo doble clic sobre el archivo o utilizando un servidor web ligero de desarrollo local (como Live Server en VS Code).