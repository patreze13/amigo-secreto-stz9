// Configuração do Supabase
const SUPABASE_URL = "https://xfacwzikvcdhauhfjaau.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NjR-qsjKNg1IESIuMxrMYA_zVKghWTN";

// Usa a instância sem redeclarar a variável global
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Alternar entre abas
function trocarAba(abaId) {
  document.querySelectorAll(".conteudo-aba").forEach((aba) => aba.classList.remove("ativo"));
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));

  const abaAlvo = document.getElementById(abaId);
  if (abaAlvo) {
    abaAlvo.classList.add("ativo");
  }

  const index = abaId === "aba-cadastro" ? 0 : abaId === "aba-revelar" ? 1 : 2;
  const botoes = document.querySelectorAll(".tab-btn");
  if (botoes[index]) {
    botoes[index].classList.add("active");
  }

  limparAlerta();
  ocultarResultado();

  if (abaId === "aba-admin") {
    atualizarStatusAdmin();
  }
}

// Alertas na tela
function exibirAlerta(texto, tipo = "erro") {
  const alerta = document.getElementById("mensagem-status");
  alerta.className = `alerta ${tipo}`;
  alerta.textContent = texto;
  alerta.classList.remove("oculto");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparAlerta() {
  const alerta = document.getElementById("mensagem-status");
  alerta.className = "alerta oculto";
  alerta.textContent = "";
}

// Carregar participantes nos menus suspensos
async function carregarParticipantes() {
  const selectCad = document.getElementById("select-participante-cad");
  const selectRev = document.getElementById("select-participante-rev");

  try {
    const { data, error } = await supabaseClient
      .from("participantes")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro do Supabase:", error);
      selectCad.innerHTML = '<option value="">Erro ao carregar lista</option>';
      selectRev.innerHTML = '<option value="">Erro ao carregar lista</option>';
      exibirAlerta("Erro ao carregar lista: " + error.message, "erro");
      return;
    }

    if (!data || data.length === 0) {
      selectCad.innerHTML = '<option value="">Nenhum participante encontrado</option>';
      selectRev.innerHTML = '<option value="">Nenhum participante encontrado</option>';
      return;
    }

    let opcoes = '<option value="">Selecione o seu nome...</option>';
    data.forEach((p) => {
      opcoes += `<option value="${p.id}">${p.nome}</option>`;
    });

    selectCad.innerHTML = opcoes;
    selectRev.innerHTML = opcoes;
  } catch (err) {
    console.error("Erro inesperado:", err);
    exibirAlerta("Falha de rede ao conectar com o banco.", "erro");
  }
}

// Salvar Cadastro (PIN + 3 Sugestões)
async function salvarCadastro(event) {
  event.preventDefault();
  limparAlerta();

  const id = document.getElementById("select-participante-cad").value;
  const pin = document.getElementById("input-pin-cad").value.trim();
  const pres1 = document.getElementById("pres1").value.trim();
  const pres2 = document.getElementById("pres2").value.trim() || null;
  const pres3 = document.getElementById("pres3").value.trim() || null;

  if (!id) {
    exibirAlerta("Por favor, selecione seu nome.");
    return;
  }

  if (pin.length !== 4 || isNaN(pin)) {
    exibirAlerta("O PIN precisa ter exatamente 4 dígitos numéricos.");
    return;
  }

  if (!pres1) {
    exibirAlerta("Coloque ao menos uma sugestão de presente.");
    return;
  }

  const btn = document.getElementById("btn-salvar-cad");
  btn.disabled = true;
  btn.textContent = "Gravando dados...";

  try {
    const { data, error } = await supabaseClient.rpc("cadastrar_pin_e_presentes", {
      p_id: id,
      p_pin: pin,
      p_pres1: pres1,
      p_pres2: pres2,
      p_pres3: pres3
    });

    if (error) throw error;

    if (data === false) {
      exibirAlerta("Este participante já cadastrou um PIN anteriormente e não pode ser alterado.", "erro");
    } else {
      exibirAlerta("Cadastro concluído com sucesso! Guarde seu PIN para a revelação.", "sucesso");
      document.getElementById("form-cadastro").reset();
    }
  } catch (err) {
    exibirAlerta("Erro ao salvar cadastro: " + err.message, "erro");
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar Meus Dados";
  }
}

