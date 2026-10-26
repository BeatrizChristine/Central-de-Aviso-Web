# Central de Avisos Web

Versão web da Central de Avisos, construída com TypeScript, React e Next.js. A aplicação JavaFX original continua na raiz do repositório e pode ser executada normalmente durante a migração.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Informe em `INTRANET_BASE_URL` o endereço do servidor da Intranet.
3. Se necessário, informe `INTRANET_AVISOS_TOKEN`.

O endereço padrão conhecido é `http://intranet.idam.am.gov.br:3000` e só fica acessível quando o computador está conectado à rede interna. Para desenvolvimento com um servidor executado no próprio computador, substitua-o por `http://localhost:3000`.

## Executar

No PowerShell, dentro da pasta `web`:

```powershell
npm.cmd run dev
```

Acesse o endereço exibido no terminal, normalmente `http://localhost:5173`.

O comando `npm.cmd run dev` também inicia, em `127.0.0.1:5190`, um resolvedor local de nomes de máquinas. Ele recebe somente IPs privados devolvidos pela API, consulta o nome pelo Windows e mantém os resultados em cache. Por isso, a tela **Acessando agora** mostra o hostname e o IP quando o notebook está conectado à rede interna.

Se quiser iniciar apenas a interface, sem resolução de nomes, use:

```powershell
npm.cmd run dev:web
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
