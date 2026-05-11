# MalogBot 项目规格文档 (Specification)

> 版本: 1.0  
> 日期: 2026-04-16  
> 状态: 活跃

---

## 1. 项目概述

### 1.1 项目名称

**MalogBot** — 基于 RAG 和智能 Agent 的知识管理助手

### 1.2 项目定位

MalogBot 是一个企业级智能助手平台，通过 RAG（检索增强生成）技术实现知识库问答，结合大语言模型的能力，实现智能对话、工具调用、任务管理、多Agent协作等功能。系统采用三层上下文架构，支持长期记忆和自动压缩，确保长对话场景下的稳定运行。

### 1.3 核心价值

- **Agent 自我进化知识库**：Agent 可以在对话中自主学习和记忆，记录用户信息、偏好、踩坑经验，并自动提炼为行为规则
- **Token 预算动态加载**：Bootstrap 服务基于 Token 预算动态加载知识块，确保上下文在模型窗口内高效利用
- **两级缓存架构**：L1 本地缓存 + L2 Redis 缓存，大幅提升检索性能
- **Prometheus + Grafana 监控**：完整的可观测性方案，实时监控系统运行状态

---

## 2. 技术栈

### 2.1 后端技术

| 类别 | 技术 | 版本要求 |
|------|------|----------|
| 语言 | Python | 3.10+ |
| Web 框架 | Flask | 2.0+ |
| LLM 框架 | LangChain | 0.3+ |
| Agent 框架 | LangGraph | 0.2+ |
| 大语言模型 | DeepSeek API | deepseek-chat |
| 数据库 | PostgreSQL (pgvector) | 15+ |
| 缓存 | Redis | 7+ |
| 向量化服务 | 阿里云百炼 | text-embedding-v4 |
| 联网搜索 | 百度云 MCP | Web Search |
| 流式响应 | Server-Sent Events (SSE) | - |
| 文档解析 | pdfplumber, python-docx | - |
| 监控 | Prometheus, Grafana | - |
| 评估 | RAGAS | 0.1+ |
| 容器化 | Docker, Docker Compose | - |

### 2.2 前端技术

| 类别 | 技术 |
|------|------|
| 模板引擎 | Jinja2 |
| 样式 | 原生 CSS |
| 交互 | 原生 JavaScript |

---

## 3. 系统架构

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                        Flask Web 应用                        │
│                      (app.py 主入口)                         │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  会话管理  │  对话接口  │  命令确认  │  知识库管理  │   监控指标    │
│  /sessions│  /chat    │  /confirm │  /kb      │  /monitoring  │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                      ChatService (外观模式)                   │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Agent    │ Bootstrap│  上下文   │   RAG    │    知识库       │
│  Service  │ Service  │  管理     │  Service │   Service      │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                     核心基础设施层                             │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│PostgreSQL│  Redis   │  LLM API │  阿里云   │   百度云        │
│(pgvector)│  缓存    │ DeepSeek │  百炼     │   MCP          │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

### 3.2 Agent 架构

```
Agent Service
    ├── LLM Client (ChatOpenAI → DeepSeek API)
    ├── Tools (工具系统)
    │   ├── bash          — 命令执行（安全检测）
    │   ├── memory        — 长期记忆存储
    │   ├── knowledge     — 知识库工具（用户信息/偏好/踩坑）
    │   ├── skills        — 自定义技能扩展
    │   ├── sub_agent     — 子代理协作
    │   ├── task_manager  — 任务管理
    │   ├── todo_manager  — TODO 管理
    │   └── context_compact — 上下文压缩
    └── Team (多Agent团队)
        ├── Router        — 意图路由器
        ├── Leader        — 任务拆解与整合
        ├── TaskBoard     — 任务看板
        └── Follower Pool — 并行执行池
```

### 3.3 三层上下文架构

| 层级 | 名称 | 存储 | 特点 |
|------|------|------|------|
| 第一层 | Journal | JSONL 文件 | 原始消息实时存储，支持完整恢复 |
| 第二层 | Memory | PostgreSQL (pgvector) | Agent 主动存储关键信息，向量化 + Rerank 检索 |
| 第三层 | Summary | 当前上下文窗口 | LLM 生成摘要替换旧消息，减少 Token 占用 |

**工作流程**：
1. 每条消息实时追加到 JSONL 文件（Journal 服务）
2. 当达到阈值（80% 上下文窗口），触发压缩
3. 压缩时：后台线程提取关键信息向量化存储（Memory 服务），LLM 生成摘要替换旧消息，保留最近几条消息
4. Agent 可主动调用工具存储重要信息到长期记忆
5. 对话时通过 RAG 检索相关记忆，使用 Rerank 过滤高相关性结果

