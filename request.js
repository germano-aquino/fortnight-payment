import headers from "./headers.js";

import extracter from "./extracter.js";
import converter from "./converter.js";
import { parse } from "csv-parse/sync";

const urlProfessionalsData =
  "https://www.trinks.com/BackOffice/Download/ExportarProfissionais";
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

const allowedRoleLessPartners = [
  "germano",
  "martin",
  "raiza",
  "sandra",
  "sara",
  "ullyene",
];

const allowedRoles = ["CLT", "Parceria"];

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

async function getPaymentData() {
  const paymentData = {
    14: {},
    duque: {},
    umarizal: {},
    batista: {},
  };

  for (const store of Object.keys(lojaIds)) {
    const data = {
      income: 0,
      negativeIncome: [],
      missingRolePartners: [],
      inactivePartners: [],
    };

    const [names, incomes] = await incomeRequest(store);

    const [missingRolePartners, inactivePartners] = await getPartnersWithError(
      store,
      names,
    );
    data["missingRolePartners"].push(...missingRolePartners);
    data["inactivePartners"].push(...inactivePartners);

    for (let i = 0; i < names.length; i++) {
      if (incomes[i] < 0) {
        data["negativeIncome"].push({
          name: names[i],
          value: converter.intToCurrency(incomes[i]),
        });
      } else {
        data["income"] += incomes[i];
      }
    }

    const tips = await tipRequest(store);

    if (tips) {
      for (const tip of tips) {
        data["income"] += tip.Total * 100;
      }
    }

    data["income"] = converter.intToCurrency(data["income"]);
    paymentData[store] = data;
  }

  return [paymentData, period];
}

async function getPartnersWithError(store, names) {
  const missingRolePartners = [];
  const activePartners = [];
  const inactivePartners = [];

  const csvParsed = await professionalsInfoRequest(store);

  for (const row of csvParsed) {
    if (allowedRoleLessPartners.includes(row["Apelido"].toLowerCase()))
      continue;

    activePartners.push(row["Apelido"]);
    if (!allowedRoles.includes(row["Forma relação profissional"])) {
      missingRolePartners.push(row["Nome completo"]);
    }
  }

  for (const name of names) {
    if (!activePartners.includes(name)) {
      inactivePartners.push(name);
    }
  }

  return [missingRolePartners, inactivePartners];
}

async function professionalsInfoRequest(store) {
  const headers = getHeadersForStore(store);

  const body = {
    apenasAtivos: true,
  };

  const encodedBody = new URLSearchParams(body);
  const response = await fetch(urlProfessionalsData, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodedBody,
  });

  cookieShouldBeSet(response);

  const responseBody = await response.json();

  const fileUrl = responseBody.UrlDownload;

  const partnersDataResponse = await fetch(fileUrl);
  const rawData = await partnersDataResponse.arrayBuffer();

  const decoder = new TextDecoder("windows-1252");
  const csvFile = decoder.decode(rawData);

  const csvParsed = parse(csvFile, {
    delimiter: ";",
    columns: true,
    relax_column_count: true,
  });

  return csvParsed;
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

const request = { getPaymentData };

export default request;
