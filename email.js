import nodemailer from "nodemailer";

const storesName = {
  14: "14 de Abril",
  batista: "Batista Campos",
  duque: "Duque",
  umarizal: "Umarizal",
};

async function send(paymentData, period) {
  const mailBody = generateMailBody(paymentData, period);

  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Germano Aquino" <${process.env.MAIL_USER}>`,
    to: [`${process.env.MAIL_RECIPIENT}`],
    subject: `Resultados da ${period}`,
    text: mailBody,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) throw error;
    console.log("Email enviado com sucesso!");
    console.log("Message ID:", info.messageId);
  });
}

function generateMailBody(paymentData, period) {
  let mailBody = `Relatório da ${period} do clube depil:\n`;

  for (const [store, data] of Object.entries(paymentData)) {
    mailBody += `\n\tClube Depil ${storesName[store]}`;
    mailBody += `\n\tPagamento da quinzena:\t${data["income"]}\n`;

    if (data["negativeIncome"].length) {
      mailBody += `\n\tParceiras com saldo negativo:`;
      data["negativeIncome"].map(
        (partner) => (mailBody += `\n\t${partner.name}:\t${partner.value}`),
      );
      mailBody += "\n";
    }

    if (data["missingRolePartners"].length) {
      mailBody += `\n\tAs seguintes parceiras estão com o campo "Forma relação profissional" vazio no trinks:`;
      data["missingRolePartners"].map((name) => (mailBody += `\n\t${name}`));
      mailBody += "\n";
    }

    if (data["inactivePartners"].length) {
      mailBody += `\n\tAs seguintes parceiras estão inativas na loja:`;
      data["inactivePartners"].map((name) => (mailBody += `\n\t${name}`));
      mailBody += "\n";
    }

    if (store !== "batista")
      mailBody += `\n---------------------------------------------------\n`;
  }

  mailBody += "\nAtt GermaBot";
  return mailBody;
}

const email = { send };

export default email;
