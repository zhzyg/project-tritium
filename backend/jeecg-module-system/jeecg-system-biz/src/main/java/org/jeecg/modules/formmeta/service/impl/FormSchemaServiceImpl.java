package org.jeecg.modules.formmeta.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import org.jeecg.modules.formmeta.entity.FormSchema;
import org.jeecg.modules.formmeta.mapper.FormSchemaMapper;
import org.jeecg.modules.formmeta.service.IFormSchemaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
public class FormSchemaServiceImpl extends ServiceImpl<FormSchemaMapper, FormSchema> implements IFormSchemaService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FormSchema saveNewVersion(String formKey, String schemaJson, Integer status, String createdBy) {
        FormSchema latest = getLatest(formKey);
        int nextVersion = latest == null ? 1 : latest.getVersion() + 1;
        FormSchema entity = new FormSchema()
            .setId(IdWorker.getIdStr())
            .setFormKey(formKey)
            .setVersion(nextVersion)
            .setSchemaJson(schemaJson)
            .setStatus(status == null ? 0 : status)
            .setCreatedBy(createdBy)
            .setCreatedTime(new Date());
        boolean saved = this.save(entity);
        if (!saved) {
            throw new IllegalStateException("Failed to save form schema");
        }
        return entity;
    }

    @Override
    public FormSchema getLatest(String formKey) {
        return this.lambdaQuery()
            .eq(FormSchema::getFormKey, formKey)
            .orderByDesc(FormSchema::getVersion)
            .last("limit 1")
            .one();
    }

    @Override
    public List<FormSchema> listVersions(String formKey) {
        return this.lambdaQuery()
            .select(FormSchema::getFormKey, FormSchema::getVersion, FormSchema::getStatus, FormSchema::getCreatedTime)
            .eq(FormSchema::getFormKey, formKey)
            .orderByDesc(FormSchema::getVersion)
            .list();
    }
}
