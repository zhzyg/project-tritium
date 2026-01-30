package org.jeecg.modules.flowable.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.flowable.service.IFlowableVarMappingService;
import org.jeecg.modules.formmeta.dto.FormSchemaFieldMetaResp;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class FlowableVarMappingServiceImpl implements IFlowableVarMappingService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public FlowableVarMappingServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public Map<String, Object> mapVariables(String formKey,
                                            FormSchemaPublishedResp published,
                                            Map<String, Object> data,
                                            Set<String> restrictFields) {
        Map<String, Object> variables = new HashMap<>();
        if (published == null || published.getFieldMetas() == null || data == null) {
            return variables;
        }
        Map<String, MappingRule> rules = loadRules(formKey);
        for (FormSchemaFieldMetaResp meta : published.getFieldMetas()) {
            if (meta == null || oConvertUtils.isEmpty(meta.getFieldKey())) {
                continue;
            }
            String fieldKey = meta.getFieldKey();
            if (restrictFields != null && !restrictFields.contains(fieldKey)) {
                continue;
            }
            if (!data.containsKey(fieldKey)) {
                continue;
            }
            MappingRule rule = rules.get(fieldKey);
            String varName = rule != null && oConvertUtils.isNotEmpty(rule.varName)
                ? rule.varName
                : fieldKey;
            Object rawValue = data.get(fieldKey);
            Object value = normalizeValue(rawValue, rule == null ? null : rule.valueType, meta);
            variables.put(varName, value);
        }
        return variables;
    }

    private Map<String, MappingRule> loadRules(String formKey) {
        Map<String, MappingRule> rules = new HashMap<>();
        if (oConvertUtils.isEmpty(formKey)) {
            return rules;
        }
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "select field_key, var_name, value_type from tr_proc_var_map where form_key = ? and enabled = 1",
                formKey);
            for (Map<String, Object> row : rows) {
                String fieldKey = row.get("field_key") == null ? null : row.get("field_key").toString();
                if (oConvertUtils.isEmpty(fieldKey)) {
                    continue;
                }
                MappingRule rule = new MappingRule();
                rule.fieldKey = fieldKey;
                rule.varName = row.get("var_name") == null ? null : row.get("var_name").toString();
                rule.valueType = row.get("value_type") == null ? null : row.get("value_type").toString();
                rules.put(fieldKey, rule);
            }
        } catch (Exception ex) {
            log.warn("flowable var map load failed, fallback to default mapping: {}", ex.getMessage());
        }
        return rules;
    }

    private Object normalizeValue(Object value, String valueType, FormSchemaFieldMetaResp meta) {
        if (value == null) {
            return null;
        }
        String type = valueType == null ? "" : valueType.toLowerCase();
        switch (type) {
            case "json":
                return JSON.toJSONString(value);
            case "number":
                return toBigDecimal(value);
            case "boolean":
                return toBoolean(value);
            case "date":
                return formatDate(value, DateTimeFormatter.ISO_LOCAL_DATE);
            case "datetime":
                return formatDate(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            default:
                break;
        }
        String widgetType = meta == null ? null : meta.getWidgetType();
        if (widgetType != null && "checkbox".equalsIgnoreCase(widgetType)) {
            return JSON.toJSONString(value);
        }
        if (value instanceof Map || value instanceof Iterable || value.getClass().isArray()) {
            return JSON.toJSONString(value);
        }
        if (value instanceof Date) {
            return formatDate(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
        if (value instanceof LocalDate) {
            return ((LocalDate) value).format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
        return value;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        try {
            return new BigDecimal(value.toString().trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        String text = value.toString().trim().toLowerCase();
        if (text.isEmpty()) {
            return null;
        }
        if ("true".equals(text) || "1".equals(text) || "yes".equals(text)) {
            return true;
        }
        if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
            return false;
        }
        return null;
    }

    private String formatDate(Object value, DateTimeFormatter formatter) {
        if (value instanceof Date) {
            return formatter.format(((Date) value).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime());
        }
        if (value instanceof LocalDate) {
            return ((LocalDate) value).format(formatter);
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).format(formatter);
        }
        return value.toString();
    }

    private static class MappingRule {
        private String fieldKey;
        private String varName;
        private String valueType;
    }
}
