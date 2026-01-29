const API = "http://localhost:3000";

// Variável global para guardar o horário que o usuário clicou
let horarioSelecionado = null;

// --- FUNÇÃO DE LOGIN ---
async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    if(msg) msg.innerText = "Entrando...";

    try {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await res.json();

        if (!res.ok) {
            if(msg) msg.innerText = data.erro || data.mensagem;
            else alert(data.erro);
            return;
        }

        // Salva o usuário no navegador
        localStorage.setItem("usuario", JSON.stringify(data.usuario));

        alert("Login realizado com sucesso!");

        // Redirecionamento
        if (data.usuario.tipo === "barbeiro") {
            window.location.href = "dashboard-barbeiro.html";
        } else {
            window.location.href = "barbeiros.html"; // ou agenda.html, dependendo do seu fluxo
        }

    } catch (err) {
        console.error(err);
        if(msg) msg.innerText = "Erro ao conectar no servidor";
        else alert("Erro ao conectar no servidor");
    }
}

// --- FUNÇÃO DE CADASTRO ---
async function cadastrar(event) {
    if(event) event.preventDefault(); // Evita recarregar a página se for um form

    // 1. Pegamos os valores que o usuário digitou nos inputs
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    if(msg) msg.innerText = "Cadastrando...";

    try {
        // 2. Enviamos os dados para o Backend
        const res = await fetch(`${API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, email, senha, tipo: "cliente" })
        });

        const data = await res.json();

        // 3. Se der erro
        if (!res.ok) {
            if(msg) msg.innerText = data.erro;
            else alert("Erro: " + data.erro);
            return;
        }

        // 4. Sucesso
        alert("Cadastro realizado com sucesso!");
        window.location.href = "index.html"; // Manda para o Login

    } catch (err) {
        if(msg) msg.innerText = "Erro ao conectar no servidor";
        else alert("Erro de conexão");
    }
}

// --- FUNÇÃO PARA LISTAR BARBEIROS ---
async function carregarBarbeiros() {
    const lista = document.getElementById("lista-barbeiros");
    if(!lista) return; // Proteção caso a lista não exista na página atual

    try {
        const res = await fetch(`${API}/barbeiros`);
        const barbeiros = await res.json();

        lista.innerHTML = "";

        if (barbeiros.length === 0) {
            lista.innerHTML = "<p> Nenhum barbeiro cadastrado </p>";
            return;
        }

        barbeiros.forEach(b => {
            const div = document.createElement("div");
            div.className = "barbeiro";
            div.innerText = b.nome;

            div.onclick = () => {
                localStorage.setItem("barbeiroId", b.id);
                window.location.href = "agenda.html";
            };

            lista.append(div);
        });
    } catch (err) {
        lista.innerHTML = "<p> Erro ao carregar barbeiros </p>";
    }
}

// --- FUNÇÃO PARA CARREGAR HORÁRIOS DISPONÍVEIS ---
async function carregarHorarios() {
    const dataInput = document.getElementById("data");
    const lista = document.getElementById("horarios");
    
    // Proteção
    if(!dataInput || !lista) return;

    const data = dataInput.value;
    const barbeiroId = localStorage.getItem("barbeiroId");

    if (!data || !barbeiroId) return;

    lista.innerHTML = "<p>Buscando horários...</p>";

    try {
        const res = await fetch(`${API}/disponibilidade/${barbeiroId}/${data}`);
        const resultado = await res.json();

        lista.innerHTML = "";

        if (resultado.horarios.length === 0) {
            lista.innerHTML = "<p>Nenhum horário disponível para esta data.</p>";
            return;
        }

        resultado.horarios.forEach(hora => {
            const botao = document.createElement("div");
            botao.className = "horario";
            botao.innerText = hora;

            botao.onclick = () => {
                // Tira a seleção visual de todos
                document.querySelectorAll(".horario").forEach(h => h.classList.remove("selecionado"));
                // Marca este como selecionado
                botao.classList.add("selecionado");
                // Guarda o valor
                horarioSelecionado = hora;
            };

            lista.append(botao);
        });
    } catch (err) {
        lista.innerHTML = "<p>Erro ao buscar horários.</p>";
    }
}

// --- FUNÇÃO PARA FINALIZAR O AGENDAMENTO ---
async function confirmarAgendamento() {
    const dataInput = document.getElementById("data");
    const msg = document.getElementById("msg");

    if (!dataInput || !horarioSelecionado) {
        alert("Por favor, selecione uma data e um horário.");
        return;
    }

    const usuarioString = localStorage.getItem("usuario");
    if(!usuarioString) {
        alert("Você precisa estar logado!");
        window.location.href = "index.html";
        return;
    }

    const usuario = JSON.parse(usuarioString);
    const barbeiroId = parseInt(localStorage.getItem("barbeiroId"));

    if(msg) msg.innerText = "Confirmando...";

    try {
        const res = await fetch(`${API}/agendar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clienteId: usuario.id,
                barbeiroId: barbeiroId,
                data: dataInput.value,
                horario: horarioSelecionado
            })
        });

        const resultado = await res.json();

        if (res.ok) {
            alert("Agendamento realizado com sucesso!");
            window.location.href = "barbeiros.html";
        } else {
            if(msg) msg.innerText = resultado.erro;
            else alert(resultado.erro);
        }
    } catch (err) {
        if(msg) msg.innerText = "Erro ao conectar com o servidor";
        else alert("Erro de conexão");
    }
}

// --- INICIALIZAÇÃO AUTOMÁTICA ---
// Se estivermos na página de barbeiros, carrega a lista automaticamente
if (window.location.pathname.includes("barbeiros.html")) {
    carregarBarbeiros();
}