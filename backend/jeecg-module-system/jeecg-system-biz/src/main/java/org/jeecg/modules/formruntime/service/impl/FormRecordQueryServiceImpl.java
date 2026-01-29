package org.jeecg.modules.formruntime.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formmeta.dto.FormSchemaFieldMetaResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.jeecg.modules.formruntime.dto.FormRecordPageResp;
import org.jeecg.modules.formruntime.service.IFormRecordQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormRecordQueryServiceImpl implements IFormRecordQueryService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public FormRecordQueryServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public IPage<FormRecordPageResp> queryPublishedPage(String formKey,
                                                        FormSchemaPublishedResp published,
                                                        int pageNo,
                                                        int pageSize,
                                                        String sortBy,
                                                        String sort,
                                                        Map<String, String> filters) {
        Page<FormRecordPageResp> page = new Page<>(pageNo, pageSize);
        if (published == null || oConvertUtils.isEmpty(published.getTableName())) {
            page.setTotal(0);
            page.setRecords(new ArrayList<>());
            return page;
        }
        String tableName = published.getTableName();
        if (!isSafeIdentifier(tableName)) {
            throw new IllegalStateException("Unsafe table name: " + tableName);
        }
        Map<String, FormSchemaFieldMetaResp> metaByField = new HashMap<>();
        Map<String, FormSchemaFieldMetaResp> metaByColumn = new HashMap<>();
        if (published.getFieldMetas() != null) {
            for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
                metaByField.put(meta.getFieldKey(), meta);
                metaByColumn.put(meta.getDbColumn(), meta);
            }
        }

        List<String> selectColumns = new ArrayList<>();
        selectColumns.add("t.id");
        selectColumns.add("t.record_id");
        selectColumns.add("t.schema_version");
        selectColumns.add("t.created_time");
        selectColumns.add("t.created_by");
        selectColumns.add("r.data_json");
        if (published.getFieldMetas() != null) {
            for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
                if (isSafeIdentifier(meta.getDbColumn())) {
                    selectColumns.add("t.`" + meta.getDbColumn() + "`");
                }
            }
        }

        List<Object> params = new ArrayList<>();
        StringBuilder where = new StringBuilder(" where 1=1");
        int filterCount = 0;
        if (filters != null) {
            for (Map.Entry<String, String> entry : filters.entrySet()) {
                if (filterCount >= 3) {
                    break;
                }
                String fieldKey = entry.getKey();
                String value = entry.getValue();
                if (oConvertUtils.isEmpty(fieldKey) || oConvertUtils.isEmpty(value)) {
                    continue;
                }
                FormSchemaFieldMetaResp meta = metaByField.get(fieldKey);
                if (meta == null || oConvertUtils.isEmpty(meta.getDbColumn())) {
                    continue;
                }
                String column = meta.getDbColumn();
                if (!isSafeIdentifier(column)) {
                    continue;
                }
                String dbType = meta.getDbType();
                if (isLikeType(dbType)) {
                    where.append(" and t.`").append(column).append("` like ?");
                    params.add("%" + value + "%");
                } else {
                    where.append(" and t.`").append(column).append("` = ?");
                    params.add(value);
                }
                filterCount++;
            }
        }

        String orderColumn = resolveOrderColumn(sortBy, metaByField, metaByColumn);
        String orderDir = "asc".equalsIgnoreCase(sort) ? "asc" : "desc";

        String countSql = "select count(*) from `" + tableName + "` t" + where;
        Long total = jdbcTemplate.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) {
            total = 0L;
        }

        int offset = Math.max(pageNo - 1, 0) * pageSize;
        String sql = "select " + String.join(", ", selectColumns)
            + " from `" + tableName + "` t"
            + " left join form_record r on r.id = t.record_id"
            + where
            + " order by t.`" + orderColumn + "` " + orderDir
            + " limit ?, ?";
        params.add(offset);
        params.add(pageSize);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        List<FormRecordPageResp> records = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            FormRecordPageResp resp = mapRow(row, published.getFieldMetas());
            records.add(resp);
        }
        page.setTotal(total);
        page.setRecords(records);
        return page;
    }

    @Override
    public FormRecordPageResp queryPublishedRecord(String formKey, FormSchemaPublishedResp published, String id) {
        if (published == null || oConvertUtils.isEmpty(published.getTableName()) || oConvertUtils.isEmpty(id)) {
            return null;
        }
        String tableName = published.getTableName();
        if (!isSafeIdentifier(tableName)) {
            throw new IllegalStateException("Unsafe table name: " + tableName);
        }
        List<String> selectColumns = new ArrayList<>();
        selectColumns.add("t.id");
        selectColumns.add("t.record_id");
        selectColumns.add("t.schema_version");
        selectColumns.add("t.created_time");
        selectColumns.add("t.created_by");
        selectColumns.add("r.data_json");
        if (published.getFieldMetas() != null) {
            for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
                if (isSafeIdentifier(meta.getDbColumn())) {
                    selectColumns.add("t.`" + meta.getDbColumn() + "`");
                }
            }
        }

        String sql = "select " + String.join(", ", selectColumns)
            + " from `" + tableName + "` t"
            + " left join form_record r on r.id = t.record_id"
            + " where t.record_id = ? or t.id = ? limit 1";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, id, id);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        return mapRow(rows.get(0), published.getFieldMetas());
    }

    private FormRecordPageResp mapRow(Map<String, Object> row, List<FormSchemaFieldMetaResp> metas) {
        FormRecordPageResp resp = new FormRecordPageResp();
        String recordId = row.get("record_id") == null ? null : row.get("record_id").toString();
        resp.setId(recordId);
        resp.setRecordId(recordId);
        Object schemaVersion = row.get("schema_version");
        if (schemaVersion instanceof Number) {
            resp.setSchemaVersion(((Number) schemaVersion).intValue());
        }
        resp.setCreatedBy(row.get("created_by") == null ? null : row.get("created_by").toString());
        Object createdTime = row.get("created_time");
        if (createdTime instanceof java.util.Date) {
            resp.setCreatedTime((java.util.Date) createdTime);
        } else if (createdTime instanceof java.time.LocalDateTime) {
            resp.setCreatedTime(java.sql.Timestamp.valueOf((java.time.LocalDateTime) createdTime));
        } else if (createdTime instanceof java.sql.Timestamp) {
            resp.setCreatedTime(new java.util.Date(((java.sql.Timestamp) createdTime).getTime()));
        }
        resp.setDataJson(row.get("data_json") == null ? null : row.get("data_json").toString());

        Map<String, Object> data = new HashMap<>();
        if (metas != null) {
            for (FormSchemaFieldMetaResp meta : metas) {
                if (meta == null || oConvertUtils.isEmpty(meta.getFieldKey())) {
                    continue;
                }
                Object value = row.get(meta.getDbColumn());
                data.put(meta.getFieldKey(), value);
            }
        }
        resp.setData(data);
        return resp;
    }

    private String resolveOrderColumn(String sortBy,
                                      Map<String, FormSchemaFieldMetaResp> metaByField,
                                      Map<String, FormSchemaFieldMetaResp> metaByColumn) {
        if (oConvertUtils.isNotEmpty(sortBy)) {
            FormSchemaFieldMetaResp metaByFieldKey = metaByField.get(sortBy);
            if (metaByFieldKey != null && isSafeIdentifier(metaByFieldKey.getDbColumn())) {
                return metaByFieldKey.getDbColumn();
            }
            FormSchemaFieldMetaResp metaByColumnKey = metaByColumn.get(sortBy);
            if (metaByColumnKey != null && isSafeIdentifier(metaByColumnKey.getDbColumn())) {
                return metaByColumnKey.getDbColumn();
            }
            if (isSafeIdentifier(sortBy) && isSystemColumn(sortBy)) {
                return sortBy;
            }
        }
        return "created_time";
    }

    private boolean isSystemColumn(String column) {
        return "created_time".equalsIgnoreCase(column)
            || "schema_version".equalsIgnoreCase(column)
            || "record_id".equalsIgnoreCase(column)
            || "id".equalsIgnoreCase(column);
    }

    private boolean isLikeType(String dbType) {
        if (dbType == null) {
            return true;
        }
        String type = dbType.toLowerCase();
        return type.contains("char") || type.contains("text");
    }

    private boolean isSafeIdentifier(String value) {
        return value != null && value.matches("[a-zA-Z0-9_]+");
    }
}
