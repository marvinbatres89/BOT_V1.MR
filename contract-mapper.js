/* ==========================================
   BOT V1 MR
   TRADUCTOR DE SEÑALES A CONTRATOS DERIV
   ========================================== */

class ContractMapper {

  normalizar(
    valor
  ) {

    return String(
      valor || ""
    )
      .trim()
      .toUpperCase();

  }


  mapearRiseFall(
    direccion
  ) {

    const valor =
      this.normalizar(
        direccion
      );


    if (
      [
        "RISE",
        "SUBE",
        "UP"
      ].includes(
        valor
      )
    ) {

      return {
        contractType:
          "CALL",

        barrier:
          null
      };

    }


    if (
      [
        "FALL",
        "BAJA",
        "DOWN"
      ].includes(
        valor
      )
    ) {

      return {
        contractType:
          "PUT",

        barrier:
          null
      };

    }


    return null;

  }


  mapearParImpar(
    direccion
  ) {

    const valor =
      this.normalizar(
        direccion
      );


    if (
      [
        "EVEN",
        "PAR"
      ].includes(
        valor
      )
    ) {

      return {
        contractType:
          "DIGITEVEN",

        barrier:
          null
      };

    }


    if (
      [
        "ODD",
        "IMPAR"
      ].includes(
        valor
      )
    ) {

      return {
        contractType:
          "DIGITODD",

        barrier:
          null
      };

    }


    return null;

  }


  extraerDigito(
    direccion,
    metadata = {}
  ) {

    let valor =
      metadata.barrier ??
      metadata.digit ??
      metadata.numero ??
      metadata.number ??
      null;


    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {

      const match =
        this.normalizar(
          direccion
        )
        .match(
          /(?:^|\D)(\d)(?:\D|$)/
        );


      if (
        match
      ) {

        valor =
          match[1];

      }

    }


    const numero =
      Number(
        valor
      );


    if (
      !Number.isInteger(
        numero
      ) ||
      numero < 0 ||
      numero > 9
    ) {

      return null;

    }


    return numero;

  }


  mapearOverUnder(
    direccion,
    metadata = {}
  ) {

    const valor =
      this.normalizar(
        direccion
      );


    const barrier =
      this.extraerDigito(
        direccion,
        metadata
      );


    if (
      barrier === null
    ) {

      return {
        error:
          "OVER/UNDER necesita una barrera del 0 al 9 enviada por Trading Analyzer."
      };

    }


    if (
      valor.includes(
        "OVER"
      ) ||
      valor.includes(
        "MAS"
      ) ||
      valor.includes(
        "MÁS"
      )
    ) {

      return {
        contractType:
          "DIGITOVER",

        barrier
      };

    }


    if (
      valor.includes(
        "UNDER"
      ) ||
      valor.includes(
        "MENOS"
      )
    ) {

      return {
        contractType:
          "DIGITUNDER",

        barrier
      };

    }


    return null;

  }


  mapearMatch(
    direccion,
    metadata = {}
  ) {

    const digit =
      this.extraerDigito(
        direccion,
        metadata
      );


    if (
      digit === null
    ) {

      return {
        error:
          "MATCH necesita un dígito válido del 0 al 9 enviado por Trading Analyzer."
      };

    }


    /*
      Se mantiene la regla vigente
      del proyecto: MATCH 0 no se opera.
    */

    if (
      digit === 0
    ) {

      return {
        error:
          "MATCH 0 está descartado por Trading Analyzer."
      };

    }


    return {
      contractType:
        "DIGITMATCH",

      barrier:
        digit
    };

  }


  mapear(
    senal
  ) {

    if (
      !senal
    ) {

      return {
        ok:
          false,

        error:
          "No existe señal."
      };

    }


    const estrategia =
      String(
        senal.estrategia ||
        ""
      )
        .trim()
        .toLowerCase();


    let contrato =
      null;


    if (
      [
        "rise_fall",
        "rise/fall"
      ].includes(
        estrategia
      )
    ) {

      contrato =
        this.mapearRiseFall(
          senal.direccion
        );

    }


    else if (
      [
        "even_odd",
        "even/odd",
        "par_impar",
        "par/impar"
      ].includes(
        estrategia
      )
    ) {

      contrato =
        this.mapearParImpar(
          senal.direccion
        );

    }


    else if (
      [
        "over_under",
        "over/under",
        "mas_menos",
        "más/menos"
      ].includes(
        estrategia
      )
    ) {

      contrato =
        this.mapearOverUnder(
          senal.direccion,
          senal.metadata ||
            {}
        );

    }


    else if (
      estrategia ===
        "match"
    ) {

      contrato =
        this.mapearMatch(
          senal.direccion,
          senal.metadata ||
            {}
        );

    }


    else {

      return {
        ok:
          false,

        error:
          `Estrategia no soportada: ${senal.estrategia}`
      };

    }


    if (
      !contrato
    ) {

      return {
        ok:
          false,

        error:
          `Dirección no reconocida: ${senal.direccion}`
      };

    }


    if (
      contrato.error
    ) {

      return {
        ok:
          false,

        error:
          contrato.error
      };

    }


    return {

      ok:
        true,

      symbol:
        senal.mercado,

      strategy:
        senal.estrategia,

      direction:
        senal.direccion,

      contractType:
        contrato.contractType,

      barrier:
        contrato.barrier,

      confidence:
        Number(
          senal.confianza ||
          0
        ),

      sourceSignalId:
        senal.id,

      executionSecond:
        senal.segundosEntrada,

      timestamp:
        Date.now()

    };

  }

}


export const contractMapper =
  new ContractMapper();
