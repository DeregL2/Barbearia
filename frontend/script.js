const API = "http://localhost:3000";

async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msg = document.getElementById("msg");

    msg.innerText = "Entrando...";

    try {

        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify ({ email, senha })
        });
        
        const data = await res.json();

        if(!res.ok) {
            msg.innerText = data.erro;
            return;
        }
        
        localStorage.setItem("usuario", JSON.stringify(data.usuario));

        if(data.usuario.tipo === "barbeiro"){
            window.location.href = "dashboard-barbeiro.html";
        }

        else {
            window.location.href = "barbeiros.html";
        }
    }

    catch (err){
        msg.innerText = "Erro ao conectar no servidor";
    }

    async function carregarBarbeiros() {
        const lista = document.getElementById("lista-barbeiros");

        try {
            const res = await fetch(`${API}/barbeiros`);
            const barbeiros = await res.json();

            lista.innerHTML = "";

            if(barbeiros.length === 0){
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

        if (window.location.pathname.includes("barbeiros.html")) {
            carregarBarbeiros();
        }
    }

}