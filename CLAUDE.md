# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Common commands

### Backend
- Create a virtual environment: `python -m venv .venv`
- Activate it on Windows: `.venv\Scripts\activate`
- Install Python dependencies: `pip install -r requirements.txt`
- Run the app locally: `python app.py`
- Initialize database tables: `python scripts/migrations/init_agent_knowledge_tables.py`
- Run the available Python checks/tests: `python -m pytest tests/` and `python scripts/test_bootstrap_in_agent.py`
- Run one test file: `python -m pytest tests/test_bootstrap.py -v`

### Frontend
- Install frontend dependencies: `cd frontend && npm install`
- Start the Vite dev server: `cd frontend && npm run dev`
- Build the frontend: `cd frontend && npm run build`
- Preview a production build: `cd frontend && npm run preview`

### Docker / deployment
- Start services: `./deploy.sh start`
- Start with monitoring: `./deploy.sh monitor`
- Stop services: `./deploy.sh stop`
- Rebuild images: `./deploy.sh build`
- Check status: `./deploy.sh status`
- View logs: `./deploy.sh logs [service]`
- Initialize DB in containers: `./deploy.sh init-db`
- Manage the database directly: `./start_db.sh create|start|stop|restart|status|logs|connect|backup`

## Architecture overview

### Request flow
- `app.py` is the Flask entrypoint.
- It serves the built Vue app from `frontend/dist` and exposes the HTTP API.
- The frontend dev server proxies API requests to `http://localhost:5000` during development (`frontend/vite.config.ts`).

### Backend layers
- `config.py` loads environment variables and centralizes runtime settings.
- `services/` contains the main application logic:
  - `services/chat_service.py` drives conversation flow, session management, tool use, and streaming.
  - `services/bootstrap/` assembles token-budgeted context from soul/user/agent/memory sources.
  - `services/context/` handles journals, summaries, and long-term memory.
  - `services/rag/` contains retrieval, BM25, MMR reranking, query optimization, and embedding logic.
  - `services/knowledge_base/` handles knowledge-base CRUD and document ingestion.
  - `services/monitoring/` exposes metrics collection.
- `agent/` holds LLM prompts, planning, tool wrappers, and multi-agent/team orchestration.
- `mcp/` provides the MCP API, registry, adapters, and transports for external tool integrations.
- `models/` contains database models.
- `scripts/migrations/` contains the SQL/bootstrap migration used by PostgreSQL initialization.

### Data and infrastructure
- Docker Compose wires together the app, PostgreSQL with pgvector, Redis, and optional Prometheus/Grafana.
- Uploaded files and generated archives are persisted under `uploads/` and `archives/`.
- The app relies on environment variables for API keys and runtime behavior; `.env` is expected before Docker startup.

### Frontend structure
- `frontend/src/router` and `frontend/src/views` define the top-level screens.
- `frontend/src/stores` uses Pinia for app state.
- `frontend/src/components` is split into layout, chat, common, and other feature components.
- `frontend/src/composables` contains reusable Vue logic such as streaming and polling.
- The UI is a Vue 3 + TypeScript + Vite app with Tailwind configured through Vite.

### Notes
- `README.md` is the best source for feature-level behavior and API routes.
- Prefer the existing service boundaries instead of introducing new top-level abstractions.
- Keep changes aligned with the Flask backend + Vue frontend split and the Docker-based local workflow.


## development rules
1、对于web项目每次功能实现都需要自己用curl调api测试是否能使用
2、临时脚本文件应当全部创建在"D:\WWWWokP\MalogBot\scripts"
3、数据库创建后的sql\js等文件放在D:\WWWWokP\MalogBot\dataset
4、分析任务后对于复杂任务应当使用openspec的skills 
5、对于策划书D:\WWWWokP\MalogBot\signed下的内容，可能有不足之处，应当使用openspec的explore工作流先探索 
6、使用危险指令应当三思而后行
7、技术选项不足或缺失之处应该自己增加修改
8、在D:\WWWWokP\college_students_project\skills下增加新的skill
9、尽量使用子agent防止上下文爆炸