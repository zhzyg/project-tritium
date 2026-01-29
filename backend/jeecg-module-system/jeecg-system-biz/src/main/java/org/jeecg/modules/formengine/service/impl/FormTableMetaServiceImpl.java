package org.jeecg.modules.formengine.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.jeecg.modules.formengine.entity.FormTableMeta;
import org.jeecg.modules.formengine.mapper.FormTableMetaMapper;
import org.jeecg.modules.formengine.service.IFormTableMetaService;
import org.springframework.stereotype.Service;

@Service
public class FormTableMetaServiceImpl extends ServiceImpl<FormTableMetaMapper, FormTableMeta> implements IFormTableMetaService {

    @Override
    public FormTableMeta getByFormKeyAndVersion(String formKey, Integer schemaVersion) {
        return this.lambdaQuery()
            .eq(FormTableMeta::getFormKey, formKey)
            .eq(FormTableMeta::getSchemaVersion, schemaVersion)
            .last("limit 1")
            .one();
    }

    @Override
    public FormTableMeta getPublished(String formKey, Integer schemaVersion) {
        return this.lambdaQuery()
            .eq(FormTableMeta::getFormKey, formKey)
            .eq(FormTableMeta::getSchemaVersion, schemaVersion)
            .eq(FormTableMeta::getStatus, 1)
            .last("limit 1")
            .one();
    }

    @Override
    public FormTableMeta getLatestPublished(String formKey) {
        return this.lambdaQuery()
            .eq(FormTableMeta::getFormKey, formKey)
            .eq(FormTableMeta::getStatus, 1)
            .orderByDesc(FormTableMeta::getSchemaVersion)
            .last("limit 1")
            .one();
    }
}
