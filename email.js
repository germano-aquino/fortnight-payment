import nodemailer from "nodemailer";

async function send(paymentList, negativeIncomeList, period) {
  let mailBody = `Resultados da ${period} do clube depil:\n`;

  mailBody += `\n\tClube Depil 14 de Abril:\t${paymentList[14]}`;
  mailBody += `\n\tClube Depil Batista Campos:\t${paymentList["batista"]}`;
  mailBody += `\n\tClube Depil Umarizal:\t${paymentList["umarizal"]}`;
  mailBody += `\n\tClube Depil Duque:\t${paymentList["duque"]}`;

  if (!Object.keys(negativeIncomeList)) {
    mailBody += "\n\nAs seguintes parceiras estão com resultado negativo:";
    for (const [name, income] of Object.entries(negativeIncomeList)) {
      mailBody += `\n\t${name}:\t${income}`;
    }
  }

  mailBody += "\n\nAtt GermaBot";

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

const email = { send };

export default email;
