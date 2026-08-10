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
