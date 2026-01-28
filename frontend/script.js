const API = "http://localhost:3000";

// Variável global para guardar o horário que o usuário clicou
let horarioSelecionado = null;

async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    msg.innerText = "Entrando...";

    try {

        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await res.json();

        if (!res.ok) {
            msg.innerText = data.erro;
            return;
        }

        localStorage.setItem("usuario", JSON.stringify(data.usuario));

        if (data.usuario.tipo === "barbeiro") {
            window.location.href = "dashboard-barbeiro.html";
        }

        else {
            window.location.href = "barbeiros.html";
        }
    }

    catch (err) {
        msg.innerText = "Erro ao conectar no servidor";
    }
}

async function carregarBarbeiros() {
    const lista = document.getElementById("lista-barbeiros");

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
    }

    catch (err) {
        lista.innerHTML = "<p> Erro ao carregar barbeiros </p>"
    }
}

async function cadastrar() {
    // 1. Pegamos os valores que o usuario digitou nos inputs
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    // Limpa mensagens anteriores 
    msg.innerText = "Cadastrando...";

    try {
        // 2. Enviamos os dados para o Backend (rota / register)
        const res = await fetch (`${API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Transformando os dados em texto JSON para viajar pela rede
            body: JSON.stringify({ nome, email, senha })
        });

        const data = await res.json();

        // 3. Se o backend retornar erro (ex: email já existe), mostramos na tela
        if (!res.ok){
            msg.innerText = data.erro;
            return;
        }

        // 4. Se deu tudo certo
        alert("Cadastro realizado com sucesso!");
        window.location.href = "index.html"; // Manda o ususario para a tela de login
    }
    catch (err){
        msg.innerText = "Erro ao conectar no servidor"
    }

}

async function carregarHorarios() {
    const data = document.getElementById("data").value;
    const lista = document.getElementById("horarios");
    const barbeiroId = parseInt(localStorage.getItem("barbeiroId"));

    // Se não tiver data selecionada, não faz nada
    if(!data){
        return;
    }

    lista.innerHTML = "<p>Buscando horários...</p>";

    try {
        // faz requisicao ao servidor
        const res = await fetch (`${API}/disponibilidade/${barbeiroId}/${data}`);
        const resultado = await res.json();

        lista.innerHTML = "" // Limpa a mensagem de buscando...

        // Se a lista de horarios estive vazia
        if (resultado.horarios.length === 0){
            lista.innerHTML = "<p>Nenhum horario disponivel para esta data. </p>";
            return;
        }

        // Para cada horario, cria um botao
        resultado.horarios.forEach(hora => {
            const botao = document.createElement("div");
            botao.className = "horario";
            botao.innerText = hora;

            // Quando clicar no horario
            botao.onclick = () => {
                // 1. Tira a selecao visual de todos
                document.querySelectorAll(".horario").forEach(h => h.classList.remove("selecionado"));

                // 2. Marca este como selecionado
                botao.classList.add("selecionado");

                // 3. Guarda o valor na variavel
                horarioSelecionado = hora;
            };

            lista.append(botao)
        });
    }

    catch (err) {
        lista.innerHTML = "<p>Erro ao buscar horarios.</p>";
    }
}


async function confirmarAgendamento() {
    const data = document.getElementById("data").value;
    const msg = document.getElementById("msg");

    // Validacao: O usuario escolheu tudo?
    if (!data || !horarioSelecionado){
        alert("Por favor, selecione uma data e um horário.");
        return;
    }

    // Recuperando os IDs salvos no navegador
    const usuarioString = localStorage.getItem("usuario");
    const usuario = JSON.parse(usuarioString); // Transforma o texto de volta em objeto
    const barbeiroId = parseInt(localStorage.getItem("barbeiroId"));

    msg.innerText = "Confirmando...";

    try {
        const res = await fetch(`${API}/agendar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clienteId: usuario.id,
                barbeiroId: barbeiroId,
                data: data,
                horario: horarioSelecionado
            })
        });

        const resultado = await res.json();

        if(res.ok){
            alert("Agendamento realizado com sucesso!");
            // Redireciona de volta para a lista de barbeiros
            window.location.href = "barbeiros.html";
        }
        else{
            msg.innerText = resultado.erro;
        }
    }

    catch (err){
        msg.innerText = "Erro ao conectar com o servidor";
    }

}

if (window.location.pathname.includes("barbeiros.html")) {
        carregarBarbeiros();
    }