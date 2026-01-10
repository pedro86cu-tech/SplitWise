# SplitWise - Gestor de Gastos entre Amigos

Una aplicación móvil moderna y profesional para gestionar y dividir gastos entre amigos. Construida con React Native, Expo y Supabase.

## Características Principales

### Autenticación Segura
- Registro e inicio de sesión con email/contraseña
- Gestión de perfiles de usuario
- Autenticación manejada por Supabase

### Gestión de Equipos
- Crea equipos con tus amigos
- Agrega miembros por email
- Visualiza todos tus equipos y su información

### División de Gastos
- Escanea recibos con la cámara
- Procesamiento automático con AI para extraer el monto
- División equitativa entre todos los miembros del equipo
- Seguimiento de quién pagó y quién debe

### Pantalla de Inicio
- Visualiza tu balance total
- Resumen de deudas por equipo
- Indica claramente lo que te deben y lo que debes
- Actualización en tiempo real

### Historial de Transacciones
- Lista completa de todos los gastos
- Filtrado por equipo
- Estado de cada split (pagado/pendiente)
- Información detallada de cada transacción

### Diseño Profesional
- Interfaz moderna con gradientes y animaciones
- Tema oscuro optimizado para mejor visualización
- Iconos vectoriales con Lucide React Native
- Experiencia de usuario fluida y responsiva

## Estructura de la Base de Datos

La aplicación utiliza las siguientes tablas en Supabase:

- **profiles**: Información de los usuarios
- **teams**: Equipos de amigos
- **team_members**: Relación entre usuarios y equipos
- **expenses**: Gastos registrados
- **expense_splits**: División de cada gasto entre miembros
- **settlements**: Registro de pagos de deudas

Todas las tablas tienen Row Level Security (RLS) habilitado para máxima seguridad.

## Tecnologías Utilizadas

- **React Native**: Framework para desarrollo móvil
- **Expo**: Plataforma para aplicaciones universales
- **Supabase**: Backend as a Service (Base de datos, Auth, Edge Functions)
- **TypeScript**: Tipado estático
- **Expo Router**: Navegación basada en archivos
- **Expo Camera**: Acceso a la cámara del dispositivo
- **Lucide Icons**: Iconos SVG
- **Linear Gradient**: Efectos visuales
- **OpenAI Vision API**: Procesamiento de recibos con AI

## Navegación

La aplicación utiliza una estructura de navegación por tabs con 3 pantallas principales:

1. **Inicio**: Dashboard con resumen de deudas
2. **Historial**: Lista de todas las transacciones
3. **Perfil**: Información del usuario y sus equipos

Pantallas adicionales:
- **Auth**: Registro e inicio de sesión
- **Create Team**: Crear nuevo equipo
- **Scan Receipt**: Escanear recibo con cámara

## Edge Functions

### process-receipt

Función serverless que procesa imágenes de recibos usando OpenAI Vision API:

- Acepta imagen en base64
- Extrae el monto total y descripción
- Retorna datos estructurados en JSON
- Incluye modo demo si no hay API key configurada

## Seguridad

- Todas las consultas a la base de datos están protegidas con RLS
- Los usuarios solo pueden ver y modificar sus propios datos
- Los miembros de un equipo solo pueden ver los gastos de ese equipo
- Las políticas de seguridad verifican la pertenencia a equipos
- Las credenciales de autenticación están manejadas de forma segura

## Próximos Pasos Sugeridos

1. **Notificaciones**: Alertas cuando se agreguen nuevos gastos
2. **Pagos**: Marcar deudas como pagadas
3. **Exportar datos**: Generar reportes en PDF
4. **Múltiples monedas**: Soporte para diferentes divisas
5. **División personalizada**: Permitir splits no equitativos
6. **Comentarios**: Agregar notas a los gastos
7. **Fotografías**: Adjuntar fotos de recibos a los gastos

## Configuración Adicional

Para habilitar el procesamiento de recibos con AI, configura una API key de OpenAI:

1. Obtén una API key en https://platform.openai.com/api-keys
2. Configura la variable de entorno `OPENAI_API_KEY` en tu proyecto Supabase
3. La función detectará automáticamente la configuración

Si no se configura la API key, la función usará datos de demostración.

## Paleta de Colores

- **Primario**: Verde (#10b981)
- **Secundario**: Azul (#3b82f6)
- **Fondo oscuro**: Gris oscuro (#0f172a, #1e293b)
- **Texto**: Blanco (#ffffff)
- **Texto secundario**: Gris claro (#94a3b8)
- **Positivo**: Verde (#10b981)
- **Negativo**: Rojo (#ef4444)
- **Advertencia**: Ámbar (#f59e0b)

## Licencia

Aplicación desarrollada como ejemplo educativo.
