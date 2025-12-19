import email from "infra/email";
import orchestrator from "../api/v1/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("infra/email.js", () => {
  test("send()", async () => {
    await orchestrator.deleteAllEmail();

    await email.send({
      from: "FinTab <contato@fintab.dev>",
      to: "contato@curso.dev",
      subject: "Teste de assunto",
      text: "Teste de corpo",
    });

    await email.send({
      from: "FinTab <contato@fintab.dev>",
      to: "contato@curso.dev",
      subject: "Ultimo email enviado",
      text: "Corpo do ultimo",
    });

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.sender).toBe("<contato@fintab.dev>");
    expect(lastEmail.recipients[0]).toBe("<contato@curso.dev>");
    expect(lastEmail.subject).toBe("Ultimo email enviado");
    expect(lastEmail.text).toBe("Corpo do ultimo");
  });
});
