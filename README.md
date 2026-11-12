# GlassExport — Sistema administrativo

Sistema web leve para gestão de uma exportadora de copos de vidro.

## Requisitos
- Node.js 13.6.0
- Navegador atualizado
- MySQL opcional. Sem MySQL, o sistema salva em `data/database.json`.

O servidor usa módulos nativos do Node.js no modo JSON. Para MySQL, o pacote `mysql` precisa estar disponível.

## Como iniciar em modo JSON
1. Extraia a pasta do ZIP.
2. Abra a pasta no VS Code.
3. Abra Terminal > Novo Terminal.
4. Execute `node server.js`.
5. Acesse `http://localhost:3000`.

Login inicial:
- Usuário: `admin`
- Senha: `troque-esta-senha`

## Configurar MySQL
1. Inicie o serviço do MySQL.
2. Abra `database/glass_export.sql` no MySQL Workbench e execute o script. Ele cria o banco `glass_export` e a tabela `app_data`.
3. No terminal do VS Code, na pasta principal do projeto, instale o driver (se permitido):
   `npm install mysql@2.18.1`
4. Configure as variáveis de ambiente e inicie o servidor.

### Se o terminal do VS Code for Prompt de Comando (cmd)
Execute uma linha por vez:
```
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=sua_senha
set DB_NAME=glass_export
node server.js
```

### Se o terminal do VS Code for PowerShell
Execute:
```
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="sua_senha"
$env:DB_NAME="glass_export"
node server.js
```

Substitua `sua_senha` pela senha real do usuário MySQL. Não compartilhe essa senha nem a publique no GitHub. As variáveis definidas dessa forma valem apenas para aquela janela do terminal.

## Observação importante sobre o banco atual
O arquivo SQL corresponde à versão atual do código: ela usa uma tabela genérica `app_data`, que guarda cada registro como JSON. Ainda não é um modelo relacional com uma tabela SQL independente para cada entidade. A versão JSON e a versão MySQL também não fazem sincronização ou migração automática entre si.

## Regras de preço e câmbio
- Preço de venda em reais = custo unitário × 2 (margem de 100% sobre o custo).
- Total do pedido em reais = preço de venda × quantidade.
- Cotação informada como BRL por 1 unidade estrangeira. Exemplo: USD 1 = BRL 5.
- Total na moeda estrangeira = total em BRL ÷ cotação.
- A cotação usada fica registrada no pedido.

## Módulos da primeira versão
- Login administrativo simples
- Dashboard com totais
- Cadastro e exclusão de produtos, clientes, moedas, países e pedidos
- Cálculo automático dos pedidos
- Persistência em JSON e suporte opcional a MySQL

## Limitações e próximos passos
- Esta é uma primeira versão, não um sistema pronto para produção.
- A sessão fica em memória e termina quando o servidor reinicia.
- A autenticação inicial é simples; antes de uso real, implemente hash de senha, gestão de usuários, proteção CSRF, HTTPS e permissões.
- Cotações são informadas manualmente; não há consulta automática a serviços externos.
- Relatórios avançados, edição de registros, importação/exportação CSV, trilha de auditoria e banco relacional normalizado ainda precisam ser implementados.
- Faça cópias de segurança de `data/database.json` quando usar o modo JSON.
