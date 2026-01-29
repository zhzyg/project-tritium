package org.jeecg.modules.formengine.service.impl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.JSONArray;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formengine.entity.FormFieldMeta;
import org.jeecg.modules.formengine.entity.FormTableMeta;
import org.jeecg.modules.formengine.service.IFormFieldMetaService;
import org.jeecg.modules.formengine.service.IFormPhysicalTableService;
import org.jeecg.modules.formengine.service.IFormTableMetaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class FormPhysicalTableServiceImpl implements IFormPhysicalTableService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    private IFormTableMetaService formTableMetaService;

    @Autowired
    private IFormFieldMetaService formFieldMetaService;

    @Autowired
    public FormPhysicalTableServiceImpl(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Override
    public void writeRecordIfPublished(String formKey, Integer schemaVersion, String recordId, String dataJson, String createdBy, Date createdTime) {
        if (oConvertUtils.isEmpty(formKey) || schemaVersion == null || oConvertUtils.isEmpty(recordId)) {
            return;
        }
        FormTableMeta tableMeta = formTableMetaService.getPublished(formKey, schemaVersion);
        if (tableMeta == null || oConvertUtils.isEmpty(tableMeta.getTableName())) {
            return;
        }
        String tableName = tableMeta.getTableName();
        if (!isSafeIdentifier(tableName)) {
            throw new IllegalStateException("Unsafe table name: " + tableName);
        }
        List<FormFieldMeta> fieldMetas = formFieldMetaService.listByFormKeyVersion(formKey, schemaVersion);
        JSONObject dataObj = JSON.parseObject(dataJson);
        if (dataObj == null) {
            dataObj = new JSONObject();
        }

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

        if (fieldMetas != null) {
            for (FormFieldMeta meta : fieldMetas) {
                String column = meta.getDbColumn();
                if (oConvertUtils.isEmpty(column) || !isSafeIdentifier(column)) {
                    continue;
                }
                Object value = dataObj.get(meta.getFieldKey());
                if (value instanceof JSONObject || value instanceof JSONArray) {
                    value = JSON.toJSONString(value);
                }
                if (value instanceof Boolean && "tinyint".equalsIgnoreCase(meta.getDbType())) {
                    value = Boolean.TRUE.equals(value) ? 1 : 0;
                }
                columns.add(column);
                values.add(value);
            }
        }

        String sql = buildInsertSql(tableName, columns);
        Object[] params = values.toArray();
        jdbcTemplate.update(sql, params);
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

    private boolean isSafeIdentifier(String value) {
        return value != null && value.matches("[a-zA-Z0-9_]+");
    }
}
