# 💈 App Barbearia V2 - Sistema de Agendamento Profissional

![Status](https://img.shields.io/badge/Status-Concluído-success)
![Plataforma](https://img.shields.io/badge/Plataforma-Web%20%7C%20Android-blue)
![Tecnologia](https://img.shields.io/badge/Stack-Node.js%20%7C%20Capacitor-gold)

Um sistema completo de agendamento para barbearias, construído com foco na experiência do usuário (Mobile-first) e regras de negócio sólidas. O projeto conta com um aplicativo Android para clientes e barbeiros, e um painel administrativo.

---

## 🚀 Funcionalidades Principais

O sistema é dividido em 3 níveis de acesso:

### 👤 Para Clientes
* **Autenticação:** Cadastro, Login e Recuperação de Senha criptografados.
* **Agendamento Inteligente:** Escolha do profissional, data e horário (slots de 30 min).
* **Integração com Agenda:** Salva o agendamento direto no Google Agenda do celular nativamente.
* **Gestão de Cortes:** Visualização de agendamentos futuros.
* **Regra de Cancelamento:** Bloqueio de cancelamento se faltar menos de 24 horas para o corte.
* **Regra de Agendamento:** Limite de 1 agendamento por dia por cliente.

### ✂️ Para Barbeiros
* **Gestão de Horários:** Painel para definir horários disponíveis em dias específicos.
* **Agenda do Dia:** Visualização clara de quem são os clientes do dia e horários marcados.

### 👑 Para o Administrador (Dono)
* **Gestão da Equipe:** Adicionar, editar foto/descrição e excluir barbeiros.
* **Gestão Financeira:** Alteração global do valor do corte e do "sinal" obrigatório via PIX.

---

## 🛠️ Tecnologias Utilizadas

**Frontend / Mobile (App)**
* HTML5, CSS3, JavaScript (Vanilla)
* **Bootstrap 5** (Design responsivo)
* **SweetAlert2** (Popups e modais nativos)
* **Capacitor.js** (Empacotamento Web -> Android APK)

**Backend (API)**
* **Node.js** com **Express**
* **TypeScript**
* **Prisma ORM** (Gestão do Banco de Dados)
* **Bcrypt** (Criptografia de senhas)
* **CORS** (Liberação de rotas para o App mobile)

