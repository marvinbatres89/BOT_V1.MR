BOT V1 MR — V3.8 ENTRY AUTHORIZATION ENGINE

BASE
----
Diseñado para instalarse encima del bot-engine.js actual que ya conserva:
- PREPARAR / EJECUTAR
- modo AUTOMÁTICO / MANUAL
- memoria de patrones
- timing por dirección
- protección por rachas/pérdidas
- telemetría
- CLEAN EXECUTION

QUÉ AGREGA
----------
Antes del BUY automático clasifica cada señal como:

1. AUTORIZADA
   Puede continuar hacia el motor actual y comprar en DEMO.

2. APRENDER
   No existe evidencia histórica favorable suficiente.
   En V3.8 automático NO ejecuta BUY.

3. BLOQUEADA
   Hay riesgo, contradicción, confianza insuficiente o faltan confirmaciones.

IMPORTANTE
----------
- NO borra memoria previa.
- NO cambia calibraciones EVEN/ODD.
- NO cambia los tiempos PREPARAR/TARGET.
- NO modifica el modo MANUAL DIAGNÓSTICO.
- La capa se instala sobre el motor existente y deja el BUY final al bot-engine.js actual.

INSTALACIÓN
-----------
1. Copiar "entry-authorizer-v3.8.js" a la MISMA carpeta donde está bot.js y bot-engine.js.
2. Abrir bot.js.
3. En la zona de imports del inicio, agregar exactamente:

   import "./entry-authorizer-v3.8.js";

4. Guardar bot.js.
5. Recargar la página del BOT.
6. Debe aparecer un panel nuevo:
   "V3.8 · AUTORIZADOR DE ENTRADA"

PRUEBA RECOMENDADA
------------------
- Cuenta DEMO.
- Modo AUTOMÁTICO.
- Hacer 10 oportunidades.
- Registrar no solo GANADA/PERDIDA, sino:
  AUTORIZADA / APRENDER / BLOQUEADA.
- No cambiar calibraciones durante esas 10 oportunidades.

CRITERIO V3.8
-------------
La confianza por sí sola NO autoriza.
Para AUTORIZAR debe existir patrón favorable + confianza suficiente +
confirmaciones compatibles. Después de pérdidas consecutivas los requisitos
se vuelven más estrictos.

ARCHIVO AÑADIDO
---------------
entry-authorizer-v3.8.js

No reemplaza bot-engine.js.
