# ADR-0002: JSON -> DDL 物理表策略（MVP-3A v0）

## 状态
- 已采纳（2026-01-29）

## 背景
VForm 的 schema 与用户提交数据当前存储为 JSON（`form_schema.schema_json` + `form_record.data_json`）。MVP-3A 需要实现“JSON -> 物理表”落地，满足查询/分析的可用性与运行态写入需求，同时避免破坏性迁移。

## 决策
- 采用 JSON -> DDL 的物理表模型：每个 `form_key` 对应一张表 `tr_form_<formKeySlug>`。
- MVP-3A 只支持“新增字段 -> 新增列”，不支持删除列或改类型。
- 保留 `form_record.data_json` 作为审计源与回滚基础。
- 字段类型映射（v0）：
  - input(text), select, radio -> `varchar(512)`
  - textarea, checkbox -> `varchar(1024)`（checkbox 存 JSON string）
  - number -> `decimal(18,6)`
  - date -> `date`
  - datetime -> `datetime`
  - switch -> `tinyint(1)`

## 取舍与原因
- **选择 JSON->DDL**：便于后续数据分析/SQL 查询；相较 EAV 模型可读性更好；相较 JSON-only 方案更易加索引。
- **不采用 JSON->DDL 全量迁移**：删除列/改类型存在破坏性风险；v0 仅支持新增列以降低迁移风险。
- **不采用 EAV**：查询复杂、性能差、实现成本高。

## 约束与风险
- DDL 属于自动提交，事务一致性有限（v0 以可用性优先）。
- 字段重命名/删除暂无支持：重命名将被视为新增列，旧列保留。
- 类型映射粗粒度，可能导致字段类型不够精确（例如 number 统一 decimal）。

## 升级路径
- v1：增加字段级别的映射策略配置与校验。
- v2：引入列级别索引策略（基于配置或访问频率）。
- v3：支持字段重命名/弃用标记，并提供数据迁移工具。

## 回滚策略
- 依赖 `form_record.data_json` 作为原始数据源；物理表可丢弃重建。
- `form_table_meta` / `form_field_meta` 可清理对应版本记录，重发 publish 生成新表/新列。
