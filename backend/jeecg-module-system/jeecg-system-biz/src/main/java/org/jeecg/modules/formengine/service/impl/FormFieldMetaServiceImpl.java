package org.jeecg.modules.formengine.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.jeecg.modules.formengine.entity.FormFieldMeta;
import org.jeecg.modules.formengine.mapper.FormFieldMetaMapper;
import org.jeecg.modules.formengine.service.IFormFieldMetaService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FormFieldMetaServiceImpl extends ServiceImpl<FormFieldMetaMapper, FormFieldMeta> implements IFormFieldMetaService {

    @Override
    public List<FormFieldMeta> listByFormKeyVersion(String formKey, Integer schemaVersion) {
        return this.lambdaQuery()
            .eq(FormFieldMeta::getFormKey, formKey)
            .eq(FormFieldMeta::getSchemaVersion, schemaVersion)
            .eq(FormFieldMeta::getStatus, 1)
            .list();
    }
}
