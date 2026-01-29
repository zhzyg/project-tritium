package org.jeecg.modules.formengine.service;

import org.jeecg.modules.formmeta.dto.FormSchemaPublishResp;

public interface IFormSchemaPublishService {
    FormSchemaPublishResp publish(String formKey, String username);
}
