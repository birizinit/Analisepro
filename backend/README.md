# Sistema de Indicadores de Trading White Label - Backend

Backend Flask para a plataforma multi-tenant de indicadores de trading white label.

## Instruções de Configuração

### 1. Instalar Dependências

\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

### 2. Configuração do Banco de Dados

As tabelas do banco de dados serão criadas automaticamente usando os scripts SQL na pasta `scripts/`.

Execute os scripts na ordem:
1. `01_create_tables.sql` - Cria todas as 8 tabelas do banco de dados
2. `02_seed_super_admin.sql` - Cria a conta inicial de super admin

**Credenciais Padrão do Super Admin:**
- Usuário: `superadmin`
- Senha: `SuperAdmin123!`
- **⚠️ ALTERE ESTA SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN**

### 3. Variáveis de Ambiente

As seguintes variáveis de ambiente estão automaticamente disponíveis pela integração Vercel/Supabase:
- `SUPABASE_POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Variáveis adicionais para configurar:
- `SECRET_KEY` - Chave secreta do Flask
- `JWT_SECRET_KEY` - Chave secreta do token JWT

### 4. Executar a Aplicação

\`\`\`bash
python app.py
\`\`\`

A API estará disponível em `http://localhost:5000`

## Esquema do Banco de Dados

### Tabelas:
1. **super_admin** - Contas de super administrador
2. **white_label_clients** - Contas de clientes white label
3. **user_tokens** - Tokens de acesso de usuários finais
4. **client_customization** - Configurações específicas do cliente
5. **activity_logs** - Rastreamento de atividades do sistema
6. **analytics** - Análises diárias por cliente
7. **system_settings** - Configurações globais do sistema
8. **api_keys** - Chaves API da Binance por cliente

## Endpoints da API

- `/api/auth/*` - Endpoints de autenticação
- `/api/super-admin/*` - Dashboard do super admin
- `/api/client/*` - Gerenciamento de clientes white label
- `/api/tokens/*` - Gerenciamento de tokens
- `/api/analytics/*` - Análises e relatórios

## Arquitetura

- **Isolamento multi-tenant**: Os dados de cada cliente são completamente isolados
- **Autenticação JWT**: Autenticação segura baseada em tokens
- **Registro de Atividades**: Registro abrangente de todas as ações
- **Escalável**: Projetado para lidar com 100+ clientes e 1000+ tokens
