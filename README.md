# Central de Avisos Web

Painel interno para publicar avisos, gerenciar popups e mensagens da Intranet e acompanhar os dispositivos conectados. A aplicação usa React, TypeScript, Vinext e autenticação no Active Directory.

## Requisitos

- Node.js 22.13 ou superior.
- Acesso à rede interna para consultar a Intranet e o Active Directory.
- Um arquivo `.env.local` criado a partir do `.env.example`.

## Configuração local

Copie `.env.example` para `.env.local` e informe os valores reais somente no arquivo local:

```dotenv
INTRANET_BASE_URL=https://intranet.exemplo.gov.br
INTRANET_AVISOS_TOKEN=

CENTRAL_AD_URL=ldaps://dc01.exemplo.local:636
CENTRAL_AD_DOMAIN=exemplo.local
CENTRAL_AD_BASE_DN=DC=exemplo,DC=local
CENTRAL_AD_ALLOWED_GROUPS=CENTRAL_AVISOS_ADMIN,CENTRAL_AVISOS_OPERADOR
CENTRAL_AD_ALLOW_INSECURE_LDAP=false
CENTRAL_AUTH_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

Não coloque endereços internos, domínio real, grupos, tokens ou senhas no `.env.example`. O `.env.local` é ignorado pelo Git.

Para produção, use LDAPS com certificado válido e mantenha `CENTRAL_AD_ALLOW_INSECURE_LDAP=false`.

## Executar

No PowerShell, na raiz do repositório:

```powershell
npm.cmd install
npm.cmd run dev
```

O endereço padrão é `http://localhost:5173`. Para usar outra porta:

```powershell
npm.cmd run dev:web -- --port 5174
```

O comando `dev` também inicia em `127.0.0.1:5190` o resolvedor local de nomes das máquinas. Para iniciar somente a interface:

```powershell
npm.cmd run dev:interface -- --port 5174
```

## Verificações

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Para executar todas em sequência:

```powershell
npm.cmd run check
```

Essas mesmas verificações são executadas pelo GitHub Actions em pushes para a branch `main` e em pull requests.

## Estrutura principal

```text
app/                 páginas e rotas HTTP
components/          componentes compartilhados da interface
features/notices/    criação e pré-visualização de avisos
features/monitor/    gráfico, tipos e utilitários do monitor
lib/auth/            configuração, Active Directory e sessão
lib/client/          tratamento compartilhado das respostas HTTP
lib/server/          integração de servidor com a Intranet
types/               contratos compartilhados
tests/               testes unitários
```

## Segurança

- A senha do usuário é utilizada apenas durante o bind LDAP e não é armazenada.
- A sessão é assinada com HMAC e enviada em cookie `HttpOnly`.
- As rotas da Intranet exigem uma sessão válida.
- O token da Intranet é utilizado somente nas rotas de servidor.
- A resolução de hostnames aceita somente endereços IPv4 privados.