### 3.4 Bootstrap 动态加载架构

```
总预算 (16000 tokens)
    │
    ├── SOUL (固定): ~500 tokens     — Agent 核心身份、价值观
    ├── USER (动态): ~1000 tokens    — 用户画像和偏好
    ├── AGENTS (智能): ~2000 tokens  — 规则优先 + 近期踩坑
    ├── MEMORY (检索): ~4000 tokens  — 向量相似度 + BM25 + MMR + 时间衰减
    └── 动态检索 (剩余): ~8000 tokens — 基于用户查询的实时检索
```

---

## 4. 模块详细设计

### 4.1 项目目录结构

```
malogbot/
├── app.py                    # Flask 应用主入口
├── config.py                 # 配置管理模块
├── requirements.txt          # 项目依赖
├── .env.example              # 环境变量示例
├── Dockerfile                # Docker 镜像构建
├── docker-compose.yml        # Docker Compose 编排
│
├── agent/                    # Agent 模块
│   ├── llm.py               # LLM 客户端封装 (ChatOpenAI)
│   ├── prompts.py           # 提示词模板
│   ├── planning.py          # 规划模块
│   ├── team/                # 多Agent团队协作系统
│   │   ├── types.py         # 类型定义 (ExecutionMode, TeamResult, RoutingDecision)
│   │   ├── router.py        # 意图路由器 (复杂度分析)
│   │   ├── leader.py        # Leader Agent (任务拆解与整合)
│   │   ├── task_board.py    # 任务看板 (DAG依赖管理)
│   │   ├── follower.py      # Follower Agent (子任务执行)
│   │   └── orchestrator.py  # 团队编排器 (AgentsTeam)
│   └── tools/               # 工具模块
│       ├── bash.py          # Bash 命令执行 (安全检测)
│       ├── memory.py        # 长期记忆存储
│       ├── knowledge_tools.py # 知识库工具
│       ├── skills.py        # 技能加载
│       ├── sub_agent.py     # 子代理
│       ├── task_manager.py  # 任务管理
│       ├── todo_manager.py  # TODO 管理
│       └── context_compact.py # 上下文压缩
│
├── services/                 # 服务层
│   ├── core/                # 核心模块
│   │   ├── interfaces.py    # 抽象接口定义
│   │   └── types.py         # 核心类型定义
│   ├── agent/               # Agent 服务
│   │   ├── agent_service.py # Agent 执行服务
│   │   ├── stream_handler.py # 流式输出处理
│   │   └── tool_manager.py  # 工具管理器
│   ├── bootstrap/           # Bootstrap 动态加载
│   │   ├── bootstrap_service.py # 加载服务
│   │   ├── cache.py         # 两级缓存 (L1 本地 + L2 Redis)
│   │   ├── token_counter.py # Token 计数
│   │   ├── prompt_assembler.py # Prompt 组装
│   │   └── models.py        # 数据模型
│   ├── context/             # 上下文管理
│   │   ├── session_store.py       # 会话存储
│   │   ├── conversation_journal.py # 对话日志 (JSONL)
│   │   ├── context_compactor.py   # 上下文压缩
│   │   └── long_term_memory.py    # 长期记忆
│   ├── rag/                 # RAG 检索服务
│   │   ├── rag_service.py         # 基础检索服务
│   │   ├── enhanced_rag_service.py # 增强版检索 (查询优化)
│   │   ├── embedding_service.py   # 向量化服务 (阿里云百炼)
│   │   ├── bm25_service.py        # BM25 关键词检索
│   │   ├── mmr_reranker.py        # MMR 多样性重排序
│   │   └── query_optimizer.py     # 查询优化器
│   ├── knowledge_base/      # 知识库服务
│   │   ├── knowledge_base_service.py # 知识库CRUD
│   │   └── document_service.py      # 文档处理
│   ├── monitoring/          # 监控服务
│   │   └── metrics_collector.py     # Prometheus 指标收集
│   ├── chat_service.py      # 对话服务 (外观模式)
│   ├── agent_knowledge_repository.py # Agent 知识库 Repository
│   ├── memory_search_engine.py     # 记忆搜索引擎
│   ├── redis_service.py           # Redis 服务
│   └── db_manager.py              # 数据库管理
│
├── models/                   # 数据模型
│   ├── database.py          # 基础模型 (Session, Message, ContextArchive, LongTermMemory, ConversationJournal)
│   ├── knowledge_base.py    # 知识库模型
│   └── agent_knowledge.py   # Agent 知识库模型 (KnowledgeFile, KnowledgeItem, AgentRule, AgentMistake)
│
├── mcp/                      # MCP 协议适配
│   └── adapters.py          # 百度云 Web Search 适配器
│
├── monitoring/               # 监控系统
│   ├── docker-compose.yml   # Prometheus + Grafana
│   ├── prometheus.yml       # Prometheus 配置
│   └── grafana/             # Grafana 配置
│
├── skills/                   # 技能模块
│   └── postgres-performance-diagnosis/ # PostgreSQL 性能诊断技能
│
├── templates/                # HTML 模板
│   └── index.html           # 主页面
│
├── dicts/                    # 分词词典
└── assert/                   # 图片资源
```

