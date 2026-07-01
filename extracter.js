import converter from "./converter.js";

import he from "he";

function nameAndIncome(table) {
  const namePattern = new RegExp("(?<=<b[^>]+>).+?(?=<)", "g");
  const regexNames = table.matchAll(namePattern);

  const incomePattern = new RegExp('(?<=<td class="alignRight">).+?(?=<)', "g");
  const regexIncomes = [...table.matchAll(incomePattern)];

  const names = [];
  for (const name of regexNames) {
    names.push(he.decode(name[0].trim()));
  }

  const incomes = [];
  for (let i = 1; i <= names.length; i++) {
    incomes.push(converter.stringToInt(regexIncomes[11 * i - 1][0]));
  }

  return [names, incomes];
}

const extracter = { nameAndIncome };

export default extracter;
