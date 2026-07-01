function stringToNumber(str) {
  return parseFloat(
    str.replace(/\s/g, "").replace(/\./g, "").replace(",", "."),
  );
}

function floatToInt(float) {
  return Math.round(100 * float);
}

function stringToInt(str) {
  return floatToInt(stringToNumber(str));
}

function intToCurrency(number) {
  const valueInCents = number / 100;
  return valueInCents.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const converter = { intToCurrency, stringToInt };

export default converter;