### 4.2 核心数据模型

#### Session（会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| session_id | String(100) PK | 会话唯一标识 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |
| web_search_enabled | Boolean | 是否启用联网搜索 |
| knowledge_base_id | String(100) | 当前选中的知识库ID |
| onboarding_completed | Boolean | 是否完成首次引导 |
| onboarding_data | JSONB | 引导数据 |

#### Message（消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| session_id | String(100) FK | 所属会话 |
| role | String(20) | 角色 (user/assistant/system/tool) |
| content | Text | 消息内容 |
| timestamp | DateTime | 时间戳 |
| tool_call_id | String(100) | 工具调用ID |
| tool_calls | Text | 工具调用列表 (JSON) |
| tool_name | String(100) | 工具名称 |

#### LongTermMemory（长期记忆）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer PK | 自增主键 |
| session_id | String(100) FK | 来源会话 |
| memory_type | String(50) | 记忆类型 (fact/decision/preference/action/summary) |
| content | Text | 记忆内容 |
| embedding | Text | 向量嵌入 (JSON) |
| importance | Float | 重要性分数 0-1 |
| access_count | Integer | 访问次数 |
| parent_id | Integer | 父记忆ID (分块关联) |
| chunk_index | Integer | 分块索引 |
| total_chunks | Integer | 总分块数 |

#### AgentKnowledge（Agent 知识库）

| 知识块类型 | 说明 | 缓存 TTL |
|-----------|------|----------|
| SOUL | Agent 核心身份、价值观 | 1 小时 |
| USER | 用户画像和偏好 | 10 分钟 |
| AGENTS | 行为规则和踩坑经验 | 5 分钟 |
| MEMORY | 长期记忆条目 | 3 分钟 |

---

## 5. API 接口规格

### 5.1 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sessions` | 获取所有会话列表 |
| POST | `/sessions/new` | 创建新会话 |
| DELETE | `/sessions/<session_id>` | 删除会话 |
| POST | `/sessions/<session_id>/switch` | 切换会话 |
| GET | `/sessions/<session_id>/info` | 获取会话详情 |
| GET | `/sessions/<session_id>/knowledge-base` | 获取知识库设置 |
| PUT | `/sessions/<session_id>/knowledge-base` | 设置知识库 |

### 5.2 对话接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | 非流式对话 |
| POST | `/chat/stream` | 流式对话 (SSE) |
| GET | `/history` | 获取对话历史 |
| POST | `/reset` | 重置会话 |
| POST | `/stop` | 取消流式输出 |

### 5.3 命令确认

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/confirm` | 确认执行命令 (非流式) |
| POST | `/confirm/stream` | 确认执行命令 (流式) |
| POST | `/cancel` | 取消命令执行 |

### 5.4 团队协作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/team/status` | 获取团队执行状态 |
| GET | `/team/task-board` | 获取任务看板视图 |

### 5.5 任务继续

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/continue` | 继续执行 (非流式) |
| POST | `/continue/stream` | 继续执行 (流式) |

### 5.6 联网搜索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/web-search/status` | 获取联网搜索状态 |
| POST | `/web-search/toggle` | 切换联网搜索开关 |

### 5.7 知识库管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/knowledge-bases` | 获取知识库列表 |
| POST | `/knowledge-bases` | 创建知识库 |
| GET | `/knowledge-bases/<kb_id>` | 获取知识库详情 |
| DELETE | `/knowledge-bases/<kb_id>` | 删除知识库 |
| GET | `/knowledge-bases/<kb_id>/documents` | 获取文档列表 |
| POST | `/knowledge-bases/<kb_id>/documents` | 上传文档 |
| DELETE | `/documents/<doc_id>` | 删除文档 |

