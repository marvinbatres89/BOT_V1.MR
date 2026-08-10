BOT V1 MR - PROYECTO CONSOLIDADO

ESTADO DE ESTA VERSIÓN
----------------------
1. Recibe señales reales de Trading Analyzer por BroadcastChannel/localStorage.
2. Mantiene mercado, estrategia, dirección, confianza y segundo de entrada.
3. Traduce:
   - RISE -> CALL
   - FALL -> PUT
   - EVEN -> DIGITEVEN
   - ODD -> DIGITODD
   - OVER/UNDER -> DIGITOVER/DIGITUNDER cuando la señal incluye barrera
   - MATCH -> DIGITMATCH cuando la señal incluye dígito
4. Conecta con una cuenta Deriv DEMO mediante PAT y detección automática de cuenta.
5. Solicita una cotización REAL de Deriv DEMO.
6. Mantiene una propuesta simulada como respaldo.
7. NO contiene ninguna llamada BUY y NO compra contratos.

IMPORTANTE SOBRE OVER/UNDER Y MATCH
----------------------------------
El BOT está preparado para recibir metadata, pero Trading Analyzer debe enviar
la barrera/dígito correspondiente. El BOT no inventa ese número porque debe
mantenerse sincronizado con la decisión original de la herramienta.

IMPORTANTE SOBRE EL NAVEGADOR
-----------------------------
Trading Analyzer y BOT V1 MR deben abrirse en el MISMO navegador para que
BroadcastChannel/localStorage compartan el mismo contexto del sitio.

TOKEN PAT
---------
No coloque el PAT dentro de ningún archivo. Péguelo únicamente en el campo
"Token PAT" de la interfaz. Se mantiene en memoria durante la sesión y se borra
de memoria al desconectar.

PRIMERA PRUEBA RECOMENDADA
--------------------------
1. Abrir BOT en Chrome.
2. Conectar Deriv DEMO.
3. Pulsar CONECTAR PUENTE.
4. Pulsar PROBAR SEÑAL DEMO una vez.
5. Confirmar:
   - SEÑAL ACEPTADA
   - CONTRATO -> CALL
   - RESPALDO SIMULADO
   - DERIV DEMO -> COTIZACIÓN REAL
   - COMPRA BLOQUEADA

Después de esa prueba, usar una señal real de Trading Analyzer.

ARCHIVO REPETIDO RECIBIDO
-------------------------
deriv-proposal.js fue enviado dos veces. En este ZIP se incluye una sola
versión consolidada y corregida.
