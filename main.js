import request from "./request.js";
import email from "./email.js";

await main();

async function main() {
  try {
    const [paymentData, period] = await request.getPaymentData();
    await email.send(paymentData, period);
  } catch (error) {
    console.log("Falha ao gerar lista de pagamentos da quinzena.");
    console.log(error.message);
    console.log(error);
  }
}

// const jsonString = JSON.stringify(table, null, 2);
// fs.writeFileSync("data.json", jsonString, "utf-8");

// const content = fs.readFileSync("./data.json", "utf-8");
// const table = JSON.parse(content);s