### 5.8 监控指标

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/monitoring/bootstrap` | Bootstrap 加载指标 |
| GET | `/monitoring/retrieval` | 检索指标 |
| GET | `/monitoring/knowledge` | 知识库状态指标 |
| GET | `/monitoring/alerts` | 监控告警 |
| GET | `/monitoring/prometheus` | Prometheus 格式导出 |

---

## 6. 配置规格

### 6.1 环境变量

| 变量名 | 默认值 | 说明 | 必填 |
|--------|--------|------|------|
| `SECRET_KEY` | dev-secret-key | Flask Secret Key | 是 |
| `FLASK_DEBUG` | True | 调试模式 | 否 |
| `DATABASE_URL` | postgresql://malog:...@127.0.0.1:5433/malogbot | 数据库连接 | 是 |
| `DEEPSEEK_API_KEY` | - | DeepSeek API Key | 是 |
| `DEEPSEEK_BASE_URL` | https://api.deepseek.com/v1 | DeepSeek API 地址 | 否 |
| `MODEL_NAME` | deepseek-chat | 模型名称 | 否 |
| `DASHSCOPE_API_KEY` | - | 阿里云百炼 API Key | 是(RAG) |
| `EMBEDDING_MODEL` | text-embedding-v4 | 向量模型 | 否 |
| `EMBEDDING_DIMENSION` | 1024 | 向量维度 | 否 |
| `RERANK_MODEL` | qwen3-vl-rerank | 重排序模型 | 否 |
| `BAIDU_MCP_API_KEY` | - | 百度云 API Key | 否(联网搜索) |
| `WEB_SEARCH_ENABLED` | false | 联网搜索开关 | 否 |
| `REDIS_URL` | redis://localhost:6379/0 | Redis 连接 | 否 |
| `MAX_CONTEXT_TOKENS` | 128000 | 最大上下文窗口 | 否 |
| `COMPACT_THRESHOLD_RATIO` | 0.8 | 压缩触发阈值 | 否 |
| `ENABLE_LONG_TERM_MEMORY` | true | 长期记忆开关 | 否 |
| `BASH_TIMEOUT` | 30 | 命令超时(秒) | 否 |
| `LANGCHAIN_TRACING_V2` | false | LangSmith 追踪 | 否 |

### 6.2 RAG 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `RAG_TOP_N` | 10 | 初始检索数量 |
| `RAG_TOP_K` | 3 | 重排序后返回数量 |
| `ENABLE_HYBRID_SEARCH` | true | 混合检索开关 |
| `BM25_WEIGHT` | 0.3 | BM25 检索权重 |
| `VECTOR_WEIGHT` | 0.7 | 向量检索权重 |
| `ENABLE_MMR` | true | MMR 多样性重排序 |
| `MMR_ALPHA` | 0.7 | MMR 相关性权重 |
| `CHUNK_SIZE` | 500 | 文本分块大小 |
| `CHUNK_OVERLAP` | 50 | 分块重叠大小 |

### 6.3 Bootstrap 配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `BOOTSTRAP_KNOWLEDGE_BUDGET` | 8000 | 知识块 Token 预算 |
| `BOOTSTRAP_MEMORY_BUDGET` | 4000 | 长期记忆 Token 预算 |
| `BOOTSTRAP_QUALITY_THRESHOLD` | 0.3 | 质量门槛 |

---

## 7. 安全机制

### 7.1 命令安全

- **命令分类**：读取类命令直接执行，执行类命令需要用户确认
- **危险命令检测**：`sudo`、`rm`、`chmod`、`chown`、`dd`、`mkfs`、`fdisk`、`shutdown`、`reboot` 等自动标记为危险
- **白名单机制**：允许特定危险命令模式（如 `rm *.pyc`、`rm -rf node_modules`）

### 7.2 生产环境安全

- 修改 `SECRET_KEY` 为随机字符串
- 设置 `FLASK_DEBUG=False`
- 修改数据库和 Redis 密码
- 配置反向代理 (Nginx)
- 启用 HTTPS
- 配置日志收集

---

## 8. 部署规格

### 8.1 Docker 服务编排

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| malogbot | 自构建 | 5000 | 主应用 |
| postgres | ankane/pgvector:latest | 5433 | 数据库 |
| redis | redis:7-alpine | 6379 | 缓存 |
| prometheus | prom/prometheus:latest | 9090 | 监控 (可选) |
| grafana | grafana/grafana:latest | 3000 | 可视化 (可选) |

### 8.2 部署方式

**方式一：Docker 一键部署（推荐）**

```bash
cp .env.example .env
vim .env  # 填入 API Keys
./deploy.sh start
./deploy.sh init-db  # 首次部署
```

**方式二：手动安装**

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
# 启动数据库、配置 .env、初始化数据库
python app.py
```

