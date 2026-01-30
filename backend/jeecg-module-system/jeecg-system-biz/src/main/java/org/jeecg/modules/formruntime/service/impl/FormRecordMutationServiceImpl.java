package org.jeecg.modules.formruntime.service.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formengine.service.IFormSchemaPublishService;
import org.jeecg.modules.formmeta.dto.FormSchemaFieldMetaResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.jeecg.modules.formruntime.dto.FormRecordMutationOptions;
import org.jeecg.modules.formruntime.dto.FormRecordMutationReq;
import org.jeecg.modules.formruntime.dto.FormRecordMutationResp;
import org.jeecg.modules.formruntime.entity.FormRecord;
import org.jeecg.modules.formruntime.service.IFormRecordMutationService;
import org.jeecg.modules.formruntime.service.IFormRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormRecordMutationServiceImpl implements IFormRecordMutationService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    private IFormSchemaPublishService formSchemaPublishService;

    @Autowired
    private IFormRecordService formRecordService;

    @Autowired
    public FormRecordMutationServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormRecordMutationResp insert(FormRecordMutationReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey())) {
            throw new IllegalArgumentException("formKey is required");
        }
        FormSchemaPublishedResp published = resolvePublished(req.getFormKey());
        Map<String, Object> data = req.getData() == null ? new LinkedHashMap<>() : req.getData();
        NormalizedData normalized = validateAndNormalize(data, published, resolveStrict(req.getOptions()));

        String recordId = oConvertUtils.isEmpty(req.getRecordId()) ? IdWorker.getIdStr() : req.getRecordId();
        if (formRecordService.getById(recordId) != null) {
            throw new IllegalStateException("record_id already exists");
        }

        Date now = new Date();
        String dataJson = JSON.toJSONString(normalized.rawByField);
        FormRecord record = new FormRecord()
            .setId(recordId)
            .setFormKey(req.getFormKey())
            .setSchemaVersion(published.getVersion())
            .setDataJson(dataJson)
            .setStatus(0)
            .setCreatedBy(username)
            .setCreatedTime(now);
        boolean saved = formRecordService.save(record);
        if (!saved) {
            throw new IllegalStateException("Failed to save form record");
        }

        writePhysicalInsert(published.getTableName(), published.getVersion(), recordId, username, now, normalized.normalizedByColumn);

        FormRecordMutationResp resp = new FormRecordMutationResp();
        resp.setRecordId(recordId);
        resp.setFormKey(req.getFormKey());
        resp.setSchemaVersion(published.getVersion());
        resp.setCreatedTime(now);
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormRecordMutationResp update(FormRecordMutationReq req, String username) {
        if (req == null || oConvertUtils.isEmpty(req.getFormKey())) {
            throw new IllegalArgumentException("formKey is required");
        }
        if (oConvertUtils.isEmpty(req.getRecordId())) {
            throw new IllegalArgumentException("recordId is required");
        }
        FormRecord record = formRecordService.getById(req.getRecordId());
        if (record == null) {
            throw new IllegalStateException("record not found");
        }
        if (!req.getFormKey().equals(record.getFormKey())) {
            throw new IllegalArgumentException("record does not belong to formKey");
        }

        FormSchemaPublishedResp published = resolvePublished(req.getFormKey());
        Map<String, Object> data = req.getData() == null ? new LinkedHashMap<>() : req.getData();
        if (data.isEmpty()) {
            throw new IllegalArgumentException("data is required");
        }
        NormalizedData normalized = validateAndNormalize(data, published, resolveStrict(req.getOptions()));
        if (normalized.normalizedByColumn.isEmpty()) {
            throw new IllegalArgumentException("no allowed fields to update");
        }

        int updated = writePhysicalUpdate(published.getTableName(), req.getRecordId(), normalized.normalizedByColumn);
        if (updated < 1) {
            throw new IllegalStateException("physical record not found");
        }

        Map<String, Object> merged = mergeDataJson(record.getDataJson(), normalized.rawByField);
        Date now = new Date();
        boolean recordUpdated = formRecordService.lambdaUpdate()
            .eq(FormRecord::getId, req.getRecordId())
            .set(FormRecord::getDataJson, JSON.toJSONString(merged))
            .set(FormRecord::getUpdatedTime, now)
            .update();
        if (!recordUpdated) {
            throw new IllegalStateException("Failed to update form record");
        }

        FormRecordMutationResp resp = new FormRecordMutationResp();
        resp.setRecordId(req.getRecordId());
        resp.setFormKey(req.getFormKey());
        resp.setSchemaVersion(record.getSchemaVersion());
        resp.setUpdatedTime(now);
        return resp;
    }

    private FormSchemaPublishedResp resolvePublished(String formKey) {
        FormSchemaPublishedResp published = formSchemaPublishService.getLatestPublished(formKey);
        if (published == null || oConvertUtils.isEmpty(published.getTableName())) {
            throw new IllegalStateException("published schema not found");
        }
        String tableName = published.getTableName();
        if (!isSafeIdentifier(tableName)) {
            throw new IllegalStateException("Unsafe table name: " + tableName);
        }
        return published;
    }

    private boolean resolveStrict(FormRecordMutationOptions options) {
        return true;
    }

    private NormalizedData validateAndNormalize(Map<String, Object> data,
                                               FormSchemaPublishedResp published,
                                               boolean strict) {
        Map<String, FormSchemaFieldMetaResp> metaByField = new LinkedHashMap<>();
        if (published.getFieldMetas() != null) {
            for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
                if (meta != null && oConvertUtils.isNotEmpty(meta.getFieldKey())) {
                    metaByField.put(meta.getFieldKey(), meta);
                }
            }
        }

        Map<String, Object> normalized = new LinkedHashMap<>();
        Map<String, Object> raw = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String fieldKey = entry.getKey();
            if (oConvertUtils.isEmpty(fieldKey)) {
                continue;
            }
            FormSchemaFieldMetaResp meta = metaByField.get(fieldKey);
            if (meta == null) {
                if (strict) {
                    throw new IllegalArgumentException("Unknown field: " + fieldKey);
                }
                continue;
            }
            String column = meta.getDbColumn();
            if (oConvertUtils.isEmpty(column) || !isSafeIdentifier(column)) {
                throw new IllegalStateException("Unsafe column: " + column);
            }
            raw.put(fieldKey, entry.getValue());
            normalized.put(column, normalizeValue(entry.getValue(), meta));
        }

        if (strict && data.size() != raw.size()) {
            throw new IllegalArgumentException("Unknown fields present");
        }
        return new NormalizedData(normalized, raw);
    }

    private Object normalizeValue(Object value, FormSchemaFieldMetaResp meta) {
        if (value == null) {
            return null;
        }
        String widgetType = meta.getWidgetType();
        String dbType = meta.getDbType();
        String type = oConvertUtils.isNotEmpty(widgetType)
            ? widgetType.toLowerCase()
            : (dbType == null ? "" : dbType.toLowerCase());

        switch (type) {
            case "number":
            case "decimal":
                return toDecimal(value);
            case "checkbox":
                return toJsonString(value);
            case "date":
                return toSqlDate(value, meta.getFieldKey());
            case "datetime":
                return toSqlTimestamp(value, meta.getFieldKey());
            case "switch":
            case "tinyint":
                return toTinyInt(value, meta.getFieldKey());
            case "select":
            case "radio":
            case "textarea":
            case "input":
            default:
                return toStringValue(value);
        }
    }

    private BigDecimal toDecimal(Object value) {
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid number value");
        }
    }

    private Object toStringValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof CharSequence) {
            return value.toString();
        }
        if (value.getClass().isArray() || value instanceof Iterable || value instanceof Map) {
            return JSON.toJSONString(value);
        }
        return value.toString();
    }

    private String toJsonString(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof CharSequence) {
            return value.toString();
        }
        if (value.getClass().isArray() || value instanceof Iterable) {
            return JSON.toJSONString(value);
        }
        return JSON.toJSONString(value);
    }

    private Integer toTinyInt(Object value, String fieldKey) {
        if (value instanceof Boolean) {
            return Boolean.TRUE.equals(value) ? 1 : 0;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() == 0 ? 0 : 1;
        }
        String text = value.toString().trim().toLowerCase();
        if (text.isEmpty()) {
            return null;
        }
        if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) {
            return 1;
        }
        if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
            return 0;
        }
        throw new IllegalArgumentException("Invalid switch value for field " + fieldKey);
    }

    private java.sql.Date toSqlDate(Object value, String fieldKey) {
        if (value instanceof java.sql.Date) {
            return (java.sql.Date) value;
        }
        if (value instanceof Date) {
            return new java.sql.Date(((Date) value).getTime());
        }
        if (value instanceof LocalDate) {
            return java.sql.Date.valueOf((LocalDate) value);
        }
        if (value instanceof LocalDateTime) {
            return java.sql.Date.valueOf(((LocalDateTime) value).toLocalDate());
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return java.sql.Date.valueOf(LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE));
        } catch (DateTimeParseException ex) {
            try {
                LocalDateTime dt = LocalDateTime.parse(text, DateTimeFormatter.ISO_DATE_TIME);
                return java.sql.Date.valueOf(dt.toLocalDate());
            } catch (DateTimeParseException ex2) {
                try {
                    LocalDateTime dt = LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    return java.sql.Date.valueOf(dt.toLocalDate());
                } catch (DateTimeParseException ex3) {
                    throw new IllegalArgumentException("Invalid date value for field " + fieldKey);
                }
            }
        }
    }

    private Timestamp toSqlTimestamp(Object value, String fieldKey) {
        if (value instanceof Timestamp) {
            return (Timestamp) value;
        }
        if (value instanceof Date) {
            return new Timestamp(((Date) value).getTime());
        }
        if (value instanceof LocalDateTime) {
            return Timestamp.valueOf((LocalDateTime) value);
        }
        if (value instanceof LocalDate) {
            return Timestamp.valueOf(((LocalDate) value).atStartOfDay());
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Timestamp.valueOf(LocalDateTime.parse(text, DateTimeFormatter.ISO_DATE_TIME));
        } catch (DateTimeParseException ex) {
            try {
                return Timestamp.valueOf(LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            } catch (DateTimeParseException ex2) {
                try {
                    LocalDate date = LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE);
                    return Timestamp.valueOf(date.atStartOfDay());
                } catch (DateTimeParseException ex3) {
                    throw new IllegalArgumentException("Invalid datetime value for field " + fieldKey);
                }
            }
        }
    }

    private void writePhysicalInsert(String tableName,
                                     Integer schemaVersion,
                                     String recordId,
                                     String createdBy,
                                     Date createdTime,
                                     Map<String, Object> normalized) {
        List<String> columns = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        columns.add("id");
        values.add(recordId);
        columns.add("record_id");
        values.add(recordId);
        columns.add("schema_version");
        values.add(schemaVersion);
        columns.add("created_time");
        values.add(createdTime == null ? new Date() : createdTime);
        columns.add("created_by");
        values.add(createdBy);

        if (normalized != null) {
            for (Map.Entry<String, Object> entry : normalized.entrySet()) {
                columns.add(entry.getKey());
                values.add(entry.getValue());
            }
        }
        String sql = buildInsertSql(tableName, columns);
        jdbcTemplate.update(sql, values.toArray());
    }

    private int writePhysicalUpdate(String tableName, String recordId, Map<String, Object> normalized) {
        StringBuilder sets = new StringBuilder();
        List<Object> params = new ArrayList<>();
        for (Map.Entry<String, Object> entry : normalized.entrySet()) {
            if (sets.length() > 0) {
                sets.append(", ");
            }
            sets.append("`").append(entry.getKey()).append("` = ?");
            params.add(entry.getValue());
        }
        String sql = "UPDATE `" + tableName + "` SET " + sets + " WHERE record_id = ?";
        params.add(recordId);
        return jdbcTemplate.update(sql, params.toArray());
    }

    private String buildInsertSql(String tableName, List<String> columns) {
        StringBuilder cols = new StringBuilder();
        StringBuilder holders = new StringBuilder();
        for (int i = 0; i < columns.size(); i++) {
            if (i > 0) {
                cols.append(',');
                holders.append(',');
            }
            cols.append('`').append(columns.get(i)).append('`');
            holders.append('?');
        }
        return String.format("INSERT INTO `%s` (%s) VALUES (%s)", tableName, cols, holders);
    }

    private Map<String, Object> mergeDataJson(String dataJson, Map<String, Object> patch) {
        Map<String, Object> merged = new LinkedHashMap<>();
        if (oConvertUtils.isNotEmpty(dataJson)) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = JSON.parseObject(dataJson, Map.class);
                if (parsed != null) {
                    merged.putAll(parsed);
                }
            } catch (Exception ex) {
                // keep empty when parse fails
            }
        }
        if (patch != null) {
            merged.putAll(patch);
        }
        return merged;
    }

    private boolean isSafeIdentifier(String value) {
        return value != null && value.matches("[a-zA-Z0-9_]+");
    }

    private static class NormalizedData {
        private final Map<String, Object> normalizedByColumn;
        private final Map<String, Object> rawByField;

        private NormalizedData(Map<String, Object> normalizedByColumn, Map<String, Object> rawByField) {
            this.normalizedByColumn = normalizedByColumn;
            this.rawByField = rawByField;
        }
    }
}
