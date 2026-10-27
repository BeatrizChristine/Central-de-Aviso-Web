# Central de Avisos Web

Versão web da Central de Avisos, construída com TypeScript, React e Next.js. A aplicação JavaFX original continua na raiz do repositório e pode ser executada normalmente durante a migração.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Informe em `INTRANET_BASE_URL` o endereço do servidor da Intranet.
3. Se necessário, informe `INTRANET_AVISOS_TOKEN`.

## Login com Active Directory

O login valida as credenciais diretamente no Active Directory do IDAM. A senha é usada somente
durante o bind LDAP e não é armazenada. Depois da validação, a Central cria uma sessão assinada em
cookie `HttpOnly`; as rotas de avisos, mensagens, anexos, visitas e diagnóstico recusam chamadas sem
uma sessão válida.

Configure no `.env.local`:

```dotenv
CENTRAL_AD_URL=ldaps://dc01.exemplo.local:636
CENTRAL_AD_DOMAIN=exemplo.local
CENTRAL_AD_BASE_DN=DC=exemplo,DC=local
CENTRAL_AD_ALLOWED_GROUPS=CENTRAL_AVISOS_ADMIN,CENTRAL_AVISOS_OPERADOR
CENTRAL_AD_ALLOW_INSECURE_LDAP=false
CENTRAL_AUTH_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

Mantenha os endereços, nomes de domínio, grupos e segredos reais exclusivamente no `.env.local`.
Para produção, use LDAPS com certificado válido e mantenha
`CENTRAL_AD_ALLOW_INSECURE_LDAP=false`.

O servidor da Intranet só fica acessível quando o computador está conectado à rede interna. Para desenvolvimento com um servidor executado no próprio computador, use `http://localhost:3000`.

## Executar

No PowerShell, dentro da pasta `web`:

```powershell
npm.cmd run dev
```

Acesse o endereço exibido no terminal, normalmente `http://localhost:5173`.

O comando `npm.cmd run dev` também inicia, em `127.0.0.1:5190`, um resolvedor local de nomes de máquinas. Ele recebe somente IPs privados devolvidos pela API, consulta o nome pelo Windows e mantém os resultados em cache. Por isso, a tela **Acessando agora** mostra o hostname e o IP quando o notebook está conectado à rede interna.

Para usar outra porta e manter a resolução de nomes ativa, use, por exemplo:

```powershell
npm.cmd run dev:web -- --port 5174
```

Se quiser iniciar apenas a interface, sem o serviço de resolução de nomes, use:

```powershell
npm.cmd run dev:interface -- --port 5174
```

## Compilar

```powershell
npm.cmd run build
```

O token da Intranet é utilizado apenas pelas rotas de servidor em `app/api`. Ele não deve ser colocado em componentes do navegador.

## Estado da migração

- Novo aviso: formulário, pré-visualização e publicação pela API.
- Popups: listagem, pesquisa, ativação, desativação e exclusão.
- Mensagem do dia: listagem, criação, edição e exclusão.
- Histórico: consulta, pesquisa, filtros, ordenação e indicadores.
- Monitor de acessos: gráfico de atividade, dispositivos online, IP, última atividade, tempo conectado, status e navegador, com atualização automática.
- Configurações: diagnóstico do servidor, segurança e endpoints integrados.

As funcionalidades conectadas exibem uma mensagem amigável enquanto `INTRANET_BASE_URL` estiver indisponível.