// Revelar Amigo Secreto
async function consultarAmigo(event) {
  event.preventDefault();
  limparAlerta();
  ocultarResultado();

  const id = document.getElementById("select-participante-rev").value;
  const pin = document.getElementById("input-pin-rev").value.trim();

  if (!id) {
    exibirAlerta("Selecione seu nome na lista.");
    return;
  }

  if (pin.length !== 4) {
    exibirAlerta("Digite o seu PIN de 4 dígitos.");
    return;
  }

  const btn = document.getElementById("btn-revelar");
  btn.disabled = true;
  btn.textContent = "Verificando...";

  try {
    const { data, error } = await supabaseClient.rpc("revelar_amigo", {
      p_id: id,
      p_pin: pin
    });

    if (error) {
      exibirAlerta(error.message, "erro");
      return;
    }

    if (data && data.length > 0) {
      const resultado = data[0];
      document.getElementById("nome-amigo-sorteado").textContent = resultado.nome_sorteado;

      const lista = document.getElementById("lista-presentes-sorteado");
      lista.innerHTML = "";

      const presentes = [resultado.presente_1, resultado.presente_2, resultado.presente_3].filter(Boolean);

      if (presentes.length === 0) {
        lista.innerHTML = "<li>Nenhuma sugestão cadastrada. Seja criativo!</li>";
      } else {
        presentes.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = "🎁 " + item;
          lista.appendChild(li);
        });
      }

      document.getElementById("cartao-resultado").classList.remove("oculto");
      document.getElementById("input-pin-rev").value = "";
    }
  } catch (err) {
    exibirAlerta("Falha na consulta: " + err.message, "erro");
  } finally {
    btn.disabled = false;
    btn.textContent = "Revelar Meu Amigo";
  }
}

function ocultarResultado() {
  const cartao = document.getElementById("cartao-resultado");
  if (cartao) cartao.classList.add("oculto");
}

// Status do Painel de Sorteio
async function atualizarStatusAdmin() {
  const statusTexto = document.getElementById("total-cadastrados-texto");
  statusTexto.textContent = "Consultando banco...";

  const { data, error } = await supabaseClient
    .from("participantes")
    .select("id, nome, pin_hash, amigo_sorteado_id");

  if (error || !data) {
    statusTexto.textContent = "Erro ao buscar dados.";
    return;
  }

  const total = data.length;
  const comPin = data.filter((p) => p.pin_hash !== null).length;
  const jaSorteado = data.some((p) => p.amigo_sorteado_id !== null);

  let texto = `Total de participantes: ${total} | Com PIN cadastrado: ${comPin} de ${total}.`;
  if (jaSorteado) {
    texto += " (O sorteio já foi realizado!)";
    document.getElementById("painel-sorteio-sucesso").classList.remove("oculto");
  } else {
    document.getElementById("painel-sorteio-sucesso").classList.add("oculto");
  }

  statusTexto.textContent = texto;
}

// Executar Sorteio
async function executarSorteio() {
  limparAlerta();
  const senha = document.getElementById("senha-mestre").value.trim();

  if (!senha) {
    exibirAlerta("Digite a senha do painel para realizar o sorteio.", "erro");
    return;
  }

  const btn = document.getElementById("btn-sortear");
  btn.disabled = true;
  btn.textContent = "Realizando sorteio...";

  try {
    const { data, error } = await supabaseClient.rpc("executar_sorteio_blindado", {
      p_senha: senha
    });

    if (error) {
      exibirAlerta(error.message, "erro");
      return;
    }

    document.getElementById("painel-sorteio-sucesso").classList.remove("oculto");
    exibirAlerta("Sorteio finalizado com sucesso!", "sucesso");
    document.getElementById("senha-mestre").value = "";
    atualizarStatusAdmin();
  } catch (err) {
    exibirAlerta("Erro ao executar sorteio: " + err.message, "erro");
  } finally {
    btn.disabled = false;
    btn.textContent = "🎲 Realizar Sorteio Agora";
  }
}

// Inicializar na carga da página
document.addEventListener("DOMContentLoaded", () => {
  carregarParticipantes();
});