---

## 9. 监控规格

### 9.1 Prometheus 指标

**Bootstrap 指标**

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `bootstrap_tokens_used` | Gauge | Token 使用量 |
| `bootstrap_budget_total` | Gauge | Token 预算 |
| `bootstrap_usage_ratio` | Gauge | 使用率 |
| `bootstrap_items_loaded` | Counter | 加载条目数 |

**检索指标**

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `retrieval_avg_score` | Gauge | 平均检索得分 |
| `retrieval_result_count` | Counter | 检索结果数量 |
| `retrieval_latency_seconds` | Histogram | 检索延迟 |

**缓存指标**

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `cache_hit_rate` | Gauge | 缓存命中率 |
| `cache_l1_hits` | Counter | L1 缓存命中 |
| `cache_l2_hits` | Counter | L2 缓存命中 |

---

## 10. 核心接口抽象

系统采用依赖反转设计，高层模块依赖抽象接口：

| 接口 | 说明 |
|------|------|
| `ISessionStore` | 会话存储接口 |
| `IContextCompactor` | 上下文压缩接口 |
| `IAgentService` | Agent 服务接口 |
| `IRAGService` | RAG 检索接口 |
| `IEmbeddingService` | 向量化服务接口 |
| `IKnowledgeBaseService` | 知识库服务接口 |
| `ILongTermMemory` | 长期记忆接口 |

---

## 11. 多Agent团队协作规格

### 11.1 执行模式

| 模式 | 适用场景 | 特点 |
|------|----------|------|
| 单Agent模式 | 简单问答、单步操作 | 快速响应，低延迟 |
| 团队协作模式 | 复杂任务（代码重构、系统迁移等） | 自动拆解、并行执行、结果整合 |

### 11.2 团队协作流程

1. **意图路由**：分析请求复杂度，决定执行模式
2. **任务拆解**：Leader Agent 将复杂任务拆解为子任务
3. **DAG 构建**：分析依赖关系，构建执行计划
4. **并行执行**：Follower Pool 并行执行就绪任务
5. **结果整合**：LLM 智能整合各子任务结果

### 11.3 子Agent模式

| 模式 | 说明 | 隔离级别 |
|------|------|----------|
| default | 同进程，共享 messages 数组 | 低隔离 |
| fork | 独立进程，全新 messages 数组 | 中隔离 |

---

## 12. RAG 检索策略

### 12.1 混合检索

- **向量检索**：HNSW 索引，语义相似度搜索（默认权重 0.7）
- **BM25 检索**：关键词匹配（默认权重 0.3）
- **加权融合**：两种检索结果按权重合并

### 12.2 重排序

- **阿里云百炼 Rerank**：智能重排序，提升检索精度
- **MMR 多样性重排序**：避免返回重复内容，α=0.7 偏向相关性
- **时间衰减加权**：最近的记忆权重更高

### 12.3 查询优化

- **指代消解**：解析代词指向
- **Step-Back**：抽象化问题
- **问题分解**：拆解复杂查询
- **多查询重写**：生成查询变体

---

## 13. 虚拟环境

### 13.1 环境信息

- **虚拟环境路径**：`d:\WWWWokP\MalogBot\.venv`
- **Python 版本**：3.13 (系统当前版本)
- **激活方式**：`.venv\Scripts\activate` (Windows PowerShell)

### 13.2 依赖安装

所有依赖已通过 `pip install -r requirements.txt` 安装到虚拟环境中，包括：

- flask, openai, langchain, langgraph
- sqlalchemy, psycopg2-binary, pgvector
- redis, httpx, pdfplumber, python-docx
- numpy, jieba, rank_bm25, ragas
- 以及所有相关子依赖

---

## 14. 开发规范

### 14.1 代码规范

- Python：遵循 PEP 8 规范
- 使用 dataclass 定义数据结构
- 抽象接口与具体实现分离
- 核心功能处添加日志打印便于调试

### 14.2 扩展方式

**添加新工具**：
1. 在 `agent/tools/` 目录下创建新的工具文件
2. 继承 `langchain_core.tools.BaseTool` 类或使用 `@tool` 装饰器
3. 在 `agent/tools/__init__.py` 中注册工具

**添加新技能**：
1. 在 `skills/` 目录下创建新的技能目录
2. 编写 `SKILL.md` 文件定义技能
3. 系统会自动加载并识别技能

### 14.3 测试

```bash
python -m pytest tests/                        # 运行所有测试
python -m pytest tests/test_bootstrap.py -v    # 运行特定测试
```

---

## 15. 许可证

MIT License
