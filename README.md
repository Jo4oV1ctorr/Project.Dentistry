# Project.Dentistry


# 🦷 Sistema de Gestão Odontológica - Back-End

Este projeto representa o back-end completo de um sistema voltado à gestão de pacientes e diagnósticos em clínicas odontológicas. A aplicação foi desenvolvida com foco em performance, organização de dados e facilidade na geração de laudos clínicos.

## 💻 Tecnologias Utilizadas

- **Node.js** (Ambiente de execução)
- **Express.js** (Framework para criação de APIs REST)
- **MongoDB** (Banco de dados NoSQL)
- **Mongoose** (ODM para integração entre Node.js e MongoDB)
- **PDFKit** / **html-pdf** (Geração de documentos PDF)
- **DotEnv** (Gerenciamento de variáveis de ambiente)
- **Nodemon** (Desenvolvimento com hot-reload)

---

## 🧠 Meu Papel no Projeto

Fui responsável por **todo o desenvolvimento do back-end** da aplicação, o que incluiu:

### 1. 🗂️ Modelagem e Estrutura do Banco de Dados

- Criação de um banco de dados **MongoDB** estruturado para armazenar:
  - Dados cadastrais de pacientes
  - Históricos clínicos
  - Diagnósticos e laudos médicos
- Desenvolvimento dos modelos com **Mongoose** com foco em integridade e organização dos dados.

### 2. 🌐 Desenvolvimento da API REST

- Criação de rotas organizadas com **Express.js** para:
  - Cadastro e listagem de pacientes
  - Registro e atualização de diagnósticos
  - Consulta por histórico
- Middleware para tratamento de erros, autenticação e logs.
- Organização dos controladores e serviços para escalabilidade futura.

### 3. 🧾 Geração Automatizada de Relatórios em PDF

- Após o registro do diagnóstico, a aplicação:
  - Coleta os dados do paciente e o resultado do laudo
  - Gera automaticamente um **relatório em PDF** contendo todas as informações clínicas
  - Torna o arquivo disponível para **download ou envio por e-mail**

Exemplo de conteúdo do PDF:
Nome do Paciente: João da Silva
Data: 26/06/2025
Diagnóstico: Gengivite avançada
Recomendações: Tratamento periodontal e higiene oral reforçada


### 4. 🧪 Testes e Validações

- Testes manuais de todas as rotas da API com ferramentas como **Postman** e **Insomnia**
- Testes de carga para garantir performance em múltiplas requisições

---

## 📁 Estrutura do Projeto

📦backend-odontologia
┣ 📁controllers
┣ 📁models
┣ 📁routes
┣ 📁services
┣ 📁utils
┣ 📄server.js
┗ 📄.env


---

## 🚀 Como Executar o Projeto

### Pré-requisitos:

- Node.js instalado
- MongoDB (local ou Atlas)
- Git

### Instalação:

```bash
git clone https://github.com/seu-usuario/backend-odontologia.git
cd backend-odontologia
npm install
```
Crie um arquivo .env com as seguintes variáveis:

MONGODB_URI=mongodb://localhost:27017/odontologia
PORT=3000

para executar 
npm run dev

🤝 Contribuição
Este projeto foi desenvolvido como parte de um projeto prático na área de saúde odontológica, com foco em trazer soluções reais para o atendimento clínico digital.
