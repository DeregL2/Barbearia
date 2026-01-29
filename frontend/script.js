const API_URL = "http://localhost:3000";

// Função para Cadastrar Usuário
async function cadastrarUsuario(event){
    event.preventDefault(); // Não deixa a tela piscar/recarregar

    // 1. Pega os dados dos inputs
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // 2. Monta o pacote JSON
    const dados = {
        nome: nome,
        email: email,
        senha: senha,
        tipo: "cliente"
    };

    try {
        // 3. Envia para o Backend
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        // 4. Recebe a resposta 
        const result = await response.json();

        if(response.ok){
            alert("Usuário cadastrado com sucesso!");
            window.location.href = "index.html"; // Manda para o Login
        }
        else {
            alert("Erro: " + result.erro);
        }
    }
    catch (error) {
        console.error("Erro na requisição:", error);
        alert("Erro ao conectar com o servidor.");
    }

}

async function login(){
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const result = await response.json();

        if (response.ok) {
            // Salva os dados do usuário no navegador para usar depois
            localStorage.setItem("usuario", JSON.stringify(result.usuario));

            alert ("Login realizado com sucesso!")

            // Redireciona dependendo do tipo de usuário
            if (result.usuario.tipo === "barbeiro") {
                window.location.href = "dashboard-barbeiro.html";
            }
            else {
                window.location.href = "agenda.html";
            }
        }
        else {
            msg.innerText = result.mensagem || result.erro;
        }
    }

    catch(error) {
        msg.innerText = "Erro ao conectar com o servidor."
    }

}