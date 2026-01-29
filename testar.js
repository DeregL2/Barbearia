async function testarLogin() {
    console.log("🔑 Tentando fazer login...");

    // Nota: Agora estamos chamando a rota /login
    const resposta = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "teste@email.com", // O email que cadastramos antes
            senha: "123"             // A senha correta
        })
    });

    const dados = await resposta.json();
    console.log("📩 Resposta do Servidor:", dados);
}

testarLogin();