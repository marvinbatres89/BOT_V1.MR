BOT V1 MR - EJECUCIÓN DEMO CONTROLADA
=======================================

ESTA VERSIÓN HACE
-----------------
1. Recibe señales de Trading Analyzer.
2. Traduce la señal al tipo de contrato Deriv.
3. Crea respaldo simulado.
4. Solicita una cotización REAL en la cuenta DEMO.
5. Si usted activa manualmente "EJECUCIÓN DEMO":
   - compra el contrato usando el ID de la cotización;
   - permite solamente una operación simultánea;
   - sigue el contrato hasta el resultado;
   - muestra GANADA/PERDIDA y profit.
6. El monto está fijado en 1 USD en esta fase.
7. NO hay martingala.

BLOQUEO DE DINERO REAL
----------------------
La ejecución está OFF cada vez que se abre la página.
Para activarla, Deriv debe estar conectado y la cuenta debe haber sido
verificada como DEMO. Si la cuenta no puede verificarse como DEMO,
la ejecución se bloquea.

TOKEN PAT
---------
No escriba el token dentro de ningún archivo.
Péguelo únicamente en la pantalla del BOT.
El token se mantiene en memoria durante la sesión y se elimina al desconectar.

PRIMERA PRUEBA RECOMENDADA
--------------------------
A) PRUEBA SIN COMPRA
1. Conectar Deriv DEMO.
2. Conectar puente.
3. Dejar EJECUCIÓN DEMO OFF.
4. Pulsar PROBAR SEÑAL DEMO.
5. Confirmar que aparece COTIZACIÓN REAL y que NO hay compra.

B) PRIMERA COMPRA DEMO
1. Conectar Deriv DEMO.
2. Conectar puente.
3. Pulsar ACTIVAR EJECUCIÓN DEMO.
4. Confirmar que muestra EJECUCIÓN DEMO ON.
5. Pulsar PROBAR SEÑAL DEMO UNA SOLA VEZ.
6. Esperar el resultado.
7. Confirmar:
   - COMPRA DEMO;
   - contract_id;
   - resultado GANADA/PERDIDA;
   - profit.

DESPUÉS
-------
Cuando la señal DEMO funcione correctamente, haga una prueba con una señal
real de Trading Analyzer.

IMPORTANTE
----------
Esta etapa ejecuta contratos únicamente en la cuenta DEMO verificada.
No modifique el bloqueo de cuenta DEMO durante las pruebas.


CORRECCIÓN V2 DEL RESULTADO
---------------------------
El seguimiento posterior a BUY ahora usa una suscripción WebSocket:
proposal_open_contract + subscribe: 1.

El BOT escucha actualizaciones del contrato en tiempo real y termina cuando:
- is_sold = true; o
- is_expired = true; o
- status = won/lost/sold/expired.

Al cerrar:
- muestra GANADA/PERDIDA;
- muestra profit;
- libera la operación activa;
- cancela la suscripción con forget.


CORRECCIÓN V3 - SEGUIMIENTO DE RESULTADO
-----------------------------------------
El seguimiento posterior a BUY usa dos caminos simultáneos:

1. Suscripción WebSocket:
   proposal_open_contract + subscribe: 1

2. Consulta individual de respaldo:
   proposal_open_contract cada ~0.9 segundos

La versión V3 también procesa cualquier respuesta que contenga
proposal_open_contract, aunque el servidor no incluya msg_type.

El contrato se considera cerrado cuando Deriv informa is_sold/is_expired
o status won/lost/sold/expired. Entonces se muestra GANADA/PERDIDA y profit,
se libera la operación activa y se cancela el seguimiento.


FIX4 - CIERRE FINAL DEL CONTRATO
--------------------------------
Esta versión conserva conexión, puente, cotización y BUY de la versión
probada por el usuario.

La corrección del resultado final usa tres mecanismos:
1. Suscripción proposal_open_contract.
2. Consulta periódica proposal_open_contract.
3. Consulta profit_table para confirmar contratos que ya cerraron pero
   continúan apareciendo como OPEN en proposal_open_contract.

Cuando el contract_id aparece en profit_table, el BOT obtiene buy_price,
sell_price/profit y muestra GANADA o PERDIDA.

La ejecución continúa bloqueada para cuentas que no estén verificadas DEMO.


FIX5 - CIERRE POR STREAM DE TRANSACCIONES
-----------------------------------------
FIX5 agrega una cuarta vía de confirmación:

1. transaction subscribe: 1
2. proposal_open_contract subscribe: 1
3. proposal_open_contract por consulta
4. profit_table

El stream transaction se activa ANTES del BUY. Esto es especialmente
importante para contratos de 1 tick, porque el cierre puede producirse
muy rápido. Cuando llega la transacción SELL del mismo contract_id,
el BOT calcula el resultado y muestra GANADA/PERDIDA + profit.

La ejecución sigue permitida solamente en cuenta DEMO verificada.


FIX6 - PORTFOLIO + PROFIT TABLE
-------------------------------
La lógica principal de cierre ahora sigue la separación oficial de Deriv:

- portfolio: solamente posiciones abiertas.
- profit_table: histórico de ganancias/pérdidas de contratos cerrados.

Flujo:
BUY -> guardar contract_id -> revisar portfolio -> buscar el mismo contract_id
en profit_table -> mostrar GANADA/PERDIDA + profit.

proposal_open_contract y transaction quedan como respaldos para no alterar
la compra DEMO que ya funciona.

La ejecución permanece bloqueada para cuentas no verificadas como DEMO.
