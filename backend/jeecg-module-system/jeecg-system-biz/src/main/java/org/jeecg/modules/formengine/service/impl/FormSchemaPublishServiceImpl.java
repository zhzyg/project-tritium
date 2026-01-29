package org.jeecg.modules.formengine.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import org.jeecg.common.util.oConvertUtils;
import org.jeecg.modules.formengine.ddl.DdlColumnDefinition;
import org.jeecg.modules.formengine.ddl.DdlExecutor;
import org.jeecg.modules.formengine.ddl.DdlGenerator;
import org.jeecg.modules.formengine.ddl.DdlTypeMapper;
import org.jeecg.modules.formengine.ddl.FormKeySlugger;
import org.jeecg.modules.formengine.ddl.FormSchemaField;
import org.jeecg.modules.formengine.ddl.FormSchemaFieldExtractor;
import org.jeecg.modules.formengine.entity.FormFieldMeta;
import org.jeecg.modules.formengine.entity.FormTableMeta;
import org.jeecg.modules.formengine.service.IFormFieldMetaService;
import org.jeecg.modules.formengine.service.IFormSchemaPublishService;
import org.jeecg.modules.formengine.service.IFormTableMetaService;
import org.jeecg.modules.formmeta.dto.FormSchemaPublishResp;
import org.jeecg.modules.formmeta.entity.FormSchema;
import org.jeecg.modules.formmeta.service.IFormSchemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class FormSchemaPublishServiceImpl implements IFormSchemaPublishService {

    @Autowired
    private IFormSchemaService formSchemaService;

    @Autowired
    private IFormTableMetaService formTableMetaService;

    @Autowired
    private IFormFieldMetaService formFieldMetaService;

    @Autowired
    private DdlExecutor ddlExecutor;

    private final FormSchemaFieldExtractor fieldExtractor = new FormSchemaFieldExtractor();

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormSchemaPublishResp publish(String formKey, String username) {
        if (oConvertUtils.isEmpty(formKey)) {
            throw new IllegalArgumentException("formKey is required");
        }
        FormSchema latest = formSchemaService.getLatest(formKey);
        if (latest == null) {
            throw new IllegalStateException("schema not found");
        }
        Integer schemaVersion = latest.getVersion();
        FormTableMeta existing = formTableMetaService.getByFormKeyAndVersion(formKey, schemaVersion);
        String tableName = existing == null ? FormKeySlugger.toTableName(formKey) : existing.getTableName();
        List<FormFieldMeta> fieldMetas;
        if (existing == null) {
            fieldMetas = buildFieldMeta(formKey, schemaVersion, latest.getSchemaJson());
            FormTableMeta tableMeta = new FormTableMeta()
                .setId(IdWorker.getIdStr())
                .setFormKey(formKey)
                .setTableName(tableName)
                .setSchemaVersion(schemaVersion)
                .setStatus(1)
                .setCreatedTime(new Date());
            boolean saved = formTableMetaService.save(tableMeta);
            if (!saved) {
                throw new IllegalStateException("Failed to save form table meta");
            }
            if (!fieldMetas.isEmpty()) {
                formFieldMetaService.saveBatch(fieldMetas);
            }
        } else {
            fieldMetas = formFieldMetaService.listByFormKeyVersion(formKey, schemaVersion);
        }

        formSchemaService.updateById(new FormSchema().setId(latest.getId()).setStatus(1));

        List<DdlColumnDefinition> ddlColumns = buildDdlColumns(fieldMetas);
        List<String> ddlApplied = ddlExecutor.ensureTable(tableName, ddlColumns);

        FormSchemaPublishResp resp = new FormSchemaPublishResp();
        resp.setFormKey(formKey);
        resp.setVersion(schemaVersion);
        resp.setTableName(tableName);
        resp.setDdlApplied(ddlApplied);
        return resp;
    }

    private List<FormFieldMeta> buildFieldMeta(String formKey, Integer schemaVersion, String schemaJson) {
        List<FormSchemaField> fields = fieldExtractor.extract(schemaJson);
        List<FormFieldMeta> metas = new ArrayList<>();
        Set<String> usedColumns = new HashSet<>();
        for (FormSchemaField field : fields) {
            String column = ensureUniqueColumn(FormKeySlugger.toColumnName(field.getFieldKey()), usedColumns);
            DdlColumnDefinition type = DdlTypeMapper.map(field.getWidgetType());
            FormFieldMeta meta = new FormFieldMeta()
                .setId(IdWorker.getIdStr())
                .setFormKey(formKey)
                .setSchemaVersion(schemaVersion)
                .setFieldKey(field.getFieldKey())
                .setLabel(field.getLabel())
                .setWidgetType(field.getWidgetType())
                .setDbColumn(column)
                .setDbType(type.getDbType())
                .setDbLength(type.getLength())
                .setNullable(field.isRequired() ? 0 : 1)
                .setDefaultValue(field.getDefaultValue())
                .setStatus(1)
                .setCreatedTime(new Date());
            metas.add(meta);
        }
        return metas;
    }

    private String ensureUniqueColumn(String base, Set<String> used) {
        String candidate = base;
        int idx = 1;
        while (used.contains(candidate)) {
            candidate = base + "_" + idx++;
        }
        used.add(candidate);
        return candidate;
    }

    private List<DdlColumnDefinition> buildDdlColumns(List<FormFieldMeta> fieldMetas) {
        List<DdlColumnDefinition> ddlColumns = new ArrayList<>(DdlGenerator.systemColumns());
        if (fieldMetas == null) {
            return ddlColumns;
        }
        for (FormFieldMeta meta : fieldMetas) {
            DdlColumnDefinition column = new DdlColumnDefinition()
                .setName(meta.getDbColumn())
                .setDbType(meta.getDbType())
                .setLength(meta.getDbLength())
                .setNullable(meta.getNullable() == null || meta.getNullable() != 0);
            if ("decimal".equalsIgnoreCase(meta.getDbType())) {
                column.setScale(6);
            }
            ddlColumns.add(column);
        }
        return ddlColumns;
    }
}
