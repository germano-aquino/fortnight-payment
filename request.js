import headers from "./headers.js";

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import extracter from "./extracter.js";
import converter from "./converter.js";

const urlProfessionalsIncome =
  "https://www.trinks.com/Backoffice/Comissao/ExibirProfissionaisRelatorioComissoes";
const urlProfessionalsTip =
  "https://www.trinks.com/BackOffice/Gorjeta/FiltrarRelatorioGorjeta";

const lojaIds = {
  14: {
    idRelacaoProfissional: "46810",
    idEstabelecimento: "18769",
    idRelacaoProfissionalRecepcionista: "46809",
  },
  batista: {
    idRelacaoProfissional: "103890",
    idEstabelecimento: "35295",
    idRelacaoProfissionalRecepcionista: "103889",
  },
  duque: {
    idRelacaoProfissional: "440885",
    idEstabelecimento: "120037",
    idRelacaoProfissionalRecepcionista: "440884",
  },
  umarizal: {
    idRelacaoProfissional: "49102",
    idEstabelecimento: "19357",
    idRelacaoProfissionalRecepcionista: "49101",
  },
};

const today = new Date();
const day = String(today.getDate());
const isFirstFortnight = day > 15;
const finalDateObj = new Date(
  today.getFullYear(),
  today.getMonth(),
  isFirstFortnight ? 15 : 0,
);
const startDay = isFirstFortnight ? "01" : "16";
const finalDay = String(finalDateObj.getDate()).padStart(2, "0");
const month = String(finalDateObj.getMonth() + 1).padStart(2, "0");
const year = String(finalDateObj.getFullYear());

const startDate = `${startDay}/${month}/${year}`;
const endDate = `${finalDay}/${month}/${year}`;

const period = isFirstFortnight
  ? `primeira quinzena de ${finalDateObj.toLocaleDateString("pt-BR", { month: "long" })}`
  : `segunda quinzena de ${finalDateObj.toLocaleDateString("pt-BR", { month: "long" })}`;

let cookie = headers.Cookie;

function getHeadersForStore(store) {
  const idEstabelecimentoPattern = new RegExp(
    "(?<=idEstabelecimentoPadrao)(.+?)=(.+?)(?=;)",
  );
  cookie = cookie.replace(
    idEstabelecimentoPattern,
    `$1=${lojaIds[store].idEstabelecimento}`,
  );

  return {
    ...headers,
    "id-estabelecimento-autenticado": lojaIds[store].idEstabelecimento,
    Cookie: cookie,
  };
}

function cookieShouldBeSet(response) {
  const setCookie = response.headers.getSetCookie();
  if (setCookie) {
    setCookie.map((ck) => {
      const keyValue = ck.split(";")[0];
      const [key, value] = keyValue.split("=");
      const pattern = new RegExp(`(?<=${key})=(.+?)(?=;)`);
      cookie = cookie.replace(pattern, `=${value}`);
    });
  }
}

async function getPaymentList() {
  const paymentList = {
    14: 0,
    duque: 0,
    umarizal: 0,
    batista: 0,
  };
  const negativeIncomeList = {};

  for (const store of Object.keys(lojaIds)) {
    const [names, incomes] = await incomeRequest(store);

    for (let i = 0; i < names.length; i++) {
      if (incomes[i] < 0) {
        negativeIncomeList[names[i]] = converter.intToCurrency(incomes[i]);
      } else {
        paymentList[store] += incomes[i];
      }
    }

    const tips = await tipRequest(store);

    if (tips) {
      for (const tip of tips) {
        paymentList[store] += tip.Total * 100;
      }
    }

    paymentList[store] = converter.intToCurrency(paymentList[store]);
  }

  return [paymentList, negativeIncomeList, period];
}

async function incomeRequest(store) {
  const headers = getHeadersForStore(store);

  const incomeBody = {
    TipoData: 2,
    DataInicio: startDate,
    DataFim: endDate,
    TipoItemPago: 0,
    ExibirExtornos: false,
    TipoStatusFiltroPagamento: 1,
    IdRelacaoProfissional: lojaIds[store].idRelacaoProfissional,
    mes: month,
    ano: year,
    profissional: undefined,
    indexLinha: 0,
  };
  const incomeEncodedBody = new URLSearchParams(incomeBody);

  const incomeResponse = await fetch(urlProfessionalsIncome, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: incomeEncodedBody,
  });

  cookieShouldBeSet(incomeResponse);

  const incomeResponseBody = await incomeResponse.json();
  const table = await incomeResponseBody.Html;

  return extracter.nameAndIncome(table);
}

async function tipRequest(store) {
  const headers = getHeadersForStore(store);

  const tipBody = {
    PeriodoInicial: startDate,
    PeriodoFinal: endDate,
    Status: "NaoPago",
  };

  const tipResponse = await fetch(urlProfessionalsTip, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(tipBody),
  });

  cookieShouldBeSet(tipResponse);

  const tipResponseBody = await tipResponse.json();

  return tipResponseBody?.Dados?.Profissionais;
}

const request = { getPaymentList };

export default request;
