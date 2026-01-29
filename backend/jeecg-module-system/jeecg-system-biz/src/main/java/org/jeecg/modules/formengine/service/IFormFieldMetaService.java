package org.jeecg.modules.formengine.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.formengine.entity.FormFieldMeta;

import java.util.List;

public interface IFormFieldMetaService extends IService<FormFieldMeta> {
    List<FormFieldMeta> listByFormKeyVersion(String formKey, Integer schemaVersion);
}
