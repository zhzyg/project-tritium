package org.jeecg.modules.formmeta.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.formmeta.entity.FormSchema;

import java.util.List;

public interface IFormSchemaService extends IService<FormSchema> {
    FormSchema saveNewVersion(String formKey, String schemaJson, Integer status, String createdBy);

    FormSchema getLatest(String formKey);

    List<FormSchema> listVersions(String formKey);
}
