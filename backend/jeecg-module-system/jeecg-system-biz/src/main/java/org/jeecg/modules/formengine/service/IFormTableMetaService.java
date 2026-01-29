package org.jeecg.modules.formengine.service;

import com.baomidou.mybatisplus.extension.service.IService;
import org.jeecg.modules.formengine.entity.FormTableMeta;

public interface IFormTableMetaService extends IService<FormTableMeta> {
    FormTableMeta getByFormKeyAndVersion(String formKey, Integer schemaVersion);

    FormTableMeta getPublished(String formKey, Integer schemaVersion);
}
