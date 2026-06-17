// email.js — Responsável por montar e enviar o e-mail do ticket ao comprador
// Usa Nodemailer com Gmail. Para funcionar, você precisa:
// 1. Ativar "Senhas de app" na conta Google (não usa a senha normal)
// 2. Preencher EMAIL_USER e EMAIL_PASS no arquivo .env

const nodemailer = require("nodemailer");

// ✅ Variáveis centralizadas — evita inconsistência entre auth e from
// ⚠️ NÃO deixe credenciais reais aqui no código. Configure EMAIL_USER e
// EMAIL_PASS nas variáveis de ambiente do Railway (aba "Variables").
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn("⚠️ EMAIL_USER ou EMAIL_PASS não configurados nas variáveis de ambiente!");
}

// Transporter: é a "conexão" com o servidor de e-mail.
function criarTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,          // 💡 Alterado para 465 (Porta padrão SSL do Gmail)
    secure: true,       // 💡 Alterado para true (Exigido para a porta 465)
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    family: 4,          // 💡 FORÇA O USO DE IPv4 (Resolve bugs de rota no Railway)
    connectionTimeout: 10000, // 10s para conectar ao servidor do Gmail
    greetingTimeout: 10000,   // 10s para o "handshake" inicial
    socketTimeout: 15000,     // 15s de inatividade no socket antes de desistir
  });
}

// Monta o HTML bonito do ticket que será enviado por e-mail
function montarHTMLTicket(pedido) {
  // ✅ Garante que itens é sempre um array, mesmo que venha como objeto {itens, total}
  let itensArray = pedido.itens;
  if (!Array.isArray(itensArray)) {
    try {
      const parsed = typeof itensArray === "string" ? JSON.parse(itensArray) : itensArray;
      itensArray = parsed.itens || [];
    } catch (_) {
      itensArray = [];
    }
  }

  const itensHTML = itensArray
    .map((item) => `<li style="padding: 4px 0;">${item}</li>`)
    .join("");

  // Linha de total só aparece se o pedido tiver valor (pré-venda de hot dog)
  const linhaTotal =
    pedido.total != null
      ? `<p style="font-size: 16px;"><strong>Total:</strong> <span style="color: #e67e22;">R$ ${Number(pedido.total).toFixed(2)}</span></p>`
      : "";

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
        ${linhaTotal}
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p style="color: #888; font-size: 13px;">Pedido realizado em: ${new Date(pedido.criadoEm).toLocaleString("pt-BR")}</p>
        <p style="color: #888; font-size: 13px;">Guarde este e-mail! Apresente o número <strong>${pedido.ticketNumero}</strong> na hora de retirar seu pedido.</p>
      </div>
    </div>
  `;
}

// Função principal: envia o e-mail do ticket para o comprador
async function enviarTicket(pedido) {
  if (!pedido.email || !pedido.ticketNumero || !pedido.itens) {
    console.error("❌ Dados do pedido incompletos para envio de e-mail.");
    return { sucesso: false, erro: "Dados do pedido incompletos." };
  }

  const transporter = criarTransporter();

  const opcoes = {
    from: `"Festa Junina 🎪" <${EMAIL_USER}>`,
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
