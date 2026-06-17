// email.js — Responsável por montar e enviar o e-mail do ticket ao comprador
// Usa Nodemailer com Gmail. Para funcionar, você precisa:
// 1. Ativar "Senhas de app" na conta Google (não usa a senha normal)
// 2. Preencher EMAIL_USER e EMAIL_PASS no arquivo .env (ou direto aqui para testes)

const nodemailer = require("nodemailer");

// Transporter: é a "conexão" com o servidor de e-mail.
// Troque pelos seus dados ou use outro serviço (Outlook, Yahoo, etc.)
function criarTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "rennerfag@gmail.com",
      pass: process.env.EMAIL_PASS || "oyawlaonkdiysepd",
    },
  });
}

// Monta o HTML bonito do ticket que será enviado por e-mail
function montarHTMLTicket(pedido) {
  const itensHTML = pedido.itens
    .map((item) => `<li style="padding: 4px 0;">${item}</li>`)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 2px solid #e67e22; border-radius: 8px; overflow: hidden;">
      <div style="background: #e67e22; color: white; padding: 16px 24px;">
        <h1 style="margin: 0; font-size: 22px;">🎪 Festa Junina — Ticket de Compra</h1>
      </div>
      <div style="padding: 24px;">
        <p><strong>Nome:</strong> ${pedido.nome}</p>
        <p><strong>E-mail:</strong> ${pedido.email}</p>
        <p style="font-size: 20px;"><strong>Número do Ticket:</strong> 
          <span style="color: #e67e22; font-weight: bold;">${pedido.ticketNumero}</span>
        </p>
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p><strong>Itens do Pedido:</strong></p>
        <ul style="padding-left: 20px; color: #333;">
          ${itensHTML}
        </ul>
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #888; font-size: 13px;">Pedido realizado em: ${new Date(pedido.criadoEm).toLocaleString("pt-BR")}</p>
        <p style="color: #888; font-size: 13px;">Guarde este e-mail! Apresente o número <strong>${pedido.ticketNumero}</strong> na hora de retirar seu pedido.</p>
      </div>
    </div>
  `;
}

// Função principal: envia o e-mail do ticket para o comprador
async function enviarTicket(pedido) {
  const transporter = criarTransporter();

  const opcoes = {
    from: `"Festa Junina 🎪" <${process.env.EMAIL_USER || "seuemail@gmail.com"}>`,
    to: pedido.email,
    subject: `Seu ticket ${pedido.ticketNumero} — Festa Junina`,
    html: montarHTMLTicket(pedido),
  };

  try {
    const info = await transporter.sendMail(opcoes);
    console.log(`✅ E-mail enviado para ${pedido.email} — ID: ${info.messageId}`);
    return { sucesso: true, messageId: info.messageId };
  } catch (erro) {
    console.error("❌ Erro ao enviar e-mail:", erro.message);
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = { enviarTicket };